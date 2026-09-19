/* Header, search and touch-friendly collection browsing. */
(() => {
  document.querySelectorAll('.jewelry-type-photo img').forEach(image => {
    const fallback = () => {
      image.removeEventListener('error', fallback);
      image.src = '/images/brand/category-pendant-v2.png';
    };
    image.addEventListener('error', fallback);
    if (image.complete && !image.naturalWidth) fallback();
  });
  document.querySelectorAll('form.alpha-search, form.search-box').forEach(form => {
    const input = form.querySelector('[name="q"]');
    const button = form.querySelector('button');
    const sync = () => { button.disabled = !input.value.trim(); };
    input.required = true;
    input.addEventListener('input', sync);
    form.addEventListener('submit', event => {
      input.value = input.value.trim(); sync();
      if (!input.value) { event.preventDefault(); input.focus(); }
    });
    window.addEventListener('pageshow', sync); sync();
  });

  const faDigits = '۰۱۲۳۴۵۶۷۸۹';
  const arDigits = '٠١٢٣٤٥٦٧٨٩';

  const faToEnDigits = value =>
    String(value ?? '')
      .replace(/[۰-۹]/g, digit => String(faDigits.indexOf(digit)))
      .replace(/[٠-٩]/g, digit => String(arDigits.indexOf(digit)));

  const enToFaDigits = value =>
    String(value ?? '').replace(/\d/g, digit => faDigits[Number(digit)]);

  const normalizePriceValue = value =>
    faToEnDigits(value).replace(/[^0-9]/g, '');

  const formatPriceValue = value => {
    const digits = normalizePriceValue(value);
    if (!digits) return '';
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
    return enToFaDigits(grouped);
  };

  document.querySelectorAll('[data-price-input]').forEach(input => {
    const sync = () => { input.value = formatPriceValue(input.value); };

    input.addEventListener('input', sync);
    input.addEventListener('blur', sync);

    input.addEventListener('keydown', event => {
      const allowedKeys = [
        'Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'
      ];

      if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) return;

      const isPersianDigit = /[۰-۹]/.test(event.key);
      const isArabicDigit = /[٠-٩]/.test(event.key);

      if (!isPersianDigit && !isArabicDigit) {
        event.preventDefault();
      }
    });

    sync();
  });

  document.querySelectorAll('.filters form').forEach(form => {
    form.addEventListener('submit', () => {
      form.querySelectorAll('[data-price-input]').forEach(input => {
        input.value = normalizePriceValue(input.value);
      });
    });
  });

  window.addEventListener('pageshow', () => {
    document.querySelectorAll('[data-price-input]').forEach(input => {
      input.value = formatPriceValue(input.value);
    });
  });

  const drawer = document.getElementById('mobile-drawer');
  const trigger = document.querySelector('[data-open-menu]');
  if (drawer && trigger) {
    const close = () => drawer.close();
    trigger.addEventListener('click', () => {
      drawer.showModal(); document.body.classList.add('menu-open');
      trigger.setAttribute('aria-expanded', 'true');
    });
    drawer.querySelector('[data-close-menu]').addEventListener('click', close);
    drawer.addEventListener('click', event => { if (event.target === drawer) close(); });
    drawer.addEventListener('close', () => {
      document.body.classList.remove('menu-open');
      trigger.setAttribute('aria-expanded', 'false'); trigger.focus();
    });
    matchMedia('(min-width:761px)').addEventListener('change', event => { if (event.matches && drawer.open) close(); });
  }

  document.querySelectorAll('[data-product-rail]').forEach(rail => {
    let drag = null, suppressClick = false;
    rail.addEventListener('dragstart', event => event.preventDefault());
    rail.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return;
      suppressClick = false;
      drag = { x: event.clientX, scroll: rail.scrollLeft, id: event.pointerId, moved: false };
    });
    rail.addEventListener('pointermove', event => {
      if (!drag) return;
      const delta = event.clientX - drag.x;
      if (!drag.moved && Math.abs(delta) < 7) return;
      if (!drag.moved) { rail.setPointerCapture(drag.id); rail.classList.add('is-dragging'); drag.moved = true; }
      rail.scrollLeft = drag.scroll - delta;
      suppressClick = true;
    });
    const end = () => {
      if (drag && rail.hasPointerCapture(drag.id)) rail.releasePointerCapture(drag.id);
      drag = null; rail.classList.remove('is-dragging');
      setTimeout(() => { suppressClick = false; }, 0);
    };
    rail.addEventListener('pointerup', end);
    rail.addEventListener('pointercancel', end);
    rail.addEventListener('pointerleave', () => { if (drag && !drag.moved) end(); });
    rail.addEventListener('click', event => {
      if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    rail.addEventListener('keydown', event => {
      if (event.target !== rail || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      rail.scrollBy({left: (event.key === 'ArrowLeft' ? -1 : 1) * rail.clientWidth * .75, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
  });
})();
