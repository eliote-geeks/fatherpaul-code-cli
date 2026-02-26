# Start Here - fatherpaul-code

Point d entree client. Suis ces etapes dans l ordre pour eviter 90% des erreurs.

## 1) Verifier les pre-requis

- machine avec Node.js >= 20
- compte web fonctionnel sur `https://ai-dev.79.137.32.27.nip.io/auth`
- offre active cote serveur (free / 3000 / 10000 / vscode)

## 2) Installer la CLI

```bash
npm i -g fatherpaul-code
fatherpaul-code --help
```

Guide detaille installation:

- `docs/LOCAL_SETUP.md`

## 3) Login CLI (obligatoire avant chat)

```bash
fatherpaul-code login
fatherpaul-code whoami
```

Resultat attendu:

- email affiche
- statut abonnement visible
- API key masquee visible

## 4) Si login echoue

Cas courant: compte cree sur le web, mais pas dans le portail API.

```bash
fatherpaul-code login --auto-signup
```

Alternative explicite:

```bash
fatherpaul-code register
fatherpaul-code login
```

## 5) Premiere commande utile

```bash
fatherpaul-code models
fatherpaul-code chat "Bonjour, presente-toi en 2 lignes"
```

## 6) Workflow quotidien conseille

1. `fatherpaul-code whoami`
2. `fatherpaul-code models`
3. `fatherpaul-code chat` (mode interactif)
4. `fatherpaul-code edit ...` pour modifier du code
5. `fatherpaul-code run ...` en mode securise
6. `fatherpaul-code logout` sur machine partagee

## 7) Documentation a lire ensuite

- commandes detaillees: `docs/CLI_REFERENCE.md`
- depannage complet: `docs/TROUBLESHOOTING.md`
