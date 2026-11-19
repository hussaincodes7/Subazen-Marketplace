const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  cartItems: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    colorName: { type: String, trim: true, default: "" },
    size: { type: String, trim: true, default: "" },
    printPlacement: { type: String, enum: ["", "front", "back", "front-and-back"], default: "" },
    printPrice: { type: Number, min: 0, default: 0 },
    productOptionSelections: [{ name: { type: String, trim: true }, value: { type: String, trim: true }, price: { type: Number, min: 0, default: 0 } }],
    designImage: { type: String, trim: true, default: "" },
    designImageFront: { type: String, trim: true, default: "" },
    designImageBack: { type: String, trim: true, default: "" },
    designInstructions: { type: String, trim: true, maxlength: 1000, default: "" },
    quantity: { type: Number, default: 1, min: 1 }
  }]
}, { timestamps: true });
module.exports = mongoose.model("Cart", cartSchema);
