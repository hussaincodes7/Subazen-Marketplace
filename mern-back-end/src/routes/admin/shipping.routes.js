const express = require("express");
const requireSignin = require("../../middleware/auth");
const admin = requireSignin.requireFullAdmin;
const { getShippingConfig, updateShippingConfig, adjustOrderShipping } = require("../../controller/admin/shipping.admin");
const router = express.Router();
router.get("/shipping", requireSignin, admin, getShippingConfig);
router.put("/shipping", requireSignin, admin, updateShippingConfig);
router.patch("/order/:orderId/shipping", requireSignin, admin, adjustOrderShipping);
module.exports = router;
