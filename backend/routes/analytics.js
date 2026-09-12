const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Completion = require('../models/Completion');
const Goal = require('../models/Goal');
const auth = require('../middleware/auth');

router.use(auth);

// Helper function to calculate intelligent streaks across all active habits
async function calculateStreaks(userId) {
  const habits = await Habit.find({ userId, status: 'active' });
  const completions = await Completion.find({ userId, status: 'completed' }).sort({ date: -1 });

  if (habits.length === 0 || completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCompletions: completions.length };
  }

  // Map dates to completed habit IDs
  const dateMap = {};
  completions.forEach(c => {
    if (!dateMap[c.date]) dateMap[c.date] = new Set();
    dateMap[c.date].add(c.habitId.toString());
  });

  const sortedDates = Object.keys(dateMap).sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Calculate global daily streak (any habit done consecutive days)
  let currentStreak = 0;
  let checkDate = new Date();

  // Check if completed today or yesterday to start streak counting
  let hasToday = dateMap[todayStr] && dateMap[todayStr].size > 0;
  let hasYesterday = dateMap[yesterdayStr] && dateMap[yesterdayStr].size > 0;

  if (hasToday || hasYesterday) {
    let curr = hasToday ? new Date() : yesterday;
    while (true) {
      const dStr = curr.toISOString().split('T')[0];
      if (dateMap[dStr] && dateMap[dStr].size > 0) {
        currentStreak++;
        curr.setDate(curr.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak in history
  let longestStreak = 0;
  let tempStreak = 0;
  const allUniqueDatesAsc = Object.keys(dateMap).sort();

  for (let i = 0; i < allUniqueDatesAsc.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(allUniqueDatesAsc[i - 1]);
      const currDate = new Date(allUniqueDatesAsc[i]);
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletions: completions.length
  };
}

// GET /api/analytics/overview - High-level dashboard summary metrics
router.get('/overview', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    const activeHabits = await Habit.find({ userId: req.user._id, status: 'active' });
    const todayCompletions = await Completion.find({
      userId: req.user._id,
      date: todayStr,
      status: 'completed'
    });

    const streakData = await calculateStreaks(req.user._id);

    // Calculate completion rate over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const completionsLast30 = await Completion.find({
      userId: req.user._id,
      date: { $gte: thirtyDaysAgoStr, $lte: todayStr }
    });

    const completedCountLast30 = completionsLast30.filter(c => c.status === 'completed').length;
    const totalPotentialSlots = Math.max(1, activeHabits.length * 30);
    const completionRate = Math.min(100, Math.round((completedCountLast30 / totalPotentialSlots) * 100)) || 0;

    // Goals average progress
    const goals = await Goal.find({ userId: req.user._id, status: { $ne: 'cancelled' } });
    let goalProgress = 0;
    if (goals.length > 0) {
      const totalPct = goals.reduce((acc, g) => acc + Math.min(100, (g.current / g.target) * 100), 0);
      goalProgress = Math.round(totalPct / goals.length);
    }

    return res.json({
      success: true,
      data: {
        todayCompleted: todayCompletions.length,
        todayTotal: activeHabits.length,
        todayProgress: activeHabits.length > 0 ? Math.round((todayCompletions.length / activeHabits.length) * 100) : 0,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        totalCompletions: streakData.totalCompletions,
        completionRate: completionRate > 0 ? completionRate : (todayCompletions.length > 0 ? 100 : 0),
        goalProgress
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch analytics overview.' });
  }
});

// GET /api/analytics/weekly - Mon through Sun completions for current week
router.get('/weekly', async (req, res) => {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const weekDays = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      weekDays.push({
        name: dayNames[i],
        date: dateStr,
        completed: 0,
        skipped: 0,
        missed: 0
      });
    }

    const startDate = weekDays[0].date;
    const endDate = weekDays[6].date;

    const completions = await Completion.find({
      userId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    completions.forEach(c => {
      const match = weekDays.find(w => w.date === c.date);
      if (match) {
        if (c.status === 'completed') match.completed++;
        else if (c.status === 'skipped') match.skipped++;
        else if (c.status === 'missed') match.missed++;
      }
    });

    const activeHabitsCount = await Habit.countDocuments({ userId: req.user._id, status: 'active' });

    return res.json({
      success: true,
      weekDays,
      activeHabitsCount
    });
  } catch (error) {
    console.error('Weekly analytics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch weekly analytics.' });
  }
});

// GET /api/analytics/monthly - Monthly breakdown & category distribution
router.get('/monthly', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const completions = await Completion.find({
      userId: req.user._id,
      date: { $gte: startOfMonth, $lte: todayStr }
    }).populate('habitId');

    const completed = completions.filter(c => c.status === 'completed').length;
    const skipped = completions.filter(c => c.status === 'skipped').length;
    const missed = completions.filter(c => c.status === 'missed').length;

    // Category distribution
    const categoryCounts = {};
    completions.forEach(c => {
      if (c.status === 'completed' && c.habitId && c.habitId.category) {
        const cat = c.habitId.category;
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });

    return res.json({
      success: true,
      stats: {
        completed,
        skipped,
        missed,
        total: completed + skipped + missed
      },
      categories: categoryCounts
    });
  } catch (error) {
    console.error('Monthly analytics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch monthly analytics.' });
  }
});

// GET /api/analytics/heatmap - 365-day consistency data { [date]: count }
router.get('/heatmap', async (req, res) => {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const startDate = oneYearAgo.toISOString().split('T')[0];

    const completions = await Completion.find({
      userId: req.user._id,
      date: { $gte: startDate },
      status: 'completed'
    });

    const heatmap = {};
    completions.forEach(c => {
      heatmap[c.date] = (heatmap[c.date] || 0) + 1;
    });

    return res.json({ success: true, heatmap });
  } catch (error) {
    console.error('Heatmap analytics error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch heatmap data.' });
  }
});

module.exports = router;
