const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path if your User model lives elsewhere
require('dotenv').config();

// Helper to sign a JWT
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'habit_tracker_my_secret_key_2026', {
    expiresIn: '7d'
  });
}

/* -------------------------------------------------------------------------- */
/*  Registration (client calls `/api/auth/register`)                          */
/* -------------------------------------------------------------------------- */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'All fields are required.', message: 'All fields are required.' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'User with this email already exists.', message: 'User with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // Sign token and return
    const token = signToken({ id: newUser._id, name: newUser.name, email: newUser.email });
    res.status(201).json({ success: true, token, user: { id: newUser._id, name: newUser.name, email: newUser.email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: 'Server error during signup.', message: 'Server error during signup.' });
  }
});

/* -------------------------------------------------------------------------- */
/*  Login (client calls `/api/auth/login`)                                   */
/* -------------------------------------------------------------------------- */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.', message: 'Email and password are required.' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Invalid email or password.', message: 'Invalid credentials.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password.', message: 'Invalid credentials.' });
    }

    // Sign token and return
    const token = signToken({ id: user._id, name: user.name, email: user.email });
    res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ success: false, error: 'Server error during signin.', message: 'Server error during signin.' });
  }
});

/* -------------------------------------------------------------------------- */
/*  Logout (client calls `/api/auth/logout`)                                 */
/* -------------------------------------------------------------------------- */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

/* -------------------------------------------------------------------------- */
/*  Current User Info (GET `/api/auth/me`)                                   */
/* -------------------------------------------------------------------------- */
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

/* -------------------------------------------------------------------------- */
/*  Update Profile (PUT `/api/auth/profile`)                                 */
/* -------------------------------------------------------------------------- */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { name, currentPassword, newPassword } = req.body;
    if (name) user.name = name.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: { id: user._id, name: user.name, email: user.email, theme: user.theme, preferences: user.preferences }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

/* -------------------------------------------------------------------------- */
/*  Update Preferences & Theme (PUT `/api/auth/preferences`)                 */
/* -------------------------------------------------------------------------- */
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (req.body.theme) {
      user.theme = req.body.theme;
    }
    if (req.body.preferences) {
      user.preferences = { ...user.preferences, ...req.body.preferences };
    }

    await user.save();
    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, theme: user.theme, preferences: user.preferences }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

module.exports = router;