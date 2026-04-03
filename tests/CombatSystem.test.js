/**
 * Tests for CombatSystem — damage, hit resolution, crits, DoTs, shields, and logging.
 */
import { jest } from '@jest/globals';
import {
  CombatSystem,
  WEAPON_TYPE,
  ARMOR_TYPE,
  DOT_TYPE,
  TYPE_EFFECTIVENESS,
} from '../src/systems/CombatSystem.js';

describe('CombatSystem', () => {
  let combat;
  let stubEngine;

  beforeEach(() => {
    combat = new CombatSystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };
    combat._engine = stubEngine;
    combat._shields = new Map();
    combat._dots = new Map();
    combat._combatLog = [];
    combat._maxLogSize = 200;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Damage Calculation ──────────────────────────────────────────────────

  describe('calculateDamage()', () => {
    it('returns base damage against NONE armor with neutral weapon', () => {
      const dmg = combat.calculateDamage(100, WEAPON_TYPE.LASER, ARMOR_TYPE.NONE);
      expect(dmg).toBe(100);
    });

    it('applies type effectiveness multiplier', () => {
      // Laser is super-effective vs shield (1.5×)
      const dmg = combat.calculateDamage(100, WEAPON_TYPE.LASER, ARMOR_TYPE.SHIELD);
      expect(dmg).toBe(150);
    });

    it('applies flat armor reduction', () => {
      // Laser vs heavy: 100 × 0.6 − 15 = 45
      const dmg = combat.calculateDamage(100, WEAPON_TYPE.LASER, ARMOR_TYPE.HEAVY);
      expect(dmg).toBe(45);
    });

    it('applies critical multiplier when isCritical is true', () => {
      const normal = combat.calculateDamage(100, WEAPON_TYPE.LASER, ARMOR_TYPE.NONE, false);
      const crit   = combat.calculateDamage(100, WEAPON_TYPE.LASER, ARMOR_TYPE.NONE, true);
      expect(crit).toBe(normal * 2);
    });

    it('never returns less than 1 damage', () => {
      // tiny base damage vs heavy armor
      const dmg = combat.calculateDamage(1, WEAPON_TYPE.LASER, ARMOR_TYPE.HEAVY);
      expect(dmg).toBe(1);
    });

    it('all weapon × armor combos produce valid damage', () => {
      for (const wt of Object.values(WEAPON_TYPE)) {
        for (const at of Object.values(ARMOR_TYPE)) {
          const dmg = combat.calculateDamage(50, wt, at);
          expect(dmg).toBeGreaterThanOrEqual(1);
          expect(Number.isFinite(dmg)).toBe(true);
        }
      }
    });

    it('respects the full effectiveness matrix values', () => {
      for (const [wt, row] of Object.entries(TYPE_EFFECTIVENESS)) {
        for (const [at, mult] of Object.entries(row)) {
          const base = 200;
          const expected = Math.max(1, Math.round(base * mult - (
            at === 'light' ? 3 : at === 'medium' ? 8 : at === 'heavy' ? 15 : 0
          )));
          expect(combat.calculateDamage(base, wt, at)).toBe(expected);
        }
      }
    });
  });

  // ── 2. Hit / Miss Resolution ───────────────────────────────────────────────

  describe('rollHit()', () => {
    it('returns hit, roll, and hitChance fields', () => {
      const result = combat.rollHit(75, 25);
      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('hitChance');
    });

    it('guaranteed hit when accuracy far exceeds evasion (roll = 0)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { hit } = combat.rollHit(100, 0);
      expect(hit).toBe(true);
    });

    it('miss when roll exceeds hitChance', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const { hit } = combat.rollHit(10, 90);
      expect(hit).toBe(false);
    });

    it('hitChance is clamped to [5, 95]', () => {
      const low  = combat.rollHit(0, 200);
      const high = combat.rollHit(200, 0);
      expect(low.hitChance).toBe(5);
      expect(high.hitChance).toBe(95);
    });

    it('equal accuracy and evasion gives 50% hitChance', () => {
      const { hitChance } = combat.rollHit(50, 50);
      expect(hitChance).toBe(50);
    });
  });

  // ── 3. Critical Hit System ─────────────────────────────────────────────────

  describe('rollCritical()', () => {
    it('returns critical and critChance fields', () => {
      const result = combat.rollCritical(WEAPON_TYPE.LASER);
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('critChance');
    });

    it('base laser crit chance is 5%', () => {
      const { critChance } = combat.rollCritical(WEAPON_TYPE.LASER);
      expect(critChance).toBeCloseTo(0.05);
    });

    it('melee has highest base crit chance (10%)', () => {
      const { critChance } = combat.rollCritical(WEAPON_TYPE.MELEE);
      expect(critChance).toBeCloseTo(0.10);
    });

    it('always crits when roll is below critChance', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { critical } = combat.rollCritical(WEAPON_TYPE.LASER);
      expect(critical).toBe(true);
    });

    it('never crits when roll exceeds critChance', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const { critical } = combat.rollCritical(WEAPON_TYPE.LASER);
      expect(critical).toBe(false);
    });

    it('bonusCritChance increases effective crit rate', () => {
      const { critChance } = combat.rollCritical(WEAPON_TYPE.LASER, 0.20);
      expect(critChance).toBeCloseTo(0.25);
    });

    it('critChance is capped at 75%', () => {
      const { critChance } = combat.rollCritical(WEAPON_TYPE.LASER, 0.90);
      expect(critChance).toBe(0.75);
    });

    it('getCritMultiplier() returns 2.0', () => {
      expect(combat.getCritMultiplier()).toBe(2.0);
    });
  });

  // ── 4. Full Attack Resolution (resolveAttack) ─────────────────────────────

  describe('resolveAttack()', () => {
    const baseParams = {
      attackerId: 'a1',
      defenderId: 'd1',
      baseDamage: 100,
      weaponType: WEAPON_TYPE.BALLISTIC,
      armorType: ARMOR_TYPE.LIGHT,
      accuracy: 80,
      evasion: 20,
    };

    it('returns all expected fields on a hit', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const result = combat.resolveAttack(baseParams);
      expect(result).toHaveProperty('attackerId', 'a1');
      expect(result).toHaveProperty('defenderId', 'd1');
      expect(result).toHaveProperty('hit', true);
      expect(result).toHaveProperty('damage');
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('shieldAbsorbed');
    });

    it('emits combat:miss on a miss', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const result = combat.resolveAttack({
        ...baseParams,
        accuracy: 0,
        evasion: 100,
      });
      expect(result.hit).toBe(false);
      expect(result.damage).toBe(0);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:miss',
        expect.objectContaining({ hit: false }),
      );
    });

    it('emits combat:hit on a hit', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      combat.resolveAttack(baseParams);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:hit',
        expect.objectContaining({ hit: true }),
      );
    });

    it('damage accounts for shield absorption', () => {
      combat.registerShield('d1', { maxCapacity: 50, regenRate: 0, rechargeDelayMs: 5000 });
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const result = combat.resolveAttack(baseParams);
      // Ballistic vs Light: 100 × 1.3 − 3 = 127, crit (roll=0) → 127
      // but crit roll also uses random=0 → crit, so 127×2=254? No—
      // calculateDamage(100, ballistic, light, true) = (100*1.3 - 3)*2 = 254
      const fullDamage = combat.calculateDamage(100, WEAPON_TYPE.BALLISTIC, ARMOR_TYPE.LIGHT, true);
      expect(result.shieldAbsorbed).toBe(50);
      expect(result.damage).toBe(fullDamage - 50);
    });

    it('melee bypasses shields', () => {
      combat.registerShield('d1', { maxCapacity: 999, regenRate: 0 });
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const result = combat.resolveAttack({
        ...baseParams,
        weaponType: WEAPON_TYPE.MELEE,
        armorType: ARMOR_TYPE.NONE,
      });
      expect(result.shieldAbsorbed).toBe(0);
      expect(result.damage).toBeGreaterThan(0);
    });
  });

  // ── 5. Damage-over-Time Effects ────────────────────────────────────────────

  describe('applyDot()', () => {
    it('creates a DoT effect on the entity', () => {
      const effect = combat.applyDot('e1', DOT_TYPE.FIRE);
      expect(effect.dotType).toBe(DOT_TYPE.FIRE);
      expect(effect.entityId).toBe('e1');
      expect(effect.tickDamage).toBe(6);
      expect(effect.durationMs).toBe(5000);
    });

    it('emits combat:dot_applied', () => {
      combat.applyDot('e1', DOT_TYPE.TOXIN);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:dot_applied',
        expect.objectContaining({ entityId: 'e1', dotType: DOT_TYPE.TOXIN }),
      );
    });

    it('allows custom overrides', () => {
      const effect = combat.applyDot('e1', DOT_TYPE.BLEED, {
        tickDamage: 20,
        durationMs: 3000,
        sourceId: 'attacker-7',
      });
      expect(effect.tickDamage).toBe(20);
      expect(effect.durationMs).toBe(3000);
      expect(effect.sourceId).toBe('attacker-7');
    });

    it('throws for unknown DoT type', () => {
      expect(() => combat.applyDot('e1', 'unknown')).toThrow();
    });

    it('stacks multiple DoTs on the same entity', () => {
      combat.applyDot('e1', DOT_TYPE.FIRE);
      combat.applyDot('e1', DOT_TYPE.BLEED);
      combat.applyDot('e1', DOT_TYPE.FIRE);
      expect(combat.getActiveDots('e1')).toHaveLength(3);
    });
  });

  describe('getActiveDots()', () => {
    it('returns empty array for entity with no DoTs', () => {
      expect(combat.getActiveDots('nobody')).toEqual([]);
    });
  });

  describe('cleanseDots()', () => {
    it('removes all DoTs and returns count', () => {
      combat.applyDot('e1', DOT_TYPE.FIRE);
      combat.applyDot('e1', DOT_TYPE.TOXIN);
      const removed = combat.cleanseDots('e1');
      expect(removed).toBe(2);
      expect(combat.getActiveDots('e1')).toEqual([]);
    });

    it('returns 0 for entity with no DoTs', () => {
      expect(combat.cleanseDots('nobody')).toBe(0);
    });

    it('emits combat:dots_cleansed', () => {
      combat.applyDot('e1', DOT_TYPE.BLEED);
      combat.cleanseDots('e1');
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:dots_cleansed',
        expect.objectContaining({ entityId: 'e1', count: 1 }),
      );
    });
  });

  describe('DoT tick processing', () => {
    it('emits combat:dot_tick after tickInterval elapses', () => {
      combat.applyDot('e1', DOT_TYPE.FIRE); // tickInterval = 1000ms
      combat.tick(1000);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:dot_tick',
        expect.objectContaining({ entityId: 'e1', dotType: DOT_TYPE.FIRE, damage: 6 }),
      );
    });

    it('does not tick before interval elapses', () => {
      combat.applyDot('e1', DOT_TYPE.FIRE);
      stubEngine.events.emit.mockClear();
      combat.tick(500);
      const tickCalls = stubEngine.events.emit.mock.calls.filter(
        ([evt]) => evt === 'combat:dot_tick',
      );
      expect(tickCalls).toHaveLength(0);
    });

    it('expires DoT after full duration and emits combat:dot_expired', () => {
      combat.applyDot('e1', DOT_TYPE.FIRE); // duration = 5000ms
      combat.tick(5000);
      expect(combat.getActiveDots('e1')).toHaveLength(0);
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:dot_expired',
        expect.objectContaining({ entityId: 'e1', dotType: DOT_TYPE.FIRE }),
      );
    });

    it('produces correct number of ticks over full duration', () => {
      combat.applyDot('e1', DOT_TYPE.TOXIN); // tickInterval=2000, duration=10000 → 5 ticks
      for (let t = 0; t < 10; t++) {
        combat.tick(1000);
      }
      const tickCalls = stubEngine.events.emit.mock.calls.filter(
        ([evt]) => evt === 'combat:dot_tick',
      );
      expect(tickCalls).toHaveLength(5);
    });
  });

  // ── 6. Shield System ──────────────────────────────────────────────────────

  describe('registerShield()', () => {
    it('creates a shield at full capacity', () => {
      const shield = combat.registerShield('e1', {
        maxCapacity: 200,
        regenRate: 10,
        rechargeDelayMs: 2000,
      });
      expect(shield.currentHp).toBe(200);
      expect(shield.maxCapacity).toBe(200);
      expect(shield.regenRate).toBe(10);
      expect(shield.rechargeDelayMs).toBe(2000);
    });

    it('uses default recharge delay when not specified', () => {
      const shield = combat.registerShield('e1', { maxCapacity: 100, regenRate: 5 });
      expect(shield.rechargeDelayMs).toBe(3000);
    });
  });

  describe('getShield()', () => {
    it('returns undefined for unregistered entity', () => {
      expect(combat.getShield('nobody')).toBeUndefined();
    });

    it('returns the registered shield', () => {
      combat.registerShield('e1', { maxCapacity: 100, regenRate: 5 });
      expect(combat.getShield('e1')).toBeDefined();
      expect(combat.getShield('e1').maxCapacity).toBe(100);
    });
  });

  describe('removeShield()', () => {
    it('removes the shield', () => {
      combat.registerShield('e1', { maxCapacity: 100, regenRate: 5 });
      combat.removeShield('e1');
      expect(combat.getShield('e1')).toBeUndefined();
    });
  });

  describe('shield absorption', () => {
    it('absorbs damage up to current HP', () => {
      combat.registerShield('d1', { maxCapacity: 60, regenRate: 0 });
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const result = combat.resolveAttack({
        attackerId: 'a1',
        defenderId: 'd1',
        baseDamage: 100,
        weaponType: WEAPON_TYPE.LASER,
        armorType: ARMOR_TYPE.NONE,
        accuracy: 100,
        evasion: 0,
      });
      expect(result.shieldAbsorbed).toBe(60);
      expect(combat.getShield('d1').currentHp).toBe(0);
    });

    it('emits combat:shield_broken when shield reaches 0', () => {
      combat.registerShield('d1', { maxCapacity: 10, regenRate: 0 });
      jest.spyOn(Math, 'random').mockReturnValue(0);
      combat.resolveAttack({
        attackerId: 'a1',
        defenderId: 'd1',
        baseDamage: 100,
        weaponType: WEAPON_TYPE.LASER,
        armorType: ARMOR_TYPE.NONE,
        accuracy: 100,
        evasion: 0,
      });
      expect(stubEngine.events.emit).toHaveBeenCalledWith(
        'combat:shield_broken',
        expect.objectContaining({ entityId: 'd1' }),
      );
    });
  });

  describe('shield regeneration (tick)', () => {
    it('does not regenerate during recharge delay', () => {
      combat.registerShield('e1', {
        maxCapacity: 100,
        regenRate: 50,
        rechargeDelayMs: 3000,
      });
      // Simulate damage
      const shield = combat.getShield('e1');
      shield.currentHp = 50;
      shield.timeSinceDamageMs = 0;

      combat.tick(2000); // still within 3000ms delay
      expect(shield.currentHp).toBe(50);
    });

    it('regenerates after recharge delay expires', () => {
      combat.registerShield('e1', {
        maxCapacity: 100,
        regenRate: 50,
        rechargeDelayMs: 3000,
      });
      const shield = combat.getShield('e1');
      shield.currentHp = 50;
      shield.timeSinceDamageMs = 0;

      combat.tick(3000); // exactly at delay boundary — timeSinceDamage becomes 3000
      // regenRate = 50/s, deltaMs = 3000 → +150 but capped at max
      expect(shield.currentHp).toBeGreaterThan(50);
    });

    it('does not exceed maxCapacity', () => {
      combat.registerShield('e1', {
        maxCapacity: 100,
        regenRate: 1000,
        rechargeDelayMs: 0,
      });
      const shield = combat.getShield('e1');
      shield.currentHp = 99;
      shield.timeSinceDamageMs = Infinity;

      combat.tick(5000);
      expect(shield.currentHp).toBe(100);
    });
  });

  // ── 7. Combat Log ──────────────────────────────────────────────────────────

  describe('combat log', () => {
    it('records events from resolveAttack', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      combat.resolveAttack({
        attackerId: 'a1',
        defenderId: 'd1',
        baseDamage: 50,
        weaponType: WEAPON_TYPE.LASER,
        armorType: ARMOR_TYPE.NONE,
        accuracy: 100,
        evasion: 0,
      });
      const log = combat.getCombatLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0]).toHaveProperty('type');
      expect(log[0]).toHaveProperty('timestamp');
      expect(log[0]).toHaveProperty('data');
    });

    it('getCombatLog(n) returns only the last N entries', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      for (let i = 0; i < 10; i++) {
        combat.resolveAttack({
          attackerId: `a${i}`,
          defenderId: 'd1',
          baseDamage: 50,
          weaponType: WEAPON_TYPE.LASER,
          armorType: ARMOR_TYPE.NONE,
          accuracy: 100,
          evasion: 0,
        });
      }
      const last3 = combat.getCombatLog(3);
      expect(last3).toHaveLength(3);
    });

    it('clearCombatLog() empties the log', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      combat.resolveAttack({
        attackerId: 'a1',
        defenderId: 'd1',
        baseDamage: 50,
        weaponType: WEAPON_TYPE.LASER,
        armorType: ARMOR_TYPE.NONE,
        accuracy: 100,
        evasion: 0,
      });
      combat.clearCombatLog();
      expect(combat.getCombatLog()).toHaveLength(0);
    });

    it('evicts oldest entries when exceeding max size', () => {
      combat._maxLogSize = 5;
      jest.spyOn(Math, 'random').mockReturnValue(0);
      for (let i = 0; i < 10; i++) {
        combat.resolveAttack({
          attackerId: `a${i}`,
          defenderId: 'd1',
          baseDamage: 50,
          weaponType: WEAPON_TYPE.LASER,
          armorType: ARMOR_TYPE.NONE,
          accuracy: 100,
          evasion: 0,
        });
      }
      expect(combat.getCombatLog().length).toBeLessThanOrEqual(5);
    });

    it('DoT applications are logged', () => {
      combat.applyDot('e1', DOT_TYPE.FIRE);
      const log = combat.getCombatLog();
      const dotEntry = log.find(e => e.type === 'dot_applied');
      expect(dotEntry).toBeDefined();
    });
  });

  // ── 8. destroy() ──────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('clears all internal state', async () => {
      combat.registerShield('e1', { maxCapacity: 100, regenRate: 5 });
      combat.applyDot('e1', DOT_TYPE.FIRE);
      jest.spyOn(Math, 'random').mockReturnValue(0);
      combat.resolveAttack({
        attackerId: 'a1',
        defenderId: 'd1',
        baseDamage: 50,
        weaponType: WEAPON_TYPE.LASER,
        armorType: ARMOR_TYPE.NONE,
        accuracy: 100,
        evasion: 0,
      });

      await combat.destroy();

      expect(combat._shields.size).toBe(0);
      expect(combat._dots.size).toBe(0);
      expect(combat._combatLog).toHaveLength(0);
    });
  });
});
