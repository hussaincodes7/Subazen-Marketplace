const express = require("express");
const requireSignin = require("../middleware/auth");
const { addOrder, getOrders, getOrder, getShippingQuote } = require("../controller/order");
const router = express.Router();
router.post("/shipping/quote", getShippingQuote);
router.post("/addOrder", requireSignin, addOrder);
router.get("/getOrders", requireSignin, getOrders);
router.post("/getOrder", requireSignin, getOrder);
module.exports = router;
