const express = require('express');
const { initialData } = require('../../controller/admin/initialData');
const requireSignin = require('../../middleware/auth');
const router = express.Router();

router.post('/initialdata', requireSignin, requireSignin.requireAdmin, initialData);

module.exports = router;
