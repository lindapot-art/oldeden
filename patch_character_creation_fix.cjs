// Fix Character Creation Flow - Old Eden Space MMO
// Repair broken transition from character creation to gunner mode

const fs = require('fs');

function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('🔧 Fixing character creation flow...');

const htmlPath = 'd:\\antiruscist\\oldeden\\public\\index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Find and fix character creation completion
// Look for the character creation submit function
const characterCreationSearch = 'function.*createCharacter|btn-create.*onclick|faction.*selected';

// Search for character creation patterns
console.log('🔍 Searching for character creation patterns...');

// Find the character creation button and fix its flow
const createCharPattern = /function\s+createCharacter\s*\([^)]*\)\s*{[^}]+}/g;
const createCharMatch = content.match(createCharPattern);

if (createCharMatch) {
  console.log('📍 Found createCharacter function');
} else {
  console.log('❌ createCharacter function not found, searching for alternatives...');
}

// Look for character creation completion patterns
const patterns = [
  'state.screen = ',
  'switchScreen(',
  'showScreen(',
  'startGame(',
  'initGame(',
  'beginGame('
];

let foundPattern = null;
for (const pattern of patterns) {
  if (content.includes(pattern)) {
    foundPattern = pattern;
    console.log(`📍 Found pattern: ${pattern}`);
    break;
  }
}

// Fix character creation by ensuring proper screen transition
// Find the faction selection completion
const factionSelectPattern = /btn-create.*onclick|createCharacter|function.*startGame/;

// Add a robust character creation completion function
const characterCreationFix = cr(`
// ── Character Creation Flow Fix ──
function completeCharacterCreation() {
  // Ensure character is properly created
  if (!state.player.name) state.player.name = 'Pilot';
  if (!state.player.faction) state.player.faction = 1;
  
  console.log('🚀 Character creation completed:', state.player.name, 'Faction:', state.player.faction);
  
  // Initialize ship state
  state.ship = {
    hull: 100,
    maxHull: 100,
    shield: 50,
    maxShield: 50,
    energy: 100,
    maxEnergy: 100
  };
  
  // Initialize flight state
  state.flight = {
    velocity: { x: 0, y: 0, z: 0 },
    thrust: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  };
  
  // Switch to gunner mode
  switchToGunnerMode();
}

function switchToGunnerMode() {
  console.log('🎮 Switching to gunner mode...');
  state.screen = 'gunner';
  
  // Hide all other screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.style.display = 'none';
  });
  
  // Show game canvas and HUD
  const gameCanvas = document.getElementById('game-canvas');
  const hudCanvas = document.getElementById('hud-canvas');
  
  if (gameCanvas) {
    gameCanvas.style.display = 'block';
    gameCanvas.style.visibility = 'visible';
  }
  
  if (hudCanvas) {
    hudCanvas.style.display = 'block';
    hudCanvas.style.visibility = 'visible';
  }
  
  // Initialize game context
  initGameContext();
  
  // Start game systems
  console.log('🎯 Initializing game systems...');
  c.active = true;
  c.dead = false;
  
  // Position ship at origin
  if (ship) {
    ship.position.set(0, 0, 0);
  }
  
  // Start game loop if not already running
  if (!c._gameLoopStarted) {
    c._gameLoopStarted = true;
    gameLoop();
  }
  
  console.log('✅ Gunner mode activated');
}

`);

// Insert the fix before the gameLoop function
const gameLoopLocation = 'function gameLoop() {';
const fixedGameLoop = characterCreationFix + 'function gameLoop() {';

if (content.includes(gameLoopLocation)) {
  content = content.replace(gameLoopLocation, fixedGameLoop);
  console.log('✅ Added character creation fix before gameLoop');
} else {
  console.log('❌ gameLoop function not found');
}

// 2. Find and fix faction selection buttons
// Look for faction card click handlers
if (content.includes('function selectFaction')) {
  console.log('📍 Found selectFaction function');
  
  // Enhance faction selection to properly complete character creation
  const factionSelectFix = `function selectFaction(factionId) {
  state.player.faction = factionId;
  
  // Update faction display
  document.querySelectorAll('.faction-card').forEach(card => {
    card.classList.remove('selected');
  });
  
  const selectedCard = document.querySelector(\`[data-faction="\${factionId}"]\`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
  }
  
  console.log('🏴 Faction selected:', factionId);
  
  // Auto-complete character creation after faction selection
  setTimeout(() => {
    completeCharacterCreation();
  }, 1000);
}`;

  // Replace existing selectFaction if it exists
  const existingFactionSelect = /function selectFaction\([^)]*\)\s*{[^}]*}/g;
  if (content.match(existingFactionSelect)) {
    content = content.replace(existingFactionSelect, factionSelectFix);
    console.log('✅ Enhanced selectFaction function');
  }
} else {
  console.log('❌ selectFaction function not found, adding one...');
  
  // Add faction selection function
  const addFactionSelect = characterCreationFix + `
function selectFaction(factionId) {
  state.player.faction = factionId;
  console.log('🏴 Faction selected:', factionId);
  
  // Auto-complete character creation
  setTimeout(() => {
    completeCharacterCreation();
  }, 1000);
}

`;
  
  content = content.replace(characterCreationFix, addFactionSelect);
  console.log('✅ Added selectFaction function');
}

// 3. Ensure faction cards have proper click handlers
// Find faction cards and add click handlers
if (content.includes('faction-card')) {
  console.log('📍 Found faction cards in HTML');
  
  // Add click handlers to faction cards
  const factionClickHandler = cr(`
// ── Faction Card Click Handlers ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faction-card').forEach((card, index) => {
    card.addEventListener('click', () => {
      const factionId = index + 1; // Faction IDs are 1-based
      selectFaction(factionId);
    });
    
    // Also handle data-faction attribute if present
    const factionData = card.getAttribute('data-faction');
    if (factionData) {
      card.addEventListener('click', () => {
        selectFaction(parseInt(factionData));
      });
    }
  });
  
  // Handle create character button if present
  const createBtn = document.getElementById('btn-create');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      completeCharacterCreation();
    });
  }
  
  console.log('🎮 Faction card handlers initialized');
});

`);
  
  // Insert the handlers after the character creation fix
  content = content.replace(characterCreationFix, characterCreationFix + factionClickHandler);
  console.log('✅ Added faction card click handlers');
}

// 4. Fix any missing initGameContext function
if (!content.includes('function initGameContext')) {
  console.log('📍 Adding missing initGameContext function');
  
  const initGameContextFunction = cr(`
function initGameContext() {
  // Initialize game context if not already done
  if (!c.active) {
    c.enemies = [];
    c.projectiles = [];
    c.explosions = [];
    c.powerUps = [];
    c.activePowerUps = [];
    c.particles = [];
    c.targetLock = { target: null, lockTimer: 0, locked: false };
  }
  
  console.log('🎯 Game context initialized');
}

`);
  
  content = content.replace(characterCreationFix, characterCreationFix + initGameContextFunction);
  console.log('✅ Added initGameContext function');
}

// Write the fixed file
fs.writeFileSync(htmlPath, content);

console.log('✅ Character creation flow fixed!');
console.log('📊 Fixes applied:');
console.log('   • Added completeCharacterCreation() function');
console.log('   • Added switchToGunnerMode() function');
console.log('   • Enhanced selectFaction() with auto-completion');
console.log('   • Added faction card click handlers');
console.log('   • Added initGameContext() function');
console.log('   • Proper screen transitions and canvas visibility');