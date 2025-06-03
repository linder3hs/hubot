"use strict";

const OpenAI = require("openai");

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-da937a8a5a2c4aea948dfca4d97d9a3f",
});

const defaultPrompt = "Eres un asistente virtual amable, conciso y preciso.";

const generateAIResponse = async (
  userMessage,
  systemPrompt = defaultPrompt
) => {
  try {
    const { choices } = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return choices[0].message.content;
  } catch (e) {
    console.error("AI error:", e);
    return "Lo siento, tuve un problema al procesar tu solicitud.";
  }
};

module.exports = { generateAIResponse };
