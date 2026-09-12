const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const auth = require('../middleware/auth');

router.use(auth);

const ALL_ACHIEVEMENTS = [
  { badgeId: 'first_step', title: 'First Step', description: 'Created your habit tracker account.', icon: '🌱' },
  { badgeId: 'first_habit', title: 'Architect of Habit', description: 'Created your first habit.', icon: '🏅' },
  { badgeId: 'first_completion', title: 'Momentum Begins', description: 'Recorded your very first habit completion.', icon: '✨' },
  { badgeId: 'streak_7', title: '7-Day Streak', description: 'Maintained a consistent habit for a full week.', icon: '🔥' },
  { badgeId: 'streak_30', title: 'Unstoppable Force', description: 'Crushed a 30-day continuous streak.', icon: '⚡' },
  { badgeId: 'hydration_master', title: 'Hydration Hero', description: 'Hit daily water goals 10 times.', icon: '💧' },
  { badgeId: 'mindful_10', title: 'Zen Master', description: 'Completed 10 mindfulness/meditation sessions.', icon: '🧘' },
  { badgeId: 'completions_50', title: 'Habit Champion', description: 'Hit the 50 total completions milestone.', icon: '🏆' },
  { badgeId: 'completions_100', title: 'Centurion', description: 'Logged 100 successful habit completions!', icon: '💯' }
];

// GET /api/achievements - List unlocked and locked achievements
router.get('/', async (req, res) => {
  try {
    const userAchievements = await Achievement.find({ userId: req.user._id });
    const userBadgeMap = {};
    userAchievements.forEach(a => {
      userBadgeMap[a.badgeId] = a.unlockedAt;
    });

    const result = ALL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      isUnlocked: !!userBadgeMap[ach.badgeId],
      unlockedAt: userBadgeMap[ach.badgeId] || null
    }));

    return res.json({
      success: true,
      achievements: result,
      unlockedCount: userAchievements.length,
      totalCount: ALL_ACHIEVEMENTS.length
    });
  } catch (error) {
    console.error('Fetch achievements error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch achievements.' });
  }
});

module.exports = router;
