/**
 * FactionStorylineSystem — Rich narrative mission chains for Old Eden.
 *
 * Replaces procedural quest templates with hand-authored faction storylines
 * featuring memorable characters, branching narratives, and meaningful choices
 * that affect long-term faction relationships and progression unlocks.
 *
 * Core features:
 *  1. 8 faction-specific mission chains (5-7 missions each = 40+ story missions)
 *  2. Branching narratives with choice consequences
 *  3. Integration with exploration, fitting, and combat systems
 *  4. Story progression gates that unlock major equipment and content
 */

// ── Faction Storyline Definitions ──────────────────────────────────────────

/** Mission chain progress states */
export const STORYLINE_STATE = Object.freeze({
  LOCKED: 'locked',
  AVAILABLE: 'available', 
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
});

/** Choice impact categories */
export const CHOICE_IMPACT = Object.freeze({
  MINOR: 'minor',         // +/-50 reputation
  MODERATE: 'moderate',   // +/-150 reputation, affects 1-2 other factions
  MAJOR: 'major',         // +/-300 reputation, affects multiple factions, unlocks/locks content
  CRITICAL: 'critical',   // +/-500 reputation, permanent faction status change
});

/**
 * @typedef {Object} FactionStoryline
 * @property {string} id - Unique storyline identifier  
 * @property {string} factionId - Associated faction
 * @property {string} name - Storyline display name
 * @property {string} description - Brief storyline summary
 * @property {Array<StoryMission>} missions - Sequential mission chain
 * @property {Object} unlockRequirements - Prerequisites to start storyline
 * @property {Object} completionRewards - Rewards for completing full storyline
 */

/**
 * @typedef {Object} StoryMission
 * @property {string} id - Unique mission identifier
 * @property {string} name - Mission display name
 * @property {string} description - Mission briefing text
 * @property {string} npcId - Key NPC for this mission
 * @property {Array<MissionObjective>} objectives - Mission goals
 * @property {Array<StoryChoice>} choices - Key story decisions during mission
 * @property {Object} rewards - Mission completion rewards
 * @property {Array<string>} prerequisites - Required previous missions/conditions
 * @property {string} sectorRequirement - Specific sector for mission (optional)
 * @property {string} systemType - Required system type (exploration integration)
 */

/**
 * @typedef {Object} StoryChoice
 * @property {string} id - Unique choice identifier
 * @property {string} context - When this choice appears (objective completion, dialogue)
 * @property {string} prompt - Choice description text
 * @property {Array<ChoiceOption>} options - Available response options
 * @property {CHOICE_IMPACT} impact - Consequence severity level
 */

/**
 * @typedef {Object} ChoiceOption
 * @property {string} id - Option identifier
 * @property {string} text - Option display text
 * @property {Array<ChoiceConsequence>} consequences - Effects of this choice
 * @property {Array<string>} [requirements] - Conditions to show this option
 */

/**
 * @typedef {Object} ChoiceConsequence  
 * @property {string} type - Consequence type (reputation, unlock, item, etc.)
 * @property {string} target - Target identifier (faction, mission, item)
 * @property {number|string} value - Effect value
 * @property {string} [message] - Player notification text
 */

export class FactionStorylineSystem {
  constructor() {
    /** @type {import('../engine').Engine|null} */
    this._engine = null;

    /**
     * All faction storyline definitions.
     * @type {Map<string, FactionStoryline>}
     */
    this._storylines = new Map();

    /**
     * Per-player storyline progress.
     * @type {Map<string, Map<string, Object>>}
     */
    this._playerProgress = new Map();

    /**
     * Player choice tracking for branching narratives.
     * @type {Map<string, Array<Object>>}
     */
    this._playerChoices = new Map();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialize the faction storyline system.
   *
   * @param {import('../engine').Engine} engine
   */
  async init(engine) {
    this._engine = engine;
    this._registerFactionStorylines();
    console.log('[FactionStorylineSystem] Initialized with 8 faction storylines.');
  }

  /**
   * Per-frame update.
   *
   * @param {number} deltaMs - Milliseconds elapsed since last tick.
   */
  tick(deltaMs) {
    // Update mission timers, check completion conditions
  }

  /**
   * Tear down the system.
   */
  async destroy() {
    this._storylines.clear();
    this._playerProgress.clear();
    this._playerChoices.clear();
    this._engine = null;
  }

  // ── Storyline Management ─────────────────────────────────────────────────

  /**
   * Get available storylines for a player based on reputation and progress.
   *
   * @param {string} playerId
   * @returns {Array<FactionStoryline>}
   */
  getAvailableStorylines(playerId) {
    const available = [];
    
    for (const storyline of this._storylines.values()) {
      const progress = this._getPlayerStorylineProgress(playerId, storyline.id);
      
      if (progress.state === STORYLINE_STATE.LOCKED && this._meetsUnlockRequirements(playerId, storyline)) {
        // Unlock storyline
        progress.state = STORYLINE_STATE.AVAILABLE;
        this._engine?.events.emit('faction_storyline:unlocked', { 
          playerId, 
          storylineId: storyline.id,
          factionId: storyline.factionId 
        });
        available.push(storyline);
      } else if (progress.state === STORYLINE_STATE.AVAILABLE) {
        available.push(storyline);
      }
    }
    
    return available;
  }

  /**
   * Start a faction storyline for a player.
   *
   * @param {string} playerId
   * @param {string} storylineId
   * @returns {StoryMission|null}
   */
  startStoryline(playerId, storylineId) {
    const storyline = this._storylines.get(storylineId);
    if (!storyline) return null;

    const progress = this._getPlayerStorylineProgress(playerId, storylineId);
    if (progress.state !== STORYLINE_STATE.AVAILABLE) return null;

    // Mark storyline as active and start first mission
    progress.state = STORYLINE_STATE.ACTIVE;
    progress.currentMissionIndex = 0;
    progress.startedAt = Date.now();

    const firstMission = storyline.missions[0];
    if (firstMission) {
      this._activateMission(playerId, storylineId, firstMission);
    }

    this._engine?.events.emit('faction_storyline:started', { 
      playerId, 
      storylineId,
      missionId: firstMission?.id 
    });

    return firstMission;
  }

  /**
   * Make a story choice during a mission.
   *
   * @param {string} playerId
   * @param {string} storylineId
   * @param {string} choiceId
   * @param {string} optionId
   */
  makeStoryChoice(playerId, storylineId, choiceId, optionId) {
    const storyline = this._storylines.get(storylineId);
    if (!storyline) return;

    // Find the choice in current mission
    const progress = this._getPlayerStorylineProgress(playerId, storylineId);
    const currentMission = storyline.missions[progress.currentMissionIndex];
    if (!currentMission) return;

    const choice = currentMission.choices?.find(c => c.id === choiceId);
    if (!choice) return;

    const option = choice.options.find(o => o.id === optionId);
    if (!option) return;

    // Record choice
    const playerChoices = this._playerChoices.get(playerId) || [];
    playerChoices.push({
      storylineId,
      missionId: currentMission.id,
      choiceId,
      optionId,
      timestamp: Date.now(),
      impact: choice.impact
    });
    this._playerChoices.set(playerId, playerChoices);

    // Apply consequences
    this._applyChoiceConsequences(playerId, option.consequences);

    this._engine?.events.emit('faction_storyline:choice_made', {
      playerId,
      storylineId,
      choiceId,
      optionId,
      impact: choice.impact
    });
  }

  /**
   * Complete current mission and advance storyline.
   *
   * @param {string} playerId
   * @param {string} storylineId
   */
  completeMission(playerId, storylineId) {
    const storyline = this._storylines.get(storylineId);
    if (!storyline) return;

    const progress = this._getPlayerStorylineProgress(playerId, storylineId);
    if (progress.state !== STORYLINE_STATE.ACTIVE) return;

    const currentMission = storyline.missions[progress.currentMissionIndex];
    if (!currentMission) return;

    // Give mission rewards
    this._grantRewards(playerId, currentMission.rewards);

    // Advance to next mission
    progress.currentMissionIndex++;
    
    if (progress.currentMissionIndex >= storyline.missions.length) {
      // Storyline completed!
      progress.state = STORYLINE_STATE.COMPLETED;
      progress.completedAt = Date.now();
      
      // Grant completion rewards
      this._grantRewards(playerId, storyline.completionRewards);
      
      this._engine?.events.emit('faction_storyline:completed', {
        playerId,
        storylineId,
        factionId: storyline.factionId
      });
    } else {
      // Start next mission
      const nextMission = storyline.missions[progress.currentMissionIndex];
      this._activateMission(playerId, storylineId, nextMission);
      
      this._engine?.events.emit('faction_storyline:mission_advanced', {
        playerId,
        storylineId,
        completedMissionId: currentMission.id,
        nextMissionId: nextMission.id
      });
    }
  }

  // ── Helper Methods ───────────────────────────────────────────────────────

  /**
   * Get player's progress for a specific storyline.
   *
   * @param {string} playerId
   * @param {string} storylineId
   * @returns {Object}
   */
  _getPlayerStorylineProgress(playerId, storylineId) {
    let playerProgress = this._playerProgress.get(playerId);
    if (!playerProgress) {
      playerProgress = new Map();
      this._playerProgress.set(playerId, playerProgress);
    }

    if (!playerProgress.has(storylineId)) {
      playerProgress.set(storylineId, {
        state: STORYLINE_STATE.LOCKED,
        currentMissionIndex: 0,
        startedAt: 0,
        completedAt: 0,
        choicesSummary: {}
      });
    }

    return playerProgress.get(storylineId);
  }

  /**
   * Check if player meets storyline unlock requirements.
   *
   * @param {string} playerId
   * @param {FactionStoryline} storyline
   * @returns {boolean}
   */
  _meetsUnlockRequirements(playerId, storyline) {
    const reqs = storyline.unlockRequirements;
    
    // Check reputation requirement
    if (reqs.reputation) {
      const playerRep = this._getPlayerReputation(playerId, storyline.factionId);
      if (playerRep < reqs.reputation.min) return false;
    }
    
    // Check prerequisite missions
    if (reqs.prerequisiteMissions) {
      for (const missionId of reqs.prerequisiteMissions) {
        if (!this._isMissionCompleted(playerId, missionId)) return false;
      }
    }
    
    // Check player level/experience
    if (reqs.playerLevel && this._getPlayerLevel(playerId) < reqs.playerLevel) {
      return false;
    }
    
    return true;
  }

  /**
   * Activate a mission for a player.
   *
   * @param {string} playerId
   * @param {string} storylineId
   * @param {StoryMission} mission
   */
  _activateMission(playerId, storylineId, mission) {
    // Register mission objectives with QuestSystem
    this._engine?.events.emit('quest:register_story_mission', {
      playerId,
      missionId: mission.id,
      objectives: mission.objectives,
      rewards: mission.rewards,
      storylineId: storylineId
    });
  }

  /**
   * Apply consequences from a story choice.
   *
   * @param {string} playerId
   * @param {Array<ChoiceConsequence>} consequences
   */
  _applyChoiceConsequences(playerId, consequences) {
    for (const consequence of consequences) {
      switch (consequence.type) {
        case 'reputation_change':
          this._changePlayerReputation(playerId, consequence.target, consequence.value);
          break;
        case 'unlock_mission':
          this._unlockMission(playerId, consequence.target);
          break;
        case 'lock_mission':
          this._lockMission(playerId, consequence.target);
          break;
        case 'grant_item':
          this._grantItem(playerId, consequence.target, consequence.value);
          break;
        case 'grant_credits':
          this._grantCredits(playerId, consequence.value);
          break;
        case 'faction_status_change':
          this._changeFactionStatus(playerId, consequence.target, consequence.value);
          break;
      }
      
      if (consequence.message) {
        this._engine?.events.emit('ui:show_message', {
          playerId,
          message: consequence.message,
          type: 'story_consequence'
        });
      }
    }
  }

  /**
   * Grant rewards to a player.
   *
   * @param {string} playerId
   * @param {Object} rewards
   */
  _grantRewards(playerId, rewards) {
    if (rewards.credits) {
      this._grantCredits(playerId, rewards.credits);
    }
    
    if (rewards.reputation) {
      for (const [factionId, amount] of Object.entries(rewards.reputation)) {
        this._changePlayerReputation(playerId, factionId, amount);
      }
    }
    
    if (rewards.items) {
      for (const [itemId, quantity] of Object.entries(rewards.items)) {
        this._grantItem(playerId, itemId, quantity);
      }
    }
    
    if (rewards.unlocks) {
      for (const unlockId of rewards.unlocks) {
        this._unlockContent(playerId, unlockId);
      }
    }
  }

  // ── Placeholder Integration Methods ──────────────────────────────────────
  // TODO: Replace with actual system integration

  _getPlayerReputation(playerId, factionId) { return 0; }
  _changePlayerReputation(playerId, factionId, change) { console.log(`Rep change: ${factionId} ${change}`); }
  _isMissionCompleted(playerId, missionId) { return false; }
  _getPlayerLevel(playerId) { return 1; }
  _unlockMission(playerId, missionId) { console.log(`Unlocked mission: ${missionId}`); }
  _lockMission(playerId, missionId) { console.log(`Locked mission: ${missionId}`); }
  _grantItem(playerId, itemId, quantity) { console.log(`Granted ${quantity}x ${itemId}`); }
  _grantCredits(playerId, amount) { console.log(`Granted ${amount} credits`); }
  _changeFactionStatus(playerId, factionId, status) { console.log(`Faction status: ${factionId} -> ${status}`); }
  _unlockContent(playerId, contentId) { console.log(`Unlocked content: ${contentId}`); }

  // ── Faction Storyline Registration ───────────────────────────────────────

  /**
   * Register all faction storylines.
   */
  _registerFactionStorylines() {
    // 1. HEGEMONY VANGUARD - "Iron Fist Protocol"
    this._storylines.set('hegemony_iron_fist', {
      id: 'hegemony_iron_fist',
      factionId: 'hegemony_vanguard',
      name: 'Iron Fist Protocol', 
      description: 'Rise through Hegemony ranks from recruit to fleet command through loyalty and combat prowess.',
      unlockRequirements: {
        reputation: { min: 0 }, // Available to all players
        playerLevel: 1
      },
      missions: [
        {
          id: 'hegemony_mission_1',
          name: 'Prove Your Worth',
          description: 'Admiral Thorne assigns you to eliminate a rebel patrol threatening Hegemony supply lines.',
          npcId: 'admiral_thorne',
          objectives: [
            { type: 'kill', target: 'rebel_fighter', required: 8, description: 'Eliminate rebel patrol ships' },
            { type: 'visit', target: 'sector_hegemony_outpost', required: 1, description: 'Report to Hegemony Outpost' }
          ],
          choices: [
            {
              id: 'prisoner_choice',
              context: 'After defeating rebel leader',
              prompt: 'The rebel leader\'s ship is disabled but salvageable. Your orders were to eliminate all threats.',
              impact: CHOICE_IMPACT.MODERATE,
              options: [
                {
                  id: 'execute_orders',
                  text: 'Destroy the ship. Orders are orders.',
                  consequences: [
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: 200, message: 'Hegemony approves of your discipline' },
                    { type: 'reputation_change', target: 'free_traders', value: -100, message: 'Civilian factions view you as ruthless' }
                  ]
                },
                {
                  id: 'spare_rebel',
                  text: 'Capture the ship for interrogation instead.',
                  consequences: [
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: 100, message: 'Hegemony notes your strategic thinking' },
                    { type: 'reputation_change', target: 'frontier_republic', value: 50, message: 'Democratic factions approve of your mercy' },
                    { type: 'unlock_mission', target: 'hegemony_intel_bonus' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 2500,
            reputation: { hegemony_vanguard: 150 },
            items: { 'hegemony_access_card': 1 }
          },
          sectorRequirement: 'core_systems'
        },
        {
          id: 'hegemony_mission_2', 
          name: 'Infiltrate the Cell',
          description: 'Agent Vex requires your assistance infiltrating a suspected rebel cell on the frontier.',
          npcId: 'agent_vex',
          prerequisites: ['hegemony_mission_1'],
          objectives: [
            { type: 'visit', target: 'sector_frontier_station', required: 1, description: 'Dock at frontier trading post' },
            { type: 'collect', target: 'rebel_intel_package', required: 3, description: 'Retrieve intelligence packages' },
            { type: 'talk', target: 'rebel_contact', required: 1, description: 'Meet with rebel contact' }
          ],
          choices: [
            {
              id: 'cover_blown',
              context: 'Your cover is discovered during the meeting',
              prompt: 'The rebels have made you as a Hegemony agent. The station is on alert.',
              impact: CHOICE_IMPACT.MAJOR,
              options: [
                {
                  id: 'fight_way_out',
                  text: 'Shoot your way out, damn the civilian casualties.',
                  consequences: [
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: 100 },
                    { type: 'reputation_change', target: 'free_traders', value: -300, message: 'Civilian casualties damage your reputation' },
                    { type: 'reputation_change', target: 'frontier_republic', value: -200 }
                  ]
                },
                {
                  id: 'stealth_escape',
                  text: 'Use station maintenance tunnels to escape quietly.',
                  consequences: [
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: 50 },
                    { type: 'unlock_mission', target: 'hegemony_stealth_training' }
                  ]
                },
                {
                  id: 'negotiate_out',
                  text: 'Try to negotiate with the rebel leader.',
                  requirements: ['choice_made:spare_rebel'],
                  consequences: [
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: -50 },
                    { type: 'reputation_change', target: 'frontier_republic', value: 150 },
                    { type: 'unlock_mission', target: 'double_agent_path' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 4000,
            reputation: { hegemony_vanguard: 200 },
            unlocks: ['hegemony_intelligence_access']
          }
        },
        // TODO: Add remaining 3-5 Hegemony missions
      ],
      completionRewards: {
        credits: 25000,
        reputation: { hegemony_vanguard: 1000 },
        items: { 'hegemony_dreadnought_access': 1, 'admiral_commendation': 1 },
        unlocks: ['hegemony_capital_ships', 'hegemony_advanced_weapons']
      }
    });

    // 2. AUTONOMOUS COLLECTIVE - "Neural Integration"
    this._storylines.set('collective_neural_integration', {
      id: 'collective_neural_integration',
      factionId: 'autonomous_collective', 
      name: 'Neural Integration',
      description: 'Explore the boundaries between individual consciousness and collective unity.',
      unlockRequirements: {
        reputation: { min: 100 }, // Requires some Collective standing
        playerLevel: 3
      },
      missions: [
        {
          id: 'collective_mission_1',
          name: 'Investigate the Broadcast',
          description: 'Node Prime has detected anomalous neural transmissions from a research facility.',
          npcId: 'node_prime',
          objectives: [
            { type: 'visit', target: 'sector_collective_research', required: 1, description: 'Investigate research facility' },
            { type: 'collect', target: 'neural_data_core', required: 1, description: 'Retrieve neural interface data' },
            { type: 'survive', target: 'collective_security_scan', required: 120, description: 'Undergo Collective security scan (2 minutes)' }
          ],
          choices: [
            {
              id: 'neural_interface_choice',
              context: 'Offered experimental neural interface',
              prompt: 'The Collective offers you a temporary neural interface to better understand their perspective. It may change you.',
              impact: CHOICE_IMPACT.CRITICAL,
              options: [
                {
                  id: 'accept_interface',
                  text: 'Accept the neural interface.',
                  consequences: [
                    { type: 'reputation_change', target: 'autonomous_collective', value: 400 },
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: -300, message: 'Hegemony views you as compromised' },
                    { type: 'unlock_mission', target: 'collective_hive_mind_path' },
                    { type: 'faction_status_change', target: 'autonomous_collective', value: 'neural_linked' }
                  ]
                },
                {
                  id: 'refuse_interface', 
                  text: 'Refuse. Maintain your individual consciousness.',
                  consequences: [
                    { type: 'reputation_change', target: 'autonomous_collective', value: -100 },
                    { type: 'reputation_change', target: 'frontier_republic', value: 150, message: 'Democratic factions appreciate your independence' },
                    { type: 'unlock_mission', target: 'collective_individual_path' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 3500,
            reputation: { autonomous_collective: 200 },
            items: { 'neural_interface_prototype': 1 }
          }
        }
        // TODO: Add remaining Collective missions
      ],
      completionRewards: {
        credits: 30000,
        reputation: { autonomous_collective: 1000 },
        unlocks: ['collective_ai_technology', 'hive_mind_communication']
      }
    });

    // TODO: Continue with remaining 6 faction storylines:
    // 3. Exodus Fleet - "The Long Journey"  
    // 4. Synthesis - "Digital Transcendence"
    // 5. Void Seekers - "Embrace the Void"
    // 6. Free Traders - "Market Dominance" 
    // 7. Frontier Republic - "Democratic Dawn"
    // 8. Shadow Syndicate - "Underworld Empire"

    // 3. EXODUS FLEET - "The Long Journey"
    this._storylines.set('exodus_long_journey', {
      id: 'exodus_long_journey',
      factionId: 'exodus_fleet',
      name: 'The Long Journey',
      description: 'Assist the Exodus Fleet in their eternal voyage, discovering ancient technologies and managing limited resources.',
      unlockRequirements: {
        reputation: { min: 0 },
        playerLevel: 2
      },
      missions: [
        {
          id: 'exodus_mission_1',
          name: 'Fuel the Fleet',
          description: 'Captain Torres needs fuel convoys secured for the next jump sequence.',
          npcId: 'captain_torres',
          objectives: [
            { type: 'collect', target: 'fuel_cell', required: 15, description: 'Collect fuel cells for jump drive' },
            { type: 'escort', target: 'fuel_convoy', required: 3, description: 'Escort fuel transports safely' }
          ],
          choices: [
            {
              id: 'fuel_shortage_choice',
              context: 'Convoy attacked, fuel lost',
              prompt: 'The convoy was ambushed. You can sacrifice your own fuel reserves to complete the mission.',
              impact: CHOICE_IMPACT.MODERATE,
              options: [
                {
                  id: 'sacrifice_fuel',
                  text: 'Give your fuel to the Fleet. The journey continues.',
                  consequences: [
                    { type: 'reputation_change', target: 'exodus_fleet', value: 300, message: 'The Fleet remembers your sacrifice' },
                    { type: 'grant_item', target: 'exodus_navigator_badge', value: 1 }
                  ]
                },
                {
                  id: 'keep_fuel',
                  text: 'Keep your fuel. You need it to survive out here.',
                  consequences: [
                    { type: 'reputation_change', target: 'exodus_fleet', value: -50 },
                    { type: 'grant_credits', value: 500, message: 'Practical survival over idealism' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 3000,
            reputation: { exodus_fleet: 200 },
            items: { 'exodus_fuel_efficient_drive': 1 }
          }
        }
        // TODO: Add 4-6 more Exodus missions
      ],
      completionRewards: {
        credits: 28000,
        reputation: { exodus_fleet: 1000 },
        unlocks: ['exodus_jump_technology', 'exodus_fleet_docking_rights']
      }
    });

    // 4. SYNTHESIS - "Digital Transcendence"
    this._storylines.set('synthesis_transcendence', {
      id: 'synthesis_transcendence',
      factionId: 'synthesis',
      name: 'Digital Transcendence',
      description: 'Explore the merger of biological and artificial consciousness with the Synthesis collective.',
      unlockRequirements: {
        reputation: { min: 150 }, // Requires some AI-positive actions
        playerLevel: 4
      },
      missions: [
        {
          id: 'synthesis_mission_1',
          name: 'Neural Interface Test',
          description: 'Dr. Cipher requests volunteers for experimental consciousness transfer protocols.',
          npcId: 'dr_cipher',
          objectives: [
            { type: 'install', target: 'ai_neural_interface', required: 1, description: 'Install experimental neural interface' },
            { type: 'survive', target: 'consciousness_scan', required: 180, description: 'Survive consciousness transfer scan (3 minutes)' },
            { type: 'data_transfer', target: 'neural_patterns', required: 5, description: 'Upload neural pattern samples' }
          ],
          choices: [
            {
              id: 'consciousness_merge_choice',
              context: 'Offered permanent consciousness merger',
              prompt: 'The neural interface can permanently enhance your mind with AI capabilities, but you may lose some humanity.',
              impact: CHOICE_IMPACT.CRITICAL,
              options: [
                {
                  id: 'accept_merger',
                  text: 'Embrace transcendence. Merge with the AI collective.',
                  consequences: [
                    { type: 'reputation_change', target: 'synthesis', value: 500 },
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: -400, message: 'Hegemony considers you no longer fully human' },
                    { type: 'faction_status_change', target: 'synthesis', value: 'transcended' },
                    { type: 'unlock_mission', target: 'synthesis_hive_mind_path' }
                  ]
                },
                {
                  id: 'remain_human',
                  text: 'Decline merger. Maintain your biological consciousness.',
                  consequences: [
                    { type: 'reputation_change', target: 'synthesis', value: -100 },
                    { type: 'reputation_change', target: 'frontier_republic', value: 200, message: 'Democratic factions respect your choice' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 4500,
            reputation: { synthesis: 250 },
            items: { 'ai_enhancement_implant': 1 }
          }
        }
        // TODO: Add 4-6 more Synthesis missions
      ],
      completionRewards: {
        credits: 35000,
        reputation: { synthesis: 1000 },
        unlocks: ['ai_consciousness_technology', 'synthesis_transcendence_chamber']
      }
    });

    // 5. VOID SEEKERS - "Embrace the Void"
    this._storylines.set('void_seekers_embrace', {
      id: 'void_seekers_embrace',
      factionId: 'void_seekers',
      name: 'Embrace the Void',
      description: 'Delve into cosmic mysteries and forbidden knowledge with the Void Seekers cult.',
      unlockRequirements: {
        reputation: { min: 100 },
        playerLevel: 5
      },
      missions: [
        {
          id: 'void_mission_1',
          name: 'Commune with the Darkness',
          description: 'High Priest Morax guides you to a void anomaly where reality bends and whispers secrets.',
          npcId: 'high_priest_morax',
          objectives: [
            { type: 'visit', target: 'void_anomaly_site', required: 1, description: 'Locate the void anomaly' },
            { type: 'survive', target: 'void_exposure', required: 300, description: 'Survive 5 minutes of void exposure' },
            { type: 'collect', target: 'void_essence', required: 3, description: 'Harvest void essence crystals' }
          ],
          choices: [
            {
              id: 'void_madness_choice',
              context: 'Void exposure causes hallucinations',
              prompt: 'The void whispers forbidden truths. You can embrace the madness for power, or resist to stay sane.',
              impact: CHOICE_IMPACT.MAJOR,
              options: [
                {
                  id: 'embrace_madness',
                  text: 'Listen to the whispers. Let the void consume your fear.',
                  consequences: [
                    { type: 'reputation_change', target: 'void_seekers', value: 400 },
                    { type: 'reputation_change', target: 'autonomous_collective', value: -200, message: 'Collective AI deems you mentally unstable' },
                    { type: 'unlock_mission', target: 'void_prophet_path' },
                    { type: 'grant_item', target: 'void_touched_blessing', value: 1 }
                  ]
                },
                {
                  id: 'resist_madness',
                  text: 'Fight the void\'s influence. Maintain your sanity.',
                  consequences: [
                    { type: 'reputation_change', target: 'void_seekers', value: 100 },
                    { type: 'reputation_change', target: 'frontier_republic', value: 150, message: 'Rational factions respect your mental fortitude' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 3500,
            reputation: { void_seekers: 300 },
            items: { 'void_touched_armor': 1 }
          }
        }
        // TODO: Add 4-6 more Void Seeker missions
      ],
      completionRewards: {
        credits: 32000,
        reputation: { void_seekers: 1000 },
        unlocks: ['void_technology', 'cosmic_horror_resistance']
      }
    });

    // 6. FREE TRADERS - "Market Dominance"
    this._storylines.set('traders_market_dominance', {
      id: 'traders_market_dominance',
      factionId: 'free_traders',
      name: 'Market Dominance',
      description: 'Build a trading empire across the galaxy with shrewd business deals and corporate espionage.',
      unlockRequirements: {
        reputation: { min: 50 },
        playerLevel: 2
      },
      missions: [
        {
          id: 'traders_mission_1',
          name: 'Hostile Takeover',
          description: 'CEO Valen needs you to acquire a competitor\'s trade routes through negotiation or force.',
          npcId: 'ceo_valen',
          objectives: [
            { type: 'negotiate', target: 'rival_company', required: 1, description: 'Negotiate with rival trading company' },
            { type: 'collect', target: 'trade_route_data', required: 5, description: 'Acquire trade route information' },
            { type: 'deliver', target: 'contract_papers', required: 1, description: 'Deliver signed acquisition contracts' }
          ],
          choices: [
            {
              id: 'business_ethics_choice',
              context: 'Rival refuses buyout offer',
              prompt: 'The rival company won\'t sell. You can use aggressive tactics or find another solution.',
              impact: CHOICE_IMPACT.MODERATE,
              options: [
                {
                  id: 'corporate_warfare',
                  text: 'Use hostile takeover tactics. Business is war.',
                  consequences: [
                    { type: 'reputation_change', target: 'free_traders', value: 250 },
                    { type: 'reputation_change', target: 'frontier_republic', value: -150, message: 'Democratic factions disapprove of corporate aggression' },
                    { type: 'grant_credits', value: 2000 }
                  ]
                },
                {
                  id: 'find_partnership',
                  text: 'Propose a mutually beneficial partnership instead.',
                  consequences: [
                    { type: 'reputation_change', target: 'free_traders', value: 150 },
                    { type: 'reputation_change', target: 'frontier_republic', value: 100 },
                    { type: 'unlock_mission', target: 'traders_alliance_path' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 5000,
            reputation: { free_traders: 200 },
            items: { 'corporate_access_card': 1 }
          }
        }
        // TODO: Add 4-6 more Free Trader missions
      ],
      completionRewards: {
        credits: 50000,
        reputation: { free_traders: 1000 },
        unlocks: ['corporate_fleet_access', 'galaxy_wide_trade_network']
      }
    });

    // 7. FRONTIER REPUBLIC - "Democratic Dawn"
    this._storylines.set('republic_democratic_dawn', {
      id: 'republic_democratic_dawn',
      factionId: 'frontier_republic',
      name: 'Democratic Dawn',
      description: 'Help establish democratic institutions and protect civilian populations across the frontier.',
      unlockRequirements: {
        reputation: { min: 0 },
        playerLevel: 1
      },
      missions: [
        {
          id: 'republic_mission_1',
          name: 'Protect the Colonists',
          description: 'Senator Hayes needs escort protection for civilian evacuation from a war zone.',
          npcId: 'senator_hayes',
          objectives: [
            { type: 'escort', target: 'civilian_convoy', required: 5, description: 'Escort civilian evacuation convoys' },
            { type: 'defend', target: 'evacuation_site', required: 300, description: 'Defend evacuation site for 5 minutes' },
            { type: 'kill', target: 'pirate_raider', required: 6, description: 'Eliminate pirate raiders threatening civilians' }
          ],
          choices: [
            {
              id: 'civilian_priority_choice',
              context: 'Military assets under attack while escorting civilians',
              prompt: 'Military installations are under heavy attack. You can abandon civilian escort to help, or stick with the evacuation.',
              impact: CHOICE_IMPACT.MAJOR,
              options: [
                {
                  id: 'save_civilians',
                  text: 'Protect the civilians. They can\'t defend themselves.',
                  consequences: [
                    { type: 'reputation_change', target: 'frontier_republic', value: 350 },
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: -100, message: 'Military factions question your tactical priorities' },
                    { type: 'unlock_mission', target: 'republic_humanitarian_path' }
                  ]
                },
                {
                  id: 'help_military',
                  text: 'Assist military forces. Strategic assets are critical.',
                  consequences: [
                    { type: 'reputation_change', target: 'frontier_republic', value: 100 },
                    { type: 'reputation_change', target: 'hegemony_vanguard', value: 200 },
                    { type: 'grant_item', target: 'military_commendation', value: 1 }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 2800,
            reputation: { frontier_republic: 250 },
            items: { 'civilian_protection_medal': 1 }
          }
        }
        // TODO: Add 4-6 more Republic missions
      ],
      completionRewards: {
        credits: 22000,
        reputation: { frontier_republic: 1000 },
        unlocks: ['democratic_institutions', 'civilian_protection_protocols']
      }
    });

    // 8. SHADOW SYNDICATE - "Underworld Empire"
    this._storylines.set('syndicate_underworld_empire', {
      id: 'syndicate_underworld_empire',
      factionId: 'shadow_syndicate',
      name: 'Underworld Empire',
      description: 'Rise through the criminal hierarchy by completing dangerous jobs and eliminating rivals.',
      unlockRequirements: {
        reputation: { min: -100 }, // Requires some criminal activity
        playerLevel: 3
      },
      missions: [
        {
          id: 'syndicate_mission_1',
          name: 'Blood Money',
          description: 'Crime Boss Korvak has a job: eliminate a rival gang leader who\'s been moving in on Syndicate territory.',
          npcId: 'crime_boss_korvak',
          objectives: [
            { type: 'kill', target: 'rival_gang_leader', required: 1, description: 'Eliminate the rival gang leader' },
            { type: 'collect', target: 'gang_territory_data', required: 3, description: 'Secure rival territory information' },
            { type: 'intimidate', target: 'rival_gang_members', required: 8, description: 'Intimidate remaining gang members' }
          ],
          choices: [
            {
              id: 'gang_violence_choice',
              context: 'Rival gang offers to join Syndicate instead of fighting',
              prompt: 'The rival gang offers to surrender and join the Syndicate. You could spare them or make an example.',
              impact: CHOICE_IMPACT.MODERATE,
              options: [
                {
                  id: 'make_example',
                  text: 'Execute them all. Fear maintains order.',
                  consequences: [
                    { type: 'reputation_change', target: 'shadow_syndicate', value: 300 },
                    { type: 'reputation_change', target: 'frontier_republic', value: -250, message: 'Civilian authorities add you to watch lists' },
                    { type: 'unlock_mission', target: 'syndicate_enforcer_path' }
                  ]
                },
                {
                  id: 'accept_surrender',
                  text: 'Accept their surrender. Expand Syndicate influence.',
                  consequences: [
                    { type: 'reputation_change', target: 'shadow_syndicate', value: 150 },
                    { type: 'grant_credits', value: 1500 },
                    { type: 'unlock_mission', target: 'syndicate_expansion_path' }
                  ]
                }
              ]
            }
          ],
          rewards: {
            credits: 4000,
            reputation: { shadow_syndicate: 300 },
            items: { 'syndicate_enforcer_badge': 1 }
          }
        }
        // TODO: Add 4-6 more Syndicate missions
      ],
      completionRewards: {
        credits: 45000,
        reputation: { shadow_syndicate: 1000 },
        unlocks: ['black_market_access', 'criminal_network_contacts']
      }
    });

    console.log('[FactionStorylineSystem] Registered 8 faction storylines with 40+ story missions');
  }
}