const mongoose = require("mongoose");

const footerLinkSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 80, required: true },
  url: { type: String, trim: true, maxlength: 500, required: true },
}, { _id: true });

const footerColumnSchema = new mongoose.Schema({
  title: { type: String, trim: true, maxlength: 80, required: true },
  links: { type: [footerLinkSchema], default: [] },
}, { _id: true });

const socialLinkSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 40, required: true },
  url: { type: String, trim: true, maxlength: 500, required: true },
}, { _id: true });

const contentPageSchema = new mongoose.Schema({
  slug: { type: String, enum: ["about-us", "privacy-policy", "return-policy", "dmca"], required: true },
  title: { type: String, trim: true, maxlength: 120, required: true },
  content: { type: String, trim: true, maxlength: 20000, default: "" },
}, { _id: false });

const footerSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "storefront" },
  brandName: { type: String, trim: true, maxlength: 100, default: "Subazen" },
  description: { type: String, trim: true, maxlength: 300, default: "Shop online with Subazen in Pakistan." },
  email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "hafizahsanashfaq17@gmail.com" },
  phone: { type: String, trim: true, maxlength: 40, default: "0300000000" },
  whatsappNumber: { type: String, trim: true, maxlength: 40, default: "+923064652044" },
  whatsappTemplates: { type: [{ label: { type: String, trim: true, maxlength: 80 }, message: { type: String, trim: true, maxlength: 1000 } }], default: [
    { label: "Ask about a product", message: "Hi Subazen Support, I’d like to know more about this product: " },
    { label: "Return or refund help", message: "Hi Subazen Support, I need help with a return or refund. My order number is: " },
    { label: "Request a custom quote", message: "Hi Subazen Support, I’d like a custom quote for this product: " },
    { label: "Other question", message: "Hi Subazen Support, I have a question: " },
  ] },
  address: { type: String, trim: true, maxlength: 300, default: "Karim Park, Lahore, Pakistan" },
  columns: { type: [footerColumnSchema], default: [
    { title: "Shop", links: [{ label: "Browse products", url: "/" }, { label: "Search", url: "/search" }, { label: "Shopping cart", url: "/cart" }] },
    { title: "Your account", links: [{ label: "My orders", url: "/account/orders" }, { label: "Checkout", url: "/checkout" }] },
    { title: "Customer support", links: [{ label: "Contact Us", url: "/contact" }] },
  ] },
  socialLinks: { type: [socialLinkSchema], default: [] },
  pages: { type: [contentPageSchema], default: [] },
  orderingNote: { type: String, trim: true, maxlength: 300, default: "Cash on Delivery is the available payment method. Shipping charges are shown before you place an order." },
  copyrightText: { type: String, trim: true, maxlength: 160, default: "Subazen" },
}, { timestamps: true });

module.exports = mongoose.model("FooterSettings", footerSettingsSchema);
