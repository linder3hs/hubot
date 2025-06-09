// scripts/commands.js - Sistema de comandos optimizado y unificado
"use strict";

const { aiService } = require("../src/ai");

module.exports = (robot) => {
  // Utility functions
  const random = (array) => array[Math.floor(Math.random() * array.length)];
  const isLivechat = (res) => res.message.user?.roomType === "l";

  // Simple responses
  const responses = {
    greetings: [
      "¡Hola! ¿En qué puedo ayudarte?",
      "¡Hey! Me alegra verte por aquí.",
      "¡Saludos! Estoy listo para asistirte.",
      "¡Qué tal! ¿Cómo va todo?",
    ],
    jokes: [
      "¿Por qué Python no usa corbata? Porque usa bytecode.",
      "¿Cómo organiza una fiesta un programador? Invita a todo el array.",
      "¿Por qué los programadores prefieren el frío? Porque tienen problemas con el calor-syntax.",
      'Un átomo perdió un electrón. Le preguntaron: "¿Estás bien?" Respondió: "No, estoy positivo".',
    ],
    motivations: [
      "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
      "La única manera de hacer un gran trabajo es amar lo que haces.",
      "No importa lo lento que vayas, siempre y cuando no te detengas.",
      "El mejor momento para plantar un árbol era hace 20 años. El segundo mejor momento es ahora.",
    ],
    recommendations: {
      películas: ["Matrix", "Inception", "Interestelar", "El Padrino"],
      libros: ["1984", "El Hobbit", "Cien años de soledad", "El principito"],
      música: ["Pink Floyd", "Queen", "The Beatles", "Radiohead"],
      series: ["Breaking Bad", "Stranger Things", "Black Mirror", "The Office"],
      lenguajes: ["JavaScript", "Python", "Rust", "Go", "TypeScript"],
      comida: ["Sushi", "Pizza", "Tacos", "Curry", "Pasta"],
    },
  };

  // Help command with context-aware content
  robot.respond(/(?:ayuda|help|comandos|commands)$/i, (res) => {
    let helpText = `
**Comandos disponibles:**
• \`hola\` - Saludo personalizado
• \`ping\` - Verificar estado del bot
• \`hora\` - Fecha y hora actual
• \`chiste\` - Chiste aleatorio
• \`motivame\` - Frase motivacional
• \`clima en [ciudad]\` - Información del clima
• \`recomienda [categoría]\` - Recomendaciones
• \`echo [mensaje]\` - Repetir mensaje
• \`pregunta [consulta]\` - Consulta con IA
• \`lanzar moneda\` - Cara o cruz`;

    if (isLivechat(res)) {
      helpText += `

**Comandos para agentes:**
• \`tomar control\` - Agente toma control del chat
• \`devolver bot\` - Reactiva el bot
• \`estado chat\` - Ver estado actual del chat`;
    }

    res.send(helpText.trim());
  });

  // Basic commands
  robot.respond(/(?:hola|hey|saludos|hi|hello)$/i, (res) => {
    res.reply(random(responses.greetings));
  });

  robot.respond(/ping$/i, (res) => {
    const latency = Math.floor(Math.random() * 50) + 10;
    res.send(`🏓 PONG! Latencia: ${latency}ms`);
  });

  robot.respond(/(?:hora|time|fecha|date)$/i, (res) => {
    const now = new Date();
    const formatted = now.toLocaleString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    res.send(`📅 ${formatted}`);
  });

  robot.respond(/(?:chiste|joke|divierteme)$/i, (res) => {
    res.send(`😂 ${random(responses.jokes)}`);
  });

  robot.respond(/(?:motivame|motivación|motivacion|inspire)$/i, (res) => {
    res.send(`✨ ${random(responses.motivations)}`);
  });

  robot.respond(/clima(?: en)?\s+(.+)$/i, (res) => {
    const city = res.match[1].trim();
    const weather = ["soleado", "nublado", "lluvioso", "despejado"][
      Math.floor(Math.random() * 4)
    ];
    const temp = Math.floor(Math.random() * 30) + 10;
    const humidity = Math.floor(Math.random() * 60) + 30;

    res.send(
      `🌦️ Clima en ${city}: ${weather}\n🌡️ ${temp}°C | 💧 ${humidity}% humedad`
    );
  });

  robot.respond(/lanzar moneda|cara o cruz|flip coin$/i, (res) => {
    const result = Math.random() > 0.5 ? "cara" : "cruz";
    res.send(`🪙 Resultado: **${result}**`);
  });

  robot.respond(/recomienda(?:me)?\s+(.+)$/i, (res) => {
    const category = res.match[1].toLowerCase().trim();
    const items = responses.recommendations[category];

    if (items) {
      res.send(`🌟 Te recomiendo: **${random(items)}**`);
    } else {
      const available = Object.keys(responses.recommendations).join(", ");
      res.send(
        `No tengo recomendaciones para "${category}". Prueba con: ${available}`
      );
    }
  });

  robot.respond(/echo\s+(.+)$/i, (res) => {
    res.send(`🔊 ${res.match[1]}`);
  });

  // AI-powered commands
  robot.respond(/(?:pregunta|ai|asistente)\s+(.+)/i, async (res) => {
    const query = res.match[1].trim();
    const userId = res.message.user.id;

    try {
      // Show processing indicator
      res.send("🤔 Procesando tu consulta...");

      // Generate response based on context
      const response = isLivechat(res)
        ? await aiService.generateLivechatResponse(query, userId)
        : await aiService.generateResponse(query, null, userId);

      res.send(response);
    } catch (error) {
      console.error("[COMMAND] AI error:", error);
      res.send(
        "Lo siento, ocurrió un error al procesar tu consulta. Intenta de nuevo."
      );
    }
  });

  // Smart question detection for livechat
  robot.hear(/\?(\s|$)/i, (res) => {
    // Only respond to questions in livechat with low probability
    if (isLivechat(res) && Math.random() < 0.15) {
      const hints = [
        "Esa es una buena pregunta...",
        'Puedes usar el comando "pregunta" para consultas específicas.',
        "¿Necesitas que escalemos esto a un agente humano?",
      ];
      res.send(random(hints));
    }
  });

  // Status command for debugging
  robot.respond(/estado$/i, (res) => {
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cacheSize: aiService.cache.size,
      isLivechat: isLivechat(res),
    };

    res.send(
      `
**Estado del Bot:**
⏱️ Uptime: ${Math.floor(stats.uptime / 60)} minutos
💾 Memoria: ${Math.round(stats.memory.heapUsed / 1024 / 1024)}MB
🧠 Cache: ${stats.cacheSize} entradas
💬 Livechat: ${stats.isLivechat ? "Sí" : "No"}
    `.trim()
    );
  });

  console.log("✅ Command system loaded");
};
