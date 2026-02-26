# Installation locale (Windows, macOS, Linux)

## 1) Pre-requis

- Node.js >= 20
- npm installe
- compte actif sur la plateforme
- acces reseau vers:
  - `https://ai-dev.79.137.32.27.nip.io`
  - `https://ai-api-dev.79.137.32.27.nip.io`
  - `https://ai-portal-dev.79.137.32.27.nip.io`

Verification:

```bash
node -v
npm -v
```

## 2) Installation

```bash
npm i -g fatherpaul-code
fatherpaul-code --version
fatherpaul-code --help
```

## 3) Si la commande n est pas reconnue

### Linux/macOS

```bash
npm config get prefix
echo $PATH
```

Ajoute le binaire npm global a ton PATH puis reouvre le terminal.

### Windows PowerShell

```powershell
npm config get prefix
$env:Path
```

Ferme/reouvre PowerShell apres install.

## 4) Premiere connexion CLI

```bash
fatherpaul-code login
fatherpaul-code whoami
```

Si `Invalid credentials`:

```bash
fatherpaul-code login --auto-signup
```

## 5) Sanity check

```bash
fatherpaul-code models
fatherpaul-code chat "Dis bonjour en francais"
fatherpaul-code doctor
```

## 6) Chemin de configuration locale

- Linux/macOS: `~/.config/fatherpaul-code/config.json`
- Windows: `%APPDATA%\\fatherpaul-code\\config.json`

Ce fichier contient des secrets. Ne pas partager.

## 7) Test Windows CLI (cmd + PowerShell)

```bash
fatherpaul-code run "cmd /c dir" --dry-run --yes
fatherpaul-code run "powershell -Command Get-ChildItem" --dry-run --yes
```

## 8) Support

- WhatsApp: `https://wa.me/237691754257`
- Email: `pauleliote97@gmail.com`
- Depannage detaille: `docs/TROUBLESHOOTING.md`

## 9) Mise a jour

```bash
fatherpaul-code update-check
npm i -g fatherpaul-code@latest
```
