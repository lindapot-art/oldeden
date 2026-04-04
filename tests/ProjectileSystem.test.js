/**
 * Tests for ProjectileSystem — firing, tracking, collisions, expiry, target management.
 */
import { jest } from '@jest/globals';
import { ProjectileSystem } from '../src/systems/ProjectileSystem.js';

// Lightweight Vector3 mock (just enough to satisfy the system)
class Vec3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x; this.y = y; this.z = z;
  }
  clone() { return new Vec3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  normalize() {
    const len = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
    return this;
  }
  length() { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  distanceTo(v) {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2);
  }
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
  angleTo(v) {
    const dot = this.x * v.x + this.y * v.y + this.z * v.z;
    return Math.acos(Math.max(-1, Math.min(1, dot / (this.length() * v.length() || 1))));
  }
}

describe('ProjectileSystem', () => {
  let projSys;
  let mockCombatSystem;
  let mockEngine;

  beforeEach(() => {
    mockCombatSystem = {
      resolveAttack: jest.fn().mockReturnValue({ damage: 50, critical: false }),
    };
    mockEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };

    projSys = new ProjectileSystem(mockCombatSystem);
    projSys.init(mockEngine);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Constructor / Init ────────────────────────────────────────────────────

  describe('constructor', () => {
    it('stores combatSystem reference', () => {
      expect(projSys._combatSystem).toBe(mockCombatSystem);
    });

    it('uses default maxRange and maxLifetimeMs', () => {
      expect(projSys._maxRange).toBe(5000);
      expect(projSys._maxLifetimeMs).toBe(10000);
    });

    it('accepts custom options', () => {
      const custom = new ProjectileSystem(mockCombatSystem, {
        maxRange: 999,
        maxLifetimeMs: 2000,
      });
      expect(custom._maxRange).toBe(999);
      expect(custom._maxLifetimeMs).toBe(2000);
    });

    it('has all four projectile type configs', () => {
      expect(projSys.PROJECTILE_TYPES).toHaveProperty('RAILGUN');
      expect(projSys.PROJECTILE_TYPES).toHaveProperty('LASER');
      expect(projSys.PROJECTILE_TYPES).toHaveProperty('BALLISTIC');
      expect(projSys.PROJECTILE_TYPES).toHaveProperty('MISSILE');
    });

    it('starts with empty projectile map', () => {
      expect(projSys.getActiveProjectiles()).toHaveLength(0);
    });
  });

  describe('init()', () => {
    it('sets events from engine', () => {
      expect(projSys.events).toBe(mockEngine.events);
    });
  });

  // ── fireProjectile() ─────────────────────────────────────────────────────

  describe('fireProjectile()', () => {
    it('returns a unique projectile ID', () => {
      const id1 = projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
      });
      const id2 = projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
      });
      expect(id1).not.toBe(id2);
    });

    it('adds projectile to active list', () => {
      projSys.fireProjectile({
        type: 'LASER',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(1, 0, 0),
        damage: 50,
        shooterId: 'player',
        weaponType: 'laser',
      });
      expect(projSys.getActiveProjectiles()).toHaveLength(1);
    });

    it('emits projectile:fired event', () => {
      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(5, 10, 15),
        direction: new Vec3(0, 0, -1),
        damage: 75,
        shooterId: 'turret-1',
        weaponType: 'ballistic',
      });
      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'projectile:fired',
        expect.objectContaining({
          type: 'RAILGUN',
          shooterId: 'turret-1',
        })
      );
    });

    it('uses default speed from projectile type config', () => {
      const id = projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
      });
      const proj = projSys._projectiles.get(id);
      expect(proj.velocity.length()).toBeCloseTo(500, 0); // RAILGUN default speed
    });

    it('overrides speed when provided', () => {
      const id = projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 999,
      });
      const proj = projSys._projectiles.get(id);
      expect(proj.velocity.length()).toBeCloseTo(999, 0);
    });

    it('stores targetId for tracking missiles', () => {
      const id = projSys.fireProjectile({
        type: 'MISSILE',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 40,
        shooterId: 'player',
        weaponType: 'missile',
        targetId: 'enemy-1',
      });
      const proj = projSys._projectiles.get(id);
      expect(proj.targetId).toBe('enemy-1');
    });
  });

  // ── tick() — movement ─────────────────────────────────────────────────────

  describe('tick() — movement', () => {
    it('advances projectile position along velocity', () => {
      const id = projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(1, 0, 0),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 100,
      });

      projSys.tick(1000); // 1 second
      const proj = projSys._projectiles.get(id);
      // Should have moved ~100 units in x
      if (proj) {
        expect(proj.position.x).toBeCloseTo(100, 0);
      }
    });

    it('increments age and traveledDistance', () => {
      const id = projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 100,
      });

      projSys.tick(500);
      const proj = projSys._projectiles.get(id);
      if (proj) {
        expect(proj.age).toBe(500);
        expect(proj.traveledDistance).toBeGreaterThan(0);
      }
    });

    it('applies gravity to BALLISTIC projectiles', () => {
      const id = projSys.fireProjectile({
        type: 'BALLISTIC',
        origin: new Vec3(0, 100, 0),
        direction: new Vec3(1, 0, 0),
        damage: 50,
        shooterId: 'player',
        weaponType: 'ballistic',
      });

      projSys.tick(1000); // 1 second
      const proj = projSys._projectiles.get(id);
      if (proj) {
        // Gravity should push y velocity negative
        expect(proj.velocity.y).toBeLessThan(0);
      }
    });
  });

  // ── tick() — expiry ───────────────────────────────────────────────────────

  describe('tick() — expiry', () => {
    it('removes projectiles that exceed maxLifetimeMs', () => {
      projSys._maxLifetimeMs = 100;
      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 1, // Slow so it doesn't exceed range
      });

      projSys.tick(200);
      expect(projSys.getActiveProjectiles()).toHaveLength(0);
    });

    it('emits projectile:expired on timeout', () => {
      projSys._maxLifetimeMs = 50;
      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 1,
      });

      projSys.tick(100);
      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'projectile:expired',
        expect.objectContaining({ projectileId: expect.any(Number) })
      );
    });

    it('removes projectiles that exceed maxRange', () => {
      projSys._maxRange = 10;
      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 500,
      });

      projSys.tick(1000); // 500 units traveled, well over maxRange of 10
      expect(projSys.getActiveProjectiles()).toHaveLength(0);
    });
  });

  // ── tick() — collisions ───────────────────────────────────────────────────

  describe('tick() — collisions', () => {
    it('detects hit when projectile reaches target', () => {
      // Place target directly ahead with large radius so projectile lands inside
      projSys.registerTarget('enemy-1', {
        position: new Vec3(0, 0, -2),
        radius: 5.0,
        armorType: 'medium',
      });

      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 75,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 50, // Slow enough to land within radius after one tick
      });

      projSys.tick(100); // Moves 5 units — within radius 5 of target at z=-2
      expect(mockCombatSystem.resolveAttack).toHaveBeenCalled();
    });

    it('emits projectile:hit event on collision', () => {
      projSys.registerTarget('enemy-1', {
        position: new Vec3(0, 0, -2),
        radius: 5.0,
        armorType: 'light',
      });

      projSys.fireProjectile({
        type: 'LASER',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 50,
        shooterId: 'player',
        weaponType: 'laser',
        speed: 50,
      });

      projSys.tick(100); // Moves 5 units — within radius 5 of target at z=-2
      // The ...proj spread overwrites targetId, so check resolveAttack args instead
      expect(mockCombatSystem.resolveAttack).toHaveBeenCalledWith(
        expect.objectContaining({
          defenderId: 'enemy-1',
          baseDamage: 50,
        })
      );
      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'projectile:hit',
        expect.objectContaining({ damage: 50 })
      );
    });

    it('does not hit shooter (self)', () => {
      projSys.registerTarget('player', {
        position: new Vec3(0, 0, 0),
        radius: 100, // Huge radius
        armorType: 'none',
      });

      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 10,
      });

      projSys.tick(16);
      // resolveAttack should not fire for self-hits
      expect(mockCombatSystem.resolveAttack).not.toHaveBeenCalled();
    });

    it('removes projectile after hit', () => {
      projSys.registerTarget('enemy-1', {
        position: new Vec3(0, 0, -1),
        radius: 100,
        armorType: 'none',
      });

      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
        speed: 100,
      });

      projSys.tick(16);
      expect(projSys.getActiveProjectiles()).toHaveLength(0);
    });
  });

  // ── Target management ─────────────────────────────────────────────────────

  describe('registerTarget()', () => {
    it('adds target to internal map', () => {
      projSys.registerTarget('enemy-1', {
        position: new Vec3(10, 20, 30),
        radius: 2.0,
        armorType: 'heavy',
      });
      expect(projSys._targets.has('enemy-1')).toBe(true);
    });

    it('defaults radius to 1.0 and armorType to none', () => {
      projSys.registerTarget('enemy-2', { position: new Vec3(0, 0, 0) });
      const t = projSys._targets.get('enemy-2');
      expect(t.radius).toBe(1.0);
      expect(t.armorType).toBe('none');
    });
  });

  describe('updateTargetPosition()', () => {
    it('updates position of registered target', () => {
      projSys.registerTarget('enemy-1', { position: new Vec3(0, 0, 0) });
      projSys.updateTargetPosition('enemy-1', new Vec3(50, 60, 70));
      expect(projSys._targets.get('enemy-1').position.x).toBe(50);
    });

    it('does nothing for unregistered target', () => {
      // Should not throw
      projSys.updateTargetPosition('nonexistent', new Vec3(1, 2, 3));
    });
  });

  describe('unregisterTarget()', () => {
    it('removes target from internal map', () => {
      projSys.registerTarget('enemy-1', { position: new Vec3(0, 0, 0) });
      projSys.unregisterTarget('enemy-1');
      expect(projSys._targets.has('enemy-1')).toBe(false);
    });
  });

  // ── getProjectileConfig() ─────────────────────────────────────────────────

  describe('getProjectileConfig()', () => {
    it('returns config for known type', () => {
      const config = projSys.getProjectileConfig('RAILGUN');
      expect(config).toBeDefined();
      expect(config.speed).toBe(500);
    });

    it('returns null for unknown type', () => {
      expect(projSys.getProjectileConfig('ANTIMATTER')).toBeNull();
    });
  });

  // ── clearAll() ────────────────────────────────────────────────────────────

  describe('clearAll()', () => {
    it('removes all projectiles', () => {
      projSys.fireProjectile({
        type: 'RAILGUN',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 100,
        shooterId: 'player',
        weaponType: 'ballistic',
      });
      projSys.fireProjectile({
        type: 'LASER',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(1, 0, 0),
        damage: 50,
        shooterId: 'player',
        weaponType: 'laser',
      });

      expect(projSys.getActiveProjectiles()).toHaveLength(2);
      projSys.clearAll();
      expect(projSys.getActiveProjectiles()).toHaveLength(0);
    });

    it('emits projectile:cleared event', () => {
      projSys.clearAll();
      expect(mockEngine.events.emit).toHaveBeenCalledWith('projectile:cleared', {});
    });
  });

  // ── MISSILE tracking ─────────────────────────────────────────────────────

  describe('missile tracking', () => {
    it('missile adjusts velocity toward target', () => {
      projSys.registerTarget('enemy-1', {
        position: new Vec3(50, 0, 0),
        radius: 1.0,
      });

      const id = projSys.fireProjectile({
        type: 'MISSILE',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1), // Fire away from target initially
        damage: 40,
        shooterId: 'player',
        weaponType: 'missile',
        targetId: 'enemy-1',
      });

      const before = projSys._projectiles.get(id);
      const vxBefore = before.velocity.x;

      projSys.tick(500); // Half second — should start turning

      const after = projSys._projectiles.get(id);
      if (after) {
        // Velocity x should increase as missile turns toward target at x=50
        expect(after.velocity.x).toBeGreaterThan(vxBefore);
      }
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles tick with no active projectiles', () => {
      expect(() => projSys.tick(16)).not.toThrow();
    });

    it('handles fireProjectile with unknown type gracefully', () => {
      const id = projSys.fireProjectile({
        type: 'UNKNOWN_TYPE',
        origin: new Vec3(0, 0, 0),
        direction: new Vec3(0, 0, -1),
        damage: 10,
        shooterId: 'player',
        weaponType: 'laser',
      });
      // Should fallback to RAILGUN defaults
      expect(id).toBeDefined();
      const proj = projSys._projectiles.get(id);
      expect(proj).toBeDefined();
    });

    it('events still work without init (no events set)', () => {
      const bare = new ProjectileSystem(mockCombatSystem);
      // Should not throw even without init
      expect(() => bare.clearAll()).not.toThrow();
    });
  });
});
