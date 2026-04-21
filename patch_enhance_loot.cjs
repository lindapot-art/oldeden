// Enhanced Loot Drop and Collection System - Old Eden Space MMO
// Adds more loot types, improved visual effects, and enhanced collection mechanics

const fs = require('fs');

// Helper for CRLF line endings
const cr = (str) => str.replace(/\n/g, '\r\n');

// Safe replace function
function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.log('❌ FAIL: oldStr not found');
    console.log('Looking for:', oldStr.slice(0, 100) + '...');
    return content;
  }
  return content.replace(oldStr, newStr);
}

console.log('💎 Enhancing loot drop and collection system...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Enhance loot types with more variety
const oldLootTypes = `    const types = ['credits', 'ammo', 'health', 'fuel', 'shield', 'scoreboost'];`;

const newLootTypes = `    // Enhanced loot types with rarity-based selection
    const commonLoot = ['credits', 'ammo', 'health', 'fuel', 'shield'];
    const uncommonLoot = ['scoreboost', 'weapon_mod', 'engine_boost', 'shield_amp'];
    const rareLoot = ['nano_repair', 'quantum_core', 'plasma_charge', 'stealth_field'];
    const legendaryLoot = ['temporal_battery', 'void_crystal', 'omega_upgrade'];
    
    const lootRoll = Math.random();
    let types;
    if (lootRoll < 0.60) types = commonLoot;        // 60% common
    else if (lootRoll < 0.85) types = uncommonLoot; // 25% uncommon  
    else if (lootRoll < 0.97) types = rareLoot;     // 12% rare
    else types = legendaryLoot;                     // 3% legendary`;

content = safeReplace(content, oldLootTypes, newLootTypes);

// 2. Enhanced loot drop creation with better visuals
const oldSpawnLootDrop = `function spawnLootDrop(pos, type, creditValue, rarity) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(_lootOctGeo, _lootMatPool[type] || _lootMatPool.credits);
  g.add(mesh);
  // Glow ring — shared material, not modified per-frame
  const ring = new THREE.Mesh(_lootRingGeo, _lootRingMatPool[type] || _lootRingMatPool.credits);
  g.add(ring);
  // Emissive glow sphere — needs own material because opacity changes per-drop
  const lootGlow = new THREE.Mesh(_lootSphereGeo, (_lootGlowMatPool[type] || _lootGlowMatPool.credits).clone());
  g.add(lootGlow);
  g.userData.lootLight = lootGlow;
  g.userData.lootMesh = mesh;
  g.position.copy(pos);
  g.userData.type = type;
  g.userData.age = 0;
  // Rarity visual scaling
  const _r = rarity || LOOT_RARITIES[0];
  g.userData.rarity = _r;
  if (_r.mult > 1) {
    const sc = 1 + (_r.mult - 1) * 0.2; // slightly bigger for rare+
    mesh.scale.setScalar(sc);
    lootGlow.material.color.setHex(_r.glowHex);
    lootGlow.material.opacity = 0.3 + _r.mult * 0.05;
  }
  scene.add(g);
  c.lootDrops.push({ group: g, type, age: 0, creditValue: creditValue || 50, rarity: _r });
}`;

const newSpawnLootDrop = `function spawnLootDrop(pos, type, creditValue, rarity) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(_lootOctGeo, _lootMatPool[type] || _lootMatPool.credits);
  g.add(mesh);
  
  // Enhanced visual effects based on loot type
  const lootTypeColors = {
    credits: 0xffd700, ammo: 0x44aaff, health: 0x44ff44, fuel: 0xff8844, shield: 0x44ccff,
    scoreboost: 0xcc44ff, weapon_mod: 0xff6644, engine_boost: 0x88ff88, shield_amp: 0x6688ff,
    nano_repair: 0x88ffaa, quantum_core: 0xaa88ff, plasma_charge: 0xff4488, stealth_field: 0x888888,
    temporal_battery: 0xffaa88, void_crystal: 0x8888ff, omega_upgrade: 0xff8888
  };
  
  const lootColor = lootTypeColors[type] || 0xffd700;
  
  // Glow ring with type-specific color
  const ring = new THREE.Mesh(_lootRingGeo, (_lootRingMatPool[type] || _lootRingMatPool.credits).clone());
  ring.material.color.setHex(lootColor);
  g.add(ring);
  
  // Enhanced emissive glow with particle effect
  const lootGlow = new THREE.Mesh(_lootSphereGeo, (_lootGlowMatPool[type] || _lootGlowMatPool.credits).clone());
  lootGlow.material.color.setHex(lootColor);
  lootGlow.material.emissive.setHex(lootColor);
  lootGlow.material.emissiveIntensity = 0.4;
  g.add(lootGlow);
  
  // Spawn effect - expanding energy ring
  const spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.5, 16),
    new THREE.MeshBasicMaterial({ 
      color: lootColor, 
      transparent: true, 
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false 
    })
  );
  spawnRing.name = '_spawnEffect';
  g.add(spawnRing);
  
  // Animate spawn effect
  const animateSpawn = () => {
    if (!spawnRing.parent) return;
    spawnRing.scale.multiplyScalar(1.15);
    spawnRing.material.opacity *= 0.9;
    if (spawnRing.material.opacity > 0.01) {
      requestAnimationFrame(animateSpawn);
    } else {
      g.remove(spawnRing);
      spawnRing.geometry.dispose();
      spawnRing.material.dispose();
    }
  };
  requestAnimationFrame(animateSpawn);
  
  g.userData.lootLight = lootGlow;
  g.userData.lootMesh = mesh;
  g.userData.lootRing = ring;
  g.position.copy(pos);
  g.userData.type = type;
  g.userData.age = 0;
  g.userData.bobSpeed = 0.5 + Math.random() * 1.0; // Variable bob speed
  g.userData.rotSpeed = 1 + Math.random() * 2.0;   // Variable rotation speed
  
  // Rarity visual scaling and effects
  const _r = rarity || LOOT_RARITIES[0];
  g.userData.rarity = _r;
  if (_r.mult > 1) {
    const sc = 1 + (_r.mult - 1) * 0.3; // More dramatic scaling for rare items
    mesh.scale.setScalar(sc);
    ring.scale.setScalar(sc * 1.2);
    lootGlow.material.color.setHex(_r.glowHex);
    lootGlow.material.emissive.setHex(_r.glowHex);
    lootGlow.material.opacity = 0.4 + _r.mult * 0.1;
    lootGlow.material.emissiveIntensity = 0.5 + _r.mult * 0.2;
    
    // Rare item particle corona
    if (_r.mult >= 2.0) {
      const coronaGeo = new THREE.RingGeometry(2, 3, 16);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: _r.glowHex,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const corona = new THREE.Mesh(coronaGeo, coronaMat);
      corona.name = '_rarityCorona';
      g.add(corona);
    }
  }
  
  scene.add(g);
  c.lootDrops.push({ group: g, type, age: 0, creditValue: creditValue || 50, rarity: _r });
  
  // Rare item announcement
  if (_r.mult >= 2.0) {
    addComms('Loot', '💎 ' + _r.name + ' ' + type.replace('_', ' ').toUpperCase() + ' discovered!');
    if (_r.mult >= 4.0) {
      addCombatLog(_r.name + ' ' + type.replace('_', ' ').toUpperCase() + ' found!', _r.color);
    }
  }
}`;

content = safeReplace(content, oldSpawnLootDrop, newSpawnLootDrop);

// 3. Enhanced loot collection with new item types
const oldLootCollection = `        if (l.type === 'credits') { let lootAmt = l.creditValue || 50; if (c.streak >= 5) { lootAmt = Math.floor(lootAmt * 1.5); } state.player.credits += lootAmt; c.dmgNumbers.push({ text: '+' + lootAmt + ' EC' + (c.streak >= 5 ? ' (STREAK)' : ''), px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: c.streak >= 5 ? '#ffaa00' : '#ffd700' }); }
        else if (l.type === 'ammo') { c.ammo = Math.min(c.maxAmmo, c.ammo + 6); c.dmgNumbers.push({ text: '+6 AMMO', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#44aaff' }); }
        else if (l.type === 'health') { state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 15); c.dmgNumbers.push({ text: '+15 HULL', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#44ff44' }); c.repairFlashTimer = 400; }
        else if (l.type === 'fuel') { state.ship.fuel = Math.min(state.ship.maxFuel, state.ship.fuel + 20); c.dmgNumbers.push({ text: '+20 FUEL', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#ff8844' }); }
        else if (l.type === 'shield') {
          if (state.ship.shield >= state.ship.maxShield) {
            // Overcharge — shield beyond max (up to 150%)
            state.ship.shield = Math.min(state.ship.maxShield * 1.5, state.ship.shield + 20);
            c.dmgNumbers.push({ text: '+20 OVERSHIELD', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#88eeff' });
          } else {
            state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + 20);
            c.dmgNumbers.push({ text: '+20 SHIELD', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#44ccff' });
          }
        }
        else if (l.type === 'scoreboost') { const bonus = 100 + Math.floor(c.kills * 5); c.score += bonus; c.dmgNumbers.push({ text: '+' + bonus + ' SCORE', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#cc44ff' }); }`;

const newLootCollection = `        // Enhanced loot collection with new item types
        if (l.type === 'credits') { 
          let lootAmt = l.creditValue || 50; 
          if (c.streak >= 5) lootAmt = Math.floor(lootAmt * 1.5); 
          if (l.rarity && l.rarity.mult > 1) lootAmt = Math.floor(lootAmt * l.rarity.mult);
          state.player.credits += lootAmt; 
          c.dmgNumbers.push({ text: '+' + lootAmt + ' EC' + (c.streak >= 5 ? ' (STREAK)' : ''), px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: c.streak >= 5 ? '#ffaa00' : '#ffd700' }); 
        }
        else if (l.type === 'ammo') { c.ammo = Math.min(c.maxAmmo, c.ammo + 6); c.dmgNumbers.push({ text: '+6 AMMO', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#44aaff' }); }
        else if (l.type === 'health') { state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + 15); c.dmgNumbers.push({ text: '+15 HULL', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#44ff44' }); c.repairFlashTimer = 400; }
        else if (l.type === 'fuel') { state.ship.fuel = Math.min(state.ship.maxFuel, state.ship.fuel + 20); c.dmgNumbers.push({ text: '+20 FUEL', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#ff8844' }); }
        else if (l.type === 'shield') {
          if (state.ship.shield >= state.ship.maxShield) {
            state.ship.shield = Math.min(state.ship.maxShield * 1.5, state.ship.shield + 20);
            c.dmgNumbers.push({ text: '+20 OVERSHIELD', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#88eeff' });
          } else {
            state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + 20);
            c.dmgNumbers.push({ text: '+20 SHIELD', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#44ccff' });
          }
        }
        else if (l.type === 'scoreboost') { const bonus = 100 + Math.floor(c.kills * 5); c.score += bonus; c.dmgNumbers.push({ text: '+' + bonus + ' SCORE', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#cc44ff' }); }
        // NEW LOOT TYPES
        else if (l.type === 'weapon_mod') { 
          c._weaponDamageBoost = (c._weaponDamageBoost || 1) + 0.1; // +10% damage permanently
          c.dmgNumbers.push({ text: '+10% WEAPON DMG', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#ff6644' }); 
          addComms('Upgrade', '⚡ Weapon systems enhanced! +10% damage');
        }
        else if (l.type === 'engine_boost') { 
          if (!c._engineBoostTimer || state.gameTime > c._engineBoostTimer) {
            c._engineBoostTimer = state.gameTime + 60000; // 60s speed boost
            c.dmgNumbers.push({ text: '+SPEED BOOST 60s', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#88ff88' }); 
            addComms('Upgrade', '🚀 Engine boost activated! +50% speed 60s');
          }
        }
        else if (l.type === 'shield_amp') { 
          state.ship.maxShield = Math.floor(state.ship.maxShield * 1.05); // +5% max shield
          state.ship.shield = state.ship.maxShield; // Full recharge
          c.dmgNumbers.push({ text: '+5% MAX SHIELD', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#6688ff' }); 
          addComms('Upgrade', '🛡️ Shield capacitors enhanced! +5% max');
        }
        else if (l.type === 'nano_repair') { 
          const healAmt = Math.floor(state.ship.maxHull * 0.25); // 25% max hull
          state.ship.hull = Math.min(state.ship.maxHull, state.ship.hull + healAmt);
          c.dmgNumbers.push({ text: '+' + healAmt + ' NANO REPAIR', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#88ffaa' }); 
          addComms('Upgrade', '🔧 Nano-bots deployed! Major hull repair');
        }
        else if (l.type === 'quantum_core') { 
          c._quantumCoreUntil = state.gameTime + 30000; // 30s quantum effects
          c.dmgNumbers.push({ text: 'QUANTUM CORE', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#aa88ff' }); 
          addComms('Upgrade', '⚛️ Quantum core active! Phase effects 30s');
        }
        else if (l.type === 'plasma_charge') { 
          c._plasmaChargeStacks = (c._plasmaChargeStacks || 0) + 1; // Stacking damage
          c.dmgNumbers.push({ text: 'PLASMA +' + c._plasmaChargeStacks, px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#ff4488' }); 
          addComms('Upgrade', '🔥 Plasma charge! +'+ (c._plasmaChargeStacks * 15) +'% damage');
        }
        else if (l.type === 'stealth_field') { 
          c._stealthFieldUntil = state.gameTime + 45000; // 45s stealth
          c.dmgNumbers.push({ text: 'STEALTH 45s', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#888888' }); 
          addComms('Upgrade', '👻 Stealth field activated! Invisible 45s');
        }
        else if (l.type === 'temporal_battery') { 
          c._temporalBatteryUntil = state.gameTime + 20000; // 20s time dilation
          c.dmgNumbers.push({ text: 'TIME DILATION', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#ffaa88' }); 
          addComms('Upgrade', '⏱️ Temporal field! Time dilation 20s');
        }
        else if (l.type === 'void_crystal') { 
          c._voidCrystalStacks = (c._voidCrystalStacks || 0) + 1; // Permanent upgrade
          state.ship.maxHull = Math.floor(state.ship.maxHull * 1.1); // +10% max hull
          c.dmgNumbers.push({ text: 'VOID CRYSTAL +10%', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#8888ff' }); 
          addComms('Upgrade', '🌌 Void crystal absorbed! +10% max hull');
        }
        else if (l.type === 'omega_upgrade') { 
          // Ultimate upgrade - boosts everything
          c._weaponDamageBoost = (c._weaponDamageBoost || 1) + 0.25; // +25% damage
          state.ship.maxHull = Math.floor(state.ship.maxHull * 1.15); // +15% hull
          state.ship.maxShield = Math.floor(state.ship.maxShield * 1.15); // +15% shield
          state.player.credits += 1000; // Bonus credits
          c.dmgNumbers.push({ text: '⚡ OMEGA UPGRADE ⚡', px: l.group.position.x, py: l.group.position.y, pz: l.group.position.z, age: 0, color: '#ff8888' }); 
          addComms('EDEN AI', '⚡ OMEGA UPGRADE! All systems enhanced!');
          addCombatLog('OMEGA UPGRADE — Ultimate enhancement!', '#ff8888');
        }`;

content = safeReplace(content, oldLootCollection, newLootCollection);

// 4. Enhanced loot animation with variable speeds and rare item effects
const oldLootAnimation = `      l.group.rotation.y += dt * 2;
      l.group.position.y += Math.sin(l.age * 0.003) * 0.02;
      // Pulse loot glow
      const _lootPulse = 0.5 + 0.5 * Math.sin(l.age * 0.006);
      if (l.group.userData.lootLight) {
        if (l.group.userData.lootLight.isLight) l.group.userData.lootLight.intensity = 1 + _lootPulse * 3;
        else if (l.group.userData.lootLight.material) l.group.userData.lootLight.material.opacity = 0.15 + _lootPulse * 0.2;
      }
      if (l.group.userData.lootMesh) l.group.userData.lootMesh.scale.setScalar(0.9 + _lootPulse * 0.3);`;

const newLootAnimation = `      // Enhanced animation with variable speeds
      const rotSpeed = l.group.userData.rotSpeed || 2;
      const bobSpeed = l.group.userData.bobSpeed || 1;
      
      l.group.rotation.y += dt * rotSpeed;
      l.group.position.y += Math.sin(l.age * 0.003 * bobSpeed) * 0.03;
      
      // Enhanced pulsing with rarity-based intensity
      const rarityMult = l.rarity ? l.rarity.mult : 1;
      const _lootPulse = 0.5 + 0.5 * Math.sin(l.age * 0.006 * rarityMult);
      
      if (l.group.userData.lootLight) {
        if (l.group.userData.lootLight.isLight) {
          l.group.userData.lootLight.intensity = 1 + _lootPulse * (3 + rarityMult);
        } else if (l.group.userData.lootLight.material) {
          l.group.userData.lootLight.material.opacity = 0.15 + _lootPulse * (0.2 + rarityMult * 0.1);
          l.group.userData.lootLight.material.emissiveIntensity = 0.4 + _lootPulse * (0.3 + rarityMult * 0.2);
        }
      }
      
      if (l.group.userData.lootMesh) {
        l.group.userData.lootMesh.scale.setScalar(0.9 + _lootPulse * (0.3 + rarityMult * 0.1));
      }
      
      // Animate glow ring
      if (l.group.userData.lootRing) {
        l.group.userData.lootRing.rotation.z += dt * rotSpeed * 0.5;
        l.group.userData.lootRing.material.opacity = 0.3 + _lootPulse * 0.4;
      }
      
      // Rare item special effects
      if (rarityMult >= 2.0) {
        const corona = l.group.getObjectByName('_rarityCorona');
        if (corona) {
          corona.rotation.z -= dt * rotSpeed * 0.3; // Counter-rotate
          corona.material.opacity = 0.2 + _lootPulse * 0.3;
        }
      }`;

content = safeReplace(content, oldLootAnimation, newLootAnimation);

// 5. Enhanced collection effect with beam animation
const oldMagnetPull = `        // Magnet pull toward player if not yet close enough to pick up
        if (_collectDistSq > 144) {
          _tmpV3b.copy(ship.position).sub(l.group.position).normalize().multiplyScalar(Math.min(1, 50 * dt));
          l.group.position.add(_tmpV3b);
        } else {`;

const newMagnetPull = `        // Enhanced magnet pull with tractor beam effect
        if (_collectDistSq > 144) {
          _tmpV3b.copy(ship.position).sub(l.group.position).normalize().multiplyScalar(Math.min(1, 50 * dt));
          l.group.position.add(_tmpV3b);
          
          // Tractor beam visual effect
          if (!l.group.userData._tractorBeam) {
            const beamGeo = new THREE.CylinderGeometry(0.1, 0.3, l.group.position.distanceTo(ship.position), 8);
            const beamMat = new THREE.MeshBasicMaterial({
              color: l.rarity ? l.rarity.glowHex : 0x44aaff,
              transparent: true,
              opacity: 0.3,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            });
            const tractorBeam = new THREE.Mesh(beamGeo, beamMat);
            tractorBeam.position.copy(l.group.position).lerp(ship.position, 0.5);
            tractorBeam.lookAt(ship.position);
            tractorBeam.rotateX(Math.PI / 2);
            l.group.userData._tractorBeam = tractorBeam;
            scene.add(tractorBeam);
          } else {
            // Update beam
            const beam = l.group.userData._tractorBeam;
            beam.position.copy(l.group.position).lerp(ship.position, 0.5);
            beam.lookAt(ship.position);
            beam.rotateX(Math.PI / 2);
            beam.material.opacity = 0.2 + Math.sin(l.age * 0.01) * 0.2;
          }
        } else {
          // Remove tractor beam when close
          if (l.group.userData._tractorBeam) {
            scene.remove(l.group.userData._tractorBeam);
            l.group.userData._tractorBeam.geometry.dispose();
            l.group.userData._tractorBeam.material.dispose();
            delete l.group.userData._tractorBeam;
          }`;

content = safeReplace(content, oldMagnetPull, newMagnetPull);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced loot drop and collection system added successfully!');
console.log('📊 Features added:');
console.log('   • 11 new loot types with rarity-based selection');
console.log('   • Enhanced visual effects with particle coronas');
console.log('   • Variable animation speeds and pulsing effects');
console.log('   • Improved collection mechanics with upgrades');
console.log('   • Tractor beam visual effects during collection');
console.log('   • Rare item announcements and special effects');
console.log('   • Permanent ship upgrades from rare items');
console.log('   • Stacking power-ups and time-limited bonuses');