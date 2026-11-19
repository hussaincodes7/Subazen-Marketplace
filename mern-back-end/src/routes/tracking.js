const express = require("express");
const { getPublicTracking } = require("../controller/admin/tracking");

const router = express.Router();
router.get("/tracking", getPublicTracking);
module.exports = router;
