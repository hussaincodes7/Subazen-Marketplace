const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logo: { type: String, default: "" },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  isActive: { type: Boolean, default: true, index: true },
  displayOrder: { type: Number, default: 0 },
}, { timestamps: true });

brandSchema.index({ categoryIds: 1, isActive: 1, displayOrder: 1 });

module.exports = mongoose.model("Brand", brandSchema);
