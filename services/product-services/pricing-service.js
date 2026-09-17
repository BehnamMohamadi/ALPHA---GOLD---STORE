const { AppError } = require("../../utils/app-error");
function finite(value, label, positive = false) {
  if (typeof value !== "number" || !Number.isFinite(value) || (positive ? value <= 0 : value < 0)) throw new AppError(503, `${label} معتبر نیست.`);
  return value;
}
function calculateProductPrice({ product, goldPricing }) {
  if (!product || !goldPricing) throw new AppError(503, "نرخ طلا در دسترس نیست.");
  if (product.catalogType && product.catalogType !== "crafted_gold") throw new AppError(400, "فروش این نوع محصول هنوز فعال نشده است.");

  const rate = finite(goldPricing.prices?.[`gold${product.karat}`], "نرخ طلا", true);
  const weight = finite(product.goldWeight, "وزن", true);
  const custom = product.pricing?.mode === "custom";

  const profitPercent = finite(
    custom
      ? product.pricing?.profitPercent ?? goldPricing.profitPercent
      : goldPricing.profitPercent,
    "درصد سود",
  );

  const taxPercent = finite(
    custom
      ? product.pricing?.taxPercent ?? goldPricing.taxPercent
      : goldPricing.taxPercent,
    "درصد مالیات",
  );

  const globalWageIsConfigured =
    goldPricing.wage &&
    ["percent", "fixed"].includes(goldPricing.wage.type) &&
    typeof goldPricing.wage.value === "number" &&
    Number.isFinite(goldPricing.wage.value) &&
    goldPricing.wage.value >= 0;

  // Migration-safe behavior for old GoldPricing records:
  // until the administrator saves the new global wage field once,
  // standard mode keeps the previous product wage behavior.
  // As soon as GoldPricing.wage is configured, standard mode ignores
  // the product's custom wage completely.
  const wageConfig = custom
    ? product.wage
    : globalWageIsConfigured
      ? goldPricing.wage
      : product.wage;

  const enabled = custom ? product.pricing?.wageEnabled !== false : true;
  const type = wageConfig?.type || "percent";
  const value = finite(wageConfig?.value ?? 0, "اجرت");

  if (!["percent", "fixed"].includes(type)) {
    throw new AppError(400, "نوع اجرت نامعتبر است.");
  }

  // Each invoice component is rounded to whole Toman; the final total matches its parts exactly.
  const goldValue = Math.round(weight * rate);
  const wageAmount = enabled
    ? Math.round(type === "fixed" ? value : goldValue * value / 100)
    : 0;
  const profitAmount = Math.round((goldValue + wageAmount) * profitPercent / 100);
  const taxAmount = Math.round((wageAmount + profitAmount) * taxPercent / 100);
  const accessoriesPrice = Math.round(finite(product.accessoriesPrice ?? 0, "قیمت متعلقات"));
  const finalPrice = goldValue + wageAmount + profitAmount + taxAmount + accessoriesPrice;

  if (!Number.isSafeInteger(finalPrice) || finalPrice <= 0) {
    throw new AppError(400, "مبلغ محصول معتبر نیست.");
  }

  return {
    currency: "IRT",
    pricingMode: custom ? "custom" : "standard",
    goldWeight: weight,
    karat: product.karat,
    goldPricePerGram: rate,
    goldValue,
    wage: {
      type,
      value,
      enabled,
      amount: wageAmount,
      source: custom
        ? "product"
        : globalWageIsConfigured
          ? "global"
          : "legacy-product",
    },
    profit: { percent: profitPercent, amount: profitAmount },
    tax: { percent: taxPercent, amount: taxAmount },
    accessoriesPrice,
    finalPrice,
  };
}
function rateIsFresh(goldPricing, maxAgeMinutes = 1440) { return Boolean(goldPricing?.updatedAt && Date.now() - new Date(goldPricing.updatedAt).getTime() <= maxAgeMinutes * 60000); }
module.exports = { calculateProductPrice, rateIsFresh };
