const requireSignin = require('../middleware/auth');

module.exports = function commonMiddleware(req, res, next) {
  const requestPath = req.path.replace(/\/+$/, '') || '/';

  // Helper to check if user exists
  const checkUserExists = (req, res, next) => {
    if (!req.auth?.userId) {
      return res.status(401).json({ message: 'Access denied. User does not exist.' });
    }
    next();
  };

  // Helper to check if admin exists and has admin role
  const checkAdminExists = (req, res, next) => {
    if (!req.auth?.userId) {
      return res.status(401).json({ message: 'Access denied. User does not exist.' });
    }
    if (req.auth.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  };

  if (req.method === 'GET' && requestPath === '/api/admin/profile') {
    return requireSignin(req, res, (error) => {
      if (error) return next(error);
      return checkAdminExists(req, res, next);
    });
  }

  if (req.method === 'GET' && requestPath === '/api/profile') {
    return requireSignin(req, res, (error) => {
      if (error) return next(error);
      return checkUserExists(req, res, next);
    });
  }

  if (req.method === 'POST' && requestPath === '/api/category/create') {
    return requireSignin(req, res, (error) => {
      if (error) return next(error);
      return checkAdminExists(req, res, next);
    });
  }

  if (req.method === 'POST' && requestPath === '/api/admin/signup') {
    return requireSignin.optional(req, res, next);
  }

  return next();
};
