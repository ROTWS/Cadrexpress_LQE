// ============================================
// CADREXPRESS — Logique UI et navigation
// ============================================

function goStep(n) {
  STATE.currentStep = n;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen' + n).classList.add('active');
  document.querySelectorAll('.step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sn === n) s.classList.add('active');
    else if (sn < n) s.classList.add('done');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (n === 2) {
    syncAllAnswersToScreen2();
  }
}

function buildQuestionnaireLive() {
  const root = document.getElementById('questionnaireLive');
  if (!root) return;
  let html = '';
  QUESTIONNAIRE.forEach((sec, si) => {
    html += `<div class="q-section-live" data-section="${si}">
      <div class="q-section-live-header" onclick="this.parentNode.classList.toggle('collapsed')">
        <span>${sec.section}</span>
        <span>${sec.questions.length}</span>
      </div>
      <div class="q-section-live-body">`;
    sec.questions.forEach(q => {
      html += `<div class="q-item-live" data-qid-live="${q.id}">
        <div class="q-item-live-label">${q.label}</div>
        <div class="q-item-live-value q-item-live-empty">En attente...</div>
      </div>`;
    });
    html += `</div></div>`;
  });
  root.innerHTML = html;
  console.log('✓ Questionnaire live construit avec', document.querySelectorAll('.q-item-live').length, 'items');
}

function buildQuestionnaire() {
  const root = document.getElementById('questionnaire');
  if (!root) return;
  let html = '';
  QUESTIONNAIRE.forEach((sec, si) => {
    html += `<div class="q-section" data-section="${si}">
      <div class="q-section-header" onclick="this.parentNode.classList.toggle('collapsed')">
        <span class="q-section-title">${sec.section}</span>
        <span class="q-section-count">${sec.questions.length} questions</span>
      </div>
      <div class="q-section-body">`;
    sec.questions.forEach(q => {
      html += `<div class="q-item" data-qid="${q.id}">
        <div class="q-label">
          <span class="q-number">${q.id.replace('q','Q')}</span>
          <span>${q.label}</span>
        </div>`;
      if (q.help) html += `<div class="q-help">${q.help}</div>`;
      if (q.type === 'textarea') {
        html += `<textarea class="q-input" data-qid="${q.id}" oninput="updateAnswer('${q.id}', this.value)"></textarea>`;
      } else if (q.type === 'select') {
        html += `<select class="q-input" data-qid="${q.id}" onchange="updateAnswer('${q.id}', this.value)">
          <option value="">— Sélectionner —</option>
          ${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}
        </select>`;
      } else {
        html += `<input type="text" class="q-input" data-qid="${q.id}" oninput="updateAnswer('${q.id}', this.value)">`;
      }
      html += `</div>`;
    });
    html += `</div></div>`;
  });
  root.innerHTML = html;
}

// ============================================
// FIX CRITIQUE : mise à jour centralisée et fiable
// ============================================
function updateAnswer(qid, value) {
  // 1. Stocker dans le state (source de vérité)
  STATE.answers[qid] = value;

  // 2. TOUJOURS mettre à jour la vue LIVE (écran 1, colonne droite)
  updateLiveItem(qid, value);

  // 3. Mettre à jour l'input du questionnaire complet (écran 2) si existe
  const input = document.querySelector(`.q-input[data-qid="${qid}"]`);
  if (input && input.value !== value) {
    input.value = value;
  }

  // 4. Marquer l'item comme rempli dans l'écran 2
  const item = document.querySelector(`.q-item[data-qid="${qid}"]`);
  if (item) {
    if (value && value.toString().trim()) {
      item.classList.add('q-filled');
    } else {
      item.classList.remove('q-filled');
    }
  }

  // 5. Mettre à jour les progress bars
  updateProgress();
}

function syncAllAnswersToScreen2() {
  Object.entries(STATE.answers).forEach(([qid, value]) => {
    if (!value) return;
    const input = document.querySelector(`.q-input[data-qid="${qid}"]`);
    if (input) {
      input.value = value;
      const item = document.querySelector(`.q-item[data-qid="${qid}"]`);
      if (item) item.classList.add('q-filled');
    }
  });
  updateProgress();
}

function updateLiveItem(qid, value) {
  const liveItem = document.querySelector(`.q-item-live[data-qid-live="${qid}"]`);
  if (!liveItem) {
    console.warn('⚠ Item live introuvable pour', qid);
    return;
  }

  const valueDiv = liveItem.querySelector('.q-item-live-value');
  if (!valueDiv) return;

  const hasValue = value && value.toString().trim();

  if (hasValue) {
    valueDiv.classList.remove('q-item-live-empty');
    valueDiv.textContent = value;
    liveItem.classList.add('filled');

    liveItem.classList.remove('just-filled');
    void liveItem.offsetWidth;
    liveItem.classList.add('just-filled');

    pulseLiveIndicator();

    if (STATE.currentStep === 1) {
      const container = document.querySelector('.questionnaire-live');
      if (container) {
        const itemTop = liveItem.offsetTop;
        const containerScroll = container.scrollTop;
        const containerHeight = container.clientHeight;
        if (itemTop < containerScroll || itemTop > containerScroll + containerHeight - 80) {
          container.scrollTo({ top: itemTop - 100, behavior: 'smooth' });
        }
      }
    }
  } else {
    valueDiv.classList.add('q-item-live-empty');
    valueDiv.textContent = 'En attente...';
    liveItem.classList.remove('filled', 'just-filled');
  }
}

function pulseLiveIndicator() {
  const ind = document.getElementById('liveIndicator');
  if (!ind) return;
  ind.classList.remove('pulse');
  void ind.offsetWidth;
  ind.classList.add('pulse');
}

function updateProgress() {
  const total = QUESTIONNAIRE.reduce((sum, s) => sum + s.questions.length, 0);
  const filled = Object.values(STATE.answers).filter(v => v && v.toString().trim()).length;
  const pct = Math.round((filled / total) * 100);

  ['qFill', 'qFill2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.width = pct + '%';
  });
  ['qCount', 'qCount2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = filled;
  });
}

function resetAll() {
  if (!confirm('Effacer toutes les données du cadrage actuel ?')) return;
  STATE.answers = {};
  STATE.sourceContent = '';
  STATE.deliverables = { synthese: '', maquette: '', precadrage: '' };
  document.querySelectorAll('.q-input').forEach(el => el.value = '');
  document.querySelectorAll('.q-item').forEach(el => el.classList.remove('q-filled'));
  document.querySelectorAll('.q-item-live').forEach(el => {
    el.classList.remove('filled', 'just-filled');
    const val = el.querySelector('.q-item-live-value');
    if (val) {
      val.classList.add('q-item-live-empty');
      val.textContent = 'En attente...';
    }
  });
  const textInput = document.getElementById('textInput');
  if (textInput) textInput.value = '';
  const dict = document.getElementById('dictationText');
  if (dict) dict.value = '';
  updateProgress();
  goStep(1);
}

function log(screen, msg, type = '') {
  const el = document.getElementById('log' + screen);
  if (!el) return;
  el.classList.add('visible');
  const line = document.createElement('div');
  line.className = 'log-line' + (type ? ' ' + type : '');
  const t = new Date().toTimeString().slice(0,8);
  line.textContent = `[${t}] ${msg}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  buildQuestionnaireLive();
  buildQuestionnaire();
  setupDragDrop();
  checkApiStatus();
  console.log('✓ Cadrexpress initialisé. QUESTIONNAIRE contient', QUESTIONNAIRE.length, 'sections.');
});
