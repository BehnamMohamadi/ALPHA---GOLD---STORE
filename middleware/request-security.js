const { AppError } = require("../utils/app-error");
function requestSecurity(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  // Cross-origin forms cannot set this header. CORS allowlisting still applies to API consumers.
  if (req.cookies?.accessToken && !req.get("authorization") && req.get("X-Requested-With") !== "Alpha") return next(new AppError(403, "درخواست معتبر نیست. صفحه را تازه کنید."));
  if (req.get("Sec-Fetch-Site") === "cross-site") return next(new AppError(403, "درخواست از مبدأ نامعتبر است."));
  next();
}
module.exports = { requestSecurity };
