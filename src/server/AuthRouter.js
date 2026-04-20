import express from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const DEVELOPER_TEST_ACCOUNT = {
  id: 'dev-tester-kakababa',
  email: 'kakababa@oldeden.dev',
  pilotName: 'kakababa',
  password: '1234',
  walletAddress: '',
  loginMode: 'developer',
  premiumUntil: 0,
  premiumTier: 'developer',
  createdAt: 1,
};

function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitizeWallet(value) {
  const wallet = String(value || '').trim();
  return /^0x[a-fA-F0-9]{40}$/.test(wallet) ? wallet : '';
}

function hashPassword(password) {
  return createHash('sha256').update(String(password || '')).digest('hex');
}

function sanitizeLoginId(value) {
  return String(value || '').trim().toLowerCase();
}

async function ensureFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf8');
  }
}

async function readAccounts(filePath) {
  await ensureFile(filePath);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeAccounts(filePath, accounts) {
  await ensureFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(accounts, null, 2), 'utf8');
}

async function ensureDeveloperTestAccount(filePath) {
  const accounts = await readAccounts(filePath);
  const loginKeys = new Set([
    sanitizeLoginId(DEVELOPER_TEST_ACCOUNT.email),
    sanitizeLoginId(DEVELOPER_TEST_ACCOUNT.pilotName),
  ]);
  const seededAccount = {
    ...DEVELOPER_TEST_ACCOUNT,
    passwordHash: hashPassword(DEVELOPER_TEST_ACCOUNT.password),
  };
  const existingIndex = accounts.findIndex((account) => loginKeys.has(sanitizeLoginId(account.email)) || loginKeys.has(sanitizeLoginId(account.pilotName)));

  if (existingIndex >= 0) {
    const current = accounts[existingIndex];
    accounts[existingIndex] = {
      ...current,
      ...seededAccount,
      id: current.id || seededAccount.id,
      createdAt: current.createdAt || seededAccount.createdAt,
    };
  } else {
    accounts.unshift(seededAccount);
  }

  await writeAccounts(filePath, accounts);
  return accounts;
}

function publicAccount(account) {
  return {
    id: account.id,
    email: account.email,
    pilotName: account.pilotName,
    walletAddress: account.walletAddress,
    loginMode: account.loginMode,
    createdAt: account.createdAt,
    premiumUntil: account.premiumUntil || 0,
    premiumTier: account.premiumTier || 'free',
  };
}

export function createAuthRouter({ dataFile = path.resolve('saves', 'accounts.json') } = {}) {
  const router = express.Router();

  router.use(async (_req, _res, next) => {
    try {
      await ensureDeveloperTestAccount(dataFile);
      next();
    } catch (error) {
      next(error);
    }
  });

  router.post('/signup', async (req, res) => {
    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const pilotName = String(req.body?.pilotName || '').trim().slice(0, 32);
    const walletAddress = sanitizeWallet(req.body?.walletAddress);
    const loginMode = walletAddress ? 'wallet+email' : 'email';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const accounts = await readAccounts(dataFile);
    if (accounts.some((account) => account.email === email)) {
      return res.status(409).json({ error: 'Account already exists.' });
    }

    const account = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(password),
      pilotName,
      walletAddress,
      loginMode,
      createdAt: Date.now(),
      premiumUntil: 0,
      premiumTier: 'free',
    };
    accounts.push(account);
    await writeAccounts(dataFile, accounts);
    res.status(201).json({ ok: true, account: publicAccount(account) });
  });

  router.post('/login', async (req, res) => {
    const loginId = sanitizeLoginId(req.body?.email || req.body?.username || req.body?.pilotName);
    const passwordHash = hashPassword(req.body?.password);
    const accounts = await ensureDeveloperTestAccount(dataFile);
    const account = accounts.find((entry) => {
      const email = sanitizeLoginId(entry.email);
      const pilotName = sanitizeLoginId(entry.pilotName);
      return passwordHash === entry.passwordHash && (loginId === email || loginId === pilotName);
    });
    if (!account) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    res.json({ ok: true, account: publicAccount(account) });
  });

  router.post('/link-wallet', async (req, res) => {
    const email = sanitizeEmail(req.body?.email);
    const walletAddress = sanitizeWallet(req.body?.walletAddress);
    if (!email || !walletAddress) {
      return res.status(400).json({ error: 'Email and wallet address are required.' });
    }
    const accounts = await readAccounts(dataFile);
    const account = accounts.find((entry) => entry.email === email);
    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    account.walletAddress = walletAddress;
    if (account.loginMode === 'email') account.loginMode = 'wallet+email';
    await writeAccounts(dataFile, accounts);
    res.json({ ok: true, account: publicAccount(account) });
  });

  return router;
}