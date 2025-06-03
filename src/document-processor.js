"use strict";

const fs = require("fs");
const path = require("path");
const { generateAIResponse } = require("./ai");

const store = { docs: {}, embeds: {} };

const splitIntoChunks = (content, size = 1_000) => {
  const paragraphs = content.split("\n\n");
  const out = [];
  let chunk = "";
  for (const p of paragraphs) {
    if ((chunk + p).length <= size) {
      chunk += (chunk ? "\n\n" : "") + p;
    } else {
      if (chunk) out.push(chunk);
      chunk = p;
    }
  }
  if (chunk) out.push(chunk);
  return out;
};

const loadDocument = async (file, name) => {
  try {
    if (!fs.existsSync(file)) throw new Error("Archivo inexistente");
    const content = fs.readFileSync(file, "utf8");
    store.docs[name] = {
      content,
      path: path.resolve(file),
      loadedAt: new Date().toISOString(),
    };
    await generateEmbeds(name);
    return true;
  } catch (e) {
    console.error("loadDocument error:", e);
    return false;
  }
};

const generateEmbeds = async (name) => {
  const doc = store.docs[name];
  if (!doc) return;
  const chunks = splitIntoChunks(doc.content);
  store.embeds[name] = chunks.map((chunk, i) => ({ chunk, index: i }));
};

const searchInDocument = (query, name) => {
  const doc = store.docs[name];
  if (!doc) return null;
  const keys = query.toLowerCase().split(" ");
  return splitIntoChunks(doc.content)
    .filter((c) => keys.some((k) => c.toLowerCase().includes(k)))
    .join("\n\n");
};

const searchInDocuments = (query, name = null) => {
  if (name) return searchInDocument(query, name) ?? "";
  return Object.keys(store.docs)
    .map((n) => {
      const r = searchInDocument(query, n);
      return r ? `De ${n}:\n${r}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
};

const generateDocumentBasedResponse = async (query, name = null) => {
  const ctx = searchInDocuments(query, name);
  if (!ctx) return "No encontré información relevante.";
  const prompt = `Eres un asistente virtual que responde usando este contexto:\n\n${ctx}\n\nResponde de forma concisa.`;
  return generateAIResponse(query, prompt);
};

const listLoadedDocuments = () =>
  Object.entries(store.docs).map(([name, d]) => ({
    name,
    path: d.path,
    loadedAt: d.loadedAt,
    size: d.content.length,
  }));

const removeDocument = (name) => {
  if (!store.docs[name]) return false;
  delete store.docs[name];
  delete store.embeds[name];
  return true;
};

module.exports = {
  loadDocument,
  generateDocumentBasedResponse,
  listLoadedDocuments,
  removeDocument,
};
