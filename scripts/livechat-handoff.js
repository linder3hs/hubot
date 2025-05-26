// Description:
//   Sistema inteligente de handoff para Livechat que detecta cuando un agente humano
//   debe tomar control de la conversación y silencia al bot automáticamente
//
// Commands:
//   hubot tomar control - Agente toma control manual del chat
//   hubot devolver bot - Devuelve control al bot
//   hubot estado chat - Muestra el estado actual del chat

console.log("🔄 Cargando sistema de handoff para Livechat...");

module.exports = function (robot) {
  // Configuración del sistema de handoff
  const HANDOFF_CONFIG = {
    // Tiempo en ms para detectar inactividad del agente (15 minutos)
    AGENT_TIMEOUT: 15 * 60 * 1000,
    // Palabras clave que indican necesidad de agente humano
    ESCALATION_KEYWORDS: [
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
      "importante",
      "ayuda especializada",
    ],
    // Tiempo mínimo antes de que el bot pueda responder después de actividad humana (5 minutos)
    BOT_SILENCE_TIME: 5 * 60 * 1000,
  };

  // Almacén de estados de chat (usando robot.brain para persistencia)
  function getChatState(roomId) {
    return (
      robot.brain.get(`chat_state_${roomId}`) || {
        status: "bot_active",
        agentId: null,
        lastAgentActivity: null,
        escalationReason: null,
        botSilencedUntil: null,
        messageCount: 0,
      }
    );
  }

  function setChatState(roomId, state) {
    robot.brain.set(`chat_state_${roomId}`, {
      ...getChatState(roomId),
      ...state,
      lastUpdated: new Date().toISOString(),
    });
    robot.brain.save();
  }

  // Función para detectar si el mensaje requiere escalamiento
  function shouldEscalate(message) {
    const text = message.toLowerCase();
    return HANDOFF_CONFIG.ESCALATION_KEYWORDS.some((keyword) =>
      text.includes(keyword)
    );
  }

  // Función para verificar si el bot debe responder
  function canBotRespond(roomId, isLivechat = false) {
    if (!isLivechat) return true; // Solo aplicar lógica en Livechat

    const state = getChatState(roomId);
    const now = Date.now();

    // Si hay un agente activo
    if (state.status === "agent_active") {
      // Verificar timeout del agente
      if (
        state.lastAgentActivity &&
        now - new Date(state.lastAgentActivity).getTime() >
          HANDOFF_CONFIG.AGENT_TIMEOUT
      ) {
        // Agente inactivo, devolver control al bot
        setChatState(roomId, {
          status: "bot_active",
          agentId: null,
          escalationReason: "agent_timeout",
        });
        return true;
      }
      return false; // Agente activo, bot silenciado
    }

    // Si el bot está temporalmente silenciado
    if (
      state.botSilencedUntil &&
      now < new Date(state.botSilencedUntil).getTime()
    ) {
      return false;
    }

    return true; // Bot puede responder
  }

  // Middleware global para interceptar mensajes del bot
  robot.listenerMiddleware((context, next, done) => {
    const message = context.response.message;
    const roomId = message.room;
    const isLivechat = message.user && message.user.roomType === "l";

    // Solo aplicar en Livechat
    if (!isLivechat) {
      return next(done);
    }

    // Verificar si el bot puede responder
    if (!canBotRespond(roomId, isLivechat)) {
      // Bot silenciado, no procesar la respuesta
      return done();
    }

    // Continuar con el procesamiento normal
    next(done);
  });

  // Listener para detectar actividad de agentes humanos
  robot.hear(/.*/, function (res) {
    const message = res.message;
    const roomId = message.room;
    const isLivechat = message.user && message.user.roomType === "l";
    const userId = message.user.id;

    // Solo procesar mensajes de Livechat
    if (!isLivechat) return;

    // Ignorar mensajes del bot
    if (message.user.name === robot.name || userId === robot.name) return;

    const state = getChatState(roomId);
    const messageText = message.text || "";

    // Incrementar contador de mensajes
    setChatState(roomId, { messageCount: state.messageCount + 1 });

    // Detectar si necesita escalamiento automático
    if (shouldEscalate(messageText) && state.status === "bot_active") {
      setChatState(roomId, {
        status: "escalation_pending",
        escalationReason: "keyword_detected",
        botSilencedUntil: Date.now() + HANDOFF_CONFIG.BOT_SILENCE_TIME,
      });

      // Notificar sobre escalamiento automático
      res.send(`🚨 He detectado que podrías necesitar ayuda especializada. 
Un agente humano será notificado para asistirte. 
Mientras tanto, puedo intentar ayudarte con consultas básicas.`);
      return;
    }

    // Detectar patrones que indican que un agente humano está respondiendo
    const isLikelyAgent =
      // Mensajes largos y detallados (posiblemente de agente)
      messageText.length > 100 ||
      // Patrones típicos de agentes
      /gracias por contactarnos|mi nombre es|soy.*agente|le ayudo|para servirle/i.test(
        messageText
      ) ||
      // Respuestas a preguntas específicas del bot
      (state.messageCount > 2 && messageText.length > 50);

    if (isLikelyAgent && state.status !== "agent_active") {
      // Agente humano detectado, silenciar bot
      setChatState(roomId, {
        status: "agent_active",
        agentId: userId,
        lastAgentActivity: new Date().toISOString(),
        escalationReason: "agent_detected",
      });

      // Mensaje discreto para confirmar handoff
      res.send(
        `👨‍💼 Un agente especializado se ha unido al chat. Estaré disponible si necesitas ayuda adicional.`
      );
    } else if (state.status === "agent_active" && state.agentId === userId) {
      // Actualizar actividad del agente
      setChatState(roomId, {
        lastAgentActivity: new Date().toISOString(),
      });
    }
  });

  // Comando manual para que agente tome control
  robot.respond(/tomar control|take over|handoff/i, function (res) {
    const roomId = res.message.room;
    const userId = res.message.user.id;
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (!isLivechat) {
      return res.send("Este comando solo funciona en chats de Livechat.");
    }

    setChatState(roomId, {
      status: "agent_active",
      agentId: userId,
      lastAgentActivity: new Date().toISOString(),
      escalationReason: "manual_handoff",
    });

    res.send(
      "✋ Control transferido al agente humano. El bot permanecerá en silencio."
    );
  });

  // Comando para devolver control al bot
  robot.respond(/devolver bot|resume bot|bot activo/i, function (res) {
    const roomId = res.message.room;
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (!isLivechat) {
      return res.send("Este comando solo funciona en chats de Livechat.");
    }

    setChatState(roomId, {
      status: "bot_active",
      agentId: null,
      lastAgentActivity: null,
      escalationReason: null,
      botSilencedUntil: null,
    });

    res.send("🤖 El bot ha reanudado sus funciones en este chat.");
  });

  // Comando para verificar estado del chat
  robot.respond(/estado chat|chat status/i, function (res) {
    const roomId = res.message.room;
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (!isLivechat) {
      return res.send("Este comando solo funciona en chats de Livechat.");
    }

    const state = getChatState(roomId);
    const canRespond = canBotRespond(roomId, true);

    let statusMessage = `📊 **Estado del Chat:**\n`;
    statusMessage += `Estado: ${state.status}\n`;
    statusMessage += `Bot puede responder: ${canRespond ? "Sí" : "No"}\n`;
    statusMessage += `Mensajes en conversación: ${state.messageCount}\n`;

    if (state.agentId) {
      statusMessage += `Agente activo: ${state.agentId}\n`;
      statusMessage += `Última actividad: ${state.lastAgentActivity}\n`;
    }

    if (state.escalationReason) {
      statusMessage += `Razón de escalamiento: ${state.escalationReason}\n`;
    }

    res.send(statusMessage);
  });

  // Función de limpieza periódica (ejecutar cada hora)
  setInterval(() => {
    const now = Date.now();
    const brainData = robot.brain.data;

    // Limpiar estados antiguos y verificar timeouts
    Object.keys(brainData).forEach((key) => {
      if (key.startsWith("chat_state_")) {
        const state = brainData[key];
        if (state.lastAgentActivity) {
          const timeSinceActivity =
            now - new Date(state.lastAgentActivity).getTime();

          // Si el agente ha estado inactivo, devolver control al bot
          if (
            timeSinceActivity > HANDOFF_CONFIG.AGENT_TIMEOUT &&
            state.status === "agent_active"
          ) {
            const roomId = key.replace("chat_state_", "");
            setChatState(roomId, {
              status: "bot_active",
              agentId: null,
              escalationReason: "agent_timeout_cleanup",
            });

            console.log(
              `Control devuelto al bot en sala ${roomId} por inactividad del agente`
            );
          }
        }
      }
    });
  }, 60 * 60 * 1000); // Cada hora

  console.log("Sistema de Handoff para Livechat cargado correctamente");
};
