const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth.js');
const habitRoutes = require('./routes/habits.js');
const completionRoutes = require('./routes/completions.js');
const goalRoutes = require('./routes/goals.js');
const analyticsRoutes = require('./routes/analytics.js');
const achievementRoutes = require('./routes/achievements.js');
const exportRoutes = require('./routes/export.js');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://codeforsubham_db_user:yM3xAHK5uVJoOrLt@cluster0.fbdqodv.mongodb.net/todo_list?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from ../frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Middleware to check DB connection status before handling API requests
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database Disconnected',
      message: 'MongoDB is not connected. Please whitelist your current IP in MongoDB Atlas or configure backend/.env with a valid MONGODB_URI.'
    });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/completions', completionRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/achievements', achievementRoutes);
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
    console.log('⚠️ Could not connect to primary MongoDB URI (', err.message, ').');
    console.log('🔄 Initializing embedded in-memory MongoDB engine for seamless standalone operation...');
    try {
      await mongoose.disconnect();
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✨ Connected to embedded MongoDB successfully.');
    } catch (memErr) {
      console.error('❌ Could not start in-memory MongoDB engine:');
      console.error('   Reason:', memErr.message);
      
      if (memErr.message.includes('3221225781') || memErr.message.includes('vc_redist')) {
        console.log('\n------------------------------------------------------------');
        console.log('💡 TROUBLESHOOTING GUIDE: how to fix database connectivity:');
        console.log('1. FIX MONGODB ATLAS (Recommended):');
        console.log('   - Go to https://cloud.mongodb.com -> Network Access');
        console.log('   - Add your current IP or allow access from anywhere (0.0.0.0/0).');
        console.log('2. OR USE LOCAL MONGODB / CUSTOM URI:');
        console.log('   - Create/edit backend/.env and set MONGODB_URI=mongodb://127.0.0.1:27017/habit_tracker');
        console.log('3. OR INSTALL VC++ REDISTRIBUTABLE:');
        console.log('   - Download & install Visual C++ Redistributable x64 from Microsoft:');
        console.log('     https://aka.ms/vs/17/release/vc_redist.x64.exe');
        console.log('------------------------------------------------------------\n');
      }
      
      // Disable command buffering so queries fail quickly with 503 instead of timing out after 10s
      mongoose.set('bufferCommands', false);
    }
  } finally {
    if (!app.get('serverStarted')) {
      app.set('serverStarted', true);
      const server = app.listen(PORT, () => {
        console.log(`🚀 Glassmorphic Habit Tracker running at http://localhost:${PORT}`);
      });
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use by another process. If nodemon is already running, please restart it.`);
        } else {
          console.error('Server start error:', err);
        }
      });
    }
  }
}

connectDatabase();
module.exports = app;