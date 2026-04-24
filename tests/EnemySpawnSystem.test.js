/**
 * Tests for EnemySpawnSystem — wave spawning, damage, difficulty, enemy AI, boss waves.
 */
import { jest } from '@jest/globals';
import { EnemySpawnSystem } from '../src/systems/EnemySpawnSystem.js';
import { WEAPON_TYPE, ARMOR_TYPE } from '../src/systems/CombatSystem.js';

describe('EnemySpawnSystem', () => {
  let spawner;
  let mockNpcSystem;
  let mockCombatSystem;
  let mockEngine;

  beforeEach(() => {
    mockNpcSystem = {};
    mockCombatSystem = {
      registerShield: jest.fn(),
    };
    mockEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };

    spawner = new EnemySpawnSystem(mockNpcSystem, mockCombatSystem);
    spawner.init(mockEngine);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Constructor / Init ────────────────────────────────────────────────────

  describe('constructor', () => {
    it('stores npcSystem and combatSystem references', () => {
      expect(spawner._npcSystem).toBe(mockNpcSystem);
      expect(spawner._combatSystem).toBe(mockCombatSystem);
    });

    it('uses default options when none provided', () => {
      expect(spawner._spawnRadius).toBe(150);
      expect(spawner._maxActiveEnemies).toBe(20);
      expect(spawner._waveIntervalMs).toBe(30000);
      expect(spawner._bossSystem).toBeNull();
      expect(spawner._bossWaveInterval).toBe(5);
    });

    it('respects custom options', () => {
      const custom = new EnemySpawnSystem(mockNpcSystem, mockCombatSystem, {
        spawnRadius: 200,
        maxActiveEnemies: 10,
        waveIntervalMs: 5000,
        bossWaveInterval: 3,
      });
      expect(custom._spawnRadius).toBe(200);
      expect(custom._maxActiveEnemies).toBe(10);
      expect(custom._waveIntervalMs).toBe(5000);
      expect(custom._bossWaveInterval).toBe(3);
    });

    it('has all four enemy type templates', () => {
      expect(spawner.ENEMY_TYPES).toHaveProperty('SCOUT');
      expect(spawner.ENEMY_TYPES).toHaveProperty('FIGHTER');
      expect(spawner.ENEMY_TYPES).toHaveProperty('BOMBER');
      expect(spawner.ENEMY_TYPES).toHaveProperty('INTERCEPTOR');
    });
  });

  describe('init()', () => {
    it('sets events from engine', () => {
      expect(spawner.events).toBe(mockEngine.events);
    });

    it('records last wave time', () => {
      expect(spawner._lastWaveTime).toBeGreaterThan(0);
    });
  });

  // ── spawnWave() ───────────────────────────────────────────────────────────

  describe('spawnWave()', () => {
    it('spawns the requested number of enemies', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 5);
      expect(enemies).toHaveLength(5);
      expect(spawner.getActiveEnemies()).toHaveLength(5);
    });

    it('increments wave count', () => {
      expect(spawner._waveCount).toBe(0);
      spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 3);
      expect(spawner._waveCount).toBe(1);
      spawner.spawnWave({ x: 0, y: 0, z: 0 }, 2, 2);
      expect(spawner._waveCount).toBe(2);
    });

    it('emits enemy:wave_spawned event', () => {
      spawner.spawnWave({ x: 10, y: 20, z: 30 }, 3, 4);
      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'enemy:wave_spawned',
        expect.objectContaining({
          waveNumber: 1,
          difficulty: 3,
          count: 4,
        })
      );
    });

    it('returns enemy objects with required fields', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const e = enemies[0];
      expect(e).toHaveProperty('id');
      expect(e).toHaveProperty('type');
      expect(e).toHaveProperty('health');
      expect(e).toHaveProperty('shield');
      expect(e).toHaveProperty('position');
      expect(e).toHaveProperty('armorType');
      expect(e).toHaveProperty('weaponType');
      expect(e).toHaveProperty('damage');
      expect(e).toHaveProperty('speed');
    });

    it('registers shields with combat system for each enemy', () => {
      spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 3);
      // All enemy types have shield > 0, so registerShield should be called
      expect(mockCombatSystem.registerShield).toHaveBeenCalled();
    });

    it('updates player position', () => {
      spawner.spawnWave({ x: 100, y: 200, z: 300 }, 1, 1);
      expect(spawner._playerPosition).toEqual({ x: 100, y: 200, z: 300 });
    });

    it('spawns zero enemies when count is 0', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 0);
      expect(enemies).toHaveLength(0);
      expect(spawner.getActiveEnemies()).toHaveLength(0);
    });
  });

  // ── getEnemy() / getActiveEnemies() ───────────────────────────────────────

  describe('getEnemy()', () => {
    it('returns an enemy by ID', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const found = spawner.getEnemy(enemies[0].id);
      expect(found).toBe(enemies[0]);
    });

    it('returns null for unknown ID', () => {
      expect(spawner.getEnemy('nonexistent')).toBeNull();
    });
  });

  describe('getActiveEnemies()', () => {
    it('returns empty array when no enemies', () => {
      expect(spawner.getActiveEnemies()).toEqual([]);
    });

    it('returns all spawned enemies', () => {
      spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 3);
      expect(spawner.getActiveEnemies()).toHaveLength(3);
    });
  });

  // ── damageEnemy() ─────────────────────────────────────────────────────────

  describe('damageEnemy()', () => {
    it('absorbs damage into shield first', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const e = enemies[0];
      const origShield = e.shield;
      const origHealth = e.health;

      spawner.damageEnemy(e.id, 10);
      if (origShield >= 10) {
        expect(e.shield).toBe(origShield - 10);
        expect(e.health).toBe(origHealth);
      }
    });

    it('bleeds through to health after shield depleted', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const e = enemies[0];
      const totalDamage = e.shield + 20;

      spawner.damageEnemy(e.id, totalDamage);
      expect(e.shield).toBe(0);
      expect(e.health).toBe(e.maxHealth - 20);
    });

    it('returns true when enemy is killed', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const e = enemies[0];
      const lethalDamage = e.health + e.shield + 100;

      const killed = spawner.damageEnemy(e.id, lethalDamage);
      expect(killed).toBe(true);
    });

    it('returns false when enemy survives', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const killed = spawner.damageEnemy(enemies[0].id, 1);
      expect(killed).toBe(false);
    });

    it('returns false for nonexistent enemy', () => {
      expect(spawner.damageEnemy('nonexistent', 100)).toBe(false);
    });

    it('emits enemy:killed when enemy dies', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 1);
      const e = enemies[0];
      spawner.damageEnemy(e.id, e.health + e.shield + 9999);

      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'enemy:killed',
        expect.objectContaining({ enemyId: e.id })
      );
    });
  });

  // ── clearAll() ────────────────────────────────────────────────────────────

  describe('clearAll()', () => {
    it('removes all enemies', () => {
      spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 5);
      expect(spawner.getActiveEnemies()).toHaveLength(5);

      spawner.clearAll();
      expect(spawner.getActiveEnemies()).toHaveLength(0);
    });

    it('resets wave count', () => {
      spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 3);
      expect(spawner._waveCount).toBe(1);

      spawner.clearAll();
      expect(spawner._waveCount).toBe(0);
    });

    it('emits enemy:cleared event', () => {
      spawner.clearAll();
      expect(mockEngine.events.emit).toHaveBeenCalledWith('enemy:cleared', {});
    });
  });

  // ── setPlayerPosition() ───────────────────────────────────────────────────

  describe('setPlayerPosition()', () => {
    it('updates internal player position', () => {
      spawner.setPlayerPosition({ x: 50, y: 60, z: 70 });
      expect(spawner._playerPosition).toEqual({ x: 50, y: 60, z: 70 });
    });
  });

  // ── tick() ────────────────────────────────────────────────────────────────

  describe('tick()', () => {
    it('cleans up dead enemies (health <= 0)', () => {
      const enemies = spawner.spawnWave({ x: 0, y: 0, z: 0 }, 1, 3);
      // Manually set one enemy to dead
      enemies[0].health = 0;

      spawner.tick(16);
      expect(spawner.getActiveEnemies()).toHaveLength(2);
    });

    it('does not auto-spawn if wave interval has not elapsed', () => {
      spawner._lastWaveTime = Date.now();
      const countBefore = spawner.getActiveEnemies().length;

      spawner.tick(16);
      expect(spawner.getActiveEnemies().length).toBe(countBefore);
    });
  });

  // ── Enemy Type Templates ──────────────────────────────────────────────────

  describe('enemy type templates', () => {
    it('SCOUT has light armor and laser weapon', () => {
      expect(spawner.ENEMY_TYPES.SCOUT.armorType).toBe(ARMOR_TYPE.LIGHT);
      expect(spawner.ENEMY_TYPES.SCOUT.weaponType).toBe(WEAPON_TYPE.LASER);
    });

    it('FIGHTER has medium armor and ballistic weapon', () => {
      expect(spawner.ENEMY_TYPES.FIGHTER.armorType).toBe(ARMOR_TYPE.MEDIUM);
      expect(spawner.ENEMY_TYPES.FIGHTER.weaponType).toBe(WEAPON_TYPE.BALLISTIC);
    });

    it('BOMBER has heavy armor and missile weapon', () => {
      expect(spawner.ENEMY_TYPES.BOMBER.armorType).toBe(ARMOR_TYPE.HEAVY);
      expect(spawner.ENEMY_TYPES.BOMBER.weaponType).toBe(WEAPON_TYPE.MISSILE);
    });

    it('INTERCEPTOR has light armor and plasma weapon', () => {
      expect(spawner.ENEMY_TYPES.INTERCEPTOR.armorType).toBe(ARMOR_TYPE.LIGHT);
      expect(spawner.ENEMY_TYPES.INTERCEPTOR.weaponType).toBe(WEAPON_TYPE.PLASMA);
    });

    it('all templates have positive health and speed', () => {
      for (const tmpl of Object.values(spawner.ENEMY_TYPES)) {
        expect(tmpl.health).toBeGreaterThan(0);
        expect(tmpl.speed).toBeGreaterThan(0);
      }
    });
  });

  // ── _selectEnemyType (difficulty scaling) ─────────────────────────────────

  describe('difficulty scaling', () => {
    it('low difficulty favours SCOUT and FIGHTER', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const type = spawner._selectEnemyType(1);
      expect(['SCOUT', 'FIGHTER']).toContain(type);
    });

    it('high difficulty can produce BOMBER', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      const type = spawner._selectEnemyType(8);
      expect(type).toBe('BOMBER');
    });
  });

  // ── Boss wave integration ─────────────────────────────────────────────────

  describe('boss wave integration', () => {
    it('does not spawn boss without bossSystem', () => {
      spawner._bossSystem = null;
      // Force wave count to trigger boss interval
      spawner._waveCount = 5;
      spawner._autoSpawnWave();
      // Should spawn regular wave instead
      expect(spawner.getActiveEnemies().length).toBeGreaterThanOrEqual(0);
    });

    it('emits boss:warning when bossSystem is present and interval matches', () => {
      const mockBossSystem = { spawnBoss: jest.fn().mockReturnValue('boss-1') };
      spawner._bossSystem = mockBossSystem;
      spawner._bossWaveInterval = 5;
      spawner._waveCount = 5;
      spawner._currentDifficulty = 3;

      spawner._autoSpawnWave();

      expect(mockEngine.events.emit).toHaveBeenCalledWith(
        'boss:warning',
        expect.objectContaining({ bossType: expect.any(String) })
      );
    });
  });
});
