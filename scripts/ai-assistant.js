// Description:
//   Integrates DeepSeek AI capabilities with Hubot
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

  // Comando principal para consultas de AI
  robot.respond(/(?:pregunta|ai|asistente)\s+(.+)/i, async function (res) {
    const query = res.match[1].trim();
    const cacheKey = query.toLowerCase();

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
      // Personalizar el prompt del sistema para el contexto de la empresa
      const systemPrompt =
        "Eres un asistente virtual amigable y profesional. Proporciona respuestas concisas, precisas y útiles. Mantén un tono conversacional y amable.";

      // Generar respuesta usando DeepSeek AI
      const aiResponse = await generateAIResponse(query, systemPrompt);

      // Guardar en caché
      responseCache.set(cacheKey, {
        response: aiResponse,
        timestamp: Date.now(),
      });

      // Enviar respuesta al usuario
      res.send(aiResponse);
    } catch (error) {
      console.error("Error en el comando de AI:", error);
      res.send(
        "Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo más tarde."
      );
    }
  });
};
