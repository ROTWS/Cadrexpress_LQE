// ============================================
// CADREXPRESS — Appels API Anthropic
// ============================================

const API_CONFIG = {
  endpoint: 'https://api.anthropic.com/v1/messages',
  anthropicVersion: '2023-06-01',
  temperature: 0.2
};

/**
 * Appelle l'API Claude. Utilise STATE.maxTokens par défaut,
 * sauf si un override explicite est passé.
 */
async function callClaude(messages, systemPrompt, maxTokensOverride = null) {
  const maxTokens = maxTokensOverride || STATE.maxTokens || 10000;

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

function cleanHtmlResponse(raw) {
  return raw.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
}
