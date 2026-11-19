const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Controllers
const { signup, signin, profile, forgotPassword, resetPassword } = require('../controller/auth');

// Middleware
const requireSignin = require('../middleware/auth');

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

router.post('/forgot-password', [body('email').trim().isEmail().withMessage('Enter a valid email address')], returnValidationErrors, forgotPassword);
router.post('/reset-password', [
  body('token').isString().isLength({ min: 64, max: 64 }).withMessage('The reset link is invalid or expired'),
  body('password').isString().isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters'),
], returnValidationErrors, resetPassword);

// 3. PROFILE ROUTE
router.get('/profile', requireSignin, profile);

module.exports = router;
