const mongoose = require("mongoose");

const trackingScriptSchema = new mongoose.Schema({
  provider: { type: String, enum: ["google-analytics", "google-ads"], required: true },
  name: { type: String, trim: true, maxlength: 100, default: "" },
  placement: { type: String, enum: ["head", "body"], required: true, default: "head" },
  pages: { type: [String], default: ["all"] },
  customPath: { type: String, trim: true, maxlength: 300, default: "" },
  code: { type: String, maxlength: 15000, required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

const trackingSettingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "storefront" },
  scripts: { type: [trackingScriptSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("TrackingSettings", trackingSettingsSchema);
