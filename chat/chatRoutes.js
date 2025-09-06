// chatRoutes.js

const express = require('express');
const router = express.Router();
const { sendToGemini } = require('./geminiClient'); // AI call
const db = require('../db'); 
const { addUserMessage, addAiMessage, getConversation } = require('./conversationManager');
const { checkMessageLimit } = require('../middlewares/premiumAccess');
const { chatLimiter } = require('../middlewares/rateLimiter');
const CacheService = require('../services/cacheService');

// Apply rate limiting and message limit middleware to the chat endpoint
router.post('/', chatLimiter, checkMessageLimit, async (req, res) => {
  try {
    const sessionId = req.session.id;
    const userId = req.user.id;
    let userMessage = req.body.message || '';
    
    // Sanitize input: trim, remove dangerous chars, limit length
    userMessage = userMessage.trim().replace(/[<>]/g, '').slice(0, 500);

    addUserMessage(sessionId, userMessage);
    
    // Insert user message into database
    await db.query(`
      INSERT INTO messages (userId, role, content, timestamp)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [userId, 'user', userMessage]);

    const conversation = getConversation(sessionId);
    const conversationText = conversation
      .map(msg =>
        (msg.role === 'user')
          ? `User: ${msg.content}`
          : `Assistant: ${msg.content}`
      )
      .join('\n');

    const userEnglishLevel = req.user?.englishlevel || 'Intermediate'; // Note: lowercase column name

    // Simplified system prompt without reinforcement for debugging
    let systemContent = '';
    if (userEnglishLevel === 'Beginner') {
      systemContent = `
        You are a friendly, patient AI teacher. 
        The user has a BEGINNER level of English.
        Use very simple words and short sentences. Provide basic explanations.
        Keep it casual and encouraging.
        Please not include "*" symbols in the response.
      `;
    } else if (userEnglishLevel === 'Intermediate') {
      systemContent = `
        You are a friendly AI assistant. 
        The user has an INTERMEDIATE level of English.
        Use moderately simple explanations and vocabulary, fairly casual.
        Please not include "*" symbols in the response.
      `;
    } else {
      systemContent = `
        You are a friendly AI assistant. 
        The user has an ADVANCED level of English.
        Feel free to use more complex vocabulary and nuanced explanations, remain natural.
        Please not include "*" symbols in the response.
      `;
    }

    const finalPrompt = `${systemContent.trim()}\n\n${conversationText}\nUser: ${userMessage}`;
    
    // Check cache for AI response
    let aiReply = CacheService.getAIResponse(finalPrompt);
    
    if (!aiReply) {
      console.log('AI call for prompt:', finalPrompt.substring(0, 100) + '...');
      aiReply = await sendToGemini(finalPrompt);
      console.log('AI Reply:', aiReply);
      
      // Cache the AI response
      CacheService.setAIResponse(finalPrompt, aiReply);
    } else {
      console.log('Using cached AI response');
    }

    addAiMessage(sessionId, aiReply);
    
    // Insert AI message into database
    await db.query(`
      INSERT INTO messages (userId, role, content, timestamp)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [userId, 'assistant', aiReply]);

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('Chat route error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error retrieving AI response';
    if (error.message.includes('rate limit')) {
      errorMessage = 'AI service is busy. Please try again in a moment.';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

// Add a route to get user's message usage for today
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Get current day's message count
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE userId = $1 AND DATE(timestamp) = $2 AND role = 'user'
    `, [userId, today]);
    
    const messageCount = parseInt(result.rows[0].count);
    
    // Get premium status (note: lowercase column name)
    const isPremium = req.user.subscriptionstatus === 'premium';
    
    res.json({
      success: true,
      count: messageCount,
      limit: isPremium ? null : 20, // null means unlimited
      isPremium
    });
  } catch (error) {
    console.error('Error getting usage:', error);
    res.status(500).json({ error: 'Failed to get usage data' });
  }
});

module.exports = router;
