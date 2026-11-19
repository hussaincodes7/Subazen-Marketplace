const express = require("express");
const path = require("path");
const shortid = require("shortid");
const multer = require("multer");
const requireSignin = require("../middleware/auth");
const admin = requireSignin.requireAdmin;
const controller = require("../controller/brand");

const router = express.Router();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(__dirname, "..", "uploads")),
  filename: (_req, file, cb) => cb(null, `${shortid.generate()}-${path.basename(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Brand logos must be image files.")) });
const handleLogo = (req, res, next) => upload.single("logo")(req, res, (error) => error ? res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message }) : next());

router.get("/brands", controller.publicList);
router.get("/brands/:slug/products", controller.products);
router.get("/admin/brands", requireSignin, admin, controller.adminList);
router.post("/admin/brands", requireSignin, admin, handleLogo, controller.create);
router.put("/admin/brands/:brandId", requireSignin, admin, handleLogo, controller.update);
router.delete("/admin/brands/:brandId", requireSignin, admin, controller.remove);
router.post("/admin/brands/migrate-legacy-categories", requireSignin, admin, controller.migrateMatchingCategories);

module.exports = router;
