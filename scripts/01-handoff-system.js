"use strict";

module.exports = (robot) => {
  const cfg = {
    AGENT_TIMEOUT: 900_000,
    BOT_SILENCE: 180_000,
    SPECIFIC: ["agent.linder", "agente.soporte", "support.agent"],
    ROLES: ["livechat-agent", "omnichannel-agent"],
    KEYWORDS: [
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

  const getState = (room) =>
    robot.brain.get(`chat_state_${room}`) ?? {
      status: "bot_active",
      agentId: null,
      agentName: null,
      lastAgentActivity: null,
      botSilencedUntil: null,
      messageCount: 0,
      userConsecutiveMessages: 0,
      conversationStarted: new Date().toISOString(),
    };

  const setState = (room, up) => {
    const st = {
      ...getState(room),
      ...up,
      lastUpdated: new Date().toISOString(),
    };
    robot.brain.set(`chat_state_${room}`, st);
    robot.brain.save();
    return st;
  };

  const isAgent = ({ user }) =>
    !["hubot"].includes(user.name) &&
    !user.name.toLowerCase().includes("bot") &&
    (cfg.SPECIFIC.includes(user.name) ||
      cfg.SPECIFIC.includes(user.id) ||
      user.roles?.some((r) => cfg.ROLES.includes(r)) ||
      (user.type && user.type !== "bot"));

  const escalate = (txt, st) =>
    cfg.KEYWORDS.some((k) => txt.includes(k)) ||
    st.userConsecutiveMessages >= 3;

  global.canBotRespondInLivechat = (room) => {
    const s = getState(room);
    const now = Date.now();
    if (s.status === "agent_active") {
      if (
        s.lastAgentActivity &&
        now - new Date(s.lastAgentActivity).getTime() > cfg.AGENT_TIMEOUT
      )
        setState(room, {
          status: "bot_active",
          agentId: null,
          agentName: null,
        });
      else return false;
    }
    if (s.botSilencedUntil && now < new Date(s.botSilencedUntil).getTime())
      return false;
    return true;
  };

  global.showProcessingIndicator = async (res, room) => {
    setState(room, { isProcessing: true });
    const msg = ["⏳ Procesando…", "🔍 Revisando…", "✍️ Un momento…"][
      Math.floor(Math.random() * 3)
    ];
    setTimeout(() => res.send(msg), 300);
  };
  global.clearProcessingIndicator = (room) =>
    setState(room, { isProcessing: false });

  robot.hear(/.*/, (res) => {
    const { user, text, room } = res.message;
    if (user?.roomType !== "l" || user.name === "hubot") return;

    let st = getState(room);

    if (isAgent(res.message)) {
      setState(room, {
        status: "agent_active",
        agentId: user.id,
        agentName: user.name,
        lastAgentActivity: new Date().toISOString(),
      });
      res.send("👨‍💼 Un especialista se ha unido al chat.");
      return;
    }

    if (st.status === "agent_active") {
      setState(room, { lastAgentActivity: new Date().toISOString() });
      return;
    }

    if (escalate(text.toLowerCase(), st)) {
      setState(room, {
        status: "escalation_pending",
        botSilencedUntil: Date.now() + cfg.BOT_SILENCE,
        userConsecutiveMessages: 0,
      });
      res.send("🚨 Te pondré con un agente humano en breve.");
      return;
    }

    setState(room, {
      messageCount: st.messageCount + 1,
      userConsecutiveMessages: st.userConsecutiveMessages + 1,
    });
  });

  const live = (p, fn) =>
    robot.hear(p, (r) => r.message.user?.roomType === "l" && fn(r));

  live(/^(tomar control|take over|handoff)$/i, (r) => {
    const { id, name } = r.message.user;
    setState(r.message.room, {
      status: "agent_active",
      agentId: id,
      agentName: name,
    });
    r.send("✅ Control transferido al agente.");
  });

  live(/^(devolver bot|resume bot|bot activo)$/i, (r) => {
    setState(r.message.room, {
      status: "bot_active",
      agentId: null,
      agentName: null,
    });
    r.send("✅ El bot ha retomado el chat.");
  });

  live(/^(estado chat|chat status)$/i, (r) => {
    const s = getState(r.message.room);
    r.send(
      `📊 Estado: ${s.status}\nMensajes: ${s.messageCount}\nAgente: ${
        s.agentName ?? "ninguno"
      }`
    );
  });
};
