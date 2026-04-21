// PLAYER PROGRESSION SYSTEM - Old Eden Space MMO
// Character leveling, skill trees, attributes, and advancement

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

console.log('🆙 Implementing Player Progression System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // ═════════════════════════════════════════════════════════════
  // 1. ADD PLAYER PROGRESSION STATE TO GAME STATE
  // ═════════════════════════════════════════════════════════════
  
  // Find the weapon progression state and add player progression after it
  const insertionPoint = html.indexOf('  },\r\n  \r\n  // ── Advanced Weapon Progression System ──');
  
  if (insertionPoint === -1) {
    console.error('❌ Could not find weapon progression insertion point');
    process.exit(1);
  }
  
  const playerProgressionState = cr(`  },
  
  // ── Advanced Player Progression System ──
  playerProgression: {
    level: 1,
    experience: 0,
    skillPoints: 0,
    attributePoints: 0,
    
    // Core Attributes (0-100, start at 10 each)
    attributes: {
      piloting: 10,     // Ship handling, evasion, precision
      gunnery: 10,      // Weapon damage, accuracy, crit chance  
      engineering: 10,  // Shield/hull capacity, regen rate
      tactics: 10,      // Target lock speed, enemy radar
      endurance: 10,    // Energy capacity, regen rate
      luck: 10          // Loot quality, rare event chance
    },
    
    // Skill Trees (0-20 each, unlocked progressively)
    skills: {
      // Combat Skills
      weaponMastery: 0,     // +5% weapon damage per level
      precisionFiring: 0,   // +3% crit chance per level
      rapidReload: 0,       // -10% reload time per level
      armorPiercing: 0,     // +15% damage vs shields/armor per level
      battleFocus: 0,       // +2% damage per consecutive kill (max 50%)
      
      // Defense Skills  
      shieldTech: 0,        // +10% shield capacity per level
      hullReinforcement: 0, // +8% hull capacity per level
      evasiveManeuvers: 0,  // +5% dodge chance per level
      damageControl: 0,     // -15% damage taken per level
      emergencyRepair: 0,   // Auto-repair hull/shield on critical
      
      // Utility Skills
      energyEfficiency: 0,  // -8% energy cost per level
      scannerUpgrade: 0,    // +20% detection range per level
      lootMagnetism: 0,     // +15% loot collection range per level
      negotiator: 0,        // +10% credits from missions per level
      survivalInstinct: 0,  // +5% XP gain per level
      
      // Advanced Skills (require high attributes)
      psionicResonance: 0,  // Unlock psionic abilities
      quantumTunneling: 0,  // Phase through attacks occasionally
      timeDistortion: 0,    // Slow-motion during critical moments
      neuralInterface: 0,   // Direct ship-mind connection
      cosmicAwareness: 0    // Predict enemy spawns and movements
    },
    
    // Progression milestones
    milestones: {
      firstKill: false,
      level10: false,
      level25: false,
      level50: false,
      maxAttribute: false,
      allSkillsTrained: false,
      transcendence: false
    },
    
    // Prestige system (for high-level players)
    prestige: {
      level: 0,
      tokens: 0,
      permanentBonuses: {
        startingLevel: 0,     // Start at higher level
        xpMultiplier: 1.0,    // Bonus XP gain
        skillPointBonus: 0,   // Extra skill points per level
        attributeBonus: 0,    // Extra attribute points per level
        eliteSpawnRate: 1.0,  // Elite enemy spawn rate multiplier
        rareLootChance: 1.0   // Rare loot drop multiplier
      }
    }
  },`);
  
  html = html.slice(0, insertionPoint) + playerProgressionState + cr('\n\n  // ── Advanced Weapon Progression System ──') + html.slice(insertionPoint + 55);
  console.log('✅ Added player progression state');

  // ═════════════════════════════════════════════════════════════
  // 2. PLAYER PROGRESSION FUNCTIONS
  // ═════════════════════════════════════════════════════════════
  
  // Find where to insert player progression functions
  const functionInsertionPoint = html.indexOf('// ═══ WEAPON PROGRESSION SYSTEM ═══');
  
  const playerProgressionFunctions = cr(`// ═══ PLAYER PROGRESSION SYSTEM ═══
function gainExperience(amount, source = 'combat') {
  const pp = state.playerProgression;
  if (!pp) return;
  
  const prestige = pp.prestige.permanentBonuses;
  const bonusMultiplier = prestige.xpMultiplier * (1 + pp.skills.survivalInstinct * 0.05);
  const finalXP = Math.floor(amount * bonusMultiplier);
  
  const oldLevel = pp.level;
  pp.experience += finalXP;
  
  // Level calculation: exponential growth
  const requiredXP = calculateRequiredXP(pp.level);
  
  while (pp.experience >= requiredXP && pp.level < 100) {
    pp.experience -= requiredXP;
    pp.level++;
    
    // Level up rewards
    const skillPointGain = 2 + prestige.skillPointBonus + (pp.level % 5 === 0 ? 1 : 0); // Bonus every 5 levels
    const attributePointGain = 1 + prestige.attributeBonus + (pp.level % 10 === 0 ? 1 : 0); // Bonus every 10 levels
    
    pp.skillPoints += skillPointGain;
    pp.attributePoints += attributePointGain;
    
    // Visual feedback
    c.dmgNumbers.push({
      text: \`🆙 LEVEL \${pp.level}!\`,
      px: ship.position.x,
      py: ship.position.y + 10,
      pz: ship.position.z,
      age: 0,
      color: '#ffdd00',
      scale: 2.5
    });
    
    c.dmgNumbers.push({
      text: \`+\${skillPointGain}SP +\${attributePointGain}AP\`,
      px: ship.position.x,
      py: ship.position.y + 13,
      pz: ship.position.z,
      age: 0,
      color: '#88ff44',
      scale: 1.5
    });
    
    addComms('PILOT TRAINING', \`Level \${pp.level} achieved! +\${skillPointGain} skill points, +\${attributePointGain} attribute points.\`);
    AudioSFX.play('level_up');
    
    // Check milestones
    checkProgressionMilestones();
    
    // Recalculate for next level
    const newRequiredXP = calculateRequiredXP(pp.level);
  }
  
  // Show XP gain notification for significant amounts
  if (finalXP >= 5) {
    c.dmgNumbers.push({
      text: \`+\${finalXP}XP\`,
      px: ship.position.x + Math.random() * 6 - 3,
      py: ship.position.y + 3,
      pz: ship.position.z,
      age: 0,
      color: '#44ddff',
      scale: 1.0
    });
  }
}

function calculateRequiredXP(level) {
  // Progressive XP curve: 100, 220, 360, 520, 700, 900, etc.
  return 100 * level + 20 * level * (level - 1);
}

function upgradeAttribute(attributeName) {
  const pp = state.playerProgression;
  
  if (pp.attributePoints < 1) {
    addComms('TRAINING CENTER', 'Insufficient attribute points.');
    return false;
  }
  
  const currentValue = pp.attributes[attributeName];
  if (currentValue >= 100) {
    addComms('TRAINING CENTER', \`\${attributeName} already at maximum (100).\`);
    return false;
  }
  
  // Scaling cost: more expensive at higher levels
  const cost = Math.ceil(currentValue / 20) + 1;
  if (pp.attributePoints < cost) {
    addComms('TRAINING CENTER', \`Upgrading \${attributeName} requires \${cost} attribute points.\`);
    return false;
  }
  
  pp.attributePoints -= cost;
  pp.attributes[attributeName]++;
  
  addComms('TRAINING CENTER', \`\${attributeName} increased to \${pp.attributes[attributeName]} (-\${cost} AP).\`);
  AudioSFX.play('purchase');
  
  // Apply attribute effects immediately
  applyAttributeEffects();
  
  // Check for max attribute milestone
  if (pp.attributes[attributeName] >= 100 && !pp.milestones.maxAttribute) {
    pp.milestones.maxAttribute = true;
    unlockAchievement('perfectionist', 'PERFECTIONIST', 'Maxed an attribute (100)');
  }
  
  return true;
}

function upgradeSkill(skillName) {
  const pp = state.playerProgression;
  
  if (pp.skillPoints < 1) {
    addComms('TRAINING CENTER', 'Insufficient skill points.');
    return false;
  }
  
  const currentLevel = pp.skills[skillName];
  if (currentLevel >= 20) {
    addComms('TRAINING CENTER', \`\${skillName} already at maximum (20).\`);
    return false;
  }
  
  // Check prerequisites for advanced skills
  const prerequisites = {
    psionicResonance: { tactics: 50, luck: 40 },
    quantumTunneling: { engineering: 60, piloting: 50 },
    timeDistortion: { endurance: 70, gunnery: 60 },
    neuralInterface: { piloting: 80, engineering: 70 },
    cosmicAwareness: { tactics: 90, luck: 80 }
  };
  
  const req = prerequisites[skillName];
  if (req) {
    for (const [attr, minValue] of Object.entries(req)) {
      if (pp.attributes[attr] < minValue) {
        addComms('TRAINING CENTER', \`\${skillName} requires \${attr} \${minValue}+.\`);
        return false;
      }
    }
  }
  
  pp.skillPoints--;
  pp.skills[skillName]++;
  
  addComms('TRAINING CENTER', \`\${skillName} upgraded to level \${pp.skills[skillName]}.\`);
  AudioSFX.play('purchase');
  
  // Apply skill effects immediately
  applySkillEffects();
  
  return true;
}

function applyAttributeEffects() {
  const pp = state.playerProgression;
  if (!pp) return;
  
  const attrs = pp.attributes;
  
  // Apply attribute bonuses to game state
  state.attributeBonuses = {
    piloting: attrs.piloting,
    gunnery: attrs.gunnery,
    engineering: attrs.engineering,
    tactics: attrs.tactics,
    endurance: attrs.endurance,
    luck: attrs.luck
  };
  
  // Direct effects on ship stats
  const pilotingBonus = 1 + (attrs.piloting - 10) * 0.02; // +2% per point above 10
  const gunneryBonus = 1 + (attrs.gunnery - 10) * 0.015; // +1.5% per point
  const engineeringBonus = 1 + (attrs.engineering - 10) * 0.025; // +2.5% per point
  const enduranceBonus = 1 + (attrs.endurance - 10) * 0.02; // +2% per point
  
  // Apply bonuses (stored for use in other systems)
  state.attributeMultipliers = {
    piloting: pilotingBonus,
    gunnery: gunneryBonus,
    engineering: engineeringBonus,
    endurance: enduranceBonus
  };
}

function applySkillEffects() {
  const pp = state.playerProgression;
  if (!pp) return;
  
  const skills = pp.skills;
  
  // Combat skills
  state.skillBonuses = {
    weaponDamage: 1 + skills.weaponMastery * 0.05,
    critChance: skills.precisionFiring * 0.03,
    reloadSpeed: 1 - skills.rapidReload * 0.10,
    armorPiercing: 1 + skills.armorPiercing * 0.15,
    battleFocus: skills.battleFocus > 0,
    
    // Defense skills
    shieldCapacity: 1 + skills.shieldTech * 0.10,
    hullCapacity: 1 + skills.hullReinforcement * 0.08,
    dodgeChance: skills.evasiveManeuvers * 0.05,
    damageReduction: 1 - skills.damageControl * 0.15,
    emergencyRepair: skills.emergencyRepair > 0,
    
    // Utility skills  
    energyEfficiency: 1 - skills.energyEfficiency * 0.08,
    scannerRange: 1 + skills.scannerUpgrade * 0.20,
    lootRange: 1 + skills.lootMagnetism * 0.15,
    creditBonus: 1 + skills.negotiator * 0.10,
    xpBonus: 1 + skills.survivalInstinct * 0.05
  };
}

function checkProgressionMilestones() {
  const pp = state.playerProgression;
  
  // Level milestones
  if (pp.level >= 10 && !pp.milestones.level10) {
    pp.milestones.level10 = true;
    unlockAchievement('veteran', 'VETERAN PILOT', 'Reached level 10');
    pp.skillPoints += 5; // Bonus skill points
    addComms('MILESTONE', 'Veteran status achieved! +5 bonus skill points.');
  }
  
  if (pp.level >= 25 && !pp.milestones.level25) {
    pp.milestones.level25 = true;
    unlockAchievement('ace', 'ACE PILOT', 'Reached level 25');
    pp.attributePoints += 5; // Bonus attribute points
    addComms('MILESTONE', 'Ace pilot status! +5 bonus attribute points.');
  }
  
  if (pp.level >= 50 && !pp.milestones.level50) {
    pp.milestones.level50 = true;
    unlockAchievement('legend', 'LEGENDARY PILOT', 'Reached level 50');
    // Unlock prestige system
    addComms('PRESTIGE SYSTEM', 'Legendary status unlocked prestige advancement!');
  }
  
  // All skills trained
  const totalSkills = Object.values(pp.skills).reduce((sum, level) => sum + level, 0);
  const maxSkills = Object.keys(pp.skills).length * 20;
  
  if (totalSkills >= maxSkills && !pp.milestones.allSkillsTrained) {
    pp.milestones.allSkillsTrained = true;
    unlockAchievement('master', 'SKILL MASTER', 'Maxed all skills');
    addComms('MASTERY', 'All skills mastered! You have achieved perfection.');
  }
}

function showPlayerProgressionUI() {
  const pp = state.playerProgression;
  if (!pp) return;
  
  // Create or update player progression overlay
  let overlay = document.getElementById('player-progression-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'player-progression-overlay';
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
  
  const nextLevelXP = calculateRequiredXP(pp.level);
  const xpProgress = (pp.experience / nextLevelXP) * 100;
  
  let content = \`
    <h2 style="color: #44aaff; text-align: center; margin-bottom: 20px;">🆙 PILOT PROGRESSION</h2>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
      <div>
        <h3 style="color: #ffaa00;">Character Status</h3>
        <p><strong>Level:</strong> \${pp.level}/100</p>
        <p><strong>Experience:</strong> \${pp.experience}/\${nextLevelXP}</p>
        <div style="background: #333; height: 12px; border-radius: 6px; margin: 10px 0;">
          <div style="background: #44aaff; height: 100%; width: \${xpProgress}%; border-radius: 6px;"></div>
        </div>
        <p><strong>Skill Points:</strong> \${pp.skillPoints}</p>
        <p><strong>Attribute Points:</strong> \${pp.attributePoints}</p>
      </div>
      
      <div>
        <h3 style="color: #ffaa00;">Prestige System</h3>
        <p><strong>Prestige Level:</strong> \${pp.prestige.level}</p>
        <p><strong>Tokens:</strong> \${pp.prestige.tokens}</p>
        <p style="font-size: 0.9rem; color: #cccccc;">Unlock at level 50+</p>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
      <div>
        <h3 style="color: #ff8844;">Attributes</h3>
        <div style="display: grid; gap: 10px; font-size: 0.9rem;">
  \`;
  
  // Attributes section
  for (const [attrName, value] of Object.entries(pp.attributes)) {
    const cost = Math.ceil(value / 20) + 1;
    const maxed = value >= 100;
    
    content += \`
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>\${attrName.toUpperCase()}: \${value}/100</span>
        \${!maxed && pp.attributePoints >= cost ? 
          \`<button onclick="upgradeAttribute('\${attrName}')" style="background: #44aaff; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">+1 (-\${cost}AP)</button>\` 
          : \`<span style="color: #666;">\${maxed ? 'MAX' : 'Need '+cost+' AP'}</span>\`
        }
      </div>
    \`;
  }
  
  content += \`
        </div>
      </div>
      
      <div>
        <h3 style="color: #88ff44;">Skills</h3>
        <div style="display: grid; gap: 8px; font-size: 0.85rem; max-height: 400px; overflow-y: auto;">
  \`;
  
  // Skills section organized by category
  const skillCategories = {
    'Combat': ['weaponMastery', 'precisionFiring', 'rapidReload', 'armorPiercing', 'battleFocus'],
    'Defense': ['shieldTech', 'hullReinforcement', 'evasiveManeuvers', 'damageControl', 'emergencyRepair'],
    'Utility': ['energyEfficiency', 'scannerUpgrade', 'lootMagnetism', 'negotiator', 'survivalInstinct'],
    'Advanced': ['psionicResonance', 'quantumTunneling', 'timeDistortion', 'neuralInterface', 'cosmicAwareness']
  };
  
  for (const [category, skills] of Object.entries(skillCategories)) {
    content += \`<h4 style="color: #ffaa00; margin: 10px 0 5px 0;">\${category}</h4>\`;
    
    for (const skillName of skills) {
      const level = pp.skills[skillName];
      const maxed = level >= 20;
      
      content += \`
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>\${skillName.replace(/([A-Z])/g, ' $1').toLowerCase()}: \${level}/20</span>
          \${!maxed && pp.skillPoints >= 1 ? 
            \`<button onclick="upgradeSkill('\${skillName}')" style="background: #88ff44; color: #000; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">+1 (-1SP)</button>\` 
            : \`<span style="color: #666;">\${maxed ? 'MAX' : 'Need 1SP'}</span>\`
          }
        </div>
      \`;
    }
  }
  
  content += \`
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <button onclick="document.getElementById('player-progression-overlay').style.display='none'"
              style="background: #ff4444; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 1rem;">
        CLOSE
      </button>
    </div>
  \`;
  
  overlay.innerHTML = content;
  overlay.style.display = 'block';
}

// Make functions globally accessible
window.upgradeAttribute = upgradeAttribute;
window.upgradeSkill = upgradeSkill;
window.showPlayerProgressionUI = showPlayerProgressionUI;

`);
  
  html = html.slice(0, functionInsertionPoint) + playerProgressionFunctions + cr('\n\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added player progression functions');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Player Progression System implemented successfully!');
  console.log('');
  console.log('🆙 PLAYER PROGRESSION FEATURES DEPLOYED:');
  console.log('   • 6 core attributes (piloting, gunnery, engineering, tactics, endurance, luck)');
  console.log('   • 20 skill trees across 4 categories (combat, defense, utility, advanced)');
  console.log('   • Progressive leveling system (1-100) with XP curve');
  console.log('   • Skill points and attribute points from leveling');
  console.log('   • Milestone achievements and rewards');
  console.log('   • Prestige system for high-level players');
  console.log('   • Real-time stat bonuses from attributes and skills');
  console.log('   • Comprehensive progression UI');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing player progression system:', error.message);
  process.exit(1);
}