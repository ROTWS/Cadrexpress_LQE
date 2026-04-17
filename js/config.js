// ============================================
// CADREXPRESS — Configuration et état global
// ============================================

const STATE = {
  apiKey: '',
  model: 'claude-sonnet-4-6',
  maxTokens: 10000,
  context: '',
  currentStep: 1,
  currentSource: 'text',
  sourceContent: '',
  answers: {},
  deliverables: {
    synthese: '',
    maquette: '',
    precadrage: ''
  },
  recognition: null,
  isRecording: false,
  liveFillEnabled: true,
  liveFillTimer: null,
  liveFillLastProcessed: ''
};

// ============================================
// Limites max_tokens par modèle (d'après doc Anthropic)
// ============================================
const MODEL_LIMITS = {
  'claude-opus-4-7': 128000,
  'claude-opus-4-6': 128000,
  'claude-sonnet-4-6': 64000,
  'claude-haiku-4-5-20251001': 64000
};

function getMaxTokensLimit(model) {
  return MODEL_LIMITS[model] || 64000;
}

// ============================================
// CONFIG MODAL
// ============================================
function openConfig() {
  document.getElementById('configModal').classList.add('visible');
  document.getElementById('apiKey').value = STATE.apiKey;
  document.getElementById('modelSelect').value = STATE.model;
  document.getElementById('maxTokens').value = STATE.maxTokens;
  document.getElementById('projectContext').value = STATE.context;
  updateMaxTokensHint();
}

function closeConfig() {
  document.getElementById('configModal').classList.remove('visible');
}

// Met à jour l'indication sous le champ max_tokens selon le modèle
function updateMaxTokensHint() {
  const modelSelect = document.getElementById('modelSelect');
  const hint = document.getElementById('maxTokensHint');
  const input = document.getElementById('maxTokens');
  if (!modelSelect || !hint) return;

  const model = modelSelect.value;
  const limit = getMaxTokensLimit(model);
  hint.textContent = `Limite pour ce modèle : ${limit.toLocaleString('fr-FR')} tokens. Plus = livrables plus riches.`;

  if (input) input.max = limit;
}

function saveConfig() {
  STATE.apiKey = document.getElementById('apiKey').value.trim();
  STATE.model = document.getElementById('modelSelect').value;

  // FIX : pas de fallback silencieux. On respecte ce que l'utilisateur demande,
  // en plafonnant seulement à la limite technique du modèle.
  const rawValue = parseInt(document.getElementById('maxTokens').value);
  const limit = getMaxTokensLimit(STATE.model);

  if (rawValue && rawValue >= 1000) {
    STATE.maxTokens = Math.min(rawValue, limit);
    if (rawValue > limit) {
      alert(`La valeur saisie (${rawValue}) dépasse la limite du modèle ${STATE.model} (${limit} tokens).\n\nLa valeur a été ajustée à ${limit}.`);
      document.getElementById('maxTokens').value = limit;
    }
  } else {
    STATE.maxTokens = 10000;
    document.getElementById('maxTokens').value = 10000;
  }

  STATE.context = document.getElementById('projectContext').value.trim();
  checkApiStatus();
  closeConfig();
}

function checkApiStatus() {
  const dot = document.getElementById('apiStatusDot');
  const txt = document.getElementById('apiStatusText');
  if (STATE.apiKey && STATE.apiKey.startsWith('sk-ant-')) {
    dot.classList.add('ok');
    txt.textContent = STATE.model + ' · ' + STATE.maxTokens.toLocaleString('fr-FR') + ' tokens';
  } else {
    dot.classList.remove('ok');
    txt.textContent = 'API non configurée';
  }
}
