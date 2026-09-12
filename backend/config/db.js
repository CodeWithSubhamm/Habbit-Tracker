const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/habit_tracker';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('? Connected to MongoDB'))
.catch(err => console.error('? MongoDB connection error:', err));

module.exports = mongoose;
