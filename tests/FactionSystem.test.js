/**
 * Tests for FactionSystem — reputation, ranks, missions, diplomacy, and
 * faction-exclusive equipment.
 */
import { jest } from '@jest/globals';
import {
  FactionSystem,
  FACTIONS,
  FACTION_IDS,
  RANKS,
  DIPLOMACY,
  FACTION_EQUIPMENT,
} from '../src/systems/FactionSystem.js';

describe('FactionSystem', () => {
  let faction;
  let stubEngine;

  beforeEach(() => {
    faction = new FactionSystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };
    faction._engine = stubEngine;
    faction._reputation = new Map();
    faction._diplomacy = new Map();
    faction._nextMissionId = 1;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Faction Definitions ──────────────────────────────────────────────

  describe('FACTIONS constant', () => {
    it('defines exactly 8 major factions', () => {
      expect(FACTIONS).toHaveLength(8);
    });

    it('each faction has id, name, ideology, homeRegion, and color', () => {
      for (const f of FACTIONS) {
        expect(f).toHaveProperty('id');
        expect(f).toHaveProperty('name');
        expect(f).toHaveProperty('ideology');
        expect(f).toHaveProperty('homeRegion');
        expect(f).toHaveProperty('color');
      }
    });

    it('contains the expected faction ids', () => {
      const ids = FACTIONS.map(f => f.id);
      expect(ids).toContain('terran_dominion');
      expect(ids).toContain('free_colonies');
      expect(ids).toContain('syndicate');
      expect(ids).toContain('covenant_of_stars');
      expect(ids).toContain('void_collective');
      expect(ids).toContain('iron_pact');
      expect(ids).toContain('ascendant_order');
      expect(ids).toContain('remnant_clans');
    });

    it('maps ideologies correctly', () => {
      const byId = Object.fromEntries(FACTIONS.map(f => [f.id, f.ideology]));
      expect(byId.terran_dominion).toBe('order');
      expect(byId.free_colonies).toBe('liberty');
      expect(byId.syndicate).toBe('profit');
      expect(byId.covenant_of_stars).toBe('faith');
      expect(byId.void_collective).toBe('knowledge');
      expect(byId.iron_pact).toBe('survival');
      expect(byId.ascendant_order).toBe('transcendence');
      expect(byId.remnant_clans).toBe('tradition');
    });

    it('FACTION_IDS mirrors FACTIONS', () => {
      expect(FACTION_IDS).toEqual(FACTIONS.map(f => f.id));
    });
  });

  // ── 2. Reputation Tracking ─────────────────────────────────────────────

  describe('reputation tracking', () => {
    it('initialises every faction to 0 for a new player', () => {
      const map = faction.getReputationMap('p1');
      for (const id of FACTION_IDS) {
        expect(map.get(id)).toBe(0);
      }
    });

    it('returns the same map on subsequent calls', () => {
      const a = faction.getReputationMap('p1');
      const b = faction.getReputationMap('p1');
      expect(a).toBe(b);
    });

    it('getReputation returns 0 for uninitialised player', () => {
      expect(faction.getReputation('new', 'syndicate')).toBe(0);
    });

    it('modifyReputation increases reputation', () => {
      faction.modifyReputation('p1', 'iron_pact', 100);
      expect(faction.getReputation('p1', 'iron_pact')).toBe(100);
    });

    it('modifyReputation decreases reputation', () => {
      faction.modifyReputation('p1', 'iron_pact', -250);
      expect(faction.getReputation('p1', 'iron_pact')).toBe(-250);
    });

    it('clamps reputation to +1000', () => {
      faction.modifyReputation('p1', 'syndicate', 2000);
      expect(faction.getReputation('p1', 'syndicate')).toBe(1000);
    });

    it('clamps reputation to -1000', () => {
      faction.modifyReputation('p1', 'syndicate', -2000);
      expect(faction.getReputation('p1', 'syndicate')).toBe(-1000);
    });

    it('emits faction:reputation_changed on modification', () => {
      faction.modifyReputation('p1', 'syndicate', 50);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'faction:reputation_changed',
        expect.objectContaining({ playerId: 'p1', factionId: 'syndicate', delta: 50 }),
      );
    });
  });

  // ── 3. Rank Progression ────────────────────────────────────────────────

  describe('rank progression', () => {
    it('defines exactly 10 ranks', () => {
      expect(RANKS).toHaveLength(10);
    });

    it('starts at Neutral (level 4) for a new player', () => {
      const rank = faction.getRank('p1', 'terran_dominion');
      expect(rank.name).toBe('Neutral');
      expect(rank.level).toBe(4);
    });

    it('returns Hostile at -1000', () => {
      faction.modifyReputation('p1', 'terran_dominion', -1000);
      expect(faction.getRank('p1', 'terran_dominion').name).toBe('Hostile');
    });

    it('returns Exalted at +900', () => {
      faction.modifyReputation('p1', 'terran_dominion', 900);
      expect(faction.getRank('p1', 'terran_dominion').name).toBe('Exalted');
    });

    it('returns correct intermediate ranks', () => {
      faction.modifyReputation('p1', 'void_collective', 300);
      expect(faction.getRank('p1', 'void_collective').name).toBe('Friendly');

      faction.modifyReputation('p1', 'iron_pact', -500);
      expect(faction.getRank('p1', 'iron_pact').name).toBe('Unfriendly');
    });

    it('emits faction:rank_changed when crossing a rank boundary', () => {
      faction.modifyReputation('p1', 'syndicate', 100);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'faction:rank_changed',
        expect.objectContaining({
          playerId: 'p1',
          factionId: 'syndicate',
          oldRank: 'Neutral',
          newRank: 'Accepted',
        }),
      );
    });

    it('does not emit rank_changed when staying within the same rank', () => {
      faction.modifyReputation('p1', 'syndicate', 10);
      const rankEvents = stubEngine.events.emit.mock.calls.filter(
        c => c[0] === 'faction:rank_changed',
      );
      expect(rankEvents).toHaveLength(0);
    });
  });

  // ── 4. Faction Mission Generation ──────────────────────────────────────

  describe('generateMissions()', () => {
    it('returns the requested number of missions', () => {
      const missions = faction.generateMissions('p1', 'terran_dominion', 5);
      expect(missions).toHaveLength(5);
    });

    it('defaults to 3 missions', () => {
      const missions = faction.generateMissions('p1', 'free_colonies');
      expect(missions).toHaveLength(3);
    });

    it('returns an empty array for unknown faction', () => {
      const missions = faction.generateMissions('p1', 'nonexistent');
      expect(missions).toEqual([]);
    });

    it('each mission has expected fields', () => {
      const missions = faction.generateMissions('p1', 'syndicate', 1);
      const m = missions[0];
      expect(m).toHaveProperty('id');
      expect(m).toHaveProperty('factionId', 'syndicate');
      expect(m).toHaveProperty('factionName', 'Syndicate');
      expect(m).toHaveProperty('type');
      expect(m).toHaveProperty('title');
      expect(m).toHaveProperty('reputationReward');
      expect(m).toHaveProperty('reputationPenalty');
      expect(m).toHaveProperty('affectedFaction');
      expect(m).toHaveProperty('requiredRank');
    });

    it('scales reputation reward with player rank', () => {
      const lowMissions = faction.generateMissions('p1', 'iron_pact', 1);

      faction.modifyReputation('p1', 'iron_pact', 900);
      stubEngine.events.emit.mockClear();
      const highMissions = faction.generateMissions('p1', 'iron_pact', 1);

      expect(highMissions[0].reputationReward).toBeGreaterThan(lowMissions[0].reputationReward);
    });

    it('affected faction is different from issuing faction', () => {
      const missions = faction.generateMissions('p1', 'covenant_of_stars', 6);
      for (const m of missions) {
        expect(m.affectedFaction).not.toBe('covenant_of_stars');
      }
    });

    it('emits faction:missions_generated event', () => {
      faction.generateMissions('p1', 'terran_dominion', 2);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'faction:missions_generated',
        expect.objectContaining({ playerId: 'p1', factionId: 'terran_dominion', missionCount: 2 }),
      );
    });
  });

  describe('completeMission()', () => {
    it('grants reputation to issuing faction', () => {
      const missions = faction.generateMissions('p1', 'syndicate', 1);
      faction.completeMission('p1', missions[0]);
      expect(faction.getReputation('p1', 'syndicate')).toBeGreaterThan(0);
    });

    it('applies penalty to affected faction', () => {
      const missions = faction.generateMissions('p1', 'syndicate', 1);
      const affected = missions[0].affectedFaction;
      faction.completeMission('p1', missions[0]);
      expect(faction.getReputation('p1', affected)).toBeLessThan(0);
    });

    it('emits faction:mission_completed event', () => {
      const missions = faction.generateMissions('p1', 'iron_pact', 1);
      stubEngine.events.emit.mockClear();
      faction.completeMission('p1', missions[0]);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'faction:mission_completed',
        expect.objectContaining({ playerId: 'p1', missionId: missions[0].id }),
      );
    });
  });

  // ── 5. Faction Warfare / Diplomacy ─────────────────────────────────────

  describe('diplomacy / warfare state', () => {
    it('defaults to peace between any two factions', () => {
      expect(faction.getDiplomacy('terran_dominion', 'syndicate')).toBe(DIPLOMACY.PEACE);
    });

    it('setDiplomacy stores war state', () => {
      faction.setDiplomacy('terran_dominion', 'syndicate', DIPLOMACY.WAR);
      expect(faction.getDiplomacy('terran_dominion', 'syndicate')).toBe(DIPLOMACY.WAR);
    });

    it('setDiplomacy stores alliance state', () => {
      faction.setDiplomacy('free_colonies', 'iron_pact', DIPLOMACY.ALLIANCE);
      expect(faction.getDiplomacy('free_colonies', 'iron_pact')).toBe(DIPLOMACY.ALLIANCE);
    });

    it('diplomacy is order-independent', () => {
      faction.setDiplomacy('syndicate', 'terran_dominion', DIPLOMACY.WAR);
      expect(faction.getDiplomacy('terran_dominion', 'syndicate')).toBe(DIPLOMACY.WAR);
    });

    it('throws for invalid diplomacy state', () => {
      expect(() =>
        faction.setDiplomacy('terran_dominion', 'syndicate', 'truce'),
      ).toThrow();
    });

    it('throws when setting diplomacy with self', () => {
      expect(() =>
        faction.setDiplomacy('syndicate', 'syndicate', DIPLOMACY.PEACE),
      ).toThrow();
    });

    it('emits faction:diplomacy_changed event', () => {
      faction.setDiplomacy('terran_dominion', 'free_colonies', DIPLOMACY.ALLIANCE);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'faction:diplomacy_changed',
        expect.objectContaining({
          factionA: 'terran_dominion',
          factionB: 'free_colonies',
          state: DIPLOMACY.ALLIANCE,
        }),
      );
    });

    it('war causes negative cross-faction rep when gaining rep', () => {
      faction.setDiplomacy('terran_dominion', 'syndicate', DIPLOMACY.WAR);
      faction.modifyReputation('p1', 'terran_dominion', 100);
      // Syndicate should lose rep due to war penalty
      expect(faction.getReputation('p1', 'syndicate')).toBeLessThan(0);
    });

    it('alliance causes positive cross-faction rep when gaining rep', () => {
      faction.setDiplomacy('terran_dominion', 'free_colonies', DIPLOMACY.ALLIANCE);
      faction.modifyReputation('p1', 'terran_dominion', 100);
      // Free Colonies should gain rep due to alliance bonus
      expect(faction.getReputation('p1', 'free_colonies')).toBeGreaterThan(0);
    });

    it('peace causes no cross-faction rep change', () => {
      // Default is peace
      faction.modifyReputation('p1', 'terran_dominion', 100);
      expect(faction.getReputation('p1', 'syndicate')).toBe(0);
    });
  });

  // ── 6. Faction-Exclusive Equipment ─────────────────────────────────────

  describe('faction-exclusive equipment', () => {
    it('FACTION_EQUIPMENT has items for multiple factions', () => {
      const factionIds = new Set(FACTION_EQUIPMENT.map(e => e.factionId));
      expect(factionIds.size).toBeGreaterThanOrEqual(4);
    });

    it('denies access when player rank is too low', () => {
      const result = faction.canAccessEquipment('p1', 'dominion_shield');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('grants access when player meets rank requirement', () => {
      // Dominion shield requires rank 5 (Accepted, minRep 100)
      faction.modifyReputation('p1', 'terran_dominion', 200);
      const result = faction.canAccessEquipment('p1', 'dominion_shield');
      expect(result.allowed).toBe(true);
    });

    it('returns unknown equipment error for invalid id', () => {
      const result = faction.canAccessEquipment('p1', 'nonexistent_gun');
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/unknown/i);
    });

    it('getAccessibleEquipment returns empty for new player', () => {
      const items = faction.getAccessibleEquipment('p1');
      expect(items).toHaveLength(0);
    });

    it('getAccessibleEquipment returns items as rank increases', () => {
      // Reach Accepted (rank 5) with terran_dominion — unlocks dominion_shield
      faction.modifyReputation('p1', 'terran_dominion', 200);
      const items = faction.getAccessibleEquipment('p1');
      const ids = items.map(i => i.id);
      expect(ids).toContain('dominion_shield');
    });

    it('requires high rank for ascendant_core (rank 9 = Exalted)', () => {
      faction.modifyReputation('p1', 'ascendant_order', 899);
      expect(faction.canAccessEquipment('p1', 'ascendant_core').allowed).toBe(false);

      faction.modifyReputation('p1', 'ascendant_order', 2);
      expect(faction.canAccessEquipment('p1', 'ascendant_core').allowed).toBe(true);
    });
  });

  // ── Lifecycle Methods ──────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('init sets up internal state', async () => {
      const sys = new FactionSystem();
      await sys.init(stubEngine);
      expect(sys._engine).toBe(stubEngine);
      expect(sys._reputation).toBeInstanceOf(Map);
      expect(sys._diplomacy).toBeInstanceOf(Map);
    });

    it('tick does not throw', () => {
      expect(() => faction.tick(16)).not.toThrow();
    });

    it('destroy clears state', async () => {
      faction.modifyReputation('p1', 'syndicate', 100);
      faction.setDiplomacy('terran_dominion', 'syndicate', DIPLOMACY.WAR);
      await faction.destroy();
      expect(faction._reputation.size).toBe(0);
      expect(faction._diplomacy.size).toBe(0);
    });
  });
});
