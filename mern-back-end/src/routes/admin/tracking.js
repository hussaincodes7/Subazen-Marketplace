const express = require("express");
const requireSignin = require("../../middleware/auth");
const { getTrackingSettings, updateTrackingSettings } = require("../../controller/admin/tracking");

const router = express.Router();
router.get("/tracking", requireSignin, requireSignin.requireFullAdmin, getTrackingSettings);
router.put("/tracking", requireSignin, requireSignin.requireFullAdmin, updateTrackingSettings);
module.exports = router;
