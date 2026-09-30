const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  avatarUrl: {
    type: String,
  },
  theme: {
    type: String,
    default: 'dark',
  },
  preferences: {
    type: Schema.Types.Mixed,
  },
});

module.exports = mongoose.model('User', UserSchema);