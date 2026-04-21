// ENHANCED ENEMY SPAWNING PATCH - Old Eden Space MMO
// Improves existing enemy spawning for better gameplay flow

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

console.log('⚔️ Enhancing Enemy Spawning & Combat Systems...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // ═════════════════════════════════════════════════════════════
  // 1. ENHANCE EXISTING ENEMY SPAWNING LOGIC
  // ═════════════════════════════════════════════════════════════
  
  const currentSpawningPattern = `    if (!isProtectedSpace() && !_inBreather && c.enemies.length < MAX_ENEMIES && state.gameTime - state.lastEnemySpawn > spawnInterval) {
      state.lastEnemySpawn = state.gameTime;
      // Tier-based enemy selection using ENEMY_TYPES_BY_TIER
      const tier = (isFirstLife && c.cycle <= 2) ? 'easy' :
                   (c.cycle < 6 || state.player.rebirths === 0) ? 'medium' : 'hard';
      const spawnTypes = ENEMY_TYPES_BY_TIER[tier];
      const spawnCount = isFirstLife ? 1 : Math.min(1 + Math.floor(c.cycle / 3), MAX_ENEMIES - c.enemies.length);
      for (let si = 0; si < spawnCount; si++) createEnemy(spawnTypes[Math.floor(Math.random()*spawnTypes.length)]);`;
      
  const enhancedSpawning = cr(`    // ═══ ENHANCED DYNAMIC ENEMY SPAWNING SYSTEM ═══
    // Dynamic spawn parameters based on combat activity
    const combatActivity = (c.locked || mouseHeld || c.charging) ? 1.5 : 0.8;
    const threatLevel = Math.min(10, state.player.level + c.cycle * 0.5);
    
    // Adaptive enemy count based on player performance
    const baseEnemyCount = Math.max(2, Math.min(8, 2 + Math.floor(threatLevel / 2)));
    const maxEnemyCount = Math.max(baseEnemyCount + 2, Math.min(15, baseEnemyCount + Math.floor(c.streak / 5)));
    const targetEnemyCount = c.active ? Math.min(maxEnemyCount, baseEnemyCount + (combatActivity > 1 ? 3 : 0)) : baseEnemyCount;
    
    // Dynamic spawn interval - faster during combat, slower when idle
    const baseSpawnInterval = isFirstLife ? 4000 : 2500;
    const dynamicSpawnInterval = baseSpawnInterval / combatActivity;
    
    if (!isProtectedSpace() && !_inBreather && c.enemies.length < targetEnemyCount && state.gameTime - state.lastEnemySpawn > dynamicSpawnInterval) {
      state.lastEnemySpawn = state.gameTime;
      
      // Enhanced tier selection with difficulty scaling
      let tier;
      if (isFirstLife && c.cycle <= 2) {
        tier = 'easy';
      } else if (c.cycle < 6 || state.player.rebirths === 0) {
        tier = Math.random() < 0.7 ? 'medium' : (Math.random() < 0.8 ? 'easy' : 'hard');
      } else {
        tier = Math.random() < 0.6 ? 'hard' : 'medium';
      }
      
      const spawnTypes = ENEMY_TYPES_BY_TIER[tier];
      
      // Intelligent spawn count - more enemies if player is doing well
      let spawnCount;
      if (isFirstLife) {
        spawnCount = 1;
      } else {
        const baseSpawnCount = 1 + Math.floor(c.cycle / 3);
        const streakBonus = c.streak >= 10 ? 1 : 0;
        const combatBonus = combatActivity > 1 ? 1 : 0;
        spawnCount = Math.min(baseSpawnCount + streakBonus + combatBonus, targetEnemyCount - c.enemies.length);
      }
      
      // Spawn enemies with enhanced variety
      for (let si = 0; si < spawnCount; si++) {
        const enemyType = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
        createEnemy(enemyType);
        
        // Elite chance increases with cycle and streak
        if (c.cycle >= 3 && Math.random() < (0.05 + c.cycle * 0.01 + c.streak * 0.001)) {
          setTimeout(() => {
            console.log('Spawning elite variant...');
            createEliteVariant(enemyType);
          }, 500 + si * 300);
        }
      }
      
      // Enhanced formation spawning for dramatic effect
      if (c.cycle >= 5 && Math.random() < 0.15) {
        console.log('Spawning enemy formation...');
        setTimeout(() => spawnEnemyFormation(tier), 1000);
      }`);
  
  html = safeReplace(html, currentSpawningPattern, enhancedSpawning, 'enhanced enemy spawning');
  console.log('✅ Enhanced dynamic enemy spawning system');

  // ═════════════════════════════════════════════════════════════
  // 2. ADD ELITE VARIANT CREATION FUNCTION
  // ═════════════════════════════════════════════════════════════
  
  // Find where to insert the elite function (after createEnemy function)
  const createEnemyEndIndex = html.indexOf('  addComms(\'Tactical\', \'\\uD83D\\uDCCB NEW CONTACT: \' + type.toUpperCase() + \' — \' + (_typeDescs[type] || \'Unknown class\'));') + 'addComms(\'Tactical\', \'\\uD83D\\uDCCB NEW CONTACT: \' + type.toUpperCase() + \' — \' + (_typeDescs[type] || \'Unknown class\'));'.length;
  const nextLineIndex = html.indexOf('\n', createEnemyEndIndex) + 1;
  
  const eliteVariantFunction = cr(`

// ═══ ELITE VARIANT CREATION SYSTEM ═══
function createEliteVariant(baseType) {
  const cfg = ENEMY_CONFIGS[baseType];
  if (!cfg) return createEnemy(baseType); // Fallback to normal enemy
  
  // Elite spawn positioning - further away for dramatic entrance
  const angle = Math.random() * Math.PI * 2;
  const dist = 120 + Math.random() * 80;
  const x = ship.position.x + Math.cos(angle) * dist;
  const z = ship.position.z + Math.sin(angle) * dist;
  const y = ship.position.y + (Math.random() - 0.5) * 30;
  
  const g = new THREE.Group();
  
  // Enhanced elite visuals
  const eliteScale = cfg.scale * 1.4; // 40% larger
  const bodyGeo = new THREE.ConeGeometry(0.8 * eliteScale, 2.5 * eliteScale, 6);
  const eliteColor = cfg.color === 0xff4422 ? 0xff1100 : // Darker red for red enemies
                     cfg.color === 0x4488ff ? 0x2244ff : // Darker blue for blue enemies
                     0xff6600; // Orange for others
  
  const bodyMat = new THREE.MeshBasicMaterial({ color: eliteColor, transparent: true, opacity: 0.95 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI;
  g.add(body);
  
  // Elite energy signature - pulsing glow
  const glowGeo = new THREE.SphereGeometry(eliteScale * 0.6, 12, 8);
  const glowMat = new THREE.MeshBasicMaterial({
    color: eliteColor,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  g.add(glow);
  
  // Elite shield rings
  for (let i = 0; i < 2; i++) {
    const ringGeo = new THREE.RingGeometry(eliteScale * 1.2 + i * 0.3, eliteScale * 1.5 + i * 0.3, 12);
    const ringMat = new THREE.MeshBasicMaterial({
      color: eliteColor,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = i * 0.5;
    g.add(ring);
  }
  
  g.position.set(x, y, z);
  scene.add(g);
  
  // Elite stats - enhanced HP, damage, and behavior
  const diffScale = getDifficultyScale();
  const eliteMultiplier = 2.5;
  const eliteHp = Math.ceil(cfg.hp * diffScale * eliteMultiplier);
  
  const enemy = {
    group: g,
    hp: eliteHp,
    maxHp: eliteHp,
    speed: ENEMY_SPEED * cfg.speed * 1.2, // 20% faster
    type: 'elite_' + baseType,
    points: Math.floor(cfg.points * diffScale * eliteMultiplier),
    cfg: cfg,
    hitFlash: 0,
    lastShot: 0,
    shootRate: Math.max(800, cfg.shootRate * 0.6), // Faster firing
    _isElite: true,
    _eliteType: baseType,
    _spawnTime: performance.now(),
    _shield: eliteHp * 0.3, // Elite shield
    _maxShield: eliteHp * 0.3
  };
  
  // Elite glow effect
  const eliteLight = new THREE.PointLight(eliteColor, 4, 20);
  eliteLight.name = '_eliteGlow';
  g.add(eliteLight);
  
  c.enemies.push(enemy);
  
  // Elite spawn announcement
  c.dmgNumbers.push({
    text: \`⚡ ELITE \${baseType.toUpperCase()} ⚡\`,
    px: x,
    py: y + 8,
    pz: z,
    age: 0,
    color: '#ff2200',
    scale: 1.5,
    velocity: { x: 0, y: 20, z: 0 }
  });
  
  addComms('THREAT WARNING', \`Elite variant detected! Enhanced \${baseType} with superior firepower.\`);
  AudioSFX.play('enemy_spawn');
  
  console.log(\`Elite \${baseType} spawned with \${eliteHp} HP\`);
}

// ═══ ENEMY FORMATION SPAWNING ═══
function spawnEnemyFormation(tier) {
  const spawnTypes = ENEMY_TYPES_BY_TIER[tier];
  const formationType = Math.random() < 0.5 ? 'line' : 'triangle';
  const formationSize = 3 + Math.floor(Math.random() * 3); // 3-5 enemies
  
  // Formation spawn position
  const angle = Math.random() * Math.PI * 2;
  const dist = 140 + Math.random() * 60;
  const centerX = ship.position.x + Math.cos(angle) * dist;
  const centerZ = ship.position.z + Math.sin(angle) * dist;
  const centerY = ship.position.y + (Math.random() - 0.5) * 20;
  
  for (let i = 0; i < formationSize; i++) {
    const enemyType = spawnTypes[Math.floor(Math.random() * spawnTypes.length)];
    
    // Formation positioning
    let offsetX, offsetZ;
    if (formationType === 'line') {
      offsetX = (i - formationSize / 2) * 15;
      offsetZ = 0;
    } else { // triangle
      offsetX = i === 0 ? 0 : (i % 2 === 1 ? -12 : 12);
      offsetZ = i === 0 ? 0 : -8;
    }
    
    // Create enemy manually at formation position
    setTimeout(() => {
      const formationEnemy = createFormationEnemy(enemyType, centerX + offsetX, centerY, centerZ + offsetZ, i === 0);
      if (i === 0) {
        // Formation leader announcement
        c.dmgNumbers.push({
          text: \`🛸 FORMATION DETECTED 🛸\`,
          px: centerX,
          py: centerY + 10,
          pz: centerZ,
          age: 0,
          color: '#ffaa00',
          scale: 1.3
        });
      }
    }, i * 200);
  }
  
  addComms('TACTICAL', \`Enemy formation detected! \${formationSize} hostiles in \${formationType} formation.\`);
}

// ═══ FORMATION ENEMY CREATION ═══
function createFormationEnemy(type, x, y, z, isLeader) {
  const cfg = ENEMY_CONFIGS[type];
  if (!cfg) return null;
  
  const g = new THREE.Group();
  
  // Standard enemy geometry
  const bodyGeo = new THREE.ConeGeometry(0.8 * cfg.scale, 2.5 * cfg.scale, 6);
  const bodyMat = new THREE.MeshBasicMaterial({ 
    color: isLeader ? 0xffaa00 : cfg.color,
    transparent: true,
    opacity: 0.9
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI;
  g.add(body);
  
  // Engine glow
  if (!createEnemy._glowGeos) { createEnemy._glowGeos = new Map(); createEnemy._glowMat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }); createEnemy._glowMat._pooled = true; }
  const _glowR = 0.5 * cfg.scale;
  if (!createEnemy._glowGeos.has(_glowR)) { const gg = new THREE.SphereGeometry(0.5 * cfg.scale, 6, 6); gg._pooled = true; createEnemy._glowGeos.set(_glowR, gg); }
  const engineGlow = new THREE.Mesh(createEnemy._glowGeos.get(_glowR), createEnemy._glowMat);
  engineGlow.position.z = 1.5 * cfg.scale;
  g.add(engineGlow);
  
  g.position.set(x, y, z);
  scene.add(g);
  
  // Formation enemy stats
  const diffScale = getDifficultyScale();
  const leaderMultiplier = isLeader ? 1.5 : 1;
  
  const enemy = {
    group: g,
    hp: Math.ceil(cfg.hp * diffScale * leaderMultiplier),
    maxHp: Math.ceil(cfg.hp * diffScale * leaderMultiplier),
    speed: ENEMY_SPEED * cfg.speed * (1 + (state.player.rebirths || 0) * 0.05 + (c.cycle - 1) * 0.03),
    type: type,
    points: Math.floor(cfg.points * diffScale * leaderMultiplier),
    cfg: cfg,
    hitFlash: 0,
    lastShot: 0,
    shootRate: Math.max(1000, cfg.shootRate * (isLeader ? 0.8 : 1)),
    _formation: true,
    _isLeader: isLeader,
    circleDir: Math.random() > 0.5 ? 1 : -1
  };
  
  c.enemies.push(enemy);
  return enemy;
}`);
  
  html = html.slice(0, nextLineIndex) + eliteVariantFunction + html.slice(nextLineIndex);
  console.log('✅ Added elite variant and formation spawning systems');

  // ═════════════════════════════════════════════════════════════
  // 3. ENHANCE ENEMY AI WITH ELITE BEHAVIORS
  // ═════════════════════════════════════════════════════════════
  
  // Find the enemy AI section and enhance it
  const enemyAIPattern = `          // Enemy AI: basic behaviors based on type and distance
          if (e.type === 'fighter') {`;
  
  const enhancedAI = cr(`          // ═══ ENHANCED ENEMY AI SYSTEM ═══
          // Elite behavior modifications
          const isElite = e._isElite || e.type.startsWith('elite_');
          const isFormation = e._formation;
          const playerDist = e.group.position.distanceTo(ship.position);
          const threatLevel = state.player.level + c.streak * 0.3;
          
          // Enhanced elite AI behaviors
          if (isElite) {
            const baseType = e._eliteType || e.type.replace('elite_', '');
            const eliteSpeed = e.speed * 1.3;
            const aggressionBonus = (c.charging || mouseHeld) ? 1.5 : 1;
            
            if (baseType === 'fighter' || e.type === 'elite_fighter') {
              if (playerDist < 100) {
                // Elite aggressive circle strafe with barrel rolls
                const angle = Math.atan2(e.group.position.z - ship.position.z, e.group.position.x - ship.position.x);
                const circleAngle = angle + e.circleDir * dt * (2.5 + aggressionBonus);
                const radius = 30 + Math.sin(state.gameTime * 0.003) * 12;
                
                _tmpV3a.set(
                  ship.position.x + Math.cos(circleAngle) * radius,
                  ship.position.y + Math.sin(state.gameTime * 0.004) * 10,
                  ship.position.z + Math.sin(circleAngle) * radius
                );
                e.group.position.lerp(_tmpV3a, Math.min(1, 4 * dt));
                
                // Elite barrel roll
                e.group.rotation.z += dt * 3;
              } else {
                // Elite boost approach
                _tmpV3a.subVectors(ship.position, e.group.position).normalize().multiplyScalar(eliteSpeed * dt);
                e.group.position.add(_tmpV3a);
              }
              
              // Elite rapid fire
              if (playerDist < 120 && e.lastShot <= state.gameTime - e.shootRate * 0.7) {
                e.lastShot = state.gameTime;
                spawnEnemyBolt(e.group.position, ship.position, 'elite');
              }
            }
          } else if (e.type === 'fighter') {`);
  
  html = safeReplace(html, enemyAIPattern, enhancedAI, 'enhanced enemy AI');
  console.log('✅ Enhanced enemy AI with elite behaviors');

  // ═════════════════════════════════════════════════════════════
  // 4. ENHANCED ENEMY BOLT SPAWNING
  // ═════════════════════════════════════════════════════════════
  
  // Find spawnEnemyBolt function and enhance it (if it exists, otherwise add it)
  const enemyBoltSearch = html.indexOf('function spawnEnemyBolt');
  
  if (enemyBoltSearch === -1) {
    // Add spawnEnemyBolt function if it doesn't exist
    const addBoltFunction = cr(`

// ═══ ENHANCED ENEMY BOLT SPAWNING ═══
function spawnEnemyBolt(fromPos, targetPos, type = 'normal') {
  if (!fromPos || !targetPos) return;
  
  // Enhanced bolt types
  const boltConfigs = {
    normal: { speed: 80, damage: 1.5, color: 0xff4422, size: 0.3, trail: false },
    elite: { speed: 100, damage: 2.5, color: 0xff1100, size: 0.4, trail: true },
    formation: { speed: 85, damage: 1.8, color: 0xffaa00, size: 0.35, trail: false }
  };
  
  const config = boltConfigs[type] || boltConfigs.normal;
  
  // Calculate trajectory with lead targeting
  const playerVelocity = state.flight.velocity || { x: 0, y: 0, z: 0 };
  const timeToTarget = fromPos.distanceTo(targetPos) / config.speed;
  const leadTarget = {
    x: targetPos.x + playerVelocity.x * timeToTarget,
    y: targetPos.y + playerVelocity.y * timeToTarget,
    z: targetPos.z + playerVelocity.z * timeToTarget
  };
  
  const direction = new THREE.Vector3().subVectors(leadTarget, fromPos).normalize();
  
  // Create enhanced bolt visual
  const boltGeo = new THREE.SphereGeometry(config.size, 6, 6);
  const boltMat = new THREE.MeshBasicMaterial({ 
    color: config.color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const bolt = new THREE.Mesh(boltGeo, boltMat);
  bolt.position.copy(fromPos);
  scene.add(bolt);
  
  // Enhanced bolt object
  const enemyBolt = {
    mesh: bolt,
    velocity: direction.multiplyScalar(config.speed),
    damage: config.damage,
    life: 3.0,
    type: type,
    trail: config.trail
  };
  
  if (!c.enemyBolts) c.enemyBolts = [];
  c.enemyBolts.push(enemyBolt);
  
  // Elite bolt effects
  if (config.trail) {
    // Add particle trail for elite bolts
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        if (bolt.parent) { // Check if bolt still exists
          const trailParticle = {
            position: bolt.position.clone(),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10
            ),
            life: 0.5,
            size: 0.2,
            color: config.color
          };
          if (!c.trailParticles) c.trailParticles = [];
          c.trailParticles.push(trailParticle);
        }
      }, i * 50);
    }
  }
}

// ═══ ENEMY BOLT UPDATE SYSTEM ═══
function updateEnemyBolts(dt) {
  if (!c.enemyBolts) return;
  
  for (let i = c.enemyBolts.length - 1; i >= 0; i--) {
    const bolt = c.enemyBolts[i];
    
    // Update bolt position
    bolt.mesh.position.add(bolt.velocity.clone().multiplyScalar(dt));
    bolt.life -= dt;
    
    // Check collision with player
    const distToPlayer = bolt.mesh.position.distanceTo(ship.position);
    if (distToPlayer < 5) {
      // Player hit
      takeDamage(bolt.damage, 'enemy_bolt');
      
      // Hit effect
      c.dmgNumbers.push({
        text: \`-\${bolt.damage}\`,
        px: ship.position.x,
        py: ship.position.y + 2,
        pz: ship.position.z,
        age: 0,
        color: '#ff4444'
      });
      
      // Remove bolt
      scene.remove(bolt.mesh);
      c.enemyBolts.splice(i, 1);
      continue;
    }
    
    // Remove expired bolts
    if (bolt.life <= 0) {
      scene.remove(bolt.mesh);
      c.enemyBolts.splice(i, 1);
      continue;
    }
    
    // Fade bolt over time
    bolt.mesh.material.opacity = Math.min(0.9, bolt.life / 3.0);
  }
}`);
    
    const functionInsertPoint = html.indexOf('function gameLoop()');
    html = html.slice(0, functionInsertPoint) + addBoltFunction + cr('\n\n') + html.slice(functionInsertPoint);
    console.log('✅ Added enhanced enemy bolt spawning system');
  }

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Enemy spawning and combat enhancement patch applied successfully!');
  console.log('');
  console.log('⚔️ COMBAT SYSTEM ENHANCEMENTS DEPLOYED:');
  console.log('   • Dynamic enemy spawning based on combat activity');
  console.log('   • Elite enemy variants with enhanced stats and visuals');
  console.log('   • Enemy formation spawning (line and triangle formations)');
  console.log('   • Enhanced enemy AI with elite behaviors');
  console.log('   • Advanced enemy bolt system with lead targeting');
  console.log('   • Adaptive difficulty scaling with player performance');
  console.log('   • Formation leader mechanics and visual feedback');
  console.log('   • Elite enemy shields and special effects');
  console.log('');
  
} catch (error) {
  console.error('❌ Error applying enemy enhancement patch:', error.message);
  process.exit(1);
}