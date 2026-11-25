const mongoose = require("mongoose");
const Order = require("../models/order");
const Cart = require("../models/cart");
const UserAddress = require("../models/address");
const Product = require("../models/product");
const User = require("../models/user");
const ShippingConfig = require("../models/shippingConfig");
const { getEffectiveUnitPrice } = require("../utils/pricing");
const { resolveProductOptionSelections, getProductOptionGroups } = require("../utils/productOptionSelections");
const { sendOrderStatusEmail, sendNewOrderOwnerEmail } = require("../services/email");
const { productRequiresDesign, productIsCustomPrintingCategory, normalizeDesignImage } = require("../utils/customDesign");
const fs = require("fs");
const path = require("path");

const orderStatuses = ["ordered", "packed", "shipped", "delivered"];
const getShippingConfig = async () => {
  let config = await ShippingConfig.findOne({ key: "default" }).lean().exec();
  if (!config) config = await ShippingConfig.create({ key: "default", defaultFee: 250, rules: [] });
  return config;
};
const calculateShipping = (config, address) => {
  const city = String(address?.city || "").trim().toLowerCase();
  const area = String(address?.area || address?.address || "").trim().toLowerCase();
  const rule = [...(config.rules || [])].reverse().find((item) =>
    (!item.city || item.city.toLowerCase() === city) &&
    (!item.area || area.includes(item.area.toLowerCase()))
  );
  return rule ? (rule.free ? 0 : rule.fee) : config.defaultFee;
};
exports.getShippingQuote = async (req, res) => {
  try {
    const config = await getShippingConfig();
    const fee = calculateShipping(config, req.body?.address || {});
    return res.status(200).json({ shippingFee: fee, currency: "PKR" });
  } catch (error) {
    console.error("Shipping quote failed:", error.message);
    return res.status(500).json({ message: "Could not calculate shipping" });
  }
};
exports.addOrder = async (req, res) => {
  const session = await mongoose.startSession();
  let createdOrderId;
  try {
    const userId = req.auth?.userId;
    const { addressId, paymentType = "cod" } = req.body ?? {};
    if (paymentType !== "cod") return res.status(400).json({ message: "Cash on Delivery is the only available payment method" });
    if (!mongoose.isValidObjectId(addressId)) return res.status(400).json({ message: "A valid delivery address is required" });
    const addresses = await UserAddress.findOne({ user: userId }).exec();
    const address = addresses?.address.id(addressId);
    if (!address) return res.status(404).json({ message: "Delivery address not found" });
    const cart = await Cart.findOne({ user: userId }).exec();
    if (!cart?.cartItems?.length) return res.status(400).json({ message: "Your cart is empty" });

    const orderItems = [];
    let subtotal = 0;
    const stockChanges = [];
    for (const item of cart.cartItems) {
      const product = await Product.findOne({ _id: item.product, isActive: { $ne: false } }).exec();
      if (!product) return res.status(400).json({ message: "A product in your cart is no longer available" });
      const minOrderQuantity = Math.max(1, Number(product.minOrderQuantity) || 1);
      const requiresDesign = await productRequiresDesign(product);
      const isCustomPrinting = await productIsCustomPrintingCategory(product);
      const legacyDesignImage = normalizeDesignImage(item.designImage);
      const designImageFront = normalizeDesignImage(item.designImageFront) || (legacyDesignImage && item.printPlacement !== "back" && item.printPlacement !== "front-and-back" ? legacyDesignImage : "");
      const designImageBack = normalizeDesignImage(item.designImageBack) || (legacyDesignImage && item.printPlacement === "back" ? legacyDesignImage : "");
      const designImage = legacyDesignImage || designImageFront || designImageBack;
      const requiredArtworkSides = isCustomPrinting && item.printPlacement === "front-and-back" ? ["front", "back"] : [item.printPlacement === "back" ? "back" : "front"];
      if (requiresDesign && requiredArtworkSides.some((side) => !(side === "front" ? designImageFront : designImageBack))) return res.status(400).json({ message: `Upload artwork for each selected print side of ${product.name}.` });
      for (const image of [designImage, designImageFront, designImageBack].filter(Boolean)) {
        if (!fs.existsSync(path.resolve(__dirname, "..", "uploads", decodeURIComponent(image.split("/").pop())))) return res.status(400).json({ message: `The design for ${product.name} could not be found. Please update your cart.` });
      }
      const instructionsEnabled = typeof product.allowDesignInstructions === "boolean" ? product.allowDesignInstructions : requiresDesign;
      const designInstructions = instructionsEnabled ? String(item.designInstructions || "").trim().slice(0, 1000) : "";
      const variant = item.variantId ? product.colors.id(item.variantId) : null;
      if (item.variantId && !variant) return res.status(400).json({ message: `Selected ${item.colorName || "product"} option is no longer available` });
      const configuredPrintOptions = (product.customPrintOptions || []).filter((option) => option.isAvailable !== false);
      const printPlacement = configuredPrintOptions.length ? String(item.printPlacement || "") : "";
      if (configuredPrintOptions.length && !["front", "back", "front-and-back"].includes(printPlacement)) return res.status(400).json({ message: `Choose a configured print side for ${product.name}.` });
      const printOption = configuredPrintOptions.find((option) => option.placement === printPlacement);
      if (configuredPrintOptions.length && !printOption) return res.status(400).json({ message: `Choose a valid printing side for ${product.name}. Please update your cart.` });
      const printPrice = printOption ? Number(printOption.price) : null;
      const productOptionSelections = resolveProductOptionSelections(getProductOptionGroups(product), item.productOptionSelections || []);
      let unitPrice = (printOption ? printPrice : getEffectiveUnitPrice(product, variant)) + productOptionSelections.reduce((sum, option) => sum + Number(option.price || 0), 0);
      let stockPath = "quantity";
      let stockAvailable = product.quantity;
      let sizeItem = null;
      const sizeOptions = variant?.sizes?.length ? variant.sizes : (!variant ? product.sizes || [] : []);
      if (sizeOptions.length) {
        sizeItem = sizeOptions.find((choice) => choice.size === item.size);
        if (!sizeItem) return res.status(400).json({ message: `Choose an available size for ${product.name}` });
        stockAvailable = sizeItem.quantity;
        stockPath = variant ? `colors.${variant._id}.sizes.${sizeItem._id}.quantity` : `sizes.${sizeItem._id}.quantity`;
      } else if (variant) {
        if (variant.quantity != null) {
          stockPath = `colors.${variant._id}.quantity`;
          stockAvailable = variant.quantity;
        }
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) return res.status(400).json({ message: "Invalid cart quantity" });
      if (item.quantity < minOrderQuantity) return res.status(400).json({ message: `${product.name} requires a minimum order of ${minOrderQuantity} units.` });
      if (stockAvailable < item.quantity) return res.status(409).json({ message: `${product.name} does not have enough stock` });
      stockChanges.push({ product, variant, sizeItem, item, stockPath });
      subtotal += unitPrice * item.quantity;
      orderItems.push({ productId: product._id, variantId: variant?._id, colorName: variant?.colorName || item.colorName, size: item.size, printPlacement, printPrice: printPrice ?? 0, productOptionSelections, designImage, designImageFront, designImageBack, designInstructions, payablePrice: unitPrice, purchasedQty: item.quantity, minOrderQuantity });
    }
    const config = await getShippingConfig();
    const shippingFee = calculateShipping(config, address);
    await session.withTransaction(async () => {
      for (const change of stockChanges) {
        const filter = { _id: change.product._id, quantity: { $gte: change.item.quantity } };
        const path = change.stockPath;
        const current = path === "quantity" ? change.product.quantity : (change.sizeItem?.quantity ?? change.variant?.quantity ?? change.product.quantity);
        if (current < change.item.quantity) throw new Error(`STOCK:${change.product.name}`);
        if (path === "quantity") {
          const result = await Product.updateOne(filter, { $inc: { quantity: -change.item.quantity } }, { session });
          if (!result.modifiedCount) throw new Error(`STOCK:${change.product.name}`);
        } else if (change.sizeItem && change.variant) {
          const result = await Product.updateOne({ _id: change.product._id, colors: { $elemMatch: { _id: change.variant._id, sizes: { $elemMatch: { _id: change.sizeItem._id, quantity: { $gte: change.item.quantity } } } } } }, { $inc: { "colors.$[color].sizes.$[size].quantity": -change.item.quantity } }, { arrayFilters: [{ "color._id": change.variant._id }, { "size._id": change.sizeItem._id }], session });
          if (!result.modifiedCount) throw new Error(`STOCK:${change.product.name}`);
        } else if (change.sizeItem) {
          const result = await Product.updateOne({ _id: change.product._id, quantity: { $gte: change.item.quantity }, sizes: { $elemMatch: { _id: change.sizeItem._id, quantity: { $gte: change.item.quantity } } } }, { $inc: { quantity: -change.item.quantity, "sizes.$[size].quantity": -change.item.quantity } }, { arrayFilters: [{ "size._id": change.sizeItem._id }], session });
          if (!result.modifiedCount) throw new Error(`STOCK:${change.product.name}`);
        } else {
          const result = await Product.updateOne({ _id: change.product._id, colors: { $elemMatch: { _id: change.variant._id, quantity: { $gte: change.item.quantity } } } }, { $inc: { "colors.$[color].quantity": -change.item.quantity } }, { arrayFilters: [{ "color._id": change.variant._id }], session });
          if (!result.modifiedCount) throw new Error(`STOCK:${change.product.name}`);
        }
      }
      const createdOrder = await new Order({ user: userId, addressId, addressSnapshot: address.toObject(), subtotal, shippingFee, totalAmount: subtotal + shippingFee, items: orderItems, paymentStatus: "pending", paymentType: "cod", orderStatus: orderStatuses.map((type, index) => ({ type, date: index === 0 ? new Date() : undefined, isCompleted: index === 0 })) }).save({ session });
      createdOrderId = createdOrder._id;
      await Cart.deleteOne({ user: userId }, { session }).exec();
    });
    const order = await Order.findById(createdOrderId).populate("items.productId", "name slug").exec();
    const customer = await User.findById(userId).select("firstName email").lean().exec();
    sendOrderStatusEmail(order, customer, "ordered").catch((mailError) => {
      console.error("Order confirmation email delivery failed:", mailError.message);
    });
    sendNewOrderOwnerEmail(order, customer).catch((mailError) => {
      console.error("New order owner email delivery failed:", mailError.message);
    });
    return res.status(201).json({ order });
  } catch (error) {
    if (error.message.startsWith("STOCK:")) return res.status(409).json({ message: `${error.message.slice(6)} does not have enough stock` });
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ message: error.message });
    console.error("Order creation failed:", error.message);
    return res.status(500).json({ message: "Could not create order" });
  } finally { await session.endSession(); }
};
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.auth.userId }).select("_id paymentStatus paymentType orderStatus items subtotal shippingFee totalAmount createdAt").populate("items.productId", "_id name productPictures colors").sort({ createdAt: -1 }).exec();
    return res.status(200).json({ orders });
  } catch (error) { console.error("Order lookup failed:", error.message); return res.status(500).json({ message: "Could not load orders" }); }
};
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.body ?? {};
    if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ message: "A valid order ID is required" });
    const order = await Order.findOne({ _id: orderId, user: req.auth.userId }).populate("items.productId", "_id name productPictures colors").lean().exec();
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.address = order.addressSnapshot || null;
    return res.status(200).json({ order });
  } catch (error) { console.error("Order details lookup failed:", error.message); return res.status(500).json({ message: "Could not load order details" }); }
};




