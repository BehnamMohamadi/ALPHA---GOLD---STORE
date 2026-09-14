const mongoose = require("mongoose");
const Product = require("../models/product-models/product-model");
const Category = require("../models/product-models/category-model");
const SubCategory = require("../models/product-models/subCategory-model");
const GoldPricing = require("../models/product-models/GoldPricing-model");
const { Settings } = require("../models/store-models");
const { calculateProductPrice, rateIsFresh } = require("./product-services/pricing-service");
const { text } = require("../utils/normalize");
const escapeRegex = v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function catalog(query = {}) {
  const [categories, subcategories, goldPricing, settings] = await Promise.all([
    Category.find({ isActive: true }).sort("sortOrder").lean(), SubCategory.find({ isActive: true }).sort("sortOrder").lean(),
    GoldPricing.findOne({ key: "main" }).lean(), Settings.findOne({ key: "main" }).lean()
  ]);
  const filter = { isActive: true, category: { $in: categories.map(c => c._id) }, subCategory: { $in: subcategories.map(c => c._id) }, catalogType: "crafted_gold" };
  if (typeof query.q === "string" && query.q.trim()) filter.name = { $regex: escapeRegex(text(query.q).slice(0, 100)), $options: "i" };
  for (const [key, all] of [["category", categories], ["subCategory", subcategories]]) {
    const value = String(query[key] || ""); if (value) { const chosen = all.find(x => String(x._id) === value || x.slug === value); filter[key] = chosen?._id || new mongoose.Types.ObjectId(); }
  }
  if (query.featured === "true") filter.isFeatured = true;
  if (query.available === "true") filter.stock = { $gt: 0 };
  if ([18, 21, 22, 24].includes(Number(query.karat))) filter.karat = Number(query.karat);
  const weight = Number(query.maxWeight); if (weight > 0 && Number.isFinite(weight)) filter.goldWeight = { $lte: weight };
  const fresh = rateIsFresh(goldPricing, settings?.maxRateAgeMinutes);
  let products = (await Product.find(filter).populate("category", "name slug").populate("subCategory", "name slug").sort("-createdAt").lean()).map(p => priceProduct(p, goldPricing, fresh));
  const min = Number(query.minPrice), max = Number(query.maxPrice);
  if (min > 0) products = products.filter(p => p.price?.finalPrice >= min);
  if (max > 0) products = products.filter(p => p.price?.finalPrice <= max);
  if (query.sort === "price" || query.sort === "-price") products.sort((a, b) => ((a.price?.finalPrice ?? Infinity) - (b.price?.finalPrice ?? Infinity)) * (query.sort === "price" ? 1 : -1));
  if (query.sort === "weight") products.sort((a, b) => a.goldWeight - b.goldWeight);
  const total = products.length, limit = Math.min(48, Math.max(1, Math.floor(Number(query.limit) || 12))), page = Math.max(1, Math.floor(Number(query.page) || 1));
  return { products: products.slice((page - 1) * limit, page * limit), categories, subcategories, goldPricing, settings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
function priceProduct(product, rate, fresh = true) {
  const p = product.toObject ? product.toObject() : product;
  try { return { ...p, price: calculateProductPrice({ product: p, goldPricing: rate }), priceAvailable: fresh, priceUpdatedAt: rate.updatedAt }; }
  catch { return { ...p, price: null, priceAvailable: false }; }
}
module.exports = { catalog, priceProduct };
