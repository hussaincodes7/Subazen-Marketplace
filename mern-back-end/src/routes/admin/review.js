const express = require("express");
const requireSignin = require("../../middleware/auth");
const { getAdminReviews, updateAdminReview, deleteAdminReview } = require("../../controller/review");
const router = express.Router();

router.get("/reviews", requireSignin, requireSignin.requireFullAdmin, getAdminReviews);
router.patch("/reviews/:reviewId", requireSignin, requireSignin.requireFullAdmin, updateAdminReview);
router.delete("/reviews/:reviewId", requireSignin, requireSignin.requireFullAdmin, deleteAdminReview);

module.exports = router;
