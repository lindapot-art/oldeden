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
import { createHttpServer } from '../server/HttpServer.js';
import { FACTIONS } from '../systems/FactionSystem.js';
import { Server as SocketServer } from 'socket.io';
import { randomUUID } from 'crypto';

const engine = new GameEngine({ tickRateMs: parseInt(process.env.GAME_TICK_MS ?? '100', 10) });

engine
  .registerSystem('genetics', new GeneticSystem())
  .registerSystem('mutation', new MutationSystem())
  .registerSystem('npc', new NPCSystem())
  .registerSystem('economy', new EconomySystem())
  .registerSystem('rebirth', new RebirthSystem())
  .registerSystem('procedural', new ProceduralGenerator())
  .registerSystem('fracture', new SoulFractureSystem())
  .registerSystem('ascension', new AscensionSystem())
  .registerSystem('cyclepass', new CyclePass())
  .registerSystem('cosmetics', new CosmeticsStore())
  .registerSystem('director', new AIDirector());

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
  const genetics = engine.getSystem('genetics');
  res.json({ genome: Array.from(genetics.generateRandom()) });
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
  const quests = [];
  for (let i = 0; i < 5; i++) {
    quests.push(proc.generateQuestHook());
  }
  res.json({ quests });
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
const io = new SocketServer(httpServer, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.emit('game:init', {
    systems: [...engine._systems.keys()],
    uptime: process.uptime(),
    tickRate: engine.tickRateMs,
  });

  socket.on('player:create', (data) => {
    const genetics = engine.getSystem('genetics');
    const genome = Array.from(genetics.generateRandom());
    socket.emit('character:created', {
      id: randomUUID(),
      name: data?.name || 'Unknown Pilot',
      faction: data?.faction || 'free_colonies',
      genome,
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
    const quests = [];
    for (let i = 0; i < 5; i++) {
      quests.push(proc.generateQuestHook());
    }
    socket.emit('quests:data', { quests });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});
