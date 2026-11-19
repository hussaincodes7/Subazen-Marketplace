const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Controllers (Pointing to ADMIN controller)
const { signup, signin, profile, signout, updateProfile, getPendingAdmins, approveJuniorAdmin } = require('../../controller/admin/auth');

// Middleware (Pointing to ADMIN middleware)
const requireSignin = require('../../middleware/auth');
const path = require('path');
const shortid = require('shortid');
const multer = require('multer');
const adminMiddleware = requireSignin.requireAdmin;
const fullAdminMiddleware = requireSignin.requireFullAdmin;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve(__dirname, '..', '..', 'uploads')),
  filename: (req, file, cb) => cb(null, shortid.generate() + '-' + path.basename(file.originalname)),
});
const uploadProfilePicture = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => file.mimetype.startsWith('image/')
    ? cb(null, true)
    : cb(new Error('Profile photo must be an image.')),
});
const handleProfilePictureUpload = (req, res, next) => uploadProfilePicture.single('profilePicture')(req, res, (error) => {
  if (!error) return next();
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  return res.status(status).json({ message: error.message });
});

// --- Helper Middleware ---
function normalizeSignupFields(req, res, next) {
  req.body = req.body ?? {};
  req.body.firstName ??= req.body.firstname;
  req.body.lastName ??= req.body.lastname;
  return next();
}

function returnValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Fix request body fields', errors: errors.array() });
  }
  return next();
}

// --- ROUTES ---
// --- ROUTES ---

// 1. SIGNUP ROUTE
// I am using the inline validation array you wrote at the bottom because it is very robust!
router.post('/signup', 
  normalizeSignupFields, 
  [
    body('firstName').trim().notEmpty().withMessage('firstName is required'),
    body('lastName').trim().notEmpty().withMessage('lastName is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ], 
  returnValidationErrors, 
  signup
);

// Note: If you prefer to use your external validator file, you can replace the signup route above with:
// router.post('/signup', validateSignupRequest, isRequestValidated, signup);

// 2. SIGNIN ROUTE
router.post('/signin', 
  normalizeSignupFields, 
  [
    
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ], 
  returnValidationErrors, 
  signin
);
router.post('/signout', requireSignin, signout) 
// 3. PROFILE ROUTE
router.get('/profile', requireSignin, requireSignin.requireAdmin, profile);
router.put('/profile', requireSignin, adminMiddleware, handleProfilePictureUpload, updateProfile);
router.get('/pending-signups', requireSignin, fullAdminMiddleware, getPendingAdmins);
router.patch('/pending-signups/:userId/approve', requireSignin, fullAdminMiddleware, approveJuniorAdmin);

module.exports = router;
