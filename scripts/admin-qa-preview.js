// Manual QA fixtures: only the isolated local preview, never the business database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
process.env.NODE_ENV='development';process.env.JWT_SECRET=fs.readFileSync(path.join(__dirname,'../artifacts/local-secret'),'utf8').trim();
const mongoose=require('mongoose'),User=require('../models/user-model');
const {signAccessToken}=require('../utils/jwt');
const stamp=Date.now().toString();const base='http://127.0.0.1:3100';const report=[];
async function api(url,method='GET',body,user){const r=await fetch(base+url,{method,headers:{Cookie:'accessToken='+signAccessToken(user),'X-Requested-With':'Alpha',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await r.text();let data;try{data=JSON.parse(text);}catch{}report.push({url,method,status:r.status});if(!r.ok)throw new Error(method+' '+url+' '+r.status+' '+text);return data?.data;}
(async()=>{
 await mongoose.connect('mongodb://127.0.0.1:27029/alpha-preview?replicaSet=alphaDev');if(mongoose.connection.name!=='alpha-preview')throw Error('Preview only');
 const admin=await User.findOne({role:'admin',accountStatus:{$exists:true}});if(!admin)throw Error('No preview admin');
 const user=await User.create({firstname:'آزمایشی',lastname:'بررسی پنل',phonenumber:'09'+stamp.slice(-9),password:crypto.randomBytes(24).toString('hex'),phoneVerifiedAt:new Date()});
 const {category}=await api('/api/categories','POST',{name:'آزمایشی پنل '+stamp.slice(-4),slug:'qa-panel-'+stamp},admin);
 const {subCategory}=await api('/api/subCategories','POST',{name:'زیردسته آزمایشی',slug:'qa-panel-'+stamp,category:category._id},admin);
 const {product}=await api('/api/products','POST',{name:'گردنبند آزمایشی پنل',sku:'QA-'+stamp,slug:'qa-panel-'+stamp,category:category._id,subCategory:subCategory._id,gender:'unisex',goldWeight:1.2,stock:5,wage:{type:'percent',value:10},description:'رکورد آزمایشی بررسی مدیریت؛ کالای واقعی نیست.'},admin);
 const {method}=await api('/api/store/admin/shipping','POST',{name:'ارسال آزمایشی پنل',cost:20000,isActive:true},admin);
 const result=await api('/api/addresses','POST',{title:'نشانی آزمایشی',recipientName:'کاربر آزمایشی',recipientPhone:user.phonenumber,province:'تهران',city:'تهران',addressLine:'خیابان آزمایشی، نشانی غیرواقعی تست',postalCode:'1234567890',buildingNumber:'1',unit:'1'},user);
 const address=result.address;
 await api('/api/cart','POST',{productId:product._id,quantity:1},user);
 const {order}=await api('/api/orders','POST',{addressId:address._id,shippingMethodId:method._id},user);
 const {payment}=await api('/api/payments/order/'+order._id,'POST',{quoteId:order.quoteId},user);
 await api('/api/payments/mock/'+payment._id+'/success','POST',null,user);
 const {ticket}=await api('/api/store/tickets','POST',{subject:'آزمایشی — پیگیری سفارش',message:'این درخواست برای بررسی دکمه پاسخ پشتیبانی ثبت شده است.',orderId:order._id},user);
 await api('/api/products/'+product._id,'PATCH',{isActive:false},admin);
 await api('/api/categories/'+category._id,'PATCH',{isActive:false},admin);
 await api('/api/store/admin/shipping/'+method._id,'PUT',{name:'ارسال آزمایشی پنل',cost:20000,isActive:false},admin);
 fs.writeFileSync(path.join(__dirname,'../artifacts/admin-qa-fixtures.json'),JSON.stringify({createdAt:new Date(),userId:user._id,categoryId:category._id,subCategoryId:subCategory._id,productId:product._id,orderId:order._id,paymentId:payment._id,ticketId:ticket._id,shippingId:method._id,report},null,2));
 console.log(JSON.stringify({order:order._id,ticket:ticket._id,operations:report.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>mongoose.disconnect());
