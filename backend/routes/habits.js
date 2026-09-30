const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const Goal = require('../models/Goal');
const Achievement = require('../models/Achievement');
const auth = require('../middleware/auth');

// All habit routes require authentication
router.use(auth);

// GET /api/habits - List user habits
router.get('/', async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = { userId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const habits = await Habit.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, habits });
  } catch (error) {
    console.error('Fetch habits error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch habits.' });
  }
});

// GET /api/habits/:id - Get single habit
router.get('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }
    return res.json({ success: true, habit });
  } catch (error) {
    console.error('Get habit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch habit details.' });
  }
});

// POST /api/habits - Create new habit
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      color,
      category,
      type,
      target,
      unit,
      schedule,
      reminder,
      stacking,
      isPositive
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Habit name is required.' });
    }

    const habit = new Habit({
      userId: req.user._id,
      name: name.trim(),
      description: description ? description.trim() : '',
      icon: icon || '✨',
      color: color || '#9b8cff',
      category: category || 'Personal',
      type: type || 'boolean',
      target: target ? Number(target) : 1,
      unit: unit ? unit.trim() : 'times',
      schedule: schedule || { type: 'daily', timesPerWeek: 7 },
      reminder: reminder || { enabled: false, time: '09:00' },
      stacking: stacking || { enabled: false, afterHabitName: '', actionDescription: '' },
      isPositive: isPositive !== undefined ? isPositive : true,
      status: 'active'
    });

    await habit.save();

    // Check for "First Habit" achievement
    const count = await Habit.countDocuments({ userId: req.user._id });
    if (count === 1) {
      const existing = await Achievement.findOne({ userId: req.user._id, badgeId: 'first_habit' });
      if (!existing) {
        await new Achievement({
          userId: req.user._id,
          badgeId: 'first_habit',
          title: 'Architect of Habit',
          description: 'Created your very first habit tracking goal.',
          icon: '🏅'
        }).save();
      }
    }

    return res.status(201).json({ success: true, message: 'Habit created successfully!', habit });
  } catch (error) {
    console.error('Create habit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create habit.' });
  }
});

// PUT /api/habits/:id - Update habit
router.put('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    const fields = [
      'name', 'description', 'icon', 'color', 'category',
      'type', 'target', 'unit', 'schedule', 'reminder', 'stacking', 'isPositive', 'status'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        habit[field] = req.body[field];
      }
    });

    await habit.save();
    return res.json({ success: true, message: 'Habit updated successfully!', habit });
  } catch (error) {
    console.error('Update habit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update habit.' });
  }
});

// PATCH /api/habits/:id/pause - Pause or Resume habit
router.patch('/:id/pause', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    habit.status = habit.status === 'paused' ? 'active' : 'paused';
    await habit.save();

    return res.json({
      success: true,
      message: `Habit ${habit.status === 'paused' ? 'paused' : 'resumed'} successfully!`,
      habit
    });
  } catch (error) {
    console.error('Pause habit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle pause status.' });
  }
});

// PATCH /api/habits/:id/archive - Archive or Unarchive habit
router.patch('/:id/archive', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    habit.status = habit.status === 'archived' ? 'active' : 'archived';
    await habit.save();

    return res.json({
      success: true,
      message: `Habit ${habit.status === 'archived' ? 'archived' : 'restored'} successfully!`,
      habit
    });
  } catch (error) {
    console.error('Archive habit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to toggle archive status.' });
  }
});

// PATCH /api/habits/:id/reminder - Toggle or update reminder settings
router.patch('/:id/reminder', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    const { enabled, time } = req.body;
    if (!habit.reminder) {
      habit.reminder = { enabled: false, time: '09:00' };
    }

    if (enabled !== undefined) habit.reminder.enabled = Boolean(enabled);
    if (time !== undefined && time.trim()) habit.reminder.time = time.trim();

    await habit.save();

    return res.json({
      success: true,
      message: `Reminder ${habit.reminder.enabled ? 'enabled for ' + habit.reminder.time : 'disabled'}!`,
      habit
    });
  } catch (error) {
    console.error('Reminder update error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update reminder settings.' });
  }
});

// DELETE /api/habits/:id - Delete habit
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!habit) {
      return res.status(404).json({ success: false, error: 'Habit not found.' });
    }

    // Clean up associated completions & goals
    await Completion.deleteMany({ habitId: req.params.id, userId: req.user._id });
    await Goal.deleteMany({ habitId: req.params.id, userId: req.user._id });

    return res.json({ success: true, message: 'Habit and related records deleted successfully!' });
  } catch (error) {
    console.error('Delete habit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete habit.' });
  }
});

module.exports = router;
