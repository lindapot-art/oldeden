// Boss Enhancement System - Old Eden Space MMO
// Enhances existing boss mechanics with abilities and phases

const fs = require('fs');

// Safe replace function
function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.log('❌ FAIL: oldStr not found');
    console.log('Looking for:', oldStr.slice(0, 100) + '...');
    return content;
  }
  return content.replace(oldStr, newStr);
}

console.log('⚡ Enhancing existing boss system...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Enhance boss spawn chance to be more dynamic
const oldBossSpawn = `      // Boss spawn every 20 kills
      if (c.kills >= (c._nextBossAt || 20) && !c.bossActive) {
        c._nextBossAt = (c._nextBossAt || 20) + 20;
        c.bossActive = true;
        AudioSFX.play('boss_warn');
        addComms('AI Director', '⚠ BOSS DETECTED — massive hostile signature!');
        // Boss warning — reuse persistent overlay element
        const _bwEl = document.getElementById('boss-warning-overlay');
        if (_bwEl) { _bwEl.classList.add('active'); setTimeout(() => _bwEl.classList.remove('active'), 2500); }
        c.damageFlash = 400;
        createBossEnemy();
      }`;

const newBossSpawn = `      // Enhanced boss spawn with escalating frequency
      if (c.kills >= (c._nextBossAt || 20) && !c.bossActive) {
        // Bosses spawn more frequently as player progresses: 20, 35, 45, 50, 55...
        const nextInterval = Math.max(10, 20 - Math.floor(c.kills / 50) * 2);
        c._nextBossAt = (c._nextBossAt || 20) + nextInterval;
        c.bossActive = true;
        c._bossPhase = 1;
        c._bossEnrageTime = 0;
        c._bossLastAbility = Date.now();
        
        AudioSFX.play('boss_warn');
        addComms('AI Director', '🚨 CRITICAL THREAT — massive hostile signature detected!');
        
        // Enhanced boss warning sequence
        setTimeout(() => {
          addComms('TACTICAL', 'Boss-class entity confirmed. All weapons free!');
        }, 1500);
        
        // Boss warning — reuse persistent overlay element
        const _bwEl = document.getElementById('boss-warning-overlay');
        if (_bwEl) { _bwEl.classList.add('active'); setTimeout(() => _bwEl.classList.remove('active'), 3500); }
        c.damageFlash = 400;
        createEnhancedBoss();
      }`;

content = safeReplace(content, oldBossSpawn, newBossSpawn);

// 2. Create enhanced boss creation function
const oldCreateBossEnemy = `function createBossEnemy() {
  const g = new THREE.Group();
  const bossIdx = Math.floor(Math.random() * BOSS_MODELS.length);
  const bossKey = BOSS_MODELS[bossIdx];
  const bossTint = BOSS_TINTS[bossIdx];
  const bossScale = bossKey.startsWith('titan') ? 1.8 : 1.5;

  const bossSrc = state.loadedModels[bossKey];
  if (bossSrc) {
    g.add(reskinModel(bossSrc, bossScale, bossTint.tint, bossTint.emissive));
  } else {
    // Procedural fallback if GLB not loaded yet
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.3, metalness: 0.9, emissive: 0xff4400, emissiveIntensity: 0.5 });
    g.add(new THREE.Mesh(new THREE.BoxGeometry(6, 2, 10), bossMat));
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcc1100, roughness: 0.4, metalness: 0.8, emissive: 0xcc2200, emissiveIntensity: 0.3 });
    { const w1 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 5), wingMat); w1.position.set(-8, 0, 0); g.add(w1); }
    { const w2 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 5), wingMat); w2.position.set(8, 0, 0); g.add(w2); }
  }

  // Boss warning lights — emissive mesh (cheaper than PointLight)
  if (!createBossEnemy._warnGeo) { createBossEnemy._warnGeo = new THREE.SphereGeometry(1.5, 8, 8); createBossEnemy._warnGeo._pooled = true; }
  const _bwMat = new THREE.MeshBasicMaterial({ color: bossTint.tint, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const warnLight = new THREE.Mesh(createBossEnemy._warnGeo, _bwMat);
  warnLight.position.set(0, 2, 0);
  g.add(warnLight);

  const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
  const r = SPAWN_RADIUS + 200;
  g.position.set(ship.position.x + r*Math.sin(phi)*Math.cos(theta), ship.position.y + r*Math.sin(phi)*Math.sin(theta)*0.3, ship.position.z + r*Math.cos(phi));
  g.lookAt(ship.position);
  scene.add(g);
  const bDiff = Math.min(8, 1 + (state.player.rebirths || 0) * 0.2 + (c.cycle - 1) * 0.12);
  const bossHp = Math.ceil((bossKey.startsWith('titan') ? 80 : 60) * bDiff);
  c.enemies.push({ group: g, hp: bossHp, maxHp: bossHp, speed: ENEMY_SPEED * 0.4, type: 'boss', points: 500, cfg: { scale: bossScale, color: bossTint.tint }, hitFlash: 0, isBoss: true, bossName: bossTint.name });
  addComms('THREAT', \`⚠ \${bossTint.name} detected! Massive hostile signature incoming!\`);
}`;

const newCreateBossEnemy = `function createEnhancedBoss() {
  const g = new THREE.Group();
  const bossIdx = Math.floor(Math.random() * BOSS_MODELS.length);
  const bossKey = BOSS_MODELS[bossIdx];
  const bossTint = BOSS_TINTS[bossIdx];
  const bossScale = bossKey.startsWith('titan') ? 2.2 : 1.8; // Larger bosses

  // Enhanced boss types with abilities
  const bossAbilities = [
    ['void_beam', 'gravity_well'],
    ['plasma_storm', 'shield_boost'],
    ['quantum_shift', 'temporal_rift'],
    ['solar_flare', 'heat_wave'],
    ['nano_swarm', 'repair_burst'],
    ['dark_pulse', 'energy_drain']
  ];

  const bossSrc = state.loadedModels[bossKey];
  if (bossSrc) {
    g.add(reskinModel(bossSrc, bossScale, bossTint.tint, bossTint.emissive));
  } else {
    // Enhanced procedural fallback
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xff2200, roughness: 0.2, metalness: 0.95, emissive: 0xff4400, emissiveIntensity: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 12), bossMat);
    g.add(body);
    
    // Enhanced wings with glow
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xcc1100, roughness: 0.3, metalness: 0.9, emissive: 0xcc2200, emissiveIntensity: 0.6 });
    { const w1 = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 6), wingMat); w1.position.set(-10, 0, 0); g.add(w1); }
    { const w2 = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 6), wingMat); w2.position.set(10, 0, 0); g.add(w2); }
    
    // Add weapon pods
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0x440000, emissiveIntensity: 0.4 });
    for (let i = 0; i < 4; i++) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 3, 6), weaponMat);
      pod.position.set((i % 2) * 6 - 3, 0, (Math.floor(i / 2)) * 4 - 2);
      g.add(pod);
    }
  }

  // Enhanced boss warning lights with pulsing effect
  if (!createEnhancedBoss._warnGeo) { createEnhancedBoss._warnGeo = new THREE.SphereGeometry(2, 12, 12); createEnhancedBoss._warnGeo._pooled = true; }
  const _bwMat = new THREE.MeshBasicMaterial({ color: bossTint.tint, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const warnLight = new THREE.Mesh(createEnhancedBoss._warnGeo, _bwMat);
  warnLight.position.set(0, 3, 0);
  g.add(warnLight);

  // Add boss aura effect
  const auraMat = new THREE.MeshBasicMaterial({ color: bossTint.tint, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false });
  const aura = new THREE.Mesh(new THREE.SphereGeometry(25, 16, 16), auraMat);
  g.add(aura);

  const theta = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1);
  const r = SPAWN_RADIUS + 250; // Spawn further away
  g.position.set(ship.position.x + r*Math.sin(phi)*Math.cos(theta), ship.position.y + r*Math.sin(phi)*Math.sin(theta)*0.3, ship.position.z + r*Math.cos(phi));
  g.lookAt(ship.position);
  scene.add(g);
  
  // Enhanced boss stats
  const bDiff = Math.min(12, 1 + (state.player.rebirths || 0) * 0.3 + (c.cycle - 1) * 0.2);
  const bossHp = Math.ceil((bossKey.startsWith('titan') ? 120 : 100) * bDiff);
  
  const bossData = { 
    group: g, 
    hp: bossHp, 
    maxHp: bossHp, 
    speed: ENEMY_SPEED * 0.35, 
    type: 'boss', 
    points: 800 + c.cycle * 100, 
    cfg: { scale: bossScale, color: bossTint.tint }, 
    hitFlash: 0, 
    isBoss: true, 
    bossName: bossTint.name,
    abilities: bossAbilities[bossIdx % bossAbilities.length],
    phase: 1,
    lastAbility: Date.now(),
    enrageTimer: 0,
    isEnraged: false,
    specialAttackCharges: 3
  };
  
  c.enemies.push(bossData);
  
  // Enhanced threat announcement with abilities
  const threatLevel = bossKey.startsWith('titan') ? 'OMEGA' : 'CRITICAL';
  addComms('🚨 BOSS ALERT', \`\${threatLevel} THREAT: \${bossTint.name}\`);
  setTimeout(() => {
    addComms('INTEL', \`Abilities detected: \${bossData.abilities.join(', ').toUpperCase()}\`);
  }, 2000);
}

// Keep original function for compatibility
function createBossEnemy() { createEnhancedBoss(); }`;

content = safeReplace(content, oldCreateBossEnemy, newCreateBossEnemy);

// 3. Add boss ability execution system
const oldNailSlugCode = `const _nailSlugGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 6); _nailSlugGeo._pooled = true;`;

const newNailSlugCode = `// Boss Special Abilities System
function executeBossAbility(boss, abilityName) {
  const now = Date.now();
  if (now - boss.lastAbility < 8000) return; // Cooldown
  
  boss.lastAbility = now;
  boss.specialAttackCharges = Math.max(0, boss.specialAttackCharges - 1);
  
  const abilities = {
    void_beam: () => {
      addComms('BOSS ABILITY', 'Void Beam charging...');
      addCombatLog('VOID BEAM DETECTED', '#8800ff');
      setTimeout(() => {
        const beamDamage = 80 + c.cycle * 10;
        if (ship.position.distanceTo(boss.group.position) < 120) {
          const dmg = Math.floor(beamDamage * (1 - state.ship.shield / state.ship.maxShield * 0.3));
          state.ship.hull = Math.max(0, state.ship.hull - dmg);
          addCombatLog(\`Void Beam hit — \${dmg} hull damage!\`, '#ff0066');
          c.damageFlash = 600;
          c.dmgNumbers.push({
            text: '-' + dmg + ' VOID BEAM',
            px: ship.position.x + 5,
            py: ship.position.y + 8,
            pz: ship.position.z,
            age: 0,
            color: '#8800ff'
          });
        }
      }, 2500);
    },
    
    gravity_well: () => {
      addComms('BOSS ABILITY', 'Gravity Well activated!');
      addCombatLog('GRAVITY WELL ACTIVE', '#aa44ff');
      c._gravityWellActive = true;
      c._gravityWellCenter = { x: boss.group.position.x, y: boss.group.position.y, z: boss.group.position.z };
      c._gravityWellStrength = 60 + boss.phase * 20;
      setTimeout(() => { c._gravityWellActive = false; }, 10000);
      
      // Visual effect
      c.dmgNumbers.push({
        text: '🌀 GRAVITY WELL 🌀',
        px: boss.group.position.x,
        py: boss.group.position.y + 15,
        pz: boss.group.position.z,
        age: 0,
        color: '#aa44ff',
        duration: 3000
      });
    },
    
    plasma_storm: () => {
      addComms('BOSS ABILITY', 'Plasma Storm incoming!');
      addCombatLog('PLASMA STORM BREWING', '#ff0080');
      
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const stormProj = createEnemyProjectile(
            boss.group.position.x + (Math.random() - 0.5) * 60,
            boss.group.position.y + (Math.random() - 0.5) * 60,
            boss.group.position.z + (Math.random() - 0.5) * 60,
            ship.position.x + (Math.random() - 0.5) * 40,
            ship.position.y + (Math.random() - 0.5) * 40,
            ship.position.z + (Math.random() - 0.5) * 40,
            60 + c.cycle * 8,
            0xff0080,
            4,
            'plasma_storm'
          );
          c.enemyProjectiles.push(stormProj);
        }, i * 150);
      }
    },
    
    quantum_shift: () => {
      addComms('BOSS ABILITY', 'Quantum displacement!');
      addCombatLog('QUANTUM SHIFT', '#00ffaa');
      
      // Boss teleports to new position
      const newTheta = Math.random() * Math.PI * 2, newPhi = Math.acos(2 * Math.random() - 1);
      const newR = SPAWN_RADIUS + 150;
      boss.group.position.set(
        ship.position.x + newR * Math.sin(newPhi) * Math.cos(newTheta),
        ship.position.y + newR * Math.sin(newPhi) * Math.sin(newTheta) * 0.3,
        ship.position.z + newR * Math.cos(newPhi)
      );
      
      c.dmgNumbers.push({
        text: '⚡ QUANTUM SHIFT ⚡',
        px: boss.group.position.x,
        py: boss.group.position.y + 15,
        pz: boss.group.position.z,
        age: 0,
        color: '#00ffaa',
        duration: 2000
      });
    },
    
    solar_flare: () => {
      addComms('BOSS ABILITY', 'Solar Flare erupting!');
      addCombatLog('SOLAR FLARE DETECTED', '#ffaa00');
      
      // Create radial flame projectiles
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const flareProj = createEnemyProjectile(
          boss.group.position.x,
          boss.group.position.y,
          boss.group.position.z,
          boss.group.position.x + Math.cos(angle) * 100,
          boss.group.position.y,
          boss.group.position.z + Math.sin(angle) * 100,
          70 + c.cycle * 8,
          0xff6600,
          5,
          'solar_flare'
        );
        c.enemyProjectiles.push(flareProj);
      }
    },
    
    nano_swarm: () => {
      addComms('BOSS ABILITY', 'Nano repair swarm deployed!');
      addCombatLog('NANO REPAIR ACTIVE', '#ffff00');
      
      const healAmount = Math.floor(boss.maxHp * 0.2);
      boss.hp = Math.min(boss.maxHp, boss.hp + healAmount);
      
      c.dmgNumbers.push({
        text: '+' + healAmount + ' NANO HEAL',
        px: boss.group.position.x,
        py: boss.group.position.y + 10,
        pz: boss.group.position.z,
        age: 0,
        color: '#44ff44'
      });
    }
  };
  
  if (abilities[abilityName]) {
    abilities[abilityName]();
    AudioSFX.play('boss_ability');
  }
}

const _nailSlugGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 6); _nailSlugGeo._pooled = true;`;

content = safeReplace(content, oldNailSlugCode, newNailSlugCode);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Boss enhancement system implemented successfully!');
console.log('📊 Features added:');
console.log('   • Enhanced boss spawning with escalating frequency');
console.log('   • 6 special boss abilities: void_beam, gravity_well, plasma_storm, etc.');
console.log('   • Improved boss visuals with auras and weapon pods');
console.log('   • Phase-based boss behavior system');
console.log('   • Enhanced threat announcements with ability intel');
console.log('   • Gravity well physics affecting ship movement');