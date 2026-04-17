// ============================================
// CADREXPRESS — Sources d'entrée
// ============================================

let audioFileData = null;
let pdfFileData = null;

const LIVE_FILL_INTERVAL_MS = 10000;
const LIVE_FILL_MIN_CHARS = 80;

function selectSource(type, el) {
  STATE.currentSource = type;
  document.querySelectorAll('.source-card, .source-card-compact').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.input-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + type);
  if (panel) panel.classList.add('active');
  console.log('Source sélectionnée :', STATE.currentSource);
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

async function handleAudio(file) {
  if (!file) return;
  audioFileData = file;
  STATE.currentSource = 'audio';
  const info = document.getElementById('audioInfo');
  info.classList.add('visible');
  info.textContent = `✓ ${file.name} (${(file.size/1024/1024).toFixed(2)} Mo) — transcription audio non disponible, utilisez la dictée live.`;
}

async function transcribeAudio(file) {
  throw new Error('La transcription audio via API n\'est pas encore supportée. Utilisez la dictée live (🎤) ou collez une transcription (📝).');
}

async function handlePdf(file) {
  if (!file) return;
  pdfFileData = file;
  STATE.currentSource = 'pdf';
  const info = document.getElementById('pdfInfo');
  info.classList.add('visible');
  info.innerHTML = `
    ✓ <strong>${file.name}</strong> (${(file.size/1024).toFixed(1)} Ko) prêt.<br>
    👉 Cliquez ensuite sur <strong>"⚡ Analyser maintenant"</strong> pour lancer l'extraction.
  `;
  log(1, '📄 Fichier chargé : ' + file.name);
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    log(1, '⏳ Chargement du lecteur PDF...');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const ab = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise;
  log(1, '📖 PDF ouvert : ' + pdf.numPages + ' page(s)');
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

  STATE.currentSource = 'dictation';

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

  const delta = current.length - STATE.liveFillLastProcessed.length;
  if (!isFinal && delta < LIVE_FILL_MIN_CHARS) return;
  if (current === STATE.liveFillLastProcessed) return;

  STATE.liveFillLastProcessed = current;

  try {
    log(1, '⏳ Analyse en cours (' + current.length + ' caractères)...');
    const systemPrompt = buildExtractionPrompt();
    const userMsg = `Voici le contenu dicté jusqu'ici :\n\n---\n${current}\n---\n\nRetourne uniquement le JSON. Pour les champs dont tu n'es pas sûr, laisse "". Ne cherche pas à tout remplir.`;
    const raw = await callClaude([{ role: 'user', content: userMsg }], systemPrompt, 4096);
    const extracted = parseJsonResponse(raw);

    let filled = 0;
    Object.entries(extracted).forEach(([qid, val]) => {
      if (!val) return;
      // FIX CRITIQUE : on appelle updateAnswer directement, qui s'occupe de tout synchroniser
      updateAnswer(qid, val);
      filled++;
    });

    if (filled > 0) {
      log(1, '✓ ' + filled + ' champ(s) mis à jour', 'success');
    }

    STATE.sourceContent = current;
  } catch (e) {
    log(1, '✗ Erreur analyse live : ' + e.message, 'error');
  }
}

async function analyzeSource() {
  if (!STATE.apiKey) {
    alert('Veuillez d\'abord configurer votre clé API (bouton ⚙ en haut).');
    openConfig();
    return;
  }

  let actualSource = STATE.currentSource;
  const activePanel = document.querySelector('.input-panel.active');
  if (activePanel) {
    const panelId = activePanel.id.replace('panel-', '');
    actualSource = panelId;
    STATE.currentSource = panelId;
  }

  console.log('Analyse de la source :', actualSource);

  let content = '';

  if (actualSource === 'text') {
    content = document.getElementById('textInput').value.trim();
    if (!content) {
      alert('⚠ Zone de texte vide.\n\nSi vous vouliez utiliser un PDF ou la dictée, cliquez d\'abord sur l\'onglet correspondant puis déposez/enregistrez votre contenu.');
      return;
    }
  } else if (actualSource === 'dictation') {
    content = document.getElementById('dictationText').value.trim();
    if (!content) {
      alert('Veuillez d\'abord enregistrer une dictée (cliquez sur le micro).');
      return;
    }
  } else if (actualSource === 'audio') {
    if (!audioFileData) { alert('Veuillez d\'abord déposer un fichier audio.'); return; }
    try {
      content = await transcribeAudio(audioFileData);
    } catch (e) {
      log(1, '✗ ' + e.message, 'error');
      alert(e.message);
      return;
    }
  } else if (actualSource === 'pdf') {
    if (!pdfFileData) {
      alert('Veuillez d\'abord déposer un fichier PDF (onglet 📄).');
      return;
    }
    log(1, '⏳ Extraction du texte du PDF...');

    if (pdfFileData.type === 'application/pdf') {
      try {
        content = await extractPdfText(pdfFileData);
        log(1, '✓ PDF lu : ' + content.length + ' caractères extraits', 'success');

        if (!content.trim()) {
          const msg = '❌ Aucun texte trouvé dans ce PDF.\n\nIl est probablement scanné (image).';
          alert(msg);
          log(1, '✗ PDF vide ou scanné (OCR requis)', 'error');
          return;
        }
      } catch (e) {
        log(1, '✗ Erreur PDF: ' + e.message, 'error');
        alert('Erreur lors de la lecture du PDF : ' + e.message);
        return;
      }
    } else {
      content = await pdfFileData.text();
      log(1, '✓ Texte lu : ' + content.length + ' caractères', 'success');
    }
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

    const nbFilled = Object.keys(extracted).filter(k => extracted[k]).length;
    log(1, '✓ ' + nbFilled + ' champs pré-remplis', 'success');

    // FIX CRITIQUE : on appelle UNIQUEMENT updateAnswer qui s'occupe de tout
    // (vue live + input + progress). Plus de manipulation directe des éléments.
    Object.entries(extracted).forEach(([qid, val]) => {
      if (!val) return;
      updateAnswer(qid, val);
    });

    console.log('Après extraction : STATE.answers contient', Object.keys(STATE.answers).length, 'entrées');
    console.log('Items .q-item-live.filled :', document.querySelectorAll('.q-item-live.filled').length);

    if (nbFilled === 0) {
      alert('⚠ Claude n\'a trouvé aucune information exploitable dans le document.');
    } else {
      log(1, '🎉 ' + nbFilled + ' champs affichés à droite !', 'success');
    }
  } catch (e) {
    log(1, '✗ Erreur : ' + e.message, 'error');
    alert('Erreur lors de l\'analyse : ' + e.message);
  }
}
