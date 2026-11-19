const mongoose = require("mongoose");

// Address schema adapted for Pakistan
const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    min: 3,
    max: 50,
  },
  mobileNumber: {
    type: String,
    required: true,
    trim: true,
    match: [/^(\+92|0)?3\d{9}$/, "Please enter a valid Pakistani mobile number"],
  },
  // Optional — many areas in Pakistan don't have postal codes
  pinCode: {
    type: String,
    required: false,
    trim: true,
    match: [/^\d{6}$/, "Postal code must be 6 digits"],
  },
  // Full address in one line (house no, street, sector/mohalla, area)
  address: {
    type: String,
    required: true,
    trim: true,
    min: 10,
    max: 200,
  },
  // City (e.g. Lahore, Karachi, Islamabad)
  city: {
    type: String,
    required: true,
    trim: true,
  },
  // Province / territory
  state: {
    type: String,
    required: true,
    trim: true,
    enum: [
      "Punjab",
      "Sindh",
      "Khyber Pakhtunkhwa",
      "Balochistan",
      "Gilgit-Baltistan",
      "Azad Jammu and Kashmir",
      "Islamabad Capital Territory",
    ],
  },
  landmark: {
    type: String,
    min: 3,
    max: 100,
  },
  alternatePhone: {
    type: String,
    trim: true,
    match: [/^(\+92|0)?3\d{9}$/, "Please enter a valid Pakistani mobile number"],
  },
  addressType: {
    type: String,
    required: true,
    enum: ["home", "work"],
  },
});

// User address schema
const userAddressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    address: [addressSchema],
  },
  { timestamps: true }
);

mongoose.model("Address", addressSchema);
module.exports = mongoose.model("UserAddress", userAddressSchema);