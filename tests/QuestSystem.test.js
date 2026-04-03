/**
 * Tests for QuestSystem — acceptance, multi-objective, chains, timers, rewards.
 */
import { jest } from '@jest/globals';
import {
  QuestSystem,
  QUEST_STATE,
  OBJECTIVE_TYPE,
} from '../src/systems/QuestSystem.js';

describe('QuestSystem', () => {
  let qs;
  let stubEngine;

  beforeEach(() => {
    qs = new QuestSystem();
    stubEngine = {
      events: { on: jest.fn(), emit: jest.fn() },
    };
    qs._engine = stubEngine;
    qs._players = new Map();
    qs._definitions = new Map();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Helper to register a simple single-objective quest. */
  function simpleQuest(overrides = {}) {
    return {
      id: 'q1',
      name: 'Test Quest',
      objectives: [{ type: OBJECTIVE_TYPE.KILL, target: 'wolf', required: 3 }],
      prerequisites: [],
      timeLimitMs: null,
      rewards: null,
      ...overrides,
    };
  }

  // ── 1. Quest Acceptance & Tracking ──────────────────────────────────────

  describe('acceptance & tracking', () => {
    it('accepts a registered quest and sets state to active', () => {
      qs.registerQuest(simpleQuest());
      const res = qs.acceptQuest('p1', 'q1');
      expect(res.ok).toBe(true);
      expect(qs.getQuestState('p1', 'q1')).toBe(QUEST_STATE.ACTIVE);
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:accepted', { playerId: 'p1', questId: 'q1' });
    });

    it('rejects acceptance of an unknown quest', () => {
      const res = qs.acceptQuest('p1', 'missing');
      expect(res.ok).toBe(false);
      expect(res.error).toBe('quest_not_found');
    });

    it('rejects double-accept of the same quest', () => {
      qs.registerQuest(simpleQuest());
      qs.acceptQuest('p1', 'q1');
      const res = qs.acceptQuest('p1', 'q1');
      expect(res.ok).toBe(false);
      expect(res.error).toBe('quest_already_accepted');
    });

    it('enforces max 10 active quests per player', () => {
      for (let i = 0; i < 10; i++) {
        qs.registerQuest(simpleQuest({ id: `q${i}` }));
        expect(qs.acceptQuest('p1', `q${i}`).ok).toBe(true);
      }
      qs.registerQuest(simpleQuest({ id: 'q10' }));
      const res = qs.acceptQuest('p1', 'q10');
      expect(res.ok).toBe(false);
      expect(res.error).toBe('max_active_quests');
    });

    it('getActiveQuests returns only active quests', () => {
      qs.registerQuest(simpleQuest({ id: 'q1' }));
      qs.registerQuest(simpleQuest({ id: 'q2' }));
      qs.acceptQuest('p1', 'q1');
      qs.acceptQuest('p1', 'q2');
      // complete q1
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 3);
      const active = qs.getActiveQuests('p1');
      expect(active.length).toBe(1);
      expect(active[0].questId).toBe('q2');
    });

    it('returns null state for unknown player/quest', () => {
      expect(qs.getQuestState('nobody', 'q1')).toBeNull();
    });
  });

  // ── 2. Multi-Objective Quests ───────────────────────────────────────────

  describe('multi-objective quests', () => {
    it('tracks each objective independently', () => {
      qs.registerQuest(simpleQuest({
        objectives: [
          { type: OBJECTIVE_TYPE.KILL, target: 'wolf', required: 2 },
          { type: OBJECTIVE_TYPE.COLLECT, target: 'gem', required: 5 },
        ],
      }));
      qs.acceptQuest('p1', 'q1');

      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 1);
      const objs = qs.getObjectives('p1', 'q1');
      expect(objs[0].current).toBe(1);
      expect(objs[1].current).toBe(0);
    });

    it('completes quest only when ALL objectives are done', () => {
      qs.registerQuest(simpleQuest({
        objectives: [
          { type: OBJECTIVE_TYPE.KILL, target: 'wolf', required: 1 },
          { type: OBJECTIVE_TYPE.VISIT, target: 'cave', required: 1 },
        ],
      }));
      qs.acceptQuest('p1', 'q1');

      let res = qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 1);
      expect(res.completed).toBe(false);
      expect(qs.getQuestState('p1', 'q1')).toBe(QUEST_STATE.ACTIVE);

      res = qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.VISIT, 'cave', 1);
      expect(res.completed).toBe(true);
      expect(qs.getQuestState('p1', 'q1')).toBe(QUEST_STATE.COMPLETED);
    });

    it('clamps objective progress to required amount', () => {
      qs.registerQuest(simpleQuest({
        objectives: [{ type: OBJECTIVE_TYPE.COLLECT, target: 'ore', required: 3 }],
      }));
      qs.acceptQuest('p1', 'q1');
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.COLLECT, 'ore', 100);
      const objs = qs.getObjectives('p1', 'q1');
      expect(objs[0].current).toBe(3);
    });

    it('emits objective_progress event', () => {
      qs.registerQuest(simpleQuest());
      qs.acceptQuest('p1', 'q1');
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 1);
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:objective_progress', expect.objectContaining({
        playerId: 'p1', questId: 'q1', current: 1, required: 3,
      }));
    });

    it('rejects progress on non-active quest', () => {
      qs.registerQuest(simpleQuest());
      const res = qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 1);
      expect(res.ok).toBe(false);
    });

    it('rejects progress for unknown objective target', () => {
      qs.registerQuest(simpleQuest());
      qs.acceptQuest('p1', 'q1');
      const res = qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'dragon', 1);
      expect(res.ok).toBe(false);
      expect(res.error).toBe('objective_not_found');
    });
  });

  // ── 3. Quest Chains & Prerequisites ─────────────────────────────────────

  describe('quest chains & prerequisites', () => {
    it('blocks acceptance when prerequisites are not met', () => {
      qs.registerQuest(simpleQuest({ id: 'chain1' }));
      qs.registerQuest(simpleQuest({ id: 'chain2', prerequisites: ['chain1'] }));

      const res = qs.acceptQuest('p1', 'chain2');
      expect(res.ok).toBe(false);
      expect(res.error).toBe('prerequisites_not_met');
    });

    it('allows acceptance once prerequisites are completed', () => {
      qs.registerQuest(simpleQuest({ id: 'chain1' }));
      qs.registerQuest(simpleQuest({ id: 'chain2', prerequisites: ['chain1'] }));

      qs.acceptQuest('p1', 'chain1');
      qs.reportProgress('p1', 'chain1', OBJECTIVE_TYPE.KILL, 'wolf', 3);
      expect(qs.getQuestState('p1', 'chain1')).toBe(QUEST_STATE.COMPLETED);

      const res = qs.acceptQuest('p1', 'chain2');
      expect(res.ok).toBe(true);
    });

    it('meetsPrerequisites returns true when no prerequisites defined', () => {
      qs.registerQuest(simpleQuest({ id: 'solo' }));
      expect(qs.meetsPrerequisites('p1', 'solo')).toBe(true);
    });

    it('meetsPrerequisites returns false for unknown player with prereqs', () => {
      qs.registerQuest(simpleQuest({ id: 'a' }));
      qs.registerQuest(simpleQuest({ id: 'b', prerequisites: ['a'] }));
      expect(qs.meetsPrerequisites('nobody', 'b')).toBe(false);
    });

    it('getEligibleQuests filters by prerequisites and existing state', () => {
      qs.registerQuest(simpleQuest({ id: 'q1' }));
      qs.registerQuest(simpleQuest({ id: 'q2', prerequisites: ['q1'] }));
      qs.registerQuest(simpleQuest({ id: 'q3' }));

      // Before any quest activity, q1 and q3 are eligible (q2 requires q1)
      let eligible = qs.getEligibleQuests('p1');
      expect(eligible).toContain('q1');
      expect(eligible).toContain('q3');
      expect(eligible).not.toContain('q2');

      // Accept and complete q1
      qs.acceptQuest('p1', 'q1');
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 3);

      eligible = qs.getEligibleQuests('p1');
      expect(eligible).toContain('q2'); // now eligible
      expect(eligible).not.toContain('q1'); // completed, excluded
    });
  });

  // ── 4. Timed Quests & Expiration ────────────────────────────────────────

  describe('timed quests & expiration', () => {
    it('sets expiresAt based on timeLimitMs', () => {
      const before = Date.now();
      qs.registerQuest(simpleQuest({ timeLimitMs: 5000 }));
      qs.acceptQuest('p1', 'q1');
      const pq = qs._players.get('p1').get('q1');
      expect(pq.expiresAt).toBeGreaterThanOrEqual(before + 5000);
    });

    it('tick() auto-fails expired quests', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)   // acceptQuest → now (sets acceptedAt & expiresAt)
        .mockReturnValueOnce(7000);  // tick → expiration check

      qs.registerQuest(simpleQuest({ timeLimitMs: 5000 }));
      qs.acceptQuest('p1', 'q1');

      qs.tick(6000);
      expect(qs.getQuestState('p1', 'q1')).toBe(QUEST_STATE.FAILED);
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:failed', {
        playerId: 'p1', questId: 'q1', reason: 'expired',
      });
    });

    it('does not fail quests that have not expired', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(3000);

      qs.registerQuest(simpleQuest({ timeLimitMs: 5000 }));
      qs.acceptQuest('p1', 'q1');

      qs.tick(2000);
      expect(qs.getQuestState('p1', 'q1')).toBe(QUEST_STATE.ACTIVE);
    });

    it('getRemainingTime returns remaining ms', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)   // accept (expiresAt = 6000)
        .mockReturnValueOnce(3000);  // getRemainingTime

      qs.registerQuest(simpleQuest({ timeLimitMs: 5000 }));
      qs.acceptQuest('p1', 'q1');

      expect(qs.getRemainingTime('p1', 'q1')).toBe(3000);
    });

    it('getRemainingTime returns null for untimed quests', () => {
      qs.registerQuest(simpleQuest());
      qs.acceptQuest('p1', 'q1');
      expect(qs.getRemainingTime('p1', 'q1')).toBeNull();
    });

    it('expiresAt is null for quests without a time limit', () => {
      qs.registerQuest(simpleQuest());
      qs.acceptQuest('p1', 'q1');
      const pq = qs._players.get('p1').get('q1');
      expect(pq.expiresAt).toBeNull();
    });
  });

  // ── 5. Quest Rewards Distribution ───────────────────────────────────────

  describe('rewards distribution', () => {
    it('emits reward events on quest completion', () => {
      qs.registerQuest(simpleQuest({
        rewards: {
          credits: 500,
          sm: 10,
          xp: 200,
          items: ['sword_01', 'shield_01'],
          reputation: { pirates: -5, traders: 10 },
        },
      }));
      qs.acceptQuest('p1', 'q1');
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 3);

      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:completed', { playerId: 'p1', questId: 'q1' });
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:reward_credits', { playerId: 'p1', questId: 'q1', amount: 500 });
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:reward_sm', { playerId: 'p1', questId: 'q1', amount: 10 });
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:reward_xp', { playerId: 'p1', questId: 'q1', amount: 200 });
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:reward_items', { playerId: 'p1', questId: 'q1', items: ['sword_01', 'shield_01'] });
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:reward_reputation', { playerId: 'p1', questId: 'q1', factionId: 'pirates', delta: -5 });
      expect(stubEngine.events.emit).toHaveBeenCalledWith('quest:reward_reputation', { playerId: 'p1', questId: 'q1', factionId: 'traders', delta: 10 });
    });

    it('skips reward events when quest has no rewards', () => {
      qs.registerQuest(simpleQuest({ rewards: null }));
      qs.acceptQuest('p1', 'q1');
      stubEngine.events.emit.mockClear();
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 3);

      // Only quest:completed should be emitted, no reward events
      const calls = stubEngine.events.emit.mock.calls.map(c => c[0]);
      expect(calls).toContain('quest:completed');
      expect(calls).not.toContain('quest:reward_credits');
      expect(calls).not.toContain('quest:reward_sm');
      expect(calls).not.toContain('quest:reward_xp');
      expect(calls).not.toContain('quest:reward_items');
      expect(calls).not.toContain('quest:reward_reputation');
    });

    it('emits only present reward fields', () => {
      qs.registerQuest(simpleQuest({ rewards: { xp: 50 } }));
      qs.acceptQuest('p1', 'q1');
      stubEngine.events.emit.mockClear();
      qs.reportProgress('p1', 'q1', OBJECTIVE_TYPE.KILL, 'wolf', 3);

      const calls = stubEngine.events.emit.mock.calls.map(c => c[0]);
      expect(calls).toContain('quest:reward_xp');
      expect(calls).not.toContain('quest:reward_credits');
      expect(calls).not.toContain('quest:reward_items');
    });
  });

  // ── Lifecycle ───────────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('init stores engine reference', async () => {
      const fresh = new QuestSystem();
      await fresh.init(stubEngine);
      expect(fresh._engine).toBe(stubEngine);
    });

    it('destroy clears all state', async () => {
      qs.registerQuest(simpleQuest());
      qs.acceptQuest('p1', 'q1');
      await qs.destroy();
      expect(qs._definitions.size).toBe(0);
      expect(qs._players.size).toBe(0);
      expect(qs._engine).toBeNull();
    });
  });
});
