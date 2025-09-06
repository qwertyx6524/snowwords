const NodeCache = require('node-cache');

// Create cache instance with 5 minutes default TTL
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Better performance
});

class CacheService {
  // Cache user stats for 10 minutes
  static getUserStatsKey(userId) {
    return `user_stats_${userId}`;
  }

  static getUserStats(userId) {
    return cache.get(this.getUserStatsKey(userId));
  }

  static setUserStats(userId, stats) {
    return cache.set(this.getUserStatsKey(userId), stats, 600); // 10 minutes
  }

  // Cache vocabulary lists for 5 minutes
  static getVocabListKey(userId) {
    return `vocab_list_${userId}`;
  }

  static getVocabList(userId) {
    return cache.get(this.getVocabListKey(userId));
  }

  static setVocabList(userId, vocabList) {
    return cache.set(this.getVocabListKey(userId), vocabList, 300); // 5 minutes
  }

  // Cache AI responses for 1 hour (to avoid repeated expensive API calls)
  static getAIResponseKey(prompt) {
    const hash = require('crypto').createHash('md5').update(prompt).digest('hex');
    return `ai_response_${hash}`;
  }

  static getAIResponse(prompt) {
    return cache.get(this.getAIResponseKey(prompt));
  }

  static setAIResponse(prompt, response) {
    return cache.set(this.getAIResponseKey(prompt), response, 3600); // 1 hour
  }

  // Cache word definitions for 24 hours
  static getWordDefinitionKey(word) {
    return `word_def_${word.toLowerCase()}`;
  }

  static getWordDefinition(word) {
    return cache.get(this.getWordDefinitionKey(word));
  }

  static setWordDefinition(word, definition) {
    return cache.set(this.getWordDefinitionKey(word), definition, 86400); // 24 hours
  }

  // Invalidate user-specific cache when data changes
  static invalidateUserCache(userId) {
    cache.del(this.getUserStatsKey(userId));
    cache.del(this.getVocabListKey(userId));
  }

  // Get cache statistics
  static getStats() {
    return cache.getStats();
  }

  // Clear all cache
  static clearAll() {
    return cache.flushAll();
  }
}

module.exports = CacheService; 