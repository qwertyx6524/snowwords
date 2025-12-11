require('dotenv').config();

const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

async function sendToGemini(message, systemContext = null) {
    try {
        // Build messages array
        const messages = [];

        // Add system context if provided
        if (systemContext) {
            messages.push({
                role: "system",
                content: systemContext
            });
        }

        // Add user message
        messages.push({
            role: "user",
            content: message
        });

        // Call Groq API using llama-3.3-70b-versatile (free and fast)
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1024
        });

        if (!completion.choices || !completion.choices[0]) {
            throw new Error('No response from Groq API');
        }

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Groq API Error Details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            response: error.response
        });

        // Provide more specific error messages
        if (error.message.includes('API key') || error.message.includes('Unauthorized')) {
            throw new Error('Invalid or missing Groq API key. Please check your GROQ_API_KEY environment variable.');
        } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
            throw new Error('Groq API rate limit reached. Please try again in a moment.');
        } else {
            throw new Error(`Groq API error: ${error.message}`);
        }
    }
}

module.exports = { sendToGemini };