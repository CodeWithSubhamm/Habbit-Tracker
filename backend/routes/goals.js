const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const Completion = require('../models/Completion');
const Habit = require('../models/Habit');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/goals - Fetch user goals with dynamically updated progress
router.get('/', async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).populate('habitId').sort({ createdAt: -1 });

    // Calculate current progress for goals that are linked to habits or general
    const updatedGoals = await Promise.all(goals.map(async (goal) => {
      if (goal.habitId) {
        // Calculate completions in current month/week
        const now = new Date();
        let startDate;
        if (goal.period === 'weekly') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
          startDate = new Date(now.setDate(diff)).toISOString().split('T')[0];
        } else {
          // Monthly
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        }
        const todayStr = new Date().toISOString().split('T')[0];

        const completions = await Completion.find({
          userId: req.user._id,
          habitId: goal.habitId._id || goal.habitId,
          date: { $gte: startDate, $lte: todayStr },
          status: 'completed'
        });

        let calculatedCurrent = completions.length;
        if (goal.habitId.type === 'quantity') {
          calculatedCurrent = completions.reduce((sum, c) => sum + (c.quantity || 0), 0);
        } else if (goal.habitId.type === 'duration') {
          calculatedCurrent = Math.round((completions.reduce((sum, c) => sum + (c.duration || 0), 0) / 60) * 10) / 10; // in hours or units
        }

        goal.current = calculatedCurrent;
        if (goal.current >= goal.target && goal.status === 'in_progress') {
          goal.status = 'completed';
        }
        await goal.save();
      }
      return goal;
    }));

    return res.json({ success: true, goals: updatedGoals });
  } catch (error) {
    console.error('Fetch goals error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch goals.' });
  }
});

// POST /api/goals - Create new goal
router.post('/', async (req, res) => {
  try {
    const { name, target, unit, period, habitId } = req.body;

    if (!name || !target) {
      return res.status(400).json({ success: false, error: 'Goal name and target number are required.' });
    }

    const goal = new Goal({
      userId: req.user._id,
      name: name.trim(),
      target: Number(target),
      unit: unit || 'times',
      period: period || 'monthly',
      habitId: habitId || null
    });

    await goal.save();
    return res.status(201).json({ success: true, message: 'Goal created successfully!', goal });
  } catch (error) {
    console.error('Create goal error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create goal.' });
  }
});

// PUT /api/goals/:id - Update goal
router.put('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found.' });
    }

    const { name, target, unit, current, period, status, habitId } = req.body;
    if (name) goal.name = name.trim();
    if (target !== undefined) goal.target = Number(target);
    if (unit !== undefined) goal.unit = unit;
    if (current !== undefined) goal.current = Number(current);
    if (period) goal.period = period;
    if (status) goal.status = status;
    if (habitId !== undefined) goal.habitId = habitId || null;

    await goal.save();
    return res.json({ success: true, message: 'Goal updated successfully!', goal });
  } catch (error) {
    console.error('Update goal error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update goal.' });
  }
});

// DELETE /api/goals/:id - Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found.' });
    }
    return res.json({ success: true, message: 'Goal deleted successfully!' });
  } catch (error) {
    console.error('Delete goal error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete goal.' });
  }
});

module.exports = router;
