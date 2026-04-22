import { GameEngine } from './GameEngine.js';
import { RebirthSystem } from '../systems/RebirthSystem.js';
import { GeneticSystem } from '../systems/GeneticSystem.js';
import { MutationSystem } from '../systems/MutationSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { ProceduralGenerator } from '../systems/ProceduralGenerator.js';
import { ExplorationSystem } from '../systems/ExplorationSystem.js';
import { SoulFractureSystem } from '../systems/SoulFractureSystem.js';
import { AscensionSystem } from '../systems/AscensionSystem.js';
import { CyclePass } from '../systems/CyclePass.js';
import { CosmeticsStore } from '../systems/CosmeticsStore.js';
import { AIDirector } from '../ai/AIDirector.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { FactionSystem, FACTIONS } from '../systems/FactionSystem.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { SkillSystem } from '../systems/SkillSystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { DialogueSystem } from '../systems/DialogueSystem.js';
import { FactionStorylineSystem } from '../systems/FactionStorylineSystem.js';
import { NarrativeIntegrationSystem } from '../systems/NarrativeIntegrationSystem.js';
import { EnemySpawnSystem } from '../systems/EnemySpawnSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { BossSystem } from '../systems/BossSystem.js';
import { LeaderboardSystem } from '../systems/LeaderboardSystem.js';
const leaderboard = new LeaderboardSystem();
import { BountySystem } from '../systems/BountySystem.js';
import { GuildSystem } from '../systems/GuildSystem.js';
import { PlayerTradingSystem } from '../systems/PlayerTradingSystem.js';
import { FleetSystem } from '../systems/FleetSystem.js';
import { AuctionHouseSystem } from '../systems/AuctionHouseSystem.js';
import { CommunicationSystem } from '../systems/CommunicationSystem.js';
import { TerritoryControlSystem } from '../systems/TerritoryControlSystem.js';
import { createHttpServer } from '../server/HttpServer.js';
import { FileStore } from '../persistence/FileStore.js';
import { MongoStore } from '../persistence/MongoStore.js';
import { Server as SocketServer } from 'socket.io';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ── Process safety ──────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Main] Uncaught exception:', err);
  process.exit(1);
});

const engine = new GameEngine({ tickRateMs: parseInt(process.env.GAME_TICK_MS ?? '100', 10) });

// ── Standalone systems (no cross-dependencies) ──────────────────────────────
const genetics = new GeneticSystem();
const mutation = new MutationSystem();
const npc = new NPCSystem();
const economy = new EconomySystem();
const rebirth = new RebirthSystem();
const procedural = new ProceduralGenerator();
const exploration = new ExplorationSystem();
const fracture = new SoulFractureSystem();
const ascension = new AscensionSystem();
const cyclepass = new CyclePass();
const cosmetics = new CosmeticsStore();
const director = new AIDirector();
const combat = new CombatSystem();
const factions = new FactionSystem();
const inventory = new InventorySystem();
const skills = new SkillSystem();
const quests = new QuestSystem();
const dialogue = new DialogueSystem();
const storylines = new FactionStorylineSystem();
const narrative = new NarrativeIntegrationSystem();

// ── Systems with cross-dependencies ─────────────────────────────────────────
const enemies = new EnemySpawnSystem(npc, combat);
const projectiles = new ProjectileSystem(combat);
const bosses = new BossSystem(npc, combat, enemies);
const bounties = new BountySystem(engine);

// ── Multiplayer systems (Phase 3) ───────────────────────────────────────────
const guilds = new GuildSystem(engine);
const playerTrading = new PlayerTradingSystem(engine);
const fleets = new FleetSystem(engine);
const auctionHouse = new AuctionHouseSystem(engine);
const communication = new CommunicationSystem(engine);
const territoryControl = new TerritoryControlSystem(engine);

engine
  .registerSystem('genetics', genetics)
  .registerSystem('mutation', mutation)
  .registerSystem('npc', npc)
  .registerSystem('economy', economy)
  .registerSystem('combat', combat)
  .registerSystem('factions', factions)
  .registerSystem('inventory', inventory)
  .registerSystem('skills', skills)
  .registerSystem('quests', quests)
  .registerSystem('dialogue', dialogue)
  .registerSystem('storylines', storylines)
  .registerSystem('narrative', narrative)
  .registerSystem('rebirth', rebirth)
  .registerSystem('procedural', procedural)
  .registerSystem('exploration', exploration)
  .registerSystem('fracture', fracture)
  .registerSystem('ascension', ascension)
  .registerSystem('cyclepass', cyclepass)
  .registerSystem('cosmetics', cosmetics)
  .registerSystem('enemies', enemies)
  .registerSystem('projectiles', projectiles)
  .registerSystem('bosses', bosses)
  .registerSystem('bounties', bounties)
  .registerSystem('guilds', guilds)
  .registerSystem('playerTrading', playerTrading)
  .registerSystem('fleets', fleets)
  .registerSystem('auctionHouse', auctionHouse)
  .registerSystem('communication', communication)
  .registerSystem('territoryControl', territoryControl)
  .registerSystem('director', director)
  .registerSystem('leaderboard', leaderboard);

// ── Persistence ──────────────────────────────────────────────────────────────
let store;
if (typeof process.env.MONGODB_URI === 'string' && process.env.MONGODB_URI.length > 0) {
  store = new MongoStore(process.env.MONGODB_URI);
  await store.init();
  try {
    await leaderboard.init(process.env.MONGODB_URI);
  } catch (err) {
    console.warn('[Main] Leaderboard MongoDB init failed:', err?.message || err);
  }
  if (!store.connected) {
    console.warn('[Main] MongoDB unavailable — falling back to FileStore');
    store = new FileStore(path.resolve(PROJECT_ROOT, process.env.SAVE_DIR ?? 'saves'));
    await store.init();
    console.log('[Main] Persistence: FileStore (fallback)');
  } else {
    console.log('[Main] Persistence: MongoStore');
  }
} else {
  store = new FileStore(path.resolve(PROJECT_ROOT, process.env.SAVE_DIR ?? 'saves'));
  await store.init();
  console.log('[Main] Persistence: FileStore');
}
const fileStore = store;

/** In-memory player state keyed by socketId → { playerId, name, faction, wallet, quests, inventory } */
const players = new Map();

// Bounty table for combat kills
const KILL_BOUNTIES = { scout: 15, fighter: 30, bomber: 60, interceptor: 20 };

// Station commodities (server-authoritative prices)
const COMMODITIES = [
  { name: 'Titanite Ore',         base: 120 },
  { name: 'Hydrogen Fuel',        base: 45 },
  { name: 'Dark Matter Crystals', base: 850 },
  { name: 'Bio-organic Materials', base: 200 },
  { name: 'Quantum Processors',   base: 1200 },
  { name: 'Anti-matter Reserves', base: 2000 },
];

// Station prices are deterministic (seed-based) — cache per systemIdx
const _stationPriceCache = new Map();
function getStationPrices(systemIdx) {
  let cached = _stationPriceCache.get(systemIdx);
  if (cached) return cached;
  const seed = systemIdx * 7 + 13;
  const prices = COMMODITIES.map((c, i) => {
    const variance = 0.9 + ((Math.sin(seed + i * 3.7) + 1) / 2) * 0.2;
    const buy = Math.round(c.base * variance);
    const sell = Math.round(buy * 0.72);
    return { name: c.name, buy, sell };
  });
  _stationPriceCache.set(systemIdx, prices);
  return prices;
}

// Register story-driven faction quests from FactionStorylineSystem
// Replaces procedural STARTER_QUESTS with rich narrative missions
console.log('[Main] Initializing story-driven faction mission system...');
// Story missions are registered automatically by the FactionStorylineSystem
// Players discover missions through NPC interactions and reputation requirements

// Legacy procedural quests (kept for backward compatibility, lower priority)
const LEGACY_QUESTS = [
  { id: 'q-kill-scouts',  name: 'Thin the Ranks',   objectives: [{ type: 'kill', target: 'scout', required: 5 }],  rewards: { credits: 500 } },
  { id: 'q-kill-fighters', name: 'Dogfight Ace',     objectives: [{ type: 'kill', target: 'fighter', required: 3 }], rewards: { credits: 800 } },
  { id: 'q-visit-3',      name: 'Star Cartographer', objectives: [{ type: 'visit', target: '*', required: 3 }],      rewards: { credits: 600 } },
];
LEGACY_QUESTS.forEach(q => quests.registerQuest(q));

// ── HTTP Server ──────────────────────────────────────────────────────────────
const httpPort = parseInt(process.env.PORT ?? '3847', 10);
const uploadDir = path.resolve(PROJECT_ROOT, process.env.UPLOAD_DIR ?? 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const maxFileSize = parseInt(process.env.MAX_UPLOAD_SIZE ?? '157286400', 10); // 150 MB default

const { app, start: startHttp, addFallback } = createHttpServer({
  uploadDir,
  maxFileSize,
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : undefined,
});

// ── Game API Routes ──────────────────────────────────────────────────────────
app.get('/api/game/factions', (_req, res) => {
  res.json(FACTIONS);
});

app.get('/api/game/genome', (_req, res) => {
  const gen = engine.getSystem('genetics');
  res.json({ genome: Array.from(gen.generateRandom()) });
});

app.get('/api/game/starmap', (_req, res) => {
  const proc = engine.getSystem('procedural');
  const systems = [];
  for (let i = 0; i < 40; i++) {
    systems.push(proc.generateStarSystem(`system-${i}`));
  }
  res.json({ systems });
});

app.get('/api/game/quests', (_req, res) => {
  const proc = engine.getSystem('procedural');
  const questHooks = [];
  for (let i = 0; i < 5; i++) {
    questHooks.push(proc.generateQuestHook());
  }
  res.json({ quests: questHooks });
});

app.get('/api/game/economy/rates', (_req, res) => {
  const econ = engine.getSystem('economy');
  res.json(econ.getExchangeRates());
});

// ── Cosmetics Store API ──────────────────────────────────────────────────────

app.get('/api/game/cosmetics/catalog', (_req, res) => {
  const cosmetics = engine.getSystem('cosmetics');
  const catalog = cosmetics.getCatalog().map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.priceSm || item.price || 100,
    rarity: item.rarity || 'common',
    description: item.description,
    available: item.available !== false,
  }));
  res.json({ catalog });
});

app.get('/api/game/cosmetics/inventory/:playerId', (req, res) => {
  const { playerId } = req.params;
  const cosmetics = engine.getSystem('cosmetics');
  const inventory = cosmetics.getPlayerCosmetics(playerId) || [];
  res.json({ inventory });
});

app.post('/api/game/cosmetics/purchase', async (req, res) => {
  try {
    const { playerId, itemId } = req.body;
    if (!playerId || !itemId) {
      return res.status(400).json({ error: 'Missing playerId or itemId' });
    }
    
    const cosmetics = engine.getSystem('cosmetics');
    const result = cosmetics.purchase(playerId, itemId);
    
    if (result.success) {
      res.json({ success: true, message: 'Cosmetic purchased!' });
    } else {
      res.status(409).json({ success: false, reason: result.reason });
    }
  } catch (err) {
    console.error('[API] Cosmetics purchase error:', err);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// /api/game/systems intentionally removed — exposed internal engine details

// ── Save / Load API ──────────────────────────────────────────────────────────
app.post('/api/game/save', async (req, res) => {
  try {
    const { playerId, data } = req.body;
    if (!playerId || typeof playerId !== 'string' || !data) {
      return res.status(400).json({ error: 'Missing playerId or data' });
    }
    // Verify playerId belongs to an active socket session
    let authorised = false;
    for (const [, p] of players) {
      if (p.playerId === playerId) { authorised = true; break; }
    }
    if (!authorised) {
      return res.status(403).json({ error: 'No active session for this player' });
    }
    // Payload size guard — reject excessively large saves (> 512 KB)
    const payloadSize = JSON.stringify(data).length;
    if (payloadSize > 524288) {
      return res.status(413).json({ error: 'Payload too large' });
    }
    // Allowlist filter — same keys permitted via Socket save
    const ALLOWED_SAVE_KEYS = ['playerId', 'name', 'faction', 'genome', 'wallet', 'trades',
      'position', 'rotation', 'currentSystem', 'settings', 'combat', 'inventory',
      'quests', 'upgrades', 'flight', 'pastLives', 'skills', 'soulMemory',
      'activeWeapon', 'persistentItems', 'currentSkin', 'market', 'insuredItemId',
      'chatbot', 'factionRep', 'ship', 'location', 'savedAt'];
    const filtered = {};
    for (const key of ALLOWED_SAVE_KEYS) {
      if (data[key] !== undefined) filtered[key] = data[key];
    }
    await fileStore.save(playerId, filtered);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/game/load/:id', async (req, res) => {
  try {
    // Authorization: only allow loading if the requesting player ID matches an active session
    const requestedId = req.params.id;
    let authorized = false;
    for (const [, player] of players) {
      if (player.playerId === requestedId) { authorized = true; break; }
    }
    if (!authorized) return res.status(403).json({ error: 'Unauthorized — no active session for this player' });
    const data = await fileStore.load(requestedId);
    if (!data) return res.status(404).json({ error: 'Save not found' });
    res.json(data);
  } catch (e) {
    console.error('[API] Load error:', e.message);
    res.status(500).json({ error: 'Failed to load save' });
  }
});

// ── Leaderboard API ──
app.get('/api/game/leaderboard/top', async (_req, res) => {
  try {
    const top = await leaderboard.getTopScores(10);
    res.json({ top });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/api/game/leaderboard/rank/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const rank = await leaderboard.getPlayerRank(playerId);
    if (!rank) return res.status(404).json({ error: 'Not found' });
    res.json(rank);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.post('/api/game/leaderboard/submit', async (req, res) => {
  try {
    const { playerId, name, score, kills, credits } = req.body;
    if (!playerId || !name) return res.status(400).json({ error: 'Missing playerId or name' });
    await leaderboard.submitScore(playerId, name, score, kills, credits);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA fallback — MUST be last route
addFallback();

// Graceful shutdown
let httpServer;
let io;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n[Main] Received ${signal} — shutting down…`);
    io?.close();
    await new Promise(resolve => httpServer?.close(resolve) ?? resolve());
    await engine.stop();
    console.log('[Main] Shutdown complete.');
    process.exit(0);
  });
}

await engine.start();

// Seed initial NPC population for the Rebirth Lottery
{
  const npcSys = engine.getSystem('npc');
  const genSys = engine.getSystem('genetics');
  if (npcSys.getLivingNPCPool().length < 50) {
    for (let i = 0; i < 100; i++) {
      npcSys.spawnNPC({
        genome: genSys.generateRandom(),
        sectorId: `sector-${Math.floor(Math.random() * 40)}`,
        credits: Math.floor(Math.random() * 100000),
        ageYears: 18 + Math.floor(Math.random() * 62),
      });
    }
    console.log('[Main] Seeded 100 NPCs for Rebirth Lottery.');
  }
}

httpServer = await startHttp(httpPort);

// Resolve actual port (may differ from httpPort if auto-rotated)
const actualPort = httpServer.address().port;

// ── Socket.IO ────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
      `http://localhost:${actualPort}`,
      'https://oldeden.onrender.com',
    ];

io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins },
  maxHttpBufferSize: 65536, // 64KB — prevents message-flood DoS
});

// ── Socket.IO connection limit per IP ────────────────────────────────────────
const IP_CONNECTION_LIMIT = 5;
const ipConnectionCounts = new Map();

io.use((socket, next) => {
  const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || socket.handshake.address || 'unknown';
  const count = ipConnectionCounts.get(ip) || 0;
  if (count >= IP_CONNECTION_LIMIT) {
    return next(new Error('Too many connections from this IP'));
  }
  ipConnectionCounts.set(ip, count + 1);
  socket.once('disconnect', () => {
    const c = ipConnectionCounts.get(ip) || 1;
    if (c <= 1) ipConnectionCounts.delete(ip);
    else ipConnectionCounts.set(ip, c - 1);
  });
  next();
});

// ── Rate Limiter (IP-based, shared across reconnections) ─────────────────────
const RATE_LIMITS = {
  'combat:kill':     { max: 10, windowMs: 1000 },
  'station:buy':     { max: 5,  windowMs: 1000 },
  'station:sell':    { max: 5,  windowMs: 1000 },
  'rebirth:perform': { max: 1,  windowMs: 5000 },
  'game:save':       { max: 1,  windowMs: 3000 },
  'game:load':       { max: 1,  windowMs: 3000 },
  'quest:accept':    { max: 5,  windowMs: 1000 },
  'cargo:deposit':   { max: 3,  windowMs: 1000 },
  'death:report':    { max: 2,  windowMs: 5000 },
  'system:visit':    { max: 3,  windowMs: 1000 },
  'starmap:request': { max: 2,  windowMs: 5000 },
  'quests:request':  { max: 2,  windowMs: 5000 },
  'player:sync':     { max: 3,  windowMs: 1000 },
  // Multiplayer system rate limits
  'guild:create':    { max: 1,  windowMs: 30000 },
  'guild:invite':    { max: 5,  windowMs: 10000 },
  'trade:propose':   { max: 3,  windowMs: 5000 },
  'fleet:create':    { max: 2,  windowMs: 60000 },
  'market:createOrder': { max: 10, windowMs: 10000 },
  'chat:sendMessage': { max: 20, windowMs: 10000 },
  'territory:claim': { max: 1,  windowMs: 60000 },
  'territory:attack': { max: 2, windowMs: 30000 },
};

/** IP-based rate limiter map — shared across all sockets from the same IP */
const ipRateLimiters = new Map();

function getOrCreateIPLimiter(ip) {
  let limiter = ipRateLimiters.get(ip);
  if (!limiter) {
    limiter = { counters: new Map(), lastActive: Date.now() };
    ipRateLimiters.set(ip, limiter);
  }
  limiter.lastActive = Date.now();
  return limiter;
}

function checkRate(limiter, eventName) {
  const limit = RATE_LIMITS[eventName];
  if (!limit) return true;
  const now = Date.now();
  let entry = limiter.counters.get(eventName);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    limiter.counters.set(eventName, entry);
  }
  entry.count++;
  return entry.count <= limit.max;
}

// Prune stale IP limiter entries every 60 seconds
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, limiter] of ipRateLimiters) {
    if (limiter.lastActive < cutoff) ipRateLimiters.delete(ip);
  }
}, 60_000).unref();

io.on('connection', (socket) => {
    // ── Leaderboard auto-submit on disconnect ──
    socket.on('disconnect', async () => {
      const player = players.get(socket.id);
      if (player) {
        // Composite score: kills * 10 + credits / 1000
        const score = (player.kills || 0) * 10 + Math.floor((player.credits || 0) / 1000);
        await leaderboard.submitScore(player.playerId, player.name, score, player.kills || 0, player.credits || 0);
      }
    });
    const inventorySys = engine.getSystem('inventory');
    const combatSys = engine.getSystem('combat');
    socket.on('inventory:use_consumable', (data) => {
      try {
        const player = players.get(socket.id);
        if (!player) return;
        const itemId = typeof data?.itemId === 'string' ? data.itemId : '';
        if (!itemId) return;
        // Attempt to use the consumable
        const used = inventorySys.useConsumable(player.playerId, itemId);
        if (!used) {
          socket.emit('inventory:use_failed', { itemId, reason: 'Not found or not consumable' });
          return;
        }
        // Determine effect by itemId (simple hardcoded mapping for now)
        // In production, this should use item stats/definitions
        if (itemId === 'repair_kit') {
          // Restore hull (combat stats)
          if (!player.combat) player.combat = {};
          player.combat.hull = Math.min((player.combat.hull ?? 100) + 50, 100);
          socket.emit('inventory:consumable_used', { itemId, effect: 'hull_restored', value: 50, hull: player.combat.hull });
        } else if (itemId === 'shield_cell') {
          // Restore shield (if shield system present)
          const shield = combatSys.getShield(player.playerId);
          if (shield) {
            shield.currentHp = Math.min(shield.maxCapacity, shield.currentHp + 50);
            socket.emit('inventory:consumable_used', { itemId, effect: 'shield_restored', value: 50, shield: shield.currentHp });
          } else {
            socket.emit('inventory:consumable_used', { itemId, effect: 'no_shield', value: 0 });
          }
        } else if (itemId === 'emp_grenade') {
          // EMP disables enemy shield (simulate by emitting event)
          // In a real game, would need target selection
          socket.emit('inventory:consumable_used', { itemId, effect: 'emp_triggered' });
        } else {
          socket.emit('inventory:consumable_used', { itemId, effect: 'unknown' });
        }
      } catch (err) { console.error('[Socket] inventory:use_consumable error:', err.message); }
    });
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // IP-based rate limiter — persists across reconnections from same IP
  const clientIP = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || socket.handshake.address
    || 'unknown';
  const ipLimiter = getOrCreateIPLimiter(clientIP);
  let rateViolations = 0;
  const MAX_RATE_VIOLATIONS = 50;
  // Known event names — deny-by-default for unknown events
  const KNOWN_EVENTS = new Set([
    ...Object.keys(RATE_LIMITS),
    'player:create', 'player:sync', 'economy:sync',
    'station:repair', 'station:refuel', 'station:upgrade',
    'station:enter', 'station:buy', 'station:sell',
    'quest:list', 'quest:accept',
    'rebirth:sync', 'cargo:deposit',
    'disconnect', 'disconnecting',
    // Multiplayer system events
    'guild:info', 'guild:acceptInvite', 'trade:addItem', 'trade:confirm',
    'fleet:invite', 'fleet:setDestination', 'market:getOrders', 'market:getPrices',
    'chat:joinChannel', 'chat:privateMessage', 'territory:getClaimable',
    'bounty:board', 'bounty:accept', 'bounty:active', 'bounty:abandon',
    'inventory:use_consumable',
  ]);
  socket.use(([eventName], next) => {
    if (!KNOWN_EVENTS.has(eventName)) {
      console.warn(`[Security] ${clientIP} (${socket.id}) unknown event: ${eventName}`);
      return; // Silently drop unknown events
    }
    if (!checkRate(ipLimiter, eventName)) {
      rateViolations++;
      if (rateViolations > MAX_RATE_VIOLATIONS) {
        console.warn(`[RateLimit] ${clientIP} (${socket.id}) exceeded max violations, disconnecting`);
        socket.disconnect(true);
        return;
      }
      console.warn(`[RateLimit] ${clientIP} (${socket.id}) exceeded limit for ${eventName}`);
      socket.emit('rate:limited', { event: eventName });
      return;
    }
    next();
  });

  socket.emit('game:init', {
    tickRate: engine.tickRateMs,
  });

  socket.on('player:create', (data) => {
    try {
    // Prevent duplicate session on same socket
    if (players.has(socket.id)) return;
    // Input validation
    const name = typeof data?.name === 'string' ? data.name.slice(0, 32).replace(/[<>"'&]/g, '') : 'Unknown Pilot';
    const faction = typeof data?.faction === 'string' && FACTIONS.some(f => f.id === data.faction)
      ? data.faction : 'free_traders';

    const gen = engine.getSystem('genetics');
    const genome = Array.from(gen.generateRandom());
    const econ = engine.getSystem('economy');
    const playerId = randomUUID();
    const wallet = econ.getWallet(playerId);

    // Track player on this socket
    players.set(socket.id, {
      playerId, name, faction, genome,
      activeQuests: new Map(),
      visitedSystems: new Set(),
      trades: 0,
      cargo: new Map(),          // itemName → quantity (server-verified)
      currentStation: -1,        // systemIdx of docked station (-1 = undocked)
    });

    socket.emit('character:created', {
      id: playerId,
      name,
      faction,
      genome,
      wallet: { ec: wallet.ec, sm: wallet.sm },
    });
    } catch (err) { console.error('[Socket] player:create error:', err.message); }
  });

  // ── Combat Kill → Economy Credit ─────────────────────────────────────────
  socket.on('combat:kill', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player) return;
    const enemyType = typeof data?.enemyType === 'string' ? data.enemyType : 'fighter';
    const bounty = KILL_BOUNTIES[enemyType] || 25;
    const econ = engine.getSystem('economy');
    const mult = econ.getEcMultiplier(player.playerId);
    const reward = Math.floor(bounty * mult);
    econ.credit(player.playerId, 'ec', reward);
    const wallet = econ.getWallet(player.playerId);

    // Progress kill quests
    const questUpdates = [];
    for (const [qid, aq] of player.activeQuests) {
      for (const obj of aq.objectives) {
        if (obj.type === 'kill' && (obj.target === enemyType || obj.target === '*') && obj.current < obj.required) {
          obj.current++;
          questUpdates.push({ questId: qid, objectives: aq.objectives });
        }
      }
      // Check completion
      if (aq.objectives.every(o => o.current >= o.required) && !aq.completed) {
        aq.completed = true;
        const rew = aq.rewards || {};
        if (rew.credits) econ.credit(player.playerId, 'ec', rew.credits);
        const updatedWallet = econ.getWallet(player.playerId);
        socket.emit('quest:complete', { questId: qid, rewards: rew, wallet: { ec: updatedWallet.ec, sm: updatedWallet.sm } });
        player.activeQuests.delete(qid);
      }
    }

    socket.emit('combat:rewarded', {
      enemyType, reward, wallet: { ec: wallet.ec, sm: wallet.sm },
      questUpdates,
    });
    } catch (err) { console.error('[Socket] combat:kill error:', err.message); }
  });

  // ── Death Report → Broadcast to all players ──────────────────────────────
  socket.on('death:report', (data) => {
    try {
      const player = players.get(socket.id);
      const name = player ? player.name.slice(0, 30) : 'Unknown';
      const cause = typeof data?.cause === 'string' ? data.cause.slice(0, 50).replace(/[<>&"']/g, '') : 'the void';
      const text = `${name} was destroyed — ${cause}`;
      io.emit('death:feed', { type: 'death', text });
    } catch (err) { console.error('[Socket] death:report error:', err.message); }
  });

  // ── Quest Accept ──────────────────────────────────────────────────────────
  socket.on('quest:accept', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const questId = typeof data?.questId === 'string' ? data.questId : '';
      
      // Check if it's a legacy quest or story mission
      const legacyQuest = LEGACY_QUESTS.find(q => q.id === questId);
      const storylineSystem = engine.getSystem('storylines');
      const questSystem = engine.getSystem('quests');
      
      if (legacyQuest) {
        // Handle legacy procedural quest
        const result = questSystem.acceptQuest(player.id, questId);
        if (result.ok) {
          socket.emit('quest:accepted', { questId, type: 'legacy' });
        } else {
          socket.emit('quest:error', { error: result.error });
        }
      } else if (data.storylineId) {
        // Handle story mission from faction storyline
        const mission = storylineSystem.startStoryline(player.id, data.storylineId);
        if (mission) {
          socket.emit('quest:accepted', { 
            questId: mission.id, 
            storylineId: data.storylineId,
            type: 'story',
            mission: mission 
          });
        } else {
          socket.emit('quest:error', { error: 'Story mission not available' });
        }
      } else {
        socket.emit('quest:error', { error: 'Quest not found' });
      }
    } catch (err) { console.error('[Socket] quest:accept error:', err.message); }
  });

  // ── Quest List ────────────────────────────────────────────────────────────
  socket.on('quest:list', () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const active = [];
      for (const [qid, aq] of player.activeQuests) {
        active.push({ questId: qid, ...aq });
      }
      socket.emit('quest:active', { quests: active });
    } catch (err) { console.error('[Socket] quest:list error:', err.message); }
  });

  // ── System Visit (for visit quests) ───────────────────────────────────────
  socket.on('system:visit', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const systemId = typeof data?.systemId === 'string' ? data.systemId : '';
      if (!systemId || !/^system-\d{1,2}$/.test(systemId) || player.visitedSystems.has(systemId)) return;
      player.visitedSystems.add(systemId);

    // Progress visit quests
    for (const [qid, aq] of player.activeQuests) {
      for (const obj of aq.objectives) {
        if (obj.type === 'visit' && obj.current < obj.required) {
          obj.current++;
        }
      }
      if (aq.objectives.every(o => o.current >= o.required) && !aq.completed) {
        aq.completed = true;
        const econ = engine.getSystem('economy');
        const rew = aq.rewards || {};
        if (rew.credits) econ.credit(player.playerId, 'ec', rew.credits);
        const wallet = econ.getWallet(player.playerId);
        socket.emit('quest:complete', { questId: qid, rewards: rew, wallet: { ec: wallet.ec, sm: wallet.sm } });
        player.activeQuests.delete(qid);
      }
    }
    } catch (err) { console.error('[Socket] system:visit error:', err.message); }
  });

  // ── Bounty Board ──────────────────────────────────────────────────────────
  socket.on('bounty:board', () => {
    try {
      const bountySys = engine.getSystem('bounties');
      if (!bountySys) return;
      socket.emit('bounty:board', { bounties: bountySys.getBoardList() });
    } catch (err) { console.error('[Socket] bounty:board error:', err.message); }
  });

  socket.on('bounty:accept', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const bountySys = engine.getSystem('bounties');
      if (!bountySys) return;
      const bountyId = typeof data?.bountyId === 'string' ? data.bountyId : '';
      const result = bountySys.acceptBounty(player.playerId, bountyId);
      socket.emit('bounty:acceptResult', result);
    } catch (err) { console.error('[Socket] bounty:accept error:', err.message); }
  });

  socket.on('bounty:active', () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const bountySys = engine.getSystem('bounties');
      if (!bountySys) return;
      socket.emit('bounty:active', { bounties: bountySys.getPlayerBounties(player.playerId) });
    } catch (err) { console.error('[Socket] bounty:active error:', err.message); }
  });

  socket.on('bounty:abandon', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const bountySys = engine.getSystem('bounties');
      if (!bountySys) return;
      const bountyId = typeof data?.bountyId === 'string' ? data.bountyId : '';
      const result = bountySys.abandonBounty(player.playerId, bountyId);
      socket.emit('bounty:abandonResult', result);
    } catch (err) { console.error('[Socket] bounty:abandon error:', err.message); }
  });

  // ── Station: Get Prices ───────────────────────────────────────────────────
  socket.on('station:enter', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const raw = typeof data?.systemIndex === 'number' ? data.systemIndex : 0;
      const systemIdx = Math.max(0, Math.min(39, Math.floor(raw)));
      player.currentStation = systemIdx;
      const prices = getStationPrices(systemIdx);
      socket.emit('station:prices', { prices, systemIndex: systemIdx });
    } catch (err) { console.error('[Socket] station:enter error:', err.message); }
  });

  socket.on('station:buy', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64).trim() : '';
    if (!itemName) return;
    // Server-authoritative price lookup
    const stationPrices = getStationPrices(player.currentStation);
    const commodity = stationPrices.find(p => p.name === itemName);
    if (!commodity) return;
    const price = commodity.buy;
    const econ = engine.getSystem('economy');
    if (econ.debit(player.playerId, 'ec', price)) {
      player.trades++;
      player.cargo.set(itemName, (player.cargo.get(itemName) || 0) + 1);
      // Progress trade quests
      for (const [qid, aq] of player.activeQuests) {
        for (const obj of aq.objectives) {
          if (obj.type === 'collect' && obj.current < obj.required) obj.current++;
        }
        if (aq.objectives.every(o => o.current >= o.required) && !aq.completed) {
          aq.completed = true;
          const rew = aq.rewards || {};
          if (rew.credits) econ.credit(player.playerId, 'ec', rew.credits);
          const wallet = econ.getWallet(player.playerId);
          socket.emit('quest:complete', { questId: qid, rewards: rew, wallet: { ec: wallet.ec, sm: wallet.sm } });
          player.activeQuests.delete(qid);
        }
      }
      const wallet = econ.getWallet(player.playerId);
      socket.emit('station:bought', { name: itemName, price, wallet: { ec: wallet.ec, sm: wallet.sm } });
    } else {
      socket.emit('station:error', { error: 'Insufficient credits' });
    }
    } catch (err) { console.error('[Socket] station:buy error:', err.message); }
  });

  socket.on('station:sell', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64).trim() : '';
    if (!itemName) return;
    // Verify player has this item in cargo
    const held = player.cargo.get(itemName) || 0;
    if (held <= 0) {
      socket.emit('station:error', { error: 'You do not have that item' });
      return;
    }
    // Server-authoritative price lookup
    const stationPrices = getStationPrices(player.currentStation);
    const commodity = stationPrices.find(p => p.name === itemName);
    if (!commodity) return;
    const price = commodity.sell;
    player.cargo.set(itemName, held - 1);
    if (player.cargo.get(itemName) <= 0) player.cargo.delete(itemName);
    const econ = engine.getSystem('economy');
    econ.credit(player.playerId, 'ec', price);
    const wallet = econ.getWallet(player.playerId);
    socket.emit('station:sold', { name: itemName, price, wallet: { ec: wallet.ec, sm: wallet.sm } });
    } catch (err) { console.error('[Socket] station:sell error:', err.message); }
  });

  // ── Cargo deposit (for client-registered items like mined ore) ──────────
  socket.on('cargo:deposit', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
    if (!itemName) return;
    // Only allow known commodities
    if (!COMMODITIES.find(c => c.name === itemName)) return;
    // Cap per-item cargo to prevent free-mint abuse
    const held = player.cargo.get(itemName) || 0;
    if (held >= 50) {
      socket.emit('cargo:error', { error: 'Cargo hold full for this item' });
      return;
    }
    player.cargo.set(itemName, held + 1);
    socket.emit('cargo:deposited', { name: itemName, quantity: held + 1 });
    } catch (err) { console.error('[Socket] cargo:deposit error:', err.message); }
  });

  // ── Save / Load via Socket ────────────────────────────────────────────────
  socket.on('game:save', async (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    if (player._saving) return; // Prevent concurrent saves
    player._saving = true;
    try {
      // Save server-authoritative state — ignore client wallet/currency data
      const econ = engine.getSystem('economy');
      const w = econ.getWallet(player.playerId);
      const serverState = {
        playerId: player.playerId,
        name: player.name,
        faction: player.faction,
        genome: player.genome,
        wallet: { ec: w.ec, sm: w.sm },
        trades: player.trades,
        savedAt: Date.now(),
      };
      // Allow non-authoritative display data (position, settings, etc.)
      if (data && typeof data === 'object') {
        // Payload size guard — reject excessively large saves (> 512 KB)
        const payloadSize = JSON.stringify(data).length;
        if (payloadSize > 524288) {
          socket.emit('game:saved', { ok: false, error: 'Payload too large' });
          return;
        }
        const allowedKeys = ['position', 'rotation', 'currentSystem', 'settings',
          'combat', 'inventory', 'quests', 'upgrades', 'flight', 'pastLives',
          'skills', 'soulMemory', 'activeWeapon', 'persistentItems',
          'currentSkin', 'market', 'insuredItemId', 'chatbot', 'factionRep',
          'ship', 'location', 'purchasedUpgrades'];
        for (const key of allowedKeys) {
          if (data[key] !== undefined) serverState[key] = data[key];
        }
        // Range-clamp upgrade values to prevent cheat injection
        if (serverState.upgrades && typeof serverState.upgrades === 'object') {
          const u = serverState.upgrades;
          const clampKeys = ['railgunDmg','laserDmg','maxHull','maxShield','maxFuel',
            'maxAmmo','miningYield','engineSpeed','cargoSize','regenRate'];
          for (const k of clampKeys) {
            if (typeof u[k] === 'number') u[k] = Math.max(0, Math.min(u[k], 9999));
          }
        }
        // Clamp combat stats to sane ranges
        if (serverState.combat && typeof serverState.combat === 'object') {
          const cb = serverState.combat;
          for (const k of Object.keys(cb)) {
            if (typeof cb[k] === 'number') cb[k] = Math.max(0, Math.min(cb[k], 1e9));
          }
        }
      }
      await fileStore.save(player.playerId, serverState);
      socket.emit('game:saved', { ok: true, playerId: player.playerId });
    } catch (e) {
      socket.emit('game:saved', { ok: false, error: e.message });
    } finally {
      player._saving = false;
    }
  });

  socket.on('game:load', async () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      // Players can only load their own saves (session-scoped auth)
      const saved = await fileStore.load(player.playerId);
      socket.emit('game:loaded', saved ? { ok: true, data: saved } : { ok: false });
    } catch (err) { console.error('[Socket] game:load error:', err.message); socket.emit('game:loaded', { ok: false }); }
  });

  // ── Wallet Sync (client requests current wallet) ──────────────────────────
  socket.on('player:sync', () => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const econ = engine.getSystem('economy');
      const wallet = econ.getWallet(player.playerId);
      const activeQuests = [];
      for (const [qid, aq] of player.activeQuests) {
        activeQuests.push({ questId: qid, ...aq });
      }
      socket.emit('player:state', {
        playerId: player.playerId,
        wallet: { ec: wallet.ec, sm: wallet.sm },
        activeQuests,
      });
    } catch (err) { console.error('[Socket] player:sync error:', err.message); }
  });

  // ── Rebirth ───────────────────────────────────────────────────────────────
  socket.on('rebirth:perform', (data) => {
    try {
    const player = players.get(socket.id);
    if (!player) return;
    const rebirthSys = engine.getSystem('rebirth');
    const npcSys = engine.getSystem('npc');
    const gen = engine.getSystem('genetics');
    const econ = engine.getSystem('economy');
    // Ensure NPC pool has candidates (seed if empty)
    let pool = npcSys.getLivingNPCPool();
    if (pool.length < 10) {
      for (let i = pool.length; i < 50; i++) {
        npcSys.spawnNPC({
          genome: gen.generateRandom(),
          sectorId: `sector-${Math.floor(Math.random() * 40)}`,
          credits: Math.floor(Math.random() * 50000),
          ageYears: 18 + Math.floor(Math.random() * 60),
        });
      }
      pool = npcSys.getLivingNPCPool();
    }
    // Perform proper lottery draw via RebirthSystem
    const result = rebirthSys.performLottery(player.playerId, pool);
    const chosenNpc = result.chosenNpc;
    // EC resets (belonged to old character), SM persists (premium currency)
    const wallet = econ.getWallet(player.playerId);
    if (wallet.ec > 500) {
      econ.debit(player.playerId, 'ec', wallet.ec - 500);
    } else if (wallet.ec < 500) {
      econ.credit(player.playerId, 'ec', 500 - wallet.ec);
    }
    // Clear session progress
    player.activeQuests.clear();
    player.visitedSystems.clear();
    player.trades = 0;
    player.cargo.clear();
    player.genome = Array.from(chosenNpc.genome);
    player.name = chosenNpc.name || player.name;
    player.faction = chosenNpc.faction || player.faction;
    // Mark chosen NPC as player avatar
    chosenNpc.isPlayerAvatar = true;
    socket.emit('rebirth:result', {
      genome: player.genome,
      wallet: { ec: wallet.ec, sm: wallet.sm },
      name: player.name,
      faction: player.faction,
      npcId: chosenNpc.id,
      statusScore: rebirthSys.computeStatusScore(chosenNpc),
    });
    } catch (err) { console.error('[Socket] rebirth:perform error:', err.message); }
  });

  // Karma wheel sync — client sends rolled identity after karma accept
  socket.on('rebirth:sync', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      if (!data || typeof data !== 'object') return;
      if (typeof data.name === 'string') player.name = data.name.slice(0, 50);
      if (typeof data.faction === 'string' && FACTIONS.some(f => f.id === data.faction)) player.faction = data.faction;
      if (Array.isArray(data.genome) && data.genome.length === 7) {
        const validated = data.genome.map(v => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 128; });
        player.genome = validated;
      }
      player.activeQuests.clear();
      player.visitedSystems.clear();
      player.trades = 0;
      player.cargo.clear();
    } catch (err) { console.error('[Socket] rebirth:sync error:', err.message); }
  });

  socket.on('starmap:request', () => {
    try {
      // Cache star systems once — they are deterministic and don't change
      if (!engine._starmapCache) {
        const proc = engine.getSystem('procedural');
        const systems = [];
        for (let i = 0; i < 40; i++) {
          systems.push(proc.generateStarSystem(`system-${i}`));
        }
        engine._starmapCache = { systems };
      }
      socket.emit('starmap:data', engine._starmapCache);
    } catch (err) { console.error('[Socket] starmap:request error:', err.message); }
  });

  socket.on('quests:request', () => {
    try {
    // Cache procedural quest hooks — refresh every 60 seconds
    if (!engine._questCache || Date.now() - engine._questCacheTime > 60_000) {
      const proc = engine.getSystem('procedural');
      const questHooks = [];
      for (let i = 0; i < 5; i++) {
        questHooks.push(proc.generateQuestHook());
      }
      engine._questCache = { quests: questHooks };
      engine._questCacheTime = Date.now();
    }
    socket.emit('quests:data', engine._questCache);
    } catch (err) { console.error('[Socket] quests:request error:', err.message); }
  });

  // ── Multiplayer Systems (Phase 3) ──────────────────────────────────────────

  // Guild System Events
  socket.on('guild:create', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const guildSystem = engine.getSystem('guilds');
      const result = guildSystem.createGuild(data.name, player.playerId, data.description);
      socket.emit('guild:createResult', result);
    } catch (err) { console.error('[Socket] guild:create error:', err.message); }
  });

  socket.on('guild:invite', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const guildSystem = engine.getSystem('guilds');
      const result = guildSystem.invitePlayer(data.guildId, data.targetPlayerId, player.playerId);
      socket.emit('guild:inviteResult', result);
    } catch (err) { console.error('[Socket] guild:invite error:', err.message); }
  });

  socket.on('guild:acceptInvite', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const guildSystem = engine.getSystem('guilds');
      const result = guildSystem.acceptInvite(data.inviteId, player.playerId);
      socket.emit('guild:inviteAccepted', result);
    } catch (err) { console.error('[Socket] guild:acceptInvite error:', err.message); }
  });

  socket.on('guild:info', (data) => {
    try {
      const guildSystem = engine.getSystem('guilds');
      const guild = guildSystem.getGuild(data.guildId);
      socket.emit('guild:info', { guild });
    } catch (err) { console.error('[Socket] guild:info error:', err.message); }
  });

  // Player Trading Events
  socket.on('trade:propose', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const tradingSystem = engine.getSystem('playerTrading');
      const result = tradingSystem.proposeTrade(player.playerId, data.targetPlayerId, data.message);
      socket.emit('trade:proposeResult', result);
    } catch (err) { console.error('[Socket] trade:propose error:', err.message); }
  });

  socket.on('trade:addItem', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const tradingSystem = engine.getSystem('playerTrading');
      const result = tradingSystem.addItemToTrade(data.tradeId, player.playerId, data.itemId, data.quantity);
      socket.emit('trade:itemAdded', result);
    } catch (err) { console.error('[Socket] trade:addItem error:', err.message); }
  });

  socket.on('trade:confirm', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const tradingSystem = engine.getSystem('playerTrading');
      const result = tradingSystem.confirmTrade(data.tradeId, player.playerId);
      socket.emit('trade:confirmed', result);
    } catch (err) { console.error('[Socket] trade:confirm error:', err.message); }
  });

  // Fleet System Events
  socket.on('fleet:create', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const fleetSystem = engine.getSystem('fleets');
      const result = fleetSystem.createFleet(data.name, player.playerId, data.description);
      socket.emit('fleet:createResult', result);
    } catch (err) { console.error('[Socket] fleet:create error:', err.message); }
  });

  socket.on('fleet:invite', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const fleetSystem = engine.getSystem('fleets');
      const result = fleetSystem.inviteToFleet(data.fleetId, data.targetPlayerId, player.playerId);
      socket.emit('fleet:inviteResult', result);
    } catch (err) { console.error('[Socket] fleet:invite error:', err.message); }
  });

  socket.on('fleet:setDestination', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const fleetSystem = engine.getSystem('fleets');
      const result = fleetSystem.setFleetDestination(data.fleetId, player.playerId, data.destination);
      socket.emit('fleet:destinationSet', result);
    } catch (err) { console.error('[Socket] fleet:setDestination error:', err.message); }
  });

  // Auction House Events
  socket.on('market:createOrder', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const auctionSystem = engine.getSystem('auctionHouse');
      const result = auctionSystem.createOrder(player.playerId, data.itemId, data.quantity, data.pricePerUnit, data.orderType);
      socket.emit('market:orderCreated', result);
    } catch (err) { console.error('[Socket] market:createOrder error:', err.message); }
  });

  socket.on('market:getOrders', (data) => {
    try {
      const auctionSystem = engine.getSystem('auctionHouse');
      const orders = auctionSystem.getMarketOrders(data.itemId, data.region);
      socket.emit('market:orders', { orders });
    } catch (err) { console.error('[Socket] market:getOrders error:', err.message); }
  });

  socket.on('market:getPrices', () => {
    try {
      const auctionSystem = engine.getSystem('auctionHouse');
      const prices = auctionSystem.getMarketPrices();
      socket.emit('market:prices', { prices });
    } catch (err) { console.error('[Socket] market:getPrices error:', err.message); }
  });

  // Communication System Events
  socket.on('chat:joinChannel', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const commSystem = engine.getSystem('communication');
      const result = commSystem.joinChannel(player.playerId, data.channelId);
      socket.emit('chat:joinResult', result);
    } catch (err) { console.error('[Socket] chat:joinChannel error:', err.message); }
  });

  socket.on('chat:sendMessage', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const commSystem = engine.getSystem('communication');
      const result = commSystem.sendMessage(player.playerId, data.channelId, data.message);
      if (result.success) {
        // Broadcast to other players in channel
        io.emit('chat:newMessage', {
          channelId: data.channelId,
          playerId: player.playerId,
          playerName: player.name,
          message: data.message,
          timestamp: Date.now()
        });
      }
      socket.emit('chat:sendResult', result);
    } catch (err) { console.error('[Socket] chat:sendMessage error:', err.message); }
  });

  socket.on('chat:privateMessage', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const commSystem = engine.getSystem('communication');
      const result = commSystem.sendPrivateMessage(player.playerId, data.targetPlayerId, data.message);
      socket.emit('chat:privateMessageResult', result);
    } catch (err) { console.error('[Socket] chat:privateMessage error:', err.message); }
  });

  // Territory Control Events
  socket.on('territory:claim', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const territorySystem = engine.getSystem('territoryControl');
      const result = territorySystem.claimTerritory(data.guildId, data.territoryId, player.playerId);
      socket.emit('territory:claimResult', result);
    } catch (err) { console.error('[Socket] territory:claim error:', err.message); }
  });

  socket.on('territory:attack', (data) => {
    try {
      const player = players.get(socket.id);
      if (!player) return;
      const territorySystem = engine.getSystem('territoryControl');
      const result = territorySystem.attackTerritory(data.attackingGuildId, data.territoryId, data.attackForce, player.playerId);
      socket.emit('territory:attackResult', result);
    } catch (err) { console.error('[Socket] territory:attack error:', err.message); }
  });

  socket.on('territory:getClaimable', () => {
    try {
      const territorySystem = engine.getSystem('territoryControl');
      const territories = territorySystem.getClaimableTerritories();
      socket.emit('territory:claimableList', { territories });
    } catch (err) { console.error('[Socket] territory:getClaimable error:', err.message); }
  });

  socket.on('disconnect', async () => {
    const player = players.get(socket.id);
    if (player) {
      // Skip auto-save if a save is already in flight to prevent race condition
      if (!player._saving) {
        try {
          const econ = engine.getSystem('economy');
          const wallet = econ.getWallet(player.playerId);
          await fileStore.save(player.playerId, {
          playerId: player.playerId,
          name: player.name,
          faction: player.faction,
          genome: player.genome,
          wallet: { ec: wallet.ec, sm: wallet.sm },
          trades: player.trades,
          cargo: [...player.cargo.entries()],
          activeQuests: [...player.activeQuests.entries()],
          visitedSystems: [...player.visitedSystems],
          savedAt: Date.now(),
        });
      } catch (e) {
        console.error(`[Socket.IO] Auto-save failed for ${player.playerId}:`, e.message);
      }
      } // end !player._saving
    }
    // Clean up all system state to prevent memory leaks
    if (player) {
      const pid = player.playerId;
      const econ = engine.getSystem('economy');
      econ.removePlayer?.(pid);
      // Clean up per-player Maps in remaining systems
      const factionSys = engine.getSystem('factions');
      if (factionSys?._reputation) factionSys._reputation.delete(pid);
      const skillSys = engine.getSystem('skills');
      if (skillSys?._players) skillSys._players.delete(pid);
      const invSys = engine.getSystem('inventory');
      if (invSys?._inventories) invSys._inventories.delete(pid);
      const questSys = engine.getSystem('quests');
      if (questSys?._players) questSys._players.delete(pid);
      const cosmeticsSys = engine.getSystem('cosmetics');
      if (cosmeticsSys?._playerInventory) cosmeticsSys._playerInventory.delete(pid);
      const cycleSys = engine.getSystem('cyclepass');
      if (cycleSys?._playerProgress) cycleSys._playerProgress.delete(pid);
      const ascensionSys = engine.getSystem('ascension');
      if (ascensionSys?._rebirthCounts) ascensionSys._rebirthCounts.delete(pid);
      const combatSys = engine.getSystem('combat');
      combatSys?.removeShield?.(pid);
      combatSys?.cleanseDots?.(pid);
      const fractureSys = engine.getSystem('fracture');
      if (fractureSys?._activeShards) {
        // Remove shards originated by this player (optional — keeps shards for others to find)
      }
      
      // Clean up multiplayer systems (Phase 3)
      const guildSys = engine.getSystem('guilds');
      if (guildSys) {
        guildSys.handlePlayerDisconnect?.(pid);
      }
      const tradingSys = engine.getSystem('playerTrading');
      if (tradingSys) {
        tradingSys.handlePlayerDisconnect?.(pid);
      }
      const fleetSys = engine.getSystem('fleets');
      if (fleetSys) {
        fleetSys.handlePlayerDisconnect?.(pid);
      }
      const commSys = engine.getSystem('communication');
      if (commSys) {
        commSys.handlePlayerDisconnect?.(pid);
      }
    }
    players.delete(socket.id);
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});
