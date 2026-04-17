// ============================================
// CADREXPRESS — Appels API Anthropic
// ============================================
// Édite ce fichier pour : changer la température, les paramètres API,
// ajouter la gestion des erreurs personnalisée.

const API_CONFIG = {
  endpoint: 'https://api.anthropic.com/v1/messages',
  anthropicVersion: '2023-06-01',
  temperature: 0.2,  // faible = reproductibilité
  defaultMaxTokens: 4096
};

/**
 * Appelle l'API Claude.
 * @param {Array} messages - Messages au format {role, content}
 * @param {string} systemPrompt - Prompt système
 * @param {number} maxTokens - Nombre maximum de tokens à générer
 * @returns {Promise<string>} Le texte concaténé de la réponse
 */
async function callClaude(messages, systemPrompt, maxTokens = API_CONFIG.defaultMaxTokens) {
  const res = await fetch(API_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': STATE.apiKey,
      'anthropic-version': API_CONFIG.anthropicVersion,
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: STATE.model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages,
      temperature: API_CONFIG.temperature
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('API ' + res.status + ': ' + err);
  }

  const data = await res.json();
  return data.content.map(c => c.text || '').join('');
}

/**
 * Nettoie une réponse JSON de Claude (supprime backticks éventuels).
 * @param {string} raw - Réponse brute
 * @returns {Object} Objet JSON parsé
 */
function parseJsonResponse(raw) {
  let clean = raw.trim();
  clean = clean.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(clean);
}

/**
 * Nettoie une réponse HTML de Claude.
 * @param {string} raw - Réponse brute
 * @returns {string} HTML propre
 */
function cleanHtmlResponse(raw) {
  return raw.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
}
