const express = require("express");
const { getPublicFooter } = require("../controller/admin/footer");
const router = express.Router();

router.get("/footer", getPublicFooter);

module.exports = router;
