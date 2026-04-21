// Enhanced XP and Leveling System - Old Eden Space MMO
// Adds visual progress indicators, enhanced XP sources, and level-up rewards

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

console.log('⚡ Enhancing XP and leveling system...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add navigation skill to the main skills object (I noticed it was referenced but not defined)
const oldSkills = `  skills: {
    gunnery: 0,    // Improves weapon damage — genome gene 32
    piloting: 0,   // Improves speed/handling — genome gene 33
    engineering: 0, // Improves shield regen — genome gene 34
    trading: 0,    // Improves buy/sell prices — genome gene 35
    mining: 0,     // Improves mining speed — genome gene 36
    hacking: 0,    // Improves loot drops — genome gene 37
  },`;

const newSkills = `  skills: {
    gunnery: 0,     // Improves weapon damage — genome gene 32
    piloting: 0,    // Improves speed/handling — genome gene 33
    engineering: 0, // Improves shield regen — genome gene 34
    trading: 0,     // Improves buy/sell prices — genome gene 35
    mining: 0,      // Improves mining speed — genome gene 36
    hacking: 0,     // Improves loot drops — genome gene 37
    navigation: 0,  // Improves jump range/efficiency — genome gene 38
    survival: 0,    // Improves hull repair/damage resistance — genome gene 39
  },`;

content = safeReplace(content, oldSkills, newSkills);

// 2. Enhance the gainSkillXP function with visual feedback and level rewards
const oldGainSkillXP = `function gainSkillXP(skillName, amount) {
  const ceiling = getSkillCeiling(skillName);
  const rate = getSkillRate(skillName);
  const prev = state.skills[skillName];
  state.skills[skillName] = Math.min(ceiling, state.skills[skillName] + amount * rate);
  // Notify on full level-ups
  const prevLevel = Math.floor(prev);
  const newLevel = Math.floor(state.skills[skillName]);
  if (newLevel > prevLevel && newLevel > 0) {
    addComms('Skills', \`\${skillName.charAt(0).toUpperCase() + skillName.slice(1)} leveled to \${newLevel}/\${ceiling}!\`);
  }
}`;

const newGainSkillXP = `function gainSkillXP(skillName, amount) {
  const ceiling = getSkillCeiling(skillName);
  const rate = getSkillRate(skillName);
  const prev = state.skills[skillName];
  state.skills[skillName] = Math.min(ceiling, state.skills[skillName] + amount * rate);
  
  // Visual XP gain indicator
  if (amount > 0 && c.active) {
    const xpGain = amount * rate;
    c.dmgNumbers.push({ 
      text: '+' + xpGain.toFixed(2) + ' ' + skillName.toUpperCase() + ' XP', 
      px: ship.position.x + (Math.random() - 0.5) * 10, 
      py: ship.position.y + 8 + Math.random() * 5, 
      pz: ship.position.z + (Math.random() - 0.5) * 10, 
      age: 0, 
      color: '#88ddff',
      isSkillXP: true
    });
  }
  
  // Enhanced level-up notifications and rewards
  const prevLevel = Math.floor(prev);
  const newLevel = Math.floor(state.skills[skillName]);
  if (newLevel > prevLevel && newLevel > 0) {
    const skillDisplayName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    addComms('LEVEL UP!', \`⚡ \${skillDisplayName} leveled to \${newLevel}/\${ceiling}! +5% bonus\`);
    
    // Level-up rewards based on skill type
    const levelRewards = {
      gunnery: () => {
        state.player.credits += newLevel * 25;
        addCombatLog(\`GUNNERY \${newLevel} — +\${newLevel * 25} credits bonus\`, '#ffaa44');
      },
      piloting: () => {
        // Slight speed boost reward
        c._pilotingSpeedBonus = (c._pilotingSpeedBonus || 1) + 0.02;
        addCombatLog(\`PILOTING \${newLevel} — permanent +2% speed\`, '#44aaff');
      },
      engineering: () => {
        // Shield capacity boost  
        state.ship.maxShield = Math.floor(state.ship.maxShield * 1.01);
        addCombatLog(\`ENGINEERING \${newLevel} — +1% max shield\`, '#44ffaa');
      },
      trading: () => {
        state.player.credits += newLevel * 50;
        addCombatLog(\`TRADING \${newLevel} — +\${newLevel * 50} credits bonus\`, '#ffdd44');
      },
      mining: () => {
        // Mining efficiency boost
        c._miningEfficiencyBonus = (c._miningEfficiencyBonus || 1) + 0.03;
        addCombatLog(\`MINING \${newLevel} — +3% mining efficiency\`, '#dd8844');
      },
      hacking: () => {
        // Loot magnet range boost
        c._hackingLootRangeBonus = (c._hackingLootRangeBonus || 1) + 0.05;
        addCombatLog(\`HACKING \${newLevel} — +5% loot collection range\`, '#ff44aa');
      },
      navigation: () => {
        // Jump cost reduction
        c._navigationCostReduction = (c._navigationCostReduction || 1) - 0.02;
        addCombatLog(\`NAVIGATION \${newLevel} — -2% jump costs\`, '#aaffdd');
      },
      survival: () => {
        // Hull boost
        state.ship.maxHull = Math.floor(state.ship.maxHull * 1.015);
        state.ship.hull = Math.min(state.ship.hull + 10, state.ship.maxHull);
        addCombatLog(\`SURVIVAL \${newLevel} — +1.5% max hull +10 repair\`, '#88ff88');
      }
    };
    
    // Apply level reward
    if (levelRewards[skillName]) levelRewards[skillName]();
    
    // Visual level-up effect
    if (c.active) {
      c.dmgNumbers.push({ 
        text: '⚡ ' + skillDisplayName.toUpperCase() + ' LEVEL ' + newLevel + ' ⚡', 
        px: ship.position.x, 
        py: ship.position.y + 12, 
        pz: ship.position.z, 
        age: 0, 
        color: '#ffaa00',
        isLevelUp: true,
        duration: 3000  // Longer duration for level-ups
      });
    }
    
    // Milestone rewards (every 5 levels)
    if (newLevel % 5 === 0) {
      const milestoneReward = newLevel * 100;
      state.player.credits += milestoneReward;
      addComms('MILESTONE!', \`\${skillDisplayName} Mastery Level \${newLevel}! +\${milestoneReward} bonus credits\`);
      AudioSFX.play('quest_complete');
    }
    
    // Sound effect for level-up
    AudioSFX.play('karma_reveal');
  }
}`;

content = safeReplace(content, oldGainSkillXP, newGainSkillXP);

// 3. Enhance the skill ceiling and rate functions to include new skills
const oldGetSkillCeiling = `function getSkillCeiling(skillName) {
  const geneMap = { gunnery: 32, piloting: 33, engineering: 34, trading: 35, mining: 36, hacking: 37 };
  if (!state.player.genome) return 5;
  const raw = state.player.genome[geneMap[skillName]] || 128;
  return Math.max(1, Math.round((raw / 255) * 10));
}`;

const newGetSkillCeiling = `function getSkillCeiling(skillName) {
  const geneMap = { gunnery: 32, piloting: 33, engineering: 34, trading: 35, mining: 36, hacking: 37, navigation: 38, survival: 39 };
  if (!state.player.genome) return 5;
  const raw = state.player.genome[geneMap[skillName]] || 128;
  return Math.max(1, Math.round((raw / 255) * 10));
}`;

content = safeReplace(content, oldGetSkillCeiling, newGetSkillCeiling);

const oldGetSkillRate = `function getSkillRate(skillName) {
  const geneMap = { gunnery: 32, piloting: 33, engineering: 34, trading: 35, mining: 36, hacking: 37 };
  if (!state.player.genome) return 1;
  const raw = state.player.genome[geneMap[skillName]] || 128;
  return 0.5 + (raw / 128); // 0.5× to 2.5× speed
}`;

const newGetSkillRate = `function getSkillRate(skillName) {
  const geneMap = { gunnery: 32, piloting: 33, engineering: 34, trading: 35, mining: 36, hacking: 37, navigation: 38, survival: 39 };
  if (!state.player.genome) return 1;
  const raw = state.player.genome[geneMap[skillName]] || 128;
  return 0.5 + (raw / 128); // 0.5× to 2.5× speed
}`;

content = safeReplace(content, oldGetSkillRate, newGetSkillRate);

// 4. Add more XP sources throughout the game
const oldEnemyKillXP = `            gainSkillXP('gunnery', 0.03);
            gainSkillXP('piloting', 0.01);`;

const newEnemyKillXP = `            // Enhanced XP gains for kills
            const baseGunneryXP = 0.03;
            const basePilotingXP = 0.01;
            const survivalXP = 0.02;
            
            // Bonus XP for different enemy types
            const xpMultiplier = {
              fighter: 1.0, scout: 0.8, interceptor: 1.1, destroyer: 1.5, 
              cruiser: 1.8, corvette: 1.2, bomber: 1.3, gunship: 1.6, 
              frigate: 1.7, swarm: 0.6
            };
            const mult = xpMultiplier[e.type] || 1.0;
            
            // Elite/Boss bonus XP
            const eliteBonus = e._isElite ? 2.0 : 1.0;
            const bossBonus = e.isBoss ? 5.0 : 1.0;
            const finalMult = mult * eliteBonus * bossBonus;
            
            gainSkillXP('gunnery', baseGunneryXP * finalMult);
            gainSkillXP('piloting', basePilotingXP * finalMult);
            gainSkillXP('survival', survivalXP * finalMult);
            
            // Streak bonus XP  
            if (c.streak >= 5) {
              gainSkillXP('gunnery', 0.01 * Math.min(c.streak / 10, 2.0));
            }`;

content = safeReplace(content, oldEnemyKillXP, newEnemyKillXP);

// 5. Add XP gain for taking damage (survival skill)
const oldDamageApplication = `          addCombatLog('Hit by enemy fire — ' + dmg.toFixed(0) + ' dmg', '#ff6644');`;

const newDamageApplication = `          addCombatLog('Hit by enemy fire — ' + dmg.toFixed(0) + ' dmg', '#ff6644');
          // Survival XP for taking damage (learn from pain)
          gainSkillXP('survival', Math.min(dmg / 100, 0.05));`;

content = safeReplace(content, oldDamageApplication, newDamageApplication);

// 6. Enhanced skill bonus function with new skills
const oldGetSkillBonus = `function getSkillBonus(skillName) {
  return 1 + (state.skills[skillName] * 0.05); // +5% per level, max +50% at level 10
}`;

const newGetSkillBonus = `function getSkillBonus(skillName) {
  const baseBonus = 1 + (state.skills[skillName] * 0.05); // +5% per level, max +50% at level 10
  
  // Apply skill-specific bonuses
  const skillBonuses = {
    piloting: c._pilotingSpeedBonus || 1,
    mining: c._miningEfficiencyBonus || 1,
    hacking: c._hackingLootRangeBonus || 1,
    navigation: c._navigationCostReduction || 1,
  };
  
  return baseBonus * (skillBonuses[skillName] || 1);
}`;

content = safeReplace(content, oldGetSkillBonus, newGetSkillBonus);

// 7. Add skills display in HUD (enhanced damage numbers rendering)
const oldDamageNumbersRender = `      hudCtx.fillStyle = d.color;
      hudCtx.fillText(d.text, sx, sy);
      d.age += dtMs;`;

const newDamageNumbersRender = `      // Enhanced styling for different number types
      if (d.isLevelUp) {
        hudCtx.font = 'bold 18px monospace';
        hudCtx.strokeStyle = '#000000';
        hudCtx.lineWidth = 3;
        hudCtx.strokeText(d.text, sx, sy);
        hudCtx.fillStyle = d.color;
        hudCtx.fillText(d.text, sx, sy);
        // Reset font
        hudCtx.font = 'bold 14px monospace';
      } else if (d.isSkillXP) {
        hudCtx.font = '12px monospace';
        hudCtx.fillStyle = d.color;
        hudCtx.fillText(d.text, sx, sy);
        hudCtx.font = 'bold 14px monospace';
      } else {
        hudCtx.fillStyle = d.color;
        hudCtx.fillText(d.text, sx, sy);
      }
      
      // Use custom duration for level-ups, default for others
      const maxAge = d.duration || 2000;
      d.age += dtMs;`;

content = safeReplace(content, oldDamageNumbersRender, newDamageNumbersRender);

// 8. Enhance damage number cleanup to use custom duration
const oldDamageCleanup = `      if (d.age > 2000) { c.dmgNumbers.splice(i, 1); }`;
const newDamageCleanup = `      const maxAge = d.duration || 2000;
      if (d.age > maxAge) { c.dmgNumbers.splice(i, 1); }`;

content = safeReplace(content, oldDamageCleanup, newDamageCleanup);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced XP and leveling system added successfully!');
console.log('📊 Features added:');
console.log('   • Visual XP gain indicators and level-up effects');
console.log('   • 2 new skills: navigation and survival');  
console.log('   • Enhanced level-up rewards for each skill type');
console.log('   • Milestone rewards every 5 levels');
console.log('   • Enemy type and elite/boss XP multipliers');
console.log('   • Survival XP for taking damage');
console.log('   • Permanent skill bonuses from leveling');
console.log('   • Enhanced visual feedback with custom durations');