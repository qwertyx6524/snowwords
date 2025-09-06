// chat/conversationManager.js

const conversations = {};

/**
 * Add a user message to the conversation.
 */
function addUserMessage(sessionId, userContent) {
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }
  conversations[sessionId].push({ role: 'user', content: userContent });
  return conversations[sessionId];
}

/**
 * Add an AI message to the conversation.
 */
function addAiMessage(sessionId, aiContent) {
  if (!conversations[sessionId]) {
    conversations[sessionId] = [];
  }
  conversations[sessionId].push({ role: 'assistant', content: aiContent });
  return conversations[sessionId];
}

/**
 * Retrieve the entire conversation array (user & AI messages).
 */
function getConversation(sessionId) {
  return conversations[sessionId] || [];
}

module.exports = {
  addUserMessage,
  addAiMessage,
  getConversation
};
