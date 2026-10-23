// Ember Add-On: Document Reading (www/ai_docs.js)
// Defines tool schemas and stub handlers for reading documents from the vault.
// Connects to Conduint Files / Bojack Secures vault path via EmberDocs bridge,
// or falls back gracefully when the bridge is absent.
'use strict';
(() => {

// ---------- tool schema ----------
const DOCS_TOOLS = [
  {
    name: 'list_documents',
    description: 'Returns a list of all documents in the vault (name, fileId, type, size).',
    parameters: {}
  },
  {
    name: 'search_documents',
    description: 'Finds documents whose name or content matches the query string.',
    parameters: { query: 'string' }
  },
  {
    name: 'read_document',
    description: 'Returns the full text content of a specific document by fileId.',
    parameters: { fileId: 'string' }
  },
  {
    name: 'summarize_document',
    description: 'Reads a document by fileId and returns a short summary of its contents.',
    parameters: { fileId: 'string' }
  }
];

// ---------- handlers ----------

async function list_documents() {
  try {
    if (window.EmberDocs && typeof window.EmberDocs.listDocuments === 'function') {
      return await window.EmberDocs.listDocuments();
    }
    return { documents: [], note: 'Document bridge not connected.' };
  } catch (e) {
    return { error: e.message || 'Could not list documents.' };
  }
}

async function search_documents(query) {
  if (!query || !query.trim()) return { results: [] };
  try {
    if (window.EmberDocs && typeof window.EmberDocs.searchDocuments === 'function') {
      return await window.EmberDocs.searchDocuments({ query: query.trim() });
    }
    // Client-side fallback: list all and filter by name
    const { documents = [] } = await list_documents();
    const q = query.trim().toLowerCase();
    const results = documents.filter(d => d.name && d.name.toLowerCase().includes(q));
    return { results };
  } catch (e) {
    return { error: e.message || 'Document search failed.' };
  }
}

async function read_document(fileId) {
  if (!fileId) return { error: 'fileId is required.' };
  try {
    if (window.EmberDocs && typeof window.EmberDocs.readDocument === 'function') {
      const result = await window.EmberDocs.readDocument({ fileId });
      // Truncate to ~8000 chars to stay inside the context window
      if (result && result.content && result.content.length > 8000) {
        result.content = result.content.slice(0, 8000) + '\n[...truncated for length]';
        result.truncated = true;
      }
      return result;
    }
    return { content: null, note: 'Document bridge not connected.' };
  } catch (e) {
    return { error: e.message || 'Could not read document.' };
  }
}

// summarize_document reads the file then asks the AI inline.
// We return the raw text + a flag so ai.js can decide whether to
// send it back to the model for summarisation (avoids a double round-trip
// if the caller is already inside an AI turn).
async function summarize_document(fileId) {
  if (!fileId) return { error: 'fileId is required.' };
  try {
    const doc = await read_document(fileId);
    if (doc.error) return doc;
    if (!doc.content) return { summary: null, note: 'Document has no readable text.' };
    // Return the raw text; ai.js will include it in the next AI reply as context.
    // The AI's system prompt already tells it to summarise when this tool is called.
    return { fileId, rawText: doc.content.slice(0, 6000), needsSummary: true };
  } catch (e) {
    return { error: e.message || 'Could not summarise document.' };
  }
}

// ---------- dispatcher ----------
async function dispatch(name, args) {
  switch (name) {
    case 'list_documents':    return list_documents();
    case 'search_documents':  return search_documents(args.query);
    case 'read_document':     return read_document(args.fileId);
    case 'summarize_document': return summarize_document(args.fileId);
    default: return { error: 'Unknown doc tool: ' + name };
  }
}

window.EmberDocsAddon = { TOOLS: DOCS_TOOLS, dispatch };
})();
