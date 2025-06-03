"use strict";

const { generateAIResponse } = require("../src/ai");

module.exports = (robot) => {
  const cache = new Map();
  const TTL = 1_800_000;

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.ts > TTL) cache.delete(k);
  }, TTL / 2);

  robot.respond(/(?:pregunta|ai|asistente)\s+(.+)/i, async (res) => {
    const q = res.match[1].trim();
    const key = q.toLowerCase();
    const live = res.message.user?.roomType === "l";

    if (cache.has(key) && Date.now() - cache.get(key).ts < TTL)
      return res.send(cache.get(key).ans);

    res.send("Procesando…");

    try {
      const prompt = live
        ? "Eres un asistente de atención al cliente profesional y empático."
        : "Eres un asistente virtual conciso y útil.";
      const ans = await generateAIResponse(q, prompt);
      cache.set(key, { ans, ts: Date.now() });
      res.send(ans);
    } catch (e) {
      console.error(e);
      res.send(
        live
          ? "Disculpa, hubo un problema. Un agente humano te ayudará en breve."
          : "Lo siento, ocurrió un error. Intenta de nuevo."
      );
    }
  });
};
