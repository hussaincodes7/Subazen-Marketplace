const express = require("express");
const requireSignin = require("../middleware/auth");
const admin = requireSignin.requireAdmin;
const controller = require("../controller/priceCollection");
const router = express.Router();

router.get("/price-collections", controller.publicList);
router.get("/price-collections/:slug/products", controller.products);
router.get("/admin/price-collections", requireSignin, admin, controller.adminList);
router.post("/admin/price-collections", requireSignin, admin, controller.create);
router.put("/admin/price-collections/:collectionId", requireSignin, admin, controller.update);
router.delete("/admin/price-collections/:collectionId", requireSignin, admin, controller.remove);
module.exports = router;
