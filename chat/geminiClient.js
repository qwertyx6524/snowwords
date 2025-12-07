require('dotenv').config();

const { GoogleGenAI } = require('@google/genai');

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function sendToGemini(message, systemContext = null) {
    try {
        // If systemContext is provided, prepend it to the message
        let fullMessage = message;
        if (systemContext) {
            fullMessage = `${systemContext}\n\n${message}`;
        }

        // Use the new official API - gemini-2.5-flash is the latest stable model
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullMessage
        });

        if (!response || !response.text) {
            throw new Error('No response from Gemini API');
        }

        return response.text;
    } catch (error) {
        console.error('Gemini API Error Details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            response: error.response
        });

        // Provide more specific error messages
        if (error.message.includes('API key')) {
            throw new Error('Invalid or missing Gemini API key. Please check your GEMINI_API_KEY environment variable.');
        } else if (error.message.includes('quota')) {
            throw new Error('Gemini API quota exceeded. Please try again later.');
        } else if (error.message.includes('model')) {
            throw new Error('Invalid model name or model not accessible.');
        } else {
            throw new Error(`Gemini API error: ${error.message}`);
        }
    }
}

module.exports = { sendToGemini };