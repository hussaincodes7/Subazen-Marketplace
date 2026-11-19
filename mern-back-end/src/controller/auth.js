const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const { sendPasswordResetEmail } = require('../services/email');
const CUSTOMER_SESSION_MS = 24 * 60 * 60 * 1000;

exports.signup = async (req, res) => {
  try {
    const body = req.body ?? {};
    const firstName = body.firstName ?? body.firstname;
    const lastName = body.lastName ?? body.lastname;
    const { email, password, username } = body;

    if (![firstName, lastName, email, password].every((value) => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ message: 'firstName, lastName, email, and password are required' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured on the server' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail }).exec();
    if (existingUser) {
      return res.status(409).json({ message: 'User already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      hash_password: passwordHash,
      username: typeof username === 'string' && username.trim()
        ? username.trim().toLowerCase()
        : normalizedEmail.split('@')[0],
    }).save();

    const userResponse = user.toObject();
    delete userResponse.hash_password;
    const token = jwt.sign(
      { _id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: CUSTOMER_SESSION_MS,
      path: '/',
    });
    return res.status(201).json({ token, user: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with that email or username already exists' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    console.error('Signup failed:', error.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.signin = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).exec();
    if (!user || !(await bcrypt.compare(password, user.hash_password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured on the server' });
    }

    const token = jwt.sign(
      { _id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: CUSTOMER_SESSION_MS,
      path: '/',
    });

    const { _id, firstName, lastName, email: userEmail, role, username } = user;
    return res.status(200).json({
      token,
      user: {
        _id,
        firstName,
        lastName,
        email: userEmail,
        role,
        username,
        fullName: `${firstName} ${lastName}`,
      },
    });
  } catch (error) {
    console.error('Signin failed:', error.message);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

exports.forgotPassword = async (req, res) => {
  const genericResponse = { message: 'If an account exists for that email, a password reset link will be sent shortly.' };
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(200).json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    try {
      await sendPasswordResetEmail(user, rawToken);
    } catch (mailError) {
      console.error('Password reset email delivery failed:', mailError.message);
    }
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Password reset request failed:', error.message);
    return res.status(500).json({ message: 'Could not process the password reset request. Please try again.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || '');
    const password = req.body?.password;
    if (!/^[a-f0-9]{64}$/i.test(token) || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpires: { $gt: new Date() } }).select('_id').exec();
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });

    const hashPassword = await bcrypt.hash(password, 12);
    const result = await User.updateOne(
      { _id: user._id, passwordResetTokenHash: tokenHash, passwordResetExpires: { $gt: new Date() } },
      { $set: { hash_password: hashPassword }, $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 } },
    ).exec();
    if (!result.modifiedCount) return res.status(400).json({ message: 'This reset link is invalid or expired. Request a new one.' });
    return res.status(200).json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('Password reset failed:', error.message);
    return res.status(500).json({ message: 'Could not reset your password. Please request a new link.' });
  }
};


exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).exec();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        username: user.username,
        fullName: `${user.firstName} ${user.lastName}`,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    console.error('Profile lookup failed:', error.message);
    return res.status(500).json({ message: 'Could not load profile' });
  }
};





