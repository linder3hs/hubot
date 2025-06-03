"use strict";

module.exports = (robot) => {
  const r = (a) => a[Math.floor(Math.random() * a.length)];

  robot.respond(/hola|hey|saludos|hi|hello/i, (res) =>
    res.reply(r(["¡Hola!", "¡Hey!", "¡Saludos!", "¡Qué tal!", "¡Hola!"]))
  );

  robot.respond(/ayuda|help|comandos|commands/i, (res) => {
    let m = `
*hola* – saludo
*ayuda* – lista
*clima en [ciudad]* – clima
*chiste* – chiste
*motivame* – motivación
*ping* – test
*hora* – fecha y hora
*lanzar moneda* – cara/cruz
*recomienda [cat]* – recomendación
*echo [txt]* – eco`;
    if (res.message.user?.roomType === "l")
      m += `

Comandos agente:
tomar control • silencia bot
devolver bot • activa bot
estado chat • estado`;
    res.send(m.trim());
  });

  robot.respond(/ping/i, (res) => res.send("PONG!"));

  robot.respond(/hora|time|fecha|date/i, (res) =>
    res.send(`📅 ${new Date().toLocaleString("es-ES")}`)
  );

  robot.respond(/chiste|joke|divierteme/i, (res) =>
    res.send(
      r([
        "¿Por qué Python no usa corbata? Porque usa bytecode.",
        "¿Cómo organiza una fiesta un programador? Invita a todo el array.",
      ])
    )
  );

  robot.respond(/motivame|motivación|motivacion|inspire/i, (res) =>
    res.send(r(["Sigue adelante.", "Puedes lograrlo."]))
  );

  robot.respond(/clima(?: en)? (.*)/i, (res) =>
    res.send(`🌦️ El clima en ${res.match[1]} es soleado. 🌡️ 27°C`)
  );

  robot.respond(/lanzar moneda|cara o cruz|flip coin/i, (res) =>
    res.send(`🪙 ${Math.random() > 0.5 ? "cara" : "cruz"}`)
  );

  robot.respond(/recomienda(?:me)? (.*)/i, (res) => {
    const c = res.match[1].toLowerCase();
    const p = {
      películas: ["Matrix", "Inception"],
      libros: ["1984", "El Hobbit"],
    };
    res.send(p[c] ? r(p[c]) : "Sin recomendaciones para esa categoría.");
  });

  robot.respond(/echo (.*)/i, (res) => res.send(res.match[1]));
};
