// Description:
//   Manejador de AI para Livechat que responde sin prefijo
//   con indicadores de procesamiento y compatibilidad con handoff
//
// Dependencies:
//   - src/ai.js
//   - scripts/handoff-system.js

const { generateAIResponse } = require("../src/ai");

module.exports = function (robot) {
  // Sistema de caché para evitar consultas repetidas
  const responseCache = new Map();
  const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

  // Función para verificar si el bot puede responder
  function canBotRespond(roomId) {
    if (global.canBotRespondInLivechat) {
      return global.canBotRespondInLivechat(roomId);
    }
    return true; // Fallback
  }

  // Función para detectar si debe responder con AI
  function shouldRespondWithAI(message, isFromUser = true) {
    // No responder a mensajes del bot
    if (!isFromUser) return false;

    const text = message.toLowerCase().trim();

    // Ignorar mensajes muy cortos
    if (text.length < 3) return false;

    // Ignorar comandos específicos del bot
    const botCommands = [
      /^@hubot/i, // Menciones directas al bot
      /^hubot\s/i, // Comandos con prefijo
      /^(tomar control|take over|handoff|devolver bot|estado chat)/i,
      /^(documentos|cargar documento|consultar documento)/i,
      /^(ping|hora|chiste|motivame|clima|lanzar moneda)/i,
      /^(ayuda|help|comandos)/i,
    ];

    if (botCommands.some((cmd) => cmd.test(text))) {
      return false;
    }

    // Ignorar respuestas muy simples
    const simpleResponses = [
      /^(si|no|ok|vale|bien|gracias|hola|adios|bye)$/i,
      /^(👍|👎|😊|😢|❤️|🙏)$/i,
    ];

    if (simpleResponses.some((simple) => simple.test(text))) {
      return false;
    }

    // Responder a mensajes que parecen preguntas o consultas reales
    const shouldRespond =
      text.includes("?") ||
      text.startsWith("como") ||
      text.startsWith("que") ||
      text.startsWith("cuando") ||
      text.startsWith("donde") ||
      text.startsWith("por que") ||
      text.startsWith("porque") ||
      text.startsWith("necesito") ||
      text.startsWith("quiero") ||
      text.startsWith("tengo") ||
      text.includes("ayuda") ||
      text.includes("problema") ||
      text.includes("consulta") ||
      text.includes("duda") ||
      text.includes("pregunta") ||
      text.length > 15; // Mensajes con más sustancia

    return shouldRespond;
  }

  // Manejador principal para mensajes de Livechat sin prefijo
  robot.hear(/.*/, async function (res) {
    const message = res.message;
    const isLivechat = message.user && message.user.roomType === "l";
    const roomId = message.room;
    const userId = message.user.id;
    const userName = message.user.name;
    const messageText = message.text || "";

    // Solo procesar mensajes de Livechat
    if (!isLivechat) return;

    // Ignorar mensajes del propio bot
    if (userName === "hubot" || userId === "hubot") return;

    // Verificar si el bot puede responder según el sistema de handoff
    if (!canBotRespond(roomId)) {
      console.log(`🤖 Bot silenciado en sala ${roomId} - agente activo`);
      return;
    }

    // Verificar si debe responder con AI
    if (!shouldRespondWithAI(messageText, true)) {
      console.log(
        `🤖 Mensaje ignorado en sala ${roomId}: "${messageText.substring(
          0,
          30
        )}..."`
      );
      return;
    }

    // Verificar caché
    const cacheKey = `${roomId}_${messageText.toLowerCase().substring(0, 100)}`;
    if (responseCache.has(cacheKey)) {
      const { response, timestamp } = responseCache.get(cacheKey);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log(`💾 Respuesta desde caché para sala ${roomId}`);
        return res.send(response);
      }
    }

    try {
      // Mostrar indicador de procesamiento INMEDIATAMENTE
      if (global.showProcessingIndicator) {
        await global.showProcessingIndicator(res, roomId);
      } else {
        // Fallback si no está disponible el sistema de handoff
        res.send("✍️ Un momento, estoy procesando tu consulta...");
      }

      // Generar respuesta usando AI con contexto específico de Livechat
      const systemPrompt = `Eres un asistente virtual de atención al cliente muy amigable y profesional. 
      Estás ayudando a un cliente en un chat de soporte en vivo.
      
      Reglas importantes:
      - Mantén un tono amable, profesional y empático
      - Responde de manera concisa pero completa (máximo 3 párrafos)
      - Si no puedes resolver algo técnico complejo, di "Me gustaría conectarte con uno de nuestros especialistas para ayudarte mejor"
      - Nunca inventes información técnica específica que no sepas
      - Si detectas urgencia o problemas complejos, sugiere escalamiento
      - Responde en español a menos que el cliente escriba claramente en otro idioma
      - Siempre mantén un tono de servicio al cliente profesional
      - Si es una pregunta muy técnica o específica del negocio, sugiere contacto con agente humano`;

      const aiResponse = await generateAIResponse(messageText, systemPrompt);

      // Limpiar indicador de procesamiento
      if (global.clearProcessingIndicator) {
        global.clearProcessingIndicator(roomId);
      }

      // Guardar en caché
      responseCache.set(cacheKey, {
        response: aiResponse,
        timestamp: Date.now(),
      });

      // Enviar respuesta
      res.send(aiResponse);

      // Log para debugging
      console.log(
        `🤖 AI Response enviada a Livechat sala ${roomId}: "${messageText.substring(
          0,
          50
        )}..."`
      );
    } catch (error) {
      console.error("❌ Error generando respuesta AI para Livechat:", error);

      // Limpiar indicador de procesamiento en caso de error
      if (global.clearProcessingIndicator) {
        global.clearProcessingIndicator(roomId);
      }

      // Respuesta de error amigable
      res.send(
        "Disculpa, tuve un problema técnico procesando tu consulta. Un especialista te ayudará en breve. 😊"
      );
    }
  });

  // Limpieza de caché cada 15 minutos
  setInterval(() => {
    const now = Date.now();
    let cleanedEntries = 0;

    for (const [key, { timestamp }] of responseCache.entries()) {
      if (now - timestamp > CACHE_TTL) {
        responseCache.delete(key);
        cleanedEntries++;
      }
    }

    if (cleanedEntries > 0) {
      console.log(
        `🧹 Cache AI limpiado: ${cleanedEntries} entradas eliminadas`
      );
    }
  }, 1000 * 60 * 15);

  console.log(
    "🤖 Livechat AI Handler cargado - Bot responderá sin prefijo con indicadores de procesamiento"
  );
};
