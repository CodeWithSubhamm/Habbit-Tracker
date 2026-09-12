const express = require('express');
const router = express.Router();
const Completion = require('../models/Completion');
const Habit = require('../models/Habit');
const Goal = require('../models/Goal');
const Achievement = require('../models/Achievement');
const auth = require('../middleware/auth');

router.use(auth);

// Helper to check and award achievements based on completions
async function evaluateAchievements(userId) {
  try {
    const totalCompletions = await Completion.countDocuments({ userId, status: 'completed' });
    const badgesToAward = [];

    if (totalCompletions >= 1) {
      badgesToAward.push({ badgeId: 'first_completion', title: 'Momentum Begins', description: 'Recorded your very first habit completion!', icon: '✨' });
    }
    if (totalCompletions >= 10) {
      badgesToAward.push({ badgeId: 'completions_10', title: 'Building Routine', description: 'Recorded 10 habit completions.', icon: '🎯' });
    }
    if (totalCompletions >= 50) {
      badgesToAward.push({ badgeId: 'completions_50', title: 'Habit Champion', description: 'Hit the 50 habit completion milestone!', icon: '🏆' });
    }
    if (totalCompletions >= 100) {
      badgesToAward.push({ badgeId: 'completions_100', title: 'Centurion', description: 'Logged 100 successful habit completions!', icon: '💯' });
    }

    for (const badge of badgesToAward) {
      const exists = await Achievement.findOne({ userId, badgeId: badge.badgeId });
      if (!exists) {
        await new Achievement({ userId, ...badge }).save();
      }
    }
  } catch (err) {
    console.error('Achievement evaluation error:', err);
  }
}

// GET /api/completions - Fetch completions with optional filters
router.get('/', async (req, res) => {
  try {
    const { date, startDate, endDate, habitId, status } = req.query;
    const query = { userId: req.user._id };

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (habitId) {
      query.habitId = habitId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const completions = await Completion.find(query).populate('habitId').sort({ date: -1, createdAt: -1 });
    return res.json({ success: true, completions });
  } catch (error) {
    console.error('Get completions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch completions.' });
  }
});

// POST /api/completions/toggle - Toggle or set completion state
router.post('/toggle', async (req, res) => {
  try {
    const { habitId, date, status, note, quantity, duration } = req.body;

    if (!habitId || !date) {
      return res.status(400).json({ success: false, error: 'habitId and date (YYYY-MM-DD) are required.' });
    }

    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    let completion = await Completion.findOne({ userId: req.user._id, habitId, date });

    if (completion) {
      // If already completed and no explicit new status provided, toggle off
      if (!status || (status === completion.status && status === 'completed')) {
        await Completion.findByIdAndDelete(completion._id);
        return res.json({ success: true, message: 'Completion undone', completion: null });
      } else {
        completion.status = status;
        if (note !== undefined) completion.note = note;
        if (quantity !== undefined) completion.quantity = quantity;
        if (duration !== undefined) completion.duration = duration;
        await completion.save();
      }
    } else {
      completion = new Completion({
        userId: req.user._id,
        habitId,
        date,
        status: status || 'completed',
        quantity: quantity !== undefined ? quantity : (habit.type === 'quantity' ? habit.target : 1),
        duration: duration !== undefined ? duration : (habit.type === 'duration' ? habit.target : 0),
        note: note || ''
      });
      await completion.save();
    }

    await evaluateAchievements(req.user._id);

    return res.json({
      success: true,
      message: `Habit marked as ${completion.status}`,
      completion
    });
  } catch (error) {
    console.error('Toggle completion error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record completion.' });
  }
});

// POST /api/completions/quantity - Increment, decrement, or update quantity value
router.post('/quantity', async (req, res) => {
  try {
    const { habitId, date, delta, quantity } = req.body;

    if (!habitId || !date) {
      return res.status(400).json({ success: false, error: 'habitId and date are required.' });
    }

    const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    let completion = await Completion.findOne({ userId: req.user._id, habitId, date });

    if (!completion) {
      const initialQty = quantity !== undefined ? Math.max(0, quantity) : Math.max(0, delta || 0);
      completion = new Completion({
        userId: req.user._id,
        habitId,
        date,
        quantity: initialQty,
        status: initialQty >= habit.target ? 'completed' : 'completed'
      });
    } else {
      if (quantity !== undefined) {
        completion.quantity = Math.max(0, quantity);
      } else if (delta !== undefined) {
        // Round to 2 decimal places to prevent floating point inaccuracies
        const newQty = Math.round((completion.quantity + Number(delta)) * 100) / 100;
        completion.quantity = Math.max(0, newQty);
      }
      completion.status = completion.quantity > 0 ? 'completed' : 'missed';
    }

    await completion.save();
    await evaluateAchievements(req.user._id);

    return res.json({
      success: true,
      message: 'Quantity updated',
      completion
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update quantity.' });
  }
});

// POST /api/completions/timer - Save duration from timer
router.post('/timer', async (req, res) => {
  try {
    const { habitId, date, duration, note } = req.body;

    if (!habitId || !date || duration === undefined) {
      return res.status(400).json({ success: false, error: 'habitId, date, and duration are required.' });
    }

    let completion = await Completion.findOne({ userId: req.user._id, habitId, date });

    if (!completion) {
      completion = new Completion({
        userId: req.user._id,
        habitId,
        date,
        duration: Number(duration),
        status: 'completed',
        note: note || ''
      });
    } else {
      completion.duration = Number(duration);
      completion.status = 'completed';
      if (note) completion.note = note;
    }

    await completion.save();
    await evaluateAchievements(req.user._id);

    return res.json({
      success: true,
      message: 'Timer duration recorded successfully!',
      completion
    });
  } catch (error) {
    console.error('Save timer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to record timer duration.' });
  }
});

// POST /api/completions/note - Add or update a note
router.post('/note', async (req, res) => {
  try {
    const { habitId, date, note } = req.body;

    if (!habitId || !date) {
      return res.status(400).json({ success: false, error: 'habitId and date are required.' });
    }

    let completion = await Completion.findOne({ userId: req.user._id, habitId, date });

    if (!completion) {
      completion = new Completion({
        userId: req.user._id,
        habitId,
        date,
        status: 'completed',
        note: (note || '').trim()
      });
    } else {
      completion.note = (note || '').trim();
    }

    await completion.save();

    return res.json({
      success: true,
      message: 'Note saved successfully!',
      completion
    });
  } catch (error) {
    console.error('Save note error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save note.' });
  }
});

module.exports = router;
