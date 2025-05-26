// Description:
//   Integrates DeepSeek AI capabilities with Hubot (para canales normales y comandos con prefijo)
//   Para Livechat sin prefijo, usa livechat-ai-handler.js
//
// Commands:
//   hubot pregunta <consulta> - Responde a tu consulta usando DeepSeek AI
//   hubot ai <consulta> - Alias para el comando pregunta
//   hubot asistente <consulta> - Alias para el comando pregunta

const { generateAIResponse } = require("../src/ai");

module.exports = function (robot) {
  // Sistema de caché simple para evitar consultas repetidas
  const responseCache = new Map();
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

  // Función para verificar si el bot puede responder en Livechat
  function canBotRespond(roomId, isLivechat) {
    if (!isLivechat) return true;

    if (global.canBotRespondInLivechat) {
      return global.canBotRespondInLivechat(roomId);
    }

    return true; // Fallback
  }

  // Función para limpiar entradas antiguas del caché
  function cleanupCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of responseCache.entries()) {
      if (now - timestamp > CACHE_TTL) {
        responseCache.delete(key);
      }
    }
  }

  // Programar limpieza del caché cada 15 minutos
  setInterval(cleanupCache, 1000 * 60 * 15);

  // Comando principal para consultas de AI (con prefijo hubot)
  robot.respond(/(?:pregunta|ai|asistente)\s+(.+)/i, async function (res) {
    const query = res.match[1].trim();
    const cacheKey = query.toLowerCase();
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    // Verificar si el bot puede responder en Livechat
    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return; // Bot silenciado por handoff
    }

    // Verificar si la respuesta está en caché
    if (responseCache.has(cacheKey)) {
      const { response, timestamp } = responseCache.get(cacheKey);
      // Verificar si el caché aún es válido
      if (Date.now() - timestamp < CACHE_TTL) {
        return res.send(response);
      }
    }

    // Informar al usuario que estamos procesando su consulta
    res.send("Procesando tu consulta, dame un momento...🤔");

    try {
      // Personalizar el prompt según el contexto
      let systemPrompt;

      if (isLivechat) {
        systemPrompt = `Eres un asistente virtual de atención al cliente muy amigable y profesional. 
        Estás ayudando a un cliente en un chat de soporte en vivo.
        
        Reglas importantes:
        - Mantén un tono amable, profesional y empático
        - Responde de manera concisa pero completa
        - Si no puedes resolver algo técnico complejo, sugiere contactar con un agente especializado
        - Siempre ofrece ayuda adicional al final
        - Responde en español a menos que el cliente escriba en otro idioma`;
      } else {
        systemPrompt =
          "Eres un asistente virtual amigable y profesional. Proporciona respuestas concisas, precisas y útiles. Mantén un tono conversacional y amable.";
      }

      // Generar respuesta usando DeepSeek AI
      const aiResponse = await generateAIResponse(query, systemPrompt);

      // Guardar en caché
      responseCache.set(cacheKey, {
        response: aiResponse,
        timestamp: Date.now(),
      });

      // Enviar respuesta al usuario
      res.send(aiResponse);

      // Log para debugging
      if (isLivechat) {
        console.log(
          `AI Response (Livechat with prefix) sent to room ${res.message.room}`
        );
      }
    } catch (error) {
      console.error("Error en el comando de AI:", error);

      const errorMessage = isLivechat
        ? "Disculpa, tuve un problema procesando tu consulta. Un agente humano te ayudará en breve. 😊"
        : "Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo más tarde.";

      res.send(errorMessage);
    }
  });

  console.log("✅ AI Assistant cargado - Compatible con sistema de handoff");
};
