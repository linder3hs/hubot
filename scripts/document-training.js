// Description:
//   Permite entrenar al bot con documentos y hacer consultas basadas en ellos
//
// Commands:
//   hubot cargar documento <ruta> como <nombre> - Carga un documento para entrenar al bot
//   hubot consultar documento <nombre> sobre <consulta> - Consulta información específica de un documento
//   hubot documentos - Lista los documentos cargados actualmente
//   hubot eliminar documento <nombre> - Elimina un documento cargado

const path = require('path');
const {
  loadDocument,
  generateDocumentBasedResponse,
  listLoadedDocuments,
  removeDocument
} = require('../src/document-processor');

module.exports = function (robot) {
  // Comando para cargar un documento
  robot.respond(/cargar documento (.+) como (.+)/i, async function (res) {
    const documentPath = res.match[1].trim();
    const documentName = res.match[2].trim();
    
    res.send(`Intentando cargar el documento '${documentPath}' como '${documentName}'...`);
    
    try {
      // Intentar cargar el documento
      const success = await loadDocument(documentPath, documentName);
      
      if (success) {
        res.send(`¡Documento '${documentName}' cargado exitosamente! Ahora puedes consultarlo usando 'consultar documento ${documentName} sobre <tu pregunta>'`);
      } else {
        res.send(`No pude cargar el documento. Verifica que la ruta sea correcta y que el archivo exista.`);
      }
    } catch (error) {
      console.error(`Error al cargar documento:`, error);
      res.send(`Ocurrió un error al cargar el documento: ${error.message}`);
    }
  });
  
  // Comando para consultar información de un documento
  robot.respond(/consultar documento (.+) sobre (.+)/i, async function (res) {
    const documentName = res.match[1].trim();
    const query = res.match[2].trim();
    
    res.send(`Buscando información sobre '${query}' en el documento '${documentName}'...`);
    
    try {
      // Generar respuesta basada en el documento
      const response = await generateDocumentBasedResponse(query, documentName);
      res.send(response);
    } catch (error) {
      console.error(`Error al consultar documento:`, error);
      res.send(`Ocurrió un error al consultar el documento: ${error.message}`);
    }
  });
  
  // Comando para consultar en todos los documentos
  robot.respond(/consultar documentos sobre (.+)/i, async function (res) {
    const query = res.match[1].trim();
    
    res.send(`Buscando información sobre '${query}' en todos los documentos cargados...`);
    
    try {
      // Generar respuesta basada en todos los documentos
      const response = await generateDocumentBasedResponse(query);
      res.send(response);
    } catch (error) {
      console.error(`Error al consultar documentos:`, error);
      res.send(`Ocurrió un error al consultar los documentos: ${error.message}`);
    }
  });
  
  // Comando para listar documentos cargados
  robot.respond(/documentos$/i, function (res) {
    const documents = listLoadedDocuments();
    
    if (documents.length === 0) {
      return res.send('No hay documentos cargados actualmente.');
    }
    
    let response = 'Documentos cargados:\n';
    documents.forEach((doc, index) => {
      response += `${index + 1}. ${doc.name} (cargado: ${doc.loadedAt})\n`;
    });
    
    res.send(response);
  });
  
  // Comando para eliminar un documento
  robot.respond(/eliminar documento (.+)/i, function (res) {
    const documentName = res.match[1].trim();
    
    const success = removeDocument(documentName);
    
    if (success) {
      res.send(`Documento '${documentName}' eliminado correctamente.`);
    } else {
      res.send(`No encontré ningún documento con el nombre '${documentName}'.`);
    }
  });
};
