const express = require("express");
const requireSignin = require("../middleware/auth");
const admin = requireSignin.requireAdmin;
const { addItemToCart, getCartItems, removeCartItems, uploadCustomerDesign } = require("../controller/cart");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const shortid = require("shortid");
const uploadPath = path.resolve(__dirname, "..", "uploads");
fs.mkdirSync(uploadPath, { recursive: true });
const designUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadPath),
    filename: (_req, file, cb) => {
      const extByMime = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
      const extension = extByMime[file.mimetype] || (/\.pdf$/i.test(file.originalname) ? ".pdf" : ".img");
      cb(null, `${shortid.generate()}${extension}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.mimetype) || /\.pdf$/i.test(file.originalname))
    ? cb(null, true)
    : cb(new Error("Upload your design as a JPG, PNG, WebP image, or PDF."))
});
const handleDesignUpload = (req, res, next) => designUpload.single("design")(req, res, (error) => {
  if (!error) return next();
  return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.code === "LIMIT_FILE_SIZE" ? "Design image must be 10 MB or smaller." : error.message });
});
router.post("/product/:productId/customer-design", handleDesignUpload, uploadCustomerDesign);
router.post("/user/cart/addtocart", requireSignin, addItemToCart);
router.get("/user/cart/getCartItems", requireSignin, getCartItems);
router.post("/user/cart/removeCartItems", requireSignin, removeCartItems);
router.post("/user/getCartItems", requireSignin, getCartItems);
router.post("/user/cart/removeItem", requireSignin, removeCartItems);
module.exports = router;
