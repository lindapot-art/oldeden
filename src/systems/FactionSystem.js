/**
 * FactionSystem — faction reputation, ranks, warfare, missions, and equipment
 * access for Old Eden.
 *
 * Eight major factions compete for galactic influence.  Every player carries
 * an independent reputation score with each faction (−1000 … +1000).
 * Reputation determines rank, mission availability, equipment access, and
 * how inter-faction warfare modifies standing changes.
 *
 * Faction diplomacy is tracked as a pair-wise relation map:
 *   war   — reputation gains with one side penalise the other
 *   peace — no cross-faction modifier
 *   alliance — reputation gains with one side grant a small bonus to the ally
 */

// ── Faction Definitions ─────────────────────────────────────────────────────

/** @type {ReadonlyArray<Faction>} */
export const FACTIONS = Object.freeze([
  { id: 'hegemony_vanguard',     name: 'Hegemony Vanguard',      ideology: 'order',         homeRegion: 'Core Systems',       color: '#3B82F6' },
  { id: 'free_traders',          name: 'Free Traders Consortium', ideology: 'liberty',        homeRegion: 'Trade Lanes',        color: '#22C55E' },
  { id: 'void_cult',             name: 'Void Cult',               ideology: 'mysticism',      homeRegion: 'Outer Fringe',       color: '#A855F7' },
  { id: 'iron_syndicate',        name: 'Iron Syndicate',          ideology: 'profit',         homeRegion: 'Mining Belts',       color: '#EAB308' },
  { id: 'eden_remnants',         name: 'Eden Remnants',           ideology: 'archaeology',    homeRegion: 'Old Eden System',    color: '#78716C' },
  { id: 'stellar_church',        name: 'Stellar Church',          ideology: 'faith',          homeRegion: 'Central Worlds',     color: '#EC4899' },
  { id: 'autonomous_collective', name: 'Autonomous Collective',   ideology: 'transcendence',  homeRegion: 'Robotic Hubs',       color: '#06B6D4' },
  { id: 'rogue_ai_network',      name: 'Rogue AI Network',        ideology: 'survival',       homeRegion: 'Deep Space',         color: '#F97316' },
]);

export const FACTION_IDS = Object.freeze(FACTIONS.map(f => f.id));

// ── Rank Definitions ────────────────────────────────────────────────────────

/**
 * 10 ranks mapping reputation thresholds to named tiers.
 * Sorted ascending by `minRep`.
 */
export const RANKS = Object.freeze([
  { level: 0,  name: 'Hostile',      minRep: -1000 },
  { level: 1,  name: 'Hated',        minRep: -800  },
  { level: 2,  name: 'Unfriendly',   minRep: -500  },
  { level: 3,  name: 'Distrusted',   minRep: -200  },
  { level: 4,  name: 'Neutral',      minRep: 0     },
  { level: 5,  name: 'Accepted',     minRep: 100   },
  { level: 6,  name: 'Friendly',     minRep: 300   },
  { level: 7,  name: 'Honoured',     minRep: 500   },
  { level: 8,  name: 'Revered',      minRep: 700   },
  { level: 9,  name: 'Exalted',      minRep: 900   },
]);

// ── Diplomacy States ────────────────────────────────────────────────────────

export const DIPLOMACY = Object.freeze({
  WAR:      'war',
  PEACE:    'peace',
  ALLIANCE: 'alliance',
});

/** Cross-faction reputation modifier when gaining rep with a faction at war / allied */
const WAR_PENALTY_RATIO    = -0.5;
const ALLIANCE_BONUS_RATIO =  0.25;

// ── Reputation Bounds ───────────────────────────────────────────────────────

const REP_MIN = -1000;
const REP_MAX =  1000;

// ── Mission Templates ───────────────────────────────────────────────────────

const MISSION_TEMPLATES = [
  { type: 'patrol',     title: 'Border Patrol',            baseRep: 30,  penalty: -15 },
  { type: 'trade',      title: 'Supply Run',               baseRep: 20,  penalty: -5  },
  { type: 'sabotage',   title: 'Covert Sabotage',          baseRep: 50,  penalty: -40 },
  { type: 'diplomacy',  title: 'Diplomatic Envoy',         baseRep: 40,  penalty: -10 },
  { type: 'bounty',     title: 'Bounty Hunt',              baseRep: 60,  penalty: -30 },
  { type: 'recon',      title: 'Deep Space Reconnaissance', baseRep: 25,  penalty: -10 },
];

// ── Equipment Catalogue ─────────────────────────────────────────────────────

/**
 * Items gated behind faction rank requirements.
 * @type {ReadonlyArray<FactionEquipment>}
 */
export const FACTION_EQUIPMENT = Object.freeze([
  { id: 'vanguard_shield',      name: 'Vanguard Bulwark Shield',  factionId: 'hegemony_vanguard',     minRank: 5 },
  { id: 'trader_drive',         name: 'Liberty Warp Drive',       factionId: 'free_traders',          minRank: 6 },
  { id: 'syndicate_cloak',      name: 'Shadow Cloak Module',      factionId: 'iron_syndicate',        minRank: 7 },
  { id: 'church_relic',         name: 'Starbound Relic',          factionId: 'stellar_church',        minRank: 8 },
  { id: 'void_scanner',         name: 'Omniscient Scanner',       factionId: 'void_cult',             minRank: 5 },
  { id: 'remnant_plating',      name: 'Hardened Eden Plating',    factionId: 'eden_remnants',         minRank: 6 },
  { id: 'collective_core',      name: 'Transcendence Core',       factionId: 'autonomous_collective', minRank: 9 },
  { id: 'rogue_cannon',         name: 'Rogue AI Plasma Cannon',   factionId: 'rogue_ai_network',      minRank: 7 },
]);

// ─────────────────────────────────────────────────────────────────────────────

export class FactionSystem {
  async init(engine) {
    this._engine = engine;
    /** @type {Map<string, Map<string, number>>} playerId → (factionId → reputation) */
    this._reputation = new Map();
    /** @type {Map<string, string>} "factionA|factionB" → DIPLOMACY value */
    this._diplomacy = new Map();
    /** Mission ID counter */
    this._nextMissionId = 1;
    console.log('[FactionSystem] Initialised.');
  }

  tick(deltaMs) {
    // Reserved for future periodic diplomacy shifts or decay
  }

  async destroy() {
    this._reputation.clear();
    this._diplomacy.clear();
  }

  // ── Reputation Tracking ───────────────────────────────────────────────────

  /**
   * Get a player's reputation map (factionId → rep) creating defaults if needed.
   * @param {string} playerId
   * @returns {Map<string, number>}
   */
  getReputationMap(playerId) {
    if (!this._reputation.has(playerId)) {
      const map = new Map();
      for (const id of FACTION_IDS) map.set(id, 0);
      this._reputation.set(playerId, map);
    }
    return this._reputation.get(playerId);
  }

  /**
   * Get a player's reputation with a specific faction.
   * @param {string} playerId
   * @param {string} factionId
   * @returns {number}
   */
  getReputation(playerId, factionId) {
    return this.getReputationMap(playerId).get(factionId) ?? 0;
  }

  /**
   * Modify a player's reputation with a faction, clamped to [−1000, +1000].
   * Cross-faction modifiers are applied when factions are at war or allied.
   * @param {string} playerId
   * @param {string} factionId
   * @param {number} delta      Positive or negative reputation change
   */
  modifyReputation(playerId, factionId, delta) {
    const map = this.getReputationMap(playerId);
    const oldRep = map.get(factionId) ?? 0;
    const newRep = Math.max(REP_MIN, Math.min(REP_MAX, oldRep + delta));
    map.set(factionId, newRep);

    const oldRank = this._rankForRep(oldRep);
    const newRank = this._rankForRep(newRep);

    this._engine.events.emit('faction:reputation_changed', {
      playerId, factionId, oldRep, newRep, delta,
    });

    if (oldRank.level !== newRank.level) {
      this._engine.events.emit('faction:rank_changed', {
        playerId, factionId, oldRank: oldRank.name, newRank: newRank.name,
        oldLevel: oldRank.level, newLevel: newRank.level,
      });
    }

    // Apply cross-faction modifiers based on diplomacy
    for (const otherId of FACTION_IDS) {
      if (otherId === factionId) continue;
      const relation = this.getDiplomacy(factionId, otherId);
      let crossDelta = 0;
      if (relation === DIPLOMACY.WAR)      crossDelta = Math.round(delta * WAR_PENALTY_RATIO);
      if (relation === DIPLOMACY.ALLIANCE) crossDelta = Math.round(delta * ALLIANCE_BONUS_RATIO);
      if (crossDelta !== 0) {
        const otherOld = map.get(otherId) ?? 0;
        const otherNew = Math.max(REP_MIN, Math.min(REP_MAX, otherOld + crossDelta));
        map.set(otherId, otherNew);
      }
    }
  }

  // ── Rank Progression ──────────────────────────────────────────────────────

  /**
   * Get a player's rank with a faction.
   * @param {string} playerId
   * @param {string} factionId
   * @returns {Rank}
   */
  getRank(playerId, factionId) {
    const rep = this.getReputation(playerId, factionId);
    return this._rankForRep(rep);
  }

  /**
   * Resolve rank from a raw reputation value.
   * @param {number} rep
   * @returns {Rank}
   * @private
   */
  _rankForRep(rep) {
    let result = RANKS[0];
    for (const rank of RANKS) {
      if (rep >= rank.minRep) result = rank;
    }
    return result;
  }

  // ── Faction Missions ──────────────────────────────────────────────────────

  /**
   * Generate a set of faction-specific missions for a player.
   * @param {string} playerId
   * @param {string} factionId
   * @param {number} [count=3] Number of missions to generate
   * @returns {FactionMission[]}
   */
  generateMissions(playerId, factionId, count = 3) {
    const rank = this.getRank(playerId, factionId);
    const faction = FACTIONS.find(f => f.id === factionId);
    if (!faction) return [];

    const missions = [];
    for (let i = 0; i < count; i++) {
      const template = MISSION_TEMPLATES[i % MISSION_TEMPLATES.length];
      const scaledRep = Math.round(template.baseRep * (1 + rank.level * 0.1));
      const scaledPenalty = Math.round(template.penalty * (1 + rank.level * 0.1));

      // Pick a rival faction affected by completing this mission
      const rivals = FACTION_IDS.filter(id => id !== factionId);
      const rivalId = rivals[i % rivals.length];

      /** @type {FactionMission} */
      const mission = {
        id: `mission_${this._nextMissionId++}`,
        factionId,
        factionName: faction.name,
        type: template.type,
        title: `${faction.name}: ${template.title}`,
        reputationReward: scaledRep,
        reputationPenalty: scaledPenalty,
        affectedFaction: rivalId,
        requiredRank: Math.min(rank.level, 9),
      };
      missions.push(mission);
    }

    this._engine.events.emit('faction:missions_generated', {
      playerId, factionId, missionCount: missions.length,
    });

    return missions;
  }

  /**
   * Complete a faction mission, applying reputation rewards and penalties.
   * @param {string} playerId
   * @param {FactionMission} mission
   */
  completeMission(playerId, mission) {
    this.modifyReputation(playerId, mission.factionId, mission.reputationReward);

    if (mission.affectedFaction && mission.reputationPenalty) {
      this.modifyReputation(playerId, mission.affectedFaction, mission.reputationPenalty);
    }

    this._engine.events.emit('faction:mission_completed', {
      playerId, missionId: mission.id, factionId: mission.factionId,
    });
  }

  // ── Faction Warfare / Diplomacy ───────────────────────────────────────────

  /**
   * Build a canonical key for a faction pair (order-independent).
   * @param {string} a
   * @param {string} b
   * @returns {string}
   * @private
   */
  _pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  /**
   * Get the diplomatic state between two factions.
   * @param {string} factionA
   * @param {string} factionB
   * @returns {string} DIPLOMACY value
   */
  getDiplomacy(factionA, factionB) {
    return this._diplomacy.get(this._pairKey(factionA, factionB)) ?? DIPLOMACY.PEACE;
  }

  /**
   * Set the diplomatic state between two factions.
   * @param {string} factionA
   * @param {string} factionB
   * @param {string} state  DIPLOMACY enum value
   */
  setDiplomacy(factionA, factionB, state) {
    const valid = Object.values(DIPLOMACY);
    if (!valid.includes(state)) throw new Error(`Invalid diplomacy state: ${state}`);
    if (factionA === factionB) throw new Error('A faction cannot have diplomacy with itself.');

    this._diplomacy.set(this._pairKey(factionA, factionB), state);
    this._engine.events.emit('faction:diplomacy_changed', {
      factionA, factionB, state,
    });
  }

  // ── Faction-Exclusive Equipment ───────────────────────────────────────────

  /**
   * Check whether a player can access a faction-exclusive equipment item.
   * @param {string} playerId
   * @param {string} equipmentId
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canAccessEquipment(playerId, equipmentId) {
    const item = FACTION_EQUIPMENT.find(e => e.id === equipmentId);
    if (!item) return { allowed: false, reason: 'Unknown equipment.' };

    const rank = this.getRank(playerId, item.factionId);
    if (rank.level < item.minRank) {
      const required = RANKS.find(r => r.level === item.minRank);
      return {
        allowed: false,
        reason: `Requires ${required?.name ?? `rank ${item.minRank}`} with ${item.factionId}.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Return all equipment a player currently qualifies for.
   * @param {string} playerId
   * @returns {FactionEquipment[]}
   */
  getAccessibleEquipment(playerId) {
    return FACTION_EQUIPMENT.filter(item => {
      const rank = this.getRank(playerId, item.factionId);
      return rank.level >= item.minRank;
    });
  }
}

// ── JSDoc Typedefs ──────────────────────────────────────────────────────────

/**
 * @typedef {object} Faction
 * @property {string} id
 * @property {string} name
 * @property {string} ideology
 * @property {string} homeRegion
 * @property {string} color        Hex colour code
 */

/**
 * @typedef {object} Rank
 * @property {number} level   0–9
 * @property {string} name
 * @property {number} minRep  Minimum reputation for this rank
 */

/**
 * @typedef {object} FactionMission
 * @property {string} id
 * @property {string} factionId
 * @property {string} factionName
 * @property {string} type
 * @property {string} title
 * @property {number} reputationReward   Rep gained with issuing faction
 * @property {number} reputationPenalty  Rep change with affected faction (usually negative)
 * @property {string} affectedFaction    Faction penalised by mission completion
 * @property {number} requiredRank       Minimum rank level to accept this mission
 */

/**
 * @typedef {object} FactionEquipment
 * @property {string} id
 * @property {string} name
 * @property {string} factionId
 * @property {number} minRank   Minimum rank level required
 */
