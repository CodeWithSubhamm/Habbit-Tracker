const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_glassmorphic_habit_tracker_key_2026');
    const userId = payload._id || payload.id;
    req.user = {
      ...payload,
      _id: userId,
      id: userId
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};