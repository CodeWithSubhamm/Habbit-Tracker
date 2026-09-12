const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/export/csv - Export completions history as CSV file
router.get('/csv', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id });
    const habitMap = {};
    habits.forEach(h => { habitMap[h._id.toString()] = h.name; });

    const completions = await Completion.find({ userId: req.user._id }).sort({ date: -1 });

    let csvContent = 'Date,Habit Name,Status,Quantity,Duration (min),Note\n';

    completions.forEach(c => {
      const habitName = (habitMap[c.habitId.toString()] || 'Unknown').replace(/"/g, '""');
      const note = (c.note || '').replace(/"/g, '""');
      csvContent += `"${c.date}","${habitName}","${c.status}",${c.quantity || 0},${c.duration || 0},"${note}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="habit-tracker-export-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export CSV.' });
  }
});

// GET /api/export/json - Export all user data as JSON file
router.get('/json', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id });
    const completions = await Completion.find({ userId: req.user._id });
    const goals = await Goal.find({ userId: req.user._id });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      habits,
      completions,
      goals
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="habit-tracker-backup-${new Date().toISOString().split('T')[0]}.json"`);
    return res.status(200).json(exportData);
  } catch (error) {
    console.error('Export JSON error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export JSON.' });
  }
});

module.exports = router;
