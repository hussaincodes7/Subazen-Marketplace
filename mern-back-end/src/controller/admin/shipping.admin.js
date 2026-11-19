const ShippingConfig = require("../../models/shippingConfig");
const Order = require("../../models/order");
const mongoose = require("mongoose");
const ensureConfig = async () => {
  let config = await ShippingConfig.findOne({ key: "default" }).exec();
  if (!config) config = await ShippingConfig.create({ key: "default", defaultFee: 250, rules: [] });
  return config;
};
exports.getShippingConfig = async (req, res) => {
  try { const config = await ensureConfig(); return res.status(200).json({ config }); }
  catch (error) { return res.status(500).json({ message: "Could not load shipping configuration" }); }
};
exports.updateShippingConfig = async (req, res) => {
  try {
    const { defaultFee, rules = [] } = req.body || {};
    if (!Number.isFinite(Number(defaultFee)) || Number(defaultFee) < 0 || !Array.isArray(rules)) return res.status(400).json({ message: "Enter a valid default fee and shipping rules" });
    for (const rule of rules) if (!Number.isFinite(Number(rule.fee)) || Number(rule.fee) < 0 || typeof rule.city !== "string" || typeof rule.area !== "string") return res.status(400).json({ message: "Each shipping rule needs a city, area, and non-negative fee" });
    const config = await ShippingConfig.findOneAndUpdate({ key: "default" }, { $set: { defaultFee: Number(defaultFee), rules: rules.map(({ city, area, fee, free }) => ({ city: city.trim(), area: area.trim(), fee: Number(fee), free: Boolean(free) })) } }, { returnDocument: "after", upsert: true, runValidators: true, setDefaultsOnInsert: true }).exec();
    return res.status(200).json({ config });
  } catch (error) { return res.status(400).json({ message: error.message }); }
};
exports.adjustOrderShipping = async (req, res) => {
  try {
    const { orderId } = req.params;
    const fee = Number(req.body?.shippingFee);
    if (!mongoose.isValidObjectId(orderId) || !Number.isFinite(fee) || fee < 0) return res.status(400).json({ message: "Enter a valid order and non-negative shipping fee" });
    const order = await Order.findById(orderId).exec();
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.shippingFee = fee;
    order.totalAmount = order.subtotal + fee;
    await order.save();
    return res.status(200).json({ order });
  } catch (error) { return res.status(400).json({ message: error.message }); }
};
