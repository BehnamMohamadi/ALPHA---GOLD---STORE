const { buildCheckout } = require("../../services/shopping-services/checkout-service");

const { catchAsync } = require("../../utils/catch-async");

const createCheckout = catchAsync(async (req, res) => {
  const checkout = await buildCheckout(req.user._id);

  res.status(200).json({
    status: "success",

    data: {
      checkout,
    },
  });
});

module.exports = {
  createCheckout,
};
