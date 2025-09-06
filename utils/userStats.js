const db = require('../db');
const CacheService = require('../services/cacheService');

// Calculate the current daily streak based on distinct message dates.
async function getCurrentStreak(userId) {
  // Try to get from cache first
  const cacheKey = `streak_${userId}`;
  const cachedStreak = CacheService.getUserStats(userId);
  if (cachedStreak && cachedStreak.streak !== undefined) {
    return cachedStreak.streak;
  }

  // Optimized query with proper indexing
  const result = await db.query(`
    SELECT DATE(timestamp) as date
    FROM messages
    WHERE userId = $1
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
    LIMIT 30
  `, [userId]);

  const rows = result.rows;
  if (!rows.length) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  if (rows[0].date !== todayStr) return 0;

  let streak = 1;
  let prevDate = new Date(rows[0].date);
  for (let i = 1; i < rows.length; i++) {
    let currentRowDate = new Date(rows[i].date);
    const diffDays = (prevDate - currentRowDate) / (1000 * 3600 * 24);
    if (diffDays === 1) {
      streak++;
      prevDate = currentRowDate;
    } else {
      break;
    }
  }
  return streak;
}

// Calculate total study hours (here, each vocab word counts as 0.2 hours).
async function getTotalStudyHours(userId) {
  // Try to get from cache first
  const cachedStats = CacheService.getUserStats(userId);
  if (cachedStats && cachedStats.totalHours !== undefined) {
    return cachedStats.totalHours;
  }

  // Optimized query with proper indexing
  const result = await db.query('SELECT COUNT(*) as count FROM vocabulary WHERE userId = $1', [userId]);
  return parseFloat((result.rows[0].count * 0.2).toFixed(1));
}

// Calculate accuracy by averaging correct answers on vocabulary words,
// assuming 5 correct answers equals mastery (100%).
async function calculateAccuracy(userId) {
  // Try to get from cache first
  const cachedStats = CacheService.getUserStats(userId);
  if (cachedStats && cachedStats.accuracy !== undefined) {
    return cachedStats.accuracy;
  }

  // Optimized query with proper indexing
  const result = await db.query('SELECT correctCount FROM vocabulary WHERE userId = $1', [userId]);
  const rows = result.rows;
  
  if (!rows.length) return 0;
  let total = 0;
  rows.forEach(row => {
    total += Math.min(row.correctcount, 5); // Note: PostgreSQL returns lowercase column names
  });
  const accuracy = (total / (rows.length * 5)) * 100;
  return Math.floor(accuracy);
}

// Determine achievements based on milestones.
// This function returns only the achievements the user has obtained.
async function getAchievements(userId) {
  // Try to get from cache first
  const cachedStats = CacheService.getUserStats(userId);
  if (cachedStats && cachedStats.achievements !== undefined) {
    return cachedStats.achievements;
  }

  const achievements = [];
  const vocabCountResult = await db.query('SELECT COUNT(*) as count FROM vocabulary WHERE userId = $1', [userId]);
  const vocabCount = vocabCountResult.rows[0].count;
  const streak = await getCurrentStreak(userId);
  const totalHours = await getTotalStudyHours(userId);
  const accuracy = await calculateAccuracy(userId);

  if (vocabCount >= 50) achievements.push({ emoji: '📚', name: 'Bookworm' });
  if (streak >= 5) achievements.push({ emoji: '🔥', name: '5 Day Streak' });
  if (accuracy >= 90) achievements.push({ emoji: '🎯', name: 'Accuracy Master' });
  if (totalHours >= 20) achievements.push({ emoji: '💡', name: 'Quick Learner' });

  return achievements;
}

// Get all user stats in one optimized function
async function getAllUserStats(userId) {
  // Try to get from cache first
  const cachedStats = CacheService.getUserStats(userId);
  if (cachedStats) {
    return cachedStats;
  }

  // Calculate all stats in one go
  const vocabCountResult = await db.query('SELECT COUNT(*) as count FROM vocabulary WHERE userId = $1', [userId]);
  const learnedCountResult = await db.query('SELECT COUNT(*) as count FROM vocabulary WHERE userId = $1 AND correctCount >= 5', [userId]);
  
  const stats = {
    streak: await getCurrentStreak(userId),
    totalHours: await getTotalStudyHours(userId),
    accuracy: await calculateAccuracy(userId),
    achievements: await getAchievements(userId),
    vocabCount: parseInt(vocabCountResult.rows[0].count),
    learnedCount: parseInt(learnedCountResult.rows[0].count)
  };

  // Cache the results
  CacheService.setUserStats(userId, stats);
  return stats;
}

// Invalidate user stats cache when data changes
function invalidateUserStatsCache(userId) {
  CacheService.invalidateUserCache(userId);
}

module.exports = {
  getCurrentStreak,
  getTotalStudyHours,
  calculateAccuracy,
  getAchievements,
  getAllUserStats,
  invalidateUserStatsCache
};
