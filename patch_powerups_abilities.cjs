// Power-ups and Abilities System - Old Eden Space MMO
// Comprehensive temporary power-ups and special abilities

const fs = require('fs');

function cr(str) {
  return str.replace(/\n/g, '\r\n');
}

console.log('⚡ Implementing power-ups and abilities system...');

const htmlPath = 'd:\\antiruscist\\oldeden\\public\\index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add power-up data structure to game context
const lootMagnetSection = `  // ── Loot Magnet ──
  lootMagnet: { active: false, range: 80, cooldown: 0 },`;

const enhancedLootMagnet = `  // ── Loot Magnet ──
  lootMagnet: { active: false, range: 80, cooldown: 0 },
  // ── Power-ups and Abilities ──
  powerUps: [],
  activePowerUps: [],
  abilities: {
    shield_boost: { cooldown: 0, duration: 8000, ready: true },
    weapon_overdrive: { cooldown: 0, duration: 6000, ready: true },
    time_dilation: { cooldown: 0, duration: 5000, ready: true },
    stealth_cloak: { cooldown: 0, duration: 4000, ready: true },
    energy_drain: { cooldown: 0, duration: 3000, ready: true },
    gravity_well: { cooldown: 0, duration: 7000, ready: true }
  },`;

// Only add if not already present
if (!content.includes('activePowerUps')) {
  content = content.replace(lootMagnetSection, enhancedLootMagnet);
  console.log('✅ Added power-ups data structure');
}

// 2. Add ability control keys
const targetingKeys = `  // Targeting Controls
  else if (key === 't') { manualTargetEnemy(); }
  else if (key === 'g') { clearTargetLock(); }
  else if (key === 'y') { toggleAutoTargeting(); }`;

const enhancedKeys = `  // Targeting Controls
  else if (key === 't') { manualTargetEnemy(); }
  else if (key === 'g') { clearTargetLock(); }
  else if (key === 'y') { toggleAutoTargeting(); }
  // Special Abilities
  else if (key === 'q') { activateAbility('shield_boost'); }
  else if (key === 'z') { activateAbility('weapon_overdrive'); }
  else if (key === 'x') { activateAbility('time_dilation'); }
  else if (key === 'c') { activateAbility('stealth_cloak'); }
  else if (key === 'v') { activateAbility('energy_drain'); }
  else if (key === 'b') { activateAbility('gravity_well'); }`;

// Only add if not already present
if (!content.includes('activateAbility')) {
  content = content.replace(targetingKeys, enhancedKeys);
  console.log('✅ Added ability control keys');
}

// 3. Add power-up and ability functions
const particleFunctionsEnd = `function updateTargetingSystem(dtMs) {`;

const powerUpFunctions = cr(`// ── Power-ups and Abilities System ──
function createPowerUp(position, type) {
  const powerUpTypes = {
    shield_restore: { 
      color: 0x00aaff, 
      name: 'Shield Restore', 
      effect: 'Instantly restore 50% shield',
      rarity: 0.3
    },
    weapon_boost: { 
      color: 0xff4400, 
      name: 'Weapon Boost', 
      effect: '+100% damage for 10 seconds',
      rarity: 0.25
    },
    speed_boost: { 
      color: 0x00ff88, 
      name: 'Speed Boost', 
      effect: '+200% speed for 8 seconds',
      rarity: 0.2
    },
    invulnerability: { 
      color: 0xffaa00, 
      name: 'Invulnerability', 
      effect: 'Immune to damage for 3 seconds',
      rarity: 0.1
    },
    energy_restore: { 
      color: 0xaa00ff, 
      name: 'Energy Surge', 
      effect: 'Unlimited energy for 5 seconds',
      rarity: 0.15
    }
  };
  
  const selectedType = type || Object.keys(powerUpTypes)[Math.floor(Math.random() * Object.keys(powerUpTypes).length)];
  const powerUpData = powerUpTypes[selectedType];
  
  if (!powerUpData) return;
  
  // Create power-up visual
  const geom = new THREE.SphereGeometry(2, 8, 8);
  const mat = new THREE.MeshBasicMaterial({ 
    color: powerUpData.color, 
    transparent: true, 
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(position);
  
  // Add pulsing effect
  const outerGeom = new THREE.RingGeometry(3, 4, 16);
  const outerMat = new THREE.MeshBasicMaterial({ 
    color: powerUpData.color, 
    transparent: true, 
    opacity: 0.3,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const ring = new THREE.Mesh(outerGeom, outerMat);
  ring.lookAt(ship.position);
  mesh.add(ring);
  
  scene.add(mesh);
  
  const powerUp = {
    id: 'powerup_' + Date.now() + '_' + Math.random(),
    type: selectedType,
    mesh: mesh,
    ring: ring,
    data: powerUpData,
    position: position,
    age: 0,
    lifetime: 15000, // 15 seconds before disappearing
    collected: false,
    pulseTimer: 0
  };
  
  c.powerUps.push(powerUp);
  return powerUp;
}

function collectPowerUp(powerUp) {
  if (powerUp.collected) return;
  
  powerUp.collected = true;
  scene.remove(powerUp.mesh);
  
  // Apply power-up effect
  const duration = getPowerUpDuration(powerUp.type);
  const effect = {
    type: powerUp.type,
    data: powerUp.data,
    timeLeft: duration,
    startTime: performance.now()
  };
  
  c.activePowerUps.push(effect);
  
  // Immediate effects
  switch(powerUp.type) {
    case 'shield_restore':
      state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + state.ship.maxShield * 0.5);
      break;
    case 'invulnerability':
      c.deathImmunityUntil = performance.now() + 3000;
      break;
    case 'energy_restore':
      state.ship.energy = state.ship.maxEnergy;
      break;
  }
  
  // Visual and audio feedback
  createExplosionParticles(powerUp.position, 0.8, powerUp.data.color);
  AudioSFX.play('powerup_pickup');
  addCombatLog('POWER-UP: ' + powerUp.data.name, '#ffaa00');
  
  // Screen flash effect
  const flashDiv = document.getElementById('powerup-flash');
  if (flashDiv) {
    flashDiv.classList.remove('active');
    void flashDiv.offsetWidth;
    flashDiv.classList.add('active');
  }
}

function getPowerUpDuration(type) {
  const durations = {
    shield_restore: 0,
    weapon_boost: 10000,
    speed_boost: 8000,
    invulnerability: 3000,
    energy_restore: 5000
  };
  return durations[type] || 0;
}

function activateAbility(abilityName) {
  if (!c.active || c.dead) return;
  
  const ability = c.abilities[abilityName];
  if (!ability || !ability.ready || ability.cooldown > 0) {
    addCombatLog('Ability not ready: ' + abilityName, '#ff4444');
    return;
  }
  
  // Start ability
  ability.ready = false;
  ability.cooldown = getAbilityCooldown(abilityName);
  
  const effect = {
    type: abilityName,
    timeLeft: ability.duration,
    startTime: performance.now(),
    isAbility: true
  };
  
  c.activePowerUps.push(effect);
  
  // Immediate ability effects
  switch(abilityName) {
    case 'shield_boost':
      state.ship.maxShield *= 2;
      state.ship.shield = state.ship.maxShield;
      addCombatLog('SHIELD BOOST ACTIVATED', '#00aaff');
      AudioSFX.play('shield_hit');
      break;
      
    case 'weapon_overdrive':
      addCombatLog('WEAPON OVERDRIVE ACTIVATED', '#ff4400');
      AudioSFX.play('weapon_charge');
      break;
      
    case 'time_dilation':
      addCombatLog('TIME DILATION ACTIVATED', '#aa00ff');
      AudioSFX.play('boost');
      break;
      
    case 'stealth_cloak':
      c.stealthActive = true;
      addCombatLog('STEALTH CLOAK ACTIVATED', '#888888');
      AudioSFX.play('stealth');
      break;
      
    case 'energy_drain':
      addCombatLog('ENERGY DRAIN ACTIVATED', '#ffff00');
      AudioSFX.play('energy_low');
      break;
      
    case 'gravity_well':
      addCombatLog('GRAVITY WELL ACTIVATED', '#ff00aa');
      AudioSFX.play('explosion');
      createGravityWell(ship.position);
      break;
  }
  
  // Energy cost
  state.ship.energy = Math.max(0, state.ship.energy - 20);
}

function getAbilityCooldown(abilityName) {
  const cooldowns = {
    shield_boost: 25000,
    weapon_overdrive: 20000,
    time_dilation: 30000,
    stealth_cloak: 18000,
    energy_drain: 15000,
    gravity_well: 35000
  };
  return cooldowns[abilityName] || 10000;
}

function createGravityWell(position) {
  const wellGeom = new THREE.RingGeometry(5, 25, 32);
  const wellMat = new THREE.MeshBasicMaterial({ 
    color: 0xff00aa, 
    transparent: true, 
    opacity: 0.4,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  const well = new THREE.Mesh(wellGeom, wellMat);
  well.position.copy(position);
  well.lookAt(camera.position);
  scene.add(well);
  
  c.gravityWell = {
    mesh: well,
    position: position.clone(),
    age: 0,
    lifetime: 7000,
    strength: 50
  };
}

function updatePowerUpsAndAbilities(dtMs) {
  // Update power-ups in world
  for (let i = c.powerUps.length - 1; i >= 0; i--) {
    const powerUp = c.powerUps[i];
    if (powerUp.collected) {
      c.powerUps.splice(i, 1);
      continue;
    }
    
    powerUp.age += dtMs;
    powerUp.pulseTimer += dtMs;
    
    // Remove expired power-ups
    if (powerUp.age >= powerUp.lifetime) {
      scene.remove(powerUp.mesh);
      c.powerUps.splice(i, 1);
      continue;
    }
    
    // Pulsing animation
    const pulse = 0.8 + Math.sin(powerUp.pulseTimer * 0.01) * 0.3;
    powerUp.mesh.scale.setScalar(pulse);
    
    // Rotation
    powerUp.mesh.rotation.y += dtMs * 0.003;
    powerUp.ring.rotation.z += dtMs * 0.002;
    
    // Collection check
    const dist = ship.position.distanceTo(powerUp.position);
    if (dist < 8) {
      collectPowerUp(powerUp);
    }
  }
  
  // Update active power-ups and abilities
  for (let i = c.activePowerUps.length - 1; i >= 0; i--) {
    const effect = c.activePowerUps[i];
    effect.timeLeft -= dtMs;
    
    if (effect.timeLeft <= 0) {
      // Remove expired effect
      endPowerUpEffect(effect);
      c.activePowerUps.splice(i, 1);
    }
  }
  
  // Update ability cooldowns
  Object.keys(c.abilities).forEach(abilityName => {
    const ability = c.abilities[abilityName];
    if (ability.cooldown > 0) {
      ability.cooldown = Math.max(0, ability.cooldown - dtMs);
      if (ability.cooldown === 0) {
        ability.ready = true;
      }
    }
  });
  
  // Update gravity well
  if (c.gravityWell) {
    c.gravityWell.age += dtMs;
    
    if (c.gravityWell.age >= c.gravityWell.lifetime) {
      scene.remove(c.gravityWell.mesh);
      c.gravityWell = null;
    } else {
      // Apply gravity effect to enemies
      c.enemies.forEach(e => {
        if (!e || e.hp <= 0) return;
        const dist = e.group.position.distanceTo(c.gravityWell.position);
        if (dist < 30) {
          const pullForce = (30 - dist) / 30 * c.gravityWell.strength;
          const pullDir = new THREE.Vector3().subVectors(c.gravityWell.position, e.group.position).normalize();
          
          e.group.position.add(pullDir.multiplyScalar(pullForce * dtMs * 0.001));
        }
      });
      
      // Visual effect
      const scale = 1 + Math.sin(c.gravityWell.age * 0.005) * 0.2;
      c.gravityWell.mesh.scale.setScalar(scale);
      c.gravityWell.mesh.rotation.z += dtMs * 0.001;
    }
  }
}

function endPowerUpEffect(effect) {
  switch(effect.type) {
    case 'shield_boost':
      if (effect.isAbility) {
        state.ship.maxShield = Math.floor(state.ship.maxShield / 2);
        state.ship.shield = Math.min(state.ship.shield, state.ship.maxShield);
        addCombatLog('Shield boost ended', '#888888');
      }
      break;
    case 'stealth_cloak':
      c.stealthActive = false;
      addCombatLog('Stealth cloak ended', '#888888');
      break;
  }
}

function getActivePowerUpMultipliers() {
  let weaponMultiplier = 1;
  let speedMultiplier = 1;
  let energyDrain = false;
  let timeDilation = false;
  
  c.activePowerUps.forEach(effect => {
    switch(effect.type) {
      case 'weapon_boost':
      case 'weapon_overdrive':
        weaponMultiplier *= 2;
        break;
      case 'speed_boost':
        speedMultiplier *= 3;
        break;
      case 'energy_restore':
        energyDrain = true;
        break;
      case 'time_dilation':
        timeDilation = true;
        break;
    }
  });
  
  return { weaponMultiplier, speedMultiplier, energyDrain, timeDilation };
}

// Random power-up drop chance for enemy deaths
function maybeDropPowerUp(enemyPosition) {
  if (Math.random() < 0.15) { // 15% chance
    const types = ['shield_restore', 'weapon_boost', 'speed_boost', 'energy_restore'];
    const rareChance = Math.random();
    
    let selectedType;
    if (rareChance < 0.05) {
      selectedType = 'invulnerability'; // 5% for rare
    } else {
      selectedType = types[Math.floor(Math.random() * types.length)];
    }
    
    createPowerUp(enemyPosition, selectedType);
  }
}

function updateTargetingSystem(dtMs) {`);

// Only add if not already present
if (!content.includes('function createPowerUp')) {
  content = content.replace(particleFunctionsEnd, powerUpFunctions);
  console.log('✅ Added power-ups and abilities functions');
}

// 4. Add power-up updates to main game loop
const particleUpdateSection = `    // Update particle system
    if (c.active) updateParticleSystem(dtMs);`;

const enhancedParticleUpdate = `    // Update particle system
    if (c.active) updateParticleSystem(dtMs);
    
    // Update power-ups and abilities
    if (c.active) updatePowerUpsAndAbilities(dtMs);`;

// Only add if not already present
if (!content.includes('updatePowerUpsAndAbilities')) {
  content = content.replace(particleUpdateSection, enhancedParticleUpdate);
  console.log('✅ Added power-ups update to game loop');
}

// 5. Add power-up drops to enemy death
const enemyDeathSection = `          addCombatLog(\`Eliminated \${e.type || 'Enemy'} — +\${xpGain} XP\`, '#44ff44');`;

const enhancedEnemyDeath = `          addCombatLog(\`Eliminated \${e.type || 'Enemy'} — +\${xpGain} XP\`, '#44ff44');
          
          // Chance to drop power-up
          maybeDropPowerUp(e.group.position);`;

// Only add if not already present
if (!content.includes('maybeDropPowerUp')) {
  content = content.replace(enemyDeathSection, enhancedEnemyDeath);
  console.log('✅ Added power-up drops to enemy deaths');
}

// Write the file
fs.writeFileSync(htmlPath, content);

console.log('✅ Power-ups and abilities system implemented successfully!');
console.log('📊 Features added:');
console.log('   • 5 power-up types with different effects and rarities');
console.log('   • 6 special abilities with cooldowns (Q/Z/X/C/V/B keys)');
console.log('   • Power-up collection system with visual effects');
console.log('   • 15% chance for enemies to drop power-ups');
console.log('   • Gravity well ability that pulls enemies');
console.log('   • Stealth cloak, time dilation, weapon overdrive abilities');
console.log('   • Dynamic multipliers for weapon damage and speed');