const express = require("express");

const User = require("../../models/user-model");

const { verifyAccessToken } = require("../../utils/jwt");

const { protect, restrictTo } = require("../../middleware/auth-middleware");

const router = express.Router();

const renderAdmin = (view, title) => (req, res) => {
  res.render(`admin/${view}`, {
    title,
    adminUser: req.user || null,
  });
};

router.get("/", (req, res) => {
  res.render("index", {
    title: "xxxxgold",
  });
});

// Retain old bookmarks while using the same customer sign-in and account.
router.get("/admin/login", (req,res)=>res.redirect("/login"));
router.use("/admin", (req,res,next)=>protect(req,res,error=>{
  if(error?.statusCode===401) return res.redirect("/login");
  if(error) return next(error);
  if(req.user.role!=="admin") return res.redirect("/account");
  next();
}));

for (const [section, title] of Object.entries({settings:"تنظیمات فروشگاه",sms:"پیامک و ورود",shipping:"روش‌های ارسال",content:"محتوای سایت",support:"پشتیبانی",audit:"رویدادهای مدیریت"})) router.get("/admin/" + section, (req,res) => res.render("admin/workbench", {title,section,adminUser:req.user}));

router.get("/admin", renderAdmin("dashboard", "داشبورد مدیریت"));

router.get("/admin/products", renderAdmin("products", "محصولات"));

router.get("/admin/products/new", (req, res) => {
  res.render("admin/product-form", {
    title: "افزودن محصول",
    adminUser: req.user,
    productId: "",
  });
});

router.get("/admin/products/:productId/edit", (req, res) => {
  res.render("admin/product-form", {
    title: "ویرایش محصول",
    adminUser: req.user,
    productId: req.params.productId,
  });
});

router.get("/admin/categories", renderAdmin("categories", "دسته‌بندی‌ها"));

router.get("/admin/subcategories", renderAdmin("subcategories", "زیردسته‌ها"));

router.get("/admin/gold-pricing", renderAdmin("gold-pricing", "قیمت طلا"));

router.get("/admin/orders", renderAdmin("orders", "سفارش‌ها"));

router.get("/admin/payments", renderAdmin("payments", "پرداخت‌ها"));

router.get("/admin/carts", renderAdmin("carts", "سبدهای خرید"));

router.get("/admin/orders/:orderId", (req, res) => {
  res.render("admin/order-details", {
    title: "جزئیات سفارش",
    adminUser: req.user,
    orderId: req.params.orderId,
  });
});

router.get("/admin/users", renderAdmin("users", "کاربران"));

module.exports = router;
