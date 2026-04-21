// ALLIANCE & GUILD SYSTEM

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

console.log('🏛️ Implementing Alliance & Guild System...');

try {
  let html = fs.readFileSync('public/index.html', 'utf8');
  console.log('✅ Loaded index.html');

  // Add alliance/guild keybindings
  const keybindPattern = `  else if (key === 'l' || key === 'L') { deployMiningLaser(); }
  // Consumables`;
  
  const guildKeybinds = cr(`  else if (key === 'l' || key === 'L') { deployMiningLaser(); }
  // ═══ ALLIANCE & GUILD ═══
  else if (key === 'n' || key === 'N') { showGuildInterface(); }
  else if (key === 'y' || key === 'Y') { showAllianceInterface(); }
  // Consumables`);
  
  html = safeReplace(html, keybindPattern, guildKeybinds, 'alliance guild keybindings');
  console.log('✅ Added alliance/guild keybindings (N=guild, Y=alliance)');

  // Add alliance system functions before mining system
  const functionInsertionPoint = html.indexOf('// ═══ RESOURCE MINING SYSTEM ═══');
  
  const allianceFunctions = cr(`
// ═══ ALLIANCE & GUILD SYSTEM ═══

const AllianceSystem = {
  // Guild definitions and registry
  guilds: {
    'stellar_knights': {
      name: 'Stellar Knights',
      tag: '[STAR]',
      leader: 'CommanderNovaLEFT',
      members: 45,
      level: 12,
      faction: 'terran_federation',
      founded: '2025-11-15',
      description: 'Elite military organization focused on territorial defense',
      specialization: 'combat',
      treasury: 15000,
      reputation: 850,
      activeWars: ['shadow_raiders'],
      allies: ['void_seekers']
    },
    'shadow_raiders': {
      name: 'Shadow Raiders',
      tag: '[RAID]',
      leader: 'CaptainVoidHawk',
      members: 38,
      level: 10,
      faction: 'shadow_collective',
      founded: '2025-12-03',
      description: 'Ruthless pirate confederation seeking profit and chaos',
      specialization: 'raiding',
      treasury: 8500,
      reputation: 620,
      activeWars: ['stellar_knights'],
      allies: ['dark_traders']
    },
    'void_seekers': {
      name: 'Void Seekers',
      tag: '[VOID]',
      leader: 'MysticEthereum',
      members: 29,
      level: 8,
      faction: 'void_cultists',
      founded: '2026-01-20',
      description: 'Mystical researchers exploring dark energy phenomena',
      specialization: 'research',
      treasury: 12000,
      reputation: 720,
      activeWars: [],
      allies: ['stellar_knights', 'tech_syndicate']
    },
    'tech_syndicate': {
      name: 'Tech Syndicate',
      tag: '[TECH]',
      leader: 'AdminCypher',
      members: 52,
      level: 15,
      faction: 'merchant_guild',
      founded: '2025-10-08',
      description: 'Advanced technology developers and equipment manufacturers',
      specialization: 'industry',
      treasury: 22000,
      reputation: 950,
      activeWars: [],
      allies: ['void_seekers', 'trade_coalition']
    },
    'dark_traders': {
      name: 'Dark Traders',
      tag: '[DARK]',
      leader: 'BaronSlick',
      members: 34,
      level: 9,
      faction: 'shadow_collective',
      founded: '2026-02-12',
      description: 'Underground trading network dealing in rare and forbidden goods',
      specialization: 'trading',
      treasury: 18000,
      reputation: 680,
      activeWars: [],
      allies: ['shadow_raiders']
    },
    'trade_coalition': {
      name: 'Trade Coalition',
      tag: '[TRAD]',
      leader: 'MerchantKingUE',
      members: 67,
      level: 18,
      faction: 'merchant_guild',
      founded: '2025-09-25',
      description: 'Massive commercial alliance controlling major trade routes',
      specialization: 'commerce',
      treasury: 35000,
      reputation: 1200,
      activeWars: [],
      allies: ['tech_syndicate']
    }
  },
  
  // Player guild status
  playerGuild: {
    id: null,
    rank: 'member',         // member, officer, leader
    joinDate: null,
    contributions: 0,
    reputation: 0
  },
  
  // Alliance networks
  alliances: {
    'order_pact': {
      name: 'Order Pact',
      guilds: ['stellar_knights', 'void_seekers', 'tech_syndicate'],
      leader_guild: 'stellar_knights',
      formed: '2026-01-30',
      purpose: 'Maintain stability and technological advancement',
      shared_treasury: 5000,
      active_campaigns: ['operation_cleansweep']
    },
    'shadow_confederation': {
      name: 'Shadow Confederation',
      guilds: ['shadow_raiders', 'dark_traders'],
      leader_guild: 'shadow_raiders',
      formed: '2026-02-15',
      purpose: 'Liberate oppressed systems through coordinated raids',
      shared_treasury: 3000,
      active_campaigns: ['rebellion_dawn']
    },
    'trade_empire': {
      name: 'Trade Empire',
      guilds: ['trade_coalition', 'tech_syndicate'],
      leader_guild: 'trade_coalition',
      formed: '2025-11-01',
      purpose: 'Dominate galactic commerce and trade routes',
      shared_treasury: 8000,
      active_campaigns: ['market_expansion']
    }
  },
  
  // Guild activities and missions
  activities: {
    'guild_raids': {
      name: 'Guild Raids',
      description: 'Coordinated attacks on enemy targets',
      rewards: { reputation: 25, treasury: 500 },
      requirements: { members: 3, level: 5 }
    },
    'resource_drives': {
      name: 'Resource Drives',
      description: 'Collective mining and trading operations',
      rewards: { reputation: 15, treasury: 300 },
      requirements: { members: 2, level: 3 }
    },
    'territory_defense': {
      name: 'Territory Defense',
      description: 'Protect guild-controlled sectors',
      rewards: { reputation: 20, treasury: 400 },
      requirements: { members: 4, level: 6 }
    },
    'research_projects': {
      name: 'Research Projects',
      description: 'Collaborative technology development',
      rewards: { reputation: 30, treasury: 200, tech_bonus: true },
      requirements: { members: 5, level: 8 }
    },
    'diplomatic_missions': {
      name: 'Diplomatic Missions',
      description: 'Negotiate alliances and trade agreements',
      rewards: { reputation: 35, faction_bonus: true },
      requirements: { members: 2, level: 10 }
    }
  },
  
  // Player guild benefits based on rank and guild level
  getBenefits() {
    if (!this.playerGuild.id) return null;
    
    const guild = this.guilds[this.playerGuild.id];
    if (!guild) return null;
    
    const benefits = {
      // Base benefits
      shared_hangar: true,
      guild_chat: true,
      member_list: true,
      
      // Level-based benefits
      experience_bonus: Math.floor(guild.level / 3) * 5, // 5% per 3 guild levels
      trading_discount: Math.floor(guild.level / 5) * 2, // 2% per 5 guild levels
      
      // Rank-based benefits
      can_invite: this.playerGuild.rank !== 'member',
      can_kick: this.playerGuild.rank === 'leader',
      can_declare_war: this.playerGuild.rank === 'leader',
      treasury_access: this.playerGuild.rank !== 'member',
      
      // Specialization benefits
      specialization_bonus: this.getSpecializationBonus(guild.specialization)
    };
    
    return benefits;
  },
  
  // Get specialization-specific bonuses
  getSpecializationBonus(specialization) {
    switch (specialization) {
      case 'combat':
        return { damage: 10, armor: 15 };
      case 'trading':
        return { trade_prices: 8, cargo: 20 };
      case 'mining':
        return { mining_speed: 15, refinery: 10 };
      case 'research':
        return { experience: 12, tech_unlock: true };
      case 'industry':
        return { upgrade_discount: 15, production: 20 };
      default:
        return { balanced: 5 };
    }
  },
  
  // Join a guild
  joinGuild(guildId) {
    const guild = this.guilds[guildId];
    if (!guild) return { success: false, reason: 'Guild not found' };
    
    if (this.playerGuild.id) return { success: false, reason: 'Already in a guild' };
    
    // Check faction compatibility (optional restriction)
    if (FactionSystem && FactionSystem.reputation[guild.faction] < -50) {
      return { success: false, reason: 'Hostile faction standing prevents joining' };
    }
    
    this.playerGuild = {
      id: guildId,
      rank: 'member',
      joinDate: Date.now(),
      contributions: 0,
      reputation: 0
    };
    
    addComms('GUILD', \`Joined \${guild.name} [\${guild.tag}]\`);
    
    c.dmgNumbers.push({
      text: \`🏛️ JOINED \${guild.tag}\`,
      px: ship.position.x,
      py: ship.position.y + 12,
      pz: ship.position.z,
      age: 0,
      color: '#00AA00',
      scale: 1.2
    });
    
    return { success: true };
  },
  
  // Leave current guild
  leaveGuild() {
    if (!this.playerGuild.id) return { success: false, reason: 'Not in a guild' };
    
    const guild = this.guilds[this.playerGuild.id];
    addComms('GUILD', \`Left \${guild.name} [\${guild.tag}]\`);
    
    this.playerGuild = {
      id: null,
      rank: 'member',
      joinDate: null,
      contributions: 0,
      reputation: 0
    };
    
    return { success: true };
  },
  
  // Contribute to guild
  contribute(amount, type = 'credits') {
    if (!this.playerGuild.id) return { success: false, reason: 'Not in a guild' };
    
    const guild = this.guilds[this.playerGuild.id];
    
    if (type === 'credits') {
      if (c.credits < amount) return { success: false, reason: 'Insufficient credits' };
      
      c.credits -= amount;
      guild.treasury += amount;
      this.playerGuild.contributions += amount;
      this.playerGuild.reputation += Math.floor(amount / 100);
      
      addComms('GUILD', \`Contributed \${amount} credits to \${guild.name}\`);
      
      return { success: true };
    }
    
    return { success: false, reason: 'Invalid contribution type' };
  },
  
  // Start guild activity
  startActivity(activityId) {
    if (!this.playerGuild.id) return { success: false, reason: 'Not in a guild' };
    
    const activity = this.activities[activityId];
    if (!activity) return { success: false, reason: 'Activity not found' };
    
    const guild = this.guilds[this.playerGuild.id];
    
    // Check requirements
    if (guild.level < activity.requirements.level) {
      return { success: false, reason: \`Guild level \${activity.requirements.level} required\` };
    }
    
    if (guild.members < activity.requirements.members) {
      return { success: false, reason: \`\${activity.requirements.members} members required\` };
    }
    
    // Start activity (simplified - in reality would involve other players)
    addComms('GUILD', \`Starting \${activity.name}...\`);
    
    // Simulate activity completion after delay
    setTimeout(() => {
      this.completeActivity(activityId);
    }, 10000 + Math.random() * 20000); // 10-30 seconds
    
    c.dmgNumbers.push({
      text: \`🎯 \${activity.name.toUpperCase()}\`,
      px: ship.position.x,
      py: ship.position.y + 15,
      pz: ship.position.z,
      age: 0,
      color: '#FFAA00',
      scale: 1.1
    });
    
    return { success: true };
  },
  
  // Complete guild activity
  completeActivity(activityId) {
    const activity = this.activities[activityId];
    const guild = this.guilds[this.playerGuild.id];
    
    if (!activity || !guild) return;
    
    // Apply rewards
    if (activity.rewards.reputation) {
      this.playerGuild.reputation += activity.rewards.reputation;
      guild.reputation += Math.floor(activity.rewards.reputation / 2);
    }
    
    if (activity.rewards.treasury) {
      guild.treasury += activity.rewards.treasury;
    }
    
    if (activity.rewards.tech_bonus) {
      // Apply temporary tech bonus
      c._guildTechBonus = Date.now() + 300000; // 5 minutes
    }
    
    if (activity.rewards.faction_bonus) {
      // Improve faction standing
      if (FactionSystem) {
        FactionSystem.modifyReputation(guild.faction, 5, 'Guild diplomatic mission');
      }
    }
    
    addComms('GUILD', \`\${activity.name} completed! Rewards earned.\`);
    
    c.dmgNumbers.push({
      text: '✅ GUILD MISSION COMPLETE',
      px: ship.position.x,
      py: ship.position.y + 18,
      pz: ship.position.z,
      age: 0,
      color: '#00FF00',
      scale: 1.3
    });
  },
  
  // Get active wars
  getActiveWars() {
    if (!this.playerGuild.id) return [];
    
    const guild = this.guilds[this.playerGuild.id];
    return guild.activeWars || [];
  },
  
  // Check if player is at war with another guild
  isAtWar(guildId) {
    const wars = this.getActiveWars();
    return wars.includes(guildId);
  },
  
  // Get alliance information
  getAlliance() {
    if (!this.playerGuild.id) return null;
    
    for (const [allianceId, alliance] of Object.entries(this.alliances)) {
      if (alliance.guilds.includes(this.playerGuild.id)) {
        return { id: allianceId, ...alliance };
      }
    }
    
    return null;
  }
};

function showGuildInterface() {
  addComms('GUILD', '═══ GUILD INTERFACE ═══');
  
  if (!AllianceSystem.playerGuild.id) {
    addComms('STATUS', 'Not a member of any guild');
    addComms('AVAILABLE', '─── AVAILABLE GUILDS ───');
    
    let guildCount = 0;
    for (const [guildId, guild] of Object.entries(AllianceSystem.guilds)) {
      if (guildCount < 5) { // Show top 5 guilds
        const factionName = FactionSystem.factions[guild.faction].shortName;
        addComms('GUILD', \`\${guild.name} \${guild.tag} | \${guild.members} members | Level \${guild.level} | \${factionName}\`);
        addComms('DESC', \`  \${guild.description}\`);
        guildCount++;
      }
    }
    
    c.dmgNumbers.push({
      text: '🏛️ GUILD RECRUITMENT',
      px: ship.position.x,
      py: ship.position.y + 20,
      pz: ship.position.z,
      age: 0,
      color: '#AAAAFF',
      scale: 1.2
    });
    
    return;
  }
  
  // Player is in a guild
  const guild = AllianceSystem.guilds[AllianceSystem.playerGuild.id];
  const benefits = AllianceSystem.getBenefits();
  
  addComms('CURRENT', \`\${guild.name} \${guild.tag}\`);
  addComms('RANK', \`Rank: \${AllianceSystem.playerGuild.rank} | Reputation: \${AllianceSystem.playerGuild.reputation}\`);
  addComms('GUILD_INFO', \`Level \${guild.level} | \${guild.members} members | Treasury: \${guild.treasury} credits\`);
  addComms('LEADER', \`Leader: \${guild.leader} | Faction: \${FactionSystem.factions[guild.faction].shortName}\`);
  
  // Benefits
  addComms('BENEFITS', '─── GUILD BENEFITS ───');
  if (benefits.experience_bonus > 0) {
    addComms('BONUS', \`XP Bonus: +\${benefits.experience_bonus}%\`);
  }
  if (benefits.trading_discount > 0) {
    addComms('BONUS', \`Trading Discount: \${benefits.trading_discount}%\`);
  }
  
  const specBonus = benefits.specialization_bonus;
  if (specBonus) {
    const bonusText = Object.entries(specBonus).map(([k, v]) => \`\${k}: +\${v}%\`).join(', ');
    addComms('SPECIALIZATION', \`\${guild.specialization}: \${bonusText}\`);
  }
  
  // Activities
  if (Object.keys(AllianceSystem.activities).length > 0) {
    addComms('ACTIVITIES', '─── GUILD ACTIVITIES ───');
    let actCount = 0;
    for (const [actId, activity] of Object.entries(AllianceSystem.activities)) {
      if (actCount < 3) {
        addComms('ACTIVITY', \`\${activity.name}: \${activity.description}\`);
        addComms('REQUIRES', \`  Requires: Level \${activity.requirements.level}, \${activity.requirements.members} members\`);
        actCount++;
      }
    }
  }
  
  // Wars
  const wars = AllianceSystem.getActiveWars();
  if (wars.length > 0) {
    addComms('WARS', '─── ACTIVE WARS ───');
    for (const warGuild of wars) {
      const enemy = AllianceSystem.guilds[warGuild];
      if (enemy) {
        addComms('ENEMY', \`⚔️ \${enemy.name} \${enemy.tag}\`);
      }
    }
  }
  
  c.dmgNumbers.push({
    text: \`🏛️ \${guild.tag}\`,
    px: ship.position.x,
    py: ship.position.y + 20,
    pz: ship.position.z,
    age: 0,
    color: '#00AAFF',
    scale: 1.4
  });
}

function showAllianceInterface() {
  addComms('ALLIANCE', '═══ ALLIANCE INTERFACE ═══');
  
  const alliance = AllianceSystem.getAlliance();
  
  if (!alliance) {
    addComms('STATUS', 'Guild not part of any alliance');
    
    addComms('MAJOR_ALLIANCES', '─── MAJOR ALLIANCES ───');
    for (const [allianceId, allianceData] of Object.entries(AllianceSystem.alliances)) {
      addComms('ALLIANCE', \`\${allianceData.name}: \${allianceData.guilds.length} guilds\`);
      addComms('PURPOSE', \`  \${allianceData.purpose}\`);
      addComms('LEADER', \`  Led by: \${AllianceSystem.guilds[allianceData.leader_guild].name}\`);
      
      if (allianceData.active_campaigns.length > 0) {
        addComms('CAMPAIGNS', \`  Active: \${allianceData.active_campaigns.join(', ')}\`);
      }
    }
    
    return;
  }
  
  // Player guild is in an alliance
  addComms('CURRENT', \`\${alliance.name}\`);
  addComms('FORMED', \`Formed: \${new Date(alliance.formed).toDateString()}\`);
  addComms('PURPOSE', \`Purpose: \${alliance.purpose}\`);
  addComms('TREASURY', \`Shared Treasury: \${alliance.shared_treasury} credits\`);
  addComms('LEADER', \`Leading Guild: \${AllianceSystem.guilds[alliance.leader_guild].name}\`);
  
  addComms('MEMBERS', '─── MEMBER GUILDS ───');
  for (const guildId of alliance.guilds) {
    const guild = AllianceSystem.guilds[guildId];
    if (guild) {
      const isPlayer = guildId === AllianceSystem.playerGuild.id ? ' (You)' : '';
      addComms('MEMBER', \`\${guild.name} \${guild.tag} | \${guild.members} members | Level \${guild.level}\${isPlayer}\`);
    }
  }
  
  if (alliance.active_campaigns.length > 0) {
    addComms('CAMPAIGNS', '─── ACTIVE CAMPAIGNS ───');
    for (const campaign of alliance.active_campaigns) {
      addComms('CAMPAIGN', \`🎯 \${campaign.replace('_', ' ').toUpperCase()}\`);
    }
  }
  
  c.dmgNumbers.push({
    text: \`🤝 \${alliance.name.toUpperCase()}\`,
    px: ship.position.x,
    py: ship.position.y + 22,
    pz: ship.position.z,
    age: 0,
    color: '#FFAA00',
    scale: 1.3
  });
}

function updateAllianceSystem(dtMs) {
  // Apply guild benefits if player is in a guild
  if (AllianceSystem.playerGuild.id) {
    const benefits = AllianceSystem.getBenefits();
    
    if (benefits) {
      // Apply temporary bonuses (simplified)
      if (c._guildTechBonus && Date.now() > c._guildTechBonus) {
        c._guildTechBonus = null;
      }
      
      // Could apply other ongoing benefits here
    }
  }
  
  // Simulate guild activity in background
  if (Math.random() < 0.001) { // Very rare events
    // Random guild completed an activity
    const guildIds = Object.keys(AllianceSystem.guilds);
    const randomGuild = AllianceSystem.guilds[guildIds[Math.floor(Math.random() * guildIds.length)]];
    
    if (AllianceSystem.playerGuild.id !== randomGuild) {
      addComms('GUILD_NEWS', \`\${randomGuild.name} completed a major guild operation\`);
    }
  }
}

`);
  
  html = html.slice(0, functionInsertionPoint) + allianceFunctions + cr('\n') + html.slice(functionInsertionPoint);
  console.log('✅ Added alliance & guild system');

  // Add alliance update to game loop
  const gameLoopPattern = `      updateMiningSystem(dtMs);
      updateParticleSystem(dtMs);`;
      
  const gameLoopWithAlliance = cr(`      updateMiningSystem(dtMs);
      updateAllianceSystem(dtMs);
      updateParticleSystem(dtMs);`);
  
  html = safeReplace(html, gameLoopPattern, gameLoopWithAlliance, 'alliance game loop');
  console.log('✅ Added alliance system to game loop');

  fs.writeFileSync('public/index.html', html);
  console.log('✅ Alliance & Guild System implemented successfully!');
  console.log('');
  console.log('🏛️ ALLIANCE & GUILD FEATURES:');
  console.log('   • N key: Guild interface and membership management');
  console.log('   • Y key: Alliance interface and coalition information');
  console.log('   • 6 Major guilds with different specializations and factions');
  console.log('   • 3 Major alliances: Order Pact, Shadow Confederation, Trade Empire');
  console.log('   • Guild ranks: member, officer, leader with different permissions');
  console.log('   • Guild activities: raids, resource drives, defense, research, diplomacy');
  console.log('   • Specialization bonuses: combat, trading, mining, research, industry');
  console.log('   • Guild wars and alliance conflicts');
  console.log('   • Shared treasuries and contribution systems');
  console.log('   • Experience bonuses and trading discounts');
  console.log('   • Integration with faction system');
  console.log('   • Active campaign tracking');
  console.log('');
  
} catch (error) {
  console.error('❌ Error implementing alliance system:', error.message);
  process.exit(1);
}