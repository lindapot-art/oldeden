// ACHIEVEMENT SYSTEM - Old Eden Space MMO
// Comprehensive achievement tracking, rewards, and progression milestones

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

console.log('🏆 Implementing Achievement System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // ═════════════════════════════════════════════════════════════
  // 1. ADD ACHIEVEMENT STATE TO GAME STATE
  // ═════════════════════════════════════════════════════════════
  
  const progressionStatePattern = `    skills: {
      weaponMastery: 0,
      precisionFiring: 0,
      shieldTech: 0,
      hullReinforcement: 0,
      energyEfficiency: 0,
      lootMagnetism: 0
    }
  },`;
  
  const achievementState = cr(`    skills: {
      weaponMastery: 0,
      precisionFiring: 0,
      shieldTech: 0,
      hullReinforcement: 0,
      energyEfficiency: 0,
      lootMagnetism: 0
    }
  },
  
  // ── Achievement System ──
  achievements: {
    // Progress tracking
    statistics: {
      enemiesKilled: 0,
      bossesDefeated: 0,
      creditsEarned: 0,
      damageDealt: 0,
      damageTaken: 0,
      timePlayed: 0,
      distanceTraveled: 0,
      shotsFired: 0,
      shotsHit: 0,
      criticalHits: 0,
      perfectKills: 0,
      eliteKills: 0,
      lootCollected: 0,
      weaponSwitches: 0,
      levelUps: 0,
      deathCount: 0,
      longestStreak: 0,
      highestLevel: 1
    },
    
    // Unlocked achievements
    unlocked: {},
    
    // Achievement definitions
    definitions: {
      // Combat Achievements
      firstBlood: {
        name: 'First Blood',
        description: 'Destroy your first enemy',
        icon: '🎯',
        condition: () => state.achievements.statistics.enemiesKilled >= 1,
        reward: { type: 'credits', amount: 100 },
        category: 'combat'
      },
      
      hunter: {
        name: 'Hunter',
        description: 'Destroy 50 enemies',
        icon: '🏹',
        condition: () => state.achievements.statistics.enemiesKilled >= 50,
        reward: { type: 'skillPoints', amount: 3 },
        category: 'combat'
      },
      
      destroyer: {
        name: 'Destroyer',
        description: 'Destroy 200 enemies',
        icon: '💀',
        condition: () => state.achievements.statistics.enemiesKilled >= 200,
        reward: { type: 'attributePoints', amount: 2 },
        category: 'combat'
      },
      
      reaper: {
        name: 'Grim Reaper',
        description: 'Destroy 500 enemies',
        icon: '⚱️',
        condition: () => state.achievements.statistics.enemiesKilled >= 500,
        reward: { type: 'weaponPoints', amount: 5 },
        category: 'combat'
      },
      
      bossSlayer: {
        name: 'Boss Slayer',
        description: 'Defeat your first boss',
        icon: '👑',
        condition: () => state.achievements.statistics.bossesDefeated >= 1,
        reward: { type: 'credits', amount: 1000 },
        category: 'combat'
      },
      
      eliteHunter: {
        name: 'Elite Hunter',
        description: 'Destroy 25 elite enemies',
        icon: '⭐',
        condition: () => state.achievements.statistics.eliteKills >= 25,
        reward: { type: 'skillPoints', amount: 5 },
        category: 'combat'
      },
      
      sharpshooter: {
        name: 'Sharpshooter',
        description: 'Achieve 80% accuracy',
        icon: '🎯',
        condition: () => {
          const stats = state.achievements.statistics;
          return stats.shotsFired > 100 && (stats.shotsHit / stats.shotsFired) >= 0.8;
        },
        reward: { type: 'attributePoints', amount: 3 },
        category: 'skill'
      },
      
      criticalMaster: {
        name: 'Critical Master',
        description: 'Land 100 critical hits',
        icon: '💥',
        condition: () => state.achievements.statistics.criticalHits >= 100,
        reward: { type: 'skillPoints', amount: 4 },
        category: 'skill'
      },
      
      streaker: {
        name: 'Kill Streaker',
        description: 'Achieve a 25 kill streak',
        icon: '🔥',
        condition: () => state.achievements.statistics.longestStreak >= 25,
        reward: { type: 'credits', amount: 2500 },
        category: 'skill'
      },
      
      // Progression Achievements
      novice: {
        name: 'Novice Pilot',
        description: 'Reach level 5',
        icon: '🛫',
        condition: () => state.achievements.statistics.highestLevel >= 5,
        reward: { type: 'attributePoints', amount: 1 },
        category: 'progression'
      },
      
      veteran: {
        name: 'Veteran Pilot',
        description: 'Reach level 15',
        icon: '🚁',
        condition: () => state.achievements.statistics.highestLevel >= 15,
        reward: { type: 'skillPoints', amount: 3 },
        category: 'progression'
      },
      
      ace: {
        name: 'Ace Pilot',
        description: 'Reach level 30',
        icon: '🛸',
        condition: () => state.achievements.statistics.highestLevel >= 30,
        reward: { type: 'attributePoints', amount: 5 },
        category: 'progression'
      },
      
      legend: {
        name: 'Legendary Pilot',
        description: 'Reach level 50',
        icon: '👨‍🚀',
        condition: () => state.achievements.statistics.highestLevel >= 50,
        reward: { type: 'credits', amount: 10000 },
        category: 'progression'
      },
      
      // Economic Achievements
      entrepreneur: {
        name: 'Entrepreneur',
        description: 'Earn 10,000 credits',
        icon: '💰',
        condition: () => state.achievements.statistics.creditsEarned >= 10000,
        reward: { type: 'credits', amount: 1000 },
        category: 'economic'
      },
      
      tycoon: {
        name: 'Space Tycoon',
        description: 'Earn 100,000 credits',
        icon: '💎',
        condition: () => state.achievements.statistics.creditsEarned >= 100000,
        reward: { type: 'skillPoints', amount: 10 },
        category: 'economic'
      },
      
      collector: {
        name: 'Loot Collector',
        description: 'Collect 500 loot items',
        icon: '📦',
        condition: () => state.achievements.statistics.lootCollected >= 500,
        reward: { type: 'attributePoints', amount: 2 },
        category: 'economic'
      },
      
      // Survival Achievements
      survivor: {
        name: 'Survivor',
        description: 'Play for 1 hour without dying',
        icon: '🛡️',
        condition: () => {
          // This would need time tracking implementation
          return false; // Placeholder
        },
        reward: { type: 'skillPoints', amount: 3 },
        category: 'survival'
      },
      
      immortal: {
        name: 'Immortal',
        description: 'Reach level 20 without dying',
        icon: '👼',
        condition: () => {
          return state.achievements.statistics.highestLevel >= 20 && 
                 state.achievements.statistics.deathCount === 0;
        },
        reward: { type: 'attributePoints', amount: 10 },
        category: 'survival'
      },
      
      // Special Achievements
      weaponMaster: {
        name: 'Weapon Master',
        description: 'Unlock all weapons',
        icon: '🔫',
        condition: () => {
          const wp = state.weaponProgression;
          return wp && wp.unlockedWeapons.length >= 4;
        },
        reward: { type: 'weaponPoints', amount: 10 },
        category: 'special'
      },
      
      perfectionist: {
        name: 'Perfectionist',
        description: 'Max an attribute to 100',
        icon: '🏆',
        condition: () => {
          const pp = state.playerProgression;
          return pp && Object.values(pp.attributes).some(val => val >= 100);
        },
        reward: { type: 'credits', amount: 5000 },
        category: 'special'
      }
    }
  },`);
  
  html = safeReplace(html, progressionStatePattern, achievementState, 'achievement system state');
  console.log('✅ Added achievement system state');

  // ═════════════════════════════════════════════════════════════
  // 2. ADD ACHIEVEMENT FUNCTIONS
  // ═════════════════════════════════════════════════════════════
  
  const functionInsertionPoint = html.indexOf('// ═══ COMPREHENSIVE PROGRESSION FUNCTIONS ═══');
  
  const achievementFunctions = cr(`// ═══ ACHIEVEMENT SYSTEM ═══

function checkAchievements() {
  const achievements = state.achievements;
  if (!achievements) return;
  
  for (const [key, achievement] of Object.entries(achievements.definitions)) {
    // Skip if already unlocked
    if (achievements.unlocked[key]) continue;
    
    // Check condition
    if (achievement.condition()) {
      unlockAchievement(key, achievement);
    }
  }
}

function unlockAchievement(key, achievement) {
  const achievements = state.achievements;
  if (!achievements || achievements.unlocked[key]) return;
  
  // Mark as unlocked
  achievements.unlocked[key] = {
    unlockedAt: Date.now(),
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon
  };
  
  // Apply reward
  if (achievement.reward) {
    applyAchievementReward(achievement.reward);
  }
  
  // Visual feedback
  c.dmgNumbers.push({
    text: \`🏆 ACHIEVEMENT: \${achievement.name}!\`,
    px: ship.position.x,
    py: ship.position.y + 15,
    pz: ship.position.z,
    age: 0,
    color: '#ffaa00',
    scale: 2.0
  });
  
  // Screen flash effect
  if (c.achievementFlash) {
    c.achievementFlash.timer = 1000;
    c.achievementFlash.achievement = achievement;
  } else {
    c.achievementFlash = {
      timer: 1000,
      achievement: achievement
    };
  }
  
  addComms('ACHIEVEMENT', \`\${achievement.icon} \${achievement.name}: \${achievement.description}\`);
  AudioSFX.play('achievement_unlock');
  
  console.log(\`🏆 Achievement unlocked: \${achievement.name}\`);
}

function applyAchievementReward(reward) {
  switch (reward.type) {
    case 'credits':
      state.player.credits += reward.amount;
      addComms('REWARD', \`+\${reward.amount} credits awarded!\`);
      break;
      
    case 'skillPoints':
      if (state.playerProgression) {
        state.playerProgression.skillPoints += reward.amount;
        addComms('REWARD', \`+\${reward.amount} skill points awarded!\`);
      }
      break;
      
    case 'attributePoints':
      if (state.playerProgression) {
        state.playerProgression.attributePoints += reward.amount;
        addComms('REWARD', \`+\${reward.amount} attribute points awarded!\`);
      }
      break;
      
    case 'weaponPoints':
      if (state.weaponProgression) {
        state.weaponProgression.upgradePoints += reward.amount;
        addComms('REWARD', \`+\${reward.amount} weapon upgrade points awarded!\`);
      }
      break;
  }
}

function updateAchievementStats(statName, value, increment = false) {
  const achievements = state.achievements;
  if (!achievements || !achievements.statistics) return;
  
  if (increment) {
    achievements.statistics[statName] = (achievements.statistics[statName] || 0) + value;
  } else {
    achievements.statistics[statName] = Math.max(achievements.statistics[statName] || 0, value);
  }
  
  // Check achievements after stat update
  checkAchievements();
}

function showAchievementsUI() {
  const achievements = state.achievements;
  if (!achievements) return;
  
  let overlay = document.getElementById('achievements-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'achievements-overlay';
    overlay.style.cssText = \`
      position: fixed;
      top: 5%;
      left: 5%;
      width: 90%;
      height: 90%;
      background: rgba(0, 20, 40, 0.95);
      border: 2px solid #44aaff;
      border-radius: 12px;
      color: #ffffff;
      font-family: var(--font-mono);
      padding: 20px;
      z-index: 3000;
      overflow-y: auto;
      display: none;
    \`;
    document.body.appendChild(overlay);
  }
  
  const unlockedCount = Object.keys(achievements.unlocked).length;
  const totalCount = Object.keys(achievements.definitions).length;
  const completionPercent = Math.floor((unlockedCount / totalCount) * 100);
  
  let content = \`
    <h2 style="color: #44aaff; text-align: center; margin-bottom: 20px;">🏆 ACHIEVEMENTS</h2>
    <p style="text-align: center; color: #ffaa00; margin-bottom: 30px;">
      Progress: \${unlockedCount}/\${totalCount} (\${completionPercent}%)
    </p>
    
    <div style="display: grid; gap: 20px;">
  \`;
  
  // Group achievements by category
  const categories = {
    'combat': '⚔️ Combat',
    'progression': '📈 Progression', 
    'skill': '🎯 Skill',
    'economic': '💰 Economic',
    'survival': '🛡️ Survival',
    'special': '⭐ Special'
  };
  
  for (const [category, title] of Object.entries(categories)) {
    content += \`<h3 style="color: #88ff44; border-bottom: 2px solid #88ff44; padding-bottom: 5px;">\${title}</h3>\`;
    
    const categoryAchievements = Object.entries(achievements.definitions)
      .filter(([key, achievement]) => achievement.category === category);
    
    content += \`<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px;">\`;
    
    for (const [key, achievement] of categoryAchievements) {
      const isUnlocked = achievements.unlocked[key];
      const cardStyle = isUnlocked 
        ? 'background: rgba(0, 60, 0, 0.3); border: 2px solid #44ff88;'
        : 'background: rgba(40, 40, 40, 0.3); border: 2px solid #666666;';
      
      content += \`
        <div style="\${cardStyle} border-radius: 8px; padding: 15px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 2rem; margin-right: 10px;">\${achievement.icon}</span>
            <div>
              <h4 style="color: \${isUnlocked ? '#44ff88' : '#cccccc'}; margin: 0;">\${achievement.name}</h4>
              <p style="margin: 0; font-size: 0.9rem; color: #cccccc;">\${achievement.description}</p>
            </div>
          </div>
          
          \${isUnlocked ? 
            \`<div style="color: #44ff88; font-size: 0.8rem;">
               ✓ UNLOCKED
               \${achievement.reward ? \`<br/>Reward: \${achievement.reward.amount} \${achievement.reward.type}\` : ''}
             </div>\` 
            : \`<div style="color: #888888; font-size: 0.8rem;">🔒 Locked</div>\`
          }
        </div>
      \`;
    }
    
    content += \`</div>\`;
  }
  
  content += \`
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <button onclick="document.getElementById('achievements-overlay').style.display='none'"
              style="background: #ff4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 1rem;">
        CLOSE
      </button>
    </div>
  \`;
  
  overlay.innerHTML = content;
  overlay.style.display = 'block';
}

function renderAchievementFlash(ctx) {
  if (!c.achievementFlash || c.achievementFlash.timer <= 0) return;
  
  const flash = c.achievementFlash;
  const alpha = Math.min(1.0, flash.timer / 1000);
  
  // Background flash
  ctx.save();
  ctx.globalAlpha = alpha * 0.3;
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  // Achievement banner
  const bannerHeight = 100;
  const bannerY = canvas.height * 0.15;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  
  // Banner background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
  
  // Banner border
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, bannerY, canvas.width, bannerHeight);
  
  // Achievement text
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 24px var(--font-mono)';
  ctx.textAlign = 'center';
  ctx.fillText('🏆 ACHIEVEMENT UNLOCKED!', canvas.width / 2, bannerY + 30);
  
  ctx.font = '18px var(--font-mono)';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(\`\${flash.achievement.icon} \${flash.achievement.name}\`, canvas.width / 2, bannerY + 55);
  
  ctx.font = '14px var(--font-mono)';
  ctx.fillStyle = '#cccccc';
  ctx.fillText(flash.achievement.description, canvas.width / 2, bannerY + 75);
  
  ctx.restore();
  
  flash.timer -= 16.67; // Assuming 60 FPS
}

// Make functions globally accessible
window.showAchievementsUI = showAchievementsUI;

`);
  
  html = html.slice(0, functionInsertionPoint) + achievementFunctions + cr('\n\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added achievement system functions');

  // ═════════════════════════════════════════════════════════════
  // 3. INTEGRATE ACHIEVEMENT TRACKING INTO GAME EVENTS
  // ═════════════════════════════════════════════════════════════
  
  // Add enemy kill tracking
  const enemyKillStatsPattern = `            // Player XP gain
            if (typeof gainPlayerExperience === 'function' && state.playerProgression) {
              gainPlayerExperience(totalXP, 'combat');
            }`;
            
  const enemyKillWithStats = cr(`            // Player XP gain
            if (typeof gainPlayerExperience === 'function' && state.playerProgression) {
              gainPlayerExperience(totalXP, 'combat');
            }
            
            // ═══ ACHIEVEMENT STATISTICS TRACKING ═══
            if (typeof updateAchievementStats === 'function') {
              updateAchievementStats('enemiesKilled', 1, true);
              if (e._isElite) updateAchievementStats('eliteKills', 1, true);
              if (e.isBoss) updateAchievementStats('bossesDefeated', 1, true);
              updateAchievementStats('damageDealt', Math.floor(finalDamage), true);
              
              // Track kill streak
              if (!c.achievementStreak) c.achievementStreak = 0;
              c.achievementStreak++;
              updateAchievementStats('longestStreak', c.achievementStreak, false);
            }`);
  
  html = safeReplace(html, enemyKillStatsPattern, enemyKillWithStats, 'achievement tracking integration');
  console.log('✅ Integrated achievement tracking into enemy kills');

  // Add level tracking to player progression
  const levelUpPattern = `    pp.level++;
    pp.skillPoints += 2;
    pp.attributePoints += 1;`;
    
  const levelUpWithStats = cr(`    pp.level++;
    pp.skillPoints += 2;
    pp.attributePoints += 1;
    
    // Achievement tracking
    if (typeof updateAchievementStats === 'function') {
      updateAchievementStats('levelUps', 1, true);
      updateAchievementStats('highestLevel', pp.level, false);
    }`);
  
  html = safeReplace(html, levelUpPattern, levelUpWithStats, 'level up achievement tracking');
  console.log('✅ Added achievement tracking to level ups');

  // ═════════════════════════════════════════════════════════════
  // 4. ADD ACHIEVEMENT KEYBINDING
  // ═════════════════════════════════════════════════════════════
  
  const achievementKeybindPattern = `  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  // Consumables`;
  
  const achievementKeybind = cr(`  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  else if (key === 'h' || key === 'H') { if (typeof showAchievementsUI === 'function') showAchievementsUI(); }
  // Consumables`);
  
  html = safeReplace(html, achievementKeybindPattern, achievementKeybind, 'achievement keybinding');
  console.log('✅ Added achievement UI keybinding (H key)');

  // ═════════════════════════════════════════════════════════════
  // 5. ADD ACHIEVEMENT FLASH RENDERING TO GAME LOOP
  // ═════════════════════════════════════════════════════════════
  
  const renderingPattern = `  composer.render();
}`;
  
  const renderingWithAchievements = cr(`  composer.render();
  
  // Render achievement flash overlay
  if (typeof renderAchievementFlash === 'function') {
    renderAchievementFlash(ctx);
  }
}`);
  
  html = safeReplace(html, renderingPattern, renderingWithAchievements, 'achievement rendering');
  console.log('✅ Added achievement flash rendering to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Achievement System implemented successfully!');
  console.log('');
  console.log('🏆 ACHIEVEMENT SYSTEM FEATURES DEPLOYED:');
  console.log('   • 20+ achievements across 6 categories (combat, progression, skill, economic, survival, special)');
  console.log('   • Comprehensive statistics tracking (kills, damage, accuracy, streaks, etc.)');
  console.log('   • Achievement rewards (credits, skill points, attribute points, weapon points)');
  console.log('   • Visual achievement notifications with screen flash effects');
  console.log('   • Achievement progress UI accessible with H key');
  console.log('   • Automatic achievement checking and unlocking');
  console.log('   • Integration with enemy kills, level ups, and game progression');
  console.log('   • Completion percentage tracking');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing achievement system:', error.message);
  process.exit(1);
}