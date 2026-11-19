const express = require("express");
const requireSignin = require("../middleware/auth");
const {
  submitContactMessage,
  listContactMessages,
  updateContactMessage,
} = require("../controller/contact");

const router = express.Router();

router.post("/contact", submitContactMessage);
router.get("/admin/contact-messages", requireSignin, requireSignin.requireFullAdmin, listContactMessages);
router.patch("/admin/contact-messages/:id", requireSignin, requireSignin.requireFullAdmin, updateContactMessage);

module.exports = router;
