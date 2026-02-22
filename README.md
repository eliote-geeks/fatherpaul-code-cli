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
