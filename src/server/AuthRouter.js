import express from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

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
    const email = sanitizeEmail(req.body?.email);
    const passwordHash = hashPassword(req.body?.password);
    const accounts = await readAccounts(dataFile);
    const account = accounts.find((entry) => entry.email === email && entry.passwordHash === passwordHash);
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