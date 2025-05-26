// Description:
//   Sistema completo de handoff para Livechat
//   Versión limpia para testing con usuarios separados
//
// Commands:
//   hubot tomar control - Agente toma control manual del chat
//   hubot devolver bot - Devuelve control al bot
//   hubot estado chat - Muestra el estado actual del chat

console.log("🔄 Cargando sistema de handoff (versión limpia)...");

module.exports = function (robot) {
  // Configuración del sistema
  const HANDOFF_CONFIG = {
    // Tiempo para detectar inactividad del agente (15 minutos)
    AGENT_TIMEOUT: 15 * 60 * 1000,
    // Tiempo de silencio del bot después de detectar agente (3 minutos)
    BOT_SILENCE_TIME: 3 * 60 * 1000,
    // Usuarios específicos que son agentes (AGREGAR TU NUEVO USUARIO AQUÍ)
    SPECIFIC_AGENTS: [
      "agente.soporte", // Ejemplo - cambiar por tu usuario
      "support.agent", // Ejemplo - cambiar por tu usuario
      // "tu_nuevo_usuario_agente" // Descomenta y agrega aquí
    ],
    // Patrones de nombres de usuario que indican agentes
    AGENT_USER_PATTERNS: [
      /^agent\./i, // agent.juan, agent.maria
      /^support\./i, // support.team
      /^help\./i, // help.desk
      /^agente\./i, // agente.carlos
      /^soporte\./i, // soporte.ana
    ],
    // Roles que indican que es un agente (SIN roles de admin)
    AGENT_ROLES: [
      "livechat-agent",
      "livechat-manager",
      "omnichannel-agent",
      // NO incluir 'admin' para evitar conflictos
    ],
    // Palabras clave que activan escalamiento automático
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
      "devolver dinero",
      "supervisor",
      "gerente",
      "jefe",
      "urgente",
      "crítico",
      "importante",
      "ayuda especializada",
      "no entiendo",
      "no me sirve",
      "mal servicio",
      "hablar con persona",
      "agente humano",
      "representante",
    ],
  };

  // Función para obtener estado del chat
  function getChatState(roomId) {
    return (
      robot.brain.get(`chat_state_${roomId}`) || {
        status: "bot_active", // bot_active, agent_active, escalation_pending
        agentId: null,
        agentName: null,
        lastAgentActivity: null,
        escalationReason: null,
        botSilencedUntil: null,
        messageCount: 0,
        userConsecutiveMessages: 0,
        conversationStarted: new Date().toISOString(),
        isProcessing: false,
        processingStarted: null,
      }
    );
  }

  // Función para actualizar estado del chat
  function setChatState(roomId, updates) {
    const currentState = getChatState(roomId);
    const newState = {
      ...currentState,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    robot.brain.set(`chat_state_${roomId}`, newState);
    robot.brain.save();

    console.log(
      `🔄 Chat State Updated - Room: ${roomId}, Status: ${
        newState.status
      }, Agent: ${newState.agentName || "none"}`
    );
    return newState;
  }

  // Función para detectar si un usuario es agente
  function isAgent(message) {
    const userId = message.user.id;
    const userName = message.user.name || "";
    const userRoles = message.user.roles || [];
    const messageText = message.text || "";

    console.log(
      `🔍 Checking agent - User: ${userName}, Roles: ${JSON.stringify(
        userRoles
      )}`
    );

    // 1. Verificar usuarios específicos
    if (HANDOFF_CONFIG.SPECIFIC_AGENTS.includes(userName)) {
      console.log(`✅ ${userName} is SPECIFIC AGENT`);
      return { isAgent: true, confidence: 1.0, method: "specific_user" };
    }

    // 2. Verificar patrones de nombre
    const matchesPattern = HANDOFF_CONFIG.AGENT_USER_PATTERNS.some((pattern) =>
      pattern.test(userName)
    );

    if (matchesPattern) {
      console.log(`✅ ${userName} matches AGENT PATTERN`);
      return { isAgent: true, confidence: 0.8, method: "username_pattern" };
    }

    // 3. Verificar roles del usuario (SIN admin)
    const hasAgentRole = userRoles.some((role) =>
      HANDOFF_CONFIG.AGENT_ROLES.includes(role)
    );

    if (hasAgentRole) {
      console.log(`✅ ${userName} has AGENT ROLE: ${userRoles.join(", ")}`);
      return { isAgent: true, confidence: 0.9, method: "user_roles" };
    }

    // 4. Detectar por mensaje explícito de agente
    const agentMessage =
      /hola.*soy.*agente|mi nombre es.*equipo|gracias por contactar.*soporte|te voy a ayudar.*especialista/i.test(
        messageText
      );

    if (agentMessage) {
      console.log(`✅ ${userName} sent AGENT MESSAGE`);
      return { isAgent: true, confidence: 0.7, method: "agent_message" };
    }

    console.log(`❌ ${userName} NOT detected as agent`);
    return { isAgent: false, confidence: 0, method: "none" };
  }

  // Función para detectar escalamiento automático
  function shouldEscalate(message, state) {
    const text = message.toLowerCase();

    // Verificar palabras clave
    const hasKeywords = HANDOFF_CONFIG.ESCALATION_KEYWORDS.some((keyword) =>
      text.includes(keyword)
    );

    // Verificar frustración por mensajes consecutivos
    const showsFrustration = state.userConsecutiveMessages >= 3;

    return hasKeywords || showsFrustration;
  }

  // Función global para verificar si bot puede responder
  global.canBotRespondInLivechat = function (roomId) {
    const state = getChatState(roomId);
    const now = Date.now();

    console.log(`🤖 Can bot respond? Room: ${roomId}, Status: ${state.status}`);

    // Si hay un agente activo
    if (state.status === "agent_active") {
      console.log(`❌ Bot silenciado - Agent ${state.agentName} is active`);

      // Verificar timeout del agente
      if (
        state.lastAgentActivity &&
        now - new Date(state.lastAgentActivity).getTime() >
          HANDOFF_CONFIG.AGENT_TIMEOUT
      ) {
        console.log(`⏰ Agent timeout - returning control to bot`);
        setChatState(roomId, {
          status: "bot_active",
          agentId: null,
          agentName: null,
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
      console.log(`❌ Bot temporalmente silenciado`);
      return false;
    }

    console.log(`✅ Bot can respond`);
    return true;
  };

  // Función global para mostrar indicador de procesamiento
  global.showProcessingIndicator = async function (res, roomId) {
    console.log(`⏳ Showing processing indicator for room ${roomId}`);

    setChatState(roomId, {
      isProcessing: true,
      processingStarted: new Date().toISOString(),
    });

    const processingMessages = [
      "✍️ Un momento, estoy procesando tu consulta...",
      "🤔 Déjame revisar eso para ti...",
      "⏳ Procesando tu solicitud, dame unos segundos...",
      "🔍 Buscando la mejor respuesta para ti...",
    ];

    const randomMessage =
      processingMessages[Math.floor(Math.random() * processingMessages.length)];

    setTimeout(() => {
      res.send(randomMessage);
    }, 300);

    // Cleanup automático después de 30 segundos
    setTimeout(() => {
      const currentState = getChatState(roomId);
      if (currentState.isProcessing) {
        setChatState(roomId, {
          isProcessing: false,
          processingStarted: null,
        });
      }
    }, 30000);
  };

  // Función global para limpiar indicador de procesamiento
  global.clearProcessingIndicator = function (roomId) {
    setChatState(roomId, {
      isProcessing: false,
      processingStarted: null,
    });
  };

  // Listener principal para manejar todos los mensajes de Livechat
  robot.hear(/.*/, function (res) {
    const message = res.message;
    const roomId = message.room;
    const isLivechat = message.user && message.user.roomType === "l";
    const userId = message.user.id;
    const userName = message.user.name || "";
    const messageText = message.text || "";

    // Solo procesar mensajes de Livechat
    if (!isLivechat) return;

    // Ignorar mensajes del bot
    if (userName === "hubot" || userId === "hubot") return;

    console.log(`📝 Livechat message from ${userName}: "${messageText}"`);

    const currentState = getChatState(roomId);
    const agentDetection = isAgent(message);

    // Actualizar contador de mensajes
    let updates = {
      messageCount: currentState.messageCount + 1,
    };

    // Si se detecta un agente
    if (agentDetection.isAgent) {
      console.log(
        `🎯 AGENTE DETECTADO: ${userName} (${agentDetection.method})`
      );

      // Activar handoff automático
      updates = {
        ...updates,
        status: "agent_active",
        agentId: userId,
        agentName: userName,
        lastAgentActivity: new Date().toISOString(),
        escalationReason: "agent_detected",
        userConsecutiveMessages: 0,
      };

      setChatState(roomId, updates);

      // Mensaje de confirmación
      setTimeout(() => {
        res.send("👨‍💼 Un especialista se ha unido al chat para ayudarte mejor.");
      }, 1000);

      return;
    }

    // Si ya hay un agente activo
    if (currentState.status === "agent_active") {
      if (currentState.agentId === userId) {
        // Actualizar actividad del agente
        setChatState(roomId, {
          lastAgentActivity: new Date().toISOString(),
        });
      } else {
        // Mensaje del cliente
        updates.userConsecutiveMessages =
          (currentState.userConsecutiveMessages || 0) + 1;
        setChatState(roomId, updates);
      }
      return;
    }

    // Bot activo - procesar mensaje del cliente
    if (currentState.status === "bot_active") {
      // Detectar si necesita escalamiento
      if (shouldEscalate(messageText, currentState)) {
        updates = {
          ...updates,
          status: "escalation_pending",
          escalationReason: "auto_detected",
          botSilencedUntil: Date.now() + HANDOFF_CONFIG.BOT_SILENCE_TIME,
          userConsecutiveMessages: 0,
        };

        setChatState(roomId, updates);

        res.send(`🚨 Veo que necesitas ayuda especializada. He notificado a nuestro equipo de soporte.
Un agente humano te contactará en breve.`);

        return;
      }

      // Incrementar contador de mensajes consecutivos del usuario
      updates.userConsecutiveMessages =
        (currentState.userConsecutiveMessages || 0) + 1;
    }

    setChatState(roomId, updates);
  });

  // Comando manual para que agente tome control
  robot.respond(/tomar control|take over|handoff/i, function (res) {
    const roomId = res.message.room;
    const userId = res.message.user.id;
    const userName = res.message.user.name || "";
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (!isLivechat) {
      return res.send("❌ Este comando solo funciona en chats de Livechat.");
    }

    setChatState(roomId, {
      status: "agent_active",
      agentId: userId,
      agentName: userName,
      lastAgentActivity: new Date().toISOString(),
      escalationReason: "manual_handoff",
      userConsecutiveMessages: 0,
    });

    res.send(
      "✅ Control transferido manualmente. El bot permanecerá silenciado."
    );
    console.log(
      `🔄 Handoff manual - ${userName} tomó control del chat ${roomId}`
    );
  });

  // Comando para devolver control al bot
  robot.respond(/devolver bot|resume bot|bot activo/i, function (res) {
    const roomId = res.message.room;
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (!isLivechat) {
      return res.send("❌ Este comando solo funciona en chats de Livechat.");
    }

    setChatState(roomId, {
      status: "bot_active",
      agentId: null,
      agentName: null,
      lastAgentActivity: null,
      escalationReason: null,
      botSilencedUntil: null,
      userConsecutiveMessages: 0,
    });

    res.send("✅ El bot ha reanudado sus funciones en este chat.");
    console.log(`🔄 Control devuelto al bot en sala ${roomId}`);
  });

  // Comando para verificar estado del chat
  robot.respond(/estado chat|chat status/i, function (res) {
    const roomId = res.message.room;
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (!isLivechat) {
      return res.send("❌ Este comando solo funciona en chats de Livechat.");
    }

    const state = getChatState(roomId);
    const canRespond = global.canBotRespondInLivechat(roomId);

    let statusMessage = `📊 **Estado del Chat:**\n`;
    statusMessage += `• Estado: ${state.status}\n`;
    statusMessage += `• Bot puede responder: ${
      canRespond ? "✅ Sí" : "❌ No"
    }\n`;
    statusMessage += `• Mensajes en conversación: ${state.messageCount}\n`;

    if (state.agentId) {
      statusMessage += `• Agente activo: ${state.agentName}\n`;
      statusMessage += `• Última actividad: ${new Date(
        state.lastAgentActivity
      ).toLocaleString()}\n`;
    }

    res.send(statusMessage);
  });

  console.log("✅ Sistema de handoff cargado (versión limpia para testing)");
};
