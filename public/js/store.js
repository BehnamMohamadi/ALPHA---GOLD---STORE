/* Alpha storefront: server-authoritative prices, quotes and payment state. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s), $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const digits = v => String(v).replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const num = v => new Intl.NumberFormat('fa-IR').format(v), money = v => typeof v === 'number' ? `${num(v)} تومان` : 'نرخ در دسترس نیست';
  const date = v => v ? new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)) : '—';
  const auth = document.body.dataset.authenticated === 'true';
  let toastTimer;
  function toast(message, error = false) { const el = $('#toast'); el.textContent = message; el.className = `toast${error?' error':''}`; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.hidden=true,6000); }
  const messages = { 'cart is empty':'سبد خرید خالی است.', 'product is already in wishlist':'این محصول در علاقه‌مندی‌های شماست.', 'requested quantity is not available':'موجودی برای این تعداد کافی نیست.', 'product is not available':'این محصول در دسترس نیست.', 'please login first':'ابتدا وارد حساب شوید.', 'validation failed':'اطلاعات فرم معتبر نیست. موارد واردشده را بررسی کنید.', 'phonenumber or password is incorrect':'شماره یا رمز عبور صحیح نیست.', 'order price has expired; prepare a new order before payment':'قیمت منقضی شده است؛ سفارش را با نرخ جدید بازبینی کنید.' };
  async function api(url, method = 'GET', body) {
    const response = await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'Alpha',...(body ? {'Content-Type':'application/json'} : {})},...(body?{body:JSON.stringify(body)}:{})});
    if(response.status===204) return {};
    const payload = await response.json().catch(()=>({message:'ارتباط با سرور برقرار نشد.'}));
    if(!response.ok) { const e = new Error(messages[payload.message] || payload.message || 'عملیات انجام نشد.'); e.status = response.status; e.code = payload.code; e.details = payload.details; throw e; }
    return payload.data ? { ...payload.data, _meta: { totalPages: payload.totalPages, total: payload.total } } : payload;
  }
  function safeNext() { const next = new URLSearchParams(location.search).get('next'); return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/account'; }
  const needLogin = () => { if(auth) return false; location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search); return true; };
  const loading = '<div class="loading">در حال دریافت اطلاعات…</div>';
  function errorView(el,e) { el.innerHTML = `<div class="notice error" role="alert">${esc(e.message)}</div><div class="actions"><button class="button secondary" data-action="reload">تلاش دوباره</button><a href="/shop">بازگشت به فروشگاه</a></div>`; }
  const empty = (heading,body,href='/shop',action='مشاهده زیورآلات') => `<div class="empty"><h2>${esc(heading)}</h2><p>${esc(body)}</p><a class="button secondary" href="${esc(href)}">${esc(action)} ←</a></div>`;
  function photo(src,alt='') { const m = /\/demo-(\d)\.svg$/.exec(src||''); return m ? `<div class="product-photo sprite sprite-${m[1]}" role="img" aria-label="${esc(alt)}"></div>` : `<img class="product-photo" src="${esc(src||'/images/brand/placeholder.svg')}" alt="${esc(alt)}" loading="lazy">`; }
  const statusLabels = {pending:'در انتظار',payment_pending:'در حال پرداخت',review:'نیازمند بررسی',confirmed:'تأییدشده',shipped:'ارسال‌شده',delivered:'تحویل‌شده',cancelled:'لغوشده',expired:'منقضی‌شده',unpaid:'پرداخت‌نشده',paid:'پرداخت‌شده',failed:'ناموفق',refunded:'برگشت وجه',open:'باز',answered:'پاسخ داده‌شده',closed:'بسته‌شده'};
  const badge = v => `<span class="badge ${['paid','confirmed','delivered','answered'].includes(v)?'success':['failed','review','expired','cancelled'].includes(v)?'danger':'info'}">${esc(statusLabels[v]||v)}</span>`;
  const formData = form => Object.fromEntries(new FormData(form));
  async function busy(button,fn) { if(button?.disabled)return; if(button)button.disabled=true; try { await fn(); } catch(e) { toast(e.message,true); } finally { if(button?.isConnected)button.disabled=false; } }
  function confirmAction(message) { return new Promise(resolve=>{const d=$('#confirm-dialog');$('#confirm-message').textContent=message;const end=v=>{d.close();resolve(v);};$('#confirm-yes').onclick=()=>end(true);$('#confirm-no').onclick=()=>end(false);d.oncancel=()=>resolve(false);d.showModal();}); }
  let currentCart = {items:[]}, cartChanging = false, reviewOrder = null, quoteDirty = false;
  function purchaseControl(p, quantity = 0) {
    const id = String(p?._id || ''), available = p?.isActive !== false && p?.priceAvailable !== false && p?.stock > 0;
    return `<div class="cart-control" data-purchase="${esc(id)}" data-stock="${Number(p?.stock)||0}" data-available="${available}">${purchaseButtons(id,quantity,available,Number(p?.stock)||0)}</div>`;
  }
  function purchaseButtons(id,q,available,stock) {
    if (!q) return `<button type="button" class="button cart-add" data-action="cart-add" data-id="${esc(id)}" ${!available||cartChanging?'disabled':''}><svg class="cart-bag-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg><span>${available?'افزودن به سبد خرید':'ناموجود / در انتظار نرخ'}</span></button>`;
    return `<div class="cart-stepper" role="group" aria-label="تعداد در سبد خرید"><button type="button" data-action="cart-decrease" data-id="${esc(id)}" aria-label="${q===1?'حذف از سبد خرید':'کاهش تعداد'}" ${cartChanging?'disabled':''}>−</button><span class="cart-quantity" aria-live="polite"><strong>${num(q)}</strong><small>در سبد خرید</small></span><button type="button" data-action="cart-increase" data-id="${esc(id)}" aria-label="افزایش تعداد" ${cartChanging||!available||q>=stock?'disabled':''}>+</button></div>`;
  }
  function paintCart(cart, animate = false) {
    currentCart = cart;
    const total = cart.items.reduce((n,i)=>n+i.quantity,0);
    $('#cart-count').textContent=num(total); $('#cart-count').hidden=!total;
    $$('[data-purchase]').forEach(host => {
      const item=cart.items.find(i=>String(i.product?._id||i.product)===host.dataset.purchase);
      const p=item?.product, q=item?.quantity||0;
      const available=p ? p.isActive && p.priceAvailable && p.stock>0 : host.dataset.available==='true';
      const markup=purchaseButtons(host.dataset.purchase,q,available,p?.stock??Number(host.dataset.stock));
      if(host.innerHTML===markup)return;
      host.innerHTML=markup;
      if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)host.animate([{opacity:.55,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});
    });
  }
  async function cartCount() { if(!auth)return; try { const {cart}=await api('/api/cart');paintCart(cart); }catch{} }
  function checkoutProducts() {
    return currentCart.items.map(i=>`<article class="checkout-item"><div>${photo(i.product?.coverImage,i.product?.name)}<strong>${esc(i.product?.name||'محصول در دسترس نیست')}</strong></div>${purchaseControl(i.product,i.quantity)}<span>${money((i.product?.price?.finalPrice||0)*i.quantity)}</span></article>`).join('');
  }
  async function changeCart(button) {
    if(needLogin()||cartChanging)return;
    cartChanging=true;paintCart(currentCart);
    if(reviewOrder){quoteDirty=true;$('#pay-order').disabled=true;}
    try {
      const {cart:latest}=await api('/api/cart');
      const id=button.dataset.id, item=latest.items.find(i=>String(i.product?._id||i.product)===id);
      const q=item?.quantity||0, next=button.dataset.action==='cart-remove'?0:button.dataset.action==='cart-decrease'?Math.max(0,q-1):q+1;
      if(next===0)await api('/api/cart/item','DELETE',{productId:id});
      else await api('/api/cart',q?'PATCH':'POST',{productId:id,quantity:next});
      const {cart}=await api('/api/cart');paintCart(cart,true);
      if($('#cart-page'))await loadCart();
      if(reviewOrder){
        if(!cart.items.length){reviewOrder=null;clearInterval(quoteTimer);$('#checkout-page').innerHTML=empty('سبد خرید شما خالی شد.','برای ادامه، محصولی انتخاب کنید.');}
        else {const {order}=await api('/api/orders','POST',{addressId:reviewOrder.shippingAddressSnapshot.addressId,shippingMethodId:reviewOrder.shippingMethodSnapshot.id});review(order,false);}
      }else if($('#checkout-items')){
        $('#checkout-items').innerHTML=checkoutProducts();
        $('#prepare-order').disabled=!cart.items.length||!$('input[name=shipping]:checked');
      }
    }catch(error){
      toast(error.message,true);
      await cartCount();
      if(reviewOrder){$('#payment-error').textContent='تعداد یا قیمت تغییر کرده است. پیش از پرداخت، قیمت جدید را دریافت کنید.';$('#refresh-quote').hidden=false;}
    }finally{cartChanging=false;paintCart(currentCart,true);}
  }
  let wishlistQueue = Promise.resolve();
  const wishPending = new Set();
  function paintWishlist(wishlist) {
    const saved = new Set((wishlist?.items || []).map(item => String(item.product?._id || item.product)));
    $$('[data-action="wishlist"]').forEach(button => {
      const selected = saved.has(button.dataset.id);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', selected ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها');
    });
  }
  async function refreshWishlist() {
    if (!auth || !document.querySelector('[data-action="wishlist"]')) return;
    const {wishlist} = await api('/api/wishlists'); paintWishlist(wishlist);
  }
  async function toggleWishlist(button) {
    const id = button.dataset.id;
    if (wishPending.has(id)) return;
    wishPending.add(id);
    const matching = $$('[data-action="wishlist"]').filter(b => b.dataset.id === id);
    matching.forEach(b => { b.disabled = true; b.setAttribute('aria-busy','true'); });
    const task = wishlistQueue.then(async () => {
      const {wishlist: current} = await api('/api/wishlists');
      paintWishlist(current);
      const selected = current.items.some(i => String(i.product?._id || i.product) === id);
      try {
        const {wishlist} = await api(selected ? '/api/wishlists/' + id : '/api/wishlists', selected ? 'DELETE' : 'POST', selected ? undefined : {productId:id});
        paintWishlist(wishlist);
        toast(selected ? 'از علاقه‌مندی‌ها حذف شد.' : 'به علاقه‌مندی‌ها اضافه شد.');
        if ($('#account-page')?.dataset.section === 'wishlist') await account();
      } catch(error) {
        await refreshWishlist().catch(() => {});
        throw error;
      }
    });
    wishlistQueue = task.catch(() => {});
    try { await task; } catch(error) { toast(error.message,true); }
    finally { wishPending.delete(id); matching.forEach(b => { b.disabled=false; b.removeAttribute('aria-busy'); }); }
  }
  window.addEventListener('pageshow', () => { wishlistQueue.then(refreshWishlist).catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wishlistQueue.then(refreshWishlist).catch(() => {}); });
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-action]');if(!b)return;
    const action=b.dataset.action;
    if(action==='menu'){const nav=$('#mobile-nav');nav.hidden=!nav.hidden;b.setAttribute('aria-expanded',String(!nav.hidden));return;}
    if(action==='reload'){location.reload();return;}
    if(action==='photo'){const wrap=$('#main-product-photo');if(wrap)wrap.innerHTML=photo(b.dataset.src,'نمای محصول');return;}
    if(action==='print'){window.print();return;}
    if(action==='wishlist'){if(!needLogin())await toggleWishlist(b);return;}
    if(['cart-add','cart-increase','cart-decrease','cart-remove'].includes(action)){await changeCart(b);return;}
    if(action==='logout')await busy(b,async()=>{await api('/api/auth/logout','POST');location.href='/';});
  });
  document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement && !event.target.src.endsWith('/images/brand/placeholder.svg'))event.target.src='/images/brand/placeholder.svg';},true);
  async function login() {
    if(!$('#otp-request'))return;let phone='',challenge='',nextSend=0,timer;
    const err=$('#login-error');
    function clock(){const remaining=Math.max(0,Math.ceil((nextSend-Date.now())/1000));$('#otp-resend').disabled=remaining>0;$('#otp-countdown').textContent=remaining?`${num(remaining)} ثانیه تا درخواست مجدد`:'';}
    async function request(){err.textContent='';const data=await api('/api/auth/otp/request','POST',{phone});challenge=data.challenge;nextSend=Date.now()+data.retryAfter*1000;$('#login-phone-step').hidden=true;$('#login-code-step').hidden=false;$('#otp-destination').textContent=`کد ارسال‌شده برای ${phone} را وارد کنید.`;if($('#dev-code'))$('#dev-code').textContent=data.developmentCode?`${data.developmentCode}`:'';clearInterval(timer);timer=setInterval(clock,1000);clock();$('#otp-verify input').value='';$('#otp-verify input').focus();}
    $('#otp-request').onsubmit=e=>{e.preventDefault();phone=digits(formData(e.target).phone);busy(e.submitter,async()=>{try{await request();}catch(ex){err.textContent=ex.message;}});};
    $('#otp-verify').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{try{const {user}=await api('/api/auth/otp/verify','POST',{phone,challenge,code:digits(formData(e.target).code)});location.href=user.profileCompleted?safeNext():`/account/profile?next=${encodeURIComponent(safeNext())}`;}catch(ex){err.textContent=ex.message;}});};
    $('#otp-resend').onclick=e=>busy(e.target,request);
    $('#otp-change').onclick=()=>{clearInterval(timer);$('#login-phone-step').hidden=false;$('#login-code-step').hidden=true;err.textContent='';};
  }
  async function loadCart() {
    const el=$('#cart-page');if(!el)return;
    if(!auth){el.innerHTML=empty('انتخاب‌هایتان را همراه خود داشته باشید.','برای مشاهده سبد خرید وارد حساب شوید.','/login?next=/cart','ورود با شماره موبایل');return;}
    try{const {cart}=await api('/api/cart');if(!cart.items.length){el.innerHTML=empty('سبد خرید شما هنوز خالی است.','یک انتخاب کوچک می‌تواند شروع یک داستان زیبا باشد.');return;}
      paintCart(cart);
      const valid=cart.items.every(i=>i.product?.priceAvailable&&i.product.isActive&&i.product.stock>=i.quantity);
      const total=cart.items.reduce((n,i)=>n+(i.product?.price?.finalPrice||0)*i.quantity,0);
      el.innerHTML=`<div class="cart-layout"><div class="panel">${cart.items.map(i=>{const p=i.product;return `<article class="cart-row">${photo(p?.coverImage,p?.name)}<div><h3>${p?`<a href="/product/${encodeURIComponent(p.slug)}">${esc(p.name)}</a>`:'محصول حذف‌شده'}</h3><small>${p?`طلای ${num(p.karat)} عیار · ${num(p.goldWeight)} گرم`:''}</small>${!p?.priceAvailable||!p?.isActive||p.stock<i.quantity?'<small class="form-error">قیمت یا موجودی این محصول نیاز به بررسی دارد.</small>':''}${purchaseControl(p,i.quantity)}<button class="remove text-button" data-action="cart-remove" data-id="${p?._id||i.productId||''}">حذف از سبد</button></div><strong class="price">${p?.price?money(p.price.finalPrice*i.quantity):'—'}</strong></article>`;}).join('')}<div class="actions"><button class="text-button" id="clear-cart">خالی‌کردن سبد</button></div></div><aside class="panel order-summary"><h2>خلاصه سفارش</h2><dl><div><dt>جمع محصولات</dt><dd>${money(total)}</dd></div><div><dt>هزینه ارسال</dt><dd>مرحله بعد</dd></div></dl><small>قیمت طلا در مرحله بازبینی سفارش دوباره محاسبه می‌شود.</small><a href="/checkout" class="button full" ${!valid?'aria-disabled="true" tabindex="-1"':''}>ادامه و انتخاب آدرس ←</a>${!valid?'<p class="notice error">پیش از ادامه، محصولات ناموجود یا بدون نرخ را اصلاح کنید.</p>':''}</aside></div>`;
      $('#clear-cart').onclick=e=>busy(e.target,async()=>{if(cartChanging)return;if(await confirmAction('همه محصولات از سبد خرید حذف شوند؟')){if(cartChanging)return;cartChanging=true;paintCart(currentCart);try{await api('/api/cart','DELETE');await loadCart();await cartCount();}finally{cartChanging=false;paintCart(currentCart);}}});
    }catch(e){errorView(el,e);}
  }
  let locations;
  async function addressForm(host,address={},afterSave){
    locations ||= (await api('/api/store/locations')).provinces;
    host.innerHTML=`<div class="panel"><h2>${address._id?'ویرایش آدرس':'آدرس جدید'}</h2><form id="address-form" class="form-grid"><label>عنوان آدرس<input name="title" required maxlength="40" value="${esc(address.title||'خانه')}"></label><label>نام گیرنده<input name="recipientName" required minlength="2" maxlength="80" value="${esc(address.recipientName)}"></label><label>شماره گیرنده<input name="recipientPhone" type="tel" dir="ltr" required value="${esc(address.recipientPhone)}"></label><label>کد پستی<input name="postalCode" inputmode="numeric" dir="ltr" maxlength="10" minlength="10" required value="${esc(address.postalCode)}"></label><label>استان<select name="province" required><option value="">انتخاب استان</option>${locations.map(p=>`<option ${address.province===p.name?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>شهر<select name="city" required><option value="">ابتدا استان را انتخاب کنید</option></select></label><label class="span-2">نشانی کامل<textarea name="addressLine" minlength="5" maxlength="500" required>${esc(address.addressLine)}</textarea></label><label>پلاک<input name="buildingNumber" maxlength="20" value="${esc(address.buildingNumber)}"></label><label>واحد<input name="unit" maxlength="20" value="${esc(address.unit)}"></label><label class="check span-2"><input type="checkbox" name="isDefault" ${address.isDefault?'checked':''}>آدرس پیش‌فرض من باشد</label><div class="actions span-2"><button class="button">ذخیره آدرس</button><button type="button" class="button secondary" id="cancel-address">انصراف</button></div></form></div>`;
    const f=$('#address-form',host);const cities=()=>{const province=locations.find(p=>p.name===f.elements.province.value);f.elements.city.innerHTML='<option value="">انتخاب شهر</option>'+(province?.cities||[]).map(c=>`<option ${address.city===c?'selected':''}>${esc(c)}</option>`).join('');};cities();f.elements.province.onchange=cities;
    $('#cancel-address',host).onclick=()=>host.innerHTML='';
    f.onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{const data=formData(f);data.recipientPhone=digits(data.recipientPhone);data.postalCode=digits(data.postalCode);data.isDefault=f.elements.isDefault.checked;try{await api(`/api/addresses${address._id?'/'+address._id:''}`,address._id?'PATCH':'POST',data);}catch(error){if(window.AlphaForms?.server(f,error))return;throw error;}host.innerHTML='';toast('آدرس ذخیره شد.');await afterSave();});};
    host.scrollIntoView({behavior:'smooth',block:'center'});
  }
  const addressCard=(a,selectable=false)=>`<div class="address-card ${a.isDefault?'default':''}">${selectable?`<label class="check"><input type="radio" name="address" value="${a._id}" ${a.isDefault?'checked':''}><b>${esc(a.title)}</b></label>`:`<h3>${esc(a.title)} ${a.isDefault?'<span class="badge success">پیش‌فرض</span>':''}</h3>`}<p>${esc(a.recipientName)}</p><p>${esc(a.province)}، ${esc(a.city)}، ${esc(a.addressLine)}</p><p>پلاک ${esc(a.buildingNumber||'—')}، واحد ${esc(a.unit||'—')}</p><p>${esc(a.recipientPhone)} · ${esc(a.postalCode)}</p>${!selectable?`<div class="actions"><button class="text-button" data-address="edit" data-id="${a._id}">ویرایش</button><button class="text-button" data-address="delete" data-id="${a._id}">حذف</button>${!a.isDefault?`<button class="text-button" data-address="default" data-id="${a._id}">پیش‌فرض شود</button>`:''}</div>`:''}</div>`;
  async function checkout(){
    const el=$('#checkout-page');if(!el)return;reviewOrder=null;clearInterval(quoteTimer);
    try{const {user}=await api('/api/account');if(!user.profileCompleted||!user.phoneVerifiedAt){el.innerHTML=empty('اطلاعات حسابتان را کامل کنید.','برای خرید، نام گیرنده و شماره تأییدشده لازم است.',!user.phoneVerifiedAt?'/account/profile':'/account/profile?next=/checkout','تکمیل حساب');return;}
      const {addresses}=await api('/api/addresses');
      const {cart}=await api('/api/cart');paintCart(cart);
      if(!cart.items.length){el.innerHTML=empty('سبد خرید شما خالی است.','برای ادامه، محصولی انتخاب کنید.');return;}
      el.innerHTML=`<div class="checkout-layout"><section><div class="panel"><h2>محصولات سفارش</h2><div id="checkout-items">${checkoutProducts()}</div></div><div class="panel"><div class="section-heading"><h2>۱. آدرس تحویل</h2><button class="text-button" id="checkout-new-address">+ آدرس جدید</button></div><div class="address-grid">${addresses.map(a=>addressCard(a,true)).join('')||'<p>اولین آدرس خود را ثبت کنید.</p>'}</div></div><div id="address-editor"></div><div class="panel"><h2>۲. روش ارسال</h2><div id="shipping-options">آدرس را انتخاب کنید.</div></div></section><aside class="panel order-summary"><h2>قبل از پرداخت</h2><p>در مرحله بعد، مبلغ دقیق طلا، اجرت، سود، مالیات و ارسال را بررسی می‌کنید.</p><button class="button full" id="prepare-order" disabled>دریافت قیمت و بازبینی ←</button><p class="form-error" id="checkout-error" role="alert"></p></aside></div>`;
      $('#checkout-new-address').onclick=()=>addressForm($('#address-editor'),{},checkout);
      const loadShipping=async()=>{const a=addresses.find(x=>x._id===$('input[name=address]:checked')?.value);if(!a)return;const {methods}=await api('/api/store/shipping?province='+encodeURIComponent(a.province));$('#shipping-options').innerHTML=methods.map((m,i)=>`<label class="check"><input type="radio" name="shipping" value="${m._id}" ${i===0?'checked':''}><span><b>${esc(m.name)}</b> — ${money(m.cost)}<small> ${esc(m.description)}${m.freeAbove!==null?' · رایگان بالای '+money(m.freeAbove):''}</small></span></label>`).join('')||'<p class="notice">در حال حاضر روشی برای ارسال به این استان فعال نیست.</p>';$('#prepare-order').disabled=!methods.length||!currentCart.items.length||cartChanging;};
      $$('input[name=address]').forEach(r=>r.onchange=()=>loadShipping().catch(e=>toast(e.message,true)));await loadShipping();
      $('#prepare-order').onclick=e=>busy(e.target,async()=>{if(cartChanging)return;try{const {order}=await api('/api/orders','POST',{addressId:$('input[name=address]:checked')?.value,shippingMethodId:$('input[name=shipping]:checked')?.value});review(order);}catch(ex){$('#checkout-error').textContent=ex.message;}});
    }catch(e){errorView(el,e);}
  }
  function invoiceItems(order,editable=false){return `<div class="table-scroll"><table class="invoice-table"><thead><tr><th>محصول</th><th>وزن / عیار</th><th>تعداد</th><th>طلا</th><th>اجرت</th><th>سود</th><th>مالیات</th><th>متعلقات</th><th>جمع</th></tr></thead><tbody>${order.items.map(i=>{const p=i.pricingSnapshot;return `<tr><td>${esc(i.productSnapshot.name)}<br><small>${esc(i.productSnapshot.sku)}</small></td><td>${num(p.goldWeight)} / ${num(p.karat)}</td><td>${editable?purchaseControl(currentCart.items.find(x=>String(x.product?._id)===String(i.product?._id||i.product))?.product||{_id:i.product?._id||i.product,stock:i.quantity},i.quantity):num(i.quantity)}</td><td>${num(p.goldValue*i.quantity)}</td><td>${num(p.wage.amount*i.quantity)}</td><td>${num(p.profit.amount*i.quantity)}</td><td>${num(p.tax.amount*i.quantity)}</td><td>${num(p.accessoriesPrice*i.quantity)}</td><td>${num(i.totalPrice)}</td></tr>`;}).join('')}</tbody></table></div><small>تمام مبالغ به تومان است. مبالغ اجزا با احتساب تعداد نمایش داده می‌شوند.</small>`;}
  function orderTotals(o){return `<dl><div><dt>جمع محصولات</dt><dd>${money(o.subtotal||o.items.reduce((n,i)=>n+i.totalPrice,0))}</dd></div><div><dt>${esc(o.shippingMethodSnapshot?.name||'ارسال')}</dt><dd>${money(o.shippingCost||0)}</dd></div><div class="total"><dt>مبلغ نهایی</dt><dd>${money(o.totalAmount)}</dd></div></dl>`;}
  let quoteTimer;
  function review(order,scroll=true){reviewOrder=order;quoteDirty=false;const el=$('#checkout-page');el.innerHTML=`<div class="panel"><div class="section-heading"><h2>۳. بازبینی سفارش</h2><span>${esc(order.orderNumber)}</span></div>${invoiceItems(order,true)}</div><div class="checkout-layout"><div class="panel"><h2>آدرس و روش ارسال</h2><p>${esc(order.shippingAddressSnapshot.recipientName)}</p><p>${esc(order.shippingAddressSnapshot.province)}، ${esc(order.shippingAddressSnapshot.city)}، ${esc(order.shippingAddressSnapshot.addressLine)}</p><p>${esc(order.shippingMethodSnapshot?.name)} · ${esc(order.shippingMethodSnapshot?.description)}</p><button class="text-button" id="edit-checkout">ویرایش آدرس و ارسال</button></div><aside class="panel order-summary">${orderTotals(order)}<p class="notice" id="quote-countdown"></p><label class="check"><input type="checkbox" id="accept-order">جزئیات قیمت و <a href="/terms" target="_blank" rel="noopener">شرایط خرید</a> را بررسی کردم.</label><button class="button full" id="pay-order" disabled>پرداخت و ثبت سفارش ←</button><button class="text-button" id="refresh-quote" hidden>دریافت قیمت جدید</button><p id="payment-error" class="form-error" role="alert"></p></aside></div>`;
    const tick=()=>{const sec=Math.max(0,Math.floor((new Date(order.priceExpiresAt)-Date.now())/1000));$('#quote-countdown').textContent=sec?`اعتبار این قیمت: ${num(Math.floor(sec/60))}:${String(sec%60).padStart(2,'0')}`:'اعتبار قیمت تمام شد. قیمت جدید را دریافت و بررسی کنید.';$('#pay-order').disabled=cartChanging||quoteDirty||!sec||!$('#accept-order').checked;$('#refresh-quote').hidden=sec>0&&!quoteDirty;};
    clearInterval(quoteTimer);quoteTimer=setInterval(()=>{if(!$('#quote-countdown')){clearInterval(quoteTimer);return;}tick();},1000);tick();$('#accept-order').onchange=tick;
    $('#edit-checkout').onclick=()=>{if(!cartChanging)checkout();};$('#refresh-quote').onclick=e=>busy(e.target,async()=>{if(cartChanging)return;await cartCount();const data=await api('/api/orders','POST',{addressId:order.shippingAddressSnapshot.addressId,shippingMethodId:order.shippingMethodSnapshot.id});review(data.order);});
    $('#pay-order').onclick=e=>busy(e.target,async()=>{if(cartChanging||quoteDirty)return;cartChanging=true;paintCart(currentCart);try{const result=await api(`/api/payments/order/${order._id}`,'POST',{quoteId:order.quoteId});location.href=result.redirectUrl||`/payment/mock?id=${result.payment._id}`;}catch(ex){$('#payment-error').textContent=ex.message;cartChanging=false;paintCart(currentCart);}});if(scroll)el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }
  async function payment(){const el=$('#payment-page');if(!el)return;const id=new URLSearchParams(location.search).get('id');if(!id){el.innerHTML=empty('وضعیت پرداخت مشخص نیست.','برای بررسی دقیق، سفارش‌های خود را باز کنید.','/account/orders','سفارش‌های من');return;}
    try{const {payment:p}=await api('/api/payments/'+encodeURIComponent(id));const order=p.order?._id||p.order;const isMock=el.dataset.mock==='true'&&p.gateway==='mock';
      if(isMock&&['pending','created'].includes(p.status)){el.innerHTML=`<p class="notice">درگاه آزمایشی محلی · هیچ پولی جابه‌جا نمی‌شود.</p><h1>پرداخت آزمایشی آلفا</h1><p>${money(p.amount)}</p><button class="button" id="mock-success">شبیه‌سازی پرداخت موفق</button><div class="actions"><a href="/payment/result?id=${p._id}">بازگشت بدون پرداخت</a></div>`;$('#mock-success').onclick=e=>busy(e.target,async()=>{await api(`/api/payments/mock/${p._id}/success`,'POST');location.href=`/payment/result?id=${p._id}`;});return;}
      const success=p.status==='paid',reviewing=success&&p.requiresReview;
      el.innerHTML=`<div class="result-icon ${!success?'failed':''}">${success?'✓':'!'}</div><h1>${reviewing?'پرداخت دریافت شد؛ سفارش نیازمند بررسی است':success?'پرداخت با موفقیت انجام شد':p.status==='pending'?'پرداخت هنوز نهایی نشده است':'پرداخت تکمیل نشد'}</h1><p>${reviewing?'مبلغ دریافت‌شده ثبت شده است. نتیجه بررسی را از سفارش و پشتیبانی دنبال کنید.':success?'از اعتماد شما ممنونیم. جزئیات سفارش در حساب شما قابل مشاهده است.':'نتیجه فقط پس از تأیید درگاه ثبت می‌شود. وضعیت را دوباره بررسی کنید.'}</p><div class="panel">${money(p.amount)}<br><small>سفارش: ${esc(p.order?.orderNumber||'—')}</small>${p.referenceId?`<p>شماره پیگیری: ${esc(p.referenceId)}</p>`:''}</div><div class="actions"><a class="button" href="/account/orders/${order}">مشاهده سفارش</a><button class="button secondary" data-action="reload">بررسی مجدد</button></div>`;
    }catch(e){errorView(el,e);}
  }
  const productCard=p=>`<article class="product-card wishlist-card"><button class="wish-button" data-action="wishlist" data-id="${p._id}" aria-pressed="true" aria-label="حذف از علاقه‌مندی‌ها"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></button><div class="product-image"><a href="/product/${encodeURIComponent(p.slug)}">${photo(p.coverImage,p.name)}</a></div><div class="product-info"><span class="eyebrow">طلای ${num(p.karat)} عیار</span><h3><a href="/product/${encodeURIComponent(p.slug)}">${esc(p.name)}</a></h3><div class="product-meta"><span>${num(p.goldWeight)} گرم</span><strong>${p.priceAvailable?money(p.price.finalPrice):'در انتظار نرخ جدید'}</strong></div></div>${purchaseControl(p,currentCart.items.find(i=>String(i.product?._id)===String(p._id))?.quantity||0)}<button class="text-button" data-remove-wish="${p._id}">حذف از علاقه‌مندی‌ها</button></article>`;
  const orderCard=o=>`<article class="order-card"><header><b>${esc(o.orderNumber)}</b><span>${badge(o.status)} ${badge(o.paymentStatus)}</span></header><small>${date(o.createdAt)}</small><div class="mini-images">${o.items.slice(0,4).map(i=>photo(i.productSnapshot.coverImage,i.productSnapshot.name)).join('')}</div><footer><strong>${money(o.totalAmount)}</strong><a class="button secondary" href="/account/orders/${o._id}">جزئیات سفارش ←</a></footer></article>`;
  async function account(){const el=$('#account-page');if(!el)return;const section=el.dataset.section;
    try{
      if(section==='overview'){const [{user},{orders}]=await Promise.all([api('/api/account'),api('/api/orders?limit=100')]);el.innerHTML=`${!user.profileCompleted?'<div class="notice">برای شروع خرید، <a href="/account/profile">اطلاعات حساب را کامل کنید.</a></div>':''}<div class="stat-grid"><div class="stat"><span>سفارش‌های اخیر</span><strong>${num(orders.length)}</strong></div><div class="stat"><span>در حال آماده‌سازی</span><strong>${num(orders.filter(o=>o.status==='confirmed').length)}</strong></div><div class="stat"><span>ارسال‌شده</span><strong>${num(orders.filter(o=>o.status==='shipped').length)}</strong></div></div><nav class="account-shortcuts" aria-label="دسترسی سریع"><a href="/account/wishlist"><span class="shortcut-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg></span><b>علاقه‌مندی‌ها</b><span>انتخاب‌های محبوب شما ↗</span></a><a href="/account/addresses"><span class="shortcut-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg></span><b>آدرس‌های من</b><span>مدیریت نشانی‌های تحویل ↗</span></a><a href="/account/support"><span class="shortcut-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 13v-2a8 8 0 0 1 16 0v2M4 12H2v6h4v-6ZM20 12h2v6h-4v-6ZM20 18c0 3-4 3-8 3"/></svg></span><b>همراه شما هستیم</b><span>گفت‌وگو با پشتیبانی ↗</span></a></nav><h2 class="account-orders-title">آخرین انتخاب‌های شما</h2>${orders.slice(0,3).map(orderCard).join('')||empty('به دنیای آلفا خوش آمدید.','هنوز سفارشی ثبت نکرده‌اید.')}<a class="text-link" href="/account/orders">همه سفارش‌ها ←</a>`;}
      if(section==='orders'){const page=Math.max(1,Number(new URLSearchParams(location.search).get('page'))||1);const data=await api('/api/orders?limit=10&page='+page);el.innerHTML=`<h2>سفارش‌های من</h2>${data.orders.map(orderCard).join('')||empty('هنوز سفارشی ندارید.','انتخاب‌های شما اینجا ثبت خواهند شد.')}<nav class="pagination">${page>1?`<a href="?page=${page-1}">قبلی</a>`:''}${page<(data._meta?.totalPages||1)?`<a href="?page=${page+1}">صفحه بعد</a>`:''}</nav>`;}
      if(section==='order')await renderOrder(el);
      if(section==='addresses')await renderAddresses(el);
      if(section==='wishlist'){const {wishlist}=await api('/api/wishlists');const products=wishlist.items.map(i=>i.product).filter(Boolean);el.innerHTML='<h2>علاقه‌مندی‌های شما</h2>'+ (products.length?`<div class="products-grid catalog-products">${products.map(productCard).join('')}</div>`:empty('انتخاب‌های محبوبتان را نگه دارید.','قلب کنار هر محصول را بزنید تا اینجا ذخیره شود.'));$$('[data-remove-wish]',el).forEach(b=>b.onclick=()=>busy(b,async()=>{const {wishlist}=await api('/api/wishlists/'+b.dataset.removeWish,'DELETE');paintWishlist(wishlist);await account();}));}
      if(section==='profile')await profile(el);
      if(section==='support')await support(el);
    }catch(e){errorView(el,e);}
  }
  async function renderAddresses(el){const {addresses}=await api('/api/addresses');el.innerHTML=`<div class="section-heading"><h2>آدرس‌های من</h2><button class="button secondary" id="new-address">+ آدرس جدید</button></div><div class="address-grid">${addresses.map(a=>addressCard(a)).join('')||'<p>هنوز آدرسی ثبت نکرده‌اید.</p>'}</div><div id="address-editor"></div>`;
    $('#new-address').onclick=()=>addressForm($('#address-editor'),{},()=>renderAddresses(el));
    $$('[data-address]',el).forEach(b=>b.onclick=()=>busy(b,async()=>{const a=addresses.find(x=>x._id===b.dataset.id);if(b.dataset.address==='edit'){await addressForm($('#address-editor'),a,()=>renderAddresses(el));return;}if(b.dataset.address==='delete'){if(!await confirmAction('این آدرس حذف شود؟'))return;await api('/api/addresses/'+a._id,'DELETE');}else await api('/api/addresses/'+a._id+'/default','PATCH');await renderAddresses(el);}));
  }
  async function renderOrder(el){const {order:o}=await api('/api/orders/'+el.dataset.order);el.innerHTML=`<div class="panel"><div class="order-detail-header"><div><span class="eyebrow">ALPHA · فاکتور سفارش</span><h2>${esc(o.orderNumber)}</h2></div><span>${badge(o.status)} ${badge(o.paymentStatus)}</span></div><small>${date(o.createdAt)}</small><div class="timeline">${[['pending','ثبت سفارش'],['confirmed','آماده‌سازی'],['shipped','ارسال'],['delivered','تحویل']].map(([s,l],i)=>`<span class="${(['pending','confirmed','shipped','delivered'].indexOf(o.status)>=i)?'done':''}">${l}</span>`).join('')}</div>${invoiceItems(o)}${orderTotals(o)}${o.trackingCode?`<div class="notice success">${esc(o.carrier)} · کد رهگیری: <b>${esc(o.trackingCode)}</b></div>`:''}<h3>آدرس تحویل</h3>${o.shippingAddressSnapshot?addressCard(o.shippingAddressSnapshot):'<p>آدرس ثبت نشده است.</p>'}<div class="actions"><button class="button secondary" data-action="print">چاپ / ذخیره فاکتور PDF</button><a href="/account/support?order=${o._id}" class="button secondary">پشتیبانی این سفارش</a>${o.status==='pending'?'<button class="text-button" id="cancel-order">لغو سفارش</button>':''}${['pending','expired'].includes(o.status)?'<a href="/checkout" class="text-link">بازبینی با قیمت جدید</a>':''}</div></div>`;
    if($('#cancel-order'))$('#cancel-order').onclick=e=>busy(e.target,async()=>{if(await confirmAction('این سفارش لغو شود؟')){await api('/api/orders/'+o._id,'DELETE');await renderOrder(el);}});
  }
  async function profile(el){const {user}=await api('/api/account');el.innerHTML=`<div class="panel"><h2>${user.profileCompleted?'اطلاعات شخصی':'تکمیل حساب کاربری'}</h2><form id="profile-form" class="form-grid"><label>نام<input name="firstname" minlength="2" maxlength="30" required value="${user.profileCompleted?esc(user.firstname):''}" autocomplete="given-name"></label><label>نام خانوادگی<input name="lastname" minlength="2" maxlength="30" required value="${user.profileCompleted?esc(user.lastname):''}" autocomplete="family-name"></label><label class="span-2">ایمیل (اختیاری)<input name="email" type="email" value="${esc(user.email)}" autocomplete="email"></label><div class="span-2"><button class="button">ذخیره اطلاعات</button></div></form></div><div class="panel"><h2>شماره موبایل و امنیت</h2><p><b dir="ltr">${esc(user.phonenumber)}</b> ${user.phoneVerifiedAt?badge('confirmed'):'تأیید نشده'}</p><p>شماره موبایل حساب قابل تغییر نیست. ورود با کد یک‌بارمصرف انجام می‌شود.</p></div>`;
    $('#profile-form').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await api('/api/account','PATCH',formData(e.target));toast('اطلاعات حساب ذخیره شد.');const next=new URLSearchParams(location.search).get('next');if(next)location.href=safeNext();});};
  }
  async function support(el){const {tickets}=await api('/api/store/tickets');el.innerHTML=`<div class="panel"><h2>چطور می‌توانیم کمکتان کنیم؟</h2><form id="ticket-new"><label>موضوع<input name="subject" minlength="3" maxlength="120" required></label><input type="hidden" name="orderId" value="${esc(new URLSearchParams(location.search).get('order')||'')}"><label>پیام شما<textarea name="message" minlength="5" maxlength="3000" required></textarea></label><button class="button">ثبت درخواست</button></form></div><h2>درخواست‌های شما</h2>${tickets.map(t=>`<details class="panel ticket-thread"><summary>${esc(t.subject)} ${badge(t.status)}</summary>${t.messages.map(m=>`<div class="message ${m.admin?'admin':''}">${esc(m.body)}<small>${m.admin?'پشتیبانی آلفا':'شما'} · ${date(m.at)}</small></div>`).join('')}${t.status!=='closed'?`<form data-ticket="${t._id}"><label>پاسخ شما<textarea name="message" maxlength="3000" required></textarea></label><button class="button secondary">ارسال پاسخ</button></form>`:''}</details>`).join('')||'<p>هنوز درخواستی ثبت نکرده‌اید.</p>'}`;
    $('#ticket-new').onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await api('/api/store/tickets','POST',formData(e.target));toast('درخواست شما ثبت شد.');await support(el);});};$$('[data-ticket]',el).forEach(f=>f.onsubmit=e=>{e.preventDefault();busy(e.submitter,async()=>{await api(`/api/store/tickets/${f.dataset.ticket}/reply`,'POST',formData(f));await support(el);});});
  }
  cartCount();login();loadCart();checkout();payment();account();
})();
