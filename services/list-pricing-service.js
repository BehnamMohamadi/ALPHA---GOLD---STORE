const GoldPricing = require("../models/product-models/GoldPricing-model");
const { Settings } = require("../models/store-models");
const { priceProduct } = require("./catalog-service");
const { rateIsFresh } = require("./product-services/pricing-service");
async function priceList(list) {
  const [rate, settings] = await Promise.all([GoldPricing.findOne({ key: "main" }).lean(), Settings.findOne({ key: "main" }).lean()]);
  const data = list.toObject ? list.toObject() : list;
  data.items = data.items.map(item => ({ ...item, product: item.product ? priceProduct(item.product, rate, rateIsFresh(rate, settings?.maxRateAgeMinutes)) : null }));
  return data;
}
module.exports = { priceList };
