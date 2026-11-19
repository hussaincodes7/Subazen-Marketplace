const express = require("express");
const path = require("path");
const shortid = require("shortid");
const multer = require("multer");
const requireSignin = require("../../middleware/auth");
const { getHomepage, updateHomepage } = require("../../controller/admin/homepage");
const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.resolve(__dirname, "..", "..", "uploads")),
    filename: (_req, file, cb) => cb(null, shortid.generate() + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 40 },
  fileFilter: (_req, file, cb) => file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Homepage uploads must be images.")),
});
const handleUpload = (req, res, next) => upload.any()(req, res, (error) => {
  if (!error) return next();
  return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
});

router.get("/homepage", requireSignin, requireSignin.requireAdmin, getHomepage);
router.put("/homepage", requireSignin, requireSignin.requireAdmin, handleUpload, updateHomepage);
module.exports = router;
