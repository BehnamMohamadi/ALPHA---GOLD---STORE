const GoldPricing = require("../../models/product-models/GoldPricing-model");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

const createGoldPricing = catchAsync(async (req, res, next) => {
  const existingGoldPricing = await GoldPricing.findOne({
    key: "main",
  });

  if (existingGoldPricing) {
    return next(new AppError(409, "gold pricing already exists"));
  }

  const goldPricing = await GoldPricing.create({
    key: "main",

    prices: req.body.prices,

    wage: req.body.wage,

    profitPercent: req.body.profitPercent,

    taxPercent: req.body.taxPercent,

    source: req.body.source,

    updatedBy: req.user._id,
  });

  res.status(201).json({
    status: "success",

    data: {
      goldPricing,
    },
  });
});

const getGoldPricing = catchAsync(async (req, res, next) => {
  const goldPricing = await GoldPricing.findOne({
    key: "main",
  }).populate("updatedBy", "firstname lastname");

  if (!goldPricing) {
    return next(new AppError(404, "gold pricing not found"));
  }

  res.status(200).json({
    status: "success",

    data: {
      goldPricing,
    },
  });
});

const updateGoldPricing = catchAsync(async (req, res, next) => {
  const goldPricing = await GoldPricing.findOne({
    key: "main",
  });

  if (!goldPricing) {
    return next(new AppError(404, "gold pricing not found"));
  }

  if (req.body.prices) {
    const priceFields = ["gold18", "gold21", "gold22", "gold24"];

    priceFields.forEach((field) => {
      if (req.body.prices[field] !== undefined) {
        goldPricing.prices[field] = req.body.prices[field];
      }
    });
  }

  if (req.body.wage) {
    if (!goldPricing.wage) {
      goldPricing.wage = {};
    }

    if (req.body.wage.type !== undefined) {
      goldPricing.wage.type = req.body.wage.type;
    }

    if (req.body.wage.value !== undefined) {
      goldPricing.wage.value = req.body.wage.value;
    }
  }

  if (req.body.profitPercent !== undefined) {
    goldPricing.profitPercent = req.body.profitPercent;
  }

  if (req.body.taxPercent !== undefined) {
    goldPricing.taxPercent = req.body.taxPercent;
  }

  if (req.body.source !== undefined) {
    goldPricing.source = req.body.source;
  }

  goldPricing.updatedBy = req.user._id;

  await goldPricing.save();

  res.status(200).json({
    status: "success",

    data: {
      goldPricing,
    },
  });
});

const deleteGoldPricing = catchAsync(async (req, res, next) => {
  const goldPricing = await GoldPricing.findOne({
    key: "main",
  });

  if (!goldPricing) {
    return next(new AppError(404, "gold pricing not found"));
  }

  await GoldPricing.deleteOne({
    _id: goldPricing._id,
  });

  res.status(204).send();
});

module.exports = {
  createGoldPricing,
  getGoldPricing,
  updateGoldPricing,
  deleteGoldPricing,
};
