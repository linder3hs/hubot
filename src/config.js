require("dotenv").config();

const config = {
  // Rocket.Chat
  rocketchat: {
    url: process.env.ROCKETCHAT_URL,
    user: process.env.ROCKETCHAT_USER,
    password: process.env.ROCKETCHAT_PASSWORD,
    room: process.env.ROCKETCHAT_ROOM,
    integrationId: process.env.ROCKETCHAT_INTEGRATION_ID || "hubot",
    botName: process.env.ROCKETCHAT_BOT_NAME || "hubot",
    livechatEnabled: true,
    respondToDM: process.env.RESPOND_TO_DM || false,
    respondToEdited: process.env.RESPOND_TO_EDITED || false,
  },

  // Hubot
  hubot: {
    port: process.env.PORT || 3001,
    logLevel: process.env.HUBOT_LOG_LEVEL || "info",
    name: process.env.HUBOT_NAME || "hubot",
  },

  // AI Configuration
  ai: {
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: "deepseek-chat",
    maxTokens: process.env.AI_MAX_TOKENS || 1000,
  },

  // Livechat Handoff System
  handoff: {
    agentTimeout: 15 * 60 * 1000, // 15 minutes
    botSilenceTime: 3 * 60 * 1000, // 3 minutes
    maxUserConsecutiveMessages: 3,
    escalationKeywords: [
      "problema técnico",
      "no funciona",
      "error",
      "falla",
      "bug",
      "reclamo",
      "queja",
      "cancelar",
      "reembolso",
      "supervisor",
      "gerente",
      "urgente",
      "crítico",
      "hablar con persona",
      "agente humano",
      "representante",
    ],
    agentUsernames: [
      "linder3hs",
      "agent.linder",
    ],
    agentRoles: ["livechat-agent", "livechat-monitor", "admin"],
  },

  cache: {
    ttl: 30 * 60 * 1000,
    cleanupInterval: 15 * 60 * 1000,
  },

  documents: {
    maxChunkSize: 1000,
    supportedFormats: [".txt", ".md", ".json"],
  },
};

function validateConfig() {
  const required = [
    "ROCKETCHAT_URL",
    "ROCKETCHAT_USER",
    "ROCKETCHAT_PASSWORD",
    "DEEPSEEK_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

module.exports = { config, validateConfig };
