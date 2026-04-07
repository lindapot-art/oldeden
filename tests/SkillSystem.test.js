/**
 * Tests for SkillSystem — XP progression, levels, decay, synergies, and gated actions.
 */
import { jest } from '@jest/globals';
import {
  SkillSystem,
  SKILLS,
  SKILL_CATEGORY,
} from '../src/systems/SkillSystem.js';

describe('SkillSystem', () => {
  let skill;
  let stubEngine;

  beforeEach(() => {
    skill = new SkillSystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };
    skill._engine = stubEngine;
    skill._players = new Map();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. XP Progression ─────────────────────────────────────────────────────

  describe('xpForLevel()', () => {
    it('level 1 requires BASE_XP × 1^1.5 = 100 XP', () => {
      expect(skill.xpForLevel(1)).toBe(100);
    });

    it('returns increasing totals for higher levels', () => {
      const l5  = skill.xpForLevel(5);
      const l10 = skill.xpForLevel(10);
      const l50 = skill.xpForLevel(50);
      expect(l10).toBeGreaterThan(l5);
      expect(l50).toBeGreaterThan(l10);
    });

    it('follows the exponential curve Σ(BASE_XP × n^1.5)', () => {
      let expected = 0;
      for (let n = 1; n <= 10; n++) expected += 100 * Math.pow(n, 1.5);
      expect(skill.xpForLevel(10)).toBe(Math.floor(expected));
    });

    it('clamps below 1 to level 1', () => {
      expect(skill.xpForLevel(0)).toBe(skill.xpForLevel(1));
      expect(skill.xpForLevel(-5)).toBe(skill.xpForLevel(1));
    });

    it('clamps above 100 to level 100', () => {
      expect(skill.xpForLevel(150)).toBe(skill.xpForLevel(100));
    });
  });

  describe('levelFromXp()', () => {
    it('returns 1 for 0 XP', () => {
      expect(skill.levelFromXp(0)).toBe(1);
    });

    it('returns 1 for negative XP', () => {
      expect(skill.levelFromXp(-500)).toBe(1);
    });

    it('returns the correct level for exact XP boundaries', () => {
      const xpForLvl5 = skill.xpForLevel(5);
      expect(skill.levelFromXp(xpForLvl5)).toBe(5);
    });

    it('returns the previous level for XP just under a boundary', () => {
      const xpForLvl5 = skill.xpForLevel(5);
      expect(skill.levelFromXp(xpForLvl5 - 1)).toBe(4);
    });

    it('caps at level 100 for massive XP', () => {
      expect(skill.levelFromXp(999_999_999)).toBe(100);
    });
  });

  describe('addXp()', () => {
    it('increases accumulated XP on the skill', () => {
      skill.addXp('p1', 'melee', 500);
      const state = skill.getSkillState('p1', 'melee');
      expect(state.xp).toBe(500);
    });

    it('emits skill:xp_gained event', () => {
      skill.addXp('p1', 'tactics', 200);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'skill:xp_gained',
        expect.objectContaining({ playerId: 'p1', skillId: 'tactics', amount: 200 }),
      );
    });

    it('emits skill:level_up when crossing a level boundary', () => {
      const xpForLvl2 = skill.xpForLevel(2);
      skill.addXp('p1', 'melee', xpForLvl2 + 1);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'skill:level_up',
        expect.objectContaining({ playerId: 'p1', skillId: 'melee', newLevel: 2 }),
      );
    });

    it('does not emit level_up when staying on the same level', () => {
      skill.addXp('p1', 'melee', 1);
      const levelUpCalls = stubEngine.events.emit.mock.calls.filter(
        ([evt]) => evt === 'skill:level_up',
      );
      expect(levelUpCalls).toHaveLength(0);
    });

    it('caps XP at max-level ceiling', () => {
      const maxXp = skill.xpForLevel(100);
      skill.addXp('p1', 'melee', maxXp + 99999);
      expect(skill.getSkillState('p1', 'melee').xp).toBe(maxXp);
    });

    it('throws for non-positive amount', () => {
      expect(() => skill.addXp('p1', 'melee', 0)).toThrow();
      expect(() => skill.addXp('p1', 'melee', -10)).toThrow();
    });

    it('throws for unknown skill', () => {
      expect(() => skill.addXp('p1', 'hacking', 100)).toThrow();
    });

    it('updates lastUsedAt timestamp', () => {
      const before = Date.now();
      skill.addXp('p1', 'melee', 100);
      const state = skill.getSkillState('p1', 'melee');
      expect(state.lastUsedAt).toBeGreaterThanOrEqual(before);
    });
  });

  // ── 2. Skill Level Queries ────────────────────────────────────────────────

  describe('getLevel()', () => {
    it('returns 1 for untrained skill', () => {
      expect(skill.getLevel('p1', 'marksmanship')).toBe(1);
    });

    it('reflects XP added', () => {
      const xp10 = skill.xpForLevel(10);
      skill.addXp('p1', 'navigation', xp10);
      expect(skill.getLevel('p1', 'navigation')).toBe(10);
    });

    it('throws for unknown skill', () => {
      expect(() => skill.getLevel('p1', 'telekinesis')).toThrow();
    });
  });

  describe('getAllLevels()', () => {
    it('returns an entry for every skill', () => {
      const levels = skill.getAllLevels('p1');
      expect(Object.keys(levels)).toHaveLength(20);
      for (const skillId of Object.keys(SKILLS)) {
        expect(levels).toHaveProperty(skillId);
      }
    });

    it('all default to level 1', () => {
      const levels = skill.getAllLevels('p1');
      for (const lvl of Object.values(levels)) {
        expect(lvl).toBe(1);
      }
    });
  });

  describe('getSkillState()', () => {
    it('returns a copy (mutations do not affect internal state)', () => {
      skill.addXp('p1', 'mining', 500);
      const state = skill.getSkillState('p1', 'mining');
      state.xp = 0;
      expect(skill.getSkillState('p1', 'mining').xp).toBe(500);
    });
  });

  // ── 3. Skill Decay ────────────────────────────────────────────────────────

  describe('skill decay', () => {
    it('does not decay skills used within the 30-day window', () => {
      skill.addXp('p1', 'repair', 5000);
      const before = skill.getSkillState('p1', 'repair').xp;
      // lastUsedAt is now, so no decay
      skill.tick(60_000);
      expect(skill.getSkillState('p1', 'repair').xp).toBe(before);
    });

    it('decays skills inactive beyond the 30-day window', () => {
      skill.addXp('p1', 'repair', 5000);
      const before = skill.getSkillState('p1', 'repair').xp;
      // Push lastUsedAt into the past (31 days ago)
      const internal = skill._getSkillState('p1', 'repair');
      internal.lastUsedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      skill.tick(7 * 24 * 60 * 60 * 1000); // 1 week tick
      const after = skill.getSkillState('p1', 'repair').xp;
      expect(after).toBeLessThan(before);
    });

    it('loses approximately 1% per week of inactivity', () => {
      skill.addXp('p1', 'biology', 10_000);
      const internal = skill._getSkillState('p1', 'biology');
      internal.lastUsedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const before = internal.xp;

      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      skill.tick(oneWeekMs);

      const after = skill.getSkillState('p1', 'biology').xp;
      const lossRatio = (before - after) / before;
      expect(lossRatio).toBeCloseTo(0.01, 2);
    });

    it('applies XP loss when decay is active (no skill:decay event — throttled in audit 61)', () => {
      skill.addXp('p1', 'physics', 5000);
      const before = skill.getSkillState('p1', 'physics').xp;

      const internal = skill._getSkillState('p1', 'physics');
      internal.lastUsedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;

      skill.tick(7 * 24 * 60 * 60 * 1000);
      const after = skill.getSkillState('p1', 'physics').xp;
      // XP should have decreased due to decay
      expect(after).toBeLessThan(before);
    });

    it('emits skill:level_down when decay crosses a level boundary', () => {
      // Give just enough XP for level 2
      const xpForLvl2 = skill.xpForLevel(2);
      skill.addXp('p1', 'chemistry', xpForLvl2 + 1);
      stubEngine.events.emit.mockClear();

      const internal = skill._getSkillState('p1', 'chemistry');
      internal.lastUsedAt = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago

      // Tick long enough to lose enough XP to drop below level 2
      const bigTick = 30 * 7 * 24 * 60 * 60 * 1000; // 30 weeks
      skill.tick(bigTick);

      const levelDownCalls = stubEngine.events.emit.mock.calls.filter(
        ([evt]) => evt === 'skill:level_down',
      );
      expect(levelDownCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('XP never drops below zero', () => {
      skill.addXp('p1', 'xenology', 100);
      const internal = skill._getSkillState('p1', 'xenology');
      internal.lastUsedAt = Date.now() - 365 * 24 * 60 * 60 * 1000; // 1 year ago

      skill.tick(365 * 24 * 60 * 60 * 1000); // 1 year tick
      expect(skill.getSkillState('p1', 'xenology').xp).toBeGreaterThanOrEqual(0);
    });

    it('does not decay a skill with 0 XP', () => {
      // Access state to register the skill, but don't add XP
      skill._getSkillState('p1', 'melee');
      const internal = skill._getSkillState('p1', 'melee');
      internal.lastUsedAt = Date.now() - 60 * 24 * 60 * 60 * 1000;
      stubEngine.events.emit.mockClear();

      skill.tick(7 * 24 * 60 * 60 * 1000);
      const decayCalls = stubEngine.events.emit.mock.calls.filter(
        ([evt]) => evt === 'skill:decay',
      );
      expect(decayCalls).toHaveLength(0);
    });
  });

  // ── 4. Synergy Bonuses ────────────────────────────────────────────────────

  describe('getSynergyBonus()', () => {
    it('returns 1.0 when no related skills are above threshold', () => {
      expect(skill.getSynergyBonus('p1', 'marksmanship')).toBe(1.0);
    });

    it('grants +2% per related skill above level 25', () => {
      // Level up melee, tactics, evasion to > 25
      const xp26 = skill.xpForLevel(26);
      skill.addXp('p1', 'melee', xp26);
      skill.addXp('p1', 'tactics', xp26);
      skill.addXp('p1', 'evasion', xp26);

      const bonus = skill.getSynergyBonus('p1', 'marksmanship');
      // 3 peers above 25 → 1.0 + 3 × 0.02 = 1.06
      expect(bonus).toBeCloseTo(1.06);
    });

    it('does not count the skill itself as a peer', () => {
      const xp30 = skill.xpForLevel(30);
      skill.addXp('p1', 'marksmanship', xp30);
      // Only marksmanship is leveled; no peers above threshold
      expect(skill.getSynergyBonus('p1', 'marksmanship')).toBe(1.0);
    });

    it('does not count skills from other categories', () => {
      const xp30 = skill.xpForLevel(30);
      skill.addXp('p1', 'navigation', xp30); // Piloting, not Combat
      expect(skill.getSynergyBonus('p1', 'marksmanship')).toBe(1.0);
    });

    it('peer at exactly level 25 does not contribute', () => {
      const xp25 = skill.xpForLevel(25);
      skill.addXp('p1', 'melee', xp25);
      expect(skill.getLevel('p1', 'melee')).toBe(25);
      expect(skill.getSynergyBonus('p1', 'marksmanship')).toBe(1.0);
    });

    it('throws for unknown skill', () => {
      expect(() => skill.getSynergyBonus('p1', 'alchemy')).toThrow();
    });
  });

  describe('getEffectiveLevel()', () => {
    it('equals base level when no synergy applies', () => {
      const xp10 = skill.xpForLevel(10);
      skill.addXp('p1', 'diplomacy', xp10);
      expect(skill.getEffectiveLevel('p1', 'diplomacy')).toBe(10);
    });

    it('is higher than base level when synergy applies', () => {
      const xp30 = skill.xpForLevel(30);
      skill.addXp('p1', 'diplomacy', xp30);
      skill.addXp('p1', 'trading', xp30);
      skill.addXp('p1', 'leadership', xp30);
      skill.addXp('p1', 'deception', xp30);

      const base = skill.getLevel('p1', 'diplomacy');
      const effective = skill.getEffectiveLevel('p1', 'diplomacy');
      expect(effective).toBeGreaterThan(base);
    });

    it('caps effective level at 100', () => {
      const maxXp = skill.xpForLevel(100);
      skill.addXp('p1', 'diplomacy', maxXp);
      skill.addXp('p1', 'trading', maxXp);
      skill.addXp('p1', 'leadership', maxXp);
      skill.addXp('p1', 'deception', maxXp);

      expect(skill.getEffectiveLevel('p1', 'diplomacy')).toBeLessThanOrEqual(100);
    });
  });

  // ── 5. Skill-Gated Actions ────────────────────────────────────────────────

  describe('defineGate()', () => {
    it('returns a gate object with action name and requirements', () => {
      const gate = skill.defineGate('Warp Jump', { navigation: 10, ftlOps: 15 });
      expect(gate.actionName).toBe('Warp Jump');
      expect(gate.requirements).toEqual({ navigation: 10, ftlOps: 15 });
    });

    it('throws if a required skill is unknown', () => {
      expect(() => skill.defineGate('Hack', { hacking: 5 })).toThrow();
    });
  });

  describe('checkGate()', () => {
    it('returns allowed: true when player meets all requirements', () => {
      const xp15 = skill.xpForLevel(15);
      skill.addXp('p1', 'navigation', xp15);
      skill.addXp('p1', 'ftlOps', xp15);

      const gate = skill.defineGate('Warp Jump', { navigation: 10, ftlOps: 10 });
      const result = skill.checkGate('p1', gate);
      expect(result.allowed).toBe(true);
      expect(result.failing).toHaveLength(0);
    });

    it('returns allowed: false with failing details when requirements unmet', () => {
      const gate = skill.defineGate('Warp Jump', { navigation: 50, ftlOps: 30 });
      const result = skill.checkGate('p1', gate);
      expect(result.allowed).toBe(false);
      expect(result.failing).toHaveLength(2);

      const navFail = result.failing.find(f => f.skillId === 'navigation');
      expect(navFail).toBeDefined();
      expect(navFail.required).toBe(50);
      expect(navFail.actual).toBe(1); // untrained → level 1
    });

    it('emits skill:gate_passed when all requirements are met', () => {
      const xp20 = skill.xpForLevel(20);
      skill.addXp('p1', 'trading', xp20);
      stubEngine.events.emit.mockClear();

      const gate = skill.defineGate('Trade Route', { trading: 10 });
      skill.checkGate('p1', gate);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'skill:gate_passed',
        expect.objectContaining({ playerId: 'p1', actionName: 'Trade Route' }),
      );
    });

    it('does not emit skill:gate_passed when requirements are not met', () => {
      const gate = skill.defineGate('Trade Route', { trading: 99 });
      stubEngine.events.emit.mockClear();
      skill.checkGate('p1', gate);
      const passCalls = stubEngine.events.emit.mock.calls.filter(
        ([evt]) => evt === 'skill:gate_passed',
      );
      expect(passCalls).toHaveLength(0);
    });

    it('uses effective level (with synergy) for gate checks', () => {
      // Base level 30, plus synergy from 3 peers → effective > 30
      const xp30 = skill.xpForLevel(30);
      skill.addXp('p1', 'marksmanship', xp30);
      skill.addXp('p1', 'melee', xp30);
      skill.addXp('p1', 'tactics', xp30);
      skill.addXp('p1', 'evasion', xp30);

      // Require level 31 — would fail without synergy but passes with it
      const gate = skill.defineGate('Ambush', { marksmanship: 31 });
      const result = skill.checkGate('p1', gate);
      expect(result.allowed).toBe(true);
    });
  });

  // ── SKILLS constant ────────────────────────────────────────────────────────

  describe('SKILLS constant', () => {
    it('defines exactly 20 skills', () => {
      expect(Object.keys(SKILLS)).toHaveLength(20);
    });

    it('covers all 5 categories with 4 skills each', () => {
      const counts = {};
      for (const s of Object.values(SKILLS)) {
        counts[s.category] = (counts[s.category] ?? 0) + 1;
      }
      for (const cat of Object.values(SKILL_CATEGORY)) {
        expect(counts[cat]).toBe(4);
      }
    });
  });

  // ── destroy() ──────────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('clears all internal state', async () => {
      skill.addXp('p1', 'melee', 500);
      skill.addXp('p2', 'trading', 300);

      await skill.destroy();

      expect(skill._players.size).toBe(0);
    });
  });
});
