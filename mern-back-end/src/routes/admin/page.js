const express = require('express');
const path = require('path');
const fs = require('fs');
const shortid = require('shortid');
const multer = require('multer');
const requireSignin = require('../../middleware/auth');
const adminMiddleware = requireSignin.requireAdmin;
const { createPage, getPage } = require('../../controller/admin/page');
const router = express.Router();

const uploadPath = path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, shortid.generate() + '-' + path.basename(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024, files: 20 }, fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Page uploads must be images.')) });
const handlePageUploads = (req, res, next) => upload.fields([
    { name: 'banners', maxCount: 10 },
    { name: 'products', maxCount: 10 }
])(req, res, (error) => {
    if (!error) return next();
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message });
});

router.post(`/page/create`, requireSignin, adminMiddleware, handlePageUploads, createPage);

router.get(`/page/:category/:type`, getPage);

module.exports = router;
