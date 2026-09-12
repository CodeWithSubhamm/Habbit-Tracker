require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const completionRoutes = require('./routes/completions');
const goalRoutes = require('./routes/goals');
const analyticsRoutes = require('./routes/analytics');
const achievementRoutes = require('./routes/analytics');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habit_tracker';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', analyticsRoutes); // reuse analytics router or create separate if needed
app.use('/api/export', exportRoutes);

// Health Check API
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  res.json({
    status: 'ok',
    database: states[dbState] || 'Unknown',
    timestamp: new Date().toISOString()
  });
});

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'dashboard.html')));
app.get('/habits', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'habits.html')));
app.get('/calendar', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'calendar.html')));
app.get('/analytics', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'analytics.html')));
app.get('/goals', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'goals.html')));
app.get('/history', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'history.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'settings.html')));

// Global 404 Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
});

// Database Connection Helper
async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('✨ Connected to MongoDB successfully via URI:', MONGODB_URI);
  } catch (err) {
    console.log('⚠️ Could not connect to external MongoDB ( ', err.message, ' ).');
    console.log('🔄 Initializing embedded in-memory MongoDB engine for seamless standalone operation...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✨ Connected to embedded MongoDB successfully.');
    } catch (memErr) {
      console.error('❌ Could not start in-memory MongoDB:', memErr.message);
    }
  } finally {
    app.listen(PORT, () => {
      console.log(`🚀 Glassmorphic Habit Tracker running at http://localhost:${PORT}`);
    });
  }
}

connectDatabase();
module.exports = app;