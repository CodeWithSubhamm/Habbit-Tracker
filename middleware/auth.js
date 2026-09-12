const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
  // Expect token in Authorization header as "Bearer <token>"
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token not provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'habit_tracker_my_secret_key_2026');
    const userId = decoded._id || decoded.id;
    req.user = {
      _id: userId,
      id: userId,
      name: decoded.name,
      email: decoded.email
    };
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};