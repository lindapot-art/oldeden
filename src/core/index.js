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

// Graceful shutdown
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n[Main] Received ${signal} — shutting down…`);
    await engine.stop();
    process.exit(0);
  });
}

await engine.start();
