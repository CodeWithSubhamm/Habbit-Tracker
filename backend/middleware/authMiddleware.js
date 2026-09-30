const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (authHeader && !authHeader.startsWith('Bearer ')) {
    token = authHeader;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'habit_tracker_my_secret_key_2026';
    const payload = jwt.verify(token, secret);
    const userId = payload._id || payload.id;
    req.user = {
      ...payload,
      _id: userId,
      id: userId
    };
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};