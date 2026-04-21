// Loot Progression System - Old Eden Space MMO
// Comprehensive loot system with rare items, progressive scaling, and dynamic rewards

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

console.log('🎁 Implementing Loot Progression System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');
  
  // Find insertion point after boss system
  const insertPoint = html.indexOf('bossAnnouncement: { text: \'\', timer: 0, alpha: 0 }') + 'bossAnnouncement: { text: \'\', timer: 0, alpha: 0 }'.length;
  const nextLinePoint = html.indexOf('\n', insertPoint) + 1;
  
  const lootSystemCode = cr(`  // ── Advanced Loot Progression System ──
  lootSystem: {
    activeLoot: [],
    lootHistory: [],
    rarityWeights: {
      common: 0.5,      // 50% chance
      uncommon: 0.25,   // 25% chance
      rare: 0.15,       // 15% chance
      epic: 0.08,       // 8% chance
      legendary: 0.02   // 2% chance
    },
    itemDatabase: [
      // Common Items (white)
      { id: 'scrap_metal', name: 'Scrap Metal', rarity: 'common', value: 25, type: 'material', color: 0xcccccc },
      { id: 'energy_cell', name: 'Energy Cell', rarity: 'common', value: 35, type: 'consumable', color: 0xcccccc },
      { id: 'basic_ammo', name: 'Basic Ammunition', rarity: 'common', value: 20, type: 'ammo', color: 0xcccccc },
      { id: 'repair_kit', name: 'Repair Kit', rarity: 'common', value: 50, type: 'consumable', color: 0xcccccc },
      // Uncommon Items (green)
      { id: 'refined_alloy', name: 'Refined Alloy', rarity: 'uncommon', value: 125, type: 'material', color: 0x00ff00 },
      { id: 'power_core', name: 'Power Core', rarity: 'uncommon', value: 180, type: 'enhancement', color: 0x00ff00 },
      { id: 'plasma_cartridge', name: 'Plasma Cartridge', rarity: 'uncommon', value: 95, type: 'ammo', color: 0x00ff00 },
      { id: 'shield_capacitor', name: 'Shield Capacitor', rarity: 'uncommon', value: 200, type: 'module', color: 0x00ff00 },
      // Rare Items (blue)
      { id: 'quantum_crystal', name: 'Quantum Crystal', rarity: 'rare', value: 500, type: 'material', color: 0x0088ff },
      { id: 'antimatter_fuel', name: 'Antimatter Fuel', rarity: 'rare', value: 650, type: 'consumable', color: 0x0088ff },
      { id: 'targeting_matrix', name: 'Advanced Targeting Matrix', rarity: 'rare', value: 800, type: 'module', color: 0x0088ff },
      { id: 'phase_generator', name: 'Phase Generator', rarity: 'rare', value: 1000, type: 'enhancement', color: 0x0088ff },
      // Epic Items (purple)
      { id: 'void_essence', name: 'Void Essence', rarity: 'epic', value: 2500, type: 'material', color: 0x8800ff },
      { id: 'stellar_core', name: 'Stellar Core', rarity: 'epic', value: 3200, type: 'enhancement', color: 0x8800ff },
      { id: 'dimensional_rift_device', name: 'Dimensional Rift Device', rarity: 'epic', value: 4000, type: 'weapon', color: 0x8800ff },
      { id: 'time_dilation_field', name: 'Time Dilation Field', rarity: 'epic', value: 3800, type: 'module', color: 0x8800ff },
      // Legendary Items (gold/orange)
      { id: 'phoenix_core', name: 'Phoenix Core', rarity: 'legendary', value: 12000, type: 'artifact', color: 0xffaa00 },
      { id: 'void_artifact', name: 'Ancient Void Artifact', rarity: 'legendary', value: 15000, type: 'artifact', color: 0xffaa00 },
      { id: 'genesis_fragment', name: 'Genesis Fragment', rarity: 'legendary', value: 20000, type: 'artifact', color: 0xffaa00 },
      { id: 'cosmic_singularity', name: 'Cosmic Singularity', rarity: 'legendary', value: 25000, type: 'weapon', color: 0xffaa00 }
    ],
    dropRates: {
      enemy_kill: { base: 0.15, scaling: 0.02 },
      boss_kill: { base: 0.8, scaling: 0.1 },
      exploration: { base: 0.05, scaling: 0.01 },
      mission_complete: { base: 0.6, scaling: 0.05 }
    },
    playerStats: {
      itemsFound: 0,
      totalValue: 0,
      rarityFound: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      luckModifier: 1.0,
      magicFind: 0
    },
    currentBoosts: {
      dropRate: 1.0,
      rarity: 1.0,
      value: 1.0,
      duration: 0
    },
    lootAnnouncement: { text: '', timer: 0, alpha: 0, rarity: 'common' }
  },`);
  
  // Insert loot system into state
  html = html.slice(0, nextLinePoint) + lootSystemCode + html.slice(nextLinePoint);
  console.log('✅ Added loot progression system to game state');
  
  // Find insertion point for loot functions (after boss functions)
  const funcInsertPoint = html.indexOf('function createBossSpawnEffect') + html.substring(html.indexOf('function createBossSpawnEffect')).indexOf('}') + 2;
  
  const lootFunctions = cr(`

// ── Advanced Loot Progression System Functions ──
function generateLoot(source = 'enemy_kill', sourceLevel = 1) {
  const lootData = state.lootSystem;
  const dropConfig = lootData.dropRates[source];
  
  // Calculate drop chance with scaling and modifiers
  const baseChance = dropConfig.base + (sourceLevel * dropConfig.scaling);
  const finalChance = baseChance * lootData.currentBoosts.dropRate * lootData.playerStats.luckModifier;
  
  if (Math.random() > finalChance) return null;
  
  // Determine rarity with magic find bonus
  let rarity = rollItemRarity(lootData.playerStats.magicFind);
  
  // Apply rarity boost if active
  if (lootData.currentBoosts.rarity > 1.0 && Math.random() < 0.3) {
    rarity = upgradeRarity(rarity);
  }
  
  // Select random item of determined rarity
  const availableItems = lootData.itemDatabase.filter(item => item.rarity === rarity);
  if (!availableItems.length) return null;
  
  const selectedItem = availableItems[Math.floor(Math.random() * availableItems.length)];
  
  // Create loot instance with scaling
  const lootInstance = {
    ...selectedItem,
    instanceId: Date.now() + Math.random(),
    level: Math.min(100, Math.max(1, sourceLevel + Math.floor(Math.random() * 5) - 2)),
    bonusValue: 0,
    prefix: null,
    suffix: null,
    enchantments: []
  };
  
  // Apply level scaling to value
  lootInstance.value = Math.floor(selectedItem.value * (1 + lootInstance.level * 0.1));
  
  // Apply value boost if active
  if (lootData.currentBoosts.value > 1.0) {
    lootInstance.bonusValue = Math.floor(lootInstance.value * (lootData.currentBoosts.value - 1));
    lootInstance.value += lootInstance.bonusValue;
  }
  
  // Add enchantments for rare+ items
  if (rarity !== 'common' && rarity !== 'uncommon') {
    addItemEnchantments(lootInstance);
  }
  
  // Add prefix/suffix for epic+ items
  if (rarity === 'epic' || rarity === 'legendary') {
    addItemModifiers(lootInstance);
  }
  
  return lootInstance;
}

function rollItemRarity(magicFindBonus = 0) {
  const weights = { ...state.lootSystem.rarityWeights };
  
  // Apply magic find bonus (reduces common chance, increases rare+ chances)
  const mfMultiplier = 1 + (magicFindBonus / 100);
  weights.common /= mfMultiplier;
  weights.rare *= mfMultiplier;
  weights.epic *= mfMultiplier;
  weights.legendary *= mfMultiplier;
  
  // Normalize weights
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  Object.keys(weights).forEach(key => weights[key] /= totalWeight);
  
  const roll = Math.random();
  let cumulative = 0;
  
  for (const [rarity, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (roll <= cumulative) return rarity;
  }
  
  return 'common';
}

function upgradeRarity(currentRarity) {
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const currentIndex = rarityOrder.indexOf(currentRarity);
  return rarityOrder[Math.min(rarityOrder.length - 1, currentIndex + 1)];
}

function addItemEnchantments(item) {
  const enchantmentPool = [
    { name: 'of Power', stat: 'damage', bonus: 15, chance: 0.3 },
    { name: 'of Speed', stat: 'speed', bonus: 20, chance: 0.25 },
    { name: 'of Protection', stat: 'defense', bonus: 18, chance: 0.3 },
    { name: 'of Energy', stat: 'energy', bonus: 25, chance: 0.2 },
    { name: 'of the Void', stat: 'voidDamage', bonus: 30, chance: 0.1 },
    { name: 'of the Phoenix', stat: 'regenRate', bonus: 40, chance: 0.08 },
    { name: 'of Infinity', stat: 'infinite', bonus: 1, chance: 0.02 }
  ];
  
  // Higher rarity items get more enchantments
  const enchantCount = item.rarity === 'rare' ? 1 : 
                     item.rarity === 'epic' ? 2 : 3;
  
  for (let i = 0; i < enchantCount; i++) {
    const availableEnchants = enchantmentPool.filter(e => 
      Math.random() < e.chance && 
      !item.enchantments.some(existing => existing.stat === e.stat)
    );
    
    if (availableEnchants.length > 0) {
      const enchant = availableEnchants[Math.floor(Math.random() * availableEnchants.length)];
      item.enchantments.push({
        name: enchant.name,
        stat: enchant.stat,
        bonus: enchant.bonus + Math.floor(Math.random() * 10)
      });
    }
  }
}

function addItemModifiers(item) {
  const prefixes = ['Superior', 'Enhanced', 'Masterwork', 'Divine', 'Cosmic', 'Transcendent'];
  const suffixes = ['of the Stars', 'of Eternity', 'of the Ancients', 'of Power', 'of the Void'];
  
  if (Math.random() < 0.6) {
    item.prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  }
  
  if (Math.random() < 0.4) {
    item.suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  }
}

function createLootDrop(position, lootItem) {
  if (!lootItem) return;
  
  // Create visual loot representation
  const lootGroup = new THREE.Group();
  
  // Main loot crystal based on rarity
  const crystalGeometry = new THREE.IcosahedronGeometry(1 + lootItem.level * 0.02, 1);
  const crystalMaterial = new THREE.MeshBasicMaterial({
    color: lootItem.color,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
  lootGroup.add(crystal);
  
  // Rarity glow effect
  const glowSize = 1.5 + (lootItem.level * 0.03);
  const glowGeometry = new THREE.SphereGeometry(glowSize, 12, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: lootItem.color,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  lootGroup.add(glow);
  
  // Legendary items get extra effects
  if (lootItem.rarity === 'legendary') {
    const ringGeometry = new THREE.RingGeometry(2, 3, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    lootGroup.add(ring);
    
    // Legendary particle effects
    createLegendaryLootEffects(position, lootItem.color);
  }
  
  lootGroup.position.copy(position);
  lootGroup.position.y += 2; // Float above ground
  scene.add(lootGroup);
  
  // Add to active loot tracking
  const lootDrop = {
    item: lootItem,
    group: lootGroup,
    position: position.clone(),
    spawnTime: performance.now(),
    collected: false,
    pulsePhase: 0
  };
  
  state.lootSystem.activeLoot.push(lootDrop);
  
  // Announce loot based on rarity
  if (lootItem.rarity === 'rare' || lootItem.rarity === 'epic' || lootItem.rarity === 'legendary') {
    announceLootDrop(lootItem);
  }
  
  // Enhanced spawn effects based on rarity
  const effectIntensity = getRarityEffectIntensity(lootItem.rarity);
  createEnergyParticles(position, effectIntensity.particles, lootItem.color);
  createFlashLight(position, lootItem.color, effectIntensity.light, 1.5);
  
  if (lootItem.rarity === 'epic' || lootItem.rarity === 'legendary') {
    createShockwaveRing(position, effectIntensity.shockwave);
  }
}

function updateLootSystem() {
  if (!state.lootSystem) return;
  
  const now = performance.now();
  
  // Update active loot drops
  for (let i = state.lootSystem.activeLoot.length - 1; i >= 0; i--) {
    const loot = state.lootSystem.activeLoot[i];
    
    // Remove expired loot (after 30 seconds)
    if (now - loot.spawnTime > 30000) {
      scene.remove(loot.group);
      loot.group.traverse(child => {
        if (child.material) child.material.dispose();
        if (child.geometry) child.geometry.dispose();
      });
      state.lootSystem.activeLoot.splice(i, 1);
      continue;
    }
    
    // Animate loot (floating and pulsing)
    loot.pulsePhase += 0.05;
    const pulse = Math.sin(loot.pulsePhase) * 0.1 + 1;
    loot.group.scale.setScalar(pulse);
    loot.group.rotation.y += 0.02;
    
    // Check for player collection
    const distance = loot.position.distanceTo(camera.position);
    if (distance < 8 && !loot.collected) {
      collectLoot(loot);
    }
  }
  
  // Update loot boost timers
  if (state.lootSystem.currentBoosts.duration > 0) {
    state.lootSystem.currentBoosts.duration -= 16; // Assuming 60fps
    if (state.lootSystem.currentBoosts.duration <= 0) {
      resetLootBoosts();
    }
  }
  
  // Update loot announcement fade
  if (state.lootSystem.lootAnnouncement.timer > 0) {
    state.lootSystem.lootAnnouncement.timer -= 16;
    state.lootSystem.lootAnnouncement.alpha = Math.max(0, state.lootSystem.lootAnnouncement.timer / 3000);
  }
}

function collectLoot(lootDrop) {
  if (lootDrop.collected) return;
  lootDrop.collected = true;
  
  const item = lootDrop.item;
  
  // Add to player inventory/credits
  state.player.credits += item.value;
  
  // Update player loot stats
  const stats = state.lootSystem.playerStats;
  stats.itemsFound++;
  stats.totalValue += item.value;
  stats.rarityFound[item.rarity]++;
  
  // Apply item effects immediately
  applyItemEffects(item);
  
  // Enhanced collection effects
  createCollectionParticles(lootDrop.position, item.color);
  createFlashLight(lootDrop.position, item.color, 8, 0.8);
  
  // Screen flash for epic+ items
  if (item.rarity === 'epic' || item.rarity === 'legendary') {
    state.visualFX.colorOverlay = {
      r: (item.color >> 16 & 255) / 255,
      g: (item.color >> 8 & 255) / 255,
      b: (item.color & 255) / 255,
      alpha: 0.3
    };
  }
  
  // Audio feedback
  AudioSFX.play('quest_complete'); // Collection sound
  
  // Notification
  const displayName = buildItemDisplayName(item);
  const valueText = item.bonusValue > 0 ? \`\${item.value-item.bonusValue}+\${item.bonusValue}\` : item.value;
  addComms('LOOT COLLECTED', \`\${displayName} (+\${valueText} credits)\`);
  
  // Remove visual
  scene.remove(lootDrop.group);
  lootDrop.group.traverse(child => {
    if (child.material) child.material.dispose();
    if (child.geometry) child.geometry.dispose();
  });
  
  // Remove from active loot
  const index = state.lootSystem.activeLoot.indexOf(lootDrop);
  if (index !== -1) {
    state.lootSystem.activeLoot.splice(index, 1);
  }
}

function buildItemDisplayName(item) {
  let name = item.name;
  
  if (item.prefix) name = \`\${item.prefix} \${name}\`;
  if (item.suffix) name = \`\${name} \${item.suffix}\`;
  if (item.level > 1) name = \`\${name} [\${item.level}]\`;
  
  return name;
}

function applyItemEffects(item) {
  // Apply immediate effects based on item type and enchantments
  switch (item.type) {
    case 'consumable':
      if (item.id === 'energy_cell') {
        // Restore energy to all weapon systems
        Object.keys(state.weaponSystems).forEach(weapon => {
          if (state.weaponSystems[weapon].energy !== undefined) {
            state.weaponSystems[weapon].energy = state.weaponSystems[weapon].maxEnergy;
          }
        });
      } else if (item.id === 'repair_kit') {
        state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 50);
      }
      break;
      
    case 'enhancement':
      applyPermanentEnhancement(item);
      break;
      
    case 'artifact':
      applyArtifactPower(item);
      break;
  }
  
  // Apply enchantment effects
  item.enchantments.forEach(enchant => {
    applyEnchantmentEffect(enchant);
  });
}

function applyPermanentEnhancement(item) {
  switch (item.id) {
    case 'power_core':
      // Increase all weapon damage by 5%
      Object.keys(state.weaponSystems).forEach(weapon => {
        state.weaponSystems[weapon].damage *= 1.05;
      });
      break;
      
    case 'stellar_core':
      // Major power boost
      Object.keys(state.weaponSystems).forEach(weapon => {
        state.weaponSystems[weapon].damage *= 1.2;
      });
      state.ship.maxHull *= 1.15;
      break;
  }
}

function applyArtifactPower(item) {
  switch (item.id) {
    case 'phoenix_core':
      // Phoenix resurrection - restore full health and temporary invulnerability
      state.ship.hull = state.ship.maxHull;
      state.ship.invulnerable = true;
      setTimeout(() => {
        state.ship.invulnerable = false;
      }, 5000);
      activateHyperspace(3000);
      break;
      
    case 'void_artifact':
      // Void power - massive damage boost for 30 seconds
      activateLootBoost('damage', 3.0, 30000);
      break;
      
    case 'genesis_fragment':
      // Genesis power - everything boost
      activateLootBoost('universal', 2.0, 60000);
      break;
  }
}

function activateLootBoost(type, multiplier, duration) {
  const boosts = state.lootSystem.currentBoosts;
  
  switch (type) {
    case 'damage':
      // Apply damage boost to all weapons
      Object.keys(state.weaponSystems).forEach(weapon => {
        state.weaponSystems[weapon].damage *= multiplier;
      });
      break;
      
    case 'dropRate':
      boosts.dropRate = multiplier;
      break;
      
    case 'rarity':
      boosts.rarity = multiplier;
      break;
      
    case 'universal':
      boosts.dropRate = multiplier;
      boosts.rarity = multiplier;
      boosts.value = multiplier;
      state.lootSystem.playerStats.luckModifier = multiplier;
      break;
  }
  
  boosts.duration = Math.max(boosts.duration, duration);
}

function resetLootBoosts() {
  const boosts = state.lootSystem.currentBoosts;
  boosts.dropRate = 1.0;
  boosts.rarity = 1.0;
  boosts.value = 1.0;
  boosts.duration = 0;
  state.lootSystem.playerStats.luckModifier = 1.0;
}

function getRarityEffectIntensity(rarity) {
  const effects = {
    common: { particles: 3, light: 2, shockwave: 0 },
    uncommon: { particles: 6, light: 4, shockwave: 0 },
    rare: { particles: 12, light: 6, shockwave: 1 },
    epic: { particles: 20, light: 10, shockwave: 1.5 },
    legendary: { particles: 35, light: 15, shockwave: 2.5 }
  };
  
  return effects[rarity] || effects.common;
}

function createLegendaryLootEffects(position, color) {
  // Massive legendary spawn effects
  for (let i = 0; i < 50; i++) {
    const particle = {
      position: position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      )),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 80,
        (Math.random() - 0.5) * 40
      ),
      life: 3.0 + Math.random() * 2.0,
      maxLife: 4.0,
      size: 1.5 + Math.random() * 2.5,
      color: color,
      type: 'energy',
      drag: 0.01
    };
    state.visualFX.particlePool.push(particle);
  }
  
  // Legendary shockwave sequence
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      createShockwaveRing(position, 1.5 + i);
    }, i * 500);
  }
  
  // Screen effect
  state.visualFX.screenShake = {
    intensity: 10,
    duration: 1000,
    startTime: performance.now()
  };
}

function createCollectionParticles(position, color) {
  for (let i = 0; i < 15; i++) {
    const particle = {
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        Math.random() * 30 + 10,
        (Math.random() - 0.5) * 40
      ),
      life: 1.0,
      maxLife: 1.0,
      size: 0.8 + Math.random() * 0.5,
      color: color,
      type: 'energy'
    };
    state.visualFX.particlePool.push(particle);
  }
}

function announceLootDrop(item) {
  const rarityColors = {
    rare: '#0088ff',
    epic: '#8800ff',
    legendary: '#ffaa00'
  };
  
  const displayName = buildItemDisplayName(item);
  
  state.lootSystem.lootAnnouncement = {
    text: \`💎 \${item.rarity.toUpperCase()}: \${displayName}\`,
    timer: 4000,
    alpha: 1.0,
    rarity: item.rarity,
    color: rarityColors[item.rarity] || '#ffffff'
  };
}

// Trigger loot drops from different sources
function onEnemyKilled(enemy) {
  const loot = generateLoot('enemy_kill', enemy.level || 1);
  if (loot) {
    createLootDrop(enemy.group.position, loot);
  }
}

function onBossKilled(boss) {
  // Bosses always drop loot, often multiple items
  const lootCount = 2 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < lootCount; i++) {
    const loot = generateLoot('boss_kill', boss.phase * 10);
    if (loot) {
      const offsetPos = boss.group.position.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        0,
        (Math.random() - 0.5) * 20
      ));
      createLootDrop(offsetPos, loot);
    }
  }
}

function onMissionComplete(missionLevel) {
  const loot = generateLoot('mission_complete', missionLevel);
  if (loot) {
    createLootDrop(camera.position.clone().add(new THREE.Vector3(0, 5, -10)), loot);
  }
}

// Debug function for testing
function testLootDrop(rarity = null) {
  const testRarity = rarity || rollItemRarity(state.lootSystem.playerStats.magicFind);
  const availableItems = state.lootSystem.itemDatabase.filter(item => item.rarity === testRarity);
  
  if (availableItems.length > 0) {
    const testItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    const testLoot = {
      ...testItem,
      instanceId: Date.now(),
      level: 1 + Math.floor(Math.random() * 20),
      enchantments: []
    };
    
    if (testRarity !== 'common') addItemEnchantments(testLoot);
    if (testRarity === 'epic' || testRarity === 'legendary') addItemModifiers(testLoot);
    
    createLootDrop(camera.position.clone().add(new THREE.Vector3(0, 3, -15)), testLoot);
  }
}`);
  
  // Insert loot functions
  html = html.slice(0, funcInsertPoint) + lootFunctions + html.slice(funcInsertPoint);
  console.log('✅ Added loot progression functions');
  
  // Add loot system update to game loop
  const gameLoopPattern = `    if (c.active) {
      updateTargetingSystem(dtMs);
      updateParticleSystem(dtMs);
      updatePowerUps(dtMs);
      updateBossAI();
      spawnRandomBoss();
    }`;
    
  const gameLoopReplacement = cr(`    if (c.active) {
      updateTargetingSystem(dtMs);
      updateParticleSystem(dtMs);
      updatePowerUps(dtMs);
      updateBossAI();
      spawnRandomBoss();
      updateLootSystem();
    }`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopReplacement, 'loot system game loop');
  console.log('✅ Added loot system to game loop');
  
  // Add loot testing keybindings
  const keybindPattern = `  // Boss encounters
  else if (key === 'f12') { spawnRandomBoss(); }
  else if (key === 'f11') { if (state.bossSystem.activeBoss) { state.bossSystem.activeBoss.currentHp = Math.max(0, state.bossSystem.activeBoss.currentHp - 1000); } }
  // Consumables`;
  
  const keybindReplacement = cr(`  // Boss encounters
  else if (key === 'f12') { spawnRandomBoss(); }
  else if (key === 'f11') { if (state.bossSystem.activeBoss) { state.bossSystem.activeBoss.currentHp = Math.max(0, state.bossSystem.activeBoss.currentHp - 1000); } }
  // Loot testing
  else if (key === 'f10') { testLootDrop(); }
  else if (key === 'f9') { testLootDrop('rare'); }
  else if (key === 'f8') { testLootDrop('legendary'); }
  else if (key === 'f7') { activateLootBoost('universal', 5.0, 30000); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, keybindReplacement, 'loot testing keybindings');
  console.log('✅ Added loot testing keybindings');
  
  fs.writeFileSync('public/index.html', html);
  console.log('✅ Loot Progression System implemented successfully!');
  console.log('');
  console.log('🎁 MASSIVE LOOT FEATURES ADDED:');
  console.log('   • 5-tier rarity system (Common → Legendary)');
  console.log('   • 20+ unique items with scaling values');
  console.log('   • Dynamic enchantment system with 7+ effects');
  console.log('   • Item prefixes and suffixes for epic+ items');
  console.log('   • Progressive loot scaling with player level');
  console.log('   • Visual loot drops with rarity-based effects');
  console.log('   • Automatic loot collection within range');
  console.log('   • Loot boost system (drop rate, rarity, value)');
  console.log('   • Advanced loot statistics tracking');
  console.log('   • Testing controls (F10 random, F9 rare, F8 legendary, F7 boost)');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing loot progression system:', error.message);
  process.exit(1);
}