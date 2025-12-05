// vocabRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../db');  // PostgreSQL connection
const { sendToGemini } = require('./geminiClient'); // AI call
const { vocabLimiter } = require('../middlewares/rateLimiter');
const CacheService = require('../services/cacheService');
const { invalidateUserStatsCache } = require('../utils/userStats');

// If you have a "vocabulary" table with columns: id, userId, word, definition
// (Add 'example' column if you want to store example as well.)

/**
 * Helper to parse "Definition:" from AI text (one-liner).
 * Example approach: "Definition: ..." => capture text after "Definition:"
 */
function parseAiDefinition(aiText) {
  let definition = 'No definition found.';
  const match = aiText.match(/definition:\s*(.*)/i);
  if (match && match[1]) {
    definition = match[1].trim();
  } else {
    // Fallback, or just use entire aiText
    definition = aiText.trim();
  }
  return definition;
}

/**
 * Helper to parse "Example:" from AI text (one-liner).
 */
function parseAiExample(aiText) {
  let example = 'No example provided.';
  const match = aiText.match(/example:\s*(.*)/i);
  if (match && match[1]) {
    example = match[1].trim();
  } else {
    example = aiText.trim();
  }
  return example;
}

/**
 * POST /api/vocab/aiLookup
 * Two-scenario approach:
 *    - If word is new => 2 separate AI calls (1 for definition, 1 for example)
 *    - If word is existing => 1 AI call (new example), use DB definition
 */
router.post('/aiLookup', vocabLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    let { word } = req.body;
    // Sanitize input: trim, remove dangerous chars, limit length
    word = (word || '').trim().replace(/[<>]/g, '').slice(0, 50);

    if (!word) {
      return res.status(400).json({ error: 'No word provided.' });
    }

    // Check cache for word definition first
    let cachedDefinition = CacheService.getWordDefinition(word);
    
    // 1) Check if word is in DB
    const checkResult = await db.query(`
      SELECT * FROM vocabulary
      WHERE userid = $1 AND LOWER(word) = LOWER($2)
    `, [userId, word]);
    
    const existing = checkResult.rows[0];

    let finalDefinition = '';
    let finalExample = '';
    let note = '';

    if (!existing) {
      // --------------------------
      // New Word => 2 AI calls
      // --------------------------
      // (A) Prompt for definition only
      const defPrompt = `
        You are a helpful AI. The user wants to learn a new English word: "${word}".
        Please respond EXACTLY with one line:
        "Definition: <short definition>"
      `;
      
      // Check cache for AI response
      let defReply = CacheService.getAIResponse(defPrompt);
      if (!defReply) {
        defReply = await sendToGemini(defPrompt);
        CacheService.setAIResponse(defPrompt, defReply);
      }
      
      const definition = parseAiDefinition(defReply);

      // Store definition in DB
      await db.query(`
        INSERT INTO vocabulary (userid, word, definition)
        VALUES ($1, $2, $3)
      `, [userId, word, definition]);

      // Invalidate user cache since vocabulary changed
      invalidateUserStatsCache(userId);

      finalDefinition = definition;
      note = 'Word added to your Snowball.';

      // (B) Prompt for example only
      const exPrompt = `
        You are a helpful AI. The user learned the word "${word}" with definition:
        "${definition}"
        Please respond EXACTLY with one line:
        "Example: <one example sentence>"
      `;
      
      // Check cache for AI response
      let exReply = CacheService.getAIResponse(exPrompt);
      if (!exReply) {
        exReply = await sendToGemini(exPrompt);
        CacheService.setAIResponse(exPrompt, exReply);
      }
      
      finalExample = parseAiExample(exReply);

    } else {
      // --------------------------
      // Existing Word => 1 AI call (new example)
      // --------------------------
      finalDefinition = existing.definition;

      const exPrompt = `
        You are a helpful AI. The user already knows the definition of "${word}" as:
        "${finalDefinition}"
        Please respond EXACTLY with one line:
        "Example: <one new example sentence>"
      `;
      
      // Check cache for AI response
      let exReply = CacheService.getAIResponse(exPrompt);
      if (!exReply) {
        exReply = await sendToGemini(exPrompt);
        CacheService.setAIResponse(exPrompt, exReply);
      }
      
      finalExample = parseAiExample(exReply);

      note = 'Already in Snowball. Reusing existing definition + generating new example.';
    }

    // Return JSON
    return res.json({
      word,
      definition: finalDefinition,
      example: finalExample,
      note
    });
  } catch (err) {
    console.error('aiLookup error:', err);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to look up word with AI.';
    if (err.message.includes('rate limit')) {
      errorMessage = 'AI service is busy. Please try again in a moment.';
    } else if (err.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    return res.status(500).json({ error: errorMessage });
  }
});

module.exports = router;
