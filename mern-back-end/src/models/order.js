const mongoose = require("mongoose");
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addressId: { type: mongoose.Schema.Types.ObjectId, required: true },
  addressSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  shippingFee: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    colorName: String,
    size: String,
    printPlacement: { type: String, enum: ["", "front", "back", "front-and-back"], default: "" },
    printPrice: { type: Number, min: 0, default: 0 },
    productOptionSelections: [{ name: { type: String, trim: true }, value: { type: String, trim: true }, price: { type: Number, min: 0, default: 0 } }],
    designImage: { type: String, trim: true, default: "" },
    designImageFront: { type: String, trim: true, default: "" },
    designImageBack: { type: String, trim: true, default: "" },
    designInstructions: { type: String, trim: true, maxlength: 1000, default: "" },
    payablePrice: { type: Number, required: true, min: 0 },
    purchasedQty: { type: Number, required: true, min: 1 },
    minOrderQuantity: { type: Number, min: 1, default: 1 }
  }],
  paymentStatus: { type: String, enum: ["pending", "completed", "cancelled", "refund"], default: "pending", required: true },
  paymentType: { type: String, enum: ["cod"], default: "cod", required: true },
  orderStatus: [{
    type: { type: String, enum: ["ordered", "packed", "shipped", "delivered"], default: "ordered" },
    date: Date,
    isCompleted: { type: Boolean, default: false }
  }]
}, { timestamps: true });
// Customer history and admin queue both sort by creation time.
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
// Review eligibility checks a user's delivered orders for a purchased product.
orderSchema.index({ user: 1, "items.productId": 1 });
module.exports = mongoose.model("Order", orderSchema);
