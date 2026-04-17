// ============================================
// CADREXPRESS — Orchestration de la génération
// ============================================

const GENERATION_CONFIG = {
  synthese: { cardId: 'genCard1', statusId: 'genStatus1', previewId: 'preview1' },
  maquette: { cardId: 'genCard2', statusId: 'genStatus2', previewId: 'preview2' },
  precadrage: { cardId: 'genCard3', statusId: 'genStatus3', previewId: 'preview3' }
};

async function startGeneration() {
  if (!STATE.apiKey) {
    alert('Veuillez d\'abord configurer votre clé API.');
    openConfig();
    return;
  }

  ['genCard1','genCard2','genCard3'].forEach(id => {
    const c = document.getElementById(id);
    c.classList.remove('active','done');
  });
  document.getElementById('log3').innerHTML = '';

  const context = buildGenerationContext();

  try {
    await generateDeliverable('synthese', context, buildSynthesePrompt());
    await generateDeliverable('maquette', context, buildMaquettePrompt());
    await generateDeliverable('precadrage', context, buildPrecadragePrompt());
    log(3, '✓ Tous les livrables sont prêts !', 'success');
    setTimeout(() => goStep(4), 1000);
  } catch (e) {
    log(3, '✗ Génération interrompue : ' + e.message, 'error');
  }
}

function buildGenerationContext() {
  const answersBlock = Object.entries(STATE.answers)
    .filter(([k,v]) => v && v.toString().trim())
    .map(([k,v]) => {
      const q = QUESTIONNAIRE.flatMap(s => s.questions).find(x => x.id === k);
      return `- ${q ? q.label : k}: ${v}`;
    }).join('\n');

  return `CONTEXTE DU CADRAGE :\n${answersBlock}\n\n${
    STATE.sourceContent ? 'SOURCE BRUTE (extrait) :\n' + STATE.sourceContent.substring(0, 2000) : ''
  }`;
}

async function generateDeliverable(name, context, systemPrompt) {
  const cfg = GENERATION_CONFIG[name];
  const card = document.getElementById(cfg.cardId);
  card.classList.add('active');
  document.getElementById(cfg.statusId).textContent = 'En cours...';
  log(3, '⏳ Génération : ' + name + ' (' + STATE.maxTokens + ' tokens max)...');

  try {
    let result = await callClaude([{ role: 'user', content: context }], systemPrompt);
    if (name === 'maquette') {
      result = cleanHtmlResponse(result);
    }
    STATE.deliverables[name] = result;

    const preview = document.getElementById(cfg.previewId);
    if (name === 'maquette') {
      preview.textContent = 'Maquette HTML (' + Math.round(result.length/1024) + ' Ko). Cliquez sur "Ouvrir" pour la visualiser.';
    } else {
      preview.textContent = result.substring(0, 400) + '...';
    }

    card.classList.remove('active');
    card.classList.add('done');
    document.getElementById(cfg.statusId).textContent = '✓ Terminé';
    log(3, '✓ ' + name + ' généré (' + Math.round(result.length/1024) + ' Ko)', 'success');
  } catch (e) {
    card.classList.remove('active');
    log(3, '✗ Erreur ' + name + ' : ' + e.message, 'error');
    throw e;
  }
}

// ============================================
// Téléchargement des livrables
// ============================================
function download(name, ext) {
  const content = STATE.deliverables[name];
  if (!content) { alert('Livrable non généré.'); return; }
  const mimeMap = { md: 'text/markdown', html: 'text/html' };
  const blob = new Blob([content], { type: mimeMap[ext] || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().slice(0,10);
  a.download = `cadrexpress_${name}_${stamp}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

function preview(name) {
  const content = STATE.deliverables[name];
  if (!content) return;
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Aperçu ${name}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:2rem auto;padding:2rem;line-height:1.6;color:#00205b;}pre{background:#f7faff;padding:1rem;overflow-x:auto;white-space:pre-wrap;border-left:3px solid #0084d4;}</style></head><body><pre>${content.replace(/</g,'&lt;')}</pre></body></html>`);
}

function openMaquette() {
  const content = STATE.deliverables.maquette;
  if (!content) return;
  const w = window.open('', '_blank');
  w.document.write(content);
  w.document.close();
}

// ============================================
// Téléchargement du questionnaire complété
// ============================================
function downloadQuestionnaire(format) {
  const stamp = new Date().toISOString().slice(0,10);

  if (format === 'md') {
    let md = '# Questionnaire de cadrage Cadrexpress\n\n';
    md += `*Date : ${new Date().toLocaleDateString('fr-FR')}*\n\n`;
    const filled = Object.values(STATE.answers).filter(v => v && v.toString().trim()).length;
    md += `*Complétion : ${filled} / 65 questions*\n\n---\n\n`;

    QUESTIONNAIRE.forEach(sec => {
      md += `## ${sec.section}\n\n`;
      sec.questions.forEach(q => {
        const val = STATE.answers[q.id] || '';
        md += `**${q.id.replace('q','Q')}. ${q.label}**\n\n`;
        md += val ? val + '\n\n' : '_(non renseigné)_\n\n';
      });
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadrexpress_questionnaire_${stamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === 'html') {
    let html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Questionnaire Cadrexpress</title><style>
      body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; color: #00205b; line-height: 1.6; }
      h1 { color: #00205b; border-bottom: 3px solid #0084d4; padding-bottom: 0.5rem; }
      h2 { color: #00205b; background: #f0f2f7; padding: 0.6rem 1rem; margin-top: 2rem; border-left: 4px solid #0084d4; }
      .q { margin-bottom: 1.2rem; padding-bottom: 1rem; border-bottom: 1px dashed #d9d9d9; }
      .q-label { font-weight: 500; margin-bottom: 0.3rem; }
      .q-number { background: #d9d9d9; padding: 2px 8px; border-radius: 3px; font-size: 0.85rem; margin-right: 0.5rem; }
      .q-filled .q-number { background: #00b388; color: white; }
      .q-value { padding: 0.5rem 1rem; background: #f7faff; border-left: 3px solid #a4c8e1; white-space: pre-wrap; }
      .q-empty { color: #999; font-style: italic; padding: 0.5rem 1rem; }
      .meta { color: #5a6478; font-size: 0.9rem; margin-bottom: 2rem; }
      @media print { body { padding: 0; max-width: 100%; } h2 { page-break-after: avoid; } .q { page-break-inside: avoid; } }
    </style></head><body>
    <h1>Questionnaire de cadrage Cadrexpress</h1>
    <div class="meta">Date : ${new Date().toLocaleDateString('fr-FR')} · Complétion : ${Object.values(STATE.answers).filter(v => v && v.toString().trim()).length} / 65</div>`;

    QUESTIONNAIRE.forEach(sec => {
      html += `<h2>${sec.section}</h2>`;
      sec.questions.forEach(q => {
        const val = STATE.answers[q.id] || '';
        const filled = val && val.toString().trim();
        html += `<div class="q ${filled ? 'q-filled' : ''}">
          <div class="q-label"><span class="q-number">${q.id.replace('q','Q')}</span>${q.label}</div>
          ${filled ? `<div class="q-value">${escapeHtml(val)}</div>` : '<div class="q-empty">(non renseigné)</div>'}
        </div>`;
      });
    });

    html += '</body></html>';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadrexpress_questionnaire_${stamp}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function printQuestionnaire() {
  // Générer un HTML imprimable et déclencher la boîte d'impression
  const stamp = new Date().toLocaleDateString('fr-FR');
  let html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Questionnaire Cadrexpress</title><style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 2rem; color: #00205b; line-height: 1.6; }
    h1 { color: #00205b; border-bottom: 3px solid #0084d4; padding-bottom: 0.5rem; }
    h2 { color: #00205b; background: #f0f2f7; padding: 0.6rem 1rem; margin-top: 2rem; border-left: 4px solid #0084d4; }
    .q { margin-bottom: 1.2rem; padding-bottom: 1rem; border-bottom: 1px dashed #d9d9d9; }
    .q-label { font-weight: 500; margin-bottom: 0.3rem; }
    .q-number { background: #d9d9d9; padding: 2px 8px; border-radius: 3px; font-size: 0.85rem; margin-right: 0.5rem; }
    .q-filled .q-number { background: #00b388; color: white; }
    .q-value { padding: 0.5rem 1rem; background: #f7faff; border-left: 3px solid #a4c8e1; white-space: pre-wrap; }
    .q-empty { color: #999; font-style: italic; padding: 0.5rem 1rem; }
    @media print { body { padding: 0; } h2 { page-break-after: avoid; } .q { page-break-inside: avoid; } }
  </style></head><body>
  <h1>Questionnaire de cadrage Cadrexpress</h1>
  <div>Date : ${stamp}</div>`;

  QUESTIONNAIRE.forEach(sec => {
    html += `<h2>${sec.section}</h2>`;
    sec.questions.forEach(q => {
      const val = STATE.answers[q.id] || '';
      const filled = val && val.toString().trim();
      html += `<div class="q ${filled ? 'q-filled' : ''}">
        <div class="q-label"><span class="q-number">${q.id.replace('q','Q')}</span>${q.label}</div>
        ${filled ? `<div class="q-value">${escapeHtml(val)}</div>` : '<div class="q-empty">(non renseigné)</div>'}
      </div>`;
    });
  });

  html += '<script>window.onload = () => setTimeout(() => window.print(), 500);</script></body></html>';

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
