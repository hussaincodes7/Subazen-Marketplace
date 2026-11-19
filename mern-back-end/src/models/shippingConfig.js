const mongoose = require("mongoose");
const shippingConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: "default" },
  defaultFee: { type: Number, min: 0, default: 250 },
  rules: [{
    city: { type: String, trim: true, default: "" },
    area: { type: String, trim: true, default: "" },
    fee: { type: Number, min: 0, required: true },
    free: { type: Boolean, default: false }
  }]
}, { timestamps: true });
module.exports = mongoose.model("ShippingConfig", shippingConfigSchema);
