const router = require("express").Router();
const User = require("../../models/user-model");
const Wishlist = require("../../models/shopping-models/wishlist-model");
const Product = require("../../models/product-models/product-model");
const Category = require("../../models/product-models/category-model");
const SubCategory = require("../../models/product-models/subCategory-model");
const GoldPricing = require("../../models/product-models/GoldPricing-model");
const { Settings, Page } = require("../../models/store-models");
const { verifyAccessToken } = require("../../utils/jwt");
const { catchAsync: wrap } = require("../../utils/catch-async");
const { catalog, priceProduct } = require("../../services/catalog-service");
const { rateIsFresh } = require("../../services/product-services/pricing-service");
const { isDev } = require("../../services/otp-service");
router.use(wrap(async (req, res, next) => {
  if (req.path.startsWith("/admin")) return next();
  let user = null;
  try { const payload = verifyAccessToken(req.cookies?.accessToken); const candidate = await User.findById(payload.sub); if (candidate?.accountStatus.status === "active" && (payload.version || 0) === candidate.tokenVersion) user = candidate; } catch {}
  const [settings, navCategories, navSubcategories, rate] = await Promise.all([Settings.findOne({ key: "main" }).lean(), Category.find({ isActive: true }).sort("sortOrder").lean(), SubCategory.find({ isActive: true }).sort("sortOrder").lean(), GoldPricing.findOne({ key: "main" }).lean()]);
  const saved = user ? await Wishlist.findOne({ user: user._id }).select('items.product').lean() : null;
  Object.assign(res.locals, { user, wishlistIds: new Set((saved?.items || []).map(item => String(item.product))), settings: settings || new Settings().toObject(), navCategories, navSubcategories, rate, path: req.path,
    demo: process.env.ALPHA_DEMO === "true", otpDemo: isDev(), title: "آلفا | فروشگاه طلا", description: "زیورآلات طلا با نمایش شفاف وزن، عیار و جزئیات قیمت در آلفا.",
    number: value => new Intl.NumberFormat("fa-IR").format(value), money: value => typeof value === "number" ? new Intl.NumberFormat("fa-IR").format(value) + " تومان" : "نیاز به به‌روزرسانی نرخ",
    date: value => value ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"
  }); next();
}));
router.get("/", wrap(async (req, res) => res.render("store/home", { ...await catalog({ limit: 8 }), settings: res.locals.settings, title: "آلفا — طلایی برای هر روز" })));
router.get(["/shop", "/search", "/category/:slug"], wrap(async (req, res) => {
  const toAsciiDigits = value => String(value ?? "")
    .replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[,٬\s]/g, "");
  const canonicalPrice = value => {
    const numeric = Number(toAsciiDigits(value));
    if (!(numeric > 0)) return "";
    return String(({ 4999999: 5000000, 7999999: 8000000, 11999999: 12000000 })[numeric] || numeric);
  };
  const query = { ...req.query, ...(req.params.slug ? { category: req.params.slug } : {}) };
  if (query.minPrice != null) query.minPrice = canonicalPrice(query.minPrice);
  if (query.maxPrice != null) query.maxPrice = canonicalPrice(query.maxPrice);
  const data = await catalog(query); const category = data.subcategories.find(c => String(c._id) === query.subCategory || c.slug === query.subCategory) || data.categories.find(c => c.slug === req.params.slug || String(c._id) === query.category);
  res.render("store/shop", { ...data, settings: res.locals.settings, query, title: query.q ? `جست‌وجوی «${String(query.q).slice(0, 80)}»` : category?.name || ({female:"زیورآلات زنانه",male:"زیورآلات مردانه",kids:"زیورآلات کودکانه",unisex:"زنانه و مردانه (مشترک)"}[query.gender]) || "زیورآلات آلفا" });
}));
router.get("/product/:slug", wrap(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true, catalogType: "crafted_gold" }).populate("category").populate("subCategory").lean();
  if (!product || !product.category?.isActive || !product.subCategory?.isActive) return res.status(404).render("store/error", { title: "محصول پیدا نشد", message: "این محصول در حال حاضر در فروشگاه موجود نیست." });
  const data = await catalog({ subCategory: String(product.subCategory._id), limit: 5 });
  res.render("store/product", { product: priceProduct(product, res.locals.rate, rateIsFresh(res.locals.rate, res.locals.settings.maxRateAgeMinutes)), related: data.products.filter(p => String(p._id) !== String(product._id)).slice(0, 4), title: product.name });
}));
router.get("/login", (req, res) => res.locals.user ? res.redirect("/account") : res.render("store/login", { title: "ورود به آلفا" }));
router.get("/cart", (req, res) => res.render("store/cart", { title: "سبد خرید" }));
const requireCustomer = (req, res, next) => !res.locals.user ? res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`) : next();
router.get("/checkout", requireCustomer, (req, res) => res.render("store/checkout", { title: "تکمیل خرید" }));
router.get(["/payment/result", "/payment/mock"], requireCustomer, (req, res) => res.render("store/payment", { title: "وضعیت پرداخت", mock: req.path === "/payment/mock" }));
router.get(["/account", "/account/:section", "/account/orders/:id", "/account/orders/:id/invoice"], requireCustomer, (req, res) => {
  const section = req.params.id ? "order" : req.params.section || "overview";
  if (!["overview", "orders", "order", "addresses", "wishlist", "profile", "support"].includes(section)) return res.status(404).render("store/error", { title: "صفحه پیدا نشد", message: "این بخش وجود ندارد." });
  res.render("store/account", { title: "حساب کاربری", section, orderId: req.params.id || "", invoice: req.path.endsWith("/invoice") });
});
router.get(["/about", "/contact", "/guide", "/faq", "/shipping", "/returns", "/privacy", "/terms"], wrap(async (req, res) => {
  const slug = req.path.slice(1); const page = await Page.findOne({ slug, published: true }).lean();
  const titles = { about: "درباره آلفا", contact: "ارتباط با آلفا", guide: "راهنمای خرید طلا", faq: "پرسش‌های متداول", shipping: "ارسال و تحویل", returns: "شرایط بازگشت", privacy: "حریم خصوصی", terms: "شرایط خرید" };
  res.render("store/content", { title: titles[slug], slug, page });
}));
module.exports = router;
