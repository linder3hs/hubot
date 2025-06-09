// scripts/livechat-simple-fix.js - Solución temporal y simple
"use strict";

const { aiService } = require("../src/ai");

module.exports = (robot) => {
  console.log("🚀 Simple Livechat Fix loaded");

  // Handler MUY simple para Livechat
  robot.hear(/.*/, async (res) => {
    const { user, text, room } = res.message;

    // Solo procesar Livechat
    if (user?.roomType !== "l") return;

    // Ignorar mensajes del bot
    if (user.name === "hubot" || user.name.includes("bot")) return;

    console.log(`[LIVECHAT SIMPLE] ${user.name}: "${text}"`);

    // Lista manual de agentes (modifica según necesites)
    const agentNames = [
      "agent.linder",
      "agente.soporte",
      "linder3hs",
      "admin",
    ];

    // Si es un agente conocido, no responder automáticamente
    if (agentNames.includes(user.name)) {
      console.log(`[AGENT DETECTED] ${user.name} - Bot staying silent`);
      return;
    }

    // Responder solo a mensajes sustanciales
    if (text && text.length > 3 && !text.match(/^(si|no|ok|hola)$/i)) {
      try {
        console.log(`[GENERATING RESPONSE] for: "${text}"`);

        // Indicador de procesamiento
        res.send("🤔 Un momento...");

        // Generar respuesta
        const response = await aiService.generateLivechatResponse(text);

        console.log(`[RESPONSE SENT] ${response.substring(0, 50)}...`);
        res.send(response);
      } catch (error) {
        console.error("[LIVECHAT ERROR]", error);
        res.send("Disculpa, tuve un problema. ¿Puedes reformular tu pregunta?");
      }
    } else if (text?.toLowerCase().includes("hola")) {
      // Respuesta simple a saludos
      res.send("¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte?");
    }
  });

  // Comando de test
  robot.respond(/test livechat$/i, (res) => {
    const isLivechat = res.message.user?.roomType === "l";
    res.send(`🧪 Test: ${isLivechat ? "LIVECHAT ✅" : "NOT LIVECHAT ❌"}`);
  });

  console.log("✅ Simple Livechat Fix ready");
};
