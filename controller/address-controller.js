const mongoose = require("mongoose");
const Address = require("../models/address-model");
const User = require("../models/user-model");
const { AppError } = require("../utils/app-error");
const { catchAsync } = require("../utils/catch-async");

// Serialize address mutations for one user, including parallel first-address creation.
const mutateAddresses = (userId, callback) =>
  mongoose.connection.transaction(async (session) => {
    const lock = await User.updateOne({ _id: userId }, { $inc: { __v: 1 } }, { session });
    if (!lock.matchedCount) throw new AppError(404, "حساب پیدا نشد.");
    return callback(session);
  });

const normalizeDefault = async (userId, preferredId, session) => {
  let selected = preferredId;
  if (!selected) {
    const current = await Address.findOne({ user: userId, isDefault: true }).session(session);
    const fallback = current || await Address.findOne({ user: userId }).sort("-createdAt").session(session);
    selected = fallback?._id;
  }
  if (!selected) return;
  await Address.updateMany({ user: userId, _id: { $ne: selected } }, { $set: { isDefault: false } }, { session });
  await Address.updateOne({ user: userId, _id: selected }, { $set: { isDefault: true } }, { session });
};

const getMyAddresses = catchAsync(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ status: "success", results: addresses.length, data: { addresses } });
});

const getMyAddress = catchAsync(async (req, res) => {
  const address = await Address.findOne({ _id: req.params.addressId, user: req.user._id });
  if (!address) throw new AppError(404, "آدرس پیدا نشد.");
  res.json({ status: "success", data: { address } });
});

const addAddress = catchAsync(async (req, res) => {
  const address = await mutateAddresses(req.user._id, async (session) => {
    if (await Address.countDocuments({ user: req.user._id }).session(session) >= 50)
      throw new AppError(400, "حداکثر ۵۰ آدرس مجاز است.");
    const [created] = await Address.create([{ ...req.body, user: req.user._id }], { session });
    await normalizeDefault(req.user._id, req.body.isDefault ? created._id : null, session);
    return Address.findById(created._id).session(session);
  });
  res.status(201).json({ status: "success", data: { address } });
});

const editAddress = catchAsync(async (req, res) => {
  const address = await mutateAddresses(req.user._id, async (session) => {
    const current = await Address.findOne({ _id: req.params.addressId, user: req.user._id }).session(session);
    if (!current) throw new AppError(404, "آدرس پیدا نشد.");
    const wasDefault = current.isDefault;
    Object.assign(current, req.body);
    await current.save({ session });
    let preferred = req.body.isDefault === true ? current._id : null;
    if (wasDefault && req.body.isDefault === false) {
      const replacement = await Address.findOne({ user: req.user._id, _id: { $ne: current._id } }).sort("-createdAt").session(session);
      preferred = replacement?._id || current._id;
    }
    await normalizeDefault(req.user._id, preferred, session);
    return Address.findById(current._id).session(session);
  });
  res.json({ status: "success", data: { address } });
});

const setDefaultAddress = catchAsync(async (req, res) => {
  const address = await mutateAddresses(req.user._id, async (session) => {
    const current = await Address.findOne({ _id: req.params.addressId, user: req.user._id }).session(session);
    if (!current) throw new AppError(404, "آدرس پیدا نشد.");
    await normalizeDefault(req.user._id, current._id, session);
    return Address.findById(current._id).session(session);
  });
  res.json({ status: "success", data: { address } });
});

const deleteAddress = catchAsync(async (req, res) => {
  await mutateAddresses(req.user._id, async (session) => {
    const deleted = await Address.deleteOne({ _id: req.params.addressId, user: req.user._id }, { session });
    if (!deleted.deletedCount) throw new AppError(404, "آدرس پیدا نشد.");
    await normalizeDefault(req.user._id, null, session);
  });
  res.status(204).send();
});

const getUserAddressesForAdmin = catchAsync(async (req, res) => {
  const addresses = await Address.find({ user: req.params.userId }).sort({ isDefault: -1, createdAt: -1 });
  res.json({ status: "success", results: addresses.length, data: { addresses } });
});

module.exports = { getMyAddresses, getMyAddress, addAddress, editAddress, setDefaultAddress, deleteAddress, getUserAddressesForAdmin };
