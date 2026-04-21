const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🚀 DEPLOYING: Comprehensive Ship Customization System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add ship customization state
const shipCustomizationState = `      // Comprehensive Ship Customization
      shipCustomization: {
        currentShip: 'explorer_mk1',
        availableShips: new Map(),
        unlockedParts: new Map(),
        equippedParts: new Map(),
        colorSchemes: new Map(),
        performanceModules: new Map(),
        cosmeticItems: new Map(),
        hangarOpen: false,
        selectedCategory: 'hull',
        previewMode: false,
        credits: 5000, // Starting customization budget
        blueprintsUnlocked: ['explorer_mk1', 'fighter_alpha', 'cruiser_beta']
      },`;

// Add to state object
indexContent = indexContent.replace(
  '      // Advanced AI Boss Mechanics',
  `${shipCustomizationState}
      
      // Advanced AI Boss Mechanics`
);

// Add comprehensive ship customization system
const shipCustomizationSystem = `
// === COMPREHENSIVE SHIP CUSTOMIZATION ===
const shipCustomizationSystem = {
  // Ship Templates & Blueprints
  shipBlueprints: {
    'explorer_mk1': {
      name: 'Explorer Mk-I',
      class: 'Explorer',
      baseStats: {
        speed: 25,
        agility: 20,
        armor: 15,
        shields: 10,
        weaponSlots: 2,
        moduleSlots: 3
      },
      baseCost: 0,
      unlockCondition: 'default',
      description: 'Versatile exploration vessel with balanced capabilities'
    },
    
    'fighter_alpha': {
      name: 'Fighter Alpha',
      class: 'Fighter',
      baseStats: {
        speed: 35,
        agility: 30,
        armor: 10,
        shields: 8,
        weaponSlots: 3,
        moduleSlots: 2
      },
      baseCost: 2500,
      unlockCondition: 'kills_100',
      description: 'High-speed interceptor optimized for combat'
    },
    
    'cruiser_beta': {
      name: 'Cruiser Beta',
      class: 'Cruiser',
      baseStats: {
        speed: 15,
        agility: 10,
        armor: 30,
        shields: 25,
        weaponSlots: 4,
        moduleSlots: 5
      },
      baseCost: 5000,
      unlockCondition: 'boss_kills_3',
      description: 'Heavy assault platform with superior firepower'
    },
    
    'stealth_ghost': {
      name: 'Stealth Ghost',
      class: 'Stealth',
      baseStats: {
        speed: 30,
        agility: 25,
        armor: 8,
        shields: 12,
        weaponSlots: 2,
        moduleSlots: 4
      },
      baseCost: 7500,
      unlockCondition: 'territory_control_5',
      description: 'Advanced stealth vessel with cloaking technology'
    },
    
    'dreadnought_omega': {
      name: 'Dreadnought Omega',
      class: 'Dreadnought',
      baseStats: {
        speed: 8,
        agility: 5,
        armor: 50,
        shields: 40,
        weaponSlots: 6,
        moduleSlots: 8
      },
      baseCost: 15000,
      unlockCondition: 'legendary_boss_kill',
      description: 'Ultimate capital ship with devastating firepower'
    }
  },
  
  // Ship Parts & Components
  shipParts: {
    // Hull Parts
    hull: {
      'standard_hull': {
        name: 'Standard Hull',
        stats: { armor: 0, speed: 0 },
        cost: 0,
        rarity: 'common',
        description: 'Basic hull plating'
      },
      'reinforced_hull': {
        name: 'Reinforced Hull',
        stats: { armor: 5, speed: -2 },
        cost: 1000,
        rarity: 'uncommon',
        description: 'Enhanced armor plating with improved protection'
      },
      'lightweight_hull': {
        name: 'Lightweight Hull',
        stats: { armor: -3, speed: 8 },
        cost: 1200,
        rarity: 'uncommon',
        description: 'Carbon-fiber construction for increased speed'
      },
      'adaptive_hull': {
        name: 'Adaptive Hull',
        stats: { armor: 10, speed: 5 },
        cost: 3000,
        rarity: 'rare',
        description: 'Self-repairing nano-composite hull'
      },
      'quantum_hull': {
        name: 'Quantum Hull',
        stats: { armor: 15, speed: 10, shields: 8 },
        cost: 8000,
        rarity: 'legendary',
        description: 'Quantum-phase hull with reality distortion fields'
      }
    },
    
    // Engine Parts
    engines: {
      'standard_engine': {
        name: 'Standard Engine',
        stats: { speed: 0, agility: 0 },
        cost: 0,
        rarity: 'common',
        description: 'Basic propulsion system'
      },
      'turbo_engine': {
        name: 'Turbo Engine',
        stats: { speed: 10, agility: 5 },
        cost: 1500,
        rarity: 'uncommon',
        description: 'High-output thruster array'
      },
      'vector_engine': {
        name: 'Vector Engine',
        stats: { speed: 5, agility: 15 },
        cost: 1800,
        rarity: 'uncommon',
        description: 'Omnidirectional thrust vectoring system'
      },
      'plasma_drive': {
        name: 'Plasma Drive',
        stats: { speed: 20, agility: 10 },
        cost: 4000,
        rarity: 'rare',
        description: 'Plasma-powered propulsion with afterburner'
      },
      'quantum_drive': {
        name: 'Quantum Drive',
        stats: { speed: 30, agility: 20 },
        cost: 10000,
        rarity: 'legendary',
        description: 'Quantum tunneling propulsion system'
      }
    },
    
    // Shield Systems
    shields: {
      'basic_shield': {
        name: 'Basic Shield',
        stats: { shields: 0 },
        cost: 0,
        rarity: 'common',
        description: 'Standard energy deflector'
      },
      'enhanced_shield': {
        name: 'Enhanced Shield',
        stats: { shields: 10 },
        cost: 1000,
        rarity: 'uncommon',
        description: 'Improved shield generator with faster recharge'
      },
      'adaptive_shield': {
        name: 'Adaptive Shield',
        stats: { shields: 15, armor: 5 },
        cost: 2500,
        rarity: 'rare',
        description: 'Self-adjusting shield matrix'
      },
      'quantum_barrier': {
        name: 'Quantum Barrier',
        stats: { shields: 25, armor: 8 },
        cost: 6000,
        rarity: 'legendary',
        description: 'Quantum field defensive barrier'
      }
    },
    
    // Weapon Mounts
    weapons: {
      'light_mount': {
        name: 'Light Weapon Mount',
        stats: { weaponSlots: 1 },
        cost: 500,
        rarity: 'common',
        description: 'Mount for light weapons'
      },
      'heavy_mount': {
        name: 'Heavy Weapon Mount',
        stats: { weaponSlots: 1, armor: 2 },
        cost: 1500,
        rarity: 'uncommon',
        description: 'Reinforced mount for heavy weapons'
      },
      'dual_mount': {
        name: 'Dual Weapon Mount',
        stats: { weaponSlots: 2, agility: -3 },
        cost: 3000,
        rarity: 'rare',
        description: 'Twin-linked weapon mounting system'
      }
    }
  },
  
  // Color Schemes & Visual Customization
  colorSchemes: {
    'classic_blue': {
      name: 'Classic Blue',
      primary: 0x0066cc,
      secondary: 0x004499,
      accent: 0x00aaff,
      cost: 0,
      description: 'Traditional space fleet colors'
    },
    'crimson_red': {
      name: 'Crimson Red',
      primary: 0xcc0000,
      secondary: 0x990000,
      accent: 0xff3333,
      cost: 500,
      description: 'Aggressive red combat scheme'
    },
    'stealth_black': {
      name: 'Stealth Black',
      primary: 0x1a1a1a,
      secondary: 0x000000,
      accent: 0x333333,
      cost: 750,
      description: 'Low-visibility stealth coating'
    },
    'golden_luxury': {
      name: 'Golden Luxury',
      primary: 0xffd700,
      secondary: 0xffaa00,
      accent: 0xffff66,
      cost: 2000,
      description: 'Prestige golden finish'
    },
    'quantum_rainbow': {
      name: 'Quantum Rainbow',
      primary: 0x8000ff,
      secondary: 0xff0080,
      accent: 0x00ff80,
      cost: 5000,
      description: 'Quantum-phase color shifting hull'
    }
  },
  
  // Performance Modules
  performanceModules: {
    'targeting_computer': {
      name: 'Targeting Computer',
      effect: 'accuracy_boost',
      magnitude: 0.25,
      cost: 1200,
      description: 'Improves weapon accuracy by 25%'
    },
    'shield_booster': {
      name: 'Shield Booster',
      effect: 'shield_regen',
      magnitude: 2.0,
      cost: 1500,
      description: 'Doubles shield regeneration rate'
    },
    'engine_overclock': {
      name: 'Engine Overclock',
      effect: 'speed_boost',
      magnitude: 0.3,
      cost: 1800,
      description: 'Increases speed by 30%'
    },
    'armor_plating': {
      name: 'Armor Plating',
      effect: 'damage_reduction',
      magnitude: 0.2,
      cost: 2000,
      description: 'Reduces incoming damage by 20%'
    },
    'reactor_upgrade': {
      name: 'Reactor Upgrade',
      effect: 'power_boost',
      magnitude: 0.5,
      cost: 3000,
      description: 'Increases all system efficiency by 50%'
    }
  },
  
  // Cosmetic Items
  cosmeticItems: {
    'engine_trail_blue': {
      name: 'Blue Engine Trail',
      type: 'trail',
      color: 0x00aaff,
      cost: 300,
      description: 'Blue particle engine trail'
    },
    'engine_trail_fire': {
      name: 'Fire Engine Trail',
      type: 'trail',
      color: 0xff4400,
      cost: 500,
      description: 'Fiery engine exhaust trail'
    },
    'weapon_glow_green': {
      name: 'Green Weapon Glow',
      type: 'weapon_effect',
      color: 0x00ff00,
      cost: 400,
      description: 'Green energy weapon effects'
    },
    'holographic_decal': {
      name: 'Holographic Decal',
      type: 'decal',
      effect: 'rainbow_shift',
      cost: 1000,
      description: 'Color-shifting holographic hull decal'
    },
    'victory_banner': {
      name: 'Victory Banner',
      type: 'banner',
      effect: 'flowing_flag',
      cost: 1500,
      description: 'Animated victory banner display'
    }
  },
  
  // Current Ship Configuration
  currentConfig: {
    ship: 'explorer_mk1',
    parts: {
      hull: 'standard_hull',
      engines: 'standard_engine',
      shields: 'basic_shield',
      weapons: []
    },
    colorScheme: 'classic_blue',
    modules: [],
    cosmetics: []
  },
  
  // Stats Calculation
  calculatedStats: {
    speed: 25,
    agility: 20,
    armor: 15,
    shields: 10,
    weaponSlots: 2,
    moduleSlots: 3
  }
};

function initShipCustomizationSystem() {
  console.log('🚀 Initializing Comprehensive Ship Customization');
  
  // Initialize available ships
  initializeShipBlueprints();
  
  // Initialize unlocked parts
  initializeUnlockedParts();
  
  // Calculate current ship stats
  calculateShipStats();
  
  // Set up hangar interface
  setupHangarInterface();
  
  console.log('✅ Ship Customization System initialized');
}

function initializeShipBlueprints() {
  // Unlock ships based on player achievements
  const ships = state.shipCustomization.availableShips;
  
  // Always available
  ships.set('explorer_mk1', shipCustomizationSystem.shipBlueprints.explorer_mk1);
  
  // Unlock based on conditions
  if (player.stats.kills >= 100) {
    ships.set('fighter_alpha', shipCustomizationSystem.shipBlueprints.fighter_alpha);
  }
  
  if (player.stats.totalBossKills >= 3) {
    ships.set('cruiser_beta', shipCustomizationSystem.shipBlueprints.cruiser_beta);
  }
  
  if (state.territories.controlledCount >= 5) {
    ships.set('stealth_ghost', shipCustomizationSystem.shipBlueprints.stealth_ghost);
  }
  
  // Legendary unlock condition (placeholder)
  if (player.stats.totalBossKills >= 10) {
    ships.set('dreadnought_omega', shipCustomizationSystem.shipBlueprints.dreadnought_omega);
  }
}

function initializeUnlockedParts() {
  const parts = state.shipCustomization.unlockedParts;
  
  // Always unlocked basic parts
  parts.set('hull', ['standard_hull']);
  parts.set('engines', ['standard_engine']);
  parts.set('shields', ['basic_shield']);
  parts.set('weapons', ['light_mount']);
  
  // Unlock parts based on player progress
  if (player.stats.credits >= 1000) {
    if (!parts.get('hull').includes('reinforced_hull')) {
      parts.get('hull').push('reinforced_hull');
    }
  }
  
  if (player.stats.level >= 5) {
    if (!parts.get('engines').includes('turbo_engine')) {
      parts.get('engines').push('turbo_engine');
    }
  }
  
  // More unlock conditions based on gameplay...
}

function calculateShipStats() {
  const config = shipCustomizationSystem.currentConfig;
  const baseShip = shipCustomizationSystem.shipBlueprints[config.ship];
  const stats = { ...baseShip.baseStats };
  
  // Apply part modifications
  Object.keys(config.parts).forEach(partType => {
    const partId = config.parts[partType];
    if (partId && shipCustomizationSystem.shipParts[partType] && shipCustomizationSystem.shipParts[partType][partId]) {
      const part = shipCustomizationSystem.shipParts[partType][partId];
      Object.keys(part.stats).forEach(stat => {
        stats[stat] = (stats[stat] || 0) + part.stats[stat];
      });
    }
  });
  
  // Apply module effects
  config.modules.forEach(moduleId => {
    const module = shipCustomizationSystem.performanceModules[moduleId];
    if (module) {
      applyModuleEffect(stats, module);
    }
  });
  
  // Store calculated stats
  shipCustomizationSystem.calculatedStats = stats;
  
  // Update player ship stats
  updatePlayerShipStats(stats);
}

function applyModuleEffect(stats, module) {
  switch (module.effect) {
    case 'accuracy_boost':
      // Applied during combat
      break;
    case 'shield_regen':
      stats.shieldRegen = (stats.shieldRegen || 1) * module.magnitude;
      break;
    case 'speed_boost':
      stats.speed *= (1 + module.magnitude);
      break;
    case 'damage_reduction':
      stats.damageReduction = module.magnitude;
      break;
    case 'power_boost':
      Object.keys(stats).forEach(stat => {
        if (typeof stats[stat] === 'number' && stat !== 'damageReduction') {
          stats[stat] *= (1 + module.magnitude * 0.1);
        }
      });
      break;
  }
}

function updatePlayerShipStats(stats) {
  // Update player object with calculated ship stats
  player.maxSpeed = stats.speed;
  player.agility = stats.agility;
  player.maxArmor = stats.armor;
  player.maxShields = stats.shields;
  
  // Ensure current values don't exceed maximums
  player.armor = Math.min(player.armor, player.maxArmor);
  player.shields = Math.min(player.shields, player.maxShields);
}

function setupHangarInterface() {
  // Hangar interface will be handled in UI code
  console.log('🏭 Hangar interface ready');
}`;

// Add ship customization system after boss system
indexContent = indexContent.replace(
  'function updateBossMinions() {',
  `${shipCustomizationSystem}

function updateBossMinions() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Comprehensive Ship Customization (Part 1) deployed!');
console.log('🚀 Features: 5 ship blueprints, modular part system, performance modules');
console.log('🎨 Customization: Hull/engine/shield parts, color schemes, cosmetic items');
console.log('⚡ Performance: Dynamic stat calculation, unlock progression, hangar interface');