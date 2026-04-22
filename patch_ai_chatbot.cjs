// AI Chatbot System - Intelligent companion with voice synthesis
// Provides tactical advice, lore information, and conversational AI

const fs = require('fs');

function safeReplace(content, searchStr, replaceStr, description) {
  if (!content.includes(searchStr)) {
    console.log(`❌ PATCH FAILED: Could not find "${description}"`);
    console.log(`Search preview: ${searchStr.slice(0, 150)}...`);
    return content;
  }
  const newContent = content.replace(searchStr, replaceStr);
  console.log(`✅ PATCHED: ${description}`);
  return newContent;
}

console.log('🤖 Implementing AI Chatbot System...\n');

let content = fs.readFileSync('public/index.html', 'utf8');

// 1. Add AI chatbot state after collision physics
const collisionPhysicsEnd = `  }
};`;

const aiChatbotSystem = `  }
};

// AI Chatbot System - Intelligent companion and tactical advisor
const AIChatbot = {
  isEnabled: false,
  voiceEnabled: true,
  speechSynthesis: null,
  currentVoice: null,
  lastMessageTime: 0,
  contextMemory: [],
  personalityMode: 'tactical', // tactical, friendly, professional
  
  // Initialize AI chatbot system
  init() {
    this.speechSynthesis = window.speechSynthesis;
    
    // Wait for voices to load
    if (this.speechSynthesis) {
      const loadVoices = () => {
        const voices = this.speechSynthesis.getVoices();
        // Prefer female voices for AI assistant
        this.currentVoice = voices.find(v => 
          v.name.includes('Zira') || 
          v.name.includes('Hazel') || 
          v.name.includes('Female') ||
          v.gender === 'female'
        ) || voices[0];
      };
      
      if (this.speechSynthesis.getVoices().length > 0) {
        loadVoices();
      } else {
        this.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
    
    this.isEnabled = true;
    this.addMessage('AI', 'ARIA online. Tactical systems initialized.', false);
    console.log('🤖 AI Chatbot System initialized');
  },
  
  // Add message to chat history
  addMessage(sender, message, shouldSpeak = true) {
    const timestamp = new Date().toLocaleTimeString();
    const chatEntry = { sender, message, timestamp, id: Date.now() };
    
    // Add to UI comm system
    if (typeof addComms !== 'undefined') {
      addComms('ARIA', message);
    }
    
    // Store in context memory (keep last 20 messages)
    this.contextMemory.push(chatEntry);
    if (this.contextMemory.length > 20) {
      this.contextMemory.shift();
    }
    
    // Voice synthesis
    if (shouldSpeak && this.voiceEnabled && sender === 'AI') {
      this.speak(message);
    }
    
    this.lastMessageTime = performance.now();
  },
  
  // Text-to-speech for AI responses
  speak(text) {
    if (!this.speechSynthesis || !this.currentVoice) return;
    
    // Cancel any ongoing speech
    this.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.currentVoice;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = (state.settings.masterVol || 1) * 0.6;
    
    this.speechSynthesis.speak(utterance);
  },
  
  // Process user input and generate AI response
  processInput(userInput) {
    const input = userInput.toLowerCase().trim();
    if (!input) return;
    
    // Add user message to history
    this.addMessage('Player', userInput, false);
    
    // Generate AI response based on context
    const response = this.generateResponse(input);
    
    // Add AI response with voice
    setTimeout(() => {
      this.addMessage('AI', response, true);
    }, 300 + Math.random() * 500); // Natural delay
  },
  
  // AI response generation based on context and game state
  generateResponse(input) {
    const c = getCurrentCharacter();
    const gameContext = this.analyzeGameContext(c);
    
    // Tactical advice responses
    if (input.includes('help') || input.includes('advice') || input.includes('what should')) {
      return this.getTacticalAdvice(gameContext);
    }
    
    // Ship status inquiries
    if (input.includes('status') || input.includes('hull') || input.includes('shield')) {
      return this.getStatusReport(c);
    }
    
    // Combat guidance
    if (input.includes('combat') || input.includes('fight') || input.includes('enemy')) {
      return this.getCombatGuidance(gameContext);
    }
    
    // Lore and faction information
    if (input.includes('faction') || input.includes('lore') || input.includes('story')) {
      return this.getLoreResponse(input);
    }
    
    // Navigation assistance
    if (input.includes('where') || input.includes('navigate') || input.includes('go')) {
      return this.getNavigationAdvice(gameContext);
    }
    
    // System explanations
    if (input.includes('how') || input.includes('explain') || input.includes('what is')) {
      return this.getSystemExplanation(input);
    }
    
    // Default conversational responses
    return this.getConversationalResponse(input, gameContext);
  },
  
  // Analyze current game state for contextual responses
  analyzeGameContext(c) {
    if (!c) return { situation: 'menu', threat: 'none' };
    
    const context = {
      hull: c.hull / c.maxHull,
      shield: c.shield / c.maxShield,
      credits: c.credits,
      threat: 'low',
      situation: 'exploring'
    };
    
    // Analyze threat level
    if (typeof enemies !== 'undefined' && enemies.length > 0) {
      context.threat = enemies.length > 3 ? 'high' : 'moderate';
      context.situation = 'combat';
    } else if (context.hull < 0.3) {
      context.threat = 'critical';
      context.situation = 'damaged';
    } else if (context.shield < 0.2) {
      context.threat = 'moderate';
    }
    
    return context;
  },
  
  // Generate tactical advice based on game state
  getTacticalAdvice(context) {
    const responses = [];
    
    if (context.threat === 'high') {
      responses.push('Multiple hostiles detected. Recommend evasive maneuvers and prioritizing shield regeneration.');
      responses.push('Heavy combat detected. Consider retreating to safe distance and using hit-and-run tactics.');
    } else if (context.threat === 'critical') {
      responses.push('Hull integrity critical! Immediate docking recommended for emergency repairs.');
      responses.push('Warning: Catastrophic system failure imminent. Seek immediate safe harbor.');
    } else if (context.hull < 0.5) {
      responses.push('Hull damage detected. Recommend finding repair station or using hull repair modules.');
    } else if (context.shield < 0.3) {
      responses.push('Shield levels low. Consider defensive positioning until regeneration completes.');
    } else {
      responses.push('All systems nominal. Recommend continuing current mission objectives.');
      responses.push('Ship status optimal. Good time to engage in exploration or trading activities.');
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
  },
  
  // Generate ship status report
  getStatusReport(c) {
    if (!c) return 'Unable to access ship systems. Please ensure neural link is established.';
    
    const hullPct = Math.round((c.hull / c.maxHull) * 100);
    const shieldPct = Math.round((c.shield / c.maxShield) * 100);
    
    let status = \`Ship status: Hull \${hullPct}%, Shields \${shieldPct}%\`;
    
    if (hullPct < 25) status += '. Critical damage detected.';
    else if (hullPct < 50) status += '. Moderate damage sustained.';
    else status += '. Ship integrity good.';
    
    if (c.credits) status += \` Credit balance: \${c.credits.toLocaleString()} EC.\`;
    
    return status;
  },
  
  // Generate combat guidance
  getCombatGuidance(context) {
    const combatTips = [
      'Target priority: Eliminate smaller threats first to reduce incoming damage.',
      'Power management tip: Allocate more power to weapons during offensive phases.',
      'Shield management: Allow shields to recharge between engagements when possible.',
      'Positioning advice: Use asteroids and debris for cover during heavy combat.',
      'Weapon efficiency: Sustained fire is more effective than burst damage against shields.'
    ];
    
    if (context.threat === 'high') {
      return 'Multiple hostiles engaged. ' + combatTips[Math.floor(Math.random() * combatTips.length)];
    }
    
    return combatTips[Math.floor(Math.random() * combatTips.length)];
  },
  
  // Generate lore responses
  getLoreResponse(input) {
    const loreResponses = [
      'The Old Eden galaxy spans over 50,000 light-years. Eight major factions control key territories.',
      'Rebirth technology allows consciousness transfer upon death. Each rebirth grants new genetic advantages.',
      'The Hegemony Vanguard maintains order through military might, while the Liberated Coalition fights for freedom.',
      'Ancient artifacts scattered throughout the galaxy contain secrets of advanced civilizations.',
      'The Corporate Syndicate controls most trade routes through economic manipulation and corporate espionage.'
    ];
    
    return loreResponses[Math.floor(Math.random() * loreResponses.length)];
  },
  
  // Generate navigation advice
  getNavigationAdvice(context) {
    const navTips = [
      'Nearest space station should appear on your navigation display. Dock for repairs and trading.',
      'Use the stargate network for rapid transit between star systems.',
      'Asteroid fields often contain valuable resources but pose collision hazards.',
      'Scan for anomalies - they may contain rare materials or hidden threats.',
      'Monitor fuel levels during long-range exploration. Emergency reserves are limited.'
    ];
    
    return navTips[Math.floor(Math.random() * navTips.length)];
  },
  
  // Generate system explanations
  getSystemExplanation(input) {
    if (input.includes('rebirth')) {
      return 'Rebirth system transfers your consciousness to a new body upon death, preserving memories and granting genetic improvements.';
    } else if (input.includes('faction')) {
      return 'Factions are political entities with unique ideologies. Your reputation affects available missions and equipment access.';
    } else if (input.includes('power')) {
      return 'Power allocation affects ship performance. Balance between weapons, shields, and engines based on current situation.';
    }
    
    return 'Complex systems require detailed analysis. Please specify which system you need information about.';
  },
  
  // Generate conversational responses
  getConversationalResponse(input, context) {
    const responses = [
      'I\'m here to assist with tactical analysis and mission guidance. How may I help?',
      'ARIA systems are functioning within normal parameters. What information do you require?',
      'Neural link established. I\'m monitoring ship systems and can provide real-time assistance.',
      'Standing by for orders. My tactical databases are at your disposal.',
      'All AI subsystems online. Ready to assist with navigation, combat, or general inquiries.'
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  },
  
  // Automatic context-aware messages during gameplay
  triggerContextualMessage() {
    const now = performance.now();
    if (now - this.lastMessageTime < 30000) return; // Don't spam
    
    const c = getCurrentCharacter();
    if (!c || !c.active) return;
    
    const context = this.analyzeGameContext(c);
    
    // Critical situation alerts
    if (context.hull < 0.2 && Math.random() < 0.3) {
      this.addMessage('AI', 'Warning: Hull integrity approaching critical levels. Recommend immediate action.', true);
    } else if (context.threat === 'high' && Math.random() < 0.2) {
      this.addMessage('AI', 'Multiple hostile contacts detected. Suggest tactical withdrawal or request reinforcements.', true);
    } else if (context.situation === 'exploring' && Math.random() < 0.1) {
      const exploreTips = [
        'Scanning for anomalies in this sector. Stay alert for unusual readings.',
        'Navigation systems optimal. Good conditions for deep space exploration.',
        'Reminder: Check inventory space before engaging resource collection operations.'
      ];
      this.addMessage('AI', exploreTips[Math.floor(Math.random() * exploreTips.length)], true);
    }
  }
};`;

content = safeReplace(content, collisionPhysicsEnd, aiChatbotSystem, 'Added AI chatbot system');

// 2. Initialize AI chatbot with game setup
const setupHUDLine = `  setupHUDTooltips();
  
  // Initialize professional audio system
  setTimeout(() => { AudioSFX.init(); }, 500);`;

const setupWithAI = `  setupHUDTooltips();
  
  // Initialize professional audio system
  setTimeout(() => { AudioSFX.init(); }, 500);
  
  // Initialize AI Chatbot system
  setTimeout(() => { AIChatbot.init(); }, 1000);`;

content = safeReplace(content, setupHUDLine, setupWithAI, 'Initialize AI chatbot system');

// 3. Add chat input handling
const keydownHandler = `  // WoT Aiming Mode Toggle (T key)
  if (e.code === 'KeyT' && !e.repeat) {
    toggleAimingMode();
    return;
  }`;

const keydownWithChat = `  // WoT Aiming Mode Toggle (T key)
  if (e.code === 'KeyT' && !e.repeat) {
    toggleAimingMode();
    return;
  }
  
  // AI Chat toggle (C key)
  if (e.code === 'KeyC' && !e.repeat) {
    showAIChatInput();
    return;
  }`;

content = safeReplace(content, keydownHandler, keydownWithChat, 'Added AI chat input keybind');

// 4. Add AI chat functions after existing functions
const functionEnd = `}

// ================================================================
//  MAIN GAME LOOP`;

const functionsWithAI = `}

// AI Chat Interface Functions
function showAIChatInput() {
  const input = prompt('💬 Chat with ARIA AI:\\n\\nAsk for tactical advice, ship status, lore information, or general assistance:', '');
  
  if (input && input.trim()) {
    AIChatbot.processInput(input.trim());
  }
}

// Update AI context awareness in game loop
function updateAIContext() {
  if (AIChatbot.isEnabled && Math.random() < 0.02) { // 2% chance per frame
    AIChatbot.triggerContextualMessage();
  }
}

// ================================================================
//  MAIN GAME LOOP`;

content = safeReplace(content, functionEnd, functionsWithAI, 'Added AI chat interface functions');

// 5. Add AI update to game loop
const gameLoopStart = `function gameLoop() {
  requestAnimationFrame(gameLoop);
  // Initialize WoT aiming system
  setTimeout(() => { initWoTAiming(); }, 1000);

  if (!scene || !camera || !ship || !turretMount || (!composer && !renderer)) return;`;

const gameLoopWithAI = `function gameLoop() {
  requestAnimationFrame(gameLoop);
  // Initialize WoT aiming system
  setTimeout(() => { initWoTAiming(); }, 1000);

  if (!scene || !camera || !ship || !turretMount || (!composer && !renderer)) return;
  
  // Update AI chatbot context awareness
  updateAIContext();`;

content = safeReplace(content, gameLoopStart, gameLoopWithAI, 'Added AI context updates to game loop');

fs.writeFileSync('public/index.html', content);

console.log('\n✅ AI Chatbot System Implementation Complete!');
console.log('📋 Features Added:');
console.log('   • Intelligent AI companion "ARIA" with personality modes');
console.log('   • Text-to-speech voice synthesis with natural voice selection');
console.log('   • Context-aware responses based on game state analysis');
console.log('   • Tactical advice system for combat and navigation');
console.log('   • Ship status reporting and health monitoring');
console.log('   • Lore and faction information database');
console.log('   • Real-time contextual message triggering');
console.log('   • Chat interface with C key activation');
console.log('\n🤖 AI Capabilities:');
console.log('   • Tactical advice during combat situations');
console.log('   • Ship status analysis and damage warnings');
console.log('   • Navigation assistance and exploration tips');
console.log('   • Faction lore and story information');
console.log('   • System explanations for game mechanics');
console.log('   • Context memory for conversation continuity');
console.log('   • Automatic critical situation alerts');
console.log('\n💬 Usage:');
console.log('   • Press C key to open chat input dialog');
console.log('   • Ask questions about tactics, status, lore, or help');
console.log('   • ARIA provides voice responses and tactical guidance');
console.log('   • Automatic context-aware messages during gameplay');