const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Goal name is required'],
    trim: true
  },
  target: {
    type: Number,
    required: [true, 'Target count is required']
  },
  current: {
    type: Number,
    default: 0
  },
  unit: {
    type: String,
    default: 'times'
  },
  period: {
    type: String,
    enum: ['weekly', 'monthly'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'cancelled'],
    default: 'in_progress'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Goal', goalSchema);
