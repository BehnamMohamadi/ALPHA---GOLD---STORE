// Empty, planned collections remain browsable before their first product is added.
const plannedCategories = [
  { name: 'گردنبند', slug: 'necklaces', symbol: 'necklace' },
  { name: 'گوشواره', slug: 'earrings', symbol: 'earrings' },
  { name: 'دستبند', slug: 'bracelets', symbol: 'bracelet' },
  { name: 'انگشتر', slug: 'rings', symbol: 'ring' },
  { name: 'النگو', slug: 'bangles', symbol: 'bangle' },
  { name: 'آویز', slug: 'pendants', symbol: 'pendant' },
  { name: 'پابند', slug: 'anklets', symbol: 'anklet' },
  { name: 'نیم‌ست', slug: 'jewelry-sets', symbol: 'set' },
];
const normalized = value => String(value || '').replace(/[\s\u200c]/g, '').replace(/ي/g, 'ی').replace(/ك/g, 'ک');
function storefrontCategories(records, parents) {
  const activeParents = new Set(parents.map(p => String(p._id)));
  const visible = r => r.isActive && activeParents.has(String(r.category));
  const used = new Set();
  const result = plannedCategories.flatMap(plan => {
    const matches = records.filter(r => r.slug === plan.slug || normalized(r.name) === normalized(plan.name));
    matches.forEach(r => used.add(String(r._id)));
    // An explicit admin deactivation takes precedence over a planned collection.
    if (matches.length) return matches.filter(visible).map(r => ({ ...r, symbol: plan.symbol }));
    return activeParents.size ? [{ ...plan, _id: plan.slug, planned: true }] : [];
  });
  return result.concat(records.filter(r => visible(r) && !used.has(String(r._id))).map(r => ({ ...r, symbol: null })));
}
module.exports = { storefrontCategories };
