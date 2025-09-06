const express = require('express');
const db = require('../db');
const { ensureAuthenticated } = require('../middlewares/ensureAuthenticated');
const { profileLimiter } = require('../middlewares/rateLimiter');
// Import helper functions from utils/userStats.js
const {
  getAllUserStats,
  invalidateUserStatsCache
} = require('../utils/userStats');

const router = express.Router();

// Profile Route
router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    
    // Get all user stats in one optimized call
    const userStats = await getAllUserStats(user.id);
    
    // Get all vocabulary (for preview) and count total words
    const vocabResult = await db.query(`
      SELECT word FROM vocabulary 
      WHERE userId = $1 
      ORDER BY dateAdded DESC 
      LIMIT 15
    `, [user.id]);
    const vocab = vocabResult.rows;

    // Get user's active subscription if any
    const subscriptionResult = await db.query(`
      SELECT s.*, p.name as planName, p.price, p.billing_interval 
      FROM subscriptions s
      JOIN subscription_plans p ON s.planId = p.id
      WHERE s.userId = $1 AND s.status = 'active'
      ORDER BY s.id DESC LIMIT 1
    `, [user.id]);
    const subscription = subscriptionResult.rows[0] || null;

    // Define potential achievements.
    const potentialAchievements = [
      { emoji: '📚', name: 'Bookworm' },
      { emoji: '🔥', name: '5 Day Streak' },
      { emoji: '🎯', name: 'Accuracy Master' },
      { emoji: '💡', name: 'Quick Learner' }
    ];
    
    // For each potential achievement, if it wasn't obtained, mark it as not obtained.
    const achievements = potentialAchievements.map(p => {
      const found = userStats.achievements.find(a => a.name === p.name);
      if (found) {
        return found;
      } else {
        return { emoji: '❓', name: p.name + ' (Not obtained)' };
      }
    });

    // Progress is calculated as a percentage toward a goal of 100 learned words.
    const progress = Math.min(Math.floor((userStats.learnedCount / 100) * 100), 100);

    res.render('profile', {
      user: {
        ...user,
        progress,
        vocabulary: vocab,
        vocabCount: userStats.vocabCount,
        streak: userStats.streak,
        totalHours: userStats.totalHours,
        accuracy: userStats.accuracy,
        achievements
      },
      subscription: subscription, // Pass subscription details to the template
      error: null
    });
  } catch (err) {
    console.error('Error loading profile:', err);
    res.render('profile', { error: 'Error loading profile' });
  }
});

// Update Profile
router.post('/update-profile', ensureAuthenticated, profileLimiter, async (req, res) => {
  try {
    const { username, englishLevel, learningGoals } = req.body;
    
    await db.query(`
      UPDATE users SET 
      username = $1, 
      englishLevel = $2, 
      learningGoals = $3 
      WHERE id = $4
    `, [username, englishLevel, learningGoals, req.user.id]);

    // Invalidate user cache after update
    invalidateUserStatsCache(req.user.id);

    const updatedUserResult = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const updatedUser = updatedUserResult.rows[0];

    req.login(updatedUser, (err) => {
      if (err) throw err;
      res.redirect('/profile');
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.render('profile', { error: 'Update failed' });
  }
});

// Delete Account
router.post('/delete-account', ensureAuthenticated, async (req, res) => {
  try {
    // Delete in proper order to handle foreign key constraints
    await db.query('DELETE FROM messages WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM vocabulary WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM feedback WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM payment_history WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM subscriptions WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM tests_taken WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM pronunciation_practice WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM study_reminders WHERE userId = $1', [req.user.id]);
    await db.query('DELETE FROM study_goals WHERE userId = $1', [req.user.id]);
    
    // Finally delete the user
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    
    // Invalidate user cache after deletion
    invalidateUserStatsCache(req.user.id);
    
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.render('profile', { error: 'Delete failed' });
      }
      res.redirect('/');
    });
  } catch (err) {
    console.error('Error deleting account:', err);
    res.render('profile', { error: 'Delete failed' });
  }
});

module.exports = router;
