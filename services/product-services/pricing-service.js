const { AppError } = require("../../utils/app-error");

function finite(value, label, positive = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (positive ? value <= 0 : value < 0)
  ) {
    throw new AppError(503, `${label} معتبر نیست.`);
  }

  return value;
}

function optionalNonNegative(value, label) {
  if (value === null || value === undefined) return null;
  return finite(value, label);
}

function normalizeWage(config, label = "اجرت") {
  if (!config || config.value === null || config.value === undefined) {
    return null;
  }

  const type = config.type || "percent";
  if (!["percent", "fixed"].includes(type)) {
    throw new AppError(400, "نوع اجرت نامعتبر است.");
  }

  return {
    type,
    value: finite(config.value, label),
  };
}

function calculateProductPrice({ product, goldPricing }) {
  if (!product || !goldPricing) {
    throw new AppError(503, "نرخ طلا در دسترس نیست.");
  }

  if (product.catalogType && product.catalogType !== "crafted_gold") {
    throw new AppError(400, "فروش این نوع محصول هنوز فعال نشده است.");
  }

  const rate = finite(
    goldPricing.prices?.[`gold${product.karat}`],
    "نرخ طلا",
    true,
  );
  const weight = finite(product.goldWeight, "وزن", true);
  const custom = product.pricing?.mode === "custom";

  const globalProfit = optionalNonNegative(
    goldPricing.profitPercent,
    "درصد سود عمومی",
  );
  const customProfit = optionalNonNegative(
    product.pricing?.profitPercent,
    "درصد سود سفارشی",
  );
  const profitPercent = custom && customProfit !== null
    ? customProfit
    : globalProfit;
  const profitSource = custom && customProfit !== null
    ? "product"
    : globalProfit !== null
      ? "global"
      : "none";

  const globalTax = optionalNonNegative(
    goldPricing.taxPercent,
    "درصد مالیات عمومی",
  );
  const customTax = optionalNonNegative(
    product.pricing?.taxPercent,
    "درصد مالیات سفارشی",
  );
  const taxPercent = custom && customTax !== null
    ? customTax
    : globalTax;
  const taxSource = custom && customTax !== null
    ? "product"
    : globalTax !== null
      ? "global"
      : "none";

  const globalWage = normalizeWage(goldPricing.wage, "اجرت عمومی");
  const customWage = normalizeWage(product.wage, "اجرت سفارشی");
  const wageEnabled = custom ? product.pricing?.wageEnabled !== false : true;

  let wageConfig = null;
  let wageSource = "none";

  if (!wageEnabled) {
    wageSource = "disabled";
  } else if (custom && customWage) {
    wageConfig = customWage;
    wageSource = "product";
  } else if (globalWage) {
    wageConfig = globalWage;
    wageSource = "global";
  }

  const goldValue = Math.round(weight * rate);
  const wageAmount = wageConfig
    ? Math.round(
        wageConfig.type === "fixed"
          ? wageConfig.value
          : goldValue * wageConfig.value / 100,
      )
    : 0;
  const profitAmount = Math.round(
    (goldValue + wageAmount) * (profitPercent ?? 0) / 100,
  );
  const taxAmount = Math.round(
    (wageAmount + profitAmount) * (taxPercent ?? 0) / 100,
  );
  const accessoriesPrice = Math.round(
    finite(product.accessoriesPrice ?? 0, "قیمت متعلقات"),
  );
  const finalPrice =
    goldValue +
    wageAmount +
    profitAmount +
    taxAmount +
    accessoriesPrice;

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
      type: wageConfig?.type || (custom ? product.wage?.type : goldPricing.wage?.type) || "percent",
      value: wageConfig?.value ?? null,
      enabled: wageEnabled && Boolean(wageConfig),
      amount: wageAmount,
      source: wageSource,
    },
    profit: {
      percent: profitPercent,
      amount: profitAmount,
      source: profitSource,
    },
    tax: {
      percent: taxPercent,
      amount: taxAmount,
      source: taxSource,
    },
    accessoriesPrice,
    finalPrice,
  };
}

function rateIsFresh(goldPricing, maxAgeMinutes = 1440) {
  return Boolean(
    goldPricing?.updatedAt &&
    Date.now() - new Date(goldPricing.updatedAt).getTime() <= maxAgeMinutes * 60000
  );
}

module.exports = { calculateProductPrice, rateIsFresh };
