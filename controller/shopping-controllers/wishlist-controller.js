const { priceList } = require("../../services/list-pricing-service");
const Wishlist = require("../../models/shopping-models/wishlist-model");
const Product = require("../../models/product-models/product-model");

const { AppError } = require("../../utils/app-error");
const { catchAsync } = require("../../utils/catch-async");

const WISHLIST_PRODUCT_FIELDS = [
  "catalogType",
  "name",
  "slug",
  "sku",
  "category",
  "subCategory",
  "gender",
  "coverImage",
  "goldWeight",
  "karat",
  "wage",
  "accessoriesPrice",
  "pricing",
  "stock",
  "isActive",
].join(" ");

const populateWishlistProducts = async (wishlist) => {
  await wishlist.populate("items.product", WISHLIST_PRODUCT_FIELDS);

  return wishlist;
};

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({
    user: userId,
  });

  if (!wishlist) {
    wishlist = await Wishlist.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, returnDocument: "after" });
  }

  return wishlist;
};

const getWishlist = catchAsync(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);

  await populateWishlistProducts(wishlist);

  res.status(200).json({
    status: "success",
    results: wishlist.items.length,
    data: {
      wishlist: await priceList(wishlist),
    },
  });
});

const addWishlistItem = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  if (!product.isActive) {
    return next(new AppError(400, "product is not available"));
  }

  const wishlist = await getOrCreateWishlist(req.user._id);

  const existingItem = wishlist.items.find(
    (item) => item.product.toString() === productId,
  );

  if (existingItem) {
    return next(new AppError(409, "product is already in wishlist"));
  }

  wishlist.items.push({
    product: productId,
  });

  await wishlist.save();

  await populateWishlistProducts(wishlist);

  res.status(200).json({
    status: "success",
    results: wishlist.items.length,
    data: {
      wishlist: await priceList(wishlist),
    },
  });
});

const deleteWishlistItem = catchAsync(async (req, res, next) => {
  const { productId } = req.params;

  const wishlist = await Wishlist.findOne({
    user: req.user._id,
  });

  if (!wishlist) {
    return next(new AppError(404, "wishlist not found"));
  }

  const itemIndex = wishlist.items.findIndex(
    (item) => item.product.toString() === productId,
  );

  if (itemIndex === -1) {
    return next(new AppError(404, "product is not in wishlist"));
  }

  wishlist.items.splice(itemIndex, 1);

  await wishlist.save();

  await populateWishlistProducts(wishlist);

  res.status(200).json({
    status: "success",
    results: wishlist.items.length,
    data: {
      wishlist: await priceList(wishlist),
    },
  });
});

const clearWishlist = catchAsync(async (req, res) => {
  const wishlist = await getOrCreateWishlist(req.user._id);

  wishlist.items = [];

  await wishlist.save();

  res.status(200).json({
    status: "success",
    results: 0,
    data: {
      wishlist: await priceList(wishlist),
    },
  });
});

module.exports = {
  getWishlist,
  addWishlistItem,
  deleteWishlistItem,
  clearWishlist,
};
