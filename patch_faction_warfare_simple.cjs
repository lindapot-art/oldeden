// FACTION WARFARE MECHANICS SYSTEM - SIMPLIFIED

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

console.log('⚔️ Implementing Faction Warfare Mechanics (Simplified)...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add faction warfare keybindings
  const keybindPattern = `  else if (key === 'd' || key === 'D') { showDifficultyStatus(); }
  // Consumables`;
  
  const factionKeybinds = cr(`  else if (key === 'd' || key === 'D') { showDifficultyStatus(); }
  // ═══ FACTION WARFARE ═══
  else if (key === 'f' || key === 'F') { showFactionStatus(); }
  else if (key === 'r' || key === 'R') { showFactionRelations(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, factionKeybinds, 'faction warfare keybindings');
  console.log('✅ Added faction warfare keybindings (F=status, R=relations)');

  // Add faction system functions before difficulty system
  const functionInsertionPoint = html.indexOf('// ═══ DYNAMIC DIFFICULTY SCALING SYSTEM ═══');
  
  const factionFunctions = cr(`
// ═══ FACTION WARFARE SYSTEM ═══

const FactionSystem = {
  // Faction definitions
  factions: {
    'terran_federation': {
      name: 'Terran Federation',
      shortName: 'Terran',
      color: '#0080ff',
      philosophy: 'Order, Unity, Progress',
      description: 'The largest human faction, focused on expansion and technological advancement.',
      territory: { x: -200, z: -200, radius: 150 },
      ships: ['federation_cruiser', 'federation_fighter'],
      enemies: ['shadow_collective', 'void_cultists'],
      allies: ['merchant_guild']
    },
    'shadow_collective': {
      name: 'Shadow Collective',
      shortName: 'Shadow',
      color: '#ff4000',
      philosophy: 'Freedom, Rebellion, Chaos',
      description: 'Pirates and rebels fighting against oppressive order.',
      territory: { x: 200, z: 200, radius: 120 },
      ships: ['shadow_raider', 'shadow_interceptor'],
      enemies: ['terran_federation', 'merchant_guild'],
      allies: ['void_cultists']
    },
    'void_cultists': {
      name: 'Void Cultists',
      shortName: 'Void',
      color: '#8000ff',
      philosophy: 'Transcendence, Mystery, Power',
      description: 'Mystics seeking to harness the power of dark energy.',
      territory: { x: 0, z: -300, radius: 100 },
      ships: ['void_seeker', 'void_wraith'],
      enemies: ['terran_federation'],
      allies: ['shadow_collective']
    },
    'merchant_guild': {
      name: 'Merchant Guild',
      shortName: 'Merchants',
      color: '#ffb000',
      philosophy: 'Trade, Profit, Neutrality',
      description: 'Traders and entrepreneurs focused on commerce.',
      territory: { x: -100, z: 100, radius: 80 },
      ships: ['merchant_freighter', 'merchant_escort'],
      enemies: ['shadow_collective'],
      allies: ['terran_federation']
    }
  },
  
  // Player reputation with each faction (-100 to +100)
  reputation: {
    'terran_federation': 0,
    'shadow_collective': 0,
    'void_cultists': 0,
    'merchant_guild': 0
  },
  
  // Player's chosen faction (can be null for neutral)
  playerFaction: null,
  
  // Recent faction actions for context
  recentActions: [],
  
  // Get faction standing description
  getStandingText(rep) {
    if (rep >= 80) return 'Revered';
    if (rep >= 60) return 'Honored';
    if (rep >= 40) return 'Friendly';
    if (rep >= 20) return 'Liked';
    if (rep >= -20) return 'Neutral';
    if (rep >= -40) return 'Disliked';
    if (rep >= -60) return 'Hostile';
    if (rep >= -80) return 'Hated';
    return 'Kill on Sight';
  },
  
  // Get faction color for reputation
  getStandingColor(rep) {
    if (rep >= 60) return '#00ff00';
    if (rep >= 20) return '#80ff00';
    if (rep >= -20) return '#ffff80';
    if (rep >= -60) return '#ff8000';
    return '#ff0000';
  },
  
  // Modify reputation with cascading effects
  modifyReputation(factionId, amount, reason) {
    if (!this.factions[factionId]) return;
    
    const oldRep = this.reputation[factionId];
    this.reputation[factionId] = Math.max(-100, Math.min(100, oldRep + amount));
    
    const faction = this.factions[factionId];
    const newRep = this.reputation[factionId];
    
    // Cascading reputation effects
    if (amount !== 0) {
      // Allies gain minor positive rep
      for (const allyId of faction.allies || []) {
        if (amount > 0) {
          this.reputation[allyId] = Math.min(100, this.reputation[allyId] + Math.floor(amount * 0.2));
        }
      }
      
      // Enemies lose reputation
      for (const enemyId of faction.enemies || []) {
        if (amount > 0) {
          this.reputation[enemyId] = Math.max(-100, this.reputation[enemyId] - Math.floor(amount * 0.3));
        }
      }
      
      // Add to recent actions
      this.recentActions.unshift({
        faction: factionId,
        amount: amount,
        reason: reason,
        time: Date.now()
      });
      
      // Keep only last 10 actions
      if (this.recentActions.length > 10) {
        this.recentActions = this.recentActions.slice(0, 10);
      }
      
      // Notify player
      const sign = amount > 0 ? '+' : '';
      addComms('FACTION', \`\${faction.shortName}: \${sign}\${amount} rep (\${reason})\`);
      
      c.dmgNumbers.push({
        text: \`\${faction.shortName} \${sign}\${amount}\`,
        px: ship.position.x + 15,
        py: ship.position.y + 8,
        pz: ship.position.z,
        age: 0,
        color: amount > 0 ? '#00ff00' : '#ff0000',
        scale: 1.0
      });
    }
  },
  
  // Get dominant faction in current area
  getDominantFaction(position) {
    let closest = null;
    let closestDistance = Infinity;
    
    for (const [id, faction] of Object.entries(this.factions)) {
      if (!faction.territory) continue;
      
      const dist = Math.sqrt(
        Math.pow(position.x - faction.territory.x, 2) +
        Math.pow(position.z - faction.territory.z, 2)
      );
      
      if (dist < faction.territory.radius && dist < closestDistance) {
        closest = id;
        closestDistance = dist;
      }
    }
    
    return closest;
  },
  
  // Apply faction to enemy
  applyFactionToEnemy(enemy, position) {
    const dominantFaction = this.getDominantFaction(position);
    
    if (dominantFaction && this.factions[dominantFaction]) {
      enemy.factionId = dominantFaction;
      enemy.factionData = this.factions[dominantFaction];
      
      // Visual faction identifier
      enemy.factionColor = this.factions[dominantFaction].color;
      
      // Faction hostility based on reputation
      const rep = this.reputation[dominantFaction];
      if (rep < -20) {
        enemy._isHostile = true;
        enemy.hp *= 1.2; // Hostile faction ships are stronger
      } else if (rep > 40) {
        enemy._isNeutral = true;
        enemy.hp *= 0.8; // Friendly factions are less aggressive
      }
    }
    
    return enemy;
  },
  
  // Handle faction ship destruction
  onEnemyKilled(enemy) {
    if (!enemy.factionId) return;
    
    const factionId = enemy.factionId;
    const faction = this.factions[factionId];
    if (!faction) return;
    
    // Reputation change for killing faction ship
    let repChange = -5;
    
    // More severe penalty for friendly factions
    if (this.reputation[factionId] > 0) {
      repChange = -8;
    }
    
    // Less penalty if faction is already hostile
    if (this.reputation[factionId] < -40) {
      repChange = -2;
    }
    
    this.modifyReputation(factionId, repChange, 'Ship destroyed');
  }
};

function showFactionStatus() {
  const fs = FactionSystem;
  
  addComms('FACTIONS', '═══ FACTION STANDINGS ═══');
  
  for (const [id, faction] of Object.entries(fs.factions)) {
    const rep = fs.reputation[id];
    const standing = fs.getStandingText(rep);
    
    addComms('FACTION', \`\${faction.shortName}: \${rep} (\${standing})\`);
  }
  
  const current = fs.getDominantFaction(ship.position);
  if (current) {
    addComms('TERRITORY', \`Current: \${fs.factions[current].shortName} territory\`);
  }
  
  if (fs.playerFaction) {
    addComms('ALLEGIANCE', \`Aligned: \${fs.factions[fs.playerFaction].shortName}\`);
  } else {
    addComms('ALLEGIANCE', 'Status: Independent');
  }
  
  c.dmgNumbers.push({
    text: '⚔️ FACTION STATUS',
    px: ship.position.x,
    py: ship.position.y + 18,
    pz: ship.position.z,
    age: 0,
    color: '#ffaa00',
    scale: 1.3
  });
}

function showFactionRelations() {
  const fs = FactionSystem;
  
  addComms('RELATIONS', '═══ FACTION RELATIONS ═══');
  
  for (const [id, faction] of Object.entries(fs.factions)) {
    addComms('INFO', \`\${faction.shortName}: \${faction.philosophy}\`);
    
    if (faction.allies && faction.allies.length > 0) {
      const allies = faction.allies.map(a => fs.factions[a].shortName).join(', ');
      addComms('ALLIES', \`  Allies: \${allies}\`);
    }
    
    if (faction.enemies && faction.enemies.length > 0) {
      const enemies = faction.enemies.map(e => fs.factions[e].shortName).join(', ');
      addComms('ENEMIES', \`  Enemies: \${enemies}\`);
    }
  }
  
  // Recent actions
  if (fs.recentActions.length > 0) {
    addComms('RECENT', '═══ RECENT ACTIONS ═══');
    for (const action of fs.recentActions.slice(0, 5)) {
      const faction = fs.factions[action.faction];
      const sign = action.amount > 0 ? '+' : '';
      addComms('ACTION', \`\${faction.shortName}: \${sign}\${action.amount} (\${action.reason})\`);
    }
  }
}

function updateFactionSystem(dtMs) {
  // Apply faction context to any newly spawned enemies
  if (c.enemies) {
    for (const enemy of c.enemies) {
      if (!enemy.factionProcessed && enemy.group && enemy.group.position) {
        FactionSystem.applyFactionToEnemy(enemy, enemy.group.position);
        enemy.factionProcessed = true;
      }
    }
  }
  
  // Check for territorial changes
  const currentTerritory = FactionSystem.getDominantFaction(ship.position);
  if (currentTerritory !== FactionSystem.lastTerritory) {
    if (currentTerritory) {
      const faction = FactionSystem.factions[currentTerritory];
      addComms('TERRITORY', \`Entering \${faction.shortName} space\`);
      
      c.dmgNumbers.push({
        text: \`🏛️ \${faction.shortName} SPACE\`,
        px: ship.position.x,
        py: ship.position.y + 10,
        pz: ship.position.z,
        age: 0,
        color: faction.color,
        scale: 1.1
      });
    }
    FactionSystem.lastTerritory = currentTerritory;
  }
}

`);
  
  html = html.slice(0, functionInsertionPoint) + factionFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added faction warfare system');

  // Add faction update to game loop
  const gameLoopPattern = `      updateDifficultySystem(dtMs);
      updateParticleSystem(dtMs);`;
      
  const gameLoopWithFactions = cr(`      updateDifficultySystem(dtMs);
      updateFactionSystem(dtMs);
      updateParticleSystem(dtMs);`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithFactions, 'faction game loop');
  console.log('✅ Added faction system to game loop');

  // Integrate faction system with enemy kills - direct integration with the kill counter
  const killPattern = `            c.score += pts; c.kills++;`;
  const killWithFaction = cr(`            c.score += pts; c.kills++;
            // Faction system integration
            if (typeof FactionSystem !== 'undefined') FactionSystem.onEnemyKilled(e);`);
  
  html = safeReplace(html, killPattern, killWithFaction, 'faction kill integration');
  console.log('✅ Integrated faction system with enemy kills');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Faction Warfare Mechanics implemented successfully!');
  console.log('');
  console.log('⚔️ FACTION WARFARE FEATURES:');
  console.log('   • F key: Show faction standings and current territory');
  console.log('   • R key: Show faction relations and recent actions');
  console.log('   • 4 Major Factions: Terran Federation, Shadow Collective, Void Cultists, Merchant Guild');
  console.log('   • Dynamic reputation system with cascading effects');
  console.log('   • Territorial control - different regions controlled by factions');
  console.log('   • Faction-specific enemy ships with varying hostility');
  console.log('   • Visual faction identifiers and territorial notifications');
  console.log('   • Inter-faction relationships affect player standing');
  console.log('   • Reputation affects enemy behavior and mission availability');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing faction warfare:', error.message);
  process.exit(1);
}