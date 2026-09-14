const digits = (value = "") => String(value).replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
const phone = value => digits(value).replace(/[\s()-]/g, "").replace(/^(\+98|0098|98)(9\d{9})$/, "0$2");
const text = value => String(value || "").trim().replace(/ي/g, "ی").replace(/ك/g, "ک");
module.exports = { digits, phone, text };
