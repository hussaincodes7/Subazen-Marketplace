const express = require("express");
const requireSignin = require("../middleware/auth");
const { addAddress, getAddress } = require("../controller/address");

const router = express.Router();

router.post("/user/address/create", requireSignin, addAddress);
router.post("/user/getaddress", requireSignin, getAddress);

module.exports = router;
