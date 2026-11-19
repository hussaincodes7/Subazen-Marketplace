const mongoose = require("mongoose");

const spotlightCardSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  image: { type: String, default: "" },
}, { _id: true });

const sectionSchema = new mongoose.Schema({
  type: { type: String, enum: ["banner", "products", "recommended", "spotlight", "categories", "text"], required: true },
  title: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  image: { type: String, default: "" },
  mobileImage: { type: String, default: "" },
  buttonText: { type: String, trim: true, default: "" },
  href: { type: String, trim: true, default: "" },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  spotlightCards: { type: [spotlightCardSchema], default: [] },
  cardWidth: { type: Number, default: 220, min: 140, max: 360 },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  layout: { type: String, enum: ["grid", "slider"], default: "grid" },
  enabled: { type: Boolean, default: true },
  order: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

const homepageSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "storefront" },
  published: { type: Boolean, default: true },
  sections: [sectionSchema],
}, { timestamps: true });

module.exports = mongoose.model("Homepage", homepageSchema);
