// Crea un nuevo archivo: scripts/simple-livechat.js
// Este es un manejador más simple y directo

const { generateAIResponse } = require("../src/ai");

module.exports = function (robot) {
  // Estado simple para cada sala
  const roomStates = {};

  // Detectar si un usuario es agente
  function isAgent(userName) {
    return (
      userName &&
      (userName.startsWith("agent.") ||
        userName === "agent.linder" ||
        userName.includes("support") ||
        userName.includes("agente"))
    );
  }

  // Manejar TODOS los mensajes en Livechat
  robot.hear(/.*/, async function (res) {
    const message = res.message;
    const isLivechat = message.user && message.user.roomType === "l";

    // Solo procesar Livechat
    if (!isLivechat) return;

    const roomId = message.room;
    const userName = message.user.name;
    const userText = message.text;

    console.log(`[LIVECHAT] ${userName}: "${userText}"`);

    // Ignorar mensajes del bot
    if (userName === "hubot" || userName.includes("bot")) {
      return;
    }

    // Inicializar estado de la sala si no existe
    if (!roomStates[roomId]) {
      roomStates[roomId] = {
        agentActive: false,
        lastActivity: Date.now(),
      };
    }

    // Si detectamos un agente
    if (isAgent(userName)) {
      console.log(`[AGENTE DETECTADO] ${userName}`);
      roomStates[roomId].agentActive = true;
      roomStates[roomId].lastActivity = Date.now();

      // Si el agente dice "bot activo" o similar, reactivar bot
      if (userText.match(/bot activo|reactivar bot|activar bot/i)) {
        roomStates[roomId].agentActive = false;
        res.send("✅ Bot reactivado");
      }

      return; // No responder cuando hay agente activo
    }

    // Si hay un agente activo, no responder
    if (roomStates[roomId].agentActive) {
      console.log(`[BOT SILENCIADO] Agente activo en sala ${roomId}`);

      // Verificar timeout (15 minutos)
      if (Date.now() - roomStates[roomId].lastActivity > 15 * 60 * 1000) {
        roomStates[roomId].agentActive = false;
        console.log(`[TIMEOUT] Reactivando bot en sala ${roomId}`);
      } else {
        return; // No responder
      }
    }

    // Comandos especiales
    if (userText.match(/^(quien soy|estado|status)$/i)) {
      const info = `Usuario: ${userName}\nSala: ${roomId}\nAgente activo: ${
        roomStates[roomId].agentActive ? "Sí" : "No"
      }`;
      return res.send(info);
    }

    // Responder con AI solo a mensajes sustanciales
    if (userText.length > 5 && !userText.match(/^(si|no|ok|gracias)$/i)) {
      try {
        console.log(`[AI] Generando respuesta para: "${userText}"`);

        res.send("🤔 Un momento...");

        const response = await generateAIResponse(
          userText,
          "Eres un asistente de soporte amigable. Responde en español de forma concisa."
        );

        res.send(response);
      } catch (error) {
        console.error("[ERROR AI]", error);
        res.send("Disculpa, tuve un problema. ¿Puedes reformular tu pregunta?");
      }
    }
  });

  console.log("✅ Simple Livechat Handler cargado");
};
