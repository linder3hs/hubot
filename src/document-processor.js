// src/document-processor.js - Procesador de documentos optimizado
"use strict";

const fs = require("fs");
const path = require("path");
const { aiService } = require("./ai");
const { config } = require("./config");

class DocumentProcessor {
  constructor() {
    this.store = {
      documents: new Map(),
      embeddings: new Map(),
      metadata: new Map(),
    };
  }

  /**
   * Carga un documento con validación mejorada
   */
  async loadDocument(filePath, name) {
    try {
      // Validaciones
      if (!filePath || !name) {
        throw new Error("Ruta de archivo y nombre son requeridos");
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Verificar formato soportado
      if (!config.documents.supportedFormats.includes(ext)) {
        throw new Error(`Formato no soportado: ${ext}`);
      }

      // Límite de tamaño (10MB)
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error("Archivo demasiado grande (máximo 10MB)");
      }

      // Leer contenido
      const content = fs.readFileSync(filePath, "utf8");

      if (!content.trim()) {
        throw new Error("El archivo está vacío");
      }

      // Almacenar documento
      const doc = {
        content: content.trim(),
        path: path.resolve(filePath),
        name,
        size: stats.size,
        loadedAt: new Date().toISOString(),
        lastModified: stats.mtime.toISOString(),
      };

      this.store.documents.set(name, doc);

      // Generar chunks para búsqueda
      await this.generateChunks(name);

      console.log(`[DOC] Loaded: ${name} (${this.formatSize(stats.size)})`);
      return true;
    } catch (error) {
      console.error(`[DOC] Load error for "${name}":`, error.message);
      return false;
    }
  }

  /**
   * Genera chunks optimizados para búsqueda
   */
  async generateChunks(name) {
    const doc = this.store.documents.get(name);
    if (!doc) return;

    const chunks = this.splitIntoChunks(doc.content);

    // Almacenar chunks con metadata
    this.store.embeddings.set(
      name,
      chunks.map((chunk, index) => ({
        chunk: chunk.trim(),
        index,
        wordCount: chunk.split(/\s+/).length,
        preview: chunk.substring(0, 100) + (chunk.length > 100 ? "..." : ""),
      }))
    );

    this.store.metadata.set(name, {
      chunkCount: chunks.length,
      totalWords: doc.content.split(/\s+/).length,
      avgChunkSize: Math.round(
        chunks.reduce((sum, c) => sum + c.length, 0) / chunks.length
      ),
    });
  }

  /**
   * División inteligente en chunks
   */
  splitIntoChunks(content, maxSize = config.documents.maxChunkSize) {
    // Primero intentar dividir por párrafos
    const paragraphs = content.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      const potentialChunk =
        currentChunk + (currentChunk ? "\n\n" : "") + paragraph;

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        // Si el chunk actual no está vacío, guardarlo
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // Si el párrafo solo es muy largo, dividirlo por oraciones
        if (paragraph.length > maxSize) {
          const sentences = this.splitBySentences(paragraph, maxSize);
          chunks.push(...sentences);
          currentChunk = "";
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  /**
   * División por oraciones para textos muy largos
   */
  splitBySentences(text, maxSize) {
    const sentences = text.split(/[.!?]+\s+/);
    const chunks = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      const potentialChunk =
        currentChunk + (currentChunk ? ". " : "") + sentence;

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + ".");
        }
        currentChunk =
          sentence.length > maxSize
            ? sentence.substring(0, maxSize - 3) + "..."
            : sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + (currentChunk.endsWith(".") ? "" : "."));
    }

    return chunks;
  }

  /**
   * Búsqueda semántica mejorada
   */
  searchInDocument(query, documentName) {
    const embeddings = this.store.embeddings.get(documentName);
    if (!embeddings) return null;

    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter((word) => word.length > 2);

    // Scoring de relevancia
    const scoredChunks = embeddings.map(({ chunk, index, preview }) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      // Puntuación por coincidencias exactas
      keywords.forEach((keyword) => {
        const exactMatches = (chunkLower.match(new RegExp(keyword, "g")) || [])
          .length;
        score += exactMatches * 10;

        // Bonus por coincidencias parciales
        if (chunkLower.includes(keyword)) {
          score += 5;
        }
      });

      // Bonus por múltiples keywords
      const foundKeywords = keywords.filter((k) =>
        chunkLower.includes(k)
      ).length;
      if (foundKeywords > 1) {
        score += foundKeywords * 5;
      }

      return { chunk, index, preview, score };
    });

    // Filtrar y ordenar por relevancia
    const relevantChunks = scoredChunks
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 chunks más relevantes

    return relevantChunks.length > 0
      ? relevantChunks.map((item) => item.chunk).join("\n\n---\n\n")
      : null;
  }

  /**
   * Búsqueda en múltiples documentos
   */
  searchInAllDocuments(query) {
    const results = [];

    for (const [name] of this.store.documents) {
      const result = this.searchInDocument(query, name);
      if (result) {
        results.push({
          document: name,
          content: result,
          relevance: this.calculateRelevance(query, result),
        });
      }
    }

    // Ordenar por relevancia
    results.sort((a, b) => b.relevance - a.relevance);

    return results.length > 0
      ? results
          .map((r) => `**${r.document}:**\n${r.content}`)
          .join("\n\n---\n\n")
      : null;
  }

  /**
   * Calcula relevancia de un resultado
   */
  calculateRelevance(query, content) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);

    let matches = 0;
    queryWords.forEach((qword) => {
      matches += contentWords.filter((cword) => cword.includes(qword)).length;
    });

    return matches / contentWords.length;
  }

  /**
   * Genera respuesta usando AI con contexto de documento
   */
  async generateDocumentResponse(query, documentName = null) {
    try {
      // Buscar contexto relevante
      const context = documentName
        ? this.searchInDocument(query, documentName)
        : this.searchInAllDocuments(query);

      if (!context) {
        const suggestion = documentName
          ? `documento "${documentName}"`
          : "los documentos cargados";
        return `No encontré información sobre "${query}" en ${suggestion}.`;
      }

      // Generar respuesta con AI
      return await aiService.generateDocumentResponse(query, context);
    } catch (error) {
      console.error("[DOC] Response generation error:", error);
      return "Ocurrió un error al procesar tu consulta con el documento.";
    }
  }

  /**
   * Lista documentos con estadísticas
   */
  listDocuments() {
    return Array.from(this.store.documents.entries()).map(([name, doc]) => {
      const meta = this.store.metadata.get(name) || {};
      return {
        name,
        path: doc.path,
        size: this.formatSize(doc.size),
        loadedAt: doc.loadedAt,
        chunks: meta.chunkCount || 0,
        words: meta.totalWords || 0,
      };
    });
  }

  /**
   * Elimina documento
   */
  removeDocument(name) {
    if (!this.store.documents.has(name)) {
      return false;
    }

    this.store.documents.delete(name);
    this.store.embeddings.delete(name);
    this.store.metadata.delete(name);

    console.log(`[DOC] Removed: ${name}`);
    return true;
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getStats() {
    const docs = Array.from(this.store.documents.values());
    const totalSize = docs.reduce((sum, doc) => sum + doc.size, 0);
    const totalChunks = Array.from(this.store.embeddings.values()).reduce(
      (sum, chunks) => sum + chunks.length,
      0
    );

    return {
      documentCount: docs.length,
      totalSize: this.formatSize(totalSize),
      totalChunks,
      memoryUsage: this.formatSize(JSON.stringify(this.store).length),
    };
  }

  /**
   * Formatea tamaño de archivo
   */
  formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Limpia documentos antiguos
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    let cleaned = 0;
    for (const [name, doc] of this.store.documents) {
      if (now - new Date(doc.loadedAt).getTime() > maxAge) {
        this.removeDocument(name);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[DOC] Cleaned ${cleaned} old documents`);
    }
  }
}

// Singleton instance
const documentProcessor = new DocumentProcessor();

// Cleanup periódico
setInterval(() => documentProcessor.cleanup(), 60 * 60 * 1000); // Cada hora

// Legacy compatibility functions
const loadDocument = (path, name) => documentProcessor.loadDocument(path, name);
const generateDocumentBasedResponse = (query, docName) =>
  documentProcessor.generateDocumentResponse(query, docName);
const listLoadedDocuments = () => documentProcessor.listDocuments();
const removeDocument = (name) => documentProcessor.removeDocument(name);

module.exports = {
  DocumentProcessor,
  documentProcessor,
  loadDocument,
  generateDocumentBasedResponse,
  listLoadedDocuments,
  removeDocument,
};
