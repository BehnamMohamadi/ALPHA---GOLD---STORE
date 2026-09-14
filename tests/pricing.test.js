const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateProductPrice, rateIsFresh } = require('../services/product-services/pricing-service');
const rate = { prices: { gold18: 1000000, gold21: null }, profitPercent: 7, taxPercent: 9, updatedAt: new Date() };
const product = { goldWeight: 2, karat: 18, wage: { type: 'percent', value: 10 }, accessoriesPrice: 100000, pricing: { mode: 'standard' } };
test('standard invoice excludes raw gold and accessories from tax', () => {
  const p = calculateProductPrice({ product, goldPricing: rate });
  assert.equal(p.goldValue, 2000000); assert.equal(p.wage.amount, 200000); assert.equal(p.profit.amount, 154000); assert.equal(p.tax.amount, 31860); assert.equal(p.finalPrice, 2485860);
});
test('custom zero overrides and disabled wage are honored', () => {
  const p = calculateProductPrice({ product: { ...product, pricing: { mode: 'custom', profitPercent: 0, taxPercent: 0, wageEnabled: false } }, goldPricing: rate });
  assert.equal(p.finalPrice, 2100000); assert.equal(p.wage.amount, 0);
});
test('fixed wage is per item and rounded parts sum exactly', () => {
  const p = calculateProductPrice({ product: { ...product, goldWeight: .333, wage: { type: 'fixed', value: 1000.6 } }, goldPricing: rate });
  assert.equal(p.wage.amount, 1001); assert.equal(p.finalPrice, p.goldValue + p.wage.amount + p.profit.amount + p.tax.amount + p.accessoriesPrice);
});
test('invalid, missing, zero and unsupported prices fail closed', () => {
  for (const r of [0, -1, null, NaN, Infinity]) assert.throws(() => calculateProductPrice({ product, goldPricing: { ...rate, prices: { gold18: r } } }));
  assert.throws(() => calculateProductPrice({ product: { ...product, catalogType: 'silver' }, goldPricing: rate }));
});
test('stale rate cannot be used for a fresh checkout', () => { assert.equal(rateIsFresh(rate), true); assert.equal(rateIsFresh({ updatedAt: new Date(Date.now() - 86400001) }, 1440), false); assert.equal(rateIsFresh(null), false); });
