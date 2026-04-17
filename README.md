# Cadrexpress

Outil de cadrage express de projets IA avec **conformité native** (IA Act, RGPD, RGAA, cybersécurité, responsive).

## 🚀 Utilisation

1. Ouvrez `index.html` dans un navigateur (Chrome ou Edge recommandé)
2. Cliquez sur **⚙ Configuration** et saisissez votre clé API Anthropic
3. Choisissez une source d'entrée (texte, dictée, PDF…)
4. Laissez Claude pré-remplir le questionnaire
5. Complétez/corrigez si besoin
6. Générez les 3 livrables : synthèse, maquette HTML, pré-cadrage technique

## 📁 Structure du projet

```
cadrexpress/
├── index.html              Structure HTML (peu édité)
├── css/
│   └── styles.css          Tout le design
└── js/
    ├── config.js           État global + modal de configuration
    ├── questionnaire.js    Les 65 questions (à éditer librement)
    ├── prompts.js          ★ Les prompts système (fichier clé)
    ├── api.js              Appels API Anthropic
    ├── sources.js          Sources d'entrée (texte, audio, PDF, dictée)
    ├── generation.js       Orchestration des 3 livrables
    └── app.js              UI, navigation, init
```

## ✏️ Que modifier pour quoi ?

| Envie | Fichier à éditer |
|-------|------------------|
| Changer les couleurs, la typo, le design | `css/styles.css` |
| Ajouter/modifier/retirer une question | `js/questionnaire.js` |
| Améliorer un prompt (synthèse, maquette, pré-cadrage) | `js/prompts.js` |
| Ajuster la conformité (IA Act, RGPD...) | `js/prompts.js` → bloc `COMPLIANCE_BLOCK` |
| Changer le modèle Claude par défaut | `js/config.js` |
| Ajouter un 4e livrable | `js/prompts.js` + `js/generation.js` + `index.html` |
| Changer les textes des écrans | `index.html` |

## 🔒 Sécurité

- La clé API est stockée uniquement **en mémoire du navigateur** (perdue au rechargement).
- Les données saisies sont envoyées à l'API Anthropic en HTTPS.
- **Ne saisissez jamais** de données personnelles, matricules ou informations confidentielles.

## 📜 Licence

Usage libre. Les livrables générés par IA doivent être **systématiquement relus et validés** par des experts métier et techniques.
