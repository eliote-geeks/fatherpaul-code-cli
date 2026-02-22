# fatherpaul-code

CLI npm pour utiliser Father Paul Assistant en mode developpeur:
- chat code
- edition de fichiers assistee IA
- execution terminal controlee
- endpoint OpenAI-compatible (`/v1`)

## Installation

```bash
npm i -g fatherpaul-code
```

## Configuration initiale

```bash
fatherpaul-code init
```

Valeurs conseillees:
- API Base: `https://ai-api-dev.79.137.32.27.nip.io/v1`
- API Key: `sk-...` (cle client)
- Modele: `qwen2.5-7b`

Afficher la config:

```bash
fatherpaul-code config
```

## Authentification utilisateur (mode Claude/Codex)

Connexion avec compte utilisateur portail (recupere automatiquement la cle API de l utilisateur):

```bash
fatherpaul-code login
```

Puis verifier la session:

```bash
fatherpaul-code whoami
```

Fermer la session locale:

```bash
fatherpaul-code logout
```

Pre-requis backend:

- endpoint `POST /api/auth/login`
- endpoint `GET /api/me`
- endpoint `GET /api/subscription/status`
- endpoint `GET /api/cli/session` (retourne `api_key` et `api_base_url` pour la session CLI)

## Commandes principales

### Lister les modeles

```bash
fatherpaul-code models
```

### Chat (one-shot)

```bash
fatherpaul-code chat "Ecris une fonction TypeScript debounce"
```

### Chat interactif

```bash
fatherpaul-code chat
```

Tape `/exit` pour quitter.

### Editer un fichier avec preview diff

```bash
fatherpaul-code edit src/app.ts "Ajoute gestion d erreurs et logs"
```

Options utiles:
- `--yes`: applique sans confirmation
- `--no-backup`: desactive la sauvegarde `.bak`
- `-m, --model`: force un modele

### Executer une commande shell controlee

```bash
fatherpaul-code run "npm test"
```

Garde-fous inclus:
- blocage de motifs dangereux (`rm -rf /`, `curl|sh`, etc.)
- allowlist de commandes autorisees
- confirmation pour commandes non lecture seule

### Diagnostic

```bash
fatherpaul-code doctor
```

## Packaging npm

Tester en local:

```bash
npm link
fatherpaul-code --help
```

Publier:

```bash
npm login
npm publish --access public
```

## Notes

- Config stockee dans: `~/.config/fatherpaul-code/config.json`
- Compatible Node.js `>=20`
