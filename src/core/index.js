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
import { Server as SocketServer } from 'socket.io';
import { randomUUID } from 'crypto';

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

// ── HTTP Server ──────────────────────────────────────────────────────────────
const httpPort = parseInt(process.env.PORT ?? '3000', 10);
const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
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

// SPA fallback — MUST be last route
addFallback();

// Graceful shutdown
let httpServer;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n[Main] Received ${signal} — shutting down…`);
    httpServer?.close();
    await engine.stop();
    process.exit(0);
  });
}

await engine.start();
httpServer = await startHttp(httpPort);

// ── Socket.IO ────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [`http://localhost:${httpPort}`];

const io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.emit('game:init', {
    systems: [...engine._systems.keys()],
    uptime: process.uptime(),
    tickRate: engine.tickRateMs,
  });

  socket.on('player:create', (data) => {
    // Input validation
    const name = typeof data?.name === 'string' ? data.name.slice(0, 32).replace(/[<>"'&]/g, '') : 'Unknown Pilot';
    const faction = typeof data?.faction === 'string' && FACTIONS.some(f => f.id === data.faction)
      ? data.faction : 'free_colonies';

    const gen = engine.getSystem('genetics');
    const genome = Array.from(gen.generateRandom());
    const econ = engine.getSystem('economy');
    const playerId = randomUUID();
    const wallet = econ.getWallet(playerId);

    socket.emit('character:created', {
      id: playerId,
      name,
      faction,
      genome,
      wallet: { ec: wallet.ec, sm: wallet.sm },
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

  socket.on('combat:fire', (data) => {
    // Validate projectile fire request
    if (!data || typeof data.type !== 'string') return;
    socket.emit('combat:result', { hit: Math.random() > 0.3, damage: Math.floor(Math.random() * 50 + 10) });
  });

  socket.on('economy:exchange', (data) => {
    const econ = engine.getSystem('economy');
    if (!data || !data.playerId) return;
    if (data.direction === 'ec_to_sm' && typeof data.amount === 'number' && data.amount > 0) {
      const result = econ.sellEcForSm(data.playerId, data.amount);
      socket.emit('economy:exchanged', result);
    } else if (data.direction === 'sm_to_ec' && typeof data.amount === 'number' && data.amount > 0) {
      const result = econ.sellSmForEc(data.playerId, data.amount);
      socket.emit('economy:exchanged', result);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});
