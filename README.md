# fatherpaul-code

CLI officiel de Father Paul Assistant pour utiliser les modeles IA depuis le terminal (Windows, Linux, macOS).

## Liens officiels

- Landing: `https://ai-portal-dev.79.137.32.27.nip.io/`
- Connexion web: `https://ai-dev.79.137.32.27.nip.io/auth`
- API OpenAI-compatible: `https://ai-api-dev.79.137.32.27.nip.io/v1`
- Support WhatsApp: `https://wa.me/237691754257`

## Ce que la CLI permet

- se connecter avec ton compte (session securisee)
- poser des questions IA en one-shot ou mode interactif
- editer un fichier avec preview diff avant application
- executer des commandes shell avec garde-fous
- respecter automatiquement les droits du forfait

## Quickstart (2 minutes)

```bash
npm i -g fatherpaul-code
fatherpaul-code login
fatherpaul-code whoami
fatherpaul-code models
fatherpaul-code chat "Bonjour, presente-toi en 2 lignes"
```

Si `login` retourne `Invalid credentials` alors que ton compte web existe:

```bash
fatherpaul-code login --auto-signup
```

## Documentation complete

- demarrage: `docs/START_HERE.md`
- installation locale: `docs/LOCAL_SETUP.md`
- reference commandes: `docs/CLI_REFERENCE.md`
- depannage detaille: `docs/TROUBLESHOOTING.md`

## Commandes essentielles

```bash
fatherpaul-code init
fatherpaul-code register
fatherpaul-code login
fatherpaul-code whoami
fatherpaul-code models
fatherpaul-code chat
fatherpaul-code edit src/app.js "Ajoute une gestion d erreurs"
fatherpaul-code run "npm test"
fatherpaul-code doctor
fatherpaul-code update-check
fatherpaul-code changelog
fatherpaul-code logout
```

## Exemples rapides

Chat ponctuel:

```bash
fatherpaul-code chat "Explique ce code JavaScript"
```

Chat interactif:

```bash
fatherpaul-code chat
```

Edition assistee:

```bash
fatherpaul-code edit src/service.ts "Refactor en fonctions pures" --yes
```

Execution protegee:

```bash
fatherpaul-code run "git status"
fatherpaul-code run "powershell -Command Get-ChildItem" --dry-run --yes
```

## Mises a jour (utilisateurs)

La CLI fait un check automatique des mises a jour npm (1 fois par jour) et affiche un message si une nouvelle version est disponible.

Commande manuelle:

```bash
fatherpaul-code update-check
fatherpaul-code changelog
```

Note:

- si `update-check` affiche `Package npm non publie`, l application est utilisee en mode installation locale (git + npm i -g .), sans release npm publique.

Mettre a jour:

```bash
npm i -g fatherpaul-code@latest
```

## Plans et droits (resume)

- `0 XAF`: decouverte
- `3 000 XAF`: chat premium + recherche web
- `10 000 XAF`: premium complet (texte/vision/images/API keys)
- `7 500 XAF/mois`: formule VS Code/CLI

L activation reste cote serveur. En cas de blocage:

- WhatsApp: `https://wa.me/237691754257`

## Fichiers locaux crees

- Linux/macOS: `~/.config/fatherpaul-code/config.json`
- Windows: `%APPDATA%\\fatherpaul-code\\config.json`

Ne partage jamais ce fichier (il contient la session et/ou la cle API).
