// middlewares/premiumAccess.js
const db = require('../db');

// Constants for feature limits
const FEATURE_LIMITS = {
  FREE: {
    chatLengthPerDay: 40,
    maxTestsPerDay: 2,
    hasAdvancedGames: false,
    hasOfflineMode: false,
    hasPronunciationPractice: false
  }
};

// Middleware to check for premium access
const ensurePremium = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  
  // Check if user has premium status
  if (req.user.subscriptionstatus === 'premium') { // Note: lowercase column name
    return next();
  }
  
  // Not premium, redirect to subscription plans page
  res.redirect('/subscription/plans');
};

// Check message limit
const checkMessageLimit = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Premium users have unlimited messages
  if (req.user.subscriptionstatus === 'premium') { // Note: lowercase column name
    return next();
  }
  
  try {
    // Check today's message count for free users
    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE userId = $1 AND DATE(timestamp) = $2
    `, [req.user.id, today]);
    
    const messageCount = parseInt(result.rows[0].count);
    
    if (messageCount >= FEATURE_LIMITS.FREE.chatLengthPerDay) {
      return res.status(403).json({ 
        error: 'Daily message limit reached', 
        upgradeRequired: true,
        limit: FEATURE_LIMITS.FREE.chatLengthPerDay
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking message limit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Check test limit
const checkTestLimit = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Premium users have unlimited tests
  if (req.user.subscriptionstatus === 'premium') { // Note: lowercase column name
    return next();
  }
  
  try {
    // Check today's test count for free users
    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM tests_taken 
      WHERE userId = $1 AND DATE(timestamp) = $2
    `, [req.user.id, today]);
    
    const testCount = parseInt(result.rows[0].count);
    
    if (testCount >= FEATURE_LIMITS.FREE.maxTestsPerDay) {
      return res.status(403).json({ 
        error: 'Daily test limit reached', 
        upgradeRequired: true,
        limit: FEATURE_LIMITS.FREE.maxTestsPerDay
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking test limit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Check access to mini games and activities
const checkGameAccess = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Only premium users can access advanced games
  if (req.user.subscriptionstatus !== 'premium') { // Note: lowercase column name
    return res.status(403).json({ 
      error: 'Premium subscription required for this feature', 
      upgradeRequired: true
    });
  }
  
  next();
};

// Middleware to inject feature access into templates
const injectFeatureAccess = async (req, res, next) => {
  if (req.user) {
    try {
      // Add premiumFeatures to res.locals for use in templates
      res.locals.premiumFeatures = {
        isPremium: req.user.subscriptionstatus === 'premium', // Note: lowercase column name
        hasAdvancedGames: req.user.subscriptionstatus === 'premium',
        hasUnlimitedMessages: req.user.subscriptionstatus === 'premium',
        hasUnlimitedTests: req.user.subscriptionstatus === 'premium',
        hasPronunciationPractice: req.user.subscriptionstatus === 'premium',
        hasOfflineMode: req.user.subscriptionstatus === 'premium',
        
        // Free limits
        messageLimit: FEATURE_LIMITS.FREE.chatLengthPerDay,
        testLimit: FEATURE_LIMITS.FREE.maxTestsPerDay
      };
      
      // Add today's usage counts
      const today = new Date().toISOString().split('T')[0];
      
      // Get message count
      const messageResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE userId = $1 AND DATE(timestamp) = $2
      `, [req.user.id, today]);
      
      // Get test count
      const testResult = await db.query(`
        SELECT COUNT(*) as count 
        FROM tests_taken 
        WHERE userId = $1 AND DATE(timestamp) = $2
      `, [req.user.id, today]);
      
      res.locals.premiumFeatures.messageCount = parseInt(messageResult.rows[0].count);
      res.locals.premiumFeatures.testCount = parseInt(testResult.rows[0]?.count || 0);
      
    } catch (error) {
      console.error('Error injecting feature access:', error);
      // Continue with default values if there's an error
      res.locals.premiumFeatures = {
        isPremium: false,
        hasAdvancedGames: false,
        hasUnlimitedMessages: false,
        hasUnlimitedTests: false,
        hasPronunciationPractice: false,
        hasOfflineMode: false,
        messageLimit: FEATURE_LIMITS.FREE.chatLengthPerDay,
        testLimit: FEATURE_LIMITS.FREE.maxTestsPerDay,
        messageCount: 0,
        testCount: 0
      };
    }
  }
  next();
};

module.exports = {
  ensurePremium,
  checkMessageLimit,
  checkTestLimit,
  checkGameAccess,
  injectFeatureAccess,
  FEATURE_LIMITS
};
