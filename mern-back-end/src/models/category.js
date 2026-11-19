const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({

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
    previousSlugs: { type: [String], default: [] },
    type: {
        type: String,
        enum: ['page', 'store', 'product'],
        required: function () { return !this.parentId; }
    },
    categoryImage:{
        type: String
    },
    coverImage: { type: String, default: "" },
    iconKey: { type: String, trim: true, default: "" },
    showOnHome: { type: Boolean },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },

    parentId: {
        type: String
    } 

}, { timestamps: true });

categorySchema.index({ parentId: 1 });

module.exports = mongoose.model('Category', categorySchema);
