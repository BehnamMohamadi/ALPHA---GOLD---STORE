const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test'; process.env.SMS_PROVIDER = 'mock'; process.env.PAYMENT_GATEWAY = 'mock';
process.env.JWT_SECRET = 'alpha-test-only-secret-not-used-outside-tests-0123456789';
process.env.MONGODB_URI = `mongodb://127.0.0.1:27029/alpha-test-${process.pid}?replicaSet=alphaDev`;
process.env.CLIENT_ORIGIN = 'http://127.0.0.1:3100';
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/user-model'), Address = require('../models/address-model');
const Product = require('../models/product-models/product-model'), Category = require('../models/product-models/category-model'), Sub = require('../models/product-models/subCategory-model'), Rate = require('../models/product-models/GoldPricing-model');
const Cart = require('../models/shopping-models/cart-model'), Order = require('../models/shopping-models/order-model'), Payment = require('../models/shopping-models/payment-model');
const { Settings, Shipping, Page } = require('../models/store-models');
const { signAccessToken } = require('../utils/jwt');
const { requestOtp, consumeOtp } = require('../services/otp-service');
const payments = require('../services/shopping-services/payment-service');
let server, base, user, other, admin, p, sub, category, shipping, address, rate, order, payment;
const cookies = u => 'accessToken=' + signAccessToken(u);
async function api(path, method='GET', body, u=user, header=true) {
  const response = await fetch(base + path, { method, headers: { ...(u ? {Cookie:cookies(u)}:{}), ...(header?{'X-Requested-With':'Alpha'}:{}), ...(body?{'Content-Type':'application/json'}:{}) }, ...(body?{body:JSON.stringify(body)}:{}) });
  const text = await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}
  return { status:response.status, data, headers:response.headers };
}
const addr = { title:'خانه',recipientName:'کاربر تست',recipientPhone:'09120000001',province:'تهران',city:'تهران',addressLine:'خیابان آزمایشی، کوچه تست',postalCode:'1234567890',buildingNumber:'۱۲',unit:'۱' };
before(async()=>{
  await require('../scripts/start-local-db').startLocalDatabase(); await mongoose.connect(process.env.MONGODB_URI);
  for(const model of Object.values(mongoose.models)) await model.init();
  user = await User.create({ firstname:'کاربر',lastname:'تست',phonenumber:'09120000001',password:'testing-only-01234',phoneVerifiedAt:new Date() });
  other = await User.create({ firstname:'کاربر',lastname:'دیگر',phonenumber:'09120000002',password:'testing-only-01234',phoneVerifiedAt:new Date() });
  admin = await User.create({ firstname:'مدیر',lastname:'تست',phonenumber:'09120000003',password:'testing-only-01234',role:'admin' });
  category=await Category.create({name:'طلای اجرت‌دار',slug:'crafted-gold'}); sub=await Sub.create({name:'گردنبند',slug:'necklaces',category:category._id});
  p=await Product.create({name:'گردنبند تست',sku:'TEST-1',slug:'test-necklace',category:category._id,subCategory:sub._id,gender:'unisex',goldWeight:2,karat:18,wage:{type:'percent',value:10},stock:10});
  rate=await Rate.create({prices:{gold18:1000000},profitPercent:7,taxPercent:9});
  await Settings.create({salesEnabled:true});shipping=await Shipping.create({name:'ارسال تست',cost:80000});
  server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{await new Promise(r=>server?.close(r)); if(!/^alpha-test-\d+$/.test(mongoose.connection.name))throw new Error('Refuse test cleanup outside isolated test database'); await mongoose.connection.dropDatabase(); await mongoose.disconnect();});
test('all public page templates render; private pages redirect',async()=>{
  for(const path of ['/','/shop','/search?q=گردنبند','/category/crafted-gold','/product/test-necklace','/login','/cart','/guide','/about','/contact','/faq','/shipping','/returns','/privacy','/terms']) {const r=await api(path,'GET',null,null);assert.equal(r.status,200,path+': '+String(r.data).slice(0,150));assert.match(r.headers.get('content-type'),/html/);}
  const r=await fetch(base+'/account',{redirect:'manual'});assert.equal(r.status,302);
});
test('catalog returns computed prices and cannot expose inactive products through filters',async()=>{
  let r=await api('/api/products');assert.equal(r.data.data.products[0].price.finalPrice,2385860);
  await Product.updateOne({_id:p._id},{$set:{isActive:false}});r=await api('/api/products?isActive=false');assert.equal(r.data.data.products.length,0);await Product.updateOne({_id:p._id},{$set:{isActive:true}});
});
test('OTP is single-use and does not expose user password',async()=>{
  const request=await api('/api/auth/otp/request','POST',{phone:'۰۹۱۲۰۰۰۰۰۱۰'},null);assert.equal(request.status,200);
  const data=request.data.data;assert.match(data.developmentCode,/^\d{6}$/);
  const verified=await api('/api/auth/otp/verify','POST',{phone:'09120000010',challenge:data.challenge,code:data.developmentCode},null);assert.equal(verified.status,200);assert.equal(verified.data.data.user.password,undefined);assert.equal(verified.data.data.user.profileCompleted,false);
  assert.equal((await api('/api/auth/otp/verify','POST',{phone:'09120000010',challenge:data.challenge,code:data.developmentCode},null)).status,400);
});
test('OTP cooldown, attempt cap and production mock guard',async()=>{
  const data=await requestOtp('09120000011');await assert.rejects(requestOtp('09120000011'),/صبر/);
  for(let i=0;i<5;i++)await assert.rejects(consumeOtp({phone:'09120000011',challenge:data.challenge,code:'000000'}));
  await assert.rejects(consumeOtp({phone:'09120000011',challenge:data.challenge,code:data.developmentCode}));
  const env=process.env.NODE_ENV;process.env.NODE_ENV='production';try{await assert.rejects(requestOtp('09120000012'),/فعال/);}finally{process.env.NODE_ENV=env;}
});
test('direct phone changes and cookie requests without intent header are rejected',async()=>{
  assert.equal((await api('/api/account','PATCH',{phonenumber:'09120000099'})).status,400);
  assert.equal((await api('/api/account','PATCH',{firstname:'تغییر'},user,false)).status,403);
  assert.equal((await api('/api/store/admin/settings','GET')).status,403);
});
test('parallel first address creation produces exactly one default',async()=>{
  const results=await Promise.all([api('/api/addresses','POST',addr),api('/api/addresses','POST',{...addr,title:'محل کار'})]);
  results.forEach(r=>assert.equal(r.status,201,JSON.stringify(r.data)));assert.equal(await Address.countDocuments({user:user._id,isDefault:true}),1);
  address=await Address.findOne({user:user._id,isDefault:true});
});
test('address ownership and province-city membership enforced',async()=>{
  assert.equal((await api('/api/addresses/'+address._id,'PATCH',{title:'غیرمجاز'},other)).status,404);
  assert.equal((await api('/api/addresses','POST',{...addr,city:'شیراز'})).status,400);
  const non=await Address.findOne({user:user._id,isDefault:false});assert.equal((await api('/api/addresses/'+non._id,'PATCH',{isDefault:false})).status,200);assert.equal(await Address.countDocuments({user:user._id,isDefault:true}),1);
});
test('cart, price snapshot, shipping total and idempotent mock payment',async()=>{
  assert.equal((await api('/api/cart','POST',{productId:String(p._id),quantity:2})).status,200);
  const cart=await api('/api/cart');assert.equal(cart.data.data.cart.items[0].product.price.finalPrice,2385860);
  const prepared=await api('/api/orders','POST',{addressId:String(address._id),shippingMethodId:String(shipping._id)});assert.equal(prepared.status,201,JSON.stringify(prepared.data));order=prepared.data.data.order;assert.equal(order.totalAmount,4851720);assert.equal(order.subtotal,4771720);assert.equal(order.shippingCost,80000);
  const pay=await api('/api/payments/order/'+order._id,'POST',{quoteId:order.quoteId});assert.equal(pay.status,201,JSON.stringify(pay.data));payment=pay.data.data.payment;assert.equal(payment.gatewayAmount,order.totalAmount*10);
  const success=await api('/api/payments/mock/'+payment._id+'/success','POST');assert.equal(success.status,200,JSON.stringify(success.data));assert.equal(success.data.data.payment.status,'paid');
  await api('/api/payments/mock/'+payment._id+'/success','POST');assert.equal((await Product.findById(p._id)).stock,8);assert.equal((await Order.findById(order._id)).status,'confirmed');
});
test('customer order list only exposes registered post-payment orders',async()=>{
  let list=await api('/api/orders?limit=100');
  assert.equal(list.status,200);
  assert.equal(list.data.data.orders.some(o=>String(o._id)===String(order._id)),true);

  await Order.updateOne({_id:order._id},{$set:{status:'pending',paymentStatus:'unpaid'}});
  list=await api('/api/orders?limit=100');
  assert.equal(list.data.data.orders.some(o=>String(o._id)===String(order._id)),false);

  await Order.updateOne({_id:order._id},{$set:{status:'expired',paymentStatus:'failed'}});
  list=await api('/api/orders?limit=100');
  assert.equal(list.data.data.orders.some(o=>String(o._id)===String(order._id)),false);
  assert.equal((await api('/api/orders/'+order._id)).status,404);

  await Order.updateOne({_id:order._id},{$set:{status:'confirmed',paymentStatus:'paid'}});
});
test('order ownership and fulfillment transitions are protected',async()=>{
  assert.equal((await api('/api/orders/'+order._id,'GET',null,other)).status,404);
  assert.equal((await api('/api/orders/admin/'+order._id,'PATCH',{status:'delivered'},admin)).status,409);
  assert.equal((await api('/api/orders/admin/'+order._id,'PATCH',{status:'shipped'},admin)).status,400);
  assert.equal((await api('/api/orders/admin/'+order._id,'PATCH',{status:'shipped',trackingCode:'TEST-TRACK',carrier:'پست'},admin)).status,200);
  assert.equal((await api('/api/orders/admin/'+order._id,'PATCH',{status:'delivered'},admin)).status,200);
});
test('support thread is owner scoped and admin reply is persisted',async()=>{
  const r=await api('/api/store/tickets','POST',{subject:'پیگیری سفارش',message:'این یک درخواست آزمایشی است.',orderId:order._id});assert.equal(r.status,200);const id=r.data.data.ticket._id;
  assert.equal((await api(`/api/store/tickets/${id}/reply`,'POST',{message:'غیرمجاز'},other)).status,409);
  assert.equal((await api(`/api/store/admin/tickets/${id}`,'PATCH',{status:'answered',message:'پاسخ آزمایشی پشتیبانی'},admin)).status,200);
  const tickets=await api('/api/store/tickets');assert.equal(tickets.data.data.tickets[0].messages.length,2);
});
test('content drafts stay private and settings do not expose credentials',async()=>{
  assert.equal((await api('/api/store/admin/pages/terms','PUT',{title:'شرایط خرید',body:'PRIVATE_DRAFT_TEST',published:false},admin)).status,200);
  const r=await api('/terms','GET',null,null);assert.equal(String(r.data).includes('PRIVATE_DRAFT_TEST'),false);
  const settings=await api('/api/store/admin/settings','GET',null,admin);assert.equal(JSON.stringify(settings.data).includes(process.env.JWT_SECRET),false);
});
test('customer and admin template routes render with authenticated context',async()=>{
  for(const path of ['/account','/account/orders','/account/addresses','/account/profile','/account/wishlist','/account/support','/checkout','/payment/result','/account/orders/'+order._id+'/invoice'])assert.equal((await api(path)).status,200,path);
  for(const path of ['/admin','/admin/products','/admin/products/new','/admin/categories','/admin/subcategories','/admin/gold-pricing','/admin/orders','/admin/orders/'+order._id,'/admin/payments','/admin/users','/admin/carts','/admin/settings','/admin/sms','/admin/shipping','/admin/content','/admin/support','/admin/audit'])assert.equal((await api(path,'GET',null,admin)).status,200,path);
});

test('admin shares customer OTP login and receives account-only panel entry', async()=>{
  const challenge=await requestOtp(admin.phonenumber);
  const result=await api('/api/auth/otp/verify','POST',{phone:admin.phonenumber,challenge:challenge.challenge,code:challenge.developmentCode},null);
  assert.equal(result.status,200);assert.equal(result.data.data.user.role,'admin');
  const cookie=result.headers.get('set-cookie').split(';')[0];
  const account=await fetch(base+'/account',{headers:{Cookie:cookie}});
  assert.match(await account.text(),/class="account-admin-link" href="\/admin"/);
  assert.equal((await fetch(base+'/admin',{headers:{Cookie:cookie}})).status,200);
  assert.doesNotMatch((await api('/account')).data,/class="account-admin-link"/);
  const legacy=await fetch(base+'/admin/login',{redirect:'manual'});assert.equal(legacy.headers.get('location'),'/login');
  const anonymous=await fetch(base+'/admin',{redirect:'manual'});assert.equal(anonymous.headers.get('location'),'/login');
  const regular=await fetch(base+'/admin',{headers:{Cookie:cookies(user)},redirect:'manual'});assert.equal(regular.headers.get('location'),'/account');
  assert.equal((await api('/api/store/admin/settings','GET',null,user)).status,403);
});

test('admin catalog CRUD, dependency guards, media upload and filtered reads',async()=>{
 const act=(path,method,body)=>api(path,method,body,admin);
 let r=await act('/api/categories','POST',{name:'دسته آزمایشی مدیریت',slug:'admin-qa'});assert.equal(r.status,201,JSON.stringify(r.data));const c=r.data.data.category;
 r=await act('/api/categories/'+c._id,'PATCH',{name:'دسته ویرایش‌شده'});assert.equal(r.status,200);
 r=await act('/api/subCategories','POST',{name:'زیردسته آزمایشی',slug:'admin-qa',category:c._id});assert.equal(r.status,201,JSON.stringify(r.data));const sc=r.data.data.subCategory;
 assert.equal((await act('/api/categories/'+c._id,'DELETE')).status,409);
 r=await act('/api/products','POST',{name:'محصول آزمایشی مدیریت',sku:'ADMIN-QA',slug:'admin-qa',category:c._id,subCategory:sc._id,gender:'unisex',goldWeight:1.5,stock:2});assert.equal(r.status,201,JSON.stringify(r.data));const pr=r.data.data.product;
 assert.equal((await act('/api/subCategories/'+sc._id,'DELETE')).status,409);
 r=await act('/api/products/'+pr._id,'PATCH',{pricing:{mode:'custom',profitPercent:0,taxPercent:0,wageEnabled:false},isActive:false,stock:3});assert.equal(r.status,200);
 r=await act('/api/products/admin/'+pr._id);assert.equal(r.data.data.product.stock,3);assert.equal(r.data.data.product.pricing.profitPercent,0);
 const f=new FormData();f.append('coverImage',new Blob([require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/images/brand/logo-seal.png'))],{type:'image/png'}),'qa.png');
 r=await fetch(base+'/api/products/edit-cover/'+pr._id,{method:'PATCH',headers:{Cookie:cookies(admin),'X-Requested-With':'Alpha'},body:f});assert.equal(r.status,200,await r.text());
 assert.equal((await act('/api/products/delete-cover/'+pr._id,'DELETE')).status,200);
 assert.equal((await act('/api/products/'+pr._id,'DELETE')).status,204);
 assert.equal((await act('/api/subCategories/'+sc._id,'PATCH',{name:'زیردسته ویرایش‌شده',isActive:false})).status,200);
 assert.equal((await act('/api/subCategories/'+sc._id,'DELETE')).status,204);
 assert.equal((await act('/api/categories/'+c._id,'DELETE')).status,204);
 assert.equal((await act('/api/products/'+p._id,'DELETE')).status,409);
 for(const url of ['/api/admin/dashboard','/api/categories/all','/api/subCategories/all','/api/products/all?stock[lte]=10','/api/orders/all','/api/payments/all','/api/users','/api/cart/all','/api/store/admin/audit'])assert.equal((await act(url)).status,200,url);
 const dashboard=(await act('/api/admin/dashboard')).data.data.dashboard;
 assert.equal(typeof dashboard.orders.unshipped,'number');
 assert.equal(typeof dashboard.orders.undelivered,'number');
});
test('admin settings, shipping, user editing and status actions persist',async()=>{
 const act=(path,method,body)=>api(path,method,body,admin);
 let r=await act('/api/store/admin/shipping','POST',{name:'ارسال آزمایشی مدیریت',cost:20000,provinces:['تهران'],isActive:true});assert.equal(r.status,200,JSON.stringify(r.data));const id=r.data.data.method._id;
 assert.equal((await act('/api/store/admin/shipping/'+id,'PUT',{name:'ارسال ویرایش‌شده',cost:30000,isActive:false,provinces:[]})).status,200);
 assert.equal((await act('/api/store/admin/settings','PUT',{heroTitle:'عنوان آزمایشی',whatsapp:'https://wa.me/989121234567',otpTtlSeconds:120,otpResendSeconds:60})).status,200);
 const savedSettings=(await act('/api/store/admin/settings')).data.data.settings;assert.equal(savedSettings.heroTitle,'عنوان آزمایشی');assert.equal(savedSettings.whatsapp,'https://wa.me/989121234567');
 assert.equal((await act('/api/users/'+other._id,'PATCH',{firstname:'ویرایش',accountStatus:{status:'suspended',reason:'other'}})).status,200);
 assert.equal((await api('/api/account','GET',null,other)).status,403);
 assert.equal((await act('/api/users/'+other._id,'PATCH',{accountStatus:{status:'active'}})).status,200);
 assert.equal((await act('/api/users/'+admin._id,'DELETE')).status,400);
 assert.equal((await act('/api/addresses/admin/user/'+user._id)).status,200);
});
