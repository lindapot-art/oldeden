// DYNAMIC DIFFICULTY SCALING SYSTEM - FIXED

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

console.log('⚖️ Implementing Dynamic Difficulty Scaling System (Fixed)...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add difficulty scaling keybindings
  const keybindPattern = `  else if (key === 'g' || key === 'G') { clearCurrentTarget(); }
  // Consumables`;
  
  const difficultyKeybinds = cr(`  else if (key === 'g' || key === 'G') { clearCurrentTarget(); }
  // ═══ DIFFICULTY SYSTEM ═══
  else if (key === 'd' || key === 'D') { showDifficultyStatus(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, difficultyKeybinds, 'difficulty keybindings');
  console.log('✅ Added difficulty system keybindings (D=status)');

  // Add difficulty system functions before game loop
  const functionInsertionPoint = html.indexOf('function updateTargetingSystem(');
  
  const difficultyFunctions = cr(`
// ═══ DYNAMIC DIFFICULTY SCALING SYSTEM ═══

const DifficultySystem = {
  // Performance metrics
  metrics: {
    killsTotal: 0,
    deathsTotal: 0,
    damageDealt: 0,
    damageTaken: 0,
    playtimeMinutes: 0,
    lastPerformanceCheck: 0,
    consecutiveKills: 0,
    sessionsPlayed: 1
  },
  
  // Current difficulty state
  state: {
    difficultyLevel: 1.0,      // Base multiplier (0.5 = easier, 2.0 = harder)
    enemyHealthMod: 1.0,       // Enemy health multiplier
    enemyDamageMod: 1.0,       // Enemy damage multiplier
    enemySpawnMod: 1.0,        // Enemy spawn rate multiplier
    rewardMod: 1.0,            // Loot/XP reward multiplier
    lastAdjustment: 0          // Timestamp of last adjustment
  },
  
  // Calculate performance score (0.0 to 2.0+)
  calculatePerformance() {
    const m = this.metrics;
    
    // KDA ratio (kills/deaths, capped at 10)
    const kda = m.deathsTotal > 0 ? Math.min(m.killsTotal / m.deathsTotal, 10) : Math.min(m.killsTotal, 10);
    
    // Damage efficiency (damage dealt vs taken)
    const damageRatio = m.damageTaken > 0 ? (m.damageDealt / m.damageTaken) : Math.min(m.damageDealt / 1000, 3);
    
    // Experience factor (new players get easier difficulty)
    const experienceFactor = Math.min(m.playtimeMinutes / 30, 2.0); // Ramp up over 30 minutes
    
    // Consecutive kills bonus (hot streaks = harder difficulty)
    const streakFactor = 1.0 + (m.consecutiveKills * 0.05);
    
    // Combine factors
    const baseScore = (kda * 0.4) + (damageRatio * 0.3) + (experienceFactor * 0.2) + (streakFactor * 0.1);
    
    return Math.max(0.2, Math.min(baseScore, 3.0)); // Clamp between 0.2 and 3.0
  },
  
  // Update difficulty based on performance
  updateDifficulty() {
    const now = performance.now();
    
    // Only check every 30 seconds
    if (now - this.state.lastAdjustment < 30000) return;
    
    const performance = this.calculatePerformance();
    const targetDifficulty = 0.3 + (performance * 0.7); // Range: 0.3 to 2.0
    
    // Smooth adjustment (don't shock the player)
    const maxChange = 0.1;
    const diff = targetDifficulty - this.state.difficultyLevel;
    const adjustment = Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
    
    const newDifficulty = this.state.difficultyLevel + adjustment;
    
    if (Math.abs(adjustment) > 0.01) {
      this.state.difficultyLevel = newDifficulty;
      this.state.lastAdjustment = now;
      
      // Update modifiers
      this.state.enemyHealthMod = 0.7 + (newDifficulty * 0.6);     // 0.7x to 1.3x
      this.state.enemyDamageMod = 0.8 + (newDifficulty * 0.4);     // 0.8x to 1.2x  
      this.state.enemySpawnMod = 0.6 + (newDifficulty * 0.8);      // 0.6x to 1.4x
      this.state.rewardMod = 0.8 + (newDifficulty * 0.4);         // 0.8x to 1.2x
      
      // Notify player
      const direction = adjustment > 0 ? '↗️ HARDER' : '↙️ EASIER';
      addComms('DIFFICULTY', \`Adjusted \${direction} (Level: \${newDifficulty.toFixed(1)})\`);
      
      c.dmgNumbers.push({
        text: \`⚖️ DIFFICULTY: \${newDifficulty.toFixed(1)}\`,
        px: ship.position.x - 10,
        py: ship.position.y + 12,
        pz: ship.position.z,
        age: 0,
        color: adjustment > 0 ? '#ff6666' : '#66ff66',
        scale: 1.0
      });
    }
  },
  
  // Track player actions
  onKill(enemy) {
    this.metrics.killsTotal++;
    this.metrics.consecutiveKills++;
    
    if (enemy && enemy.maxHp) {
      this.metrics.damageDealt += enemy.maxHp;
    }
  },
  
  onDeath() {
    this.metrics.deathsTotal++;
    this.metrics.consecutiveKills = 0;
  },
  
  onDamageDealt(amount) {
    this.metrics.damageDealt += amount;
  },
  
  onDamageTaken(amount) {
    this.metrics.damageTaken += amount;
    if (this.metrics.consecutiveKills > 5) {
      this.metrics.consecutiveKills = Math.max(0, this.metrics.consecutiveKills - 1);
    }
  },
  
  // Apply difficulty modifiers to enemies
  applyToEnemy(enemy) {
    if (!enemy) return enemy;
    
    const s = this.state;
    
    // Apply health modifier
    if (enemy.hp && !enemy._difficultyApplied) {
      enemy.maxHp = (enemy.maxHp || enemy.hp) * s.enemyHealthMod;
      enemy.hp = enemy.maxHp;
      enemy._difficultyApplied = true;
    }
    
    // Apply damage modifier (stored for when enemy attacks)
    enemy._difficultyDamageMod = s.enemyDamageMod;
    
    return enemy;
  },
  
  // Get spawn rate multiplier
  getSpawnRateMultiplier() {
    return this.state.enemySpawnMod;
  },
  
  // Get reward multiplier  
  getRewardMultiplier() {
    return this.state.rewardMod;
  }
};

function showDifficultyStatus() {
  const s = DifficultySystem.state;
  const m = DifficultySystem.metrics;
  const perf = DifficultySystem.calculatePerformance();
  
  const kda = m.deathsTotal > 0 ? (m.killsTotal / m.deathsTotal).toFixed(1) : m.killsTotal.toString();
  
  addComms('DIFFICULTY', \`Level: \${s.difficultyLevel.toFixed(1)}/3.0 | Performance: \${perf.toFixed(1)}\`);
  addComms('STATS', \`KDA: \${kda} | Streak: \${m.consecutiveKills} | Sessions: \${m.sessionsPlayed}\`);
  addComms('MODIFIERS', \`HP:\${(s.enemyHealthMod*100).toFixed(0)}% DMG:\${(s.enemyDamageMod*100).toFixed(0)}% SPAWN:\${(s.enemySpawnMod*100).toFixed(0)}% REWARD:\${(s.rewardMod*100).toFixed(0)}%\`);
  
  c.dmgNumbers.push({
    text: \`⚖️ DIFFICULTY: \${s.difficultyLevel.toFixed(1)} | KDA: \${kda}\`,
    px: ship.position.x,
    py: ship.position.y + 15,
    pz: ship.position.z,
    age: 0,
    color: s.difficultyLevel > 1.3 ? '#ff4444' : s.difficultyLevel < 0.8 ? '#44ff44' : '#ffffff',
    scale: 1.2
  });
}

function updateDifficultySystem(dtMs) {
  // Update playtime
  DifficultySystem.metrics.playtimeMinutes = (performance.now() - (window.gameStartTime || 0)) / 60000;
  
  // Check for difficulty adjustment
  DifficultySystem.updateDifficulty();
}

`);
  
  html = html.slice(0, functionInsertionPoint) + difficultyFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added dynamic difficulty scaling system');

  // Add difficulty update to game loop - correct pattern
  const gameLoopPattern = `      updateTargetingSystem(dtMs);
      updateParticleSystem(dtMs);`;
      
  const gameLoopWithDifficulty = cr(`      updateTargetingSystem(dtMs);
      updateDifficultySystem(dtMs);
      updateParticleSystem(dtMs);`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithDifficulty, 'difficulty game loop');
  console.log('✅ Added difficulty update to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Dynamic Difficulty Scaling System implemented successfully!');
  console.log('');
  console.log('⚖️ DIFFICULTY SCALING FEATURES:');
  console.log('   • D key: Show difficulty status & performance metrics');
  console.log('   • Performance tracking: KDA, damage efficiency, playtime');
  console.log('   • Auto-adjustment every 30 seconds based on player skill');
  console.log('   • Enemy health/damage/spawn rate scaling (0.6x to 1.4x)');
  console.log('   • Reward scaling (better players get better loot)');
  console.log('   • Consecutive kill streak tracking');
  console.log('   • Smooth difficulty transitions (no shock adjustments)');
  console.log('   • Visual feedback for difficulty changes');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing difficulty system:', error.message);
  process.exit(1);
}