const express = require("express");
const { getPublishedHomepage } = require("../controller/admin/homepage");
const router = express.Router();
router.get("/homepage", getPublishedHomepage);
module.exports = router;
