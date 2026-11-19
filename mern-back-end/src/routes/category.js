const express = require('express');
const { addCategory, updateCategory, deleteCategories, getCategories } = require('../controller/category');
const requireSignin = require('../middleware/auth');
const adminMiddleware = requireSignin.requireAdmin;
const router = express.Router();
const shortid = require('shortid');
const path = require('path');
const multer = require('multer');
const browse = require('../controller/browse').browse;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(__dirname, '..', 'uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, shortid.generate() + '-' + file.originalname)
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 2 }, fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Category uploads must be images.')) });
const handleCategoryImage = (req, res, next) => upload.fields([{ name: 'categoryImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }])(req, res, (error) => {
    if (!error) return next();
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message });
});

router.post('/category/create', requireSignin, adminMiddleware, handleCategoryImage, addCategory );
router.put('/category/:categoryId', requireSignin, adminMiddleware, handleCategoryImage, updateCategory);
router.delete('/category', requireSignin, adminMiddleware, deleteCategories);
router.get('/category/getCategory', getCategories);
router.get('/browse', browse);

module.exports = router;
