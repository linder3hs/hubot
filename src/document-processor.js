/**
 * Módulo para procesar documentos y extraer información relevante
 * para entrenar al bot con contexto específico
 */

const fs = require('fs');
const path = require('path');
const OpenAI = require("openai");

// Configuración de DeepSeek AI
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-da937a8a5a2c4aea948dfca4d97d9a3f",
});

// Almacenamiento en memoria para documentos cargados
const documentStore = {
  documents: {},
  embeddings: {},
};

/**
 * Carga un documento en el almacenamiento
 * @param {string} documentPath - Ruta al documento
 * @param {string} documentName - Nombre identificativo del documento
 * @returns {Promise<boolean>} - Éxito de la operación
 */
async function loadDocument(documentPath, documentName) {
  try {
    // Verificar que el archivo existe
    if (!fs.existsSync(documentPath)) {
      throw new Error(`El documento no existe en la ruta: ${documentPath}`);
    }

    // Leer el contenido del documento
    const content = fs.readFileSync(documentPath, 'utf8');
    
    // Guardar el documento en el almacenamiento
    documentStore.documents[documentName] = {
      content,
      path: documentPath,
      loadedAt: new Date().toISOString(),
    };

    // Generar embeddings para búsqueda semántica
    await generateEmbeddings(documentName);

    return true;
  } catch (error) {
    console.error(`Error al cargar el documento ${documentName}:`, error);
    return false;
  }
}

/**
 * Genera embeddings para un documento cargado
 * @param {string} documentName - Nombre del documento
 * @returns {Promise<void>}
 */
async function generateEmbeddings(documentName) {
  try {
    const document = documentStore.documents[documentName];
    if (!document) {
      throw new Error(`Documento no encontrado: ${documentName}`);
    }

    // Dividir el documento en chunks para procesar
    const chunks = splitDocumentIntoChunks(document.content);
    
    // Almacenar los chunks y sus embeddings
    documentStore.embeddings[documentName] = [];
    
    for (const [index, chunk] of chunks.entries()) {
      // En una implementación real, aquí se generarían embeddings con la API
      // Por ahora, simulamos el proceso para no consumir tokens innecesarios
      documentStore.embeddings[documentName].push({
        chunk,
        index,
        // En producción: embedding = await openai.embeddings.create(...)
      });
    }
    
    console.log(`Embeddings generados para el documento: ${documentName}`);
  } catch (error) {
    console.error(`Error al generar embeddings para ${documentName}:`, error);
  }
}

/**
 * Divide un documento en chunks más pequeños para procesamiento
 * @param {string} content - Contenido del documento
 * @param {number} maxChunkSize - Tamaño máximo de cada chunk
 * @returns {Array<string>} - Array de chunks
 */
function splitDocumentIntoChunks(content, maxChunkSize = 1000) {
  const paragraphs = content.split('\n\n');
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Busca información relevante en los documentos cargados
 * @param {string} query - Consulta del usuario
 * @param {string} documentName - Nombre del documento (opcional)
 * @returns {Promise<string>} - Contexto relevante encontrado
 */
async function searchInDocuments(query, documentName = null) {
  try {
    // Si se especifica un documento, buscar solo en ese
    if (documentName && documentStore.documents[documentName]) {
      return searchInSpecificDocument(query, documentName);
    }
    
    // Si no se especifica, buscar en todos los documentos cargados
    let allResults = [];
    for (const docName of Object.keys(documentStore.documents)) {
      const result = await searchInSpecificDocument(query, docName);
      if (result) {
        allResults.push(`De ${docName}: ${result}`);
      }
    }
    
    return allResults.length > 0 
      ? allResults.join('\n\n')
      : 'No se encontró información relevante en los documentos cargados.';
  } catch (error) {
    console.error('Error al buscar en documentos:', error);
    return 'Ocurrió un error al buscar en los documentos.';
  }
}

/**
 * Busca información en un documento específico
 * @param {string} query - Consulta del usuario
 * @param {string} documentName - Nombre del documento
 * @returns {Promise<string>} - Contexto relevante encontrado
 */
async function searchInSpecificDocument(query, documentName) {
  // En una implementación real, aquí se usarían los embeddings para búsqueda semántica
  // Por ahora, implementamos una búsqueda simple por palabras clave
  const document = documentStore.documents[documentName];
  if (!document) return null;
  
  const keywords = query.toLowerCase().split(' ');
  const chunks = splitDocumentIntoChunks(document.content);
  
  // Encontrar chunks que contengan las palabras clave
  const relevantChunks = chunks.filter(chunk => {
    const lowerChunk = chunk.toLowerCase();
    return keywords.some(keyword => lowerChunk.includes(keyword));
  });
  
  return relevantChunks.length > 0 
    ? relevantChunks.join('\n\n')
    : null;
}

/**
 * Genera una respuesta basada en el documento y la consulta
 * @param {string} query - Consulta del usuario
 * @param {string} documentName - Nombre del documento (opcional)
 * @returns {Promise<string>} - Respuesta generada
 */
async function generateDocumentBasedResponse(query, documentName = null) {
  try {
    // Buscar información relevante en los documentos
    const relevantContext = await searchInDocuments(query, documentName);
    
    // Si no hay contexto relevante, devolver mensaje informativo
    if (!relevantContext || relevantContext.includes('No se encontró información')) {
      return documentName 
        ? `No encontré información sobre "${query}" en el documento ${documentName}.`
        : `No encontré información sobre "${query}" en los documentos cargados.`;
    }
    
    // Generar respuesta usando DeepSeek AI con el contexto del documento
    const systemPrompt = `Eres un asistente virtual que responde preguntas basándose en la siguiente información:

${relevantContext}

Responde de manera concisa y precisa. Si la información proporcionada no contiene la respuesta, indícalo claramente.`;
    
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ],
      model: "deepseek-chat",
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error al generar respuesta basada en documento:', error);
    return 'Lo siento, tuve un problema al procesar tu consulta con el documento. Por favor, intenta de nuevo más tarde.';
  }
}

/**
 * Lista los documentos cargados actualmente
 * @returns {Array<Object>} - Lista de documentos con metadatos
 */
function listLoadedDocuments() {
  return Object.entries(documentStore.documents).map(([name, doc]) => ({
    name,
    path: doc.path,
    loadedAt: doc.loadedAt,
    size: doc.content.length,
  }));
}

/**
 * Elimina un documento del almacenamiento
 * @param {string} documentName - Nombre del documento a eliminar
 * @returns {boolean} - Éxito de la operación
 */
function removeDocument(documentName) {
  if (documentStore.documents[documentName]) {
    delete documentStore.documents[documentName];
    
    if (documentStore.embeddings[documentName]) {
      delete documentStore.embeddings[documentName];
    }
    
    return true;
  }
  
  return false;
}

module.exports = {
  loadDocument,
  searchInDocuments,
  generateDocumentBasedResponse,
  listLoadedDocuments,
  removeDocument
};
