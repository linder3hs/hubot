// rocketchat-config.js
// Este archivo solo debe exportar funciones de configuración del adaptador

/**
 * Configuración personalizada para el adaptador de Rocket.Chat
 * con soporte para Livechat
 */
function parseRoomIdFromMessage(message) {
  // El objeto message debe contener una referencia al roomType
  if (message && message.user && message.user.roomType === "l") {
    // Manejar mensajes de livechat
    return {
      roomId: message.user.roomId,
      isLivechat: true,
      roomType: "l",
    };
  }

  // Comportamiento normal para mensajes regulares
  return {
    roomId: message.user.roomId,
    isLivechat: false,
    roomType: message.user.roomType || "c",
  };
}

module.exports = {
  parseRoomIdFromMessage,
  // Opciones adicionales para el adaptador
  integrationId: process.env.ROCKETCHAT_INTEGRATION_ID || "hubot",
  botName: process.env.ROCKETCHAT_BOT_NAME || "hubot",
  livechatEnabled: process.env.RESPOND_TO_LIVECHAT === "true",
};
