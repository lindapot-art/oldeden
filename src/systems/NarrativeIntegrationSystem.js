/**
 * NarrativeIntegrationSystem — Bridge between story systems and game mechanics.
 *
 * Integrates the DialogueSystem and FactionStorylineSystem with existing
 * game systems (QuestSystem, NPCSystem, exploration, combat, fitting).
 * 
 * Handles story-driven gameplay by:
 *  1. Converting story missions into quest objectives
 *  2. Triggering story events based on game state
 *  3. Integrating exploration, combat, and fitting requirements into storylines
 *  4. Managing cross-system communication for narrative events
 */

export class NarrativeIntegrationSystem {
  constructor() {
    /** @type {import('../engine').Engine|null} */
    this._engine = null;

    /** @type {import('./DialogueSystem').DialogueSystem|null} */
    this._dialogueSystem = null;

    /** @type {import('./FactionStorylineSystem').FactionStorylineSystem|null} */
    this._storylineSystem = null;

    /** @type {import('./QuestSystem').QuestSystem|null} */
    this._questSystem = null;

    /**
     * Active story contexts for players.
     * @type {Map<string, Object>}
     */
    this._playerContexts = new Map();

    /**
     * Story event listeners and handlers.
     * @type {Map<string, Function>}
     */
    this._eventHandlers = new Map();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialize the narrative integration system.
   *
   * @param {import('../engine').Engine} engine
   */
  async init(engine) {
    this._engine = engine;
    
    // Get references to other systems
    this._dialogueSystem = engine.getSystem('dialogue');
    this._storylineSystem = engine.getSystem('storylines');
    this._questSystem = engine.getSystem('quests');

    // Register event handlers
    this._setupEventHandlers();

    console.log('[NarrativeIntegrationSystem] Initialized story-gameplay bridge.');
  }

  /**
   * Per-frame update.
   *
   * @param {number} deltaMs - Milliseconds elapsed since last tick.
   */
  tick(deltaMs) {
    // Update story contexts, check for triggered events
    for (const [playerId, context] of this._playerContexts) {
      this._updatePlayerStoryContext(playerId, context, deltaMs);
    }
  }

  /**
   * Tear down the system.
   */
  async destroy() {
    this._clearEventHandlers();
    this._playerContexts.clear();
    this._eventHandlers.clear();
    this._engine = null;
  }

  // ── Story-Gameplay Integration ───────────────────────────────────────────

  /**
   * Start an NPC conversation with story context.
   *
   * @param {string} playerId
   * @param {string} npcId
   * @returns {Object|null} Dialogue node and context
   */
  initiateNPCInteraction(playerId, npcId) {
    if (!this._dialogueSystem) return null;

    // Determine conversation context based on active storylines
    const context = this._getPlayerContext(playerId);
    const conversationId = this._determineConversationId(playerId, npcId, context);
    
    if (!conversationId) return null;

    // Start dialogue
    const dialogueNode = this._dialogueSystem.startConversation(playerId, npcId, conversationId);
    if (!dialogueNode) return null;

    // Update story context
    context.activeConversation = {
      npcId,
      conversationId,
      startTime: Date.now()
    };

    return {
      node: dialogueNode,
      npc: this._dialogueSystem.getNPC(npcId),
      context: context.activeConversation
    };
  }

  /**
   * Handle story mission objectives completion.
   *
   * @param {string} playerId
   * @param {string} missionId
   * @param {string} objectiveType
   * @param {string} target
   * @param {number} progress
   */
  onMissionObjectiveProgress(playerId, missionId, objectiveType, target, progress) {
    const context = this._getPlayerContext(playerId);
    
    // Check if this is a story mission
    const storyMission = this._findActiveStoryMission(playerId, missionId);
    if (!storyMission) return;

    // Update story context
    context.activeMissions = context.activeMissions || {};
    context.activeMissions[missionId] = context.activeMissions[missionId] || {};
    context.activeMissions[missionId].progress = progress;

    // Check for story triggers based on objective progress
    this._checkStoryTriggers(playerId, storyMission, objectiveType, target, progress);

    this._engine?.events.emit('narrative:objective_progress', {
      playerId,
      missionId,
      objectiveType,
      target,
      progress,
      storyContext: true
    });
  }

  /**
   * Complete a story mission and handle narrative consequences.
   *
   * @param {string} playerId
   * @param {string} storylineId
   * @param {string} missionId
   */
  completeStoryMission(playerId, storylineId, missionId) {
    if (!this._storylineSystem) return;

    // Complete the mission in storyline system
    this._storylineSystem.completeMission(playerId, storylineId);

    // Update player context
    const context = this._getPlayerContext(playerId);
    context.completedMissions = context.completedMissions || [];
    context.completedMissions.push(missionId);

    // Remove from active missions
    if (context.activeMissions?.[missionId]) {
      delete context.activeMissions[missionId];
    }

    // Check for story unlocks
    this._checkStoryUnlocks(playerId, storylineId, missionId);

    this._engine?.events.emit('narrative:mission_completed', {
      playerId,
      storylineId,
      missionId
    });
  }

  /**
   * Integrate story requirements with exploration system.
   *
   * @param {string} playerId
   * @param {string} systemId
   * @param {string} sectorType
   */
  onSystemExplored(playerId, systemId, sectorType) {
    const context = this._getPlayerContext(playerId);
    
    // Check if exploration triggers story events
    this._checkExplorationTriggers(playerId, systemId, sectorType, context);

    // Update exploration history for story requirements
    context.exploredSystems = context.exploredSystems || [];
    if (!context.exploredSystems.includes(systemId)) {
      context.exploredSystems.push(systemId);
    }
  }

  /**
   * Handle combat events in story context.
   *
   * @param {string} playerId
   * @param {string} eventType
   * @param {Object} eventData
   */
  onCombatEvent(playerId, eventType, eventData) {
    const context = this._getPlayerContext(playerId);
    
    // Track combat for story requirements
    context.combatStats = context.combatStats || { kills: 0, damage: 0 };
    
    switch (eventType) {
      case 'enemy_killed':
        context.combatStats.kills++;
        this._checkCombatTriggers(playerId, 'kill', eventData, context);
        break;
        
      case 'damage_dealt':
        context.combatStats.damage += eventData.amount;
        break;
        
      case 'boss_defeated':
        context.combatStats.bossKills = (context.combatStats.bossKills || 0) + 1;
        this._checkCombatTriggers(playerId, 'boss_kill', eventData, context);
        break;
    }
  }

  /**
   * Handle fitting/equipment changes in story context.
   *
   * @param {string} playerId
   * @param {string} moduleId
   * @param {string} action
   */
  onFittingChange(playerId, moduleId, action) {
    const context = this._getPlayerContext(playerId);
    
    // Track fitting changes for story requirements
    context.fittingHistory = context.fittingHistory || [];
    context.fittingHistory.push({
      moduleId,
      action,
      timestamp: Date.now()
    });

    // Check if fitting changes unlock story content
    this._checkFittingTriggers(playerId, moduleId, action, context);
  }

  // ── Context Management ───────────────────────────────────────────────────

  /**
   * Get or create player story context.
   *
   * @param {string} playerId
   * @returns {Object}
   */
  _getPlayerContext(playerId) {
    if (!this._playerContexts.has(playerId)) {
      this._playerContexts.set(playerId, {
        activeStorylines: [],
        activeMissions: {},
        completedMissions: [],
        exploredSystems: [],
        combatStats: {},
        fittingHistory: [],
        relationshipFactors: {},
        storyFlags: {},
        activeConversation: null,
        lastUpdateTime: Date.now()
      });
    }
    return this._playerContexts.get(playerId);
  }

  /**
   * Update player story context each frame.
   *
   * @param {string} playerId
   * @param {Object} context
   * @param {number} deltaMs
   */
  _updatePlayerStoryContext(playerId, context, deltaMs) {
    // Check for timed story events
    this._checkTimedStoryEvents(playerId, context, deltaMs);

    // Update relationship factors based on recent actions
    this._updateRelationshipFactors(playerId, context, deltaMs);

    // Clean up expired conversation contexts
    if (context.activeConversation) {
      const age = Date.now() - context.activeConversation.startTime;
      if (age > 300000) { // 5 minutes
        context.activeConversation = null;
      }
    }

    context.lastUpdateTime = Date.now();
  }

  // ── Event Handlers ───────────────────────────────────────────────────────

  /**
   * Setup event listeners for story integration.
   */
  _setupEventHandlers() {
    if (!this._engine) return;

    // Quest system integration
    this._eventHandlers.set('quest:objective_progress', (event) => {
      this.onMissionObjectiveProgress(
        event.playerId,
        event.questId,
        event.type,
        event.target,
        event.current
      );
    });

    // Combat system integration
    this._eventHandlers.set('combat:enemy_killed', (event) => {
      this.onCombatEvent(event.playerId, 'enemy_killed', event);
    });

    this._eventHandlers.set('combat:boss_defeated', (event) => {
      this.onCombatEvent(event.playerId, 'boss_defeated', event);
    });

    // Exploration system integration
    this._eventHandlers.set('exploration:system_visited', (event) => {
      this.onSystemExplored(event.playerId, event.systemId, event.sectorType);
    });

    // Fitting system integration
    this._eventHandlers.set('fitting:module_installed', (event) => {
      this.onFittingChange(event.playerId, event.moduleId, 'install');
    });

    this._eventHandlers.set('fitting:module_removed', (event) => {
      this.onFittingChange(event.playerId, event.moduleId, 'remove');
    });

    // Register all handlers
    for (const [eventName, handler] of this._eventHandlers) {
      this._engine.events.on(eventName, handler);
    }
  }

  /**
   * Clear all event handlers.
   */
  _clearEventHandlers() {
    if (!this._engine) return;

    for (const [eventName, handler] of this._eventHandlers) {
      this._engine.events.off(eventName, handler);
    }
  }

  // ── Story Trigger Systems ────────────────────────────────────────────────

  /**
   * Check for story triggers based on mission progress.
   */
  _checkStoryTriggers(playerId, storyMission, objectiveType, target, progress) {
    // Implementation for specific story triggers
    // Example: Hegemony mission prisoner choice
    if (storyMission.id === 'hegemony_mission_1' && objectiveType === 'kill' && target === 'rebel_fighter' && progress >= 7) {
      // Trigger prisoner choice dialogue
      this._engine?.events.emit('narrative:trigger_choice', {
        playerId,
        choiceId: 'prisoner_choice',
        missionId: storyMission.id
      });
    }
  }

  /**
   * Check for story unlocks after mission completion.
   */
  _checkStoryUnlocks(playerId, storylineId, missionId) {
    // Check if completing this mission unlocks other faction storylines
    const context = this._getPlayerContext(playerId);
    
    // Example: Completing first Hegemony mission with mercy choice unlocks Republic content
    if (missionId === 'hegemony_mission_1') {
      const playerChoices = context.storyFlags.playerChoices || [];
      const mercyChoice = playerChoices.find(c => c.optionId === 'spare_rebel');
      
      if (mercyChoice) {
        this._engine?.events.emit('narrative:unlock_storyline', {
          playerId,
          storylineId: 'republic_diplomatic_path'
        });
      }
    }
  }

  /**
   * Check exploration-based story triggers.
   */
  _checkExplorationTriggers(playerId, systemId, sectorType, context) {
    // Example: Discovering certain anomalies triggers Void Seeker content
    if (sectorType === 'void_anomaly' && !context.storyFlags.voidAnomalyDiscovered) {
      context.storyFlags.voidAnomalyDiscovered = true;
      this._engine?.events.emit('narrative:unlock_storyline', {
        playerId,
        storylineId: 'void_seekers_embrace_void'
      });
    }
  }

  /**
   * Check combat-based story triggers.
   */
  _checkCombatTriggers(playerId, triggerType, eventData, context) {
    // Example: High kill count unlocks mercenary storylines
    if (triggerType === 'kill' && context.combatStats.kills >= 50) {
      if (!context.storyFlags.veteranStatus) {
        context.storyFlags.veteranStatus = true;
        this._engine?.events.emit('narrative:unlock_storyline', {
          playerId,
          storylineId: 'shadow_syndicate_veteran_path'
        });
      }
    }
  }

  /**
   * Check fitting-based story triggers.
   */
  _checkFittingTriggers(playerId, moduleId, action, context) {
    // Example: Installing AI modules triggers Synthesis storyline
    if (moduleId.includes('ai_') && action === 'install') {
      if (!context.storyFlags.aiModuleUser) {
        context.storyFlags.aiModuleUser = true;
        this._engine?.events.emit('narrative:unlock_storyline', {
          playerId,
          storylineId: 'synthesis_digital_transcendence'
        });
      }
    }
  }

  // ── Helper Methods ───────────────────────────────────────────────────────

  /**
   * Find active story mission by ID.
   */
  _findActiveStoryMission(playerId, missionId) {
    // TODO: Query storyline system for active mission details
    return { id: missionId, storylineId: 'unknown' };
  }

  /**
   * Determine appropriate conversation ID for NPC interaction.
   */
  _determineConversationId(playerId, npcId, context) {
    // Basic logic - could be much more sophisticated
    if (npcId === 'admiral_thorne') {
      return 'admiral_thorne_intro';
    }
    return `${npcId}_default`;
  }

  /**
   * Check for timed story events.
   */
  _checkTimedStoryEvents(playerId, context, deltaMs) {
    // Implementation for time-based story triggers
  }

  /**
   * Update relationship factors based on player actions.
   */
  _updateRelationshipFactors(playerId, context, deltaMs) {
    // Implementation for dynamic relationship tracking
  }
}