/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { BossSystem, BOSS_STATE, BOSS_ABILITY } from '../src/systems/BossSystem.js';

describe('BossSystem', () => {
  let bossSystem;
  let mockNPCSystem;
  let mockCombatSystem;
  let mockEnemySpawnSystem;
  let mockEvents;

  beforeEach(() => {
    // Mock NPC system
    mockNPCSystem = {
      createNPC: jest.fn(),
      getNPC: jest.fn(),
      removeNPC: jest.fn(),
    };

    // Mock combat system
    mockCombatSystem = {
      dealDamage: jest.fn(),
    };

    // Mock enemy spawn system
    mockEnemySpawnSystem = {
      spawnEnemy: jest.fn(),
    };

    // Mock event emitter
    mockEvents = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    bossSystem = new BossSystem(mockNPCSystem, mockCombatSystem, mockEnemySpawnSystem);
    bossSystem.events = mockEvents;
  });

  describe('Boss Spawning', () => {
    test('spawns Destroyer boss with correct stats', () => {
      const position = { x: 0, y: 0, z: 300 };
      const difficulty = 1.0;

      const bossId = bossSystem.spawnBoss('DESTROYER', position, difficulty);

      expect(bossId).toBeTruthy();
      expect(bossId).toMatch(/^boss_\d+$/);

      const boss = bossSystem.getBoss(bossId);
      expect(boss).toBeTruthy();
      expect(boss.type).toBe('DESTROYER');
      expect(boss.name).toBe('Destroyer-Class Warship');
      expect(boss.maxHealth).toBe(5000);
      expect(boss.maxShield).toBe(2000);
      expect(boss.health).toBe(5000);
      expect(boss.shield).toBe(2000);
      expect(boss.active).toBe(true);
    });

    test('spawns Carrier boss with correct stats', () => {
      const bossId = bossSystem.spawnBoss('CARRIER', { x: 0, y: 0, z: 300 }, 1.0);
      const boss = bossSystem.getBoss(bossId);

      expect(boss.type).toBe('CARRIER');
      expect(boss.maxHealth).toBe(7000);
      expect(boss.maxShield).toBe(3000);
      expect(boss.phases.length).toBe(3);
    });

    test('spawns Dreadnought boss with correct stats', () => {
      const bossId = bossSystem.spawnBoss('DREADNOUGHT', { x: 0, y: 0, z: 300 }, 1.0);
      const boss = bossSystem.getBoss(bossId);

      expect(boss.type).toBe('DREADNOUGHT');
      expect(boss.maxHealth).toBe(10000);
      expect(boss.maxShield).toBe(5000);
      expect(boss.phases.length).toBe(4);
    });

    test('spawns Mothership boss with correct stats', () => {
      const bossId = bossSystem.spawnBoss('MOTHERSHIP', { x: 0, y: 0, z: 300 }, 1.0);
      const boss = bossSystem.getBoss(bossId);

      expect(boss.type).toBe('MOTHERSHIP');
      expect(boss.maxHealth).toBe(20000);
      expect(boss.maxShield).toBe(8000);
      expect(boss.phases.length).toBe(5);
    });

    test('scales boss stats by difficulty', () => {
      const difficulty = 2.0;
      const bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, difficulty);
      const boss = bossSystem.getBoss(bossId);

      expect(boss.maxHealth).toBe(5000 * 2.0);
      expect(boss.maxShield).toBe(2000 * 2.0);
      expect(boss.damage).toBe(80 * 2.0);
    });

    test('emits spawn event', () => {
      const position = { x: 100, y: 50, z: 200 };
      const bossId = bossSystem.spawnBoss('DESTROYER', position, 1.5);

      expect(mockEvents.emit).toHaveBeenCalledWith('boss:spawned', {
        bossId,
        type: 'DESTROYER',
        name: 'Destroyer-Class Warship',
        position,
        difficulty: 1.5,
      });
    });

    test('registers boss with NPC system', () => {
      const bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);

      expect(mockNPCSystem.createNPC).toHaveBeenCalledWith(
        expect.objectContaining({
          id: bossId,
          name: 'Destroyer-Class Warship',
          hostile: true,
          boss: true,
        })
      );
    });

    test('throws error for unknown boss type', () => {
      expect(() => {
        bossSystem.spawnBoss('UNKNOWN_BOSS', { x: 0, y: 0, z: 0 }, 1.0);
      }).toThrow('Unknown boss type: UNKNOWN_BOSS');
    });
  });

  describe('Boss AI and Updates', () => {
    let bossId;
    let boss;

    beforeEach(() => {
      bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      boss = bossSystem.getBoss(bossId);
      bossSystem.setPlayerPosition({ x: 0, y: 0, z: 0 });
    });

    test('updates boss position based on AI', () => {
      const initialZ = boss.position.z;
      
      // Tick for 1 second (boss should approach player)
      bossSystem.tick(1000);

      // Boss should have moved (approach behavior)
      expect(boss.position.z).not.toBe(initialZ);
    });

    test('transitions to orbit state when close to player', () => {
      boss.position.z = 150; // Close to player
      boss.state = BOSS_STATE.APPROACH;

      bossSystem.tick(100);

      expect(boss.state).toBe(BOSS_STATE.ORBIT);
    });

    test('executes attack patterns on interval', () => {
      const phaseData = boss.phases[0];
      boss.attackTimer = phaseData.attackIntervalMs + 100;

      bossSystem.tick(100);

      expect(mockEvents.emit).toHaveBeenCalledWith(
        'boss:attack',
        expect.objectContaining({
          bossId: boss.id,
          pattern: expect.stringMatching(/RAILGUN_BURST|MISSILE_VOLLEY/),
        })
      );
    });

    test('updates state timer', () => {
      const initialTimer = boss.stateTimer;
      bossSystem.tick(500);

      expect(boss.stateTimer).toBe(initialTimer + 500);
    });
  });

  describe('Phase Transitions', () => {
    let bossId;
    let boss;

    beforeEach(() => {
      bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      boss = bossSystem.getBoss(bossId);
    });

    test('transitions to phase 2 at 60% health', () => {
      expect(boss.currentPhase).toBe(0);

      // Reduce health to 60%
      boss.health = boss.maxHealth * 0.6;

      bossSystem.tick(100);

      expect(boss.currentPhase).toBe(1);
      expect(boss.state).toBe(BOSS_STATE.PHASE_TRANSITION);
    });

    test('transitions to phase 3 at 30% health', () => {
      boss.health = boss.maxHealth * 0.3;

      bossSystem.tick(100); // First tick transitions to phase 2
      bossSystem.tick(100); // Second tick transitions to phase 3

      expect(boss.currentPhase).toBe(2);
    });

    test('emits phase change event', () => {
      boss.health = boss.maxHealth * 0.6;

      bossSystem.tick(100);

      expect(mockEvents.emit).toHaveBeenCalledWith('boss:phase_change', {
        bossId: boss.id,
        phase: 2, // Phase number (1-indexed)
        maxPhases: 3,
        healthPercent: 60,
      });
    });

    test('does not transition beyond max phases', () => {
      boss.currentPhase = 2; // Last phase
      boss.health = 1;

      bossSystem.tick(100);

      expect(boss.currentPhase).toBe(2);
    });

    test('exits phase transition state after 2 seconds', () => {
      boss.health = boss.maxHealth * 0.6;
      bossSystem.tick(100); // Enter phase transition

      expect(boss.state).toBe(BOSS_STATE.PHASE_TRANSITION);

      bossSystem.tick(2100); // Wait 2.1 seconds

      expect(boss.state).not.toBe(BOSS_STATE.PHASE_TRANSITION);
    });
  });

  describe('Boss Damage', () => {
    let bossId;
    let boss;

    beforeEach(() => {
      bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      boss = bossSystem.getBoss(bossId);
      mockNPCSystem.getNPC.mockReturnValue({
        health: boss.health,
        shield: boss.shield,
      });
    });

    test('damages shield first', () => {
      const initialShield = boss.shield;
      const damage = 500;

      bossSystem.damageBoss(bossId, damage, 'RAILGUN');

      expect(boss.shield).toBe(initialShield - damage);
      expect(boss.health).toBe(boss.maxHealth);
    });

    test('damages health after shield depleted', () => {
      boss.shield = 100;
      const damage = 500;

      bossSystem.damageBoss(bossId, damage, 'RAILGUN');

      expect(boss.shield).toBe(0);
      expect(boss.health).toBe(boss.maxHealth - 400); // Overflow
    });

    test('emits damage event', () => {
      bossSystem.damageBoss(bossId, 1000, 'RAILGUN');

      expect(mockEvents.emit).toHaveBeenCalledWith('boss:damaged', {
        bossId: boss.id,
        damage: 1000,
        damageType: 'RAILGUN',
        health: boss.health,
        shield: boss.shield,
        healthPercent: expect.any(Number),
      });
    });

    test('clamps health at zero', () => {
      boss.shield = 0;
      boss.health = 100;

      bossSystem.damageBoss(bossId, 500, 'RAILGUN');

      expect(boss.health).toBe(0);
    });
  });

  describe('Boss Death', () => {
    let bossId;
    let boss;

    beforeEach(() => {
      bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      boss = bossSystem.getBoss(bossId);
      mockNPCSystem.getNPC.mockReturnValue({
        health: 0,
        shield: 0,
      });
    });

    test('marks boss as inactive on death', () => {
      boss.health = 0;
      bossSystem.tick(100);

      expect(boss.active).toBe(false);
      expect(boss.state).toBe(BOSS_STATE.DEATH);
    });

    test('emits killed event with loot', () => {
      boss.health = 0;
      bossSystem.tick(100);

      expect(mockEvents.emit).toHaveBeenCalledWith('boss:killed', {
        bossId: boss.id,
        type: 'DESTROYER',
        name: 'Destroyer-Class Warship',
        position: boss.position,
        loot: expect.any(Array),
        survivalTime: expect.any(Number),
      });
    });

    test('generates loot with credits', () => {
      boss.health = 0;
      bossSystem.tick(100);

      const killEvent = mockEvents.emit.mock.calls.find(
        call => call[0] === 'boss:killed'
      );
      const loot = killEvent[1].loot;

      const credits = loot.find(l => l.type === 'credits');
      expect(credits).toBeTruthy();
      expect(credits.amount).toBeGreaterThanOrEqual(5000);
      expect(credits.amount).toBeLessThanOrEqual(10000);
    });

    test('generates loot with items', () => {
      boss.health = 0;
      bossSystem.tick(100);

      const killEvent = mockEvents.emit.mock.calls.find(
        call => call[0] === 'boss:killed'
      );
      const loot = killEvent[1].loot;

      expect(loot.length).toBeGreaterThan(0);
    });
  });

  describe('Boss Abilities', () => {
    let bossId;
    let boss;

    beforeEach(() => {
      bossId = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      boss = bossSystem.getBoss(bossId);
      boss.currentPhase = 1; // Phase with special ability
    });

    test('executes special ability on cooldown', () => {
      boss.abilityTimer = 15100; // Past cooldown

      bossSystem.tick(100);

      expect(boss.abilityTimer).toBeLessThan(15100);
      expect(boss.state).toBe(BOSS_STATE.SPECIAL_ABILITY);
    });

    test('emits ability event', () => {
      boss.abilityTimer = 15100;

      bossSystem.tick(100);

      expect(mockEvents.emit).toHaveBeenCalledWith('boss:ability', {
        bossId: boss.id,
        ability: expect.any(String),
        position: boss.position,
      });
    });

    test('shield burst ability restores shield', () => {
      boss.shield = 1000;
      boss.abilityTimer = 15100;
      const phaseData = boss.phases[boss.currentPhase];
      phaseData.specialAbility = BOSS_ABILITY.SHIELD_BURST;

      bossSystem.tick(100);

      expect(boss.shield).toBeGreaterThan(1000);
    });

    test('repair drones ability restores health', () => {
      boss.health = boss.maxHealth * 0.5;
      boss.abilityTimer = 15100;
      const phaseData = boss.phases[boss.currentPhase];
      phaseData.specialAbility = BOSS_ABILITY.REPAIR_DRONES;

      bossSystem.tick(100);

      expect(boss.health).toBeGreaterThan(boss.maxHealth * 0.5);
    });
  });

  describe('Player Position Tracking', () => {
    test('updates target position for all bosses', () => {
      const boss1Id = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      const boss2Id = bossSystem.spawnBoss('CARRIER', { x: 0, y: 0, z: 500 }, 1.0);

      const playerPos = { x: 100, y: 50, z: 25 };
      bossSystem.setPlayerPosition(playerPos);

      const boss1 = bossSystem.getBoss(boss1Id);
      const boss2 = bossSystem.getBoss(boss2Id);

      expect(boss1.targetPosition).toEqual(playerPos);
      expect(boss2.targetPosition).toEqual(playerPos);
    });
  });

  describe('Active Boss Management', () => {
    test('returns all active bosses', () => {
      const boss1Id = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      const boss2Id = bossSystem.spawnBoss('CARRIER', { x: 0, y: 0, z: 500 }, 1.0);

      const activeBosses = bossSystem.getActiveBosses();

      expect(activeBosses.length).toBe(2);
      expect(activeBosses[0].id).toBe(boss1Id);
      expect(activeBosses[1].id).toBe(boss2Id);
    });

    test('excludes inactive bosses', () => {
      const boss1Id = bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      const boss2Id = bossSystem.spawnBoss('CARRIER', { x: 0, y: 0, z: 500 }, 1.0);

      const boss1 = bossSystem.getBoss(boss1Id);
      boss1.active = false;

      const activeBosses = bossSystem.getActiveBosses();

      expect(activeBosses.length).toBe(1);
      expect(activeBosses[0].id).toBe(boss2Id);
    });

    test('clears all bosses', () => {
      bossSystem.spawnBoss('DESTROYER', { x: 0, y: 0, z: 300 }, 1.0);
      bossSystem.spawnBoss('CARRIER', { x: 0, y: 0, z: 500 }, 1.0);

      bossSystem.clearBosses();

      expect(bossSystem.getActiveBosses().length).toBe(0);
      expect(mockNPCSystem.removeNPC).toHaveBeenCalledTimes(2);
    });
  });
});
