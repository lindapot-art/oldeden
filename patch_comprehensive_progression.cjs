// COMPREHENSIVE PROGRESSION SYSTEMS - Add both weapon and player progression

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

console.log('🎯 Implementing Comprehensive Progression Systems...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // ═════════════════════════════════════════════════════════════
  // 1. ADD PROGRESSION STATE AFTER LOOT ANNOUNCEMENT
  // ═════════════════════════════════════════════════════════════
  
  const lootPattern = `    lootAnnouncement: { text: '', timer: 0, alpha: 0, rarity: 'common' }
  },`;
  
  const progressionState = cr(`    lootAnnouncement: { text: '', timer: 0, alpha: 0, rarity: 'common' }
  },
  
  // ═══ COMPREHENSIVE PROGRESSION SYSTEMS ═══
  
  // ── Weapon Progression System ──
  weaponProgression: {
    unlockedWeapons: ['railgun'],
    upgradePoints: 0,
    currentWeapon: 'railgun',
    weaponExperience: {
      railgun: { xp: 0, level: 1 },
      laser: { xp: 0, level: 0 },
      missile: { xp: 0, level: 0 },
      plasma: { xp: 0, level: 0 }
    }
  },
  
  // ── Player Progression System ──  
  playerProgression: {
    level: 1,
    experience: 0,
    skillPoints: 5,      // Start with some points
    attributePoints: 3,
    
    attributes: {
      piloting: 10,
      gunnery: 10, 
      engineering: 10,
      tactics: 10,
      endurance: 10,
      luck: 10
    },
    
    skills: {
      weaponMastery: 0,
      precisionFiring: 0,
      shieldTech: 0,
      hullReinforcement: 0,
      energyEfficiency: 0,
      lootMagnetism: 0
    }
  },`);
  
  html = safeReplace(html, lootPattern, progressionState, 'progression systems state');
  console.log('✅ Added weapon and player progression state');

  // ═════════════════════════════════════════════════════════════
  // 2. ADD XP GAIN TO ENEMY KILLS (BOTH WEAPON AND PLAYER XP)
  // ═════════════════════════════════════════════════════════════
  
  const killPattern = `            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);
            
            // ═══ WEAPON PROGRESSION XP GAIN ═══
            if (typeof gainWeaponExperience === 'function' && state.weaponProgression) {
              const currentWeapon = state.weaponProgression.currentWeapon || 'railgun';
              const baseXP = Math.max(1, Math.floor(e.maxHp / 3));
              const eliteBonus = e._isElite ? 5 : 0;
              const bossBonus = e.isBoss ? 15 : 0;
              const totalXP = baseXP + eliteBonus + bossBonus;
              gainWeaponExperience(currentWeapon, totalXP);
            }`;
            
  const combinedXPGain = cr(`            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);
            
            // ═══ COMPREHENSIVE XP GAIN ═══
            const baseXP = Math.max(1, Math.floor(e.maxHp / 3));
            const eliteBonus = e._isElite ? 5 : 0;
            const bossBonus = e.isBoss ? 15 : 0;
            const totalXP = baseXP + eliteBonus + bossBonus;
            
            // Player XP gain
            if (typeof gainPlayerExperience === 'function' && state.playerProgression) {
              gainPlayerExperience(totalXP, 'combat');
            }
            
            // Weapon XP gain
            if (typeof gainWeaponExperience === 'function' && state.weaponProgression) {
              const currentWeapon = state.weaponProgression.currentWeapon || 'railgun';
              gainWeaponExperience(currentWeapon, totalXP);
            }`);
  
  if (html.includes('WEAPON PROGRESSION XP GAIN')) {
    html = html.replace(killPattern, combinedXPGain);
    console.log('✅ Enhanced XP gain with player progression');
  } else {
    // If weapon XP wasn't added yet, add combined XP system
    const simpleKillPattern = `            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);`;
    const simpleXPGain = cr(`            addCombatLog('Destroyed ' + (e.type || 'hostile') + (e.isBoss ? ' (BOSS)' : '') + ' +' + pts + 'pts', _kfColor);
            
            // ═══ COMPREHENSIVE XP GAIN ═══
            const baseXP = Math.max(1, Math.floor(e.maxHp / 3));
            const eliteBonus = e._isElite ? 5 : 0;
            const bossBonus = e.isBoss ? 15 : 0;
            const totalXP = baseXP + eliteBonus + bossBonus;
            
            // Player XP gain
            if (typeof gainPlayerExperience === 'function' && state.playerProgression) {
              gainPlayerExperience(totalXP, 'combat');
            }
            
            // Weapon XP gain
            if (typeof gainWeaponExperience === 'function' && state.weaponProgression) {
              const currentWeapon = state.weaponProgression.currentWeapon || 'railgun';
              gainWeaponExperience(currentWeapon, totalXP);
            }`);
    
    html = safeReplace(html, simpleKillPattern, simpleXPGain, 'XP gain integration');
    console.log('✅ Added comprehensive XP gain system');
  }

  // ═════════════════════════════════════════════════════════════
  // 3. ADD PROGRESSION FUNCTIONS
  // ═════════════════════════════════════════════════════════════
  
  // Find insertion point before game loop
  const insertionPoint = html.indexOf('function gameLoop() {');
  
  const progressionFunctions = cr(`
// ═══ COMPREHENSIVE PROGRESSION FUNCTIONS ═══

function gainPlayerExperience(amount, source = 'combat') {
  const pp = state.playerProgression;
  if (!pp) return;
  
  const oldLevel = pp.level;
  pp.experience += amount;
  
  // Simple level calculation: 100 XP per level, increasing by 50 each level
  const requiredXP = 100 + (pp.level - 1) * 50;
  
  if (pp.experience >= requiredXP) {
    pp.experience -= requiredXP;
    pp.level++;
    pp.skillPoints += 2;
    pp.attributePoints += 1;
    
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
    
    addComms('PILOT TRAINING', \`Level \${pp.level} achieved! +2 skill points, +1 attribute point.\`);
    AudioSFX.play('quest_complete');
  }
  
  // Show XP gain for significant amounts
  if (amount >= 3) {
    c.dmgNumbers.push({
      text: \`+\${amount}XP\`,
      px: ship.position.x + Math.random() * 4 - 2,
      py: ship.position.y + 2,
      pz: ship.position.z,
      age: 0,
      color: '#44ddff',
      scale: 0.9
    });
  }
}

function gainWeaponExperience(weaponType, amount) {
  const wp = state.weaponProgression;
  if (!wp || !wp.weaponExperience[weaponType]) return;
  
  const oldLevel = wp.weaponExperience[weaponType].level;
  wp.weaponExperience[weaponType].xp += amount;
  
  // Simple weapon leveling: 50 XP per level
  const requiredXP = wp.weaponExperience[weaponType].level * 50;
  
  if (wp.weaponExperience[weaponType].xp >= requiredXP) {
    wp.weaponExperience[weaponType].xp -= requiredXP;
    wp.weaponExperience[weaponType].level++;
    wp.upgradePoints++;
    
    c.dmgNumbers.push({
      text: \`⚔️ \${weaponType.toUpperCase()} LV.\${wp.weaponExperience[weaponType].level}!\`,
      px: ship.position.x,
      py: ship.position.y + 6,
      pz: ship.position.z,
      age: 0,
      color: '#ffaa00',
      scale: 1.2
    });
    
    addComms('WEAPON TRAINING', \`\${weaponType} reached level \${wp.weaponExperience[weaponType].level}! +1 upgrade point.\`);
    
    // Unlock new weapons at certain levels
    if (weaponType === 'railgun' && wp.weaponExperience[weaponType].level >= 3 && !wp.unlockedWeapons.includes('laser')) {
      wp.unlockedWeapons.push('laser');
      wp.weaponExperience.laser.level = 1;
      addComms('RESEARCH', 'LASER WEAPON UNLOCKED! Press 2 to equip.');
    }
  }
}

function upgradeAttribute(attributeName) {
  const pp = state.playerProgression;
  
  if (!pp || pp.attributePoints < 1) {
    addComms('TRAINING', 'Insufficient attribute points.');
    return false;
  }
  
  if (pp.attributes[attributeName] >= 100) {
    addComms('TRAINING', \`\${attributeName} already at maximum.\`);
    return false;
  }
  
  pp.attributePoints--;
  pp.attributes[attributeName]++;
  
  addComms('TRAINING', \`\${attributeName} increased to \${pp.attributes[attributeName]}.\`);
  AudioSFX.play('purchase');
  return true;
}

function upgradeSkill(skillName) {
  const pp = state.playerProgression;
  
  if (!pp || pp.skillPoints < 1) {
    addComms('TRAINING', 'Insufficient skill points.');
    return false;
  }
  
  if (pp.skills[skillName] >= 20) {
    addComms('TRAINING', \`\${skillName} already at maximum.\`);
    return false;
  }
  
  pp.skillPoints--;
  pp.skills[skillName]++;
  
  addComms('TRAINING', \`\${skillName} upgraded to level \${pp.skills[skillName]}.\`);
  AudioSFX.play('purchase');
  return true;
}

function switchWeapon(weaponType) {
  const wp = state.weaponProgression;
  
  if (!wp || !wp.unlockedWeapons.includes(weaponType)) {
    addComms('WEAPON SYSTEM', \`\${weaponType} not unlocked.\`);
    return false;
  }
  
  wp.currentWeapon = weaponType;
  
  c.dmgNumbers.push({
    text: \`🔫 \${weaponType.toUpperCase()}\`,
    px: ship.position.x,
    py: ship.position.y + 4,
    pz: ship.position.z,
    age: 0,
    color: '#44aaff',
    scale: 1.0
  });
  
  addComms('WEAPON', \`Switched to \${weaponType}.\`);
  return true;
}

function showProgressionUI() {
  const pp = state.playerProgression;
  const wp = state.weaponProgression;
  if (!pp || !wp) return;
  
  let overlay = document.getElementById('progression-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'progression-overlay';
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
  
  const playerXPRequired = 100 + (pp.level - 1) * 50;
  const playerXPProgress = (pp.experience / playerXPRequired) * 100;
  
  let content = \`
    <h2 style="color: #44aaff; text-align: center; margin-bottom: 20px;">📊 PROGRESSION</h2>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
      <div>
        <h3 style="color: #ffdd00;">Player Progress</h3>
        <p><strong>Level:</strong> \${pp.level}</p>
        <p><strong>Experience:</strong> \${pp.experience}/\${playerXPRequired}</p>
        <div style="background: #333; height: 8px; border-radius: 4px; margin: 10px 0;">
          <div style="background: #ffdd00; height: 100%; width: \${playerXPProgress}%; border-radius: 4px;"></div>
        </div>
        <p><strong>Skill Points:</strong> \${pp.skillPoints}</p>
        <p><strong>Attribute Points:</strong> \${pp.attributePoints}</p>
        
        <h4 style="color: #ff8844; margin-top: 20px;">Attributes</h4>
        <div style="font-size: 0.9rem;">
  \`;
  
  for (const [attr, value] of Object.entries(pp.attributes)) {
    content += \`
      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>\${attr}: \${value}</span>
        \${pp.attributePoints > 0 && value < 100 ?
          \`<button onclick="upgradeAttribute('\${attr}')" style="background: #44aaff; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">+1</button>\`
          : ''
        }
      </div>
    \`;
  }
  
  content += \`
        </div>
        
        <h4 style="color: #88ff44; margin-top: 20px;">Skills</h4>
        <div style="font-size: 0.9rem;">
  \`;
  
  for (const [skill, level] of Object.entries(pp.skills)) {
    content += \`
      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
        <span>\${skill}: \${level}/20</span>
        \${pp.skillPoints > 0 && level < 20 ?
          \`<button onclick="upgradeSkill('\${skill}')" style="background: #88ff44; color: #000; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">+1</button>\`
          : ''
        }
      </div>
    \`;
  }
  
  content += \`
        </div>
      </div>
      
      <div>
        <h3 style="color: #ffaa00;">Weapons</h3>
        <p><strong>Current:</strong> \${wp.currentWeapon}</p>
        <p><strong>Upgrade Points:</strong> \${wp.upgradePoints}</p>
        
        <div style="margin-top: 20px;">
  \`;
  
  for (const weaponType of ['railgun', 'laser', 'missile', 'plasma']) {
    const isUnlocked = wp.unlockedWeapons.includes(weaponType);
    const weaponData = wp.weaponExperience[weaponType];
    
    if (isUnlocked) {
      content += \`
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid \${wp.currentWeapon === weaponType ? '#ffaa00' : '#666'}; border-radius: 6px;">
          <h4 style="color: #44aaff; margin-bottom: 5px;">\${weaponType.toUpperCase()}</h4>
          <p>Level: \${weaponData.level}</p>
          <p>XP: \${weaponData.xp}/\${weaponData.level * 50}</p>
          \${wp.currentWeapon !== weaponType ?
            \`<button onclick="switchWeapon('\${weaponType}')" style="background: #44aaff; color: white; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">EQUIP</button>\`
            : '<span style="color: #ffaa00;">EQUIPPED</span>'
          }
        </div>
      \`;
    } else {
      content += \`
        <div style="margin-bottom: 10px; padding: 8px; border: 1px solid #333; border-radius: 6px; color: #666;">
          <h4>\${weaponType.toUpperCase()} (LOCKED)</h4>
          <p style="font-size: 0.8rem;">Unlock requirements not met</p>
        </div>
      \`;
    }
  }
  
  content += \`
        </div>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <button onclick="document.getElementById('progression-overlay').style.display='none'"
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
window.switchWeapon = switchWeapon;
window.showProgressionUI = showProgressionUI;

`);
  
  html = html.slice(0, insertionPoint) + progressionFunctions + cr('\n') + html.slice(insertionPoint);
  console.log('✅ Added comprehensive progression functions');

  // ═════════════════════════════════════════════════════════════
  // 4. ADD PROGRESSION KEYBINDINGS
  // ═════════════════════════════════════════════════════════════
  
  const keybindPattern = `  else if (key === 'f7') { activateLootBoost('universal', 5.0, 30000); }
  // Consumables`;
  
  const progressionKeybinds = cr(`  else if (key === 'f7') { activateLootBoost('universal', 5.0, 30000); }
  // ═══ PROGRESSION SYSTEM KEYBINDINGS ═══
  else if (key === '1') { if (typeof switchWeapon === 'function') switchWeapon('railgun'); }
  else if (key === '2') { if (typeof switchWeapon === 'function') switchWeapon('laser'); }
  else if (key === '3') { if (typeof switchWeapon === 'function') switchWeapon('missile'); }
  else if (key === '4') { if (typeof switchWeapon === 'function') switchWeapon('plasma'); }
  else if (key === 'p' || key === 'P') { if (typeof showProgressionUI === 'function') showProgressionUI(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, progressionKeybinds, 'progression keybindings');
  console.log('✅ Added progression keybindings (1-4 for weapons, P for progression UI)');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Comprehensive Progression Systems implemented successfully!');
  console.log('');
  console.log('🎯 COMPREHENSIVE PROGRESSION FEATURES DEPLOYED:');
  console.log('   • Player progression: levels, XP, skill points, attribute points');
  console.log('   • 6 core attributes: piloting, gunnery, engineering, tactics, endurance, luck');
  console.log('   • 6 core skills: weapon mastery, precision firing, shield tech, etc.');
  console.log('   • Weapon progression: 4 weapons with individual leveling and XP');
  console.log('   • Weapon switching system with hotkeys (1-4)');
  console.log('   • Unified progression UI accessible with P key');
  console.log('   • XP gain from all enemy kills (base + elite + boss bonuses)');
  console.log('   • Visual feedback for level ups and weapon upgrades');
  console.log('   • Automatic weapon unlocking through progression');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing progression systems:', error.message);
  process.exit(1);
}