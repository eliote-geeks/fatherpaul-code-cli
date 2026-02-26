# Troubleshooting - fatherpaul-code

Ce guide couvre les erreurs les plus frequentes avec correction immediate.

## 1) `fatherpaul-code: command not found`

Cause:

- CLI non installee globalement, ou PATH npm non recharge.

Fix:

```bash
npm i -g fatherpaul-code
fatherpaul-code --version
```

Si toujours KO: reouvrir terminal, verifier `npm config get prefix`.

## 2) `API key manquante`

Cause:

- pas de session active
- pas de cle API locale

Fix:

```bash
fatherpaul-code login
fatherpaul-code whoami
```

## 3) `Invalid credentials`

Cause probable:

- compte cree seulement sur OpenWebUI
- mais pas encore cree dans le portail API

Fix rapide:

```bash
fatherpaul-code login --auto-signup
```

Alternative:

```bash
fatherpaul-code register
fatherpaul-code login
```

## 4) `Active subscription required`

Cause:

- compte sans offre active.

Fix:

- activation cote serveur/admin
- relancer ensuite:

```bash
fatherpaul-code login
fatherpaul-code whoami
```

## 5) `key_model_access_denied`

Cause:

- le modele demande n est pas autorise par le forfait.

Fix:

```bash
fatherpaul-code models
fatherpaul-code chat "Bonjour" -m <model_autorise>
```

## 6) `unknown option '--register'` sur `chat`

Cause:

- `--register` n est pas un flag de la commande `chat`.

Fix:

```bash
fatherpaul-code register
fatherpaul-code login
fatherpaul-code chat
```

## 7) `Cle API introuvable via session CLI`

Cause:

- abonnement non provisionne
- backend non synchronise

Fix:

```bash
fatherpaul-code whoami
fatherpaul-code doctor
fatherpaul-code login
```

Si persiste: contacter support pour provisionnement.

## 8) `run` refuse une commande

Cause:

- commande hors allowlist
- ou motif dangereux detecte

Fix:

- tester d abord en dry-run:

```bash
fatherpaul-code run "commande" --dry-run --yes
```

- utiliser des commandes autorisees (`config` affiche la liste).

## 9) Reset local propre

Si la config locale est incoherente:

```bash
fatherpaul-code logout
fatherpaul-code login
fatherpaul-code doctor
```

## 10) Diagnostic complet

```bash
fatherpaul-code config
fatherpaul-code whoami
fatherpaul-code models
fatherpaul-code doctor
```

## Support

- WhatsApp: `https://wa.me/237691754257`
- Email: `pauleliote97@gmail.com`
