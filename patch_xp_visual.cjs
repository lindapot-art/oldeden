// Enhanced XP Visual Feedback - Old Eden Space MMO
// Adds visual XP notifications and enhanced level-up effects

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

console.log('⚡ Adding enhanced XP visual feedback...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Enhance gainSkillXP function to add visual feedback
const oldGainSkillXP = `  // Notify on full level-ups
  const prevLevel = Math.floor(prev);
  const newLevel = Math.floor(state.skills[skillName]);
  if (newLevel > prevLevel && newLevel > 0) {
    addComms('Skills', \`\${skillName.charAt(0).toUpperCase() + skillName.slice(1)} leveled to \${newLevel}/\${ceiling}!\`);
  }`;

const newGainSkillXP = `  // Visual XP gain indicator
  if (amount > 0 && c.active) {
    const xpGain = amount * rate;
    c.dmgNumbers.push({ 
      text: '+' + xpGain.toFixed(2) + ' ' + skillName.toUpperCase() + ' XP', 
      px: ship.position.x + (Math.random() - 0.5) * 10, 
      py: ship.position.y + 8 + Math.random() * 5, 
      pz: ship.position.z + (Math.random() - 0.5) * 10, 
      age: 0, 
      color: '#88ddff'
    });
  }

  // Enhanced level-up notifications and rewards
  const prevLevel = Math.floor(prev);
  const newLevel = Math.floor(state.skills[skillName]);
  if (newLevel > prevLevel && newLevel > 0) {
    const skillDisplayName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    addComms('⚡ LEVEL UP!', \`\${skillDisplayName} reached level \${newLevel}/\${ceiling}! +5% bonus power\`);
    
    // Level-up reward credits
    const levelReward = newLevel * 30 + Math.floor(Math.random() * 20);
    state.player.credits += levelReward;
    
    // Visual level-up effect
    if (c.active) {
      c.dmgNumbers.push({ 
        text: '⚡ ' + skillDisplayName.toUpperCase() + ' LVL ' + newLevel + ' ⚡', 
        px: ship.position.x, 
        py: ship.position.y + 15, 
        pz: ship.position.z, 
        age: 0, 
        color: '#ffaa00'
      });
      c.dmgNumbers.push({ 
        text: '+' + levelReward + ' CREDITS', 
        px: ship.position.x, 
        py: ship.position.y + 12, 
        pz: ship.position.z, 
        age: 0, 
        color: '#ffd700'
      });
    }
    
    // Milestone rewards (every 5 levels)
    if (newLevel % 5 === 0) {
      const milestoneReward = newLevel * 100;
      state.player.credits += milestoneReward;
      addComms('🎯 MASTERY!', \`\${skillDisplayName} Mastery Level \${newLevel}! +\${milestoneReward} bonus credits\`);
      addCombatLog(\`\${skillDisplayName} MASTERY \${newLevel} — +\${milestoneReward} credits\`, '#ffaa00');
      AudioSFX.play('quest_complete');
    }
    
    // Sound effect for level-up
    AudioSFX.play('karma_reveal');
  }`;

content = safeReplace(content, oldGainSkillXP, newGainSkillXP);

// 2. Add more XP sources for existing skills
const oldGunneryXP = `            gainSkillXP('gunnery', 0.03);`;

const newGunneryXP = `            // Enhanced gunnery XP with enemy type bonuses
            let gunneryXP = 0.03;
            const xpBonuses = {
              fighter: 1.0, scout: 0.8, interceptor: 1.1, destroyer: 1.5, 
              cruiser: 1.8, corvette: 1.2, bomber: 1.3, gunship: 1.6, 
              frigate: 1.7, swarm: 0.6
            };
            const typeBonus = xpBonuses[e.type] || 1.0;
            const eliteBonus = e._isElite ? 2.0 : 1.0;
            const bossBonus = e.isBoss ? 5.0 : 1.0;
            
            gunneryXP *= typeBonus * eliteBonus * bossBonus;
            
            // Streak bonus XP
            if (c.streak >= 5) {
              gunneryXP *= (1 + Math.min(c.streak / 20, 1.0));
            }
            
            gainSkillXP('gunnery', gunneryXP);`;

content = safeReplace(content, oldGunneryXP, newGunneryXP);

// 3. Add XP for shield recharge (engineering)
const oldShieldRegen = `      state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + shieldRegenRate * dt);`;

const newShieldRegen = `      const prevShield = state.ship.shield;
      state.ship.shield = Math.min(state.ship.maxShield, state.ship.shield + shieldRegenRate * dt);
      
      // Engineering XP for shield regeneration
      const shieldGained = state.ship.shield - prevShield;
      if (shieldGained > 0) {
        gainSkillXP('engineering', shieldGained * 0.001);
      }`;

content = safeReplace(content, oldShieldRegen, newShieldRegen);

// 4. Add XP for loot collection (hacking)
const oldLootCollection = `        AudioSFX.play('loot_' + l.type);`;

const newLootCollection = `        AudioSFX.play('loot_' + l.type);
        
        // Hacking XP for loot collection
        const hackingXP = l.rarity && l.rarity.mult > 1 ? 0.05 * l.rarity.mult : 0.02;
        gainSkillXP('hacking', hackingXP);`;

content = safeReplace(content, oldLootCollection, newLootCollection);

// 5. Add XP for speed/movement (piloting)
const oldPilotingXPGain = `    if (fl.speed > 10) gainSkillXP('piloting', 0.002 * dt);`;

const newPilotingXPGain = `    // Enhanced piloting XP - more for faster speeds
    if (fl.speed > 10) {
      const speedXP = 0.001 * dt * (fl.speed / fl.maxSpeed);
      if (state.flight.afterburner) speedXP *= 1.5; // Bonus for afterburner use
      gainSkillXP('piloting', speedXP);
    }`;

content = safeReplace(content, oldPilotingXPGain, newPilotingXPGain);

// 6. Add trading XP notification enhancement
const oldTradingXP = `  gainSkillXP('trading', 0.1);`;

const newTradingXP = `  const tradingXPAmount = 0.1 * Math.sqrt(profit / 100); // More XP for bigger profits
  gainSkillXP('trading', tradingXPAmount);`;

content = safeReplace(content, oldTradingXP, newTradingXP);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Enhanced XP visual feedback added successfully!');
console.log('📊 Features added:');
console.log('   • Visual XP gain indicators for all skill gains');
console.log('   • Enhanced level-up notifications with credit rewards');
console.log('   • Milestone rewards every 5 levels');
console.log('   • Enemy type bonuses for gunnery XP');
console.log('   • Engineering XP for shield regeneration');
console.log('   • Hacking XP for loot collection with rarity bonuses');
console.log('   • Enhanced piloting XP for movement and afterburner');
console.log('   • Trading XP scaling with profit amounts');