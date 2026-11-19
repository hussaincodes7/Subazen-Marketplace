const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true
    },
    price: {
        type: Number,
        required: true
},
quantity:{
 type: Number,
        required: true
},
   
description: {
    type: String,
    required: true,
    trim: true
},
offer: { type: Number, min: 0, max: 99, default: 0 },
discountEnabled: { type: Boolean, default: false },
dealEnabled: { type: Boolean, default: false },
dealLabel: { type: String, trim: true, maxlength: 100, default: "" },
reviewsEnabled: { type: Boolean, default: true },
specifications: [{
    name: { type: String, trim: true, maxlength: 100 },
    value: { type: String, trim: true, maxlength: 500 }
}],
warranty: { type: String, trim: true, maxlength: 2000, default: "" },
customDesignGuidelines: { type: String, trim: true, maxlength: 2000, default: "" },
requiresCustomerDesign: { type: Boolean },
allowDesignInstructions: { type: Boolean },
productPictures: [
    { img: { type: String, required: true } }
],
sizes: [{
    size: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 }
}],
    // Used only for products in the Printing & Custom Products category tree.
    customPrintOptions: [{
        placement: { type: String, enum: ["front", "back", "front-and-back"], required: true },
        price: { type: Number, required: true, min: 0 },
        isAvailable: { type: Boolean, default: true }
    }],
    customProductOptions: [{
        name: { type: String, trim: true, required: true, maxlength: 100 },
        options: [{
            value: { type: String, trim: true, required: true, maxlength: 100 },
            price: { type: Number, required: true, min: 0 }
        }]
    }],
    defaultColorName: { type: String, trim: true, maxlength: 60, default: "" },
featuredImageIndex: { type: Number, default: 0, min: 0 },
colors: [{
    colorName: { type: String, required: true, trim: true },
    colorCode: { type: String, required: true, trim: true },
    price: { type: Number, min: 0 },
    productPictures: [{ img: { type: String, required: true } }],
    featuredImageIndex: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, min: 0 },
    sizes: [{
        size: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 0 }
    }]
}],
reviews: [
    {
        userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        review: String
    }
],
category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
brand: { type: String, trim: true, default: '' },
brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
tags: [{ type: String, trim: true, lowercase: true }],
    isActive: { type: Boolean, default: true, index: true },
createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
updatedAt: Date,
    
}, { timestamps: true });

// Supports the common active-category listing ordered by newest first.
productSchema.index({ category: 1, isActive: 1, createdAt: -1, _id: -1 });
productSchema.index({ isActive: 1, createdAt: -1, _id: -1 });
// Supports category price filtering/sorting and brand storefront listings.
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ brandId: 1, isActive: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Product', productSchema);



