# CLI Reference - fatherpaul-code

Reference complete des commandes avec exemples copier-coller.

## Aide globale

```bash
fatherpaul-code --help
fatherpaul-code --version
fatherpaul-code help-quick
```

## Workflow recommande

1. `fatherpaul-code login`
2. `fatherpaul-code whoami`
3. `fatherpaul-code models`
4. `fatherpaul-code chat`
5. `fatherpaul-code edit ...`
6. `fatherpaul-code run ...`

---

## `init`

Configurer API base, portal base, cle API (optionnelle), modele par defaut.

```bash
fatherpaul-code init
fatherpaul-code init --api-base https://ai-api-dev.79.137.32.27.nip.io/v1 --portal-base https://ai-portal-dev.79.137.32.27.nip.io
fatherpaul-code init --model qwen2.5-7b
fatherpaul-code init --api-key sk-xxxx
```

Quand utiliser `init`:

- premiere config manuelle
- changement d endpoint
- usage API key statique (sans session login)

---

## `register`

Creer un compte portail API.

```bash
fatherpaul-code register
fatherpaul-code register --email user@example.com --password "Secret123!" --full-name "User Name"
```

Utile si:

- login web OK
- mais `fatherpaul-code login` retourne `Invalid credentials`

---

## `login`

Authentification portail + verification abonnement + recuperation auto de la cle API.

```bash
fatherpaul-code login
fatherpaul-code login --email user@example.com --password "Secret123!"
fatherpaul-code login --auto-signup
```

Option:

- `--auto-signup`: cree le compte portail automatiquement si absent

---

## `whoami`

Afficher l identite de session et le statut abonnement.

```bash
fatherpaul-code whoami
```

---

## `logout`

Supprimer la session locale.

```bash
fatherpaul-code logout
```

---

## `config`

Afficher la configuration active.

```bash
fatherpaul-code config
```

---

## `models`

Lister les modeles visibles avec la cle actuelle.

```bash
fatherpaul-code models
```

---

## `chat [prompt...]`

Question au modele (one-shot ou interactif).

```bash
fatherpaul-code chat
fatherpaul-code chat "Explique cette erreur Java"
fatherpaul-code chat "Propose un plan de test" -m qwen2.5-7b --max-tokens 350
fatherpaul-code chat "Reformule ce mail" -s "Reponds en francais professionnel"
```

Options:

- `-m, --model <model>`
- `-s, --system <text>`
- `--max-tokens <n>`

Important:

- `--register` n est pas une option de `chat`
- creation compte = `fatherpaul-code register`

---

## `edit <file> <instruction...>`

Edition assistee avec preview diff.

```bash
fatherpaul-code edit src/app.js "Ajoute gestion d erreurs"
fatherpaul-code edit src/service.ts "Refactor en fonctions pures" --yes
fatherpaul-code edit src/main.py "Ajoute logs JSON" --no-backup
```

Options:

- `-m, --model <model>`
- `--max-tokens <n>`
- `--yes`
- `--no-backup`

---

## `run <command...>`

Execution shell avec securite:

- allowlist de commandes
- blocage motifs dangereux
- confirmation si commande non read-only

```bash
fatherpaul-code run "git status"
fatherpaul-code run "npm test"
fatherpaul-code run "cmd /c dir" --dry-run --yes
fatherpaul-code run "powershell -Command Get-ChildItem" --dry-run --yes
```

Options:

- `--cwd <path>`
- `--yes`
- `--dry-run`

---

## `doctor`

Diagnostic global:

- configuration
- acces `/models`
- test chat

```bash
fatherpaul-code doctor
```

---

## Flux auth technique

1. `POST /api/auth/login`
2. `GET /api/me`
3. `GET /api/subscription/status`
4. `GET /api/cli/session` (api key + api base)
5. ecriture config locale

---

## Erreurs frequentes

`API key manquante`

- faire `fatherpaul-code login`

`Invalid credentials`

- faire `fatherpaul-code login --auto-signup`
- ou `fatherpaul-code register` puis `fatherpaul-code login`

`Active subscription required`

- activer l offre cote serveur puis relancer `login`

`key_model_access_denied`

- modele non inclus dans le forfait
- verifier avec `fatherpaul-code models`

Voir aussi `docs/TROUBLESHOOTING.md`.
