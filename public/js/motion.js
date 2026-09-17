(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selector = '.hero-copy,.category-tile,.product-card,.alpha-promo,.editorial-feature,.editorial-story,.atelier-copy,.atelier-photo,.discover-copy,.discover-gallery,.collection-feature,.guide-banner,.panel,.stat,.order-card,.address-card,.result-card,.auth-card,.prose,.stat-card';
  const seen = new WeakSet();
  const observer = new IntersectionObserver(entries => entries.forEach(({target,isIntersecting}) => {
    if (!isIntersecting) return;
    observer.unobserve(target);
    target.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.7,.25,1)'});
  }), {threshold:0.06});
  function register(root) {
    if (!(root instanceof Element)) return;
    for (const element of [root,...root.querySelectorAll(selector)]) {
      if (!element.matches(selector) || seen.has(element)) continue;
      seen.add(element);observer.observe(element);
    }
  }
  register(document.body);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(register))).observe(document.body,{childList:true,subtree:true});
})();
