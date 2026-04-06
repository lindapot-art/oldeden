import { randomUUID } from 'crypto';

/**
 * SoulFractureSystem — the dramatic death-as-content mechanic of Old Eden.
 *
 * When a player chooses Soul Fracture (at death or voluntarily while alive),
 * their character shatters into Soul Shards that scatter across the galaxy.
 * A server-wide Fracture Event announces the shard hunt.
 *
 * Shard Types:
 *   - skill: +5–20 to a random skill
 *   - wealth: 1,000–50,000 EC
 *   - item: A rare item from the character's inventory
 *   - mutation: A beneficial genetic mutation
 *   - memory: A lore collectible (cosmetic/achievement)
 *
 * Scatter Distribution:
 *   - 40% in same sector as fracture
 *   - 30% in adjacent sectors (1 jump)
 *   - 20% in same region (2–5 jumps)
 *   - 10% in random distant sectors
 *
 * Shards persist for 48 hours before decaying.
 * Any player can absorb shards (first come, first served).
 */

const SHARD_TYPES = Object.freeze(['skill', 'wealth', 'item', 'mutation', 'memory']);

const SHARD_DECAY_MS = 48 * 60 * 60 * 1000; // 48 hours

const SCATTER_DISTRIBUTION = Object.freeze({
  SAME_SECTOR: 0.40,
  ADJACENT: 0.30,
  REGIONAL: 0.20,
  DISTANT: 0.10,
});

export { SHARD_TYPES, SHARD_DECAY_MS, SCATTER_DISTRIBUTION };

export class SoulFractureSystem {
  /**
   * Initialise the system, binding to the engine and setting up internal state.
   * @param {object} engine  The game engine instance
   */
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, SoulShard>} shardId → shard */
    this._activeShards = new Map();
    /** @type {Map<string, FractureRecord>} fractureId → record */
    this._fractureHistory = new Map();

    console.log('[SoulFractureSystem] Initialised.');
  }

  /**
   * Per-frame update — decays expired shards.
   * @param {number} deltaMs  Milliseconds since last tick
   */
  tick(deltaMs) {
    // Decay expired shards
    const now = Date.now();
    for (const [id, shard] of this._activeShards) {
      if (now >= shard.expiresAt) {
        this._activeShards.delete(id);
        this._engine.events.emit('shard:decayed', { shardId: id, sectorId: shard.sectorId });
      }
    }
  }

  /**
   * Tear down the system, releasing all resources.
   */
  async destroy() {
    this._activeShards.clear();
    this._fractureHistory.clear();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Compute the Fracture Power Level of a character (1–100).
   * Based on skills, wealth, age, reputation, and genome quality.
   *
   * @param {object} character  The character/NPC object
   * @returns {number} Power level 1–100
   */
  computeFracturePower(character) {
    const rebirth = this._engine.getSystem('rebirth');
    const statusScore = rebirth ? rebirth.computeStatusScore(character) : 0;
    // statusScore is 0–1, scale to 1–100
    return Math.max(1, Math.min(100, Math.round(statusScore * 100)));
  }

  /**
   * Execute a Soul Fracture for a character.
   *
   * @param {string} playerId       The player initiating the fracture
   * @param {object} character      The character object being fractured
   * @param {object} [options]
   * @param {boolean} [options.amplified=false]  If player used a Fracture Amplifier
   * @returns {FractureResult}
   */
  executeFracture(playerId, character, { amplified = false } = {}) {
    if (!character || !character.id) {
      throw new Error('[SoulFractureSystem] Invalid character for fracture.');
    }

    const powerLevel = this.computeFracturePower(character);
    const baseShardCount = Math.floor(powerLevel / 2) + 5;
    const shardCount = baseShardCount; // 5–55 range

    const shards = this._generateShards(shardCount, character, amplified);
    const scatteredShards = this._scatterShards(shards, character.sectorId);

    // Store all shards
    for (const shard of scatteredShards) {
      this._activeShards.set(shard.id, shard);
    }

    const fractureId = randomUUID();
    const record = {
      fractureId,
      playerId,
      characterId: character.id,
      characterName: character.name || `Character-${character.id.slice(0, 8)}`,
      powerLevel,
      shardCount: scatteredShards.length,
      shardIds: scatteredShards.map(s => s.id),
      amplified,
      timestamp: Date.now(),
    };
    this._fractureHistory.set(fractureId, record);

    // Cap history to prevent unbounded growth
    if (this._fractureHistory.size > 500) {
      const oldest = this._fractureHistory.keys().next().value;
      this._fractureHistory.delete(oldest);
    }

    // Emit events
    this._engine.events.emit('soul:fractured', {
      fractureId,
      playerId,
      characterId: character.id,
      characterName: record.characterName,
      powerLevel,
      shardCount: scatteredShards.length,
      amplified,
    });

    this._engine.events.emit('fracture:event', {
      fractureId,
      message: `The soul of ${record.characterName} has shattered. ${scatteredShards.length} shards now drift among the stars.`,
      shardCount: scatteredShards.length,
      shards: scatteredShards.map(s => ({
        id: s.id,
        sectorId: s.sectorId,
        type: s.type,
        revealAt: s.revealAt,
      })),
    });

    return {
      fractureId,
      powerLevel,
      shardCount: scatteredShards.length,
      shards: scatteredShards,
    };
  }

  /**
   * Absorb a shard — grants its bonus to the absorbing player.
   *
   * @param {string} shardId
   * @param {string} playerId  The player absorbing the shard
   * @returns {ShardAbsorptionResult|null}  null if shard doesn't exist or expired
   */
  absorbShard(shardId, playerId) {
    const shard = this._activeShards.get(shardId);
    if (!shard) return null;

    // Remove shard (first come, first served)
    this._activeShards.delete(shardId);

    const result = {
      shardId,
      playerId,
      type: shard.type,
      bonus: shard.bonus,
      originCharacterName: shard.originCharacterName,
      absorbedAt: Date.now(),
    };

    this._engine.events.emit('shard:absorbed', result);

    // Apply bonus based on type
    this._applyShardBonus(playerId, shard);

    return result;
  }

  /**
   * Get all active (non-expired) shards.
   * @returns {SoulShard[]}
   */
  getActiveShards() {
    return [...this._activeShards.values()];
  }

  /**
   * Get active shards in a specific sector.
   * @param {string} sectorId
   * @returns {SoulShard[]}
   */
  getShardsInSector(sectorId) {
    return [...this._activeShards.values()].filter(s => s.sectorId === sectorId);
  }

  /**
   * Get shards that have been revealed (revealAt <= now).
   * Subscribers with Priority Fracture Alerts see shards 60s earlier.
   * @param {boolean} [priority=false]  Whether the requester has priority access
   * @returns {SoulShard[]}
   */
  getRevealedShards(priority = false) {
    const now = Date.now();
    const offset = priority ? 60_000 : 0; // 60 second head start
    return [...this._activeShards.values()].filter(
      s => now + offset >= s.revealAt
    );
  }

  /**
   * Get fracture history.
   * @returns {FractureRecord[]}
   */
  getFractureHistory() {
    return [...this._fractureHistory.values()];
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * Generate shard objects from a character's accumulated power.
   */
  _generateShards(count, character, amplified) {
    const shards = [];
    const amplifierMultiplier = amplified ? 1.2 : 1.0;
    const skills = character.skills || {};
    const topSkills = Object.entries(skills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    for (let i = 0; i < count; i++) {
      const type = SHARD_TYPES[Math.floor(Math.random() * SHARD_TYPES.length)];
      const bonus = this._generateBonus(type, character, topSkills, amplifierMultiplier);

      shards.push({
        id: randomUUID(),
        type,
        bonus,
        originCharacterId: character.id,
        originCharacterName: character.name || `Character-${character.id.slice(0, 8)}`,
        createdAt: Date.now(),
        expiresAt: Date.now() + SHARD_DECAY_MS,
        revealAt: Date.now(), // will be overwritten by scatter
        sectorId: null, // will be set by scatter
      });
    }
    return shards;
  }

  /**
   * Generate a bonus value for a shard based on its type.
   */
  _generateBonus(type, character, topSkills, multiplier) {
    switch (type) {
      case 'skill': {
        const skill = topSkills.length > 0
          ? topSkills[Math.floor(Math.random() * topSkills.length)]
          : 'COMBAT';
        const amount = Math.round((5 + Math.random() * 15) * multiplier);
        return { skill, amount };
      }
      case 'wealth': {
        const amount = Math.round((1000 + Math.random() * 49000) * multiplier);
        return { credits: amount };
      }
      case 'item': {
        return { itemType: 'rare_artifact', quality: Math.round(Math.random() * 100 * multiplier) };
      }
      case 'mutation': {
        const geneIndex = Math.floor(Math.random() * 128); // First 128 genes (functional)
        const delta = Math.round((1 + Math.random() * 15) * multiplier);
        return { geneIndex, delta };
      }
      case 'memory': {
        return { fragment: `memory_${character.id?.slice(0, 8) || 'unknown'}_${Date.now()}` };
      }
      default:
        return {};
    }
  }

  /**
   * Scatter shards across the galaxy based on distribution rules.
   * Assigns each shard a sectorId and a staggered revealAt time (over 5 minutes).
   */
  _scatterShards(shards, originSectorId) {
    const now = Date.now();
    const revealWindow = 5 * 60 * 1000; // 5 minutes

    // Predefined sector pools (matches AIDirector preset sectors)
    const adjacentSectors = ['alpha-centauri', 'barnards-star', 'wolf-359', 'lalande-21185'];
    const regionalSectors = ['sirius', 'ross-154', 'epsilon-eridani', 'lacaille-9352', 'ross-128'];
    const distantSectors = ['vega', 'altair', 'fomalhaut', 'pollux', 'arcturus', 'deneb', 'rigel', 'betelgeuse'];

    return shards.map((shard, index) => {
      const roll = Math.random();
      let sectorId;

      if (roll < SCATTER_DISTRIBUTION.SAME_SECTOR) {
        sectorId = originSectorId || 'genesis';
      } else if (roll < SCATTER_DISTRIBUTION.SAME_SECTOR + SCATTER_DISTRIBUTION.ADJACENT) {
        sectorId = adjacentSectors[Math.floor(Math.random() * adjacentSectors.length)];
      } else if (roll < SCATTER_DISTRIBUTION.SAME_SECTOR + SCATTER_DISTRIBUTION.ADJACENT + SCATTER_DISTRIBUTION.REGIONAL) {
        sectorId = regionalSectors[Math.floor(Math.random() * regionalSectors.length)];
      } else {
        sectorId = distantSectors[Math.floor(Math.random() * distantSectors.length)];
      }

      // Stagger reveal times over 5 minutes
      const revealDelay = (index / shards.length) * revealWindow;

      return {
        ...shard,
        sectorId,
        revealAt: now + revealDelay,
      };
    });
  }

  /**
   * Apply a shard's bonus to the absorbing player.
   */
  _applyShardBonus(playerId, shard) {
    switch (shard.type) {
      case 'wealth': {
        const economy = this._engine.getSystem('economy');
        if (economy && shard.bonus.credits) {
          economy.credit(playerId, 'ec', shard.bonus.credits);
        }
        break;
      }
      // skill, item, mutation, memory bonuses are emitted as events
      // and applied by the server/client layer
      default: {
        this._engine.events.emit('shard:bonus_applied', {
          playerId,
          shardType: shard.type,
          bonus: shard.bonus,
        });
        break;
      }
    }
  }
}

/**
 * @typedef {object} SoulShard
 * @property {string} id
 * @property {string} type        One of SHARD_TYPES
 * @property {object} bonus       Type-specific bonus data
 * @property {string} originCharacterId
 * @property {string} originCharacterName
 * @property {number} createdAt
 * @property {number} expiresAt
 * @property {number} revealAt
 * @property {string} sectorId
 */

/**
 * @typedef {object} FractureResult
 * @property {string}      fractureId
 * @property {number}      powerLevel
 * @property {number}      shardCount
 * @property {SoulShard[]} shards
 */

/**
 * @typedef {object} FractureRecord
 * @property {string}   fractureId
 * @property {string}   playerId
 * @property {string}   characterId
 * @property {string}   characterName
 * @property {number}   powerLevel
 * @property {number}   shardCount
 * @property {string[]} shardIds
 * @property {boolean}  amplified
 * @property {number}   timestamp
 */

/**
 * @typedef {object} ShardAbsorptionResult
 * @property {string} shardId
 * @property {string} playerId
 * @property {string} type
 * @property {object} bonus
 * @property {string} originCharacterName
 * @property {number} absorbedAt
 */
