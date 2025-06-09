// src/ai.js - Servicio AI optimizado con cache y rate limiting
"use strict";

const OpenAI = require("openai");
const { config } = require("./config");

class AIService {
  constructor() {
    this.client = new OpenAI({
      baseURL: config.ai.baseURL,
      apiKey: config.ai.apiKey,
    });

    this.cache = new Map();
    this.rateLimiter = new Map(); // Rate limiting por usuario

    // Cleanup cache periodically
    setInterval(() => this.cleanupCache(), config.cache.cleanupInterval);
  }

  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > config.cache.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[AI] Cleaned ${cleaned} expired cache entries`);
    }
  }

  async generateResponse(userMessage, systemPrompt = null, userId = null) {
    try {
      // Rate limiting check
      if (userId && this.isRateLimited(userId)) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      }

      // Generate cache key
      const cacheKey = this.generateCacheKey(userMessage, systemPrompt);

      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < config.cache.ttl) {
          console.log("[AI] Cache hit");
          return cached.response;
        }
      }

      // Default prompts based on context
      const prompt = systemPrompt || this.getDefaultPrompt();

      // Make API call
      const response = await this.client.chat.completions.create({
        model: config.ai.model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: config.ai.maxTokens,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0].message.content;

      // Cache the response
      this.cache.set(cacheKey, {
        response: aiResponse,
        timestamp: Date.now(),
      });

      // Update rate limiter
      if (userId) {
        this.updateRateLimit(userId);
      }

      return aiResponse;
    } catch (error) {
      console.error("[AI] Error generating response:", error.message);

      if (error.message.includes("Rate limit")) {
        return "Por favor espera un momento antes de hacer otra consulta.";
      }

      if (error.message.includes("API key")) {
        return "Error de configuración del servicio. Contacta al administrador.";
      }

      return "Lo siento, tuve un problema al procesar tu solicitud. Intenta de nuevo.";
    }
  }

  generateCacheKey(message, prompt) {
    const normalizedMessage = message.toLowerCase().trim();
    const promptHash = prompt ? prompt.substring(0, 50) : "default";
    return `${normalizedMessage}:${promptHash}`;
  }

  getDefaultPrompt() {
    return (
      "Eres un asistente virtual amigable, profesional y conciso. " +
      "Responde en español de manera útil y empática."
    );
  }

  getLivechatPrompt() {
    return (
      "Eres un asistente de atención al cliente profesional y empático. " +
      "Tu objetivo es ayudar a resolver consultas de manera eficiente. " +
      "Si no puedes resolver algo, indica que un agente humano puede ayudar. " +
      "Responde en español de forma concisa pero completa."
    );
  }

  getDocumentPrompt(context) {
    return (
      `Eres un asistente que responde preguntas basándose en la siguiente información:\n\n${context}\n\n` +
      "Responde de manera precisa basándote únicamente en la información proporcionada. " +
      "Si la información no contiene la respuesta, indícalo claramente."
    );
  }

  isRateLimited(userId) {
    const now = Date.now();
    const userLimits = this.rateLimiter.get(userId);

    if (!userLimits) return false;

    // Allow 10 requests per minute
    const oneMinute = 60 * 1000;
    const recentRequests = userLimits.filter((time) => now - time < oneMinute);

    return recentRequests.length >= 10;
  }

  updateRateLimit(userId) {
    const now = Date.now();
    const userLimits = this.rateLimiter.get(userId) || [];

    // Keep only recent requests
    const oneMinute = 60 * 1000;
    const recentRequests = userLimits.filter((time) => now - time < oneMinute);
    recentRequests.push(now);

    this.rateLimiter.set(userId, recentRequests);
  }

  // Convenience methods
  async generateLivechatResponse(message, userId = null) {
    return this.generateResponse(message, this.getLivechatPrompt(), userId);
  }

  async generateDocumentResponse(message, context, userId = null) {
    return this.generateResponse(
      message,
      this.getDocumentPrompt(context),
      userId
    );
  }

  // Health check
  async healthCheck() {
    try {
      const response = await this.generateResponse("test", 'Respond with "OK"');
      return response.toLowerCase().includes("ok");
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const aiService = new AIService();

// Legacy compatibility
const generateAIResponse = (message, prompt, userId) => {
  return aiService.generateResponse(message, prompt, userId);
};

module.exports = {
  AIService,
  aiService,
  generateAIResponse, // For backward compatibility
};
