(() => {
  const selector = '#address-form, #otp-request, #otp-verify, #phone-change-request, #phone-change-verify';
  const digits = value => value.replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c));
  const phone = value => digits(value).replace(/[\s()-]/g,'').replace(/^(\+98|0098|98)(9\d{9})$/,'0$2');
  const labels = {title:'عنوان آدرس',recipientName:'نام گیرنده',recipientPhone:'شماره موبایل گیرنده',postalCode:'کد پستی',province:'استان',city:'شهر',addressLine:'نشانی کامل',buildingNumber:'پلاک',unit:'واحد',phone:'شماره موبایل',code:'کد تأیید'};
  let sequence=0;
  function message(field) {
    if(field.type==='checkbox'||field.type==='hidden')return '';
    let value=field.value.trim();
    if(field.required&&!value)return `${labels[field.name]||'این قسمت'} را وارد کنید.`;
    if(!value)return '';
    if(['phone','recipientPhone'].includes(field.name))return /^09\d{9}$/.test(phone(value))?'':'شماره موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.';
    if(field.name==='postalCode')return /^\d{10}$/.test(digits(value))?'':'کد پستی باید دقیقاً ۱۰ رقم باشد.';
    if(field.name==='code')return /^\d{6}$/.test(digits(value))?'':'کد تأیید ۶ رقمی را وارد کنید.';
    if(field.minLength>0&&value.length<field.minLength)return `${labels[field.name]||'این قسمت'} باید حداقل ${new Intl.NumberFormat('fa').format(field.minLength)} حرف داشته باشد.`;
    if(field.maxLength>0&&value.length>field.maxLength)return `حداکثر ${new Intl.NumberFormat('fa').format(field.maxLength)} نویسه وارد کنید.`;
    return '';
  }
  function show(field,error) {
    if(!field.dataset.feedbackId){
      const el=document.createElement('span');el.id='field-feedback-'+(++sequence);el.className='field-feedback';el.setAttribute('aria-live','polite');el.hidden=true;
      field.insertAdjacentElement('afterend',el);field.dataset.feedbackId=el.id;
      field.setAttribute('aria-describedby',[field.getAttribute('aria-describedby'),el.id].filter(Boolean).join(' '));
    }
    const el=document.getElementById(field.dataset.feedbackId);el.textContent=error;el.hidden=!error;
    if(error)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
  }
  function validate(form) {
    let first;
    Array.from(form.elements).filter(f=>f.matches('input,textarea,select')).forEach(field=>{const error=message(field);show(field,error);if(error&&!first)first=field;});
    if(first){first.focus();first.scrollIntoView({block:'center',behavior:'smooth'});}
    return !first;
  }
  const setup=()=>document.querySelectorAll(selector).forEach(f=>f.noValidate=true);
  setup();new MutationObserver(setup).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('submit',event=>{if(event.target.matches(selector)&&!validate(event.target)){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('focusout',event=>{const f=event.target;if(f.matches('input,textarea,select')&&f.form?.matches(selector))show(f,message(f));});
  document.addEventListener('input',event=>{const f=event.target;if(f.form?.matches(selector)&&f.dataset.feedbackId)show(f,message(f));});
  document.addEventListener('change',event=>{const f=event.target;if(f.matches('select')&&f.form?.matches(selector))show(f,message(f));});
  window.AlphaForms={server(form,error){let first;for(const detail of Array.isArray(error.details)?error.details:[]){const field=form.elements.namedItem(detail.field);if(!field)continue;show(field,message(field)||`لطفاً ${labels[field.name]||'این مقدار'} را بررسی و اصلاح کنید.`);first ||= field;}first?.focus();return Boolean(first);}};
})();
