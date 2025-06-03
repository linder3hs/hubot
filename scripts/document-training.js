"use strict";

const {
  loadDocument,
  generateDocumentBasedResponse,
  listLoadedDocuments,
  removeDocument,
} = require("../src/document-processor");

module.exports = (robot) => {
  robot.respond(/cargar documento (.+) como (.+)/i, async (res) => {
    const file = res.match[1].trim();
    const name = res.match[2].trim();
    res.send(`Cargando "${file}" como "${name}"…`);
    res.send(
      (await loadDocument(file, name))
        ? "Documento cargado."
        : "No pude cargar el documento."
    );
  });

  robot.respond(/consultar documento (.+) sobre (.+)/i, async (res) => {
    res.send(
      await generateDocumentBasedResponse(
        res.match[2].trim(),
        res.match[1].trim()
      )
    );
  });

  robot.respond(/consultar documentos sobre (.+)/i, async (res) => {
    res.send(await generateDocumentBasedResponse(res.match[1].trim()));
  });

  robot.respond(/documentos$/i, (res) => {
    const docs = listLoadedDocuments();
    res.send(
      docs.length
        ? docs.map((d, i) => `${i + 1}. ${d.name}`).join("\n")
        : "Sin documentos cargados."
    );
  });

  robot.respond(/eliminar documento (.+)/i, (res) =>
    res.send(
      removeDocument(res.match[1].trim())
        ? "Documento eliminado."
        : "No encontré el documento."
    )
  );
};
