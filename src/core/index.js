import { GameEngine } from './GameEngine.js';
import { RebirthSystem } from '../systems/RebirthSystem.js';
import { GeneticSystem } from '../systems/GeneticSystem.js';
import { MutationSystem } from '../systems/MutationSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { ProceduralGenerator } from '../systems/ProceduralGenerator.js';
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
import { EnemySpawnSystem } from '../systems/EnemySpawnSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { BossSystem } from '../systems/BossSystem.js';
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

// ── Systems with cross-dependencies ─────────────────────────────────────────
const enemies = new EnemySpawnSystem(npc, combat);
const projectiles = new ProjectileSystem(combat);
const bosses = new BossSystem(npc, combat, enemies);

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
  .registerSystem('rebirth', rebirth)
  .registerSystem('procedural', procedural)
  .registerSystem('fracture', fracture)
  .registerSystem('ascension', ascension)
  .registerSystem('cyclepass', cyclepass)
  .registerSystem('cosmetics', cosmetics)
  .registerSystem('enemies', enemies)
  .registerSystem('projectiles', projectiles)
  .registerSystem('bosses', bosses)
  .registerSystem('director', director);

// ── Persistence ──────────────────────────────────────────────────────────────
let store;
if (process.env.MONGODB_URI) {
  store = new MongoStore(process.env.MONGODB_URI);
  await store.init();
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

function getStationPrices(systemIdx) {
  const seed = systemIdx * 7 + 13;
  return COMMODITIES.map((c, i) => {
    const variance = 0.8 + ((Math.sin(seed + i * 3.7) + 1) / 2) * 0.4;
    const buy = Math.round(c.base * variance);
    const sell = Math.round(buy * 0.78);
    return { name: c.name, buy, sell };
  });
}

// Register starter quests in QuestSystem
const STARTER_QUESTS = [
  { id: 'q-kill-scouts',  name: 'Thin the Ranks',   objectives: [{ type: 'kill', target: 'scout', required: 5 }],  rewards: { credits: 250 } },
  { id: 'q-kill-fighters', name: 'Dogfight Ace',     objectives: [{ type: 'kill', target: 'fighter', required: 3 }], rewards: { credits: 400 } },
  { id: 'q-kill-bombers', name: 'Bomber Buster',     objectives: [{ type: 'kill', target: 'bomber', required: 2 }],  rewards: { credits: 500 } },
  { id: 'q-kill-any-10',  name: 'Combat Veteran',    objectives: [{ type: 'kill', target: '*', required: 10 }],      rewards: { credits: 600, reputation: { hegemony_vanguard: 50 } } },
  { id: 'q-visit-3',      name: 'Star Cartographer', objectives: [{ type: 'visit', target: '*', required: 3 }],      rewards: { credits: 300, reputation: { void_cult: 50 } } },
  { id: 'q-trade-5',      name: 'Merchant Initiate', objectives: [{ type: 'collect', target: '*', required: 5 }],    rewards: { credits: 350, reputation: { iron_syndicate: 50 } } },
];
STARTER_QUESTS.forEach(q => quests.registerQuest(q));

// ── HTTP Server ──────────────────────────────────────────────────────────────
const httpPort = parseInt(process.env.PORT ?? '3000', 10);
const uploadDir = path.resolve(PROJECT_ROOT, process.env.UPLOAD_DIR ?? 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const maxFileSize = parseInt(process.env.MAX_UPLOAD_SIZE ?? '157286400', 10); // 150 MB default

const { app, start: startHttp, addFallback } = createHttpServer({ uploadDir, maxFileSize });

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

app.get('/api/game/systems', (_req, res) => {
  res.json({ systems: [...engine._systems.keys()], count: engine._systems.size });
});

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
    await fileStore.save(playerId, data);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/game/load/:id', async (req, res) => {
  try {
    const data = await fileStore.load(req.params.id);
    if (!data) return res.status(404).json({ error: 'Save not found' });
    res.json(data);
  } catch (e) {
    console.error('[API] Load error:', e.message);
    res.status(500).json({ error: 'Failed to load save' });
  }
});

app.get('/api/game/quests/available', (_req, res) => {
  res.json({ quests: STARTER_QUESTS });
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
  : [`http://localhost:${actualPort}`];

io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins },
});

// ── Rate Limiter ─────────────────────────────────────────────────────────────
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
};

function createRateLimiter() {
  const counters = new Map();
  return function checkRate(eventName) {
    const limit = RATE_LIMITS[eventName];
    if (!limit) return true;
    const now = Date.now();
    let entry = counters.get(eventName);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + limit.windowMs };
      counters.set(eventName, entry);
    }
    entry.count++;
    return entry.count <= limit.max;
  };
}

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Per-socket rate limiter — drops packets exceeding thresholds
  const rateLimiter = createRateLimiter();
  socket.use(([eventName], next) => {
    if (!rateLimiter(eventName)) {
      console.warn(`[RateLimit] ${socket.id} exceeded limit for ${eventName}`);
      return;
    }
    next();
  });

  socket.emit('game:init', {
    systems: [...engine._systems.keys()],
    uptime: process.uptime(),
    tickRate: engine.tickRateMs,
  });

  socket.on('player:create', (data) => {
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
  });

  // ── Combat Kill → Economy Credit ─────────────────────────────────────────
  socket.on('combat:kill', (data) => {
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
      }
    }

    socket.emit('combat:rewarded', {
      enemyType, reward, wallet: { ec: wallet.ec, sm: wallet.sm },
      questUpdates,
    });
  });

  // ── Death Report → Broadcast to all players ──────────────────────────────
  socket.on('death:report', (data) => {
    const name = typeof data?.name === 'string' ? data.name.slice(0, 30) : 'Unknown';
    const cause = typeof data?.cause === 'string' ? data.cause.slice(0, 50) : 'the void';
    const text = `${name} was destroyed — ${cause}`;
    io.emit('death:feed', { type: 'death', text });
  });

  // ── Quest Accept ──────────────────────────────────────────────────────────
  socket.on('quest:accept', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const questId = typeof data?.questId === 'string' ? data.questId : '';
    const def = STARTER_QUESTS.find(q => q.id === questId);
    if (!def || player.activeQuests.has(questId)) return;
    if (player.activeQuests.size >= 5) {
      socket.emit('quest:error', { error: 'Max 5 active quests' });
      return;
    }
    const instance = {
      ...def,
      objectives: def.objectives.map(o => ({ ...o, current: 0 })),
      completed: false,
      acceptedAt: Date.now(),
    };
    player.activeQuests.set(questId, instance);
    socket.emit('quest:accepted', { questId, quest: instance });
  });

  // ── Quest List ────────────────────────────────────────────────────────────
  socket.on('quest:list', () => {
    const player = players.get(socket.id);
    if (!player) return;
    const active = [];
    for (const [qid, aq] of player.activeQuests) {
      active.push({ questId: qid, ...aq });
    }
    socket.emit('quest:active', { quests: active });
  });

  // ── System Visit (for visit quests) ───────────────────────────────────────
  socket.on('system:visit', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const systemId = typeof data?.systemId === 'string' ? data.systemId : '';
    if (!systemId || player.visitedSystems.has(systemId)) return;
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
      }
    }
  });

  // ── Station: Get Prices ───────────────────────────────────────────────────
  socket.on('station:enter', (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    const raw = typeof data?.systemIndex === 'number' ? data.systemIndex : 0;
    const systemIdx = Math.max(0, Math.min(39, Math.floor(raw)));
    player.currentStation = systemIdx;
    const prices = getStationPrices(systemIdx);
    socket.emit('station:prices', { prices, systemIndex: systemIdx });
  });

  socket.on('station:buy', (data) => {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
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
        }
      }
      const wallet = econ.getWallet(player.playerId);
      socket.emit('station:bought', { name: itemName, price, wallet: { ec: wallet.ec, sm: wallet.sm } });
    } else {
      socket.emit('station:error', { error: 'Insufficient credits' });
    }
  });

  socket.on('station:sell', (data) => {
    const player = players.get(socket.id);
    if (!player || player.currentStation < 0) return;
    const itemName = typeof data?.name === 'string' ? data.name.slice(0, 64) : '';
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
  });

  // ── Cargo deposit (for client-registered items like mined ore) ──────────
  socket.on('cargo:deposit', (data) => {
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
  });

  // ── Save / Load via Socket ────────────────────────────────────────────────
  socket.on('game:save', async (data) => {
    const player = players.get(socket.id);
    if (!player) return;
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
        for (const key of ['position', 'rotation', 'currentSystem', 'settings']) {
          if (data[key] !== undefined) serverState[key] = data[key];
        }
      }
      await fileStore.save(player.playerId, serverState);
      socket.emit('game:saved', { ok: true, playerId: player.playerId });
    } catch (e) {
      socket.emit('game:saved', { ok: false, error: e.message });
    }
  });

  socket.on('game:load', async () => {
    const player = players.get(socket.id);
    if (!player) return;
    // Players can only load their own saves (session-scoped auth)
    const saved = await fileStore.load(player.playerId);
    socket.emit('game:loaded', saved ? { ok: true, data: saved } : { ok: false });
  });

  // ── Wallet Sync (client requests current wallet) ──────────────────────────
  socket.on('player:sync', () => {
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
  });

  // ── Rebirth ───────────────────────────────────────────────────────────────
  socket.on('rebirth:perform', (data) => {
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
  });

  socket.on('starmap:request', () => {
    const proc = engine.getSystem('procedural');
    const systems = [];
    for (let i = 0; i < 40; i++) {
      systems.push(proc.generateStarSystem(`system-${i}`));
    }
    socket.emit('starmap:data', { systems });
  });

  socket.on('quests:request', () => {
    const proc = engine.getSystem('procedural');
    const questHooks = [];
    for (let i = 0; i < 5; i++) {
      questHooks.push(proc.generateQuestHook());
    }
    socket.emit('quests:data', { quests: questHooks });
  });

  socket.on('disconnect', async () => {
    const player = players.get(socket.id);
    if (player) {
      // Auto-save player state on disconnect
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
          savedAt: Date.now(),
        });
      } catch (e) {
        console.error(`[Socket.IO] Auto-save failed for ${player.playerId}:`, e.message);
      }
    }
    // Clean up economy state to prevent memory leak
    if (player) {
      const econ = engine.getSystem('economy');
      econ.removePlayer?.(player.playerId);
    }
    players.delete(socket.id);
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});
