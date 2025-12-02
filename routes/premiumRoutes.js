const express = require('express');
const router = express.Router();
const db = require('../db');
const { ensurePremium } = require('../middlewares/premiumAccess');
const { getAllUserStats } = require('../utils/userStats');
const CacheService = require('../services/cacheService');

// Apply premium middleware to all routes (Temporarily disabled for crossword testing)
// router.use(ensurePremium);



// Premium Vocabulary Export
router.get('/vocab/export', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const vocabularyResult = await db.query(`
      SELECT word, definition, dateAdded, correctCount
      FROM vocabulary 
      WHERE userId = $1 
      ORDER BY dateAdded DESC
    `, [userId]);
    const vocabulary = vocabularyResult.rows;
    
    // Create CSV content
    const csvContent = [
      'Word,Definition,Date Added,Mastery Level',
      ...vocabulary.map(v => 
        `"${v.word}","${v.definition}","${v.dateadded}","${v.correctcount >= 5 ? 'Mastered' : v.correctcount > 0 ? 'Learning' : 'New'}"`
      )
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="snowwords-vocabulary.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export vocabulary' });
  }
});

// Premium Study Reminders
router.post('/reminders', async (req, res) => {
  try {
    const userId = req.user.id;
    const { time, frequency, enabled } = req.body;
    
    // Save reminder preferences (PostgreSQL UPSERT)
    await db.query(`
      INSERT INTO study_reminders (userId, time, frequency, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (userId) 
      DO UPDATE SET 
        time = EXCLUDED.time,
        frequency = EXCLUDED.frequency,
        enabled = EXCLUDED.enabled,
        dateCreated = CURRENT_TIMESTAMP
    `, [userId, time, frequency, enabled]);
    
    res.json({ success: true, message: 'Reminder settings saved' });
  } catch (error) {
    console.error('Reminder error:', error);
    res.status(500).json({ error: 'Failed to save reminder settings' });
  }
});

// Premium Study Goals
router.post('/goals', async (req, res) => {
  try {
    const userId = req.user.id;
    const { dailyWords, weeklyHours, targetDate } = req.body;
    
    // Save study goals (PostgreSQL UPSERT)
    await db.query(`
      INSERT INTO study_goals (userId, dailyWords, weeklyHours, targetDate)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (userId) 
      DO UPDATE SET 
        dailyWords = EXCLUDED.dailyWords,
        weeklyHours = EXCLUDED.weeklyHours,
        targetDate = EXCLUDED.targetDate,
        dateCreated = CURRENT_TIMESTAMP
    `, [userId, dailyWords, weeklyHours, targetDate]);
    
    res.json({ success: true, message: 'Study goals saved' });
  } catch (error) {
    console.error('Goals error:', error);
    res.status(500).json({ error: 'Failed to save study goals' });
  }
});

// Crossword Puzzle Generation (Free: 1/day, Premium: unlimited)
router.post('/crossword/generate', async (req, res) => {
  try {
    const userId = req.user.id;
    const isPremium = req.user.subscriptionStatus === 'premium';
    console.log('Generating crossword for user:', userId, 'Premium:', isPremium);

    // Check daily limit for free users
    if (!isPremium) {
      const userResult = await db.query(
        'SELECT "lastCrosswordDate" FROM users WHERE id = $1',
        [userId]
      );

      const lastCrosswordDate = userResult.rows[0]?.lastCrosswordDate;
      const today = new Date().toDateString();

      if (lastCrosswordDate && new Date(lastCrosswordDate).toDateString() === today) {
        return res.status(429).json({
          error: 'Daily crossword limit reached. Premium users get unlimited crosswords!',
          limitReached: true
        });
      }
    }

    // Get user's vocabulary words
    const vocabResult = await db.query(`
      SELECT word, definition
      FROM vocabulary
      WHERE userId = $1
      AND LENGTH(word) >= 3
      ORDER BY RANDOM()
      LIMIT 15
    `, [userId]);

    console.log('Retrieved vocabulary count:', vocabResult.rows.length);

    if (vocabResult.rows.length < 5) {
      return res.status(400).json({
        error: 'You need at least 5 words in your vocabulary to generate a crossword puzzle'
      });
    }

    const words = vocabResult.rows;
    console.log('Generating crossword with words:', words.map(w => w.word));

    const crossword = generateCrossword(words);
    console.log('Crossword generated successfully');

    // Update last crossword date for free users
    if (!isPremium) {
      await db.query(
        'UPDATE users SET "lastCrosswordDate" = NOW() WHERE id = $1',
        [userId]
      );
    }

    res.json(crossword);
  } catch (error) {
    console.error('Crossword generation error:', error);
    res.status(500).json({ error: 'Failed to generate crossword puzzle' });
  }
});



// Helper function to generate crossword puzzle
function generateCrossword(words) {
  try {
    const size = 15; // 15x15 grid
    const grid = Array(size).fill().map(() => Array(size).fill(''));
    const placedWords = [];
    const clues = { across: [], down: [] };
    let clueNumber = 1;
    
    console.log('Starting crossword generation with', words.length, 'words');
    
    // Sort words by length (longest first) for better placement
    words.sort((a, b) => b.word.length - a.word.length);
    
    // Place first word in the center
    const firstWord = words[0];
    const startRow = Math.floor(size / 2);
    const startCol = Math.floor((size - firstWord.word.length) / 2);
    
    console.log('Placing first word:', firstWord.word, 'at', startRow, startCol);
    
    placeWord(grid, firstWord, startRow, startCol, 'across', clueNumber);
    placedWords.push({
      word: firstWord.word,
      row: startRow,
      col: startCol,
      direction: 'across',
      number: clueNumber
    });
    
    clues.across.push({
      number: clueNumber,
      clue: firstWord.definition,
      answer: firstWord.word.toUpperCase()
    });
    clueNumber++;
    
    // Try to place remaining words
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const placed = tryPlaceWord(grid, word, placedWords, clueNumber);
      
      if (placed) {
        placedWords.push(placed);
        if (placed.direction === 'across') {
          clues.across.push({
            number: placed.number,
            clue: word.definition,
            answer: word.word.toUpperCase()
          });
        } else {
          clues.down.push({
            number: placed.number,
            clue: word.definition,
            answer: word.word.toUpperCase()
          });
        }
        clueNumber++;
      }
    }
    
    console.log('Placed', placedWords.length, 'words out of', words.length);
    
    // Fill empty cells with black squares
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (grid[row][col] === '') {
          grid[row][col] = '#';
        }
      }
    }
    
    // Add numbers to cells
    const numberedGrid = addNumbers(grid, placedWords);
    
    console.log('Crossword generation completed successfully');
    
    return {
      size,
      grid: numberedGrid,
      clues,
      placedWords
    };
  } catch (error) {
    console.error('Error in generateCrossword function:', error);
    throw error;
  }
}

function placeWord(grid, word, row, col, direction, number) {
  const wordUpper = word.word.toUpperCase();
  
  for (let i = 0; i < wordUpper.length; i++) {
    if (direction === 'across') {
      grid[row][col + i] = wordUpper[i];
    } else {
      grid[row + i][col] = wordUpper[i];
    }
  }
}

function tryPlaceWord(grid, word, placedWords, number) {
  const wordUpper = word.word.toUpperCase();
  
  for (const placed of placedWords) {
    // Try to intersect with each placed word
    for (let i = 0; i < wordUpper.length; i++) {
      for (let j = 0; j < placed.word.length; j++) {
        if (wordUpper[i] === placed.word[j]) {
          // Try placing across
          const acrossResult = tryIntersection(grid, wordUpper, placed, i, j, 'across', number);
          if (acrossResult) return acrossResult;
          
          // Try placing down
          const downResult = tryIntersection(grid, wordUpper, placed, i, j, 'down', number);
          if (downResult) return downResult;
        }
      }
    }
  }
  
  return null;
}

function tryIntersection(grid, word, placed, wordIndex, placedIndex, direction, number) {
  const size = grid.length;
  
  // Calculate position for new word
  let newRow, newCol;
  if (direction === 'across') {
    newRow = placed.row + placedIndex;
    newCol = placed.col - wordIndex;
  } else {
    newRow = placed.row - wordIndex;
    newCol = placed.col + placedIndex;
  }
  
  // Check if placement is valid
  if (isValidPlacement(grid, word, newRow, newCol, direction)) {
    placeWord(grid, { word }, newRow, newCol, direction, number);
    return {
      word,
      row: newRow,
      col: newCol,
      direction,
      number
    };
  }
  
  return null;
}

function isValidPlacement(grid, word, row, col, direction) {
  const size = grid.length;
  
  // Check bounds
  if (direction === 'across') {
    if (col < 0 || col + word.length > size || row < 0 || row >= size) {
      return false;
    }
  } else {
    if (row < 0 || row + word.length > size || col < 0 || col >= size) {
      return false;
    }
  }
  
  // Check for conflicts
  for (let i = 0; i < word.length; i++) {
    let cellRow = row, cellCol = col;
    if (direction === 'across') {
      cellCol = col + i;
    } else {
      cellRow = row + i;
    }
    
    const currentCell = grid[cellRow][cellCol];
    if (currentCell !== '' && currentCell !== word[i]) {
      return false;
    }
    
    // Check adjacent cells (no words should be adjacent except at intersection)
    const adjacent = getAdjacentCells(grid, cellRow, cellCol);
    for (const adj of adjacent) {
      if (adj !== '' && adj !== '#' && !word.includes(adj)) {
        return false;
      }
    }
  }
  
  return true;
}

function getAdjacentCells(grid, row, col) {
  const adjacent = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow >= 0 && newRow < grid.length && newCol >= 0 && newCol < grid[0].length) {
      adjacent.push(grid[newRow][newCol]);
    }
  }
  
  return adjacent;
}

function addNumbers(grid, placedWords) {
  const numberedGrid = grid.map(row => row.map(cell => ({ value: cell })));
  const usedNumbers = new Set();
  
  for (const placed of placedWords) {
    const number = placed.number;
    const row = placed.row;
    const col = placed.col;
    
    // Ensure row and col are valid
    if (row === undefined || col === undefined || row < 0 || col < 0 || 
        row >= numberedGrid.length || col >= numberedGrid[0].length) {
      continue;
    }
    
    if (!usedNumbers.has(number)) {
      numberedGrid[row][col].number = number;
      numberedGrid[row][col].across = placed.direction === 'across' ? number : null;
      numberedGrid[row][col].down = placed.direction === 'down' ? number : null;
      usedNumbers.add(number);
    } else {
      // Add direction info to existing number
      if (placed.direction === 'across') {
        numberedGrid[row][col].across = number;
      } else {
        numberedGrid[row][col].down = number;
      }
    }
  }
  
  return numberedGrid;
}

module.exports = router;
