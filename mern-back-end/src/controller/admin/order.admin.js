const Order = require("../../models/order");
const FooterSettings = require("../../models/footerSettings");
const { sendOrderStatusEmail } = require("../../services/email");

const normalizeCity = (value) => String(value || "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const storeCityFromAddress = (address) => {
  const parts = String(address || "").split(/[,|]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return "";
  const nonCityAddressParts = /^(pakistan|pak|punjab|sindh|balochistan|khyber pakhtunkhwa|kpk|gilgit[- ]?baltistan|azad kashmir|islamabad capital territory)$/i;
  while (parts.length > 1 && nonCityAddressParts.test(parts[parts.length - 1])) parts.pop();
  return parts[parts.length - 1] || "";
};
const sameCityAsStore = (storeAddress, destinationCity) => {
  const storeCity = storeCityFromAddress(storeAddress);
  return Boolean(storeCity && normalizeCity(storeCity) === normalizeCity(destinationCity));
};
const getStoreFooter = () => FooterSettings.findOneAndUpdate(
  { key: "storefront" },
  { $setOnInsert: { key: "storefront" } },
  { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
).select("address").lean().exec();

exports.updateOrder = async (req, res) => {
  try {
    const { orderId, type } = req.body || {};
    const allowed = ["ordered", "packed", "shipped", "delivered"];
    if (!require("mongoose").isValidObjectId(orderId) || !allowed.includes(type)) return res.status(400).json({ message: "Choose a valid order status" });
    const order = await Order.findById(orderId)
      .populate("user", "firstName lastName email")
      .populate("items.productId", "name slug")
      .exec();
    if (!order) return res.status(404).json({ message: "Order not found" });
    const statuses = order.orderStatus || [];
    const now = new Date();
    if (statuses.some((status) => status.type === "delivered" && status.isCompleted) && !(type === "delivered" && req.body.directDelivery === true)) {
      return res.status(400).json({ message: "This order has already been delivered." });
    }
    if (type === "delivered" && req.body.directDelivery === true) {
      const footer = await getStoreFooter();
      if (!sameCityAsStore(footer?.address, order.addressSnapshot?.city)) {
        return res.status(400).json({ message: "Direct delivery is only available for orders in the store's city." });
      }
      const delivered = statuses.find((status) => status.type === "delivered");
      if (!delivered || delivered.isCompleted) return res.status(400).json({ message: "This order has already been delivered." });
      delivered.date = now;
      delivered.isCompleted = true;
    } else {
      const selectedStatus = statuses.find((status) => status.type === type);
      if (!selectedStatus) return res.status(400).json({ message: "This shipment phase is not available for the order." });
      if (selectedStatus.isCompleted) return res.status(200).json({ order, message: "This shipment phase is already complete." });
      selectedStatus.date = now;
      selectedStatus.isCompleted = true;
    }
    await order.save();
    if (type === "shipped" || type === "delivered") {
      sendOrderStatusEmail(order, order.user, type).catch((mailError) => {
        console.error(`Order status email delivery failed (${type}):`, mailError.message);
      });
    }
    return res.status(200).json({ order });
  } catch (error) { return res.status(400).json({ message: error.message }); }
};
exports.getCustomerOrders = async (req, res) => {
  try {
    const [orders, footer] = await Promise.all([Order.find({})
      .populate("items.productId", "name productPictures colors")
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .exec(), getStoreFooter()]);
    const ordersWithLocalDelivery = orders.map((order) => ({
      ...order.toObject(),
      canDirectDeliver: sameCityAsStore(footer?.address, order.addressSnapshot?.city)
    }));
    return res.status(200).json({ orders: ordersWithLocalDelivery });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

