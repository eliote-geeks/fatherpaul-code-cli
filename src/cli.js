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

const CONFIG_DIR = path.join(os.homedir(), '.config', 'fatherpaul-code');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  apiBase: 'https://ai-api-dev.79.137.32.27.nip.io/v1',
  apiKey: '',
  defaultModel: 'qwen2.5-7b',
  maxTokens: 512,
  timeoutMs: 90000,
  allowCommands: [
    'ls', 'pwd', 'cat', 'echo', 'rg', 'grep', 'find', 'head', 'tail', 'wc',
    'git', 'npm', 'node', 'npx', 'pnpm', 'yarn', 'mvn', 'gradle', 'java',
    'python', 'python3', 'docker', 'kubectl', 'helm', 'sed', 'awk', 'cp',
    'mv', 'mkdir', 'touch', 'chmod'
  ]
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
  /(^|\s)chmod\s+-R\s+777\s+\//i
];

function normalizeApiBase(value) {
  return (value || '').trim().replace(/\/+$/, '');
}

async function ensureConfigDir() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      apiBase: normalizeApiBase(parsed.apiBase || DEFAULT_CONFIG.apiBase),
      allowCommands: Array.isArray(parsed.allowCommands)
        ? parsed.allowCommands
        : DEFAULT_CONFIG.allowCommands,
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
  };
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function maskApiKey(apiKey) {
  if (!apiKey) return '(non configuree)';
  if (apiKey.length <= 10) return `${apiKey.slice(0, 3)}***`;
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
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
  return parts[0] || '';
}

function isDangerousCommand(command) {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(command));
}

function isAllowedCommand(command, config) {
  const token = firstToken(command);
  const allow = Array.isArray(config.allowCommands) && config.allowCommands.length
    ? config.allowCommands
    : DEFAULT_CONFIG.allowCommands;
  return allow.includes(token);
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

async function apiRequest(config, endpoint, payload, method = 'POST') {
  const apiBase = normalizeApiBase(config.apiBase);
  if (!apiBase) {
    throw new Error('API base manquante. Lance: fatherpaul-code init');
  }
  if (!config.apiKey) {
    throw new Error('API key manquante. Lance: fatherpaul-code init');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Number(config.timeoutMs) || 90000);

  const url = `${apiBase}/${endpoint.replace(/^\/+/, '')}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
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

async function printDiffPreview(filePath, oldContent, newContent) {
  const base = path.basename(filePath);
  const oldFile = path.join(tmpdir(), `fatherpaul-old-${Date.now()}-${base}`);
  const newFile = path.join(tmpdir(), `fatherpaul-new-${Date.now()}-${base}`);

  await fs.writeFile(oldFile, oldContent, 'utf8');
  await fs.writeFile(newFile, newContent, 'utf8');

  const child = spawn('diff', ['-u', '--label', `${filePath} (old)`, oldFile, '--label', `${filePath} (new)`, newFile], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const code = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  await fs.rm(oldFile, { force: true });
  await fs.rm(newFile, { force: true });

  if (stderr.trim()) {
    console.log(chalk.yellow(stderr.trim()));
  }

  if (code === 0) {
    console.log(chalk.gray('Aucun changement detecte.'));
    return false;
  }

  console.log(chalk.cyan('\n--- Apercu des modifications ---'));
  console.log(stdout || chalk.gray('(diff indisponible)'));
  return true;
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

program
  .name('fatherpaul-code')
  .description('CLI IA Father Paul Assistant (chat, edition de code, terminal controle)')
  .version('0.1.0');

program
  .command('init')
  .description('Configurer endpoint API, cle et modele par defaut')
  .option('--api-base <url>', 'API base URL, ex: https://ai-api-dev.../v1')
  .option('--api-key <key>', 'Cle API client')
  .option('--model <model>', 'Modele par defaut, ex: qwen2.5-7b')
  .action(async (opts) => {
    const current = await loadConfig();

    const apiBase = normalizeApiBase(
      opts.apiBase || (await askInput('API Base URL', current.apiBase || DEFAULT_CONFIG.apiBase))
    );

    const apiKey = opts.apiKey || (await askPassword('API Key (sk-...)')) || current.apiKey;

    const defaultModel = opts.model || (await askInput('Modele par defaut', current.defaultModel));

    const next = {
      ...current,
      apiBase,
      apiKey,
      defaultModel,
    };

    await saveConfig(next);

    console.log(chalk.green('Configuration enregistree.'));
    console.log(`- Fichier: ${CONFIG_FILE}`);
    console.log(`- API Base: ${next.apiBase}`);
    console.log(`- API Key: ${maskApiKey(next.apiKey)}`);
    console.log(`- Modele: ${next.defaultModel}`);
  });

program
  .command('config')
  .description('Afficher la configuration active')
  .action(async () => {
    const config = await loadConfig();
    console.log(chalk.cyan('Configuration fatherpaul-code'));
    console.log(`- Fichier: ${CONFIG_FILE}`);
    console.log(`- API Base: ${config.apiBase}`);
    console.log(`- API Key: ${maskApiKey(config.apiKey)}`);
    console.log(`- Modele par defaut: ${config.defaultModel}`);
    console.log(`- Max tokens: ${config.maxTokens}`);
    console.log(`- Timeout ms: ${config.timeoutMs}`);
    console.log(`- Commandes autorisees: ${(config.allowCommands || []).join(', ')}`);
  });

program
  .command('models')
  .description('Lister les modeles disponibles')
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

    console.log(chalk.cyan(`Execution: ${command}`));
    await runCommand(command, path.resolve(options.cwd));
    console.log(chalk.green('Commande terminee.'));
  });

program
  .command('doctor')
  .description('Verifier la connectivite API et le modele par defaut')
  .action(async () => {
    const config = await loadConfig();
    console.log(chalk.cyan('Verification de la configuration...'));
    console.log(`- API Base: ${config.apiBase}`);
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
+ fatherpaul-code models
+ fatherpaul-code chat "Ecris une fonction JS debounce"
+ fatherpaul-code edit src/app.js "Ajoute gestion d erreurs"
+ fatherpaul-code run "npm test"
`);
  });

program.parseAsync(process.argv).catch((err) => {
  const message = err?.message || String(err);
  console.error(chalk.red(`Erreur: ${message}`));
  process.exit(1);
});
