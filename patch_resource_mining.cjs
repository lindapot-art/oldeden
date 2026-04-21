// RESOURCE MINING SYSTEM

const fs = require('fs');

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

function safeReplace(content, searchStr, replaceStr, context = '') {
  const searchNormalized = searchStr.replace(/\r?\n/g, '\r\n');
  const replaceNormalized = replaceStr.replace(/\r?\n/g, '\r\n');
  
  if (!content.includes(searchNormalized)) {
    throw new Error(`Pattern not found in ${context}: "${searchStr.substring(0, 50)}..."`);
  }
  
  const newContent = content.replace(searchNormalized, replaceNormalized);
  if (newContent === content) {
    throw new Error(`No changes made in ${context}`);
  }
  
  return newContent;
}

console.log('⛏️ Implementing Resource Mining System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add resource mining keybindings
  const keybindPattern = `  else if (key === 'm' || key === 'M') { showMarketAnalysis(); }
  // Consumables`;
  
  const miningKeybinds = cr(`  else if (key === 'm' || key === 'M') { showMarketAnalysis(); }
  // ═══ RESOURCE MINING ═══
  else if (key === 'i' || key === 'I') { showMiningInterface(); }
  else if (key === 'l' || key === 'L') { deployMiningLaser(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, miningKeybinds, 'resource mining keybindings');
  console.log('✅ Added resource mining keybindings (I=interface, L=mine)');

  // Add mining system functions before trading system
  const functionInsertionPoint = html.indexOf('// ═══ SPACE TRADING SYSTEM ═══');
  
  const miningFunctions = cr(`
// ═══ RESOURCE MINING SYSTEM ═══

const MiningSystem = {
  // Mineable resources
  resources: {
    'iron_ore': {
      name: 'Iron Ore',
      rarity: 'common',
      baseValue: 25,
      miningDifficulty: 1.0,
      color: '#8B4513',
      description: 'Basic construction material',
      refinedProduct: 'ore'
    },
    'titanium_ore': {
      name: 'Titanium Ore',
      rarity: 'uncommon', 
      baseValue: 65,
      miningDifficulty: 1.5,
      color: '#C0C0C0',
      description: 'Advanced hull plating',
      refinedProduct: 'ore'
    },
    'quantum_crystals': {
      name: 'Quantum Crystals',
      rarity: 'rare',
      baseValue: 180,
      miningDifficulty: 2.5,
      color: '#00FFFF',
      description: 'Energy matrix cores',
      refinedProduct: 'crystals'
    },
    'dark_matter': {
      name: 'Dark Matter',
      rarity: 'epic',
      baseValue: 450,
      miningDifficulty: 4.0,
      color: '#800080',
      description: 'Exotic propulsion fuel',
      refinedProduct: 'crystals'
    },
    'neutronium': {
      name: 'Neutronium',
      rarity: 'legendary',
      baseValue: 1200,
      miningDifficulty: 6.0,
      color: '#FFD700',
      description: 'Ultra-dense weapon core',
      refinedProduct: 'weapons'
    },
    'bio_essence': {
      name: 'Bio Essence',
      rarity: 'uncommon',
      baseValue: 85,
      miningDifficulty: 1.8,
      color: '#90EE90',
      description: 'Organic compound base',
      refinedProduct: 'medicine'
    },
    'nano_filaments': {
      name: 'Nano Filaments',
      rarity: 'rare',
      baseValue: 320,
      miningDifficulty: 3.2,
      color: '#FF69B4',
      description: 'Self-repairing materials',
      refinedProduct: 'nanobots'
    },
    'data_fragments': {
      name: 'Data Fragments',
      rarity: 'common',
      baseValue: 40,
      miningDifficulty: 1.2,
      color: '#00FF00',
      description: 'Corrupted information banks',
      refinedProduct: 'data'
    }
  },
  
  // Mining equipment and upgrades
  equipment: {
    laserPower: 1.0,        // Mining laser strength
    efficiency: 1.0,        // Resource yield multiplier
    speed: 1.0,             // Mining speed multiplier
    refineryLevel: 1,       // Auto-refinery capability (1-5)
    cargoExpansion: 0,      // Bonus cargo capacity
    scannerRange: 100,      // Asteroid detection range
    
    // Equipment upgrade costs
    upgradeCosts: {
      laserPower: [500, 1200, 2800, 6500, 15000],
      efficiency: [800, 1900, 4500, 10500, 25000],
      speed: [600, 1400, 3300, 7700, 18000],
      refineryLevel: [1000, 2500, 6000, 14000, 35000],
      cargoExpansion: [400, 1000, 2400, 5600, 13000],
      scannerRange: [300, 700, 1700, 4000, 9500]
    }
  },
  
  // Active mining nodes (asteroids)
  activeNodes: [],
  
  // Player mining stats
  stats: {
    totalMined: 0,
    sessionsCompleted: 0,
    rareFinds: 0,
    refinedGoods: 0,
    credits_earned: 0
  },
  
  // Current mining operation
  activeMining: null,
  
  // Spawn mining asteroids
  spawnAsteroid(position) {
    const resources = Object.keys(this.resources);
    const rarities = { common: 0.6, uncommon: 0.25, rare: 0.1, epic: 0.04, legendary: 0.01 };
    
    // Select resource type based on rarity
    let selectedResource = null;
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [rarity, chance] of Object.entries(rarities)) {
      cumulative += chance;
      if (roll <= cumulative) {
        const rarityResources = resources.filter(r => this.resources[r].rarity === rarity);
        selectedResource = rarityResources[Math.floor(Math.random() * rarityResources.length)];
        break;
      }
    }
    
    if (!selectedResource) selectedResource = 'iron_ore'; // Fallback
    
    const resource = this.resources[selectedResource];
    const yieldAmount = Math.floor(5 + Math.random() * 15) * resource.miningDifficulty;
    
    const asteroid = {
      id: 'asteroid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      resourceType: selectedResource,
      resource: resource,
      totalYield: yieldAmount,
      remainingYield: yieldAmount,
      position: {
        x: position.x + (Math.random() - 0.5) * 200,
        y: position.y + (Math.random() - 0.5) * 50,
        z: position.z + (Math.random() - 0.5) * 200
      },
      discovered: false,
      mined: 0
    };
    
    this.activeNodes.push(asteroid);
    
    return asteroid;
  },
  
  // Find nearby asteroids for mining
  scanForAsteroids(position, range) {
    const nearby = [];
    
    for (const node of this.activeNodes) {
      const distance = Math.sqrt(
        Math.pow(position.x - node.position.x, 2) +
        Math.pow(position.y - node.position.y, 2) +
        Math.pow(position.z - node.position.z, 2)
      );
      
      if (distance <= range && node.remainingYield > 0) {
        node.distance = distance;
        node.discovered = true;
        nearby.push(node);
      }
    }
    
    return nearby.sort((a, b) => a.distance - b.distance);
  },
  
  // Start mining operation
  startMining(asteroidId) {
    const asteroid = this.activeNodes.find(n => n.id === asteroidId);
    if (!asteroid) return { success: false, reason: 'Asteroid not found' };
    
    const distance = Math.sqrt(
      Math.pow(ship.position.x - asteroid.position.x, 2) +
      Math.pow(ship.position.y - asteroid.position.y, 2) +
      Math.pow(ship.position.z - asteroid.position.z, 2)
    );
    
    if (distance > 30) {
      return { success: false, reason: 'Too far from asteroid (30m range)' };
    }
    
    this.activeMining = {
      asteroid: asteroid,
      startTime: performance.now(),
      progress: 0,
      yieldCollected: 0
    };
    
    addComms('MINING', \`Mining \${asteroid.resource.name} - \${asteroid.remainingYield} units remaining\`);
    
    return { success: true };
  },
  
  // Process mining operation
  updateMining(dtMs) {
    if (!this.activeMining) return;
    
    const mining = this.activeMining;
    const asteroid = mining.asteroid;
    const resource = asteroid.resource;
    
    // Calculate mining rate
    const baseMiningRate = 0.8; // units per second
    const difficultyModifier = 1.0 / resource.miningDifficulty;
    const equipmentModifier = this.equipment.speed * this.equipment.laserPower;
    
    const effectiveMiningRate = baseMiningRate * difficultyModifier * equipmentModifier;
    const minedThisFrame = effectiveMiningRate * (dtMs / 1000);
    
    mining.progress += minedThisFrame;
    
    // Extract whole units
    const unitsToExtract = Math.floor(mining.progress);
    if (unitsToExtract > 0) {
      mining.progress -= unitsToExtract;
      
      const actualExtracted = Math.min(unitsToExtract, asteroid.remainingYield);
      asteroid.remainingYield -= actualExtracted;
      mining.yieldCollected += actualExtracted;
      
      // Add to refined cargo or raw materials
      const refinedProduct = resource.refinedProduct;
      const refinedAmount = Math.floor(actualExtracted * this.equipment.efficiency);
      
      if (this.equipment.refineryLevel >= 1 && refinedAmount > 0) {
        // Auto-refine into trade goods
        if (TradingSystem && TradingSystem.cargoHold.canAdd(refinedProduct, refinedAmount)) {
          TradingSystem.cargoHold.add(refinedProduct, refinedAmount);
          addComms('REFINERY', \`Auto-refined: \${refinedAmount}x \${TradingSystem.goods[refinedProduct].name}\`);
          this.stats.refinedGoods += refinedAmount;
        }
      }
      
      // Visual feedback
      c.dmgNumbers.push({
        text: \`⛏️ +\${actualExtracted} \${resource.name}\`,
        px: ship.position.x + 10,
        py: ship.position.y + 5,
        pz: ship.position.z,
        age: 0,
        color: resource.color,
        scale: 0.8
      });
      
      this.stats.totalMined += actualExtracted;
      
      // Rare find bonus
      if (resource.rarity === 'rare' || resource.rarity === 'epic' || resource.rarity === 'legendary') {
        this.stats.rareFinds++;
        
        c.dmgNumbers.push({
          text: \`💎 RARE FIND!\`,
          px: ship.position.x,
          py: ship.position.y + 15,
          pz: ship.position.z,
          age: 0,
          color: '#FFD700',
          scale: 1.5
        });
      }
      
      // Check if asteroid depleted
      if (asteroid.remainingYield <= 0) {
        addComms('MINING', \`Asteroid depleted - Total yield: \${mining.yieldCollected} units\`);
        this.activeMining = null;
        this.stats.sessionsCompleted++;
        
        // Remove depleted asteroid
        const index = this.activeNodes.findIndex(n => n.id === asteroid.id);
        if (index >= 0) this.activeNodes.splice(index, 1);
      }
    }
  },
  
  // Stop current mining operation
  stopMining() {
    if (this.activeMining) {
      addComms('MINING', \`Mining stopped - Collected \${this.activeMining.yieldCollected} units\`);
      this.activeMining = null;
    }
  },
  
  // Upgrade equipment
  upgradeEquipment(type) {
    if (!this.equipment.upgradeCosts[type]) return { success: false, reason: 'Unknown equipment type' };
    
    const currentLevel = type === 'refineryLevel' ? this.equipment[type] - 1 : 
                        type === 'cargoExpansion' ? Math.floor(this.equipment[type] / 10) :
                        Math.floor((this.equipment[type] - 1.0) / 0.25);
    
    if (currentLevel >= 5) return { success: false, reason: 'Maximum level reached' };
    
    const cost = this.equipment.upgradeCosts[type][currentLevel];
    if (c.credits < cost) return { success: false, reason: 'Insufficient credits' };
    
    c.credits -= cost;
    
    // Apply upgrade
    switch (type) {
      case 'laserPower':
      case 'efficiency':
      case 'speed':
        this.equipment[type] += 0.25;
        break;
      case 'refineryLevel':
        this.equipment[type]++;
        break;
      case 'cargoExpansion':
        this.equipment[type] += 10;
        if (TradingSystem) TradingSystem.cargoHold.capacity += 10;
        break;
      case 'scannerRange':
        this.equipment[type] += 25;
        break;
    }
    
    addComms('UPGRADE', \`\${type} upgraded for \${cost} credits\`);
    
    return { success: true, cost };
  }
};

function showMiningInterface() {
  const nearby = MiningSystem.scanForAsteroids(ship.position, MiningSystem.equipment.scannerRange);
  
  addComms('MINING', '═══ MINING INTERFACE ═══');
  addComms('SCANNER', \`Scanner Range: \${MiningSystem.equipment.scannerRange}m\`);
  
  if (nearby.length === 0) {
    addComms('SCAN', 'No asteroids detected in scanner range');
    
    // Spawn new asteroids occasionally
    if (Math.random() < 0.3) {
      for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
        MiningSystem.spawnAsteroid(ship.position);
      }
      addComms('SCAN', 'New asteroid field detected on long-range sensors');
    }
  } else {
    addComms('SCAN', \`\${nearby.length} asteroids detected:\`);
    
    for (let i = 0; i < Math.min(nearby.length, 5); i++) {
      const asteroid = nearby[i];
      const resource = asteroid.resource;
      addComms('ASTEROID', \`\${i+1}. \${resource.name} (\${asteroid.remainingYield} units, \${asteroid.distance.toFixed(0)}m)\`);
    }
  }
  
  // Current mining status
  if (MiningSystem.activeMining) {
    const mining = MiningSystem.activeMining;
    const progress = (mining.yieldCollected / mining.asteroid.totalYield * 100).toFixed(1);
    addComms('STATUS', \`Mining: \${mining.asteroid.resource.name} (\${progress}% complete)\`);
  }
  
  // Equipment status
  addComms('EQUIPMENT', '─── MINING EQUIPMENT ───');
  const eq = MiningSystem.equipment;
  addComms('LASER', \`Laser Power: \${eq.laserPower.toFixed(2)}x | Efficiency: \${eq.efficiency.toFixed(2)}x\`);
  addComms('REFINERY', \`Auto-Refinery: Level \${eq.refineryLevel}/5 | Scanner: \${eq.scannerRange}m\`);
  
  // Mining stats
  const stats = MiningSystem.stats;
  addComms('STATS', \`Total Mined: \${stats.totalMined} | Rare Finds: \${stats.rareFinds} | Sessions: \${stats.sessionsCompleted}\`);
  
  c.dmgNumbers.push({
    text: '⛏️ MINING INTERFACE',
    px: ship.position.x,
    py: ship.position.y + 20,
    pz: ship.position.z,
    age: 0,
    color: '#FFB000',
    scale: 1.3
  });
}

function deployMiningLaser() {
  const nearby = MiningSystem.scanForAsteroids(ship.position, 30); // 30m mining range
  
  if (nearby.length === 0) {
    addComms('MINING', 'No asteroids in mining range (30m)');
    return;
  }
  
  if (MiningSystem.activeMining) {
    MiningSystem.stopMining();
    return;
  }
  
  // Start mining closest asteroid
  const result = MiningSystem.startMining(nearby[0].id);
  
  if (result.success) {
    c.dmgNumbers.push({
      text: '🔥 MINING LASER ACTIVE',
      px: ship.position.x,
      py: ship.position.y + 12,
      pz: ship.position.z,
      age: 0,
      color: '#FF4444',
      scale: 1.2
    });
  } else {
    addComms('ERROR', result.reason);
  }
}

function updateMiningSystem(dtMs) {
  // Update active mining operation
  MiningSystem.updateMining(dtMs);
  
  // Periodically spawn new asteroid fields if none exist nearby
  if (MiningSystem.activeNodes.length < 5 && Math.random() < 0.01) {
    const spawnDistance = 100 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    const spawnPos = {
      x: ship.position.x + Math.cos(angle) * spawnDistance,
      y: ship.position.y,
      z: ship.position.z + Math.sin(angle) * spawnDistance
    };
    
    for (let i = 0; i < 2 + Math.floor(Math.random() * 4); i++) {
      MiningSystem.spawnAsteroid(spawnPos);
    }
  }
  
  // Clean up distant asteroids
  MiningSystem.activeNodes = MiningSystem.activeNodes.filter(node => {
    const distance = Math.sqrt(
      Math.pow(ship.position.x - node.position.x, 2) +
      Math.pow(ship.position.z - node.position.z, 2)
    );
    return distance < 500; // Remove asteroids more than 500m away
  });
}

// Initialize mining system with some starting asteroids
for (let i = 0; i < 3; i++) {
  MiningSystem.spawnAsteroid({ x: Math.random() * 200 - 100, y: 0, z: Math.random() * 200 - 100 });
}

`);
  
  html = html.slice(0, functionInsertionPoint) + miningFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added resource mining system');

  // Add mining update to game loop
  const gameLoopPattern = `      updateTradingSystem(dtMs);
      updateParticleSystem(dtMs);`;
      
  const gameLoopWithMining = cr(`      updateTradingSystem(dtMs);
      updateMiningSystem(dtMs);
      updateParticleSystem(dtMs);`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithMining, 'mining game loop');
  console.log('✅ Added mining system to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Resource Mining System implemented successfully!');
  console.log('');
  console.log('⛏️ RESOURCE MINING FEATURES:');
  console.log('   • I key: Mining interface and asteroid scanner');
  console.log('   • L key: Deploy/stop mining laser');
  console.log('   • 8 Mineable resources from common to legendary rarity');
  console.log('   • Dynamic asteroid spawning and depletion');
  console.log('   • Mining equipment upgrades (laser, efficiency, refinery)');
  console.log('   • Auto-refinery converts raw ore into trade goods');
  console.log('   • Scanner range and cargo capacity upgrades');
  console.log('   • Mining statistics and rare find tracking');
  console.log('   • Integration with trading system for refined goods');
  console.log('   • Visual feedback and mining progress indicators');
  console.log('   • Distance-based mining with 30m laser range');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing mining system:', error.message);
  process.exit(1);
}