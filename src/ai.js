const OpenAI = require("openai");

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-da937a8a5a2c4aea948dfca4d97d9a3f",
});

/**
 * Generate a response using DeepSeek AI
 * @param {string} userMessage - The message from the user
 * @param {string} systemPrompt - Optional custom system prompt
 * @returns {Promise<string>} The AI-generated response
 */
async function generateAIResponse(userMessage, systemPrompt = "You are a helpful assistant that provides concise and accurate information.") {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      model: "deepseek-chat",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Lo siento, tuve un problema al procesar tu solicitud. Por favor, intenta de nuevo más tarde.";
  }
}

module.exports = {
  generateAIResponse
};
