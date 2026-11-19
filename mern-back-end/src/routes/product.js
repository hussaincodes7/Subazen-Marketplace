const express = require("express");
const requireSignin = require("../middleware/auth");
const admin = requireSignin.requireAdmin;
const { createProduct, updateProduct, deleteProduct, getProductsBySlug, getProductById, getProductBySlug, getAdminProducts, getStorefrontProducts, getRandomStorefrontProducts } = require("../controller/product");
const { searchProducts, getRelatedProducts } = require("../controller/discovery");
const { getProductReviews, createProductReview } = require("../controller/review");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const shortid = require("shortid");
const uploadPath = path.resolve(__dirname, "..", "uploads");
fs.mkdirSync(uploadPath, { recursive: true });
const storage = multer.diskStorage({ destination: (_req, _file, cb) => cb(null, uploadPath), filename: (_req, file, cb) => cb(null, shortid.generate() + "-" + path.basename(file.originalname)) });
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Product uploads must be images.")),
});
const handleProductUploads = (req, res, next) => upload.any()(req, res, (error) => {
  if (!error) return next();
  return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
});
router.post("/product/create", requireSignin, admin, handleProductUploads, createProduct);
router.put("/product/:productId", requireSignin, admin, handleProductUploads, updateProduct);
router.delete("/product/:productId", requireSignin, admin, deleteProduct);
router.get("/search", searchProducts);
router.get("/products/discover", getRandomStorefrontProducts);
router.get("/products", getStorefrontProducts);
router.get("/product/:productId/recommendations", getRelatedProducts);
router.get("/product/:productId/reviews", requireSignin.optional, getProductReviews);
router.post("/product/:productId/reviews", requireSignin, createProductReview);
router.get("/product/slug/:slug", getProductBySlug);
router.get("/product/:productId", getProductById);
router.get("/products/:slug", getProductsBySlug);
router.post("/product/getProducts", requireSignin, admin, getAdminProducts);
module.exports = router;


