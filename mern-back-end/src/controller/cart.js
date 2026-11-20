const mongoose = require("mongoose");
const Cart = require("../models/cart");
const Product = require("../models/product");
const { getEffectiveUnitPrice } = require("../utils/pricing");
const { resolveProductOptionSelections, getProductOptionGroups } = require("../utils/productOptionSelections");
const { productRequiresDesign, productIsCustomPrintingCategory, normalizeDesignImage } = require("../utils/customDesign");
const fs = require("fs");
const path = require("path");
const shortid = require("shortid");
const printPlacementForImages = (isCustomPrinting, placement) => {
  if (!isCustomPrinting) return ["front"];
  if (placement === "front-and-back") return ["front", "back"];
  return placement === "back" ? ["back"] : ["front"];
};

const selectVariant = (product, entry) => {
  if (entry.variantId) return product.colors.id(entry.variantId);
  if (entry.colorName) return product.colors.find((color) => color.colorName.toLowerCase() === String(entry.colorName).trim().toLowerCase());
  return null;
};
exports.uploadCustomerDesign = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.productId, isActive: { $ne: false } }).select("category requiresCustomerDesign").lean().exec();
    if (!product) { if (req.file) fs.promises.unlink(req.file.path).catch(() => {}); return res.status(404).json({ message: "Product not found or inactive" }); }
    if (!await productRequiresDesign(product)) { if (req.file) fs.promises.unlink(req.file.path).catch(() => {}); return res.status(400).json({ message: "Design uploads are only available for Printing products." }); }
    if (!req.file) return res.status(400).json({ message: "Choose an image of your design to upload." });
    if (req.file.mimetype === "application/pdf") {
      const handle = await fs.promises.open(req.file.path, "r");
      const signature = Buffer.alloc(5);
      try { await handle.read(signature, 0, signature.length, 0); } finally { await handle.close(); }
      if (signature.toString("ascii") !== "%PDF-") {
        await fs.promises.unlink(req.file.path).catch(() => {});
        return res.status(400).json({ message: "That file is not a valid PDF." });
      }
    }
    const side = String(req.query.side || req.body?.side || "design").toLowerCase();
    if (!["design", "front", "back"].includes(side)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ message: "Choose whether this artwork is for the front or back." });
    }
    const designImage = `/public/${encodeURIComponent(req.file.filename)}`;
    return res.status(201).json({ designImage, ...(side === "front" ? { designImageFront: designImage } : {}), ...(side === "back" ? { designImageBack: designImage } : {}), message: "Design uploaded." });
  } catch (error) {
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(500).json({ message: "Could not upload your design. Please try again." });
  }
};
exports.addItemToCart = async (req, res) => {
  try {
    const entries = req.body?.cartItems;
    if (!Array.isArray(entries) || !entries.length) return res.status(400).json({ message: "Cart items are required" });
    let cart = await Cart.findOne({ user: req.auth.userId }).exec();
    if (!cart) cart = new Cart({ user: req.auth.userId, cartItems: [] });
    for (const entry of entries) {
      if (!mongoose.isValidObjectId(entry.product) || !Number.isInteger(Number(entry.quantity)) || Number(entry.quantity) < 1) return res.status(400).json({ message: "Each cart item needs a valid product and positive quantity" });
      const product = await Product.findOne({ _id: entry.product, isActive: { $ne: false } }).exec();
      if (!product) return res.status(404).json({ message: "Product not found or inactive" });
      const requiresDesign = await productRequiresDesign(product);
      const isCustomPrinting = await productIsCustomPrintingCategory(product);
      const legacyDesignImage = normalizeDesignImage(entry.designImage);
      const designImageFront = normalizeDesignImage(entry.designImageFront) || (legacyDesignImage && entry.printPlacement !== "back" && entry.printPlacement !== "front-and-back" ? legacyDesignImage : "");
      const designImageBack = normalizeDesignImage(entry.designImageBack) || (legacyDesignImage && entry.printPlacement === "back" ? legacyDesignImage : "");
      const designImage = legacyDesignImage || designImageFront || designImageBack;
      const requiredImages = printPlacementForImages(isCustomPrinting, entry.printPlacement);
      if (requiresDesign && requiredImages.some((side) => !(side === "front" ? designImageFront : designImageBack))) return res.status(400).json({ message: "Upload the required artwork for each selected print side." });
      for (const image of [designImage, designImageFront, designImageBack].filter(Boolean)) {
        if (!fs.existsSync(path.resolve(__dirname, "..", "uploads", decodeURIComponent(image.split("/").pop())))) return res.status(400).json({ message: "The uploaded design could not be found. Please upload it again." });
      }
      const instructionsEnabled = typeof product.allowDesignInstructions === "boolean" ? product.allowDesignInstructions : requiresDesign;
      const designInstructions = instructionsEnabled ? String(entry.designInstructions || "").trim().slice(0, 1000) : "";
      const configuredPrintOptions = (product.customPrintOptions || []).filter((option) => option.isAvailable !== false);
      const printPlacement = isCustomPrinting ? String(entry.printPlacement || "") : "";
      if (isCustomPrinting && !["front", "back", "front-and-back"].includes(printPlacement)) return res.status(400).json({ message: "Choose front, back, or front and back printing." });
      const printOption = configuredPrintOptions.find((option) => option.placement === printPlacement);
      if (configuredPrintOptions.length && !printOption) return res.status(400).json({ message: "Choose a printing side for this custom product." });
      const printPrice = printOption ? Number(printOption.price) : null;
      const productOptionSelections = resolveProductOptionSelections(getProductOptionGroups(product), entry.productOptionSelections || []);
      const variant = selectVariant(product, entry);
      if ((entry.variantId || entry.colorName) && !variant) return res.status(400).json({ message: "Selected product color is unavailable" });
      const sizeOptions = variant?.sizes?.length ? variant.sizes : (!variant ? product.sizes || [] : []);
      let stock = variant?.quantity ?? product.quantity;
      if (sizeOptions.length) {
        const selectedSize = sizeOptions.find((size) => size.size === entry.size);
        if (!selectedSize) return res.status(400).json({ message: "Choose an available size" });
        stock = selectedSize.quantity;
      }
      if (Number(entry.quantity) > stock) return res.status(409).json({ message: `Only ${stock} of ${product.name} are available for this option` });
      const item = { product: product._id, variantId: variant?._id, colorName: variant?.colorName || "", size: entry.size || "", printPlacement, printPrice: printPrice ?? 0, productOptionSelections, designImage, designImageFront, designImageBack, designInstructions, quantity: Number(entry.quantity) };
      const optionKey = JSON.stringify(productOptionSelections.map(({ name, value }) => ({ name, value })));
      const existing = cart.cartItems.find((current) => current.product.equals(product._id) && String(current.variantId || "") === String(item.variantId || "") && current.size === item.size && current.printPlacement === printPlacement && JSON.stringify((current.productOptionSelections || []).map(({ name, value }) => ({ name, value }))) === optionKey && (current.designImageFront || "") === designImageFront && (current.designImageBack || "") === designImageBack && (current.designImage || "") === designImage);
      if (existing) existing.quantity = item.quantity;
      else cart.cartItems.push(item);
    }
    await cart.save();
    return res.status(201).json({ cart });
  } catch (error) { return res.status(400).json({ message: error.message }); }
};
exports.getCartItems = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.auth.userId }).populate("cartItems.product", "_id name price quantity productPictures featuredImageIndex sizes colors customPrintOptions customProductOptions specifications isActive offer discountEnabled dealEnabled dealLabel").exec();
    const cartItems = {};
    for (const item of cart?.cartItems || []) {
      const product = item.product;
      if (!product || product.isActive === false) continue;
      const variant = item.variantId ? product.colors.id(item.variantId) : null;
      if (item.variantId && !variant) continue;
      const configuredPrintOption = (product.customPrintOptions || []).find((option) => option.placement === item.printPlacement && option.isAvailable !== false);
      const unitPrice = (configuredPrintOption ? Number(configuredPrintOption.price) : getEffectiveUnitPrice(product, variant)) + (item.productOptionSelections || []).reduce((sum, option) => sum + Number(option.price || 0), 0);
      const variantImageIndex = Number(variant?.featuredImageIndex) || 0;
      const productImageIndex = Number(product.featuredImageIndex) || 0;
      const image = variant?.productPictures?.[variantImageIndex]?.img
        || variant?.productPictures?.[0]?.img
        || product.productPictures?.[productImageIndex]?.img
        || product.productPictures?.[0]?.img
        || "";
      const selectedOptionKey = JSON.stringify((item.productOptionSelections || []).map(({ name, value }) => ({ name, value })));
      const key = `${product._id}${variant ? `_${variant._id}` : ""}${item.size ? `_${encodeURIComponent(item.size)}` : ""}${item.printPlacement ? `_print_${item.printPlacement}` : ""}${selectedOptionKey !== "[]" ? `_options_${encodeURIComponent(selectedOptionKey)}` : ""}${item.designImageFront ? `_front_${encodeURIComponent(item.designImageFront.split("/").pop())}` : ""}${item.designImageBack ? `_back_${encodeURIComponent(item.designImageBack.split("/").pop())}` : ""}${item.designImage && !item.designImageFront && !item.designImageBack ? `_design_${encodeURIComponent(item.designImage.split("/").pop())}` : ""}`;
      cartItems[key] = { _id: product._id.toString(), cartKey: key, name: product.name, img: image, price: unitPrice, qty: item.quantity, variantId: variant?._id?.toString() || "", colorName: variant?.colorName || "", colorCode: variant?.colorCode || "", size: item.size || "", printPlacement: item.printPlacement || "", printPrice: item.printPrice || 0, customPrintOptions: product.customPrintOptions || [], productOptionSelections: item.productOptionSelections || [], designImage: item.designImage || "", designImageFront: item.designImageFront || "", designImageBack: item.designImageBack || "", designInstructions: item.designInstructions || "" };
    }
    return res.status(200).json({ cartItems });
  } catch (error) { return res.status(500).json({ message: error.message }); }
};
exports.removeCartItems = async (req, res) => {
  try {
    const { productId, variantId = "", size = "", printPlacement = "", productOptionSelections = [], designImage = "", designImageFront = "", designImageBack = "" } = req.body?.payload || req.body || {};
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Product ID is required" });
    const cart = await Cart.findOne({ user: req.auth.userId }).exec();
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    const optionKey = JSON.stringify(productOptionSelections.map(({ name, value }) => ({ name, value })));
    cart.cartItems = cart.cartItems.filter((item) => !(item.product.equals(productId) && String(item.variantId || "") === String(variantId) && item.size === size && (item.printPlacement || "") === printPlacement && JSON.stringify((item.productOptionSelections || []).map(({ name, value }) => ({ name, value }))) === optionKey && (item.designImage || "") === designImage && (item.designImageFront || "") === designImageFront && (item.designImageBack || "") === designImageBack));
    await cart.save();
    return res.status(200).json({ cartItems: cart.cartItems });
  } catch (error) { return res.status(400).json({ message: error.message }); }
};


