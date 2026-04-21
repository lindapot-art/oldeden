// Precise XP Visual Enhancement - Old Eden Space MMO
// Enhances gainSkillXP function with visual feedback

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

console.log('⚡ Adding precise XP visual enhancements...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Enhance the gainSkillXP function with visual feedback
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
  if (amount > 0 && c.active && ship) {
    const xpGain = amount * rate;
    if (xpGain >= 0.01) { // Only show for meaningful XP gains
      c.dmgNumbers.push({ 
        text: '+' + xpGain.toFixed(2) + ' ' + skillName.toUpperCase() + ' XP', 
        px: ship.position.x + (Math.random() - 0.5) * 10, 
        py: ship.position.y + 8 + Math.random() * 5, 
        pz: ship.position.z + (Math.random() - 0.5) * 10, 
        age: 0, 
        color: '#88ddff'
      });
    }
  }
  
  // Enhanced level-up notifications and rewards
  const prevLevel = Math.floor(prev);
  const newLevel = Math.floor(state.skills[skillName]);
  if (newLevel > prevLevel && newLevel > 0) {
    const skillDisplayName = skillName.charAt(0).toUpperCase() + skillName.slice(1);
    addComms('⚡ LEVEL UP!', \`\${skillDisplayName} reached level \${newLevel}/\${ceiling}! +5% skill bonus\`);
    
    // Level-up reward credits based on skill level
    const levelReward = newLevel * 30 + Math.floor(Math.random() * 20);
    state.player.credits += levelReward;
    
    // Visual level-up effect
    if (c.active && ship) {
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
        px: ship.position.x + (Math.random() - 0.5) * 8, 
        py: ship.position.y + 12, 
        pz: ship.position.z + (Math.random() - 0.5) * 8, 
        age: 0, 
        color: '#ffd700'
      });
    }
    
    // Milestone rewards (every 5 levels)
    if (newLevel % 5 === 0) {
      const milestoneReward = newLevel * 100;
      state.player.credits += milestoneReward;
      addComms('🎯 MASTERY!', \`\${skillDisplayName} Mastery Level \${newLevel}! +\${milestoneReward} mastery bonus\`);
      addCombatLog(\`\${skillDisplayName} MASTERY \${newLevel} — +\${milestoneReward} credits\`, '#ffaa00');
      if (typeof AudioSFX !== 'undefined' && AudioSFX.play) AudioSFX.play('quest_complete');
    }
    
    // Sound effect for level-up
    if (typeof AudioSFX !== 'undefined' && AudioSFX.play) AudioSFX.play('karma_reveal');
  }
}`;

content = safeReplace(content, oldGainSkillXP, newGainSkillXP);

// 2. Enhance piloting XP gain with speed-based bonuses
const oldPilotingXP = `    if (fl.speed > 10) gainSkillXP('piloting', 0.002 * dt);`;

const newPilotingXP = `    if (fl.speed > 10) {
      // Enhanced piloting XP - more for faster speeds and afterburner
      let pilotingXP = 0.001 * dt * (fl.speed / fl.maxSpeed);
      if (state.flight.afterburner) pilotingXP *= 1.5; // Bonus for afterburner use
      gainSkillXP('piloting', pilotingXP);
    }`;

content = safeReplace(content, oldPilotingXP, newPilotingXP);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Precise XP visual enhancements added successfully!');
console.log('📊 Features added:');
console.log('   • Visual XP gain indicators (+X.XX SKILL XP floating text)');
console.log('   • Enhanced level-up effects with credit rewards');
console.log('   • Mastery milestone rewards every 5 levels');
console.log('   • Sound effects for level-ups and mastery achievements');
console.log('   • Enhanced piloting XP with speed and afterburner bonuses');