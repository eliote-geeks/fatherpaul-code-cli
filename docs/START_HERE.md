# Start Here - Guide Client

Ce document est le point d'entree officiel pour un client qui veut utiliser Father Paul Assistant en local.

## Etape 1 - Ouvrir les liens officiels

- Landing: `https://ai-portal-dev.79.137.32.27.nip.io/`
- Login: `https://ai-dev.79.137.32.27.nip.io/auth`
- Guide connexion web: `https://ai-portal-dev.79.137.32.27.nip.io/guide-connexion.html`
- API Base: `https://ai-api-dev.79.137.32.27.nip.io/v1`

## Etape 2 - Verifier que le compte est actif

Avant d'utiliser la CLI:

- compte cree et active
- forfait valide (0 / 3000 / 10000 / VS Code)

Si le compte n'est pas actif:

- WhatsApp support: `https://wa.me/237691754257`

## Etape 3 - Installer la CLI sur la machine

Suivre: `docs/LOCAL_SETUP.md`

## Etape 4 - Se connecter dans la CLI

```bash
fatherpaul-code login
fatherpaul-code whoami
```

Ce login configure automatiquement:

- la cle API
- la base URL API
- le mode auth session

## Etape 5 - Premiere utilisation

```bash
fatherpaul-code models
fatherpaul-code chat "Bonjour, presente toi en 2 lignes"
```

## Etape 6 - Aller plus loin

- reference commandes: `docs/CLI_REFERENCE.md`
- edition de fichier: `fatherpaul-code edit <fichier> "<instruction>"`
- terminal assiste: `fatherpaul-code run "<commande>"`
