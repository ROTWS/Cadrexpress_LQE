// ============================================
// CADREXPRESS — Sources d'entrée
// ============================================

let audioFileData = null;
let pdfFileData = null;

const LIVE_FILL_INTERVAL_MS = 10000;   // toutes les 10s pendant la dictée
const LIVE_FILL_MIN_CHARS = 80;        // ne rien faire sous 80 caractères nouveaux

// ============================================
// Sélection source + drag/drop
// ============================================
function selectSource(type, el) {
  STATE.currentSource = type;
  document.querySelectorAll('.source-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + type).classList.add('active');
}

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
// Audio (placeholder)
// ============================================
async function handleAudio(file) {
  if (!file) return;
  audioFileData = file;
  const info = document.getElementById('audioInfo');
  info.classList.add('visible');
  info.textContent = `✓ ${file.name} (${(file.size/1024/1024).toFixed(2)} Mo) — transcription audio non disponible pour le moment, utilisez la dictée live.`;
}

async function transcribeAudio(file) {
  throw new Error('La transcription audio via API n\'est pas encore supportée. Utilisez la dictée live (🎤) ou collez une transcription (📝).');
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
// DICTÉE LIVE (Web Speech API) + pré-remplissage continu
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
    stopLiveFillLoop();
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
    status.textContent = '🔴 Enregistrement · parlez naturellement';
    startLiveFillLoop();
  };

  STATE.recognition.onend = () => {
    STATE.isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
    status.textContent = 'Arrêté — cliquez pour reprendre';
    stopLiveFillLoop();
    // Traiter une dernière fois le contenu restant
    triggerLiveFill(true);
  };

  STATE.recognition.onerror = (e) => {
    log(1, 'Erreur dictée: ' + e.error, 'error');
    STATE.isRecording = false;
    btn.classList.remove('recording');
    btn.textContent = '🎤';
    stopLiveFillLoop();
  };

  STATE.recognition.start();
}

// ============================================
// Boucle de pré-remplissage en direct
// ============================================
function startLiveFillLoop() {
  const toggle = document.getElementById('liveFillToggle');
  STATE.liveFillEnabled = toggle && toggle.checked;
  STATE.liveFillLastProcessed = '';

  if (!STATE.liveFillEnabled) return;

  if (!STATE.apiKey) {
    log(1, '⚠ Pré-remplissage en direct désactivé : clé API manquante', 'error');
    return;
  }

  STATE.liveFillTimer = setInterval(() => triggerLiveFill(false), LIVE_FILL_INTERVAL_MS);
  log(1, '🔴 Pré-remplissage en direct actif (toutes les ' + (LIVE_FILL_INTERVAL_MS/1000) + 's)', 'success');
}

function stopLiveFillLoop() {
  if (STATE.liveFillTimer) {
    clearInterval(STATE.liveFillTimer);
    STATE.liveFillTimer = null;
  }
}

async function triggerLiveFill(isFinal) {
  if (!STATE.liveFillEnabled && !isFinal) return;
  if (!STATE.apiKey) return;

  const current = document.getElementById('dictationText').value.trim();
  if (!current) return;

  // N'envoyer que si suffisamment de nouveau contenu
  const delta = current.length - STATE.liveFillLastProcessed.length;
  if (!isFinal && delta < LIVE_FILL_MIN_CHARS) return;
  if (current === STATE.liveFillLastProcessed) return;

  STATE.liveFillLastProcessed = current;

  try {
    log(1, '⏳ Analyse en cours (' + current.length + ' caractères)...');
    const systemPrompt = buildExtractionPrompt();
    const userMsg = `Voici le contenu dicté jusqu'ici :\n\n---\n${current}\n---\n\nRetourne uniquement le JSON. Pour les champs dont tu n'es pas sûr, laisse "". Ne cherche pas à tout remplir.`;

    // Max_tokens réduit pour l'extraction live (plus rapide)
    const raw = await callClaude([{ role: 'user', content: userMsg }], systemPrompt, 4096);
    const extracted = parseJsonResponse(raw);

    let filled = 0;
    Object.entries(extracted).forEach(([qid, val]) => {
      if (!val) return;
      const el = document.querySelector(`[data-qid="${qid}"]`);
      if (el && el.tagName !== 'DIV') {
        const prev = el.value;
        if (prev !== val) {
          el.value = val;
          updateAnswer(qid, val);
          const item = document.querySelector(`.q-item[data-qid="${qid}"]`);
          if (item) {
            item.classList.remove('just-filled');
            void item.offsetWidth;
            item.classList.add('just-filled');
          }
          filled++;
        }
      }
    });

    if (filled > 0) {
      log(1, '✓ ' + filled + ' champ(s) mis à jour', 'success');
    }

    STATE.sourceContent = current;
  } catch (e) {
    log(1, '✗ Erreur analyse live : ' + e.message, 'error');
  }
}

// ============================================
// Analyse de la source (déclenchée manuellement)
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

    log(1, '✓ ' + Object.keys(extracted).filter(k => extracted[k]).length + ' champs pré-remplis', 'success');

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
