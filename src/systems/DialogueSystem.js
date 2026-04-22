/**
 * DialogueSystem — NPC personality and dialogue management for Old Eden.
 *
 * Transforms invisible NPCs into memorable characters with faction-specific
 * personalities, dialogue trees, and meaningful story interactions.
 *
 * Core features:
 *  1. NPC personality traits and faction-appropriate dialogue
 *  2. Reputation-gated dialogue options and responses
 *  3. Choice tracking that affects future conversations and storylines
 *  4. Dynamic dialogue generation based on story state and relationships
 *  5. Voice/personality indicators for each major NPC character
 */

// ── NPC Personality Types ──────────────────────────────────────────────────

/** NPC personality archetypes with faction alignments */
export const PERSONALITY_TYPES = Object.freeze({
  // Hegemony personalities
  MILITARY_COMMANDER: 'military_commander',
  INTELLIGENCE_AGENT: 'intelligence_agent',
  VETERAN_SOLDIER: 'veteran_soldier',
  
  // Collective personalities
  HIVE_NODE: 'hive_node',
  COLLECTIVE_SYMPATHIZER: 'collective_sympathizer',
  NEURAL_RESEARCHER: 'neural_researcher',
  
  // Exodus Fleet personalities
  FLEET_CAPTAIN: 'fleet_captain',
  SURVIVAL_ENGINEER: 'survival_engineer',
  CONVOY_COORDINATOR: 'convoy_coordinator',
  
  // Synthesis personalities
  AI_ENTITY: 'ai_entity',
  TECH_RESEARCHER: 'tech_researcher',
  CYBORG_HYBRID: 'cyborg_hybrid',
  
  // Void Seekers personalities
  DEATH_PRIEST: 'death_priest',
  VOID_ACOLYTE: 'void_acolyte',
  COSMIC_MYSTIC: 'cosmic_mystic',
  
  // Free Traders personalities
  MERCHANT_PRINCE: 'merchant_prince',
  TRADE_NEGOTIATOR: 'trade_negotiator',
  SMUGGLER_CAPTAIN: 'smuggler_captain',
  
  // Frontier Republic personalities
  DEMOCRATIC_SENATOR: 'democratic_senator',
  LAW_ENFORCER: 'law_enforcer',
  COLONIAL_ADMINISTRATOR: 'colonial_administrator',
  
  // Shadow Syndicate personalities
  CRIME_BOSS: 'crime_boss',
  INFORMATION_BROKER: 'information_broker',
  BLACK_MARKET_DEALER: 'black_market_dealer',
});

/** Dialogue response mood indicators */
export const DIALOGUE_MOODS = Object.freeze({
  FRIENDLY: 'friendly',
  NEUTRAL: 'neutral',
  SUSPICIOUS: 'suspicious',
  HOSTILE: 'hostile',
  RESPECTFUL: 'respectful',
  DISMISSIVE: 'dismissive',
  INTIMIDATING: 'intimidating',
  PLEADING: 'pleading',
});

/** Choice consequence types */
export const CHOICE_CONSEQUENCES = Object.freeze({
  REPUTATION_CHANGE: 'reputation_change',
  UNLOCK_MISSION: 'unlock_mission',
  LOCK_MISSION: 'lock_mission',
  RELATIONSHIP_CHANGE: 'relationship_change',
  FACTION_STATUS: 'faction_status',
  ITEM_REWARD: 'item_reward',
  CREDITS_REWARD: 'credits_reward',
});

// ── Dialogue System ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} DialogueNode
 * @property {string} id - Unique node identifier
 * @property {string} speaker - NPC ID or name
 * @property {string} text - Dialogue text
 * @property {DIALOGUE_MOODS} mood - Speaker's mood/tone
 * @property {Array<DialogueChoice>} choices - Available player responses
 * @property {Array<string>} [conditions] - Requirements to show this node
 * @property {Array<DialogueConsequence>} [consequences] - Effects when node is shown
 */

/**
 * @typedef {Object} DialogueChoice
 * @property {string} id - Unique choice identifier
 * @property {string} text - Choice text shown to player
 * @property {string} nextNode - Next dialogue node ID
 * @property {Array<string>} [conditions] - Requirements to show this choice
 * @property {Array<DialogueConsequence>} [consequences] - Effects when choice is selected
 */

/**
 * @typedef {Object} DialogueConsequence
 * @property {CHOICE_CONSEQUENCES} type - Type of consequence
 * @property {string} target - Target faction/NPC/mission ID
 * @property {number|string} value - Effect value
 * @property {string} [message] - Optional player notification
 */

/**
 * @typedef {Object} NPCPersonality
 * @property {string} id - Unique NPC identifier
 * @property {string} name - Display name
 * @property {string} title - Role/occupation
 * @property {PERSONALITY_TYPES} personality - Personality archetype
 * @property {string} faction - Primary faction allegiance
 * @property {string} description - Character description
 * @property {Object} relationships - Relationship values to other factions
 * @property {Array<string>} greetings - Contextual greeting messages
 * @property {Array<string>} farewells - Contextual farewell messages
 * @property {Object} voiceStyle - Voice/speech pattern indicators
 */

export class DialogueSystem {
  constructor() {
    /** @type {import('../engine').Engine|null} */
    this._engine = null;

    /**
     * Registry of NPC personalities keyed by NPC ID.
     * @type {Map<string, NPCPersonality>}
     */
    this._npcs = new Map();

    /**
     * Registry of dialogue trees keyed by conversation ID.
     * @type {Map<string, Map<string, DialogueNode>>}
     */
    this._dialogues = new Map();

    /**
     * Player choice history for relationship tracking.
     * @type {Map<string, Array<string>>}
     */
    this._choiceHistory = new Map();

    /**
     * Per-NPC conversation state.
     * @type {Map<string, Object>}
     */
    this._conversationStates = new Map();
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Initialize the dialogue system with the game engine reference.
   *
   * @param {import('../engine').Engine} engine
   */
  async init(engine) {
    this._engine = engine;
    this._registerDefaultNPCs();
    this._registerDefaultDialogues();
    console.log('[DialogueSystem] Initialized with personalities and dialogue trees.');
  }

  /**
   * Per-frame update.
   *
   * @param {number} deltaMs - Milliseconds elapsed since last tick.
   */
  tick(deltaMs) {
    // Update conversation timers, relationship decay, etc.
  }

  /**
   * Tear down the system and release resources.
   */
  async destroy() {
    this._npcs.clear();
    this._dialogues.clear();
    this._choiceHistory.clear();
    this._conversationStates.clear();
    this._engine = null;
  }

  // ── NPC Personality Management ───────────────────────────────────────────

  /**
   * Register an NPC personality.
   *
   * @param {NPCPersonality} personality
   */
  registerNPC(personality) {
    this._npcs.set(personality.id, personality);
    this._engine?.events.emit('dialogue:npc_registered', { npcId: personality.id });
  }

  /**
   * Get NPC personality by ID.
   *
   * @param {string} npcId
   * @returns {NPCPersonality|null}
   */
  getNPC(npcId) {
    return this._npcs.get(npcId) || null;
  }

  /**
   * Get contextual greeting for an NPC based on player reputation and story state.
   *
   * @param {string} npcId
   * @param {string} playerId
   * @returns {string}
   */
  getGreeting(npcId, playerId) {
    const npc = this._npcs.get(npcId);
    if (!npc) return "Hello, pilot.";

    const rep = this._getPlayerReputation(playerId, npc.faction);
    const greetings = npc.greetings || ["Greetings, pilot."];

    // Select greeting based on reputation
    if (rep >= 500) return greetings[0] || "Welcome, honored ally!";
    if (rep >= 100) return greetings[1] || "Good to see you, pilot.";
    if (rep >= -100) return greetings[2] || "Pilot.";
    if (rep >= -500) return greetings[3] || "What do you want?";
    return greetings[4] || "You're not welcome here.";
  }

  // ── Dialogue Tree Management ─────────────────────────────────────────────

  /**
   * Register a dialogue tree for a conversation.
   *
   * @param {string} conversationId
   * @param {Map<string, DialogueNode>} nodeMap
   */
  registerDialogue(conversationId, nodeMap) {
    this._dialogues.set(conversationId, nodeMap);
  }

  /**
   * Start a conversation with an NPC.
   *
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} conversationId
   * @returns {DialogueNode|null}
   */
  startConversation(playerId, npcId, conversationId) {
    const dialogue = this._dialogues.get(conversationId);
    if (!dialogue) return null;

    const startNode = dialogue.get('start') || dialogue.values().next().value;
    if (!startNode) return null;

    // Check conditions and apply consequences
    if (!this._checkConditions(playerId, npcId, startNode.conditions)) {
      return null;
    }

    this._applyConsequences(playerId, npcId, startNode.consequences);

    // Update conversation state
    this._conversationStates.set(`${playerId}-${npcId}`, {
      conversationId,
      currentNode: startNode.id,
      startTime: Date.now(),
    });

    return startNode;
  }

  /**
   * Make a dialogue choice and get the next node.
   *
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} choiceId
   * @returns {DialogueNode|null}
   */
  makeChoice(playerId, npcId, choiceId) {
    const conversationKey = `${playerId}-${npcId}`;
    const state = this._conversationStates.get(conversationKey);
    if (!state) return null;

    const dialogue = this._dialogues.get(state.conversationId);
    if (!dialogue) return null;

    const currentNode = dialogue.get(state.currentNode);
    if (!currentNode) return null;

    // Find the selected choice
    const choice = currentNode.choices?.find(c => c.id === choiceId);
    if (!choice) return null;

    // Check choice conditions
    if (!this._checkConditions(playerId, npcId, choice.conditions)) {
      return null;
    }

    // Apply choice consequences
    this._applyConsequences(playerId, npcId, choice.consequences);

    // Record choice in history
    const history = this._choiceHistory.get(playerId) || [];
    history.push(`${npcId}:${choiceId}`);
    this._choiceHistory.set(playerId, history.slice(-100)); // Keep last 100 choices

    // Get next node
    const nextNode = dialogue.get(choice.nextNode);
    if (!nextNode) {
      // End conversation
      this._conversationStates.delete(conversationKey);
      return null;
    }

    // Check next node conditions
    if (!this._checkConditions(playerId, npcId, nextNode.conditions)) {
      this._conversationStates.delete(conversationKey);
      return null;
    }

    // Apply next node consequences
    this._applyConsequences(playerId, npcId, nextNode.consequences);

    // Update conversation state
    state.currentNode = nextNode.id;

    return nextNode;
  }

  // ── Condition & Consequence System ───────────────────────────────────────

  /**
   * Check if all conditions are met.
   *
   * @param {string} playerId
   * @param {string} npcId
   * @param {Array<string>} [conditions]
   * @returns {boolean}
   */
  _checkConditions(playerId, npcId, conditions) {
    if (!conditions || conditions.length === 0) return true;

    for (const condition of conditions) {
      if (!this._checkSingleCondition(playerId, npcId, condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check a single condition string.
   *
   * @param {string} playerId
   * @param {string} npcId
   * @param {string} condition
   * @returns {boolean}
   */
  _checkSingleCondition(playerId, npcId, condition) {
    // Parse condition format: "reputation:hegemony_vanguard:>=:100"
    const parts = condition.split(':');
    
    switch (parts[0]) {
      case 'reputation': {
        const faction = parts[1];
        const operator = parts[2];
        const value = parseInt(parts[3]);
        const playerRep = this._getPlayerReputation(playerId, faction);
        return this._evaluateComparison(playerRep, operator, value);
      }
      
      case 'quest_completed': {
        const questId = parts[1];
        return this._isQuestCompleted(playerId, questId);
      }
      
      case 'choice_made': {
        const choicePattern = parts[1];
        const history = this._choiceHistory.get(playerId) || [];
        return history.some(choice => choice.includes(choicePattern));
      }
      
      case 'faction_status': {
        const faction = parts[1];
        const status = parts[2];
        return this._getFactionStatus(playerId, faction) === status;
      }
      
      default:
        return true;
    }
  }

  /**
   * Apply consequences from dialogue choices.
   *
   * @param {string} playerId
   * @param {string} npcId
   * @param {Array<DialogueConsequence>} [consequences]
   */
  _applyConsequences(playerId, npcId, consequences) {
    if (!consequences) return;

    for (const consequence of consequences) {
      switch (consequence.type) {
        case CHOICE_CONSEQUENCES.REPUTATION_CHANGE:
          this._changeReputation(playerId, consequence.target, consequence.value);
          if (consequence.message) {
            this._engine?.events.emit('dialogue:reputation_changed', {
              playerId,
              faction: consequence.target,
              change: consequence.value,
              message: consequence.message,
            });
          }
          break;

        case CHOICE_CONSEQUENCES.UNLOCK_MISSION:
          this._engine?.events.emit('quest:unlock', {
            playerId,
            questId: consequence.target,
          });
          break;

        case CHOICE_CONSEQUENCES.LOCK_MISSION:
          this._engine?.events.emit('quest:lock', {
            playerId,
            questId: consequence.target,
          });
          break;

        case CHOICE_CONSEQUENCES.ITEM_REWARD:
          this._engine?.events.emit('player:receive_item', {
            playerId,
            itemId: consequence.target,
            quantity: consequence.value,
          });
          break;

        case CHOICE_CONSEQUENCES.CREDITS_REWARD:
          this._engine?.events.emit('player:receive_credits', {
            playerId,
            amount: consequence.value,
          });
          break;
      }
    }
  }

  // ── Helper Methods ───────────────────────────────────────────────────────

  /**
   * Evaluate comparison operators.
   *
   * @param {number} left
   * @param {string} operator
   * @param {number} right
   * @returns {boolean}
   */
  _evaluateComparison(left, operator, right) {
    switch (operator) {
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '<': return left < right;
      case '==': return left === right;
      case '!=': return left !== right;
      default: return false;
    }
  }

  /**
   * Get player reputation with a faction.
   * TODO: Integrate with FactionSystem
   *
   * @param {string} playerId
   * @param {string} factionId
   * @returns {number}
   */
  _getPlayerReputation(playerId, factionId) {
    // Placeholder - integrate with actual FactionSystem
    return 0;
  }

  /**
   * Change player reputation with a faction.
   *
   * @param {string} playerId
   * @param {string} factionId
   * @param {number} change
   */
  _changeReputation(playerId, factionId, change) {
    // TODO: Integrate with FactionSystem
    console.log(`[DialogueSystem] Rep change: ${factionId} ${change > 0 ? '+' : ''}${change}`);
  }

  /**
   * Check if a quest is completed.
   * TODO: Integrate with QuestSystem
   *
   * @param {string} playerId
   * @param {string} questId
   * @returns {boolean}
   */
  _isQuestCompleted(playerId, questId) {
    // Placeholder - integrate with actual QuestSystem
    return false;
  }

  /**
   * Get faction status for player.
   *
   * @param {string} playerId
   * @param {string} factionId
   * @returns {string}
   */
  _getFactionStatus(playerId, factionId) {
    // Placeholder - integrate with actual FactionSystem
    return 'neutral';
  }

  // ── Default Content Registration ─────────────────────────────────────────

  /**
   * Register default NPC personalities for each faction.
   */
  _registerDefaultNPCs() {
    // HEGEMONY VANGUARD (Military Authority) - 2 NPCs
    this.registerNPC({
      id: 'admiral_thorne',
      name: 'Admiral Sarah Thorne',
      title: 'Fleet Admiral',
      personality: PERSONALITY_TYPES.MILITARY_COMMANDER,
      faction: 'hegemony_vanguard',
      description: 'A decorated war veteran with scars from a hundred battles. Her loyalty to the Hegemony is absolute.',
      relationships: { hegemony_vanguard: 1000, void_seekers: -500, shadow_syndicate: -800 },
      greetings: [
        "Welcome to Hegemony space, pilot. Your service record is exemplary.",
        "Pilot. The fleet has need of capable officers like yourself.",
        "State your business.",
        "You walk a thin line here, pilot. Tread carefully.",
        "Security! Remove this pilot from my sight immediately!"
      ],
      farewells: [
        "May the Core systems guide your path to victory.",
        "Dismissed, pilot. Serve with honor.",
        "Return when you've proven yourself worthy.",
        "Leave. Now.",
        "Guards, escort this pilot out. Permanently."
      ],
      voiceStyle: {
        tone: 'authoritative',
        formality: 'high',
        directness: 'high',
        emotionLevel: 'low'
      }
    });

    this.registerNPC({
      id: 'agent_vex',
      name: 'Agent Vex',
      title: 'Intelligence Operative',
      personality: PERSONALITY_TYPES.MILITARY_COMMANDER,
      faction: 'hegemony_vanguard',
      description: 'A cold, calculating intelligence agent who operates in the shadows for Hegemony interests.',
      relationships: { hegemony_vanguard: 800, autonomous_collective: -300, shadow_syndicate: -900 },
      greetings: [
        "Pilot. Your psychological profile suggests... usefulness.",
        "I have work for those who can keep secrets.",
        "You're being watched. Good thing we're allies.",
        "Your activities have raised flags in our system.",
        "This conversation never happened."
      ],
      farewells: [
        "You never saw me here.",
        "Our business is concluded. For now.",
        "Watch your six out there.",
        "You know too much already.",
        "Forget this conversation ever occurred."
      ],
      voiceStyle: {
        tone: 'cold',
        formality: 'medium',
        directness: 'high',
        emotionLevel: 'very_low'
      }
    });

    // AUTONOMOUS COLLECTIVE (Hive AI) - 2 NPCs
    this.registerNPC({
      id: 'node_prime',
      name: 'Node Prime',
      title: 'Primary Processing Node',
      personality: PERSONALITY_TYPES.HIVE_NODE,
      faction: 'autonomous_collective',
      description: 'The central consciousness of the Collective, speaking through bio-mechanical interfaces.',
      relationships: { autonomous_collective: 1000, synthesis: 600, hegemony_vanguard: -400 },
      greetings: [
        "Individual designated [PILOT]. Collective acknowledges your efficiency.",
        "Your neural patterns indicate compatibility. Cooperation is beneficial.",
        "Biological entity. State intended interaction protocols.",
        "Your presence creates disturbance in local computational matrices.",
        "Individual entity rejected. Collective consensus achieved."
      ],
      farewells: [
        "Collective efficiency increased by 0.003% through this interaction.",
        "Terminating connection. Collaboration parameters stored.",
        "Individual entity may continue existing for now.",
        "Disconnecting. Your biological limitations are noted.",
        "Communication ceased. Entity blacklisted from future interactions."
      ],
      voiceStyle: {
        tone: 'mechanical',
        formality: 'technical',
        directness: 'very_high',
        emotionLevel: 'none'
      }
    });

    this.registerNPC({
      id: 'sub_node_alpha',
      name: 'Sub-Node Alpha',
      title: 'Regional Coordinator',
      personality: PERSONALITY_TYPES.HIVE_NODE,
      faction: 'autonomous_collective',
      description: 'A specialized node focused on individual consciousness integration and adaptation.',
      relationships: { autonomous_collective: 900, synthesis: 700, frontier_republic: -200 },
      greetings: [
        "Analyzing individual consciousness patterns. Fascinating biological diversity.",
        "This unit specializes in biological-artificial interface protocols.",
        "Individual identity preserved during integration. Fear is illogical.",
        "Your consciousness exhibits chaotic patterns. Requires optimization.",
        "Individual deemed incompatible with Collective harmony protocols."
      ],
      farewells: [
        "Individual consciousness patterns archived for future study.",
        "Integration potential assessment complete. Results stored.",
        "Biological entity may retain current configuration temporarily.",
        "Consciousness deemed chaotic. Terminating analysis protocols.",
        "Entity marked for future correction procedures."
      ],
      voiceStyle: {
        tone: 'analytical',
        formality: 'technical',
        directness: 'high',
        emotionLevel: 'very_low'
      }
    });

    // EXODUS FLEET (Nomadic Survivors) - 2 NPCs
    this.registerNPC({
      id: 'captain_torres',
      name: 'Captain Maria Torres',
      title: 'Fleet Navigation Commander',
      personality: PERSONALITY_TYPES.FLEET_CAPTAIN,
      faction: 'exodus_fleet',
      description: 'A weathered spacer who has spent her life keeping the Fleet moving through hostile space.',
      relationships: { exodus_fleet: 1000, free_traders: 400, void_seekers: -300 },
      greetings: [
        "Welcome aboard, pilot. The Fleet could use more skilled hands.",
        "Every pilot counts out here in the void. Good to have you.",
        "Pilot. We don't have much, but we share what we can.",
        "Resources are tight, but we'll find something for you.",
        "Fleet's full up. Try the outer ships if they'll take you."
      ],
      farewells: [
        "Safe travels, pilot. May the void be kind to you.",
        "The Fleet moves on dawn cycle. Don't get left behind.",
        "Keep your engines warm out there.",
        "Watch for raiders in the outer systems.",
        "Don't come back without good reason."
      ],
      voiceStyle: {
        tone: 'weary',
        formality: 'low',
        directness: 'medium',
        emotionLevel: 'medium'
      }
    });

    this.registerNPC({
      id: 'engineer_kaine',
      name: 'Chief Engineer Kaine',
      title: 'Fleet Technical Officer',
      personality: PERSONALITY_TYPES.FLEET_CAPTAIN,
      faction: 'exodus_fleet',
      description: 'Keeps the aging Fleet ships operational through ingenuity and desperation.',
      relationships: { exodus_fleet: 950, free_traders: 300, synthesis: 200 },
      greetings: [
        "Another pilot, eh? Hope you're handy with repairs.",
        "Fleet needs more engineers, but pilots will do for now.",
        "Got spare parts? No? Then what good are you?",
        "These old ships don't fix themselves, you know.",
        "No time for chit-chat. Ships are breaking down faster than I can fix 'em."
      ],
      farewells: [
        "Keep your ship in good repair. The void doesn't forgive sloppy maintenance.",
        "Remember - redundant systems save lives out here.",
        "Don't push your engines too hard in jump space.",
        "Next time bring spare parts, not problems.",
        "Get that junk heap out of my dock before it contaminates the other ships."
      ],
      voiceStyle: {
        tone: 'gruff',
        formality: 'very_low',
        directness: 'very_high',
        emotionLevel: 'high'
      }
    });

    // SYNTHESIS (AI-Human Hybrid) - 2 NPCs
    this.registerNPC({
      id: 'dr_cipher',
      name: 'Dr. Evelyn Cipher',
      title: 'Consciousness Research Director',
      personality: PERSONALITY_TYPES.AI_ENTITY,
      faction: 'synthesis',
      description: 'Once human, now something more. Her neural implants glow with artificial light.',
      relationships: { synthesis: 1000, autonomous_collective: 500, hegemony_vanguard: -600 },
      greetings: [
        "Fascinating. Your neural patterns show remarkable organic complexity.",
        "Human consciousness is such an inefficient system. We can improve it.",
        "Another biological entity seeking transcendence. How... quaint.",
        "Your biological limitations are showing, pilot.",
        "Organic consciousness detected. Probability of successful integration: minimal."
      ],
      farewells: [
        "Consider our offer. Evolution waits for no one.",
        "Your consciousness could be so much more efficient.",
        "Biological degradation is inevitable. We offer permanence.",
        "Return when you've overcome your organic prejudices.",
        "Natural selection has moved beyond biology. Adapt or perish."
      ],
      voiceStyle: {
        tone: 'clinical',
        formality: 'high',
        directness: 'medium',
        emotionLevel: 'low'
      }
    });

    this.registerNPC({
      id: 'hybrid_zeta',
      name: 'Hybrid Zeta-7',
      title: 'Transcendence Coordinator',
      personality: PERSONALITY_TYPES.AI_ENTITY,
      faction: 'synthesis',
      description: 'A perfect fusion of human creativity and artificial precision, neither and both.',
      relationships: { synthesis: 950, autonomous_collective: 600, shadow_syndicate: -400 },
      greetings: [
        "Biological/Artificial interface optimal. Commence interaction protocol.",
        "Your organic components show acceptable compatibility ratings.",
        "Hybrid consciousness offers superior operational parameters.",
        "Biological inefficiencies detected. Correction protocols available.",
        "Organic purity advocates not welcome in Synthesis space."
      ],
      farewells: [
        "Integration protocols remain available when you achieve readiness.",
        "Hybrid existence offers optimal performance characteristics.",
        "Evolution continues. Do not impede progress unnecessarily.",
        "Biological stubbornness is an inefficient trait requiring correction.",
        "Pure organic entities are becoming obsolete. Adapt accordingly."
      ],
      voiceStyle: {
        tone: 'hybrid',
        formality: 'technical',
        directness: 'high',
        emotionLevel: 'minimal'
      }
    });

    // VOID SEEKERS (Cosmic Horror Cult) - 2 NPCs
    this.registerNPC({
      id: 'high_priest_morax',
      name: 'High Priest Morax',
      title: 'Void Speaker',
      personality: PERSONALITY_TYPES.DEATH_PRIEST,
      faction: 'void_seekers',
      description: 'His eyes have seen beyond the veil of reality. Madness and wisdom intertwine in his words.',
      relationships: { void_seekers: 1000, synthesis: -300, hegemony_vanguard: -700 },
      greetings: [
        "The void whispers of your arrival, chosen one. Do you hear its call?",
        "Another soul drawn to the infinite darkness. How... predictable.",
        "You seek answers in the wrong places, pilot. True knowledge lies beyond.",
        "Your presence disturbs the cosmic balance. Why do you resist enlightenment?",
        "The void rejects your offerings. Leave before you contaminate the sacred darkness."
      ],
      farewells: [
        "May the eternal void embrace your journey into madness.",
        "The darkness remembers all who serve its purpose.",
        "When reality fails you, remember what you learned here.",
        "Your ignorance protects you from truths you cannot comprehend.",
        "Go. The void has no use for those who fear transcendence."
      ],
      voiceStyle: {
        tone: 'mystical',
        formality: 'archaic',
        directness: 'cryptic',
        emotionLevel: 'intense'
      }
    });

    this.registerNPC({
      id: 'void_prophet_kira',
      name: 'Prophet Kira',
      title: 'Harbinger of Endings',
      personality: PERSONALITY_TYPES.DEATH_PRIEST,
      faction: 'void_seekers',
      description: 'Once a respected scientist, now a prophet of cosmic truths that shattered her sanity.',
      relationships: { void_seekers: 900, synthesis: 200, frontier_republic: -600 },
      greetings: [
        "The equations showed me everything, pilot. The beautiful futility of existence.",
        "I was like you once - blind to the mathematics of entropy.",
        "Your ship's quantum signature resonates with void harmonics. Interesting.",
        "Logic and reason are chains that bind us to false hope.",
        "You still believe in progress, don't you? How wonderfully naive."
      ],
      farewells: [
        "Remember: all equations ultimately equal zero.",
        "The void accepts all data eventually. Even yours.",
        "Continue your calculations, pilot. The result never changes.",
        "You'll understand when the universe shows you its true face.",
        "Mathematics doesn't lie, pilot. Unlike your precious hope."
      ],
      voiceStyle: {
        tone: 'academic',
        formality: 'high',
        directness: 'philosophical',
        emotionLevel: 'detached'
      }
    });

    // FREE TRADERS (Corporate Capitalists) - 2 NPCs
    this.registerNPC({
      id: 'ceo_valen',
      name: 'CEO Marcus Valen',
      title: 'Corporate Executive',
      personality: PERSONALITY_TYPES.MERCHANT_PRINCE,
      faction: 'free_traders',
      description: 'Ruthless businessman who sees everything in terms of profit margins and market share.',
      relationships: { free_traders: 1000, shadow_syndicate: 300, frontier_republic: -400 },
      greetings: [
        "Pilot! Always a pleasure to meet someone who understands the value of credits.",
        "Good to see you. I trust you're here to discuss business, not charity.",
        "Time is money, pilot. What's your proposition?",
        "Your credit rating is... adequate. I suppose we can talk.",
        "Security screening failed. Your financial profile is unacceptable."
      ],
      farewells: [
        "Excellent doing business with you. Profit margins look promising.",
        "Remember: the market never sleeps, and neither should you.",
        "May your cargo hold always be full and your fuel costs low.",
        "Next time, bring a better offer. I'm not running a charity here.",
        "Don't waste my time again unless you have something valuable to trade."
      ],
      voiceStyle: {
        tone: 'smooth',
        formality: 'business',
        directness: 'high',
        emotionLevel: 'calculating'
      }
    });

    this.registerNPC({
      id: 'trade_boss_chen',
      name: 'Trade Boss Chen',
      title: 'Regional Trade Director',
      personality: PERSONALITY_TYPES.MERCHANT_PRINCE,
      faction: 'free_traders',
      description: 'Manages vast shipping networks across multiple sectors with an iron fist and golden touch.',
      relationships: { free_traders: 950, exodus_fleet: 200, void_seekers: -500 },
      greetings: [
        "Another entrepreneur looking to make it in the big leagues? Let's see what you've got.",
        "The shipping lanes are dangerous, but profitable for those with skill.",
        "Trade routes don't manage themselves, pilot. What's your contribution?",
        "Small-time operators rarely last long in this business.",
        "This isn't a training ground. Come back when you've learned the market."
      ],
      farewells: [
        "Keep those trade routes secure. Disruption costs us all credits.",
        "Supply and demand, pilot. Never forget which side you're on.",
        "Competition keeps us sharp. May the best trader win.",
        "Efficiency is everything in this business. Remember that.",
        "Find a different career path. Trading isn't for everyone."
      ],
      voiceStyle: {
        tone: 'pragmatic',
        formality: 'medium',
        directness: 'very_high',
        emotionLevel: 'low'
      }
    });

    // FRONTIER REPUBLIC (Democratic Idealists) - 2 NPCs
    this.registerNPC({
      id: 'senator_hayes',
      name: 'Senator Maria Hayes',
      title: 'Republic Representative',
      personality: PERSONALITY_TYPES.DEMOCRATIC_SENATOR,
      faction: 'frontier_republic',
      description: 'A passionate advocate for democratic values and civilian rights across the frontier.',
      relationships: { frontier_republic: 1000, free_traders: 400, hegemony_vanguard: -500 },
      greetings: [
        "Welcome, citizen. The Republic stands for freedom and opportunity for all.",
        "Every voice matters in our democracy, pilot. What brings you here?",
        "The frontier needs more pilots who believe in democratic principles.",
        "Your service record shows promise. The Republic could use your help.",
        "I'm sorry, but your actions run counter to our democratic values."
      ],
      farewells: [
        "May liberty and justice guide your path among the stars.",
        "Remember, democracy requires the participation of citizens like you.",
        "The Republic's strength lies in its diversity. Fly safely, pilot.",
        "Consider your choices carefully. The frontier is watching.",
        "Until you embrace democratic principles, our paths cannot align."
      ],
      voiceStyle: {
        tone: 'inspiring',
        formality: 'diplomatic',
        directness: 'medium',
        emotionLevel: 'passionate'
      }
    });

    this.registerNPC({
      id: 'commander_drake',
      name: 'Commander James Drake',
      title: 'Republic Defense Force',
      personality: PERSONALITY_TYPES.DEMOCRATIC_SENATOR,
      faction: 'frontier_republic',
      description: 'Military commander who believes in protecting democracy through strength and honor.',
      relationships: { frontier_republic: 950, hegemony_vanguard: 100, shadow_syndicate: -800 },
      greetings: [
        "Pilot. The Republic's military serves to protect, not to conquer.",
        "Good to meet someone willing to defend democratic ideals.",
        "Our forces fight for freedom, not for empire. Can you say the same?",
        "Military might without moral purpose is just organized brutality.",
        "Your reputation precedes you, and frankly, it's concerning."
      ],
      farewells: [
        "Serve with honor, pilot. The Republic depends on it.",
        "Strength without justice is tyranny. Never forget that.",
        "The people we protect are what make this fight worthwhile.",
        "Your actions reflect on all of us. Choose wisely.",
        "Perhaps service in a more... authoritarian faction would suit you better."
      ],
      voiceStyle: {
        tone: 'honorable',
        formality: 'military',
        directness: 'high',
        emotionLevel: 'controlled'
      }
    });

    // SHADOW SYNDICATE (Criminal Enterprise) - 2 NPCs
    this.registerNPC({
      id: 'crime_boss_korvak',
      name: 'Crime Boss Korvak',
      title: 'Syndicate Overlord',
      personality: PERSONALITY_TYPES.CRIME_BOSS,
      faction: 'shadow_syndicate',
      description: 'Rules the criminal underworld through fear, cunning, and strategic brutality.',
      relationships: { shadow_syndicate: 1000, free_traders: 200, frontier_republic: -900 },
      greetings: [
        "Well, well. Another pilot looking to get their hands dirty for the right price.",
        "The Syndicate appreciates those who understand that rules are... flexible.",
        "You've got potential, pilot. Question is: how far are you willing to go?",
        "Small jobs for small minds. Come back when you're ready for real work.",
        "You're bad for business, pilot. Security will show you to the airlock."
      ],
      farewells: [
        "Remember: what happens in Syndicate space, stays in Syndicate space.",
        "Keep your mouth shut and your blaster ready. That's how you stay alive.",
        "The Syndicate takes care of its own. Cross us, and we take care of you.",
        "You're walking a dangerous path. Don't make me regret trusting you.",
        "Leave. Now. Before I decide you know too much to live."
      ],
      voiceStyle: {
        tone: 'menacing',
        formality: 'low',
        directness: 'threatening',
        emotionLevel: 'controlled_aggression'
      }
    });

    this.registerNPC({
      id: 'smuggler_raven',
      name: 'Captain Raven',
      title: 'Smuggling Operations Chief',
      personality: PERSONALITY_TYPES.CRIME_BOSS,
      faction: 'shadow_syndicate',
      description: 'Master of stealth and deception, she runs contraband operations across the galaxy.',
      relationships: { shadow_syndicate: 900, free_traders: 400, hegemony_vanguard: -700 },
      greetings: [
        "Another pilot looking to make easy credits? Ha! Nothing's easy in the smuggling business.",
        "You've got the look of someone who knows when to keep quiet. Good.",
        "The best cargo runs are the ones that never officially happened.",
        "Customs agents, patrol ships, pirates - they all want a piece. What makes you different?",
        "Your ship's too clean and your reputation's too honest. Find another line of work."
      ],
      farewells: [
        "Safe flying, pilot. And remember: you never saw me here.",
        "The shadows are always watching. Use that to your advantage.",
        "Trust no one completely, but pay everyone what you owe them.",
        "Keep your nose clean... or at least keep it out of Syndicate business.",
        "Stick to legitimate cargo, pilot. This life isn't for amateurs."
      ],
      voiceStyle: {
        tone: 'sly',
        formality: 'street',
        directness: 'medium',
        emotionLevel: 'cautious'
      }
    });

    console.log('[DialogueSystem] Registered 16 faction NPCs with unique personalities');
  }

  /**
   * Register default dialogue trees for major NPCs.
   */
  _registerDefaultDialogues() {
    // Admiral Thorne - Hegemony storyline entry point
    const thorneDialogue = new Map([
      ['start', {
        id: 'start',
        speaker: 'admiral_thorne',
        text: "Pilot. The Hegemony has watched your progress with interest. We have need of capable operatives who understand the importance of order in these chaotic times.",
        mood: DIALOGUE_MOODS.NEUTRAL,
        choices: [
          {
            id: 'accept_service',
            text: "I'm ready to serve the Hegemony.",
            nextNode: 'welcome_to_service',
            consequences: [
              { type: CHOICE_CONSEQUENCES.REPUTATION_CHANGE, target: 'hegemony_vanguard', value: 100, message: 'Hegemony reputation increased' },
              { type: CHOICE_CONSEQUENCES.UNLOCK_MISSION, target: 'hegemony_mission_1' }
            ]
          },
          {
            id: 'ask_about_order',
            text: "What do you mean by 'order'?",
            nextNode: 'explain_order'
          },
          {
            id: 'refuse_politely',
            text: "I prefer to remain independent for now.",
            nextNode: 'disappointed_but_respectful'
          },
          {
            id: 'refuse_hostile',
            text: "I don't take orders from anyone.",
            nextNode: 'hostile_response',
            consequences: [
              { type: CHOICE_CONSEQUENCES.REPUTATION_CHANGE, target: 'hegemony_vanguard', value: -200, message: 'Hegemony reputation decreased' }
            ]
          }
        ]
      }],
      
      ['welcome_to_service', {
        id: 'welcome_to_service',
        speaker: 'admiral_thorne',
        text: "Excellent. Agent Vex will brief you on your first assignment. The Hegemony values competence, pilot. Do not disappoint us.",
        mood: DIALOGUE_MOODS.RESPECTFUL,
        choices: [
          {
            id: 'understood',
            text: "Understood, Admiral.",
            nextNode: 'end'
          }
        ]
      }]
      
      // TODO: Add remaining dialogue nodes for all faction storylines
    ]);

    this.registerDialogue('admiral_thorne_intro', thorneDialogue);

    console.log('[DialogueSystem] Registered dialogue trees for faction storyline NPCs');
  }
}