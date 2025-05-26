// Commands:
//   hubot hola - Saludo personalizado con opciones aleatorias
//   hubot ayuda - Muestra los comandos disponibles
//   hubot clima en <ciudad> - Simula información del clima
//   hubot chiste - Cuenta un chiste aleatorio
//   hubot motivame - Envía una frase motivacional
//   hubot ping - Comprueba si el bot está funcionando
//   hubot hora - Muestra la hora y fecha actual
//   hubot lanzar moneda - Lanza una moneda (cara o cruz)
//   hubot recomienda <algo> - Genera recomendaciones según la categoría
//   hubot echo <mensaje> - Repite el mensaje que le envíes

module.exports = function (robot) {
  // Función para obtener una respuesta aleatoria de un array
  function respuestaAleatoria(opciones) {
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  // Función para verificar si el bot puede responder en Livechat
  function canBotRespond(roomId, isLivechat) {
    if (!isLivechat) return true;

    if (global.canBotRespondInLivechat) {
      return global.canBotRespondInLivechat(roomId);
    }

    return true; // Fallback
  }

  // Comando: hola
  robot.respond(/hola|hey|saludos|hi|hello/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return; // Bot silenciado en Livechat
    }

    const saludos = [
      "¡Hola! ¿En qué puedo ayudarte hoy?",
      "¡Hey! Me alegra verte por aquí. ¿Qué necesitas?",
      "¡Saludos! Estoy listo para asistirte.",
      "¡Qué tal! ¿Cómo va todo? ¿En qué puedo ayudarte?",
      "¡Hola! Un placer charlar contigo. ¿Necesitas algo?",
      "¡Hey, qué bueno verte! ¿En qué estás trabajando hoy?",
    ];
    res.reply(respuestaAleatoria(saludos));
  });

  // Comando: ayuda
  robot.respond(/ayuda|help|comandos|commands/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    let helpMessage = `Aquí tienes mis comandos disponibles:
- *hola* - Te saludo de forma personalizada
- *ayuda* - Muestro esta lista de comandos
- *clima en [ciudad]* - Te doy el clima simulado
- *chiste* - Te cuento un chiste aleatorio
- *motivame* - Te envío una frase motivacional
- *ping* - Verifico que estoy funcionando
- *hora* - Te muestro la fecha y hora actual
- *lanzar moneda* - Lanzo una moneda
- *recomienda [categoría]* - Te doy recomendaciones
- *echo [mensaje]* - Repito tu mensaje
- *pregunta [consulta]* - Respondo usando AI`;

    // Agregar comandos específicos de Livechat si aplica
    if (isLivechat) {
      helpMessage += `\n\n🔧 **Comandos para agentes:**
- *tomar control* - Agente toma control del chat
- *devolver bot* - Devuelve control al bot
- *estado chat* - Muestra estado actual del chat`;
    }

    res.send(helpMessage);
  });

  // Comando: ping
  robot.respond(/ping/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const tiempoRespuesta = Math.floor(Math.random() * 20);
    res.send(`PONG! 🏓 Tiempo de respuesta: ${tiempoRespuesta}ms`);
  });

  // Comando: hora
  robot.respond(/hora|time|fecha|date/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const ahora = new Date();
    const opciones = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    res.send(
      `📅 Fecha y hora actual: ${ahora.toLocaleDateString("es-ES", opciones)}`
    );
  });

  // Comando: chiste
  robot.respond(/chiste|joke|divierteme/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const chistes = [
      "¿Por qué los programadores prefieren el frío? Porque tienen problemas con el calor-sint-axis.",
      "¿Cómo se llama un programador en el fondo del mar? Desarrollador full-stack overflow.",
      "¿Por qué Python no lleva corbata? Porque usa bytecode.",
      "¿Cómo organiza una fiesta un programador? Pues... invita a todo el array.",
      "Había una vez un científico tan, pero tan malo con las bromas que hasta los elementos de la tabla periódica dejaron de reaccionar.",
      "Un átomo tropezó y le preguntaron: '¿Estás bien?' Y respondió: 'Perdí un electrón'. '¿Estás seguro?', le preguntaron. 'Sí, estoy positivo'.",
    ];
    res.send(`😂 ${respuestaAleatoria(chistes)}`);
  });

  // Comando: motivame
  robot.respond(/motivame|motivación|motivacion|inspire/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const frases = [
      "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
      "La única manera de hacer un gran trabajo es amar lo que haces.",
      "No te preocupes por los fracasos, preocúpate por las posibilidades que pierdes cuando ni siquiera lo intentas.",
      "El mejor momento para plantar un árbol era hace 20 años. El segundo mejor momento es ahora.",
      "No importa lo lento que vayas, siempre y cuando no te detengas.",
      "La programación es como una broma: si tienes que explicarla, es mala.",
    ];
    res.send(`✨ ${respuestaAleatoria(frases)}`);
  });

  // Comando: clima
  robot.respond(/clima(?: en)? (.*)/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const ciudad = res.match[1];
    const climas = [
      "soleado",
      "nublado",
      "lluvioso",
      "ventoso",
      "despejado",
      "tormentoso",
    ];
    const temperaturas = Math.floor(Math.random() * 35) + 5; // Entre 5 y 40 grados
    const humedad = Math.floor(Math.random() * 80) + 20; // Entre 20% y 100%

    res.send(`🌦️ El clima en ${ciudad} es ${respuestaAleatoria(climas)}.
🌡️ Temperatura: ${temperaturas}°C
💧 Humedad: ${humedad}%`);
  });

  // Comando: lanzar moneda
  robot.respond(/lanzar moneda|cara o cruz|flip coin/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const resultado = Math.random() > 0.5 ? "cara" : "cruz";
    res.send(`🪙 He lanzado una moneda y ha salido... ¡${resultado}!`);
  });

  // Comando: recomienda
  robot.respond(/recomienda(?:me)? (.*)/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const categoria = res.match[1].toLowerCase();

    const recomendaciones = {
      películas: [
        "El Padrino",
        "Matrix",
        "Interestelar",
        "El Señor de los Anillos",
        "Pulp Fiction",
        "Inception",
        "Ciudad de Dios",
      ],
      libros: [
        "Cien años de soledad",
        "1984",
        "El principito",
        "Don Quijote de la Mancha",
        "El Hobbit",
        "Fahrenheit 451",
      ],
      música: [
        "Pink Floyd",
        "Queen",
        "The Beatles",
        "Radiohead",
        "Daft Punk",
        "Metallica",
        "Bach",
      ],
      series: [
        "Breaking Bad",
        "Game of Thrones",
        "Stranger Things",
        "Black Mirror",
        "The Office",
        "The Mandalorian",
      ],
      lenguajes: [
        "JavaScript",
        "Python",
        "Rust",
        "Go",
        "TypeScript",
        "Ruby",
        "C#",
        "Kotlin",
      ],
      comida: [
        "Sushi",
        "Pizza",
        "Tacos",
        "Hamburguesas",
        "Curry",
        "Pasta",
        "Asado",
      ],
    };

    let mensaje;
    if (recomendaciones[categoria]) {
      const recomendacion = respuestaAleatoria(recomendaciones[categoria]);
      mensaje = `🌟 Mi recomendación de ${categoria}: ${recomendacion}`;
    } else {
      mensaje = `Lo siento, no tengo recomendaciones para "${categoria}". Prueba con películas, libros, música, series, lenguajes o comida.`;
    }

    res.send(mensaje);
  });

  // Comando: echo
  robot.respond(/echo (.*)/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    if (isLivechat && !canBotRespond(res.message.room, isLivechat)) {
      return;
    }

    const mensaje = res.match[1];
    res.send(`🔊 ${mensaje}`);
  });

  // Responder a mensajes que parecen preguntas (solo en canales normales, no Livechat)
  robot.hear(/\?(\s|$)/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    // No responder automáticamente en Livechat (lo maneja livechat-ai-handler.js)
    if (isLivechat) return;

    if (Math.random() < 0.2) {
      // 20% de probabilidad de responder
      const respuestas = [
        "Esa es una buena pregunta...",
        "Hmm, déjame pensar...",
        "Interesante pregunta. ¿Alguien quiere responder?",
        "¿Has probado buscando en Google?",
        "No estoy 100% seguro, pero podría ser...",
        "La respuesta a tu pregunta es 42.",
      ];
      res.send(respuestaAleatoria(respuestas));
    }
  });

  // Respuestas a emojis comunes (solo en canales normales)
  robot.hear(/(?::|;|=)-?(?:\)|D|P)/i, function (res) {
    const isLivechat = res.message.user && res.message.user.roomType === "l";

    // No responder automáticamente en Livechat
    if (isLivechat) return;

    if (Math.random() < 0.1) {
      // 10% de probabilidad de responder
      const emojis = ["😊", "👍", "🎉", "✨", "🙌", "🤖"];
      res.send(respuestaAleatoria(emojis));
    }
  });

  console.log(
    "✅ Scripts básicos cargados - Compatible con sistema de handoff"
  );
};
