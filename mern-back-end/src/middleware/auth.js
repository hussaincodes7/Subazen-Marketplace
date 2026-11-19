const jwt = require('jsonwebtoken');

function requireSignin(req, res, next) {
  const authorization = req.get('authorization') || '';
  const [scheme, bearerToken] = authorization.trim().split(/\s+/);
  const cookieToken = (req.headers.cookie || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('auth_token='))
    ?.slice('auth_token='.length);
  const token = scheme?.toLowerCase() === 'bearer' ? bearerToken : cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Sign in first to access this resource' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication is not configured on the server' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload._id) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.auth = { userId: payload._id, role: payload.role };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    return next(error);
  }
}

function optionalSignin(req, res, next) {
  const authorization = (req.get('authorization') || '').trim();
  const hasCookie = (req.headers.cookie || '').split(';').some((cookie) => cookie.trim().startsWith('auth_token='));

  if (!authorization && !hasCookie) {
    return next();
  }

  return requireSignin(req, res, next);
}

function requireAdmin(req, res, next) {
  if (!['admin', 'junior_admin'].includes(req.auth?.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

function requireFullAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    return res.status(403).json({ message: 'Full admin access required' });
  }
  return next();
}

requireSignin.optional = optionalSignin;
requireSignin.requireAdmin = requireAdmin;
requireSignin.requireFullAdmin = requireFullAdmin;
module.exports = requireSignin;
