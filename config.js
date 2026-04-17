// ============================================
// CADREXPRESS — Configuration et état global
// ============================================
// Édite ce fichier pour : changer le modèle par défaut, ajouter des paramètres.

const STATE = {
  apiKey: '',
  model: 'claude-sonnet-4-6',
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
  isRecording: false
};

// ============================================
// CONFIG MODAL
// ============================================
function openConfig() {
  document.getElementById('configModal').classList.add('visible');
  document.getElementById('apiKey').value = STATE.apiKey;
  document.getElementById('modelSelect').value = STATE.model;
  document.getElementById('projectContext').value = STATE.context;
}

function closeConfig() {
  document.getElementById('configModal').classList.remove('visible');
}

function saveConfig() {
  STATE.apiKey = document.getElementById('apiKey').value.trim();
  STATE.model = document.getElementById('modelSelect').value;
  STATE.context = document.getElementById('projectContext').value.trim();
  checkApiStatus();
  closeConfig();
}

function checkApiStatus() {
  const dot = document.getElementById('apiStatusDot');
  const txt = document.getElementById('apiStatusText');
  if (STATE.apiKey && STATE.apiKey.startsWith('sk-ant-')) {
    dot.classList.add('ok');
    txt.textContent = 'API configurée · ' + STATE.model;
  } else {
    dot.classList.remove('ok');
    txt.textContent = 'API non configurée';
  }
}
