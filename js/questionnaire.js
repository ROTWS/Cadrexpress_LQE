// ============================================
// CADREXPRESS — Structure du questionnaire
// ============================================
// Édite ce fichier pour : ajouter/modifier/retirer des questions.
// Chaque question a :
//   - id (unique, ex: "q1")
//   - label (question visible)
//   - type ("text", "textarea", "select")
//   - options (uniquement pour type "select")
//   - help (optionnel, texte d'aide sous la question)

const QUESTIONNAIRE = [
  {
    section: "1. Contexte & vision",
    questions: [
      { id: "q1", label: "Nom du projet", type: "text" },
      { id: "q2", label: "Porteur du projet (entité / équipe)", type: "text" },
      { id: "q3", label: "Problème métier à résoudre", type: "textarea", help: "Quel est le pain point concret ?" },
      { id: "q4", label: "Objectif principal attendu", type: "textarea" },
      { id: "q5", label: "Gain espéré (temps, qualité, coût...)", type: "textarea" },
      { id: "q6", label: "Parties prenantes identifiées", type: "textarea", help: "Sponsors, utilisateurs, experts, DSI..." },
      { id: "q7", label: "Alignement stratégique", type: "textarea", help: "Quel OKR / plan stratégique soutient ce projet ?" }
    ]
  },
  {
    section: "2. Utilisateurs & usages",
    questions: [
      { id: "q8", label: "Utilisateurs cibles principaux", type: "textarea" },
      { id: "q9", label: "Nombre estimé d'utilisateurs", type: "text" },
      { id: "q10", label: "Cas d'usage prioritaires", type: "textarea" },
      { id: "q11", label: "Parcours utilisateur actuel (AS-IS)", type: "textarea" },
      { id: "q12", label: "Parcours cible (TO-BE)", type: "textarea" },
      { id: "q13", label: "Fréquence d'usage attendue", type: "text" },
      { id: "q14", label: "Contexte d'usage (bureau, terrain, mobile...)", type: "textarea" }
    ]
  },
  {
    section: "3. Données",
    questions: [
      { id: "q15", label: "Sources de données mobilisées", type: "textarea" },
      { id: "q16", label: "Volume de données", type: "text" },
      { id: "q17", label: "Qualité des données (estimation)", type: "textarea" },
      { id: "q18", label: "Données personnelles traitées ?", type: "select", options: ["Non", "Oui - basiques", "Oui - sensibles"] },
      { id: "q19", label: "Données à caractère sensible (santé, opinions...)", type: "textarea" },
      { id: "q20", label: "Anonymisation / pseudonymisation prévue", type: "textarea" },
      { id: "q21", label: "Durée de conservation envisagée", type: "text" },
      { id: "q22", label: "Localisation des données (UE / hors UE)", type: "text" }
    ]
  },
  {
    section: "4. IA & modèles",
    questions: [
      { id: "q23", label: "Type de tâche IA (classification, génération, prédiction...)", type: "textarea" },
      { id: "q24", label: "Modèle envisagé (LLM, vision, ML classique...)", type: "textarea" },
      { id: "q25", label: "Fine-tuning / RAG / prompting ?", type: "textarea" },
      { id: "q26", label: "Risque IA Act", type: "select", options: ["À déterminer", "Minimal", "Limité", "Élevé", "Inacceptable"] },
      { id: "q27", label: "Niveau d'autonomie du système", type: "textarea", help: "Humain dans la boucle ? Automation complète ?" },
      { id: "q28", label: "Métriques de qualité attendues (précision, recall...)", type: "textarea" },
      { id: "q29", label: "Gestion des biais", type: "textarea" },
      { id: "q30", label: "Explicabilité requise ?", type: "select", options: ["Non", "Partielle", "Totale (audit trail)"] }
    ]
  },
  {
    section: "5. Architecture & technique",
    questions: [
      { id: "q31", label: "SI existant impacté", type: "textarea" },
      { id: "q32", label: "Intégrations / APIs tierces nécessaires", type: "textarea" },
      { id: "q33", label: "Hébergement envisagé (cloud souverain, on-premise...)", type: "text" },
      { id: "q34", label: "Contraintes de performance", type: "textarea" },
      { id: "q35", label: "Disponibilité attendue (SLA)", type: "text" },
      { id: "q36", label: "Scalabilité future", type: "textarea" },
      { id: "q37", label: "Techno frontend souhaitée", type: "text" },
      { id: "q38", label: "Techno backend souhaitée", type: "text" }
    ]
  },
  {
    section: "6. Sécurité & conformité",
    questions: [
      { id: "q39", label: "Classification de l'information", type: "select", options: ["Public", "Interne", "Confidentiel", "Secret"] },
      { id: "q40", label: "Authentification / SSO", type: "text" },
      { id: "q41", label: "Gestion des droits (rôles, ABAC...)", type: "textarea" },
      { id: "q42", label: "Chiffrement (repos, transit)", type: "textarea" },
      { id: "q43", label: "Audit / traçabilité", type: "textarea" },
      { id: "q44", label: "RGPD - base légale du traitement", type: "select", options: ["Non applicable", "Consentement", "Contrat", "Obligation légale", "Intérêt légitime", "Mission d'intérêt public"] },
      { id: "q45", label: "DPIA / AIPD nécessaire ?", type: "select", options: ["À déterminer", "Non", "Oui"] },
      { id: "q46", label: "RGAA - niveau d'accessibilité visé", type: "select", options: ["Non applicable", "A", "AA (recommandé)", "AAA"] }
    ]
  },
  {
    section: "7. Coûts & planning",
    questions: [
      { id: "q47", label: "Budget prévisionnel (fourchette)", type: "text" },
      { id: "q48", label: "Financement (OPEX / CAPEX)", type: "text" },
      { id: "q49", label: "Équipe projet (profils, ETP)", type: "textarea" },
      { id: "q50", label: "Prestations externes envisagées", type: "textarea" },
      { id: "q51", label: "Coûts d'exploitation estimés (tokens, infra...)", type: "textarea" },
      { id: "q52", label: "Date de livraison souhaitée", type: "text" },
      { id: "q53", label: "Jalons clés", type: "textarea" }
    ]
  },
  {
    section: "8. Risques & gouvernance",
    questions: [
      { id: "q54", label: "Risques majeurs identifiés", type: "textarea" },
      { id: "q55", label: "Risques d'adoption utilisateur", type: "textarea" },
      { id: "q56", label: "Risques réglementaires", type: "textarea" },
      { id: "q57", label: "Plan de mitigation", type: "textarea" },
      { id: "q58", label: "Comité de pilotage", type: "textarea" },
      { id: "q59", label: "Critères de succès (KPIs)", type: "textarea" },
      { id: "q60", label: "Conditions d'arrêt du projet", type: "textarea" }
    ]
  },
  {
    section: "9. Déploiement & conduite du changement",
    questions: [
      { id: "q61", label: "Stratégie de déploiement (POC, pilote, rollout)", type: "textarea" },
      { id: "q62", label: "Formation utilisateurs prévue", type: "textarea" },
      { id: "q63", label: "Communication / change management", type: "textarea" },
      { id: "q64", label: "Support et maintenance (run)", type: "textarea" },
      { id: "q65", label: "Évaluation post-déploiement", type: "textarea" }
    ]
  }
];
