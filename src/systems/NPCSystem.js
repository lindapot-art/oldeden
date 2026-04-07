import { randomUUID } from 'crypto';
import { APTITUDE_GENES } from './GeneticSystem.js';

/**
 * NPCSystem — manages the autonomous NPC population of Old Eden.
 *
 * The NPC pool is the backbone of the Rebirth System.  Every NPC:
 *   - Has a full genome (from GeneticSystem)
 *   - Ages over time, gaining or losing skills
 *   - Accumulates or loses wealth via simulated economic activity
 *   - Has a social graph (relationships to other NPCs and players)
 *   - Eventually dies of old age, disease, or violence, leaving a corpse record
 *   - Can be "possessed" by a player through the Rebirth Lottery
 *
 * The system runs a lightweight simulation each tick to keep the population
 * alive and dynamic without requiring full AI inference on every NPC.
 *
 * Design goals:
 *   - Support 100,000+ tracked NPCs
 *   - Deterministic given the same RNG seed (for replay and testing)
 *   - Emit fine-grained events that other systems (Economy, Rebirth) can react to
 */

// How many in-game years pass per real-world second (adjustable)
const IN_GAME_YEARS_PER_SECOND = 1 / 600; // 1 in-game year = 10 real minutes
const SKILL_GROWTH_CHANCE_PER_TICK = 0.0005;
const SKILL_MAX = 100;

export class NPCSystem {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, NPC>} */
    this._npcs = new Map();
    this._accumulatedTime = 0;
    console.log('[NPCSystem] Initialised.');
  }

  tick(deltaMs) {
    this._accumulatedTime += deltaMs;

    // Simulate NPC ageing once per in-game day (optional batching)
    const inGameYearsPassed = (deltaMs / 1000) * IN_GAME_YEARS_PER_SECOND;

    for (const npc of this._npcs.values()) {
      if (npc.isActive) {
        this._simulateNPC(npc, inGameYearsPassed, deltaMs);
      }
    }

    // Reaper: prune dead non-player NPCs older than 10 minutes when map grows large
    if (this._npcs.size > 500) {
      const cutoff = Date.now() - 600_000;
      for (const [id, npc] of this._npcs) {
        if (!npc.isActive && !npc.isPlayerAvatar && !npc.isDeceasedAvatar && !npc.isAscended && npc.spawnedAt < cutoff) {
          this._npcs.delete(id);
        }
      }
    }
  }

  async destroy() {
    this._npcs.clear();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Spawn a new NPC into the world.
   * @param {object} params
   * @param {Uint8Array} params.genome
   * @param {string}    [params.sectorId='genesis']
   * @param {number}    [params.credits=100]
   * @param {number}    [params.ageYears=20]
   * @returns {NPC}
   */
  spawnNPC({ genome, sectorId = 'genesis', credits = 100, ageYears = 20 } = {}) {
    const npc = {
      id: randomUUID(),
      genome,
      sectorId,
      credits,
      ageYears,
      skills: this._initSkillsFromGenome(genome),
      reputation: 0,
      relationships: [],
      isActive: true,
      isPlayerAvatar: false,
      isDeceasedAvatar: false,
      causeOfDeath: null,
      isFractured: false,
      isAscended: false,
      spawnedAt: Date.now(),
    };
    this._npcs.set(npc.id, npc);
    this._engine.events.emit('npc:spawned', { npcId: npc.id, sectorId });
    return npc;
  }

  /**
   * Retrieve an NPC by ID.
   * @param {string} id
   * @returns {NPC|undefined}
   */
  /**
   * Register an external NPC (e.g. boss) directly into the NPC map.
   * @param {object} props — must include at least { id }
   * @returns {object} the stored NPC record
   */
  createNPC(props) {
    if (!props || !props.id) throw new Error('[NPCSystem] createNPC requires { id }');
    const npc = {
      id: props.id,
      genome: props.genome || null,
      sectorId: props.sectorId || 'unknown',
      credits: props.credits || 0,
      ageYears: props.ageYears || 0,
      skills: {},
      reputation: 0,
      relationships: [],
      isActive: true,
      isPlayerAvatar: false,
      isDeceasedAvatar: false,
      causeOfDeath: null,
      isFractured: false,
      isAscended: false,
      spawnedAt: Date.now(),
      ...props,
    };
    this._npcs.set(npc.id, npc);
    this._engine.events.emit('npc:spawned', { npcId: npc.id, sectorId: npc.sectorId });
    return npc;
  }

  /**
   * Remove an NPC from the registry entirely.
   * @param {string} id
   * @returns {boolean} true if removed
   */
  removeNPC(id) {
    const npc = this._npcs.get(id);
    if (!npc) return false;
    this._npcs.delete(id);
    this._engine.events.emit('npc:removed', { npcId: id });
    return true;
  }

  getNPC(id) {
    return this._npcs.get(id);
  }

  /**
   * Return a snapshot of all living, non-player NPCs.
   * @returns {NPC[]}
   */
  getLivingNPCPool() {
    return [...this._npcs.values()].filter(
      (npc) => npc.isActive && !npc.isPlayerAvatar && !npc.isFractured && !npc.isAscended
    );
  }

  /**
   * Promote a deceased player avatar to a permanent autonomous NPC.
   * Called by RebirthSystem when a player dies.
   *
   * @param {string} characterId   The old avatar's character ID
   * @param {object} [meta]
   * @param {string} [meta.causeOfDeath]
   * @param {string} [meta.sectorId]
   */
  promoteToNPC(characterId, meta = {}) {
    const npc = this._npcs.get(characterId);
    if (!npc) {
      console.warn(`[NPCSystem] Could not find character ${characterId} to promote.`);
      return;
    }
    npc.isPlayerAvatar = false;
    npc.isDeceasedAvatar = true;
    npc.causeOfDeath = meta.causeOfDeath ?? 'unknown';
    if (meta.sectorId) npc.sectorId = meta.sectorId;

    this._engine.events.emit('npc:promoted_from_avatar', { npcId: npc.id });
    console.log(`[NPCSystem] Character ${characterId} promoted to autonomous NPC.`);
  }

  /**
   * Kill an NPC (natural death, combat, etc.)
   * @param {string} npcId
   * @param {string} [cause='unknown']
   */
  killNPC(npcId, cause = 'unknown') {
    const npc = this._npcs.get(npcId);
    if (!npc || !npc.isActive) return;
    npc.isActive = false;
    npc.causeOfDeath = cause;
    this._engine.events.emit('npc:died', { npcId, cause, statusScore: this._computeStatusScore(npc) });
  }

  /**
   * Mark a character as fractured (Soul Fracture path).
   * Fractured characters do NOT become autonomous NPCs — they are destroyed.
   * @param {string} characterId
   */
  markFractured(characterId) {
    const npc = this._npcs.get(characterId);
    if (!npc) return;
    npc.isFractured = true;
    npc.isActive = false;
    this._engine.events.emit('npc:fractured', { npcId: npc.id });
    console.log(`[NPCSystem] Character ${characterId} marked as fractured.`);
  }

  /**
   * Mark a character as ascended (Ascension path).
   * Ascended characters become ghostly presences, not regular NPCs.
   * @param {string} characterId
   * @param {string} systemId  The star system the Ascended entity controls
   */
  markAscended(characterId, systemId) {
    const npc = this._npcs.get(characterId);
    if (!npc) return;
    npc.isAscended = true;
    npc.isActive = false;
    npc.sectorId = systemId;
    this._engine.events.emit('npc:ascended', { npcId: npc.id, systemId });
    console.log(`[NPCSystem] Character ${characterId} ascended to system ${systemId}.`);
  }

  /**
   * Return population statistics for monitoring / analytics.
   * @returns {PopulationStats}
   */
  getPopulationStats() {
    let living = 0, deceased = 0, playerAvatars = 0, deceasedAvatars = 0, fractured = 0, ascended = 0;
    for (const npc of this._npcs.values()) {
      if (npc.isActive) living++;
      else deceased++;
      if (npc.isPlayerAvatar) playerAvatars++;
      if (npc.isDeceasedAvatar) deceasedAvatars++;
      if (npc.isFractured) fractured++;
      if (npc.isAscended) ascended++;
    }
    return { total: this._npcs.size, living, deceased, playerAvatars, deceasedAvatars, fractured, ascended };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _simulateNPC(npc, inGameYearsPassed, deltaMs) {
    // Age
    npc.ageYears += inGameYearsPassed;

    // Check natural death
    if (!this._genetics) this._genetics = this._engine.getSystem('genetics');
    const maxLifespan = this._genetics.getLifespan(npc.genome);
    if (npc.ageYears >= maxLifespan) {
      this.killNPC(npc.id, 'old_age');
      return;
    }

    // Passive skill growth based on genome aptitude
    for (const [skillName, geneIdx] of Object.entries(APTITUDE_GENES)) {
      const aptitude = npc.genome[geneIdx] / 255;
      if (Math.random() < SKILL_GROWTH_CHANCE_PER_TICK * aptitude) {
        npc.skills[skillName] = Math.min(SKILL_MAX, (npc.skills[skillName] ?? 0) + 1);
      }
    }

    // Passive economic simulation (rough wealth drift)
    const tradeAptitude = npc.genome[APTITUDE_GENES.TRADE] / 255;
    const wealthDelta = (Math.random() - 0.45) * tradeAptitude * 10;
    npc.credits = Math.max(0, npc.credits + wealthDelta);
  }

  _initSkillsFromGenome(genome) {
    const skills = {};
    for (const [skillName, geneIdx] of Object.entries(APTITUDE_GENES)) {
      // Starting skill: 0–20 based on aptitude gene (talent matters but experience is the cap)
      skills[skillName] = Math.floor((genome[geneIdx] / 255) * 20);
    }
    return skills;
  }

  _computeStatusScore(npc) {
    const rebirth = this._engine.getSystem('rebirth');
    return rebirth?.computeStatusScore(npc) ?? 0;
  }
}

/**
 * @typedef {object} NPC
 * @property {string}    id
 * @property {Uint8Array} genome
 * @property {string}    sectorId
 * @property {number}    credits
 * @property {number}    ageYears
 * @property {object}    skills
 * @property {number}    reputation
 * @property {string[]}  relationships
 * @property {boolean}   isActive
 * @property {boolean}   isPlayerAvatar
 * @property {boolean}   isDeceasedAvatar
 * @property {string|null} causeOfDeath
 * @property {boolean}   isFractured
 * @property {boolean}   isAscended
 * @property {number}    spawnedAt
 */

/**
 * @typedef {object} PopulationStats
 * @property {number} total
 * @property {number} living
 * @property {number} deceased
 * @property {number} playerAvatars
 * @property {number} deceasedAvatars
 * @property {number} fractured
 * @property {number} ascended
 */
