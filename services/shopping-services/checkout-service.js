const Cart = require("../../models/shopping-models/cart-model");

const GoldPricing = require("../../models/product-models/GoldPricing-model");

const { calculateProductPrice } = require("../product-services/pricing-service");

const { AppError } = require("../../utils/app-error");

const CHECKOUT_VALIDITY_MS = 2 * 60 * 1000;

const buildCheckout = async (userId) => {
  const cart = await Cart.findOne({
    user: userId,
  }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new AppError(400, "cart is empty");
  }

  const goldPricing = await GoldPricing.findOne({
    key: "main",
  });

  if (!goldPricing) {
    throw new AppError(503, "gold pricing is not available");
  }

  const checkoutItems = [];

  let totalAmount = 0;

  for (const cartItem of cart.items) {
    const product = cartItem.product;

    if (!product) {
      throw new AppError(400, "one or more cart products no longer exist");
    }

    if (!product.isActive) {
      throw new AppError(400, `${product.name} is not available`);
    }

    if (product.stock < cartItem.quantity) {
      throw new AppError(400, `requested quantity for ${product.name} is not available`);
    }

    const pricing = calculateProductPrice({
      product,
      goldPricing,
    });

    const unitPrice = pricing.finalPrice;

    const itemTotal = unitPrice * cartItem.quantity;

    totalAmount += itemTotal;

    checkoutItems.push({
      product: {
        _id: product._id,

        name: product.name,

        slug: product.slug,

        sku: product.sku,

        coverImage: product.coverImage,
      },

      quantity: cartItem.quantity,

      pricing,

      unitPrice,

      totalPrice: itemTotal,
    });
  }

  const createdAt = new Date();

  const expiresAt = new Date(createdAt.getTime() + CHECKOUT_VALIDITY_MS);

  return {
    items: checkoutItems,

    totalItems: checkoutItems.reduce((total, item) => total + item.quantity, 0),

    totalAmount,

    createdAt,

    expiresAt,
  };
};

module.exports = {
  buildCheckout,
};
