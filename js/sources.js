// ============================================
// CADREXPRESS — Gestion des sources d'entrée
// ============================================
// Édite ce fichier pour : ajouter une nouvelle source d'entrée,
// changer la logique de transcription/extraction.

let audioFileData = null;
let pdfFileData = null;

// ============================================
// Sélection de source
// ============================================
function selectSource(type, el) {
  STATE.currentSource = type;
  document.querySelectorAll('.source-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + type).classList.add('active');
}

// ============================================
// Drag & drop
// ============================================
function setupDragDrop() {
  ['audioDrop', 'pdfDrop'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    ['dragover', 'dragenter'].forEach(ev => el.addEventListener(ev, e => {
      e.preventDefault();
      el.classList.add('dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => el.addEventListener(ev, e => {
      e.preventDefault();
      el.classList.remove('dragover');
    }));
    el.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0];
      if (id === 'audioDrop') handleAudio(f);
      else handlePdf(f);
    });
  });
}

// ============================================
// Audio
// ============================================
async function handleAudio(file) {
  if (!file) return;
  audioFileData = file;
  const info = document.getElementById('audioInfo');
  info.classList.add('visible');
  info.textContent = `✓ ${file.name} (${(file.size/1024/1024).toFixed(2)} Mo) prêt pour transcription`;
}

async function transcribeAudio(file) {
  // L'API Claude ne traite pas nativement l'audio depuis le navigateur.
  // Alternative : utiliser la dictée live ou coller une transcription.
  throw new Error('La transcription audio via API n\'est pas supportée directement. Utilisez la dictée live (🎤) ou collez une transcription (📝).');
}

// ============================================
// PDF
// ============================================
async function handlePdf(file) {
  if (!file) return;
  pdfFileData = file;
  const info = document.getElementById('pdfInfo');
  info.classList.add('visible');
  info.textContent = `✓ ${file.name} (${(file.size/1024).toFixed(1)} Ko) prêt pour analyse`;
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const ab = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map(it => it.str).join(' ') + '\n\n';
  }
  return text;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ============================================
// Dictée live (Web Speech API)
// ============================================
function toggleDictation() {
  const btn = document.getElementById('micBtn');
  const status = document.getElementById('micStatus');

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    status.textContent = '❌ Non supporté (utilisez Chrome ou Edge)';
    return;
  }

  if (STATE.isRecording) {
    STATE.recognition.stop();
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  STATE.recognition = new SR();
  STATE.recognition.lang = 'fr-FR';
  STATE.recognition.continuous = true;
  STATE.recognition.interimResults = true;

  const ta = document.getElementById('dictationText');
  let finalText = ta.value || '';

  STATE.recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalText += e.results[i][0].transcript + ' ';
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    ta.value = finalText + interim;
  };

  STATE.recognition.onstart = () => {
    STATE.isRecording = true;
    btn.classList.add('recording');
    btn.textContent = '⏹';
    status.textContent = 'Enregistrement en cours...';
  };

  STATE.recognition.onend = () => {
    STATE.isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
    status.textContent = 'Cliquez pour reprendre';
  };

  STATE.recognition.onerror = (e) => {
    log(1, 'Erreur dictée: ' + e.error, 'error');
    STATE.isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
  };

  STATE.recognition.start();
}

// ============================================
// Analyse de la source → pré-remplissage
// ============================================
async function analyzeSource() {
  if (!STATE.apiKey) {
    alert('Veuillez d\'abord configurer votre clé API (bouton ⚙ en haut).');
    openConfig();
    return;
  }

  let content = '';
  if (STATE.currentSource === 'text') {
    content = document.getElementById('textInput').value.trim();
  } else if (STATE.currentSource === 'dictation') {
    content = document.getElementById('dictationText').value.trim();
  } else if (STATE.currentSource === 'audio') {
    if (!audioFileData) { alert('Veuillez d\'abord déposer un fichier audio.'); return; }
    log(1, '⏳ Transcription audio...');
    try {
      content = await transcribeAudio(audioFileData);
    } catch (e) {
      log(1, '✗ ' + e.message, 'error');
      return;
    }
  } else if (STATE.currentSource === 'pdf') {
    if (!pdfFileData) { alert('Veuillez d\'abord déposer un fichier PDF.'); return; }
    log(1, '⏳ Lecture du fichier...');
    if (pdfFileData.type === 'application/pdf') {
      try {
        content = await extractPdfText(pdfFileData);
        log(1, '✓ PDF lu (' + content.length + ' caractères)', 'success');
      } catch (e) {
        log(1, '✗ Erreur PDF: ' + e.message, 'error');
        return;
      }
    } else {
      content = await pdfFileData.text();
    }
  } else if (STATE.currentSource === 'manual') {
    goStep(2);
    return;
  }

  if (!content) {
    alert('Aucun contenu à analyser.');
    return;
  }

  STATE.sourceContent = content;
  log(1, '⏳ Analyse et extraction par Claude...');

  try {
    const systemPrompt = buildExtractionPrompt();
    const userMsg = `Voici le contenu à analyser :\n\n---\n${content}\n---\n\nRetourne uniquement le JSON.`;
    const raw = await callClaude([{ role: 'user', content: userMsg }], systemPrompt, 4096);
    const extracted = parseJsonResponse(raw);

    log(1, '✓ ' + Object.keys(extracted).length + ' champs analysés', 'success');

    // Injecter les réponses
    Object.entries(extracted).forEach(([qid, val]) => {
      if (!val) return;
      const el = document.querySelector(`[data-qid="${qid}"]`);
      if (el && el.tagName !== 'DIV') {
        el.value = val;
        updateAnswer(qid, val);
      }
    });

    setTimeout(() => goStep(2), 800);
  } catch (e) {
    log(1, '✗ Erreur : ' + e.message, 'error');
  }
}
