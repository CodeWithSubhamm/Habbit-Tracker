const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
    index: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['completed', 'skipped', 'missed'],
    default: 'completed'
  },
  quantity: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0 // In minutes (or fractional minutes/seconds)
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a single completion entry per user per habit per date
completionSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Completion', completionSchema);
