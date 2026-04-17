// ============================================
// CADREXPRESS — Logique UI et navigation
// ============================================
// Point d'entrée de l'application.
// Édite ce fichier pour : changer la navigation, les logs, le reset.

// ============================================
// Navigation entre écrans
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
}

// ============================================
// Construction dynamique du questionnaire
// ============================================
function buildQuestionnaire() {
  const root = document.getElementById('questionnaire');
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

function updateAnswer(qid, value) {
  STATE.answers[qid] = value;
  const item = document.querySelector(`.q-item[data-qid="${qid}"]`);
  if (value && value.trim()) {
    item.classList.add('q-filled');
  } else {
    item.classList.remove('q-filled');
  }
  updateProgress();
}

function updateProgress() {
  const total = QUESTIONNAIRE.reduce((sum, s) => sum + s.questions.length, 0);
  const filled = Object.values(STATE.answers).filter(v => v && v.toString().trim()).length;
  const pct = Math.round((filled / total) * 100);
  document.getElementById('qFill').style.width = pct + '%';
  document.getElementById('qCount').textContent = filled;
}

// ============================================
// Reset complet
// ============================================
function resetAll() {
  if (!confirm('Effacer toutes les données du cadrage actuel ?')) return;
  STATE.answers = {};
  STATE.sourceContent = '';
  STATE.deliverables = { synthese: '', maquette: '', precadrage: '' };
  document.querySelectorAll('.q-input').forEach(el => el.value = '');
  document.querySelectorAll('.q-item').forEach(el => el.classList.remove('q-filled'));
  document.getElementById('textInput').value = '';
  document.getElementById('dictationText').value = '';
  updateProgress();
  goStep(1);
}

// ============================================
// Log console utilisateur
// ============================================
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

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  buildQuestionnaire();
  setupDragDrop();
  checkApiStatus();
});
