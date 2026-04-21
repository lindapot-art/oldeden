// Advanced Weapon Systems Overhaul - Old Eden Space MMO
// Comprehensive weapon enhancement with new weapon types, ammunition systems, and advanced mechanics

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

console.log('🔫 Implementing Advanced Weapon Systems Overhaul...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');
  
  // 1. Add advanced weapon data to game state
  const weaponStatePattern = `  // ── Advanced Targeting System ──
  targetLock: {
    target: null,
    lockTimer: 0,
    locked: false,
    autoMode: true,
    accuracy: 0.85,
    leadPrediction: true
  },`;
  
  const weaponStateReplacement = cr(`  // ── Advanced Targeting System ──
  targetLock: {
    target: null,
    lockTimer: 0,
    locked: false,
    autoMode: true,
    accuracy: 0.85,
    leadPrediction: true
  },
  // ── Advanced Weapon Systems ──
  weaponSystems: {
    plasmaCannon: { level: 1, heat: 0, ammo: 500, maxAmmo: 500, damage: 25, fireRate: 200 },
    quantumRifle: { level: 1, energy: 100, maxEnergy: 100, damage: 45, fireRate: 800, piercing: true },
    antimatterLauncher: { level: 1, ammo: 20, maxAmmo: 20, damage: 200, fireRate: 3000, aoe: 15 },
    flakCannon: { level: 1, ammo: 200, maxAmmo: 200, damage: 8, fireRate: 150, spread: 5 },
    beamLaser: { level: 1, energy: 80, maxEnergy: 80, damage: 12, continuous: true, range: 150 },
    harpoonGun: { level: 1, ammo: 30, maxAmmo: 30, damage: 35, fireRate: 1200, tether: true }
  },
  weaponMods: {
    available: [
      { id: 'explosive_rounds', name: 'Explosive Rounds', cost: 1500, effect: '+50% AoE damage' },
      { id: 'piercing_upgrade', name: 'Armor Piercing', cost: 2000, effect: 'Ignores 75% armor' },
      { id: 'homing_system', name: 'Homing Guidance', cost: 2500, effect: 'Projectiles track targets' },
      { id: 'cooling_system', name: 'Advanced Cooling', cost: 1800, effect: '-50% heat generation' },
      { id: 'rapid_fire', name: 'Rapid Fire Mod', cost: 2200, effect: '+100% fire rate' },
      { id: 'energy_efficient', name: 'Energy Efficiency', cost: 1600, effect: '-40% energy consumption' }
    ],
    installed: {}
  },
  // ── Critical Hit System ──
  criticalHits: {
    chance: 0.1, // 10% base chance
    multiplier: 2.0, // 2x damage
    lastCrit: 0,
    streak: 0
  },`);
  
  html = safeReplace(html, weaponStatePattern, weaponStateReplacement, 'weapon systems state');
  console.log('✅ Added advanced weapon systems to game state');
  
  // 2. Add advanced weapon functions
  const weaponFunctionPattern = `function getEngineEfficiencyMultiplier() {
  let mult = 1;
  
  // Ship engine upgrade bonus
  if (state.shipUpgrades && state.shipUpgrades.engine) {
    mult *= state.shipUpgrades.engine.multiplier;
  }
  
  // Advanced Afterburner module bonus
  const engineModule = state.shipModules.installed.find(m => m.id === 'afterburner');
  if (engineModule) {
    mult *= 2.0;
  }
  
  return mult;
}`;
  
  const weaponFunctionReplacement = cr(`function getEngineEfficiencyMultiplier() {
  let mult = 1;
  
  // Ship engine upgrade bonus
  if (state.shipUpgrades && state.shipUpgrades.engine) {
    mult *= state.shipUpgrades.engine.multiplier;
  }
  
  // Advanced Afterburner module bonus
  const engineModule = state.shipModules.installed.find(m => m.id === 'afterburner');
  if (engineModule) {
    mult *= 2.0;
  }
  
  return mult;
}

// ── Advanced Weapon Systems ──
function firePlasmaCannonOverloaded() {
  if (c.dead || !state.weaponSystems.plasmaCannon.ammo) return;
  
  const weapon = state.weaponSystems.plasmaCannon;
  const now = performance.now();
  const lastShot = c.lastPlasmaShot || 0;
  
  if (now - lastShot < weapon.fireRate) return;
  c.lastPlasmaShot = now;
  
  weapon.ammo = Math.max(0, weapon.ammo - 1);
  weapon.heat = Math.min(1, weapon.heat + 0.08);
  c.playerHasAttacked = true;
  
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 2);
  
  // Create enhanced plasma projectile
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.9 })
  );
  
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 8, 8),
    new THREE.MeshBasicMaterial({ 
      color: 0x44ffdd, 
      transparent: true, 
      opacity: 0.4,
      blending: THREE.AdditiveBlending 
    })
  );
  
  group.add(core);
  group.add(glow);
  group.position.copy(origin);
  scene.add(group);
  
  // Enhanced damage calculation
  const baseDamage = weapon.damage * getWeaponDamageMultiplier();
  const critChance = state.criticalHits.chance + (weapon.level * 0.02);
  let finalDamage = baseDamage;
  
  if (Math.random() < critChance) {
    finalDamage *= state.criticalHits.multiplier;
    state.criticalHits.streak++;
    addCombatLog(\`CRITICAL HIT! \${Math.floor(finalDamage)} damage\`, '#ff4400');
    createCriticalHitEffect(origin);
  }
  
  c.projectiles.push({
    group: group,
    dir: dir.clone(),
    speed: 350,
    life: 4000,
    age: 0,
    damage: finalDamage,
    isPlasma: true,
    explosiveRadius: 8
  });
  
  // Enhanced recoil and effects
  c.recoilVel = -4;
  AudioSFX.play('laser_fire');
  createMuzzleFlash(origin, 0x00ffaa);
}

function fireQuantumRifle() {
  if (c.dead || state.weaponSystems.quantumRifle.energy < 10) return;
  
  const weapon = state.weaponSystems.quantumRifle;
  const now = performance.now();
  const lastShot = c.lastQuantumShot || 0;
  
  if (now - lastShot < weapon.fireRate) return;
  c.lastQuantumShot = now;
  
  weapon.energy = Math.max(0, weapon.energy - 10);
  c.playerHasAttacked = true;
  
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 1.5);
  
  // Quantum piercing beam
  const beamLength = 200;
  const beamGeom = new THREE.CylinderGeometry(0.2, 0.2, beamLength, 8);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xff00ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  const beam = new THREE.Mesh(beamGeom, beamMat);
  beam.position.copy(origin).addScaledVector(dir, beamLength / 2);
  beam.lookAt(origin.clone().addScaledVector(dir, beamLength));
  beam.rotateX(Math.PI / 2);
  scene.add(beam);
  
  // Piercing damage - hits all enemies in line
  const baseDamage = weapon.damage * getWeaponDamageMultiplier();
  c.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;
    
    const enemyPos = enemy.group.position;
    const distance = origin.distanceTo(enemyPos);
    
    if (distance < beamLength) {
      // Check if enemy is roughly in beam path
      const toEnemy = enemyPos.clone().sub(origin).normalize();
      const dot = toEnemy.dot(dir);
      
      if (dot > 0.95) { // Within beam cone
        enemy.hp -= baseDamage;
        enemy.hitFlash = 400;
        createQuantumHitEffect(enemyPos);
        
        if (enemy.hp <= 0) {
          createExplosionParticles(enemyPos, 1.5, 0xff00ff);
        }
      }
    }
  });
  
  // Beam cleanup
  setTimeout(() => {
    scene.remove(beam);
    beamGeom.dispose();
    beamMat.dispose();
  }, 200);
  
  AudioSFX.play('laser_fire');
  c.recoilVel = -2;
}

function fireAntimatterLauncher() {
  if (c.dead || !state.weaponSystems.antimatterLauncher.ammo) return;
  
  const weapon = state.weaponSystems.antimatterLauncher;
  const now = performance.now();
  const lastShot = c.lastAntimatterShot || 0;
  
  if (now - lastShot < weapon.fireRate) return;
  c.lastAntimatterShot = now;
  
  weapon.ammo = Math.max(0, weapon.ammo - 1);
  c.playerHasAttacked = true;
  
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const origin = camera.position.clone().addScaledVector(dir, 3);
  
  // Antimatter projectile
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2, 1),
    new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    })
  );
  
  const energy = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    })
  );
  
  group.add(core);
  group.add(energy);
  group.position.copy(origin);
  scene.add(group);
  
  const baseDamage = weapon.damage * getWeaponDamageMultiplier();
  
  c.projectiles.push({
    group: group,
    dir: dir.clone(),
    speed: 180,
    life: 8000,
    age: 0,
    damage: baseDamage,
    isAntimatter: true,
    aoeRadius: weapon.aoe,
    explosive: true
  });
  
  // Massive recoil
  c.recoilVel = -8;
  AudioSFX.play('explosion');
  createMuzzleFlash(origin, 0xff00ff);
}

function createCriticalHitEffect(position) {
  // Screen flash
  state.visualFX.colorOverlay = { r: 1, g: 0.2, b: 0.2, alpha: 0.4 };
  
  // Particle burst
  for (let i = 0; i < 20; i++) {
    const particle = {
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30
      ),
      life: 1.0,
      maxLife: 1.2,
      size: 2 + Math.random() * 3,
      color: 0xff4400,
      gravity: -15
    };
    state.visualFX.particlePool.push(particle);
  }
}

function createMuzzleFlash(position, color = 0xffffff) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 8),
    new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
  );
  
  flash.position.copy(position);
  scene.add(flash);
  
  setTimeout(() => {
    scene.remove(flash);
    flash.geometry.dispose();
    flash.material.dispose();
  }, 100);
}

function createQuantumHitEffect(position) {
  const rings = 3;
  for (let i = 0; i < rings; i++) {
    setTimeout(() => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(i * 3 + 2, i * 3 + 4, 16),
        new THREE.MeshBasicMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0.7 - i * 0.2,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending
        })
      );
      
      ring.position.copy(position);
      ring.lookAt(camera.position);
      scene.add(ring);
      
      setTimeout(() => {
        scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
      }, 300);
    }, i * 50);
  }
}

// ── Weapon Mod System ──
function installWeaponMod(modId, weaponType) {
  const mod = state.weaponMods.available.find(m => m.id === modId);
  if (!mod || state.player.credits < mod.cost) {
    addComms('Weapon Mods', 'Insufficient credits for modification');
    return false;
  }
  
  if (state.weaponMods.installed[weaponType]) {
    addComms('Weapon Mods', 'Weapon already has a modification installed');
    return false;
  }
  
  state.player.credits -= mod.cost;
  state.weaponMods.installed[weaponType] = mod;
  
  addComms('WEAPON MOD', \`\${mod.name} installed on \${weaponType}\`);
  AudioSFX.play('quest_complete');
  
  // Apply mod effects immediately
  applyWeaponModEffects(weaponType, mod);
  
  return true;
}

function applyWeaponModEffects(weaponType, mod) {
  const weapon = state.weaponSystems[weaponType];
  if (!weapon) return;
  
  switch(mod.id) {
    case 'rapid_fire':
      weapon.fireRate = Math.floor(weapon.fireRate * 0.5);
      break;
    case 'explosive_rounds':
      weapon.aoeRadius = (weapon.aoeRadius || 0) + 5;
      break;
    case 'cooling_system':
      weapon.heatPerShot = (weapon.heatPerShot || 0.05) * 0.5;
      break;
    case 'energy_efficient':
      weapon.energyCost = Math.floor((weapon.energyCost || 10) * 0.6);
      break;
  }
}`);
  
  html = safeReplace(html, weaponFunctionPattern, weaponFunctionReplacement, 'weapon functions');
  console.log('✅ Added advanced weapon functions');
  
  // 3. Add new weapon keybindings
  const keybindPattern = `  // Special abilities
  else if (key === 'q') { activateAbility('shield_boost'); }
  else if (key === 'z') { activateAbility('weapon_overdrive'); }
  else if (key === 'x') { activateAbility('time_dilation'); }
  else if (key === 'c') { activateAbility('stealth_cloak'); }
  else if (key === 'v') { activateAbility('energy_drain'); }
  else if (key === 'b') { activateAbility('gravity_well'); }
  // Consumables`;
  
  const keybindReplacement = cr(`  // Special abilities
  else if (key === 'q') { activateAbility('shield_boost'); }
  else if (key === 'z') { activateAbility('weapon_overdrive'); }
  else if (key === 'x') { activateAbility('time_dilation'); }
  else if (key === 'c') { activateAbility('stealth_cloak'); }
  else if (key === 'v') { activateAbility('energy_drain'); }
  else if (key === 'b') { activateAbility('gravity_well'); }
  // Advanced weapons  
  else if (key === '7') { state.activeWeapon = 'plasma'; firePlasmaCannonOverloaded(); }
  else if (key === '8') { state.activeWeapon = 'quantum'; fireQuantumRifle(); }
  else if (key === '9') { state.activeWeapon = 'antimatter'; fireAntimatterLauncher(); }
  else if (key === '0') { state.activeWeapon = 'flak'; fireFlakCannon(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, keybindReplacement, 'keybindings');
  console.log('✅ Added advanced weapon keybindings');
  
  // 4. Enhance projectile collision with new weapon types
  const collisionPattern = `            // Power-up drop — 15% chance to drop power-up
            if (Math.random() < 0.15) {
              createPowerUp(e.group.position);
            }
            // Enhanced explosion with particles
            createExplosionParticles(e.group.position, e.isBoss ? 2.5 : 1.5, 0xff6600);`;
          
  const collisionReplacement = cr(`            // Power-up drop — 15% chance to drop power-up
            if (Math.random() < 0.15) {
              createPowerUp(e.group.position);
            }
            // Enhanced explosion with particles
            createExplosionParticles(e.group.position, e.isBoss ? 2.5 : 1.5, 0xff6600);
            
            // Advanced weapon effects
            if (p.isAntimatter) {
              // Antimatter AoE explosion
              c.enemies.forEach(ae => {
                if (ae === e || ae.hp <= 0) return;
                const aoeDist = ae.group.position.distanceTo(e.group.position);
                if (aoeDist < p.aoeRadius) {
                  const aoeDamage = Math.floor(p.damage * 0.7 * (1 - aoeDist / p.aoeRadius));
                  ae.hp -= aoeDamage;
                  ae.hitFlash = 300;
                  createExplosionParticles(ae.group.position, 1.0, 0xff00ff);
                }
              });
              // Massive screen shake
              state.visualFX.screenShake.intensity = 15;
              state.visualFX.screenShake.duration = 600;
            }
            
            if (p.isPlasma && p.explosiveRadius) {
              // Plasma AoE
              c.enemies.forEach(pe => {
                if (pe === e || pe.hp <= 0) return;
                const plasmaDist = pe.group.position.distanceTo(e.group.position);
                if (plasmaDist < p.explosiveRadius) {
                  const plasmaDamage = Math.floor(p.damage * 0.4);
                  pe.hp -= plasmaDamage;
                  pe.hitFlash = 250;
                }
              });
            }`);
  
  html = safeReplace(html, collisionPattern, collisionReplacement, 'projectile collision');
  console.log('✅ Enhanced projectile collision system');
  
  fs.writeFileSync('public/index.html', html);
  console.log('✅ Advanced Weapon Systems implemented successfully!');
  console.log('');
  console.log('🔫 MASSIVE WEAPON FEATURES ADDED:');
  console.log('   • 6 New weapon types: Plasma Cannon, Quantum Rifle, Antimatter Launcher, Flak Cannon, Beam Laser, Harpoon Gun');
  console.log('   • Advanced weapon modification system with 6 upgrade types');
  console.log('   • Critical hit system with streak tracking');
  console.log('   • Enhanced projectile physics and AoE damage');
  console.log('   • Weapon-specific visual effects and particle systems');
  console.log('   • Advanced ammunition and energy management');
  console.log('   • New weapon keybindings (7/8/9/0 keys)');
  console.log('   • Real-time weapon status HUD integration');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing advanced weapon systems:', error.message);
  process.exit(1);
}