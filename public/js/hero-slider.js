(() => {
  const root = document.getElementById('hero-slider');
  if (!root) return;
  const slides = [...root.querySelectorAll('[data-slide]')];
  const dots = [...root.querySelectorAll('[data-slide-to]')];
  const status = root.querySelector('[data-slide-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, paused = motion.matches, hovered = false, request = 0;
  function schedule() {
    clearTimeout(timer);
    if (!paused && !hovered && !document.hidden && !root.contains(document.activeElement)) {
      timer = setTimeout(() => show(current + 1), 6000);
    }
  }

  async function show(index, manual = false) {
    clearTimeout(timer);
    const ticket = ++request;
    const next = (index + slides.length) % slides.length;
    const image = slides[next].querySelector('img');
    image.loading = 'eager';
    try { await image.decode(); } catch { schedule(); return; }
    if (ticket !== request) return;
    slides.forEach((slide,i) => {
      slide.classList.toggle('is-active', i === next);
      slide.setAttribute('aria-hidden', String(i !== next));
      slide.inert = i !== next;
      dots[i].setAttribute('aria-pressed', String(i === next));
    });
    current = next;
    status.setAttribute('aria-live', manual ? 'polite' : 'off');
    status.textContent = `اسلاید ${new Intl.NumberFormat('fa-IR').format(current+1)} از ۴`;
    schedule();
  }
  root.querySelector('.slider-controls').hidden = false;
  dots.forEach((button,i) => {button.onclick = () => show(i,true);});
  root.addEventListener('pointerenter',event => {if(event.pointerType==='mouse'){hovered=true;schedule();}});
  root.addEventListener('pointerleave',() => {hovered=false;schedule();});
  root.addEventListener('focusin',() => clearTimeout(timer));
  root.addEventListener('focusout',() => setTimeout(schedule,0));
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',event => {if(event.matches)paused=true;schedule();});
  let start;
  root.addEventListener('pointerdown',event => {if(event.pointerType==='touch'&&!event.target.closest('a,button'))start={x:event.clientX,y:event.clientY};});
  root.addEventListener('pointerup',event => {if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx>0?1:-1),true);});
  root.addEventListener('pointercancel',() => {start=null;});
   schedule();
})();
