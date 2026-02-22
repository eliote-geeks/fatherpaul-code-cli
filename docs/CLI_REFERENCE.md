# CLI Reference - fatherpaul-code

Reference complete des commandes CLI.

## Global

Afficher l'aide:

```bash
fatherpaul-code --help
```

Afficher la version:

```bash
fatherpaul-code --version
```

## `init`

Configurer la CLI (URL API, URL portail, modele, cle API optionnelle).

```bash
fatherpaul-code init
fatherpaul-code init --api-base https://ai-api-dev.79.137.32.27.nip.io/v1 --portal-base https://ai-portal-dev.79.137.32.27.nip.io --model qwen2.5-7b
fatherpaul-code init --api-key sk-xxxx
```

## `login`

Authentification utilisateur portail (email/mot de passe), puis recuperation auto de la cle API.

```bash
fatherpaul-code login
fatherpaul-code login --email user@example.com --password "Secret123!"
fatherpaul-code login --portal-base https://ai-portal-dev.79.137.32.27.nip.io
```

## `whoami`

Afficher la session utilisateur courante.

```bash
fatherpaul-code whoami
```

## `logout`

Supprimer la session locale (token + cle locale).

```bash
fatherpaul-code logout
```

## `config`

Afficher la configuration active.

```bash
fatherpaul-code config
```

## `models`

Lister les modeles accessibles a la cle courante.

```bash
fatherpaul-code models
```

## `chat`

Mode one-shot:

```bash
fatherpaul-code chat "Ecris des tests unitaires pour cette fonction JS"
```

Mode interactif:

```bash
fatherpaul-code chat
```

Options:

- `-m, --model <model>`: force le modele
- `-s, --system <text>`: system prompt
- `--max-tokens <n>`: taille max de reponse

Exemple:

```bash
fatherpaul-code chat "Refactor ce code Java" -m qwen2.5-7b --max-tokens 350
```

## `edit`

Modifier un fichier avec l'IA.

```bash
fatherpaul-code edit src/service.ts "Ajoute try/catch et logs JSON"
```

Options:

- `-m, --model <model>`
- `--yes` applique sans confirmation
- `--no-backup` desactive backup `.bak`
- `--max-tokens <n>`

## `run`

Executer une commande shell avec garde-fous.

```bash
fatherpaul-code run "npm test"
fatherpaul-code run "git status"
```

Protection:

- patterns dangereux bloques
- allowlist de commandes
- confirmation pour commandes non lecture-seule

## `doctor`

Diagnostic connectivite API + modele par defaut + auth locale.

```bash
fatherpaul-code doctor
```

## `help-quick`

Affiche une aide rapide des commandes essentielles.

```bash
fatherpaul-code help-quick
```

## Flux d'authentification (mode session)

1. `POST /api/auth/login` -> JWT access token
2. `GET /api/me` -> infos user
3. `GET /api/subscription/status` -> verif offre active
4. `GET /api/cli/session` -> `api_key` + `api_base_url`
5. Enregistrement local dans `~/.config/fatherpaul-code/config.json`

## Codes de retour et erreurs courantes

`401 key_model_access_denied`

- la formule ne permet pas ce modele
- utiliser un modele autorise par le plan

`403 Active subscription required`

- compte sans abonnement actif

`409 API key is not provisioned`

- abonnement present mais cle non creee cote backend

## Bonnes pratiques

- ne pas partager `~/.config/fatherpaul-code/config.json`
- utiliser `logout` sur machine partagee
- garder Node.js a jour (>=20)
