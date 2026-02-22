# fatherpaul-code

CLI npm officiel de Father Paul Assistant pour les workflows dev:

- chat code (OpenAI-compatible API)
- edition assistee de fichiers avec diff preview
- execution terminal controlee (garde-fous integres)
- login utilisateur (email/mot de passe) avec session locale

## Installation

```bash
npm i -g fatherpaul-code
```

Verifier l'installation:

```bash
fatherpaul-code --help
```

## Demarrage rapide (2 minutes)

1. Initialiser la CLI:

```bash
fatherpaul-code init
```

2. Se connecter avec un compte utilisateur:

```bash
fatherpaul-code login
```

3. Verifier la session:

```bash
fatherpaul-code whoami
```

4. Poser une premiere question:

```bash
fatherpaul-code chat "Cree une fonction Node.js pour lire un fichier JSON avec gestion d'erreur"
```

## Modes d'authentification

Mode recommande: `login` (type Claude/Codex)

- le user s'authentifie via email/mot de passe
- la CLI recupere automatiquement `api_key` et `api_base_url`
- la cle est stockee localement pour les commandes suivantes

Mode alternatif: API key directe

- utile pour integration serveur/service account
- configuration manuelle via `fatherpaul-code init --api-key sk-...`

## Pre-requis backend pour le mode `login`

- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/subscription/status`
- `GET /api/cli/session` (retourne `api_key` et `api_base_url`)

## Commandes principales

### Session

```bash
fatherpaul-code login
fatherpaul-code whoami
fatherpaul-code logout
fatherpaul-code config
```

### Modeles

```bash
fatherpaul-code models
```

### Chat

Mode one-shot:

```bash
fatherpaul-code chat "Explique ce bug Java Spring: BeanCurrentlyInCreationException"
```

Mode interactif:

```bash
fatherpaul-code chat
```

Quitter avec `/exit`.

### Edition de fichiers

```bash
fatherpaul-code edit src/app.ts "Refactorise avec gestion d'erreurs et logs structures"
```

Options utiles:

- `--yes`: applique sans confirmation
- `--no-backup`: desactive le backup `.bak`
- `-m, --model`: force un modele

### Commandes shell controlees

```bash
fatherpaul-code run "npm test"
```

Garde-fous:

- blocage de patterns dangereux (`rm -rf /`, `curl|sh`, etc.)
- allowlist des commandes autorisees
- confirmation sur commandes non lecture-seule

### Diagnostic

```bash
fatherpaul-code doctor
```

## Fichier de configuration

Chemin:

- `~/.config/fatherpaul-code/config.json`

Exemple:

```json
{
  "apiBase": "https://ai-api-dev.79.137.32.27.nip.io/v1",
  "portalBase": "https://ai-portal-dev.79.137.32.27.nip.io",
  "apiKey": "sk-xxxx",
  "accessToken": "jwt-xxxx",
  "authMode": "session",
  "userEmail": "user@example.com",
  "defaultModel": "qwen2.5-7b",
  "maxTokens": 512,
  "timeoutMs": 90000,
  "allowCommands": ["ls", "pwd", "cat", "git", "npm", "node"]
}
```

## Erreurs frequentes

`Abonnement non actif`

- activer une offre cote portail avant `fatherpaul-code login`

`key not allowed to access model`

- le modele choisi n'est pas autorise pour ce forfait
- faire `fatherpaul-code models` puis utiliser un modele autorise

`Cle API introuvable via session CLI`

- verifier que le backend expose bien `GET /api/cli/session`

## Publication npm (maintainers)

Tester localement:

```bash
npm link
fatherpaul-code --help
```

Publier:

```bash
npm login
npm publish --access public
```

## Documentation complete

Reference detaillee:

- `docs/CLI_REFERENCE.md`

## Compatibilite

- Node.js `>=20`
