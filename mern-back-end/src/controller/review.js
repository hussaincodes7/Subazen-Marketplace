const mongoose = require("mongoose");
const Product = require("../models/product");
const Order = require("../models/order");
const Review = require("../models/review");

exports.getProductReviews = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findOne({ _id: req.params.productId, isActive: { $ne: false } }).select("reviewsEnabled").lean().exec();
    if (!product) return res.status(404).json({ message: "Product not found." });
    if (product.reviewsEnabled === false) return res.status(200).json({ enabled: false, reviews: [], averageRating: 0, canReview: false });
    const reviews = await Review.find({ product: product._id, status: "approved" })
      .select("rating title body verifiedPurchase createdAt user")
      .populate("user", "firstName lastName")
      .sort({ createdAt: -1 }).lean().exec();
    const averageRating = reviews.length ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10 : 0;
    let canReview = false;
    if (req.auth?.userId) {
      const deliveredOrder = await Order.findOne({ user: req.auth.userId, "items.productId": product._id, orderStatus: { $elemMatch: { type: "delivered", isCompleted: true } } }).select("_id").lean().exec();
      const existingReview = await Review.exists({ product: product._id, user: req.auth.userId });
      canReview = Boolean(deliveredOrder && !existingReview);
    }
    return res.status(200).json({ enabled: true, reviews, averageRating, reviewCount: reviews.length, canReview });
  } catch (error) {
    console.error("Product reviews lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load product reviews." });
  }
};

exports.createProductReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const rating = Number(req.body?.rating);
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    if (!mongoose.isValidObjectId(productId)) return res.status(400).json({ message: "Invalid product ID." });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Choose a rating from 1 to 5 stars." });
    if (body.length < 5 || body.length > 3000) return res.status(400).json({ message: "Review text must be between 5 and 3000 characters." });
    if (title.length > 120) return res.status(400).json({ message: "Review title must be 120 characters or fewer." });
    const product = await Product.findOne({ _id: productId, isActive: { $ne: false }, reviewsEnabled: { $ne: false } }).select("_id").lean().exec();
    if (!product) return res.status(404).json({ message: "Product not found or reviews are disabled." });
    const order = await Order.findOne({ user: req.auth.userId, "items.productId": product._id, orderStatus: { $elemMatch: { type: "delivered", isCompleted: true } } }).select("_id").lean().exec();
    if (!order) return res.status(403).json({ message: "A delivered order is required before you can review this product." });
    const review = await Review.create({ product: product._id, user: req.auth.userId, order: order._id, rating, title, body, verifiedPurchase: true, status: "pending" });
    return res.status(201).json({ review: { _id: review._id, status: review.status }, message: "Thanks. Your review was sent for moderation." });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You have already reviewed this product." });
    if (error.name === "ValidationError" || error.name === "CastError") return res.status(400).json({ message: error.message });
    console.error("Product review submission failed:", error.message);
    return res.status(500).json({ message: "Could not submit your review." });
  }
};

exports.getAdminReviews = async (_req, res) => {
  try {
    const reviews = await Review.find({}).populate("product", "_id name slug").populate("user", "firstName lastName email").sort({ createdAt: -1 }).lean().exec();
    return res.status(200).json({ reviews });
  } catch (error) {
    console.error("Admin review lookup failed:", error.message);
    return res.status(500).json({ message: "Could not load customer reviews." });
  }
};

exports.updateAdminReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.reviewId)) return res.status(400).json({ message: "Invalid review ID." });
    const { status } = req.body || {};
    if (!["pending", "approved", "rejected", "hidden"].includes(status)) return res.status(400).json({ message: "Choose a valid review visibility status." });
    const review = await Review.findByIdAndUpdate(req.params.reviewId, { status }, { returnDocument: "after", runValidators: true }).exec();
    if (!review) return res.status(404).json({ message: "Review not found." });
    return res.status(200).json({ review, message: "Review status updated." });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not update review." });
  }
};

exports.deleteAdminReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.reviewId)) return res.status(400).json({ message: "Invalid review ID." });
    const review = await Review.findByIdAndDelete(req.params.reviewId).exec();
    if (!review) return res.status(404).json({ message: "Review not found." });
    return res.status(200).json({ message: "Review deleted.", reviewId: review._id });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not delete review." });
  }
};
