window.chooseCatalogDeactivation = async (kind, id) => {
  const base=kind==='category'?'categories':'subCategories';
  const {data}=await AdminAPI.request(`/api/${base}/${id}/dependencies`);
  const esc=AdminAPI.escape;
  const groups=kind==='category'?[['subCategoryIds','زیردسته‌ها',data.subcategories],['productIds','محصولات',data.products]]:[['productIds','محصولات',data.products]];
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='catalog-deactivation';
    dialog.setAttribute('aria-labelledby','deactivation-title');
    const previous=document.activeElement;
    dialog.innerHTML=`<header><div><small>مدیریت وضعیت کاتالوگ</small><h2 id="deactivation-title">غیرفعال‌کردن «${esc(data.parent.name)}»</h2></div><button type="button" data-close aria-label="بستن">×</button></header><p class="dependency-note">کدام زیرمجموعه‌ها هم غیرفعال شوند؟ موارد انتخاب‌نشده وضعیت فعلی خود را حفظ می‌کنند. با غیرفعال‌شدن دسته یا زیردسته والد، زیرمجموعه‌های آن تا فعال‌شدن والد در فروشگاه نمایش داده نمی‌شوند.</p><input class="dependency-search" type="search" placeholder="جست‌وجوی نام یا کد در زیرمجموعه‌ها…" aria-label="جست‌وجوی زیرمجموعه‌ها">${groups.map(([key,label,items])=>`<section data-group="${key}"><div class="dependency-group-head"><h3>${label} <small>${AdminAPI.number(items.length)} مورد</small></h3><div><button type="button" data-select="all">انتخاب همه فعال‌ها</button><button type="button" data-select="none">هیچ‌کدام</button></div></div><div class="dependency-list">${items.map(item=>`<label data-search="${esc(item.name+' '+(item.sku||''))}"><input type="checkbox" name="${key}" value="${item._id}" ${!item.isActive?'disabled':''}><span><b>${esc(item.name)}</b><small>${esc(item.sku||'')}${item.subCategory?' · '+esc(data.subcategories.find(s=>String(s._id)===String(item.subCategory))?.name||''):''}</small></span><em>${item.isActive?'فعال':'قبلاً غیرفعال شده'}</em></label>`).join('')||'<p>زیرمجموعه‌ای وجود ندارد.</p>'}</div></section>`).join('')}<footer><span data-count aria-live="polite">هیچ زیرمجموعه‌ای انتخاب نشده</span><div><button type="button" class="btn btn-secondary" data-close>انصراف</button><button type="button" class="btn btn-gold" data-confirm>ثبت غیرفعال‌سازی</button></div></footer>`;
    document.body.append(dialog);
    let result=null;
    dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();resolve(result);},{once:true});
    dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>dialog.close());
    const count=()=>{const n=dialog.querySelectorAll('input[type=checkbox]:checked').length;dialog.querySelector('[data-count]').textContent=n?`${AdminAPI.number(n)} زیرمجموعه انتخاب شده`:'فقط مورد اصلی غیرفعال می‌شود';};
    dialog.addEventListener('change',count);
    dialog.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{b.closest('section').querySelectorAll('input[type=checkbox]:not(:disabled)').forEach(c=>c.checked=b.dataset.select==='all');count();});
    dialog.querySelector('.dependency-search').oninput=event=>{
      const normalize=v=>v.trim().replace(/ي/g,'ی').replace(/ك/g,'ک').toLowerCase();
      const q=normalize(event.target.value);dialog.querySelectorAll('[data-search]').forEach(label=>label.hidden=!normalize(label.dataset.search).includes(q));
    };
    dialog.querySelector('[data-confirm]').onclick=()=>{
      result={subCategoryIds:[],productIds:[]};dialog.querySelectorAll('input[type=checkbox]:checked').forEach(c=>result[c.name].push(c.value));dialog.close();
    };
    dialog.showModal();
  });
