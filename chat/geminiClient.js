require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function sendToGemini(message, systemContext) {
    const googleModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: systemContext});
    const result = await googleModel.generateContent(message);
    return result.response.text();
}

module.exports = { sendToGemini };