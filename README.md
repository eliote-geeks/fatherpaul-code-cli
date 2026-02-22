# fatherpaul-code

CLI officiel Father Paul Assistant pour les clients qui veulent utiliser l'IA en local sur leur machine.

## Liens officiels

- Accueil (landing): `https://ai-portal-dev.79.137.32.27.nip.io/`
- Login utilisateur: `https://ai-dev.79.137.32.27.nip.io/auth`
- Guide connexion complet: `https://ai-portal-dev.79.137.32.27.nip.io/guide-connexion.html`
- API OpenAI-compatible: `https://ai-api-dev.79.137.32.27.nip.io/v1`
- Support WhatsApp: `https://wa.me/237691754257`

## A qui sert ce CLI

`fatherpaul-code` permet a un client de:

- se connecter avec son compte
- discuter avec les modeles IA en terminal
- editer des fichiers avec aide IA
- executer des commandes controlees
- utiliser les droits de son forfait automatiquement

## Start Here (client)

1. Lire le guide de depart:
- `docs/START_HERE.md`

2. Installer localement:
- `docs/LOCAL_SETUP.md`

3. Voir la reference complete des commandes:
- `docs/CLI_REFERENCE.md`

## Installation locale

Prerequis:

- Node.js `>=20`
- npm

Installation:

```bash
npm i -g fatherpaul-code
```

Validation:

```bash
fatherpaul-code --help
```

## Connexion client (parcours recommande)

Le mode recommande est identique a une experience produit type Claude/Codex:

1. Ouvrir le login: `https://ai-dev.79.137.32.27.nip.io/auth`
2. Se connecter avec un compte deja active
3. Dans le terminal local:

```bash
fatherpaul-code login
fatherpaul-code whoami
```

Ensuite, la CLI recupere automatiquement:

- la cle API du compte
- l'URL API
- les limites liees au forfait

## Usage quotidien

Chat rapide:

```bash
fatherpaul-code chat "Explique ce code Java"
```

Chat interactif:

```bash
fatherpaul-code chat
```

Lister les modeles autorises sur le compte:

```bash
fatherpaul-code models
```

Editer un fichier:

```bash
fatherpaul-code edit src/app.ts "Ajoute la gestion d'erreur"
```

Commande shell protegee:

```bash
fatherpaul-code run "npm test"
```

Diagnostic:

```bash
fatherpaul-code doctor
```

## Support des offres

- 0 XAF: acces decouverte
- 3 000 XAF: premium chat
- 10 000 XAF: premium + images + API keys
- 7 500 XAF/mois: formule VS Code

Si un client n'a pas encore de compte actif, passer par WhatsApp support:

- `https://wa.me/237691754257`

## Erreurs frequentes

`Abonnement non actif`

- activer l'offre d'abord via portail/support

`key not allowed to access model`

- modele non autorise pour la formule du compte
- utiliser `fatherpaul-code models`

`Cle API introuvable via session CLI`

- verifier la session (`fatherpaul-code whoami`)
- relancer `fatherpaul-code login`
