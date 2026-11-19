const express = require("express");
const requireSignin = require("../../middleware/auth");
const { getFooterSettings, updateFooterSettings } = require("../../controller/admin/footer");
const router = express.Router();

router.get("/footer", requireSignin, requireSignin.requireFullAdmin, getFooterSettings);
router.put("/footer", requireSignin, requireSignin.requireFullAdmin, updateFooterSettings);

module.exports = router;
