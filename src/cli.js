#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import Enquirer from 'enquirer';
import chalk from 'chalk';

const { prompt } = Enquirer;

const IS_WINDOWS = process.platform === 'win32';
const WINDOWS_CONFIG_ROOT = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const CONFIG_DIR = IS_WINDOWS
  ? path.join(WINDOWS_CONFIG_ROOT, 'fatherpaul-code')
  : path.join(os.homedir(), '.config', 'fatherpaul-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function getDefaultAllowCommands() {
  const common = [
    'ls', 'pwd', 'cat', 'echo', 'rg', 'grep', 'find', 'head', 'tail', 'wc',
    'git', 'npm', 'node', 'npx', 'pnpm', 'yarn', 'mvn', 'gradle', 'java',
    'python', 'python3', 'docker', 'kubectl', 'helm', 'sed', 'awk', 'cp',
    'mv', 'mkdir', 'touch', 'chmod'
  ];
  const windows = [
    'cmd', 'powershell', 'powershell.exe', 'pwsh', 'dir', 'type', 'where',
    'findstr', 'copy', 'move', 'set'
  ];
  return Array.from(new Set([...common, ...windows]));
}

const DEFAULT_CONFIG = {
  apiBase: 'https://ai-api-dev.79.137.32.27.nip.io/v1',
  portalBase: 'https://ai-portal-dev.79.137.32.27.nip.io',
  apiKey: '',
  accessToken: '',
  authMode: 'apikey',
  userEmail: '',
  defaultModel: 'qwen2.5-7b',
  maxTokens: 512,
  timeoutMs: 90000,
  allowCommands: getDefaultAllowCommands()
};

const DANGEROUS_PATTERNS = [
  /(^|\s)rm\s+-rf\s+\//i,
  /(^|\s)mkfs(\.|\s)/i,
  /(^|\s)fdisk(\s|$)/i,
  /(^|\s)parted(\s|$)/i,
  /(^|\s)shutdown(\s|$)/i,
  /(^|\s)reboot(\s|$)/i,
  /(^|\s)poweroff(\s|$)/i,
  /(^|\s)dd\s+if=/i,
  /(:\(\)\{\s*:\|:\s*&\s*\};:)/,
  /(^|\s)(curl|wget)[^\n|]*\|\s*(sh|bash)/i,
  />\s*\/dev\/(sd|nvme|vd)/i,
  /(^|\s)chmod\s+-R\s+777\s+\//i,
  /(^|\s)(del|erase)\s+\/(s|q)\b/i,
  /(^|\s)rmdir\s+\/s\s+\/q\b/i,
  /(^|\s)format\s+[a-z]:/i,
  /(^|\s)diskpart(\s|$)/i,
  /(^|\s)bcdedit(\s|$)/i
];

function normalizeApiBase(value) {
  return (value || '').trim().replace(/\/+$/, '');
}

function derivePortalBase(apiBase) {
  const normalized = normalizeApiBase(apiBase);
  if (!normalized) return DEFAULT_CONFIG.portalBase;
  if (normalized.includes('ai-api-dev.')) {
    return normalized.replace('ai-api-dev.', 'ai-portal-dev.').replace(/\/v1$/, '');
  }
  if (normalized.endsWith('/v1')) {
    return normalized.slice(0, -3);
  }
  return normalized;
}

function normalizePortalBase(value, apiBaseFallback = DEFAULT_CONFIG.apiBase) {
  const candidate = (value || '').trim().replace(/\/+$/, '');
  if (candidate) return candidate;
  return derivePortalBase(apiBaseFallback);
}

async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const parsedAllow = Array.isArray(parsed.allowCommands) ? parsed.allowCommands : [];
    const mergedAllow = Array.from(
      new Set([
        ...parsedAllow.map((item) => String(item).trim()).filter(Boolean),
        ...DEFAULT_CONFIG.allowCommands,
      ])
    );
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      apiBase: normalizeApiBase(parsed.apiBase || DEFAULT_CONFIG.apiBase),
      portalBase: normalizePortalBase(parsed.portalBase, parsed.apiBase || DEFAULT_CONFIG.apiBase),
      allowCommands: mergedAllow.length ? mergedAllow : DEFAULT_CONFIG.allowCommands,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig(config) {
  await ensureConfigDir();
  const payload = {
    ...DEFAULT_CONFIG,
    ...config,
    apiBase: normalizeApiBase(config.apiBase || DEFAULT_CONFIG.apiBase),
    portalBase: normalizePortalBase(config.portalBase, config.apiBase || DEFAULT_CONFIG.apiBase),
  };
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function maskApiKey(apiKey) {
  if (!apiKey) return '(non configuree)';
  if (apiKey.length <= 10) return `${apiKey.slice(0, 3)}***`;
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

function isApiError(error, statusCode, detailText = '') {
  const message = String(error?.message || '');
  const statusMatch = message.includes(`API ${statusCode}:`);
  if (!statusMatch) return false;
  if (!detailText) return true;
  return message.toLowerCase().includes(detailText.toLowerCase());
}

function deriveFullNameFromEmail(email) {
  const localPart = String(email || '').split('@')[0] || 'User';
  const cleaned = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'User';
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseAssistantText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  if (fenced) return fenced[1];
  return text;
}

function sanitizeEditedFileContent(text) {
  let output = stripCodeFences(text).replace(/\r/g, '');

  const blockMatch = output.match(/---FILE_START---\n?([\s\S]*?)\n?---FILE_END---/);
  if (blockMatch) {
    output = blockMatch[1];
  }

  output = output
    .split('\n')
    .filter((line) => line.trim() !== '---FILE_START---' && line.trim() !== '---FILE_END---')
    .join('\n');

  return output;
}

function firstToken(command) {
  const parts = command.trim().split(/\s+/);
  return String(parts[0] || '').toLowerCase();
}

function isDangerousCommand(command) {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

function isAllowedCommand(command, config) {
  const token = firstToken(command);
  const allow = Array.isArray(config.allowCommands) && config.allowCommands.length
    ? config.allowCommands
    : DEFAULT_CONFIG.allowCommands;
  return allow.map((item) => String(item).toLowerCase()).includes(token);
}

function isLikelyReadOnly(command) {
  const c = command.trim();
  return [
    /^(ls|pwd|cat|echo|rg|grep|find|head|tail|wc|which|whereis)(\s|$)/,
    /^git\s+(status|log|show|diff|branch)(\s|$)/,
    /^kubectl\s+get(\s|$)/,
    /^docker\s+(ps|images|logs)(\s|$)/,
    /^npm\s+(view|ls|outdated|whoami)(\s|$)/,
    /^node\s+-v$/,
    /^(dir|type|where|findstr)(\s|$)/i,
    /^cmd\s+\/c\s+(dir|type|echo|where|set)(\s|$)/i,
    /^(powershell|powershell\.exe|pwsh)\s+-Command\s+["']?(Get-ChildItem|Get-Content|Get-Command|Get-Location|Write-Output)\b/i,
  ].some((r) => r.test(c));
}

async function askInput(message, initial = '') {
  const { value } = await prompt({
    type: 'input',
    name: 'value',
    message,
    initial,
  });
  return String(value || '').trim();
}

async function askPassword(message) {
  const { value } = await prompt({
    type: 'password',
    name: 'value',
    message,
  });
  return String(value || '').trim();
}

async function askConfirm(message, initial = false) {
  const { ok } = await prompt({
    type: 'confirm',
    name: 'ok',
    message,
    initial,
  });
  return Boolean(ok);
}

async function jsonRequest({ baseUrl, endpoint, method = 'POST', payload, headers = {}, timeoutMs = 90000 }) {
  const normalizedBase = (baseUrl || '').trim().replace(/\/+$/, '');
  if (!normalizedBase) {
    throw new Error('Base URL manquante.');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Number(timeoutMs) || 90000);
  const url = `${normalizedBase}/${endpoint.replace(/^\/+/, '')}`;

  try {
    const finalHeaders = {
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    };
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API ${response.status}: ${text}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeoutId);
  }
}

async function apiRequest(config, endpoint, payload, method = 'POST') {
  const apiBase = normalizeApiBase(config.apiBase);
  if (!apiBase) {
    throw new Error('API base manquante. Lance: fatherpaul-code init');
  }
  if (!config.apiKey) {
    throw new Error(
      [
        'API key manquante.',
        'Etapes conseillees:',
        '- fatherpaul-code login',
        '- si le compte n existe pas cote portail: fatherpaul-code login --auto-signup',
        '- sinon: fatherpaul-code register puis fatherpaul-code login',
      ].join('\n')
    );
  }

  return jsonRequest({
    baseUrl: apiBase,
    endpoint,
    method,
    payload,
    timeoutMs: config.timeoutMs,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });
}

async function portalRequest(config, endpoint, payload, method = 'GET', tokenOverride = '') {
  const portalBase = normalizePortalBase(config.portalBase, config.apiBase);
  const token = tokenOverride || config.accessToken || '';
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  return jsonRequest({
    baseUrl: portalBase,
    endpoint,
    method,
    payload,
    timeoutMs: config.timeoutMs,
    headers,
  });
}

async function portalHtmlRequest(config, endpoint, tokenOverride = '') {
  const portalBase = normalizePortalBase(config.portalBase, config.apiBase);
  const token = tokenOverride || config.accessToken || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Number(config.timeoutMs) || 90000);
  const url = `${portalBase}/${endpoint.replace(/^\/+/, '')}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Portal ${response.status}: ${text}`);
    }
    return response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractApiKeyFromDashboard(html) {
  const scoped = html.match(/<details>[\s\S]*?<code>(sk-[^<\s]+)<\/code>[\s\S]*?<\/details>/i);
  if (scoped?.[1]) return scoped[1];
  const generic = html.match(/<code>(sk-[^<\s]+)<\/code>/i);
  return generic?.[1] || '';
}

async function chatOnce(config, userPrompt, options = {}) {
  const payload = {
    model: options.model || config.defaultModel,
    messages: [
      ...(options.system
        ? [{ role: 'system', content: options.system }]
        : []),
      ...(options.messages || []),
      { role: 'user', content: userPrompt },
    ],
    max_tokens: Number(options.maxTokens || config.maxTokens || 512),
    stream: false,
  };

  const data = await apiRequest(config, '/chat/completions', payload, 'POST');
  const text = parseAssistantText(data);
  if (!text) throw new Error('Reponse vide du modele.');
  return text;
}

function buildFallbackDiff(filePath, oldContent, newContent, maxChanges = 60) {
  const oldLines = oldContent.replace(/\r/g, '').split('\n');
  const newLines = newContent.replace(/\r/g, '').split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  const lines = [
    `--- ${filePath} (old)`,
    `+++ ${filePath} (new)`,
  ];
  let changes = 0;

  for (let i = 0; i < max; i += 1) {
    const hasOld = i < oldLines.length;
    const hasNew = i < newLines.length;
    const oldLine = hasOld ? oldLines[i] : '';
    const newLine = hasNew ? newLines[i] : '';
    if (hasOld && hasNew && oldLine === newLine) {
      continue;
    }
    lines.push(`@@ line ${i + 1} @@`);
    if (hasOld) lines.push(`- ${oldLine}`);
    if (hasNew) lines.push(`+ ${newLine}`);
    changes += 1;
    if (changes >= maxChanges) {
      lines.push('... preview tronque ...');
      break;
    }
  }
  return lines.join('\n');
}

async function runNativeDiff(filePath, oldFile, newFile) {
  return new Promise((resolve) => {
    const child = spawn(
      'diff',
      ['-u', '--label', `${filePath} (old)`, oldFile, '--label', `${filePath} (new)`, newFile],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    let spawnError = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      spawnError = String(error?.message || error);
    });
    child.on('close', (code) => {
      resolve({
        code: typeof code === 'number' ? code : 2,
        stdout,
        stderr,
        spawnError,
      });
    });
  });
}

async function printDiffPreview(filePath, oldContent, newContent) {
  const base = path.basename(filePath);
  const oldFile = path.join(tmpdir(), `fatherpaul-old-${Date.now()}-${base}`);
  const newFile = path.join(tmpdir(), `fatherpaul-new-${Date.now()}-${base}`);

  await fs.writeFile(oldFile, oldContent, 'utf8');
  await fs.writeFile(newFile, newContent, 'utf8');
  try {
    const native = await runNativeDiff(filePath, oldFile, newFile);
    if (!native.spawnError && native.code <= 1) {
      if (native.stderr.trim()) {
        console.log(chalk.yellow(native.stderr.trim()));
      }
      if (native.code === 0) {
        console.log(chalk.gray('Aucun changement detecte.'));
        return false;
      }
      console.log(chalk.cyan('\n--- Apercu des modifications ---'));
      console.log(native.stdout || chalk.gray('(diff indisponible)'));
      return true;
    }

    if (native.spawnError || native.stderr.trim()) {
      const detail = native.spawnError || native.stderr.trim();
      console.log(chalk.yellow(`Diff natif indisponible, fallback actif (${detail}).`));
    }
    if (oldContent === newContent) {
      console.log(chalk.gray('Aucun changement detecte.'));
      return false;
    }
    console.log(chalk.cyan('\n--- Apercu des modifications (fallback) ---'));
    console.log(buildFallbackDiff(filePath, oldContent, newContent));
    return true;
  } finally {
    await fs.rm(oldFile, { force: true });
    await fs.rm(newFile, { force: true });
  }
}

async function runCommand(command, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      cwd,
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Commande terminee avec code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

const program = new Command();
program.exitOverride();
program.configureOutput({
  writeOut: (str) => process.stdout.write(str),
  writeErr: (str) => {
    if (str.trimStart().startsWith('error:')) return;
    process.stderr.write(str);
  },
});

program
  .name('fatherpaul-code')
  .description('CLI IA Father Paul Assistant (chat, edition de code, terminal controle)')
  .version('0.1.0')
  .usage('<command> [options]')
  .addHelpText(
    'after',
    `
Quickstart:
  fatherpaul-code login
  fatherpaul-code whoami
  fatherpaul-code models
  fatherpaul-code chat "Bonjour"

Si tu as un compte web mais login CLI en erreur:
  fatherpaul-code login --auto-signup

Docs:
  README.md
  docs/START_HERE.md
  docs/CLI_REFERENCE.md
`
  );

program
  .command('init')
  .description('Configurer endpoint API/portal, cle et modele par defaut')
  .option('--api-base <url>', 'API base URL, ex: https://ai-api-dev.../v1')
  .option('--portal-base <url>', 'Portal base URL, ex: https://ai-portal-dev...')
  .option('--api-key <key>', 'Cle API client')
  .option('--model <model>', 'Modele par defaut, ex: qwen2.5-7b')
  .addHelpText(
    'after',
    `
Exemples:
  fatherpaul-code init
  fatherpaul-code init --api-base https://ai-api-dev.79.137.32.27.nip.io/v1 --portal-base https://ai-portal-dev.79.137.32.27.nip.io
  fatherpaul-code init --model qwen2.5-7b
`
  )
  .action(async (opts) => {
    const current = await loadConfig();

    const apiBase = normalizeApiBase(
      opts.apiBase || (await askInput('API Base URL', current.apiBase || DEFAULT_CONFIG.apiBase))
    );

    const portalBase = normalizePortalBase(
      opts.portalBase || (await askInput('Portal Base URL', current.portalBase || derivePortalBase(apiBase))),
      apiBase
    );

    const inputApiKey = opts.apiKey ?? (await askPassword('API Key (sk-...) [optionnel si login]'));
    const apiKey = inputApiKey || current.apiKey;

    const defaultModel = opts.model || (await askInput('Modele par defaut', current.defaultModel));

    const next = {
      ...current,
      apiBase,
      portalBase,
      apiKey,
      authMode: apiKey ? current.authMode || 'apikey' : current.authMode,
      defaultModel,
    };

    await saveConfig(next);

    console.log(chalk.green('Configuration enregistree.'));
    console.log(`- Fichier: ${CONFIG_FILE}`);
    console.log(`- API Base: ${next.apiBase}`);
    console.log(`- Portal Base: ${next.portalBase}`);
    console.log(`- API Key: ${maskApiKey(next.apiKey)}`);
    console.log(`- Modele: ${next.defaultModel}`);
  });

program
  .command('register')
  .description('Creer un compte portail (si vous avez seulement un compte OpenWebUI)')
  .option('-e, --email <email>', 'Email utilisateur')
  .option('-p, --password <password>', 'Mot de passe utilisateur')
  .option('-n, --full-name <name>', 'Nom complet utilisateur')
  .option('--portal-base <url>', 'Portal base URL')
  .addHelpText(
    'after',
    `
Quand utiliser register:
  - Tu peux te connecter sur OpenWebUI, mais login CLI retourne "Invalid credentials"
  - Tu n as pas encore de compte dans le portail API

Exemple:
  fatherpaul-code register --email user@example.com --password "Secret123!" --full-name "User Name"
`
  )
  .action(async (opts) => {
    const current = await loadConfig();
    const portalBase = normalizePortalBase(opts.portalBase || current.portalBase, current.apiBase);
    const email = String(opts.email || (await askInput('Email')) || '').trim().toLowerCase();
    const password = opts.password || (await askPassword('Mot de passe'));
    const fullName = String(
      opts.fullName || opts.full_name || (await askInput('Nom complet', deriveFullNameFromEmail(email)))
    )
      .trim();

    if (!email || !password || !fullName) {
      throw new Error('Email/mot de passe/nom complet requis.');
    }
    if (password.length < 8) {
      throw new Error('Mot de passe trop court (min 8 caracteres).');
    }

    console.log(chalk.cyan('Creation du compte portail...'));
    await portalRequest(
      { ...current, portalBase },
      '/api/auth/signup',
      { email, password, full_name: fullName },
      'POST'
    );

    console.log(chalk.green('Compte portail cree.'));
    console.log(chalk.gray('Etape suivante: fatherpaul-code login'));
  });

program
  .command('login')
  .description('Authentifier un utilisateur portail et recuperer sa cle API')
  .option('-e, --email <email>', 'Email utilisateur')
  .option('-p, --password <password>', 'Mot de passe utilisateur')
  .option('--portal-base <url>', 'Portal base URL')
  .option('--auto-signup', 'Creer automatiquement le compte portail si absent')
  .addHelpText(
    'after',
    `
Exemples:
  fatherpaul-code login
  fatherpaul-code login --email user@example.com --password "Secret123!"
  fatherpaul-code login --auto-signup

Notes:
  - login verifie abonnement actif
  - login recupere la cle API automatiquement
`
  )
  .action(async (opts) => {
    const current = await loadConfig();
    const portalBase = normalizePortalBase(opts.portalBase || current.portalBase, current.apiBase);
    const email = String(opts.email || (await askInput('Email')) || '').trim().toLowerCase();
    const password = opts.password || (await askPassword('Mot de passe'));

    if (!email || !password) {
      throw new Error('Email/mot de passe requis.');
    }

    console.log(chalk.cyan('Connexion au portail...'));
    let auth;
    try {
      auth = await portalRequest(
        { ...current, portalBase },
        '/api/auth/login',
        { email, password },
        'POST'
      );
    } catch (error) {
      if (opts.autoSignup && isApiError(error, 401, 'Invalid credentials')) {
        const fullName = deriveFullNameFromEmail(email);
        console.log(chalk.yellow('Compte introuvable sur le portal, creation automatique...'));
        await portalRequest(
          { ...current, portalBase },
          '/api/auth/signup',
          { email, password, full_name: fullName },
          'POST'
        );
        auth = await portalRequest(
          { ...current, portalBase },
          '/api/auth/login',
          { email, password },
          'POST'
        );
      } else if (isApiError(error, 401, 'Invalid credentials')) {
        throw new Error(
          [
            'Identifiants invalides sur le portal.',
            'Si vous avez cree le compte seulement sur OpenWebUI, creez aussi le compte portal:',
            '- fatherpaul-code register',
            'ou',
            '- fatherpaul-code login --auto-signup',
          ].join('\n')
        );
      } else {
        throw error;
      }
    }
    const accessToken = auth?.access_token;
    if (!accessToken) {
      throw new Error('Token non retourne par /api/auth/login');
    }

    const me = await portalRequest(
      { ...current, portalBase, accessToken },
      '/api/me',
      null,
      'GET',
      accessToken
    );
    const sub = await portalRequest(
      { ...current, portalBase, accessToken },
      '/api/subscription/status',
      null,
      'GET',
      accessToken
    );

    if (sub?.status !== 'ACTIVE') {
      throw new Error('Abonnement non actif. Active une formule avant usage CLI.');
    }

    let apiKey = '';
    let apiBaseFromPortal = '';
    try {
      const cliSession = await portalRequest(
        { ...current, portalBase, accessToken },
        '/api/cli/session',
        null,
        'GET',
        accessToken
      );
      apiKey = cliSession?.api_key || '';
      apiBaseFromPortal = normalizeApiBase(cliSession?.api_base_url || '');
    } catch {
      // Backward compatibility: old backend without /api/cli/session.
      const html = await portalHtmlRequest(
        { ...current, portalBase, accessToken },
        '/dashboard',
        accessToken
      );
      apiKey = extractApiKeyFromDashboard(html);
    }

    if (!apiKey) {
      throw new Error('Cle API introuvable via session CLI. Verifie abonnement ou backend /api/cli/session.');
    }

    const next = {
      ...current,
      portalBase,
      apiBase: apiBaseFromPortal || current.apiBase,
      apiKey,
      accessToken,
      authMode: 'session',
      userEmail: me?.email || email,
    };
    await saveConfig(next);

    console.log(chalk.green('Connexion CLI reussie.'));
    console.log(`- User: ${next.userEmail || email}`);
    console.log(`- Plan: ${sub?.plan || 'UNKNOWN'}`);
    console.log(`- API Key: ${maskApiKey(next.apiKey)}`);
    if (sub?.end_at) {
      console.log(`- Expire le: ${sub.end_at}`);
    }
  });

program
  .command('whoami')
  .description('Afficher l utilisateur connecte et son abonnement')
  .addHelpText(
    'after',
    `
Exemple:
  fatherpaul-code whoami
`
  )
  .action(async () => {
    const config = await loadConfig();
    if (!config.accessToken) {
      console.log(chalk.yellow('Aucune session login active. Utilise: fatherpaul-code login'));
      return;
    }
    const me = await portalRequest(config, '/api/me', null, 'GET');
    const sub = await portalRequest(config, '/api/subscription/status', null, 'GET');
    console.log(chalk.cyan('Session CLI'));
    console.log(`- Email: ${me?.email || config.userEmail || '(inconnu)'}`);
    console.log(`- Subscription: ${sub?.status || 'UNKNOWN'}`);
    console.log(`- Plan: ${sub?.plan || '(none)'}`);
    console.log(`- API Key: ${maskApiKey(config.apiKey)}`);
  });

program
  .command('logout')
  .description('Supprimer la session locale CLI')
  .addHelpText(
    'after',
    `
Exemple:
  fatherpaul-code logout
`
  )
  .action(async () => {
    const current = await loadConfig();
    const next = {
      ...current,
      accessToken: '',
      apiKey: '',
      authMode: 'apikey',
      userEmail: '',
    };
    await saveConfig(next);
    console.log(chalk.green('Session locale supprimee.'));
    console.log('Relance fatherpaul-code login pour reutiliser la CLI.');
  });

program
  .command('config')
  .description('Afficher la configuration active')
  .addHelpText(
    'after',
    `
Exemple:
  fatherpaul-code config
`
  )
  .action(async () => {
    const config = await loadConfig();
    console.log(chalk.cyan('Configuration fatherpaul-code'));
    console.log(`- Fichier: ${CONFIG_FILE}`);
    console.log(`- API Base: ${config.apiBase}`);
    console.log(`- Portal Base: ${config.portalBase}`);
    console.log(`- Mode auth: ${config.authMode || 'apikey'}`);
    console.log(`- User: ${config.userEmail || '(non connecte)'}`);
    console.log(`- API Key: ${maskApiKey(config.apiKey)}`);
    console.log(`- Modele par defaut: ${config.defaultModel}`);
    console.log(`- Max tokens: ${config.maxTokens}`);
    console.log(`- Timeout ms: ${config.timeoutMs}`);
    console.log(`- Commandes autorisees: ${(config.allowCommands || []).join(', ')}`);
  });

program
  .command('models')
  .description('Lister les modeles disponibles')
  .addHelpText(
    'after',
    `
Exemple:
  fatherpaul-code models
`
  )
  .action(async () => {
    const config = await loadConfig();
    const data = await apiRequest(config, '/models', null, 'GET');
    const models = Array.isArray(data?.data) ? data.data : [];
    if (!models.length) {
      console.log(chalk.yellow('Aucun modele retourne.'));
      return;
    }
    console.log(chalk.cyan('Modeles disponibles:'));
    for (const item of models) {
      console.log(`- ${item.id}`);
    }
  });

program
  .command('chat [prompt...]')
  .description('Poser une question au modele (mode unique ou interactif)')
  .option('-m, --model <model>', 'Modele')
  .option('-s, --system <text>', 'System prompt')
  .option('--max-tokens <n>', 'Max tokens de reponse', Number)
  .addHelpText(
    'after',
    `
Exemples:
  fatherpaul-code chat
  fatherpaul-code chat "Explique ce code JavaScript"
  fatherpaul-code chat "Resume ce fichier" -m qwen2.5-7b --max-tokens 350

Important:
  - chat --register n existe pas
  - pour creer un compte: fatherpaul-code register
  - pour se connecter: fatherpaul-code login
`
  )
  .action(async (promptArgs, options) => {
    const config = await loadConfig();
    const joined = Array.isArray(promptArgs) ? promptArgs.join(' ').trim() : '';

    if (joined) {
      const answer = await chatOnce(config, joined, {
        model: options.model,
        system: options.system,
        maxTokens: options.maxTokens,
      });
      console.log(chalk.green('\nAssistant:'));
      console.log(answer);
      return;
    }

    console.log(chalk.cyan('Mode chat interactif. Tape /exit pour quitter.'));
    const history = [];

    while (true) {
      const userText = await askInput('Vous');
      if (!userText) continue;
      if (userText === '/exit' || userText === '/quit') break;

      const answer = await chatOnce(config, userText, {
        model: options.model,
        system: options.system,
        maxTokens: options.maxTokens,
        messages: history,
      });

      history.push({ role: 'user', content: userText });
      history.push({ role: 'assistant', content: answer });

      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      console.log(chalk.green('\nAssistant:'));
      console.log(answer);
      console.log('');
    }
  });

program
  .command('edit <file> <instruction...>')
  .description('Modifier un fichier avec l IA (avec preview diff)')
  .option('-m, --model <model>', 'Modele')
  .option('--max-tokens <n>', 'Max tokens', Number)
  .option('--yes', 'Appliquer sans confirmation')
  .option('--no-backup', 'Desactiver backup .bak')
  .addHelpText(
    'after',
    `
Exemples:
  fatherpaul-code edit src/app.js "Ajoute gestion d erreurs"
  fatherpaul-code edit src/service.ts "Refactor en fonctions pures" --yes
`
  )
  .action(async (file, instructionParts, options) => {
    const config = await loadConfig();
    const instruction = instructionParts.join(' ').trim();

    if (!instruction) {
      throw new Error('Instruction vide. Exemple: fatherpaul-code edit src/app.js "Ajoute gestion d erreur"');
    }

    const absolute = path.resolve(process.cwd(), file);
    const oldContent = await fs.readFile(absolute, 'utf8');

    const systemPrompt = [
      'Tu es un assistant de refactorisation de code.',
      'Renvoie UNIQUEMENT le contenu final du fichier, sans markdown, sans explication.',
      'Preserve au maximum le style existant.',
    ].join(' ');

    const userPrompt = [
      `Instruction: ${instruction}`,
      'Fichier actuel:',
      '---FILE_START---',
      oldContent,
      '---FILE_END---',
      'Renvoie seulement le nouveau contenu du fichier.',
      'N inclus pas les marqueurs FILE_START/FILE_END dans ta reponse.',
    ].join('\n');

    console.log(chalk.cyan(`Analyse et edition IA de: ${absolute}`));

    const raw = await chatOnce(config, userPrompt, {
      model: options.model,
      system: systemPrompt,
      maxTokens: options.maxTokens || Math.max(config.maxTokens, 1400),
    });

    let newContent = sanitizeEditedFileContent(raw);
    if (oldContent.endsWith('\n') && !newContent.endsWith('\n')) {
      newContent += '\n';
    }
    const changed = await printDiffPreview(file, oldContent, newContent);
    if (!changed) {
      return;
    }

    if (!options.yes) {
      const ok = await askConfirm('Appliquer ces modifications ?');
      if (!ok) {
        console.log(chalk.yellow('Modification annulee.'));
        return;
      }
    }

    if (options.backup !== false) {
      const backupFile = `${absolute}.bak.${Date.now()}`;
      await fs.writeFile(backupFile, oldContent, 'utf8');
      console.log(chalk.gray(`Backup cree: ${backupFile}`));
    }

    await fs.writeFile(absolute, newContent, 'utf8');
    console.log(chalk.green(`Fichier mis a jour: ${absolute}`));
  });

program
  .command('run <command...>')
  .description('Executer une commande shell avec garde-fous')
  .option('--cwd <path>', 'Dossier de travail', process.cwd())
  .option('--yes', 'Bypass confirmation')
  .option('--dry-run', 'Valider sans executer la commande')
  .addHelpText(
    'after',
    `
Exemples:
  fatherpaul-code run "npm test"
  fatherpaul-code run "git status"
  fatherpaul-code run "powershell -Command Get-ChildItem" --dry-run --yes

Note:
  Les commandes dangereuses sont bloquees automatiquement.
`
  )
  .action(async (commandParts, options) => {
    const config = await loadConfig();
    const command = commandParts.join(' ').trim();

    if (!command) {
      throw new Error('Commande vide.');
    }

    if (isDangerousCommand(command)) {
      throw new Error('Commande bloquee: motif dangereux detecte.');
    }

    if (!isAllowedCommand(command, config)) {
      throw new Error(
        `Commande non autorisee (${firstToken(command)}). Autorisees: ${(config.allowCommands || []).join(', ')}`
      );
    }

    if (!options.yes && !isLikelyReadOnly(command)) {
      const ok = await askConfirm(`Confirmer l execution: ${command}`);
      if (!ok) {
        console.log(chalk.yellow('Execution annulee.'));
        return;
      }
    }

    if (options.dryRun) {
      console.log(chalk.green('Validation OK (dry-run).'));
      console.log(`- Commande: ${command}`);
      console.log(`- CWD: ${path.resolve(options.cwd)}`);
      return;
    }

    console.log(chalk.cyan(`Execution: ${command}`));
    await runCommand(command, path.resolve(options.cwd));
    console.log(chalk.green('Commande terminee.'));
  });

program
  .command('doctor')
  .description('Verifier la connectivite API et le modele par defaut')
  .addHelpText(
    'after',
    `
Exemple:
  fatherpaul-code doctor
`
  )
  .action(async () => {
    const config = await loadConfig();
    console.log(chalk.cyan('Verification de la configuration...'));
    console.log(`- API Base: ${config.apiBase}`);
    console.log(`- Portal Base: ${config.portalBase}`);
    console.log(`- Mode auth: ${config.authMode || 'apikey'}`);
    console.log(`- API Key: ${maskApiKey(config.apiKey)}`);
    console.log(`- Modele: ${config.defaultModel}`);

    const models = await apiRequest(config, '/models', null, 'GET');
    const ids = (models?.data || []).map((m) => m.id);
    console.log(chalk.green(`- Modeles visibles: ${ids.length}`));

    const pong = await chatOnce(config, 'Reponds uniquement: OK', {
      model: config.defaultModel,
      maxTokens: 16,
    });

    console.log(chalk.green('Test chat OK:'));
    console.log(`- Reponse: ${pong}`);
  });

program
  .command('help-quick')
  .description('Aide rapide')
  .action(() => {
    console.log(`
+ fatherpaul-code init
+ fatherpaul-code register
+ fatherpaul-code login
+ fatherpaul-code whoami
+ fatherpaul-code models
+ fatherpaul-code chat "Ecris une fonction JS debounce"
+ fatherpaul-code edit src/app.js "Ajoute gestion d erreurs"
+ fatherpaul-code run "npm test"
+ fatherpaul-code logout
`);
  });

program.parseAsync(process.argv).catch((err) => {
  if (err?.code === 'commander.helpDisplayed' || err?.code === 'commander.version') {
    process.exit(0);
  }
  const message = err?.message || String(err);
  const cleanMessage = String(message).replace(/^error:\s*/i, '');
  const lower = cleanMessage.toLowerCase();
  const tips = [];
  if (lower.includes("unknown option '--register'")) {
    tips.push('Astuce: --register n existe pas sur chat. Utilise: fatherpaul-code register');
  }
  if (lower.includes('invalid credentials')) {
    tips.push('Astuce: fatherpaul-code login --auto-signup');
  }
  if (lower.includes('api key manquante')) {
    tips.push('Astuce: fatherpaul-code login');
  }
  if (lower.includes('abonnement non actif')) {
    tips.push('Astuce: active une offre, puis relance fatherpaul-code login');
  }

  const suffix = tips.length ? `\n${tips.map((tip) => `- ${tip}`).join('\n')}` : '';
  console.error(chalk.red(`Erreur: ${cleanMessage}${suffix}`));
  process.exit(1);
});
