const { priceList } = require("../../services/list-pricing-service");
const Cart = require("../../models/shopping-models/cart-model");

const Product = require("../../models/product-models/product-model");

const { AppError } = require("../../utils/app-error");

const { catchAsync } = require("../../utils/catch-async");

const CART_PRODUCT_FIELDS = [
  "catalogType",
  "name",
  "slug",
  "sku",
  "coverImage",
  "goldWeight",
  "karat",
  "wage",
  "accessoriesPrice",
  "pricing",
  "stock",
  "isActive",
].join(" ");

const populateCartProducts = async (cart) => {
  await cart.populate("items.product", CART_PRODUCT_FIELDS);

  return cart;
};

const getCart = catchAsync(async (req, res) => {
  let cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $setOnInsert: { user: req.user._id } }, { upsert: true, returnDocument: "after" });
  }

  await populateCartProducts(cart);

  res.status(200).json({
    status: "success",

    data: {
      cart: await priceList(cart),
    },
  });
});

const getAllCarts = catchAsync(async (req, res) => {
  const carts = await Cart.find()
    .populate("user", "firstname lastname phonenumber email")
    .populate("items.product", CART_PRODUCT_FIELDS)
    .sort("-createdAt");

  res.status(200).json({
    status: "success",

    results: carts.length,

    data: {
      carts,
    },
  });
});

const addCartItem = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  if (!product.isActive) {
    return next(new AppError(400, "product is not available"));
  }

  if (product.stock < quantity) {
    return next(new AppError(400, "requested quantity is not available"));
  }

  let cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $setOnInsert: { user: req.user._id } }, { upsert: true, returnDocument: "after" });
  }

  const existingItem = cart.items.find((item) => item.product.toString() === productId);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    if (newQuantity > product.stock) {
      return next(new AppError(400, "requested quantity is not available"));
    }

    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      product: productId,

      quantity,
    });
  }

  await cart.save();

  await populateCartProducts(cart);

  res.status(200).json({
    status: "success",

    data: {
      cart: await priceList(cart),
    },
  });
});

const updateCartItem = catchAsync(async (req, res, next) => {
  const { productId, quantity } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    return next(new AppError(404, "product not found"));
  }

  if (!product.isActive) {
    return next(new AppError(400, "product is not available"));
  }

  if (quantity > product.stock) {
    return next(new AppError(400, "requested quantity is not available"));
  }

  const cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    return next(new AppError(404, "cart not found"));
  }

  const item = cart.items.find((cartItem) => cartItem.product.toString() === productId);

  if (!item) {
    return next(new AppError(404, "product is not in cart"));
  }

  item.quantity = quantity;

  await cart.save();

  await populateCartProducts(cart);

  res.status(200).json({
    status: "success",

    data: {
      cart: await priceList(cart),
    },
  });
});

const deleteCartItem = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    return next(new AppError(404, "cart not found"));
  }

  const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

  if (itemIndex === -1) {
    return next(new AppError(404, "product is not in cart"));
  }

  cart.items.splice(itemIndex, 1);

  await cart.save();

  await populateCartProducts(cart);

  res.status(200).json({
    status: "success",

    data: {
      cart: await priceList(cart),
    },
  });
});

const clearCart = catchAsync(async (req, res) => {
  let cart = await Cart.findOne({
    user: req.user._id,
  });

  if (!cart) {
    cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $setOnInsert: { user: req.user._id } }, { upsert: true, returnDocument: "after" });
  }

  cart.items = [];

  await cart.save();

  res.status(200).json({
    status: "success",

    data: {
      cart: await priceList(cart),
    },
  });
});

module.exports = {
  getCart,
  getAllCarts,
  addCartItem,
  updateCartItem,
  deleteCartItem,
  clearCart,
};
