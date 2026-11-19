const { check, validationResult } = require('express-validator');

exports.validateSignupRequest = [
    check('firstName')
    .notEmpty()
    .withMessage('firstName is required'),
    
    check('lastName')
    .notEmpty()
    .withMessage('lastName is required'),
    
    check('email')
    .isEmail()
    .withMessage('Valid Email is required'),
    
    check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 character long')
];
exports.validateSigninRequest = [
    check('email')
    .isEmail()
    .withMessage('Valid Email is required'),

    check('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 character long')
];

exports.isRequestValidated = (req, res, next) => {
    const errors = validationResult(req);
    if(errors.array().length > 0){
        // Map through the errors to just get the messages
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).json({ errors: errorMessages });
    }
    next();
}