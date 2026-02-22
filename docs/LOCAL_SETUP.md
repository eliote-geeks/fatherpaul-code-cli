# Installation Locale - Windows / macOS / Linux

Guide d'installation pour clients finaux.

## 1) Prerequis

- Node.js version 20 ou plus recente
- npm installe
- acces internet vers:
  - `https://ai-dev.79.137.32.27.nip.io`
  - `https://ai-api-dev.79.137.32.27.nip.io`
  - `https://ai-portal-dev.79.137.32.27.nip.io`

Verification:

```bash
node -v
npm -v
```

## 2) Installer la CLI

```bash
npm i -g fatherpaul-code
```

Verification:

```bash
fatherpaul-code --help
```

Si la commande n'est pas reconnue:

- fermer/reouvrir le terminal
- verifier le PATH npm global

## 3) Se connecter avec le compte client

```bash
fatherpaul-code login
```

Puis:

```bash
fatherpaul-code whoami
```

## 4) Premiere commande utile

```bash
fatherpaul-code chat "Ecris une fonction JavaScript qui valide une adresse email"
```

## 5) Commandes de base

```bash
fatherpaul-code models
fatherpaul-code config
fatherpaul-code doctor
fatherpaul-code logout
```

## 6) Troubleshooting rapide

`Abonnement non actif`

- activer le compte d'abord via WhatsApp support

`key not allowed to access model`

- le modele n'est pas dans le forfait
- faire `fatherpaul-code models` pour voir la liste autorisee

`API ... 401` ou `Authentication required`

- relancer `fatherpaul-code login`

## 7) Support

- WhatsApp: `https://wa.me/237691754257`
- Email: `pauleliote97@gmail.com`
