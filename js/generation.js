// ============================================
// CADREXPRESS — Orchestration de la génération
// ============================================
// Édite ce fichier pour : ajouter un 4e livrable, changer l'ordre,
// ajuster les nombres max de tokens par livrable.

const GENERATION_CONFIG = {
  synthese: { maxTokens: 6000, cardId: 'genCard1', statusId: 'genStatus1', previewId: 'preview1' },
  maquette: { maxTokens: 8000, cardId: 'genCard2', statusId: 'genStatus2', previewId: 'preview2' },
  precadrage: { maxTokens: 6000, cardId: 'genCard3', statusId: 'genStatus3', previewId: 'preview3' }
};

// ============================================
// Point d'entrée
// ============================================
async function startGeneration() {
  if (!STATE.apiKey) {
    alert('Veuillez d\'abord configurer votre clé API.');
    openConfig();
    return;
  }

  // Reset UI
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

// ============================================
// Construction du contexte envoyé à chaque livrable
// ============================================
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

// ============================================
// Génération d'un livrable (générique)
// ============================================
async function generateDeliverable(name, context, systemPrompt) {
  const cfg = GENERATION_CONFIG[name];
  const card = document.getElementById(cfg.cardId);
  card.classList.add('active');
  document.getElementById(cfg.statusId).textContent = 'En cours...';
  log(3, '⏳ Génération : ' + name + '...');

  try {
    let result = await callClaude([{ role: 'user', content: context }], systemPrompt, cfg.maxTokens);
    if (name === 'maquette') {
      result = cleanHtmlResponse(result);
    }
    STATE.deliverables[name] = result;

    // Preview
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
// Téléchargements et aperçus
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
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Aperçu ${name}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:2rem;line-height:1.6;}pre{background:#f5f5f5;padding:1rem;overflow-x:auto;white-space:pre-wrap;}</style></head><body><pre>${content.replace(/</g,'&lt;')}</pre></body></html>`);
}

function openMaquette() {
  const content = STATE.deliverables.maquette;
  if (!content) return;
  const w = window.open('', '_blank');
  w.document.write(content);
  w.document.close();
}
