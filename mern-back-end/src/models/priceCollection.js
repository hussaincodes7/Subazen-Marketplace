const mongoose = require("mongoose");

const priceCollectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
  brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", default: null, index: true },
  minPrice: { type: Number, min: 0, default: 0 },
  maxPrice: { type: Number, min: 0, required: true },
  displayOnHome: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

priceCollectionSchema.index({ categoryId: 1, brandId: 1, minPrice: 1, maxPrice: 1, isActive: 1 });
module.exports = mongoose.model("PriceCollection", priceCollectionSchema);
