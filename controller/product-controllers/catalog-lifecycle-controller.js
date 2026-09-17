const mongoose = require('mongoose');
const Category = require('../../models/product-models/category-model');
const SubCategory = require('../../models/product-models/subCategory-model');
const Product = require('../../models/product-models/product-model');
const { catchAsync } = require('../../utils/catch-async');
const { AppError } = require('../../utils/app-error');
const { createSlug } = require('../../utils/slugify');

const preventDelete = (req, res) => res.status(403).json({status:'fail',message:'حذف این مورد مجاز نیست. از غیرفعال‌سازی استفاده کنید.'});
const config = kind => kind === 'category' ? {Model:Category,param:'categoryId',key:'category'} : {Model:SubCategory,param:'subCategoryId',key:'subCategory'};
const dependencies = kind => catchAsync(async (req,res) => {
  const {Model,param,key}=config(kind), id=req.params[param];
  const parent=await Model.findById(id).select('name isActive').lean();
  if(!parent)throw new AppError(404,'مورد موردنظر پیدا نشد.');
  const subcategories=kind==='category'?await SubCategory.find({category:id}).select('name isActive').sort('sortOrder name').lean():[];
  const scope=kind==='category'?{$or:[{category:id},{subCategory:{$in:subcategories.map(s=>s._id)}}]}:{subCategory:id};
  const products=await Product.find(scope).select('name sku isActive subCategory').sort('name').lean();
  res.json({status:'success',data:{parent,subcategories,products}});
});

// All selected status changes, including edits to the parent, commit together.
const deactivate = kind => catchAsync(async (req,res,next) => {
  if(req.body.isActive!==false)return next();
  const {Model,param,key}=config(kind), id=req.params[param];
  const selection=req.body.deactivation;
  if(!selection)throw new AppError(400,'برای غیرفعال‌سازی، وضعیت زیرمجموعه‌ها را مشخص کنید.');
  let result;
  await mongoose.connection.transaction(async session => {
    const parent=await Model.findById(id).session(session);
    if(!parent)throw new AppError(404,'مورد موردنظر پیدا نشد.');
    const subs=kind==='category'?await SubCategory.find({category:id}).select('_id').session(session):[];
    const subIds=selection.subCategoryIds||[], productIds=selection.productIds||[];
    if(subIds.some(selected=>!subs.some(s=>String(s._id)===selected)))throw new AppError(400,'زیردسته انتخاب‌شده متعلق به این دسته نیست.');
    const scope=kind==='category'?{$or:[{category:id},{subCategory:{$in:subs.map(s=>s._id)}}]}:{subCategory:id};
    const count=await Product.countDocuments({$and:[scope,{_id:{$in:productIds}}]}).session(session);
    if(count!==productIds.length)throw new AppError(409,'محصولات زیرمجموعه تغییر کرده‌اند. انتخاب‌ها را دوباره بررسی کنید.');
    if(kind!=='category'&&req.body.category!==undefined&&String(parent.category)!==req.body.category){
      if(!await Category.exists({_id:req.body.category,isActive:true}).session(session))throw new AppError(400,'دسته مقصد فعال نیست.');
      parent.category=req.body.category;
    }
    for(const field of ['name','sortOrder'])if(req.body[field]!==undefined)parent[field]=req.body[field];
    if(req.body.slug)parent.slug=createSlug(req.body.slug);
    parent.isActive=false;await parent.save({session});
    if(subIds.length)await SubCategory.updateMany({_id:{$in:subIds},category:id},{$set:{isActive:false}},{session});
    if(productIds.length)await Product.updateMany({$and:[scope,{_id:{$in:productIds}}]},{$set:{isActive:false}},{session});
    result=parent;
  });
  res.json({status:'success',data:{[key]:result}});
});
module.exports={preventDelete,dependencies,deactivate};
