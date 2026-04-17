// ============================================
// CADREXPRESS — Configuration et état global
// ============================================

const STATE = {
  apiKey: '',
  model: 'claude-sonnet-4-6',
  maxTokens: 10000,
  context: '',
  customBrand: '',  // NOUVEAU : charte graphique personnalisée
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

const MODEL_LIMITS = {
  'claude-opus-4-7': 128000,
  'claude-opus-4-6': 128000,
  'claude-sonnet-4-6': 64000,
  'claude-haiku-4-5-20251001': 64000
};

function getMaxTokensLimit(model) {
  return MODEL_LIMITS[model] || 64000;
}

function openConfig() {
  document.getElementById('configModal').classList.add('visible');
  document.getElementById('apiKey').value = STATE.apiKey;
  document.getElementById('modelSelect').value = STATE.model;
  document.getElementById('maxTokens').value = STATE.maxTokens;
  document.getElementById('projectContext').value = STATE.context;
  const brandField = document.getElementById('customBrand');
  if (brandField) brandField.value = STATE.customBrand;
  updateMaxTokensHint();
  updateBrandBadge();
}

function closeConfig() {
  document.getElementById('configModal').classList.remove('visible');
}

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

function updateBrandBadge() {
  const badge = document.getElementById('brandBadge');
  if (!badge) return;
  if (STATE.customBrand && STATE.customBrand.trim()) {
    badge.textContent = '✓ Charte active (' + STATE.customBrand.length + ' car.)';
    badge.classList.add('active');
  } else {
    badge.textContent = 'Aucune charte personnalisée';
    badge.classList.remove('active');
  }
}

function saveConfig() {
  STATE.apiKey = document.getElementById('apiKey').value.trim();
  STATE.model = document.getElementById('modelSelect').value;

  const rawValue = parseInt(document.getElementById('maxTokens').value);
  const limit = getMaxTokensLimit(STATE.model);

  if (rawValue && rawValue >= 1000) {
    STATE.maxTokens = Math.min(rawValue, limit);
    if (rawValue > limit) {
      alert(`La valeur saisie (${rawValue}) dépasse la limite du modèle ${STATE.model} (${limit} tokens).\nAjustée à ${limit}.`);
      document.getElementById('maxTokens').value = limit;
    }
  } else {
    STATE.maxTokens = 10000;
    document.getElementById('maxTokens').value = 10000;
  }

  STATE.context = document.getElementById('projectContext').value.trim();

  const brandField = document.getElementById('customBrand');
  if (brandField) STATE.customBrand = brandField.value.trim();

  checkApiStatus();
  closeConfig();
}

// Chargement d'un fichier de charte (design.md, design.txt, etc.)
async function loadBrandFile(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const brandField = document.getElementById('customBrand');
    if (brandField) {
      brandField.value = text;
      updateBrandBadge();
    }
  } catch (e) {
    alert('Erreur lecture du fichier : ' + e.message);
  }
}

function clearBrand() {
  const brandField = document.getElementById('customBrand');
  if (brandField) brandField.value = '';
  updateBrandBadge();
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
