import { randomUUID } from 'crypto';

/**
 * ProceduralGenerator — generates never-repeating content for Old Eden.
 *
 * Uses seeded pseudo-random generation so that the same seed always produces
 * the same content (enabling deterministic testing and content sharing).
 *
 * Generates:
 *   - Star systems (name, type, planets, hazards, resources)
 *   - Planet descriptions (atmosphere, gravity, terrain, biome)
 *   - Quest hooks (objective, setting, antagonist, reward type)
 *   - Anomalies (deep-space events that trigger the AI Director)
 *   - NPC backstories (short narrative bio for the NPC pool)
 */

// Star spectral classes with their frequency weights
const STAR_TYPES = [
  { type: 'M-class Red Dwarf',    weight: 0.73, radiationBase: 0.05 },
  { type: 'K-class Orange Dwarf', weight: 0.12, radiationBase: 0.08 },
  { type: 'G-class Yellow Dwarf', weight: 0.07, radiationBase: 0.10 },
  { type: 'F-class Yellow-White', weight: 0.03, radiationBase: 0.15 },
  { type: 'A-class White',        weight: 0.006, radiationBase: 0.25 },
  { type: 'Neutron Star',         weight: 0.002, radiationBase: 0.95 },
  { type: 'Black Hole',           weight: 0.001, radiationBase: 1.00 },
  { type: 'Binary System',        weight: 0.02, radiationBase: 0.20 },
];

const PLANET_BIOMES = [
  'Arid Desert', 'Ice World', 'Ocean World', 'Jungle Canopy',
  'Volcanic Hellscape', 'Barren Rock', 'Terraformed Garden',
  'Fungal Forest', 'Crystal Wastes', 'Gas Giant',
];

const HAZARD_TYPES = [
  'Radiation Belt', 'Asteroid Field', 'Pirate Territory',
  'Temporal Anomaly', 'Toxic Atmosphere', 'Extreme Gravity Well',
  'Electromagnetic Storm', 'Wormhole Instability',
];

const RESOURCE_TYPES = [
  'Titanite Ore', 'Dark Matter Crystals', 'Hydrogen Fuel',
  'Rare Earth Compounds', 'Bio-organic Materials', 'Ancient Artefacts',
  'Quantum Processors', 'Anti-matter Reserves',
];

const QUEST_OBJECTIVES = [
  'Retrieve', 'Protect', 'Eliminate', 'Escort', 'Investigate',
  'Sabotage', 'Negotiate', 'Explore', 'Capture', 'Deliver',
];

const FACTION_NAMES = [
  'Hegemony Vanguard', 'Free Traders Consortium', 'Void Cult',
  'Iron Syndicate', 'Eden Remnants', 'Stellar Church',
  'Autonomous Collective', 'Rogue AI Network',
];

export class ProceduralGenerator {
  async init(engine) {
    this._engine = engine;
    console.log('[ProceduralGenerator] Initialised.');
  }

  tick(_deltaMs) {}

  async destroy() {}

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate a complete star system.
   * @param {string} [seed]  Hex seed for deterministic generation (optional)
   * @returns {StarSystem}
   */
  generateStarSystem(seed) {
    const rng = this._makeRng(seed);

    const starType = this._weightedPick(STAR_TYPES, rng);
    const planetCount = Math.floor(rng() * 8) + 1;
    const planets = Array.from({ length: planetCount }, () => this._generatePlanet(rng));
    const hazards = this._pickMultiple(HAZARD_TYPES, Math.floor(rng() * 3), rng);
    const resources = this._pickMultiple(RESOURCE_TYPES, 1 + Math.floor(rng() * 4), rng);

    return {
      id: randomUUID(),
      seed: seed ?? 'random',
      name: this._generateStarName(rng),
      starType: starType.type,
      baseRadiation: starType.radiationBase,
      planetCount,
      planets,
      hazards,
      resources,
      hasWormhole: rng() < 0.05,
      discoveredAt: null,
      controllingFaction: rng() < 0.6 ? this._pick(FACTION_NAMES, rng) : null,
    };
  }

  /**
   * Generate a dynamic quest hook.
   * @param {object} [context]  Optional context (player level, faction, location)
   * @returns {QuestHook}
   */
  generateQuestHook(context = {}) {
    const rng = this._makeRng();

    const objective = this._pick(QUEST_OBJECTIVES, rng);
    const faction   = this._pick(FACTION_NAMES, rng);
    const resource  = this._pick(RESOURCE_TYPES, rng);
    const hazard    = this._pick(HAZARD_TYPES, rng);

    return {
      id: randomUUID(),
      objective,
      summary: `${objective} ${resource} from the ${faction} in a sector threatened by ${hazard}.`,
      faction,
      resource,
      hazard,
      rewardType: rng() < 0.4 ? 'ec' : rng() < 0.7 ? 'sm' : 'nft',
      rewardScale: 1 + Math.floor(rng() * 10),
      expiresInHours: 6 + Math.floor(rng() * 42),
      generatedAt: Date.now(),
    };
  }

  /**
   * Generate a short NPC backstory for the NPC pool display.
   * @param {object} npc  NPC object (used to personalise the backstory)
   * @returns {string}
   */
  generateNPCBackstory(npc) {
    const rng = this._makeRng(npc.id);
    const faction = this._pick(FACTION_NAMES, rng);
    const origin  = this._generateStarName(rng);
    const trait   = this._pick([
      'a survivor of the Eden Wars', 'a former corporate enforcer',
      'a disgraced scientist', 'a veteran deep-space pilot',
      'a reformed pirate', 'a self-taught engineer',
      'a black-market trader', 'a monastery-trained healer',
    ], rng);

    return `Born in the ${origin} system, ${npc.id.slice(0, 6)} is ${trait} now loosely affiliated with the ${faction}. Age: ${Math.round(npc.ageYears)}.`;
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _generatePlanet(rng) {
    return {
      name: this._generatePlanetName(rng),
      biome: this._pick(PLANET_BIOMES, rng),
      gravity: (0.1 + rng() * 3.9).toFixed(2),
      atmosphereDensity: rng().toFixed(2),
      hasLife: rng() < 0.15,
      colonised: rng() < 0.2,
      radiation: rng() < 0.3 ? (rng() * 0.8).toFixed(2) : '0.00',
    };
  }

  _generateStarName(rng) {
    const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Zeta', 'Tau', 'Sigma', 'Nova'];
    const suffixes = ['Prime', 'Secundus', 'Minor', 'Maxima', 'Reach', 'Deep', 'Expanse'];
    const nums = ['-I', '-II', '-III', '-IV', '-V', ''];
    return `${this._pick(prefixes, rng)} ${this._pick(suffixes, rng)}${this._pick(nums, rng)}`;
  }

  _generatePlanetName(rng) {
    const roots = ['Keth', 'Vor', 'Sel', 'Mar', 'Ion', 'Drak', 'Vex', 'Kal', 'Nur'];
    const endings = ['us', 'ia', 'on', 'ara', 'ex', 'ith', 'or', 'en'];
    return `${this._pick(roots, rng)}${this._pick(endings, rng)}`;
  }

  /**
   * Very lightweight seeded LCG RNG (not cryptographic — for procedural generation only).
   * @param {string} [seed]
   * @returns {() => number}
   */
  _makeRng(seed) {
    let s = 0;
    if (seed) {
      for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    } else {
      s = (Math.random() * 0xFFFFFFFF) >>> 0;
    }
    return () => {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  _pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  _pickMultiple(arr, count, rng) {
    const shuffled = [...arr].sort(() => rng() - 0.5);
    return shuffled.slice(0, Math.min(count, arr.length));
  }

  _weightedPick(items, rng) {
    const total = items.reduce((s, item) => s + item.weight, 0);
    let roll = rng() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }
}

/**
 * @typedef {object} StarSystem
 * @property {string}   id
 * @property {string}   seed
 * @property {string}   name
 * @property {string}   starType
 * @property {number}   baseRadiation
 * @property {number}   planetCount
 * @property {object[]} planets
 * @property {string[]} hazards
 * @property {string[]} resources
 * @property {boolean}  hasWormhole
 * @property {number|null} discoveredAt
 * @property {string|null} controllingFaction
 */

/**
 * @typedef {object} QuestHook
 * @property {string} id
 * @property {string} objective
 * @property {string} summary
 * @property {string} faction
 * @property {string} resource
 * @property {string} hazard
 * @property {string} rewardType
 * @property {number} rewardScale
 * @property {number} expiresInHours
 * @property {number} generatedAt
 */
