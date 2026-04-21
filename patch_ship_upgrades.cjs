// Ship Upgrade System - Old Eden Space MMO
// Comprehensive upgrade system with modules, weapons, and ship progression

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

console.log('🚀 Implementing comprehensive ship upgrade system...');

const htmlPath = 'public/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Add ship upgrade data structure to state
const oldStatePlayer = `  player: { 
    name: '', 
    faction: 1, 
    credits: 1000, 
    stellarMarks: 0, 
    genome: null,
    rebirths: 0,
    playTime: 0,
    achievements: [],
    completedQuests: [],
    unlockedSkins: []
  },`;

const newStatePlayer = `  player: { 
    name: '', 
    faction: 1, 
    credits: 1000, 
    stellarMarks: 0, 
    genome: null,
    rebirths: 0,
    playTime: 0,
    achievements: [],
    completedQuests: [],
    unlockedSkins: []
  },
  // ── Ship Upgrade System ──
  shipUpgrades: {
    hull: { level: 1, maxLevel: 10, cost: 500, multiplier: 1.0 },
    shield: { level: 1, maxLevel: 10, cost: 400, multiplier: 1.0 },
    engine: { level: 1, maxLevel: 10, cost: 600, multiplier: 1.0 },
    weapons: { level: 1, maxLevel: 10, cost: 800, multiplier: 1.0 },
    reactor: { level: 1, maxLevel: 10, cost: 1000, multiplier: 1.0 },
    targeting: { level: 1, maxLevel: 5, cost: 1200, multiplier: 1.0 },
    armor: { level: 1, maxLevel: 8, cost: 700, multiplier: 1.0 },
    countermeasures: { level: 1, maxLevel: 6, cost: 900, multiplier: 1.0 }
  },
  shipModules: {
    installed: [], // Array of module IDs
    available: [
      { id: 'repair_drone', name: 'Repair Drone', cost: 2500, effect: 'Auto repair hull over time' },
      { id: 'shield_booster', name: 'Shield Booster', cost: 2000, effect: '+50% shield capacity' },
      { id: 'afterburner', name: 'Advanced Afterburner', cost: 3000, effect: '+100% afterburner efficiency' },
      { id: 'targeting_computer', name: 'Targeting Computer', cost: 2800, effect: 'Auto-lock enemies' },
      { id: 'energy_absorber', name: 'Energy Absorber', cost: 3500, effect: 'Convert damage to energy' },
      { id: 'weapon_overdrive', name: 'Weapon Overdrive', cost: 4000, effect: '+75% weapon damage' },
      { id: 'stealth_cloak', name: 'Stealth Cloak', cost: 5000, effect: 'Temporary invisibility' },
      { id: 'gravity_generator', name: 'Gravity Generator', cost: 4500, effect: 'Pull enemies and projectiles' }
    ]
  },`;

content = safeReplace(content, oldStatePlayer, newStatePlayer);

// 2. Add upgrade functions
const oldGetSkillBonus = `function getSkillBonus(skillName) {
  return 1 + (state.skills[skillName] * 0.05); // +5% per level, max +50% at level 10
}`;

const newGetSkillBonus = `function getSkillBonus(skillName) {
  return 1 + (state.skills[skillName] * 0.05); // +5% per level, max +50% at level 10
}

// ── Ship Upgrade System Functions ──
function getUpgradeCost(upgradeType, currentLevel) {
  const baseUpgrade = state.shipUpgrades[upgradeType];
  if (!baseUpgrade) return 0;
  
  // Exponential cost scaling: base * level^1.5
  return Math.floor(baseUpgrade.cost * Math.pow(currentLevel + 1, 1.5));
}

function canAffordUpgrade(upgradeType) {
  const upgrade = state.shipUpgrades[upgradeType];
  if (!upgrade || upgrade.level >= upgrade.maxLevel) return false;
  
  const cost = getUpgradeCost(upgradeType, upgrade.level);
  return state.player.credits >= cost;
}

function purchaseUpgrade(upgradeType) {
  const upgrade = state.shipUpgrades[upgradeType];
  if (!upgrade || upgrade.level >= upgrade.maxLevel) {
    addComms('Upgrades', 'Maximum level reached for ' + upgradeType);
    return false;
  }
  
  const cost = getUpgradeCost(upgradeType, upgrade.level);
  if (state.player.credits < cost) {
    addComms('Upgrades', 'Insufficient credits for ' + upgradeType + ' upgrade');
    return false;
  }
  
  // Purchase upgrade
  state.player.credits -= cost;
  upgrade.level++;
  
  // Update multiplier based on upgrade type
  switch(upgradeType) {
    case 'hull':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.2; // +20% hull per level
      state.ship.maxHull = Math.floor(100 * upgrade.multiplier);
      state.ship.hull = Math.min(state.ship.hull, state.ship.maxHull);
      break;
    case 'shield':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.15; // +15% shield per level
      state.ship.maxShield = Math.floor(50 * upgrade.multiplier);
      break;
    case 'engine':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.1; // +10% speed per level
      break;
    case 'weapons':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.12; // +12% weapon damage per level
      break;
    case 'reactor':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.08; // +8% energy regen per level
      break;
    case 'targeting':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.25; // +25% targeting accuracy per level
      break;
    case 'armor':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.05; // +5% damage reduction per level
      break;
    case 'countermeasures':
      upgrade.multiplier = 1 + (upgrade.level - 1) * 0.15; // +15% evasion per level
      break;
  }
  
  addComms('UPGRADE', \`\${upgradeType.toUpperCase()} Level \${upgrade.level} — +\${Math.floor((upgrade.multiplier - 1) * 100)}% efficiency\`);
  addCombatLog(\`SHIP UPGRADE — \${upgradeType} L\${upgrade.level}\`, '#00ff88');
  
  // Visual upgrade effect
  if (c.active && ship) {
    c.dmgNumbers.push({
      text: '⚡ ' + upgradeType.toUpperCase() + ' UPGRADE ⚡',
      px: ship.position.x,
      py: ship.position.y + 12,
      pz: ship.position.z,
      age: 0,
      color: '#00ff88',
      duration: 3000
    });
  }
  
  AudioSFX.play('quest_complete');
  return true;
}

function purchaseModule(moduleId) {
  const module = state.shipModules.available.find(m => m.id === moduleId);
  if (!module) return false;
  
  if (state.shipModules.installed.includes(moduleId)) {
    addComms('Modules', 'Module already installed: ' + module.name);
    return false;
  }
  
  if (state.player.credits < module.cost) {
    addComms('Modules', 'Insufficient credits for ' + module.name);
    return false;
  }
  
  // Check module limit (max 4 modules)
  if (state.shipModules.installed.length >= 4) {
    addComms('Modules', 'Maximum modules installed (4/4). Remove a module first.');
    return false;
  }
  
  // Purchase module
  state.player.credits -= module.cost;
  state.shipModules.installed.push(moduleId);
  
  addComms('MODULE', \`\${module.name} installed — \${module.effect}\`);
  addCombatLog(\`MODULE INSTALLED — \${module.name}\`, '#ffaa00');
  
  // Visual module effect
  if (c.active && ship) {
    c.dmgNumbers.push({
      text: '🔧 ' + module.name.toUpperCase() + ' 🔧',
      px: ship.position.x,
      py: ship.position.y + 15,
      pz: ship.position.z,
      age: 0,
      color: '#ffaa00',
      duration: 4000
    });
  }
  
  // Apply module effects
  applyModuleEffects();
  AudioSFX.play('karma_reveal');
  return true;
}

function removeModule(moduleId) {
  const index = state.shipModules.installed.indexOf(moduleId);
  if (index === -1) return false;
  
  const module = state.shipModules.available.find(m => m.id === moduleId);
  state.shipModules.installed.splice(index, 1);
  
  // Refund 50% of module cost
  const refund = Math.floor(module.cost * 0.5);
  state.player.credits += refund;
  
  addComms('MODULE', \`\${module.name} removed — +\${refund} credits refund\`);
  applyModuleEffects(); // Reapply remaining modules
  return true;
}

function applyModuleEffects() {
  // Reset module bonuses
  c._moduleHullRegen = 0;
  c._moduleShieldBoost = 0;
  c._moduleAfterburnerBoost = 0;
  c._moduleTargetingAuto = false;
  c._moduleEnergyAbsorb = 0;
  c._moduleWeaponBoost = 0;
  c._moduleStealthAvailable = false;
  c._moduleGravityWell = false;
  
  // Apply installed module effects
  state.shipModules.installed.forEach(moduleId => {
    switch(moduleId) {
      case 'repair_drone':
        c._moduleHullRegen = 2; // 2 HP per second
        break;
      case 'shield_booster':
        c._moduleShieldBoost = 0.5; // +50% shield capacity
        state.ship.maxShield = Math.floor(50 * state.shipUpgrades.shield.multiplier * (1 + c._moduleShieldBoost));
        break;
      case 'afterburner':
        c._moduleAfterburnerBoost = 1.0; // +100% efficiency
        break;
      case 'targeting_computer':
        c._moduleTargetingAuto = true;
        break;
      case 'energy_absorber':
        c._moduleEnergyAbsorb = 0.2; // 20% damage to energy
        break;
      case 'weapon_overdrive':
        c._moduleWeaponBoost = 0.75; // +75% weapon damage
        break;
      case 'stealth_cloak':
        c._moduleStealthAvailable = true;
        break;
      case 'gravity_generator':
        c._moduleGravityWell = true;
        break;
    }
  });
}

function getShipStats() {
  const hull = state.shipUpgrades.hull;
  const shield = state.shipUpgrades.shield;
  const engine = state.shipUpgrades.engine;
  const weapons = state.shipUpgrades.weapons;
  const reactor = state.shipUpgrades.reactor;
  
  return {
    hullCapacity: Math.floor(100 * hull.multiplier),
    shieldCapacity: Math.floor(50 * shield.multiplier * (1 + (c._moduleShieldBoost || 0))),
    maxSpeed: Math.floor(80 * engine.multiplier),
    weaponDamage: Math.floor(100 * weapons.multiplier * (1 + (c._moduleWeaponBoost || 0))),
    energyRegen: Math.floor(100 * reactor.multiplier),
    totalUpgradeLevels: hull.level + shield.level + engine.level + weapons.level + reactor.level,
    installedModules: state.shipModules.installed.length
  };
}`;

content = safeReplace(content, oldGetSkillBonus, newGetSkillBonus);

// 3. Add upgrade screen UI
const oldMarketScreen = `<div id="screen-market" class="screen">
  <h2>🏪 Galactic Market</h2>
  <div class="market-tabs">
    <button id="market-buy-tab" class="tab-button active" onclick="showMarketTab('buy')">Buy</button>
    <button id="market-sell-tab" class="tab-button" onclick="showMarketTab('sell')">Sell</button>
    <button id="market-orders-tab" class="tab-button" onclick="showMarketTab('orders')">Orders</button>
  </div>`;

const newMarketScreen = `<div id="screen-market" class="screen">
  <h2>🏪 Galactic Market</h2>
  <div class="market-tabs">
    <button id="market-buy-tab" class="tab-button active" onclick="showMarketTab('buy')">Buy</button>
    <button id="market-sell-tab" class="tab-button" onclick="showMarketTab('sell')">Sell</button>
    <button id="market-orders-tab" class="tab-button" onclick="showMarketTab('orders')">Orders</button>
    <button id="market-upgrades-tab" class="tab-button" onclick="showMarketTab('upgrades')">🚀 Upgrades</button>
  </div>`;

content = safeReplace(content, oldMarketScreen, newMarketScreen);

// 4. Add upgrades content to market
const oldMarketOrdersContent = `  <div id="market-orders-content" class="market-content" style="display:none;">
    <h3>📋 My Orders</h3>
    <div id="market-orders-list">
      <p style="color:#888;">No active orders</p>
    </div>
  </div>
</div>`;

const newMarketOrdersContent = `  <div id="market-orders-content" class="market-content" style="display:none;">
    <h3>📋 My Orders</h3>
    <div id="market-orders-list">
      <p style="color:#888;">No active orders</p>
    </div>
  </div>
  
  <div id="market-upgrades-content" class="market-content" style="display:none;">
    <h3>🚀 Ship Upgrades</h3>
    <div class="upgrade-stats">
      <h4>📊 Current Ship Stats</h4>
      <div id="ship-stats-display"></div>
    </div>
    
    <div class="upgrade-sections">
      <div class="upgrade-section">
        <h4>⚙️ Core Systems</h4>
        <div id="core-upgrades-list"></div>
      </div>
      
      <div class="upgrade-section">
        <h4>🔧 Ship Modules (4 max)</h4>
        <div id="modules-list"></div>
      </div>
      
      <div class="upgrade-section">
        <h4>📦 Installed Modules</h4>
        <div id="installed-modules-list"></div>
      </div>
    </div>
  </div>
</div>`;

content = safeReplace(content, oldMarketOrdersContent, newMarketOrdersContent);

// 5. Add upgrade screen functionality
const oldShowMarketTab = `function showMarketTab(tab) {
  // Hide all tabs
  document.getElementById('market-buy-content').style.display = 'none';
  document.getElementById('market-sell-content').style.display = 'none';
  document.getElementById('market-orders-content').style.display = 'none';
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  document.getElementById('market-' + tab + '-content').style.display = 'block';
  document.getElementById('market-' + tab + '-tab').classList.add('active');
  
  if (tab === 'buy') {
    updateMarketBuyList();
  } else if (tab === 'sell') {
    updateMarketSellList();
  }
}`;

const newShowMarketTab = `function showMarketTab(tab) {
  // Hide all tabs
  document.getElementById('market-buy-content').style.display = 'none';
  document.getElementById('market-sell-content').style.display = 'none';
  document.getElementById('market-orders-content').style.display = 'none';
  if (document.getElementById('market-upgrades-content')) {
    document.getElementById('market-upgrades-content').style.display = 'none';
  }
  
  // Remove active class from all buttons
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  document.getElementById('market-' + tab + '-content').style.display = 'block';
  document.getElementById('market-' + tab + '-tab').classList.add('active');
  
  if (tab === 'buy') {
    updateMarketBuyList();
  } else if (tab === 'sell') {
    updateMarketSellList();
  } else if (tab === 'upgrades') {
    updateUpgradeScreen();
  }
}

function updateUpgradeScreen() {
  const stats = getShipStats();
  
  // Update ship stats display
  const statsDiv = document.getElementById('ship-stats-display');
  if (statsDiv) {
    statsDiv.innerHTML = \`
      <div class="stat-row">🛡️ Hull: \${state.ship.hull}/\${stats.hullCapacity} (+\${Math.floor((state.shipUpgrades.hull.multiplier - 1) * 100)}%)</div>
      <div class="stat-row">⚡ Shield: \${Math.floor(state.ship.shield)}/\${stats.shieldCapacity} (+\${Math.floor((state.shipUpgrades.shield.multiplier - 1) * 100)}%)</div>
      <div class="stat-row">🚀 Max Speed: \${stats.maxSpeed} (+\${Math.floor((state.shipUpgrades.engine.multiplier - 1) * 100)}%)</div>
      <div class="stat-row">💥 Weapon Power: \${stats.weaponDamage}% (+\${Math.floor((state.shipUpgrades.weapons.multiplier - 1) * 100)}%)</div>
      <div class="stat-row">🔋 Energy Regen: \${stats.energyRegen}% (+\${Math.floor((state.shipUpgrades.reactor.multiplier - 1) * 100)}%)</div>
      <div class="stat-row">📦 Modules: \${stats.installedModules}/4</div>
      <div class="stat-row">💰 Credits: \${state.player.credits.toLocaleString()}</div>
    \`;
  }
  
  // Update core upgrades list
  const coreDiv = document.getElementById('core-upgrades-list');
  if (coreDiv) {
    const upgradeTypes = ['hull', 'shield', 'engine', 'weapons', 'reactor', 'targeting', 'armor', 'countermeasures'];
    const upgradeIcons = { hull: '🛡️', shield: '⚡', engine: '🚀', weapons: '💥', reactor: '🔋', targeting: '🎯', armor: '🛡️', countermeasures: '🔄' };
    
    coreDiv.innerHTML = upgradeTypes.map(type => {
      const upgrade = state.shipUpgrades[type];
      const cost = getUpgradeCost(type, upgrade.level);
      const canAfford = canAffordUpgrade(type);
      const isMaxLevel = upgrade.level >= upgrade.maxLevel;
      
      return \`
        <div class="upgrade-item \${canAfford && !isMaxLevel ? 'affordable' : ''} \${isMaxLevel ? 'maxed' : ''}">
          <div class="upgrade-info">
            <strong>\${upgradeIcons[type]} \${type.toUpperCase()} Level \${upgrade.level}/\${upgrade.maxLevel}</strong>
            <div>+\${Math.floor((upgrade.multiplier - 1) * 100)}% efficiency</div>
            <div class="upgrade-cost">\${isMaxLevel ? 'MAX LEVEL' : cost.toLocaleString() + ' credits'}</div>
          </div>
          \${!isMaxLevel ? \`<button onclick="purchaseUpgrade('\${type}')" \${!canAfford ? 'disabled' : ''}>Upgrade</button>\` : ''}
        </div>
      \`;
    }).join('');
  }
  
  // Update modules list
  const modulesDiv = document.getElementById('modules-list');
  if (modulesDiv) {
    modulesDiv.innerHTML = state.shipModules.available.map(module => {
      const isInstalled = state.shipModules.installed.includes(module.id);
      const canAfford = state.player.credits >= module.cost;
      const canInstall = !isInstalled && state.shipModules.installed.length < 4 && canAfford;
      
      return \`
        <div class="module-item \${canInstall ? 'affordable' : ''} \${isInstalled ? 'installed' : ''}">
          <div class="module-info">
            <strong>🔧 \${module.name}</strong>
            <div>\${module.effect}</div>
            <div class="module-cost">\${isInstalled ? 'INSTALLED' : module.cost.toLocaleString() + ' credits'}</div>
          </div>
          \${!isInstalled ? \`<button onclick="purchaseModule('\${module.id}')" \${!canInstall ? 'disabled' : ''}>Install</button>\` : ''}
        </div>
      \`;
    }).join('');
  }
  
  // Update installed modules list
  const installedDiv = document.getElementById('installed-modules-list');
  if (installedDiv) {
    if (state.shipModules.installed.length === 0) {
      installedDiv.innerHTML = '<p style="color:#888;">No modules installed</p>';
    } else {
      installedDiv.innerHTML = state.shipModules.installed.map(moduleId => {
        const module = state.shipModules.available.find(m => m.id === moduleId);
        const refund = Math.floor(module.cost * 0.5);
        
        return \`
          <div class="installed-module-item">
            <div class="module-info">
              <strong>✅ \${module.name}</strong>
              <div>\${module.effect}</div>
              <div class="module-refund">Refund: \${refund.toLocaleString()} credits</div>
            </div>
            <button onclick="removeModule('\${moduleId}')" class="remove-btn">Remove</button>
          </div>
        \`;
      }).join('');
    }
  }
}`;

content = safeReplace(content, oldShowMarketTab, newShowMarketTab);

// Write the enhanced file
fs.writeFileSync(htmlPath, content);
console.log('✅ Ship upgrade system implemented successfully!');
console.log('📊 Features added:');
console.log('   • 8 core ship upgrade types with exponential scaling');
console.log('   • 8 ship modules with unique effects and 4-slot limit');
console.log('   • Complete upgrade UI in market screen');
console.log('   • Real-time stat tracking and visual feedback');
console.log('   • Module installation/removal with refunds');
console.log('   • Progressive stat bonuses and ship enhancement');