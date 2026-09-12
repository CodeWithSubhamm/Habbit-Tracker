const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  icon: {
    type: String,
    default: '✨'
  },
  color: {
    type: String,
    default: '#9b8cff'
  },
  category: {
    type: String,
    enum: ['Health', 'Fitness', 'Study', 'Work', 'Personal', 'Mindfulness', 'Finance', 'Other'],
    default: 'Personal'
  },
  type: {
    type: String,
    enum: ['boolean', 'quantity', 'duration'],
    default: 'boolean'
  },
  target: {
    type: Number,
    default: 1
  },
  unit: {
    type: String,
    default: 'times' // 'times', 'L', 'glasses', 'pages', 'min', 'steps', etc.
  },
  schedule: {
    type: {
      type: String,
      enum: ['daily', 'weekdays', 'weekly', 'monthly'],
      default: 'daily'
    },
    days: [{ type: Number }], // 0 (Sun) - 6 (Sat)
    timesPerWeek: { type: Number, default: 7 }
  },
  reminder: {
    enabled: { type: Boolean, default: false },
    time: { type: String, default: '09:00' } // HH:mm format
  },
  stacking: {
    enabled: { type: Boolean, default: false },
    afterHabitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Habit', default: null },
    afterHabitName: { type: String, default: '' },
    actionDescription: { type: String, default: '' }
  },
  isPositive: {
    type: Boolean,
    default: true // true = positive habit to build, false = negative habit to avoid
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

habitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Habit', habitSchema);
