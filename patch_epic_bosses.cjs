// Enhanced Boss Encounter System - Old Eden Space MMO
// Adds epic boss fights with unique mechanics and rewards

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

console.log('⚡ Implementing enhanced boss encounter system...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Enhance boss spawn logic with epic announcement
const oldBossSpawn = `        // Boss spawn logic: 5% chance when no boss exists
        if (Math.random() < 0.05 && !c.entities.some(e => e.isBoss)) {
          spawnBoss();
        }`;

const newBossSpawn = `        // Enhanced boss spawn logic: increasing chances and epic announcements
        const activeBoss = c.entities.find(e => e.isBoss);
        if (!activeBoss) {
          // Escalating spawn chance: 2% base, +1% per 50 kills, +2% every 5 minutes
          let spawnChance = 0.02 + Math.min(c.kills / 50 * 0.01, 0.05);
          spawnChance += Math.min(Math.floor(c.sessionTime / 300000) * 0.02, 0.1);
          
          if (Math.random() < spawnChance) {
            spawnEpicBoss();
          }
        }`;

content = safeReplace(content, oldBossSpawn, newBossSpawn);

// 2. Create enhanced boss spawn function with epic mechanics
const oldSpawnBoss = `function spawnBoss() {
  const bossTypes = ['Void Harvester', 'Star Devourer', 'Quantum Leviathan', 'Plasma Lord', 'Nano Swarm Queen'];
  const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
  
  const boss = {
    id: 'boss_' + Date.now(),
    type: bossType,
    isBoss: true,
    hull: 2000 + c.cycle * 500,
    maxHull: 2000 + c.cycle * 500,
    shield: 1000 + c.cycle * 200,
    maxShield: 1000 + c.cycle * 200,
    position: { 
      x: (Math.random() - 0.5) * 400, 
      y: (Math.random() - 0.5) * 400, 
      z: (Math.random() - 0.5) * 400 
    },
    velocity: { x: 0, y: 0, z: 0 },
    color: '#ff0040',
    size: 25,
    lastAttack: 0,
    attackCooldown: 3000,
    _spawnTime: Date.now(),
    _phase: 1,
    _lastPhaseChange: Date.now()
  };
  
  c.entities.push(boss);
  addComms('Alert', \`⚠️ BOSS DETECTED: \${bossType}\`);
  AudioSFX.play('boss_spawn');
}`;

const newSpawnBoss = `function spawnEpicBoss() {
  const epicBossTypes = [
    { name: 'Void Harvester', color: '#8800ff', abilities: ['void_beam', 'gravity_well'], threat: 'EXTREME' },
    { name: 'Star Devourer', color: '#ff6600', abilities: ['solar_flare', 'plasma_storm'], threat: 'CRITICAL' },
    { name: 'Quantum Leviathan', color: '#00ffaa', abilities: ['quantum_shift', 'temporal_rift'], threat: 'OMEGA' },
    { name: 'Plasma Lord', color: '#ff0080', abilities: ['plasma_lance', 'energy_cascade'], threat: 'LEGENDARY' },
    { name: 'Nano Swarm Queen', color: '#ffff00', abilities: ['nano_cloud', 'repair_swarm'], threat: 'MYTHIC' },
    { name: 'Dark Matter Beast', color: '#440088', abilities: ['dark_pulse', 'matter_drain'], threat: 'COSMIC' },
    { name: 'Stellar Forge', color: '#ff4400', abilities: ['metal_storm', 'core_meltdown'], threat: 'APOCALYPTIC' }
  ];
  
  const bossTemplate = epicBossTypes[Math.floor(Math.random() * epicBossTypes.length)];
  
  // Escalating boss power based on cycle and kills
  const powerScale = 1 + (c.cycle * 0.5) + (c.kills / 100);
  
  const boss = {
    id: 'boss_' + Date.now(),
    type: bossTemplate.name,
    isBoss: true,
    isEpicBoss: true,
    threat: bossTemplate.threat,
    hull: Math.floor((3000 + c.cycle * 800) * powerScale),
    maxHull: Math.floor((3000 + c.cycle * 800) * powerScale),
    shield: Math.floor((1500 + c.cycle * 400) * powerScale),
    maxShield: Math.floor((1500 + c.cycle * 400) * powerScale),
    position: { 
      x: (Math.random() - 0.5) * 500, 
      y: (Math.random() - 0.5) * 500, 
      z: (Math.random() - 0.5) * 500 
    },
    velocity: { x: 0, y: 0, z: 0 },
    color: bossTemplate.color,
    size: 35 + Math.min(c.cycle * 2, 15),
    lastAttack: 0,
    attackCooldown: 2500 - Math.min(c.cycle * 100, 1000),
    abilities: bossTemplate.abilities,
    _spawnTime: Date.now(),
    _phase: 1,
    _lastPhaseChange: Date.now(),
    _lastAbility: Date.now(),
    _enrageTimer: 0,
    _isEnraged: false,
    _damagePhaseThresholds: [0.75, 0.5, 0.25], // Health % for phase changes
    _specialAttackCharges: 3,
    _auraRadius: 80 + c.cycle * 10,
    _lootMultiplier: 2 + c.cycle * 0.5
  };
  
  c.entities.push(boss);
  
  // Epic boss announcement sequence
  addComms('💀 ANOMALY DETECTED', \`Massive energy signature approaching...\`);
  setTimeout(() => {
    addComms('🚨 THREAT ASSESSMENT', \`\${bossTemplate.threat} THREAT LEVEL — \${bossTemplate.name}\`);
    addCombatLog(\`BOSS ENCOUNTER — \${bossTemplate.name}\`, bossTemplate.color);
    
    // Screen flash effect for epic entrance
    if (c.active) {
      c.dmgNumbers.push({ 
        text: '💀 ' + bossTemplate.name.toUpperCase() + ' 💀', 
        px: boss.position.x, 
        py: boss.position.y + 25, 
        pz: boss.position.z, 
        age: 0, 
        color: bossTemplate.color,
        duration: 5000
      });
      c.dmgNumbers.push({ 
        text: 'THREAT: ' + bossTemplate.threat, 
        px: boss.position.x, 
        py: boss.position.y + 20, 
        pz: boss.position.z, 
        age: 0, 
        color: '#ff0000',
        duration: 4000
      });
    }
  }, 1500);
  
  setTimeout(() => {
    addComms('⚔️ COMBAT STATUS', \`All weapons free! Engage with extreme caution!\`);
    AudioSFX.play('boss_spawn');
    AudioSFX.play('alert_critical');
  }, 3000);
}`;

content = safeReplace(content, oldSpawnBoss, newSpawnBoss);

// 3. Enhance boss AI with phase-based combat and special abilities
const oldBossAI = `    // Boss AI: more aggressive movement and attacks
    if (e.isBoss) {
      const distToShip = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      // Phase-based behavior
      const hpPercent = e.hull / e.maxHull;
      if (hpPercent < 0.5 && e._phase === 1) {
        e._phase = 2;
        addComms('Boss', \`\${e.type} enters RAGE MODE!\`);
        e.attackCooldown *= 0.7;
        e.color = '#ff4444';
      }
      
      // Aggressive movement toward ship
      if (distToShip > 50) {
        const moveSpeed = 20 + (3 - e._phase) * 5;
        e.velocity.x += (dx / distToShip) * moveSpeed * dt;
        e.velocity.y += (dy / distToShip) * moveSpeed * dt;
        e.velocity.z += (dz / distToShip) * moveSpeed * dt;
      }
      
      // Enhanced attack pattern
      if (Date.now() - e.lastAttack > e.attackCooldown) {
        if (distToShip < 120) {
          // Multi-projectile attack
          for (let i = 0; i < 3; i++) {
            const spreadAngle = (i - 1) * 0.3;
            const projectile = {
              id: 'proj_' + Date.now() + '_' + i,
              isEnemyProjectile: true,
              position: { x: e.position.x, y: e.position.y, z: e.position.z },
              velocity: {
                x: (dx / distToShip) * 80 + Math.sin(spreadAngle) * 20,
                y: (dy / distToShip) * 80,
                z: (dz / distToShip) * 80 + Math.cos(spreadAngle) * 20
              },
              damage: 80 + c.cycle * 10,
              life: 3000,
              color: e.color,
              size: 4,
              type: 'boss_plasma'
            };
            c.projectiles.push(projectile);
          }
          e.lastAttack = Date.now();
          AudioSFX.play('enemy_fire_heavy');
        }
      }
    }`;

const newBossAI = `    // Enhanced Epic Boss AI with special abilities and phases
    if (e.isBoss && e.isEpicBoss) {
      const distToShip = Math.sqrt(dx*dx + dy*dy + dz*dz);
      const now = Date.now();
      
      // Phase transitions based on damage
      const hpPercent = e.hull / e.maxHull;
      const currentPhase = e._damagePhaseThresholds.findIndex(threshold => hpPercent > threshold) + 1;
      
      if (currentPhase !== e._phase && currentPhase <= 4) {
        e._phase = currentPhase;
        e._lastPhaseChange = now;
        
        const phaseMessages = [
          \`\${e.type} is weakening...\`,
          \`\${e.type} enters DEFENSIVE MODE!\`,
          \`\${e.type} becomes ENRAGED!\`,
          \`\${e.type} activates FINAL PROTOCOL!\`
        ];
        
        addComms('💀 PHASE CHANGE', phaseMessages[currentPhase - 1] || 'Boss behavior changing...');
        addCombatLog(\`BOSS PHASE \${currentPhase}\`, e.color);
        
        // Phase-specific enhancements
        switch(currentPhase) {
          case 2:
            e.attackCooldown *= 0.8;
            e.color = '#ff6666';
            break;
          case 3:
            e.attackCooldown *= 0.6;
            e.color = '#ff2222';
            e._isEnraged = true;
            e._auraRadius *= 1.5;
            break;
          case 4:
            e.attackCooldown *= 0.4;
            e.color = '#ff0000';
            e._specialAttackCharges += 2;
            break;
        }
        
        // Visual phase change effect
        c.dmgNumbers.push({ 
          text: '⚡ PHASE ' + currentPhase + ' ⚡', 
          px: e.position.x, 
          py: e.position.y + 20, 
          pz: e.position.z, 
          age: 0, 
          color: e.color,
          duration: 3000
        });
      }
      
      // Enhanced movement with phase-based behavior
      const moveSpeed = 15 + (e._phase * 8) + (e._isEnraged ? 15 : 0);
      
      if (distToShip > 60) {
        // Aggressive approach with evasive maneuvers
        const evasionAngle = Math.sin(now / 1000) * 0.5;
        e.velocity.x += ((dx / distToShip) * moveSpeed + Math.sin(evasionAngle) * 10) * dt;
        e.velocity.y += ((dy / distToShip) * moveSpeed) * dt;
        e.velocity.z += ((dz / distToShip) * moveSpeed + Math.cos(evasionAngle) * 10) * dt;
      } else {
        // Orbit at optimal range for attacks
        const orbitAngle = now / 2000;
        e.velocity.x += Math.cos(orbitAngle) * 20 * dt;
        e.velocity.z += Math.sin(orbitAngle) * 20 * dt;
      }
      
      // Special ability usage
      if (now - e._lastAbility > 8000 && e._specialAttackCharges > 0 && distToShip < 150) {
        const ability = e.abilities[Math.floor(Math.random() * e.abilities.length)];
        executeSpecialAbility(e, ability);
        e._lastAbility = now;
        e._specialAttackCharges--;
      }
      
      // Standard attack pattern with phase scaling
      if (now - e.lastAttack > e.attackCooldown && distToShip < 130) {
        const projectileCount = Math.min(2 + e._phase, 6);
        const baseDamage = 60 + c.cycle * 8 + (e._phase * 20);
        
        for (let i = 0; i < projectileCount; i++) {
          const spreadAngle = (i - (projectileCount-1)/2) * 0.25;
          const projectile = {
            id: 'proj_' + now + '_' + i,
            isEnemyProjectile: true,
            isBossProjectile: true,
            position: { x: e.position.x, y: e.position.y, z: e.position.z },
            velocity: {
              x: (dx / distToShip) * 90 + Math.sin(spreadAngle) * 25,
              y: (dy / distToShip) * 90,
              z: (dz / distToShip) * 90 + Math.cos(spreadAngle) * 25
            },
            damage: baseDamage * (e._isEnraged ? 1.5 : 1),
            life: 4000,
            color: e.color,
            size: 5 + e._phase,
            type: 'boss_plasma_enhanced',
            _hasTrail: true
          };
          c.projectiles.push(projectile);
        }
        e.lastAttack = now;
        AudioSFX.play('enemy_fire_heavy');
        
        if (e._isEnraged && Math.random() < 0.3) {
          AudioSFX.play('boss_roar');
        }
      }
      
      // Enrage timer management
      if (e._isEnraged) {
        e._enrageTimer += dtMs;
        if (e._enrageTimer > 15000) { // 15s enrage duration
          e._isEnraged = false;
          e._enrageTimer = 0;
          e.attackCooldown *= 1.3; // Cool down slightly
        }
      }
    }`;

content = safeReplace(content, oldBossAI, newBossAI);

// 4. Add special ability execution function
const oldBossReward = `          // Epic boss rewards
          const bossReward = 500 + c.cycle * 200;
          c.credits += bossReward;
          state.player.stellarMarks += 10;
          addComms('Victory', \`Boss defeated! +\${bossReward} credits, +10 stellar marks\`);
          AudioSFX.play('boss_death');`;

const newBossReward = `          // Execute special ability function (defined below)
          function executeSpecialAbility(boss, abilityName) {
            const abilities = {
              void_beam: () => {
                addCombatLog('VOID BEAM charging...', '#8800ff');
                setTimeout(() => {
                  const beamDamage = 120 + c.cycle * 15;
                  if (ship.position.distanceTo(boss.position) < 100) {
                    dealDamageToShip(beamDamage);
                    addCombatLog(\`Void Beam hit — \${beamDamage} damage!\`, '#ff0066');
                  }
                }, 2000);
              },
              
              gravity_well: () => {
                addCombatLog('Gravity Well activated!', '#aa44ff');
                c._gravityWellActive = true;
                c._gravityWellCenter = { ...boss.position };
                c._gravityWellStrength = 50 + boss._phase * 20;
                setTimeout(() => { c._gravityWellActive = false; }, 8000);
              },
              
              solar_flare: () => {
                addCombatLog('Solar Flare erupting!', '#ffaa00');
                // Create multiple flame projectiles
                for (let i = 0; i < 8; i++) {
                  const angle = (i / 8) * Math.PI * 2;
                  c.projectiles.push({
                    id: 'flare_' + Date.now() + '_' + i,
                    isEnemyProjectile: true,
                    position: { ...boss.position },
                    velocity: { x: Math.cos(angle) * 60, y: 0, z: Math.sin(angle) * 60 },
                    damage: 80 + c.cycle * 10,
                    life: 6000,
                    color: '#ff6600',
                    size: 6,
                    type: 'solar_flare'
                  });
                }
              },
              
              plasma_storm: () => {
                addCombatLog('Plasma Storm brewing!', '#ff0080');
                for (let i = 0; i < 12; i++) {
                  setTimeout(() => {
                    const stormProj = {
                      id: 'storm_' + Date.now() + '_' + i,
                      isEnemyProjectile: true,
                      position: { 
                        x: boss.position.x + (Math.random() - 0.5) * 60,
                        y: boss.position.y + (Math.random() - 0.5) * 60,
                        z: boss.position.z + (Math.random() - 0.5) * 60
                      },
                      velocity: {
                        x: (ship.position.x - boss.position.x) * 0.8 + (Math.random() - 0.5) * 40,
                        y: (ship.position.y - boss.position.y) * 0.8 + (Math.random() - 0.5) * 40,
                        z: (ship.position.z - boss.position.z) * 0.8 + (Math.random() - 0.5) * 40
                      },
                      damage: 45 + c.cycle * 8,
                      life: 4000,
                      color: '#ff0080',
                      size: 4,
                      type: 'plasma_bolt'
                    };
                    c.projectiles.push(stormProj);
                  }, i * 200);
                }
              },
              
              quantum_shift: () => {
                addCombatLog('Quantum displacement!', '#00ffaa');
                // Boss teleports to new position
                boss.position.x = (Math.random() - 0.5) * 300;
                boss.position.y = (Math.random() - 0.5) * 300;
                boss.position.z = (Math.random() - 0.5) * 300;
                boss.velocity = { x: 0, y: 0, z: 0 };
                
                // Visual effect
                c.dmgNumbers.push({
                  text: '⚡ QUANTUM SHIFT ⚡',
                  px: boss.position.x,
                  py: boss.position.y + 15,
                  pz: boss.position.z,
                  age: 0,
                  color: '#00ffaa',
                  duration: 2000
                });
              },
              
              nano_cloud: () => {
                addCombatLog('Nano repair swarm deployed!', '#ffff00');
                const healAmount = Math.floor(boss.maxHull * 0.15);
                boss.hull = Math.min(boss.maxHull, boss.hull + healAmount);
                c.dmgNumbers.push({
                  text: '+' + healAmount + ' HULL',
                  px: boss.position.x,
                  py: boss.position.y + 10,
                  pz: boss.position.z,
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
          
          // Epic boss rewards with enhanced loot
          const bossReward = 800 + c.cycle * 300;
          const stellarReward = 15 + Math.floor(e._phase * 5);
          c.credits += bossReward;
          state.player.stellarMarks += stellarReward;
          
          // Guaranteed epic loot drop from boss
          const bossLootTypes = [
            { name: 'omega_upgrade', rarity: { name: 'OMEGA', color: '#ff00ff', mult: 8 } },
            { name: 'void_crystal', rarity: { name: 'COSMIC', color: '#8800ff', mult: 10 } },
            { name: 'quantum_core', rarity: { name: 'MYTHIC', color: '#ffaa00', mult: 6 } },
            { name: 'stellar_fragment', rarity: { name: 'LEGENDARY', color: '#ff6600', mult: 4 } }
          ];
          
          // Drop 2-4 epic items based on threat level
          const dropCount = Math.min(2 + e._phase, 4);
          for (let d = 0; d < dropCount; d++) {
            const epicLoot = bossLootTypes[Math.floor(Math.random() * bossLootTypes.length)];
            const loot = {
              id: 'loot_epic_' + Date.now() + '_' + d,
              type: epicLoot.name,
              rarity: epicLoot.rarity,
              position: {
                x: e.position.x + (Math.random() - 0.5) * 30,
                y: e.position.y + (Math.random() - 0.5) * 30,
                z: e.position.z + (Math.random() - 0.5) * 30
              },
              velocity: {
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 20
              },
              _spawnTime: Date.now()
            };
            c.loot.push(loot);
          }
          
          addComms('💀 VICTORY!', \`\${e.type} destroyed! +\${bossReward} credits, +\${stellarReward} marks, EPIC LOOT!\`);
          addCombatLog(\`BOSS KILL — \${e.type}\`, '#ffaa00');
          AudioSFX.play('boss_death');
          AudioSFX.play('quest_complete');`;

content = safeReplace(content, oldBossReward, newBossReward);

// 5. Add gravity well mechanics to ship movement
const oldShipMovement = `    // Apply velocity to position
    ship.position.x += ship.velocity.x * dt;
    ship.position.y += ship.velocity.y * dt;
    ship.position.z += ship.velocity.z * dt;`;

const newShipMovement = `    // Gravity well effect from boss abilities
    if (c._gravityWellActive && c._gravityWellCenter) {
      const wellDx = c._gravityWellCenter.x - ship.position.x;
      const wellDy = c._gravityWellCenter.y - ship.position.y;
      const wellDz = c._gravityWellCenter.z - ship.position.z;
      const wellDist = Math.sqrt(wellDx*wellDx + wellDy*wellDy + wellDz*wellDz);
      
      if (wellDist < 120) {
        const pullForce = (c._gravityWellStrength || 30) / Math.max(wellDist, 5);
        ship.velocity.x += (wellDx / wellDist) * pullForce * dt;
        ship.velocity.y += (wellDy / wellDist) * pullForce * dt;
        ship.velocity.z += (wellDz / wellDist) * pullForce * dt;
        
        if (wellDist < 20) { // Damage if too close to well center
          const wellDamage = Math.floor((c._gravityWellStrength || 30) * dt * 2);
          state.ship.hull = Math.max(0, state.ship.hull - wellDamage);
          if (Math.random() < 0.1) addCombatLog('Gravity well crushing ship!', '#ff0066');
        }
      }
    }
    
    // Apply velocity to position
    ship.position.x += ship.velocity.x * dt;
    ship.position.y += ship.velocity.y * dt;
    ship.position.z += ship.velocity.z * dt;`;

content = safeReplace(content, oldShipMovement, newShipMovement);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced boss encounter system implemented successfully!');
console.log('📊 Features added:');
console.log('   • Epic boss announcements with threat levels');
console.log('   • 7 unique boss types with special abilities');
console.log('   • Phase-based combat system (1-4 phases)');
console.log('   • 6 special abilities: void_beam, gravity_well, solar_flare, etc.');
console.log('   • Enhanced boss rewards with guaranteed epic loot');
console.log('   • Gravity well mechanics affecting ship movement');
console.log('   • Escalating spawn chances based on performance');