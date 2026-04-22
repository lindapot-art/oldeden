#!/usr/bin/env node
// EVE Module Master — Transform Old Eden to authentic EVE-style cycling systems
// PHASE 1B: Module Activation Cycling + Heat Mechanics

const fs = require('fs');
const path = require('path');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.warn('❌ String not found for replacement:', oldStr.substring(0, 100));
    return content;
  }
  const parts = content.split(oldStr);
  if (parts.length !== 2) {
    console.warn('⚠️ Multiple matches found:', parts.length - 1);
  }
  return parts.join(newStr);
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

console.log('🔧 EVE Module Master — Implementing Module Cycling System');

const indexPath = 'public/index.html';
let html = fs.readFileSync(indexPath, 'utf8');

// ══ PHASE 1: TRANSFORM MODULE DEFINITIONS ══
console.log('📋 Phase 1: Transforming module definitions to cycling systems...');

const oldModuleDefinitions = `      mid: [
        { id: 'shield_booster', name: 'Shield Booster', cost: 2000, cpu: 25, powergrid: 120, effect: '+50% shield capacity', description: 'Increases maximum shield capacity' },
        { id: 'afterburner', name: 'Advanced Afterburner', cost: 3000, cpu: 30, powergrid: 100, effect: '+100% afterburner efficiency', description: 'Dramatically improves thrust output' },
        { id: 'targeting_computer', name: 'Targeting Computer', cost: 2800, cpu: 40, powergrid: 80, effect: 'Auto-lock enemies', description: 'Automated target acquisition system' },
        { id: 'energy_absorber', name: 'Energy Absorber', cost: 3500, cpu: 35, powergrid: 110, effect: 'Convert damage to energy', description: 'Converts incoming damage to usable energy' },
        { id: 'stealth_cloak', name: 'Stealth Cloak', cost: 5000, cpu: 50, powergrid: 180, effect: 'Temporary invisibility', description: 'Phase-shift technology for stealth operations' }
      ],
      low: [
        { id: 'repair_drone', name: 'Repair Drone', cost: 2500, cpu: 20, powergrid: 90, effect: 'Auto repair hull over time', description: 'Deploys nanobots for continuous hull repair' }
      ]`;

const newModuleDefinitions = `      mid: [
        { id: 'shield_booster', name: 'Shield Booster', cost: 2000, cpu: 25, powergrid: 120, effect: '+500 shield HP per cycle', description: 'Active shield booster module', 
          cycleTime: 10000, capDrain: 25, heatBonus: { cycleReduction: 0.2, effectBonus: 0.1, damagePerCycle: 0.02 }},
        { id: 'afterburner', name: 'Advanced Afterburner', cost: 3000, cpu: 30, powergrid: 100, effect: '+100% afterburner efficiency', description: 'Dramatically improves thrust output' },
        { id: 'targeting_computer', name: 'Targeting Computer', cost: 2800, cpu: 40, powergrid: 80, effect: 'Auto-lock enemies', description: 'Automated target acquisition system' },
        { id: 'energy_absorber', name: 'Energy Absorber', cost: 3500, cpu: 35, powergrid: 110, effect: 'Converts damage to capacitor', description: 'Active energy absorption module',
          cycleTime: 6000, capDrain: 15, heatBonus: { cycleReduction: 0, effectBonus: 0.5, damagePerCycle: 0.025 }},
        { id: 'stealth_cloak', name: 'Stealth Cloak', cost: 5000, cpu: 50, powergrid: 180, effect: 'Temporary invisibility', description: 'Phase-shift technology for stealth operations' }
      ],
      low: [
        { id: 'repair_drone', name: 'Hull Repair Module', cost: 2500, cpu: 20, powergrid: 90, effect: '+80 hull HP per cycle', description: 'Active hull repair system',
          cycleTime: 12000, capDrain: 35, heatBonus: { cycleReduction: 0.2, effectBonus: 0.1, damagePerCycle: 0.03 }},
        { id: 'armor_repair', name: 'Armor Repair Module', cost: 2200, cpu: 18, powergrid: 85, effect: '+120 armor HP per cycle', description: 'Active armor repair system', 
          cycleTime: 8000, capDrain: 20, heatBonus: { cycleReduction: 0.2, effectBonus: 0.15, damagePerCycle: 0.015 }}
      ]`;

html = safeReplace(html, oldModuleDefinitions, newModuleDefinitions);

// ══ PHASE 2: ADD MODULE STATE TRACKING SYSTEM ══
console.log('⚙️ Phase 2: Adding module state tracking system...');

const moduleStateInsertPoint = `  // ── Enhanced Enemy AI System ──`;

const moduleStateSystem = `  // ── EVE-Style Module Cycling System ──
  moduleStates: {
    // Track state of all fitted modules
    activeModules: [], // Array of { slotType, slotIndex, moduleId, state }
    cyclingModules: new Map(), // moduleKey -> { cycleStartTime, cycleTime, isOverheated }
    moduleIntegrity: new Map(), // moduleKey -> integrity percentage (0-100)
    moduleHeat: new Map(), // moduleKey -> heat level (0-100)
    recentDamage: [], // Track damage for energy absorber: { damage, timestamp }
    heatDissipationRate: 2.5, // Heat dissipated per second when not overheated
    maxHeatBeforeShutdown: 95, // Module shuts down if heat exceeds this
    damageHistory: 10000 // Track damage for last 10 seconds for energy absorber
  },

  // ── Enhanced Enemy AI System ──`;

html = safeReplace(html, moduleStateInsertPoint, moduleStateSystem);

// ══ PHASE 3: IMPLEMENT CORE MODULE CYCLING FUNCTIONS ══
console.log('🔄 Phase 3: Implementing core module cycling functions...');

const moduleSystemsInsertPoint = `// ══ MASTER EVE DEFENSE SYSTEMS UPDATE ══`;

const moduleCyclingFunctions = `// ══ EVE-STYLE MODULE CYCLING SYSTEM ══

// Get unique module key for tracking
window.getModuleKey = function(slotType, slotIndex) {
  return \`$"+"{\${slotType}}$"+"{\${slotIndex}}\`;
};

// Check if module is currently cycling
window.isModuleCycling = function(slotType, slotIndex) {
  const moduleKey = window.getModuleKey(slotType, slotIndex);
  return state.moduleStates.cyclingModules.has(moduleKey);
};

// Get module integrity (0-100%)
window.getModuleIntegrity = function(slotType, slotIndex) {
  const moduleKey = window.getModuleKey(slotType, slotIndex);
  return state.moduleStates.moduleIntegrity.get(moduleKey) || 100;
};

// Get module heat level (0-100%)
window.getModuleHeat = function(slotType, slotIndex) {
  const moduleKey = window.getModuleKey(slotType, slotIndex);
  return state.moduleStates.moduleHeat.get(moduleKey) || 0;
};

// Start module activation cycle
window.activateModule = function(slotType, slotIndex, isOverheated = false) {
  const module = state.shipFitting.slots[slotType][slotIndex];
  if (!module || !module.cycleTime) {
    console.warn('Cannot activate non-cycling module or empty slot');
    return false;
  }

  const moduleKey = window.getModuleKey(slotType, slotIndex);
  
  // Check if already cycling
  if (state.moduleStates.cyclingModules.has(moduleKey)) {
    console.log('Module already cycling:', moduleKey);
    return false;
  }

  // Check module integrity
  const integrity = window.getModuleIntegrity(slotType, slotIndex);
  if (integrity <= 0) {
    window.addComms('Engineering', \`$"+"{\${module.name}} is burnt out! Repair needed.\`);
    return false;
  }

  // Check heat level
  const currentHeat = window.getModuleHeat(slotType, slotIndex);
  if (currentHeat >= state.moduleStates.maxHeatBeforeShutdown) {
    window.addComms('Engineering', \`$"+"{\${module.name}} overheated! Shutting down.\`);
    return false;
  }

  // Check capacitor requirements
  if (window.eveDefenseSystems.capacitor.current < module.capDrain) {
    window.addComms('Engineering', 'Insufficient capacitor for module activation');
    return false;
  }

  // Calculate actual cycle time (reduced if overheated)
  let actualCycleTime = module.cycleTime;
  if (isOverheated && module.heatBonus) {
    actualCycleTime *= (1 - module.heatBonus.cycleReduction);
  }

  // Start the cycle
  const now = Date.now();
  state.moduleStates.cyclingModules.set(moduleKey, {
    cycleStartTime: now,
    cycleTime: actualCycleTime,
    isOverheated: isOverheated,
    moduleData: module
  });

  console.log(\`🔧 Activated $"+"{\${module.name}} (cycle: $"+"{\${actualCycleTime}ms}, overheated: $"+"{\${isOverheated}})\`);
  
  // Immediate capacitor drain
  window.eveDefenseSystems.capacitor.current -= module.capDrain;
  
  // Add heat if overheated
  if (isOverheated) {
    const currentModuleHeat = window.getModuleHeat(slotType, slotIndex);
    state.moduleStates.moduleHeat.set(moduleKey, Math.min(100, currentModuleHeat + 15));
  }

  return true;
};

// Apply module effect when cycle completes
window.applyModuleEffect = function(slotType, slotIndex, module, isOverheated) {
  const moduleKey = window.getModuleKey(slotType, slotIndex);
  
  switch (module.id) {
    case 'shield_booster':
      let shieldBoost = 500;
      if (isOverheated && module.heatBonus) {
        shieldBoost *= (1 + module.heatBonus.effectBonus);
      }
      
      // Apply integrity degradation
      const effectiveness = window.getModuleIntegrity(slotType, slotIndex) / 100;
      shieldBoost *= effectiveness;
      
      window.eveDefenseSystems.shields.current = Math.min(
        window.eveDefenseSystems.shields.maximum,
        window.eveDefenseSystems.shields.current + shieldBoost
      );
      
      window.addComms('Engineering', \`Shield Booster: +$"+"{\${Math.round(shieldBoost)}} shields\`);
      window.createShieldEffect();
      break;
      
    case 'repair_drone': // Hull repair
      let hullRepair = 80;
      if (isOverheated && module.heatBonus) {
        hullRepair *= (1 + module.heatBonus.effectBonus);
      }
      
      const hullEffectiveness = window.getModuleIntegrity(slotType, slotIndex) / 100;
      hullRepair *= hullEffectiveness;
      
      window.eveDefenseSystems.hull.current = Math.min(
        window.eveDefenseSystems.hull.maximum,
        window.eveDefenseSystems.hull.current + hullRepair
      );
      
      window.addComms('Engineering', \`Hull Repair: +$"+"{\${Math.round(hullRepair)}} hull\`);
      if (window.createHullRepairEffect) window.createHullRepairEffect();
      break;
      
    case 'armor_repair':
      let armorRepair = 120;
      if (isOverheated && module.heatBonus) {
        armorRepair *= (1 + module.heatBonus.effectBonus);
      }
      
      const armorEffectiveness = window.getModuleIntegrity(slotType, slotIndex) / 100;
      armorRepair *= armorEffectiveness;
      
      window.eveDefenseSystems.armor.current = Math.min(
        window.eveDefenseSystems.armor.maximum,
        window.eveDefenseSystems.armor.current + armorRepair
      );
      
      window.addComms('Engineering', \`Armor Repair: +$"+"{\${Math.round(armorRepair)}} armor\`);
      if (window.createArmorEffect) window.createArmorEffect();
      break;
      
    case 'energy_absorber':
      // Calculate energy from recent damage taken
      const now = Date.now();
      const recentDamageTotal = state.moduleStates.recentDamage
        .filter(d => now - d.timestamp < state.moduleStates.damageHistory)
        .reduce((total, d) => total + d.damage, 0);
      
      let energyGain = recentDamageTotal * 0.3;
      if (isOverheated && module.heatBonus) {
        energyGain *= (1 + module.heatBonus.effectBonus);
      }
      
      const energyEffectiveness = window.getModuleIntegrity(slotType, slotIndex) / 100;
      energyGain *= energyEffectiveness;
      
      window.eveDefenseSystems.capacitor.current = Math.min(
        window.eveDefenseSystems.capacitor.maximum,
        window.eveDefenseSystems.capacitor.current + energyGain
      );
      
      if (energyGain > 0) {
        window.addComms('Engineering', \`Energy Absorber: +$"+"{\${Math.round(energyGain)}} capacitor\`);
      }
      break;
  }
  
  // Apply module damage if overheated
  if (isOverheated && module.heatBonus && module.heatBonus.damagePerCycle > 0) {
    const currentIntegrity = window.getModuleIntegrity(slotType, slotIndex);
    const damagePercent = module.heatBonus.damagePerCycle * 100;
    const newIntegrity = Math.max(0, currentIntegrity - damagePercent);
    state.moduleStates.moduleIntegrity.set(moduleKey, newIntegrity);
    
    if (newIntegrity <= 25 && currentIntegrity > 25) {
      window.addComms('Engineering', \`⚠️ $"+"{\${module.name}} critically damaged!\`);
    }
  }
};

// Update all module cycling states
window.updateModuleCycling = function() {
  const now = Date.now();
  
  // Process cycling modules
  for (const [moduleKey, cycleData] of state.moduleStates.cyclingModules.entries()) {
    const elapsed = now - cycleData.cycleStartTime;
    
    if (elapsed >= cycleData.cycleTime) {
      // Cycle complete - apply effect
      const [slotType, slotIndex] = moduleKey.split('');
      window.applyModuleEffect(slotType, parseInt(slotIndex), cycleData.moduleData, cycleData.isOverheated);
      
      // Remove from cycling
      state.moduleStates.cyclingModules.delete(moduleKey);
    }
  }
  
  // Update module heat dissipation
  for (const [moduleKey, heat] of state.moduleStates.moduleHeat.entries()) {
    if (heat > 0) {
      const newHeat = Math.max(0, heat - (state.moduleStates.heatDissipationRate / 60));
      if (newHeat > 0) {
        state.moduleStates.moduleHeat.set(moduleKey, newHeat);
      } else {
        state.moduleStates.moduleHeat.delete(moduleKey);
      }
    }
  }
  
  // Clean old damage records for energy absorber
  const cutoff = now - state.moduleStates.damageHistory;
  state.moduleStates.recentDamage = state.moduleStates.recentDamage.filter(d => d.timestamp > cutoff);
};

// Record damage for energy absorber tracking
window.recordDamageForEnergyAbsorber = function(damage) {
  state.moduleStates.recentDamage.push({
    damage: damage,
    timestamp: Date.now()
  });
  
  // Limit array size
  if (state.moduleStates.recentDamage.length > 50) {
    state.moduleStates.recentDamage = state.moduleStates.recentDamage.slice(-25);
  }
};

// ══ MASTER EVE DEFENSE SYSTEMS UPDATE ══`;

html = safeReplace(html, moduleSystemsInsertPoint, moduleCyclingFunctions);

// ══ PHASE 4: INTEGRATE MODULE CYCLING INTO EVE DEFENSE SYSTEMS ══
console.log('🛡️ Phase 4: Integrating module cycling into EVE defense systems...');

const oldEVEUpdate = `window.updateEVEDefenseSystems = function(deltaTime) {
  if (!window.eveDefenseSystems || !window.eveDroneSystem) return;
  
  try {
    // Update all EVE defense systems
    window.updateShieldRegeneration();
    window.updateArmorRepair();
    window.updateHullRepair();
    window.updateCapacitor();
    
    // Update drone systems
    window.updateDroneAI();
    window.updateDroneProjectiles();
    window.autoLaunchDrones();
    
    // Update visual effects
    if (window.updateDefenseEffects) {
      window.updateDefenseEffects();
    }
    
  } catch (error) {
    console.warn('EVE systems update error:', error);
  }
};`;

const newEVEUpdate = `window.updateEVEDefenseSystems = function(deltaTime) {
  if (!window.eveDefenseSystems || !window.eveDroneSystem) return;
  
  try {
    // Update module cycling system (NEW)
    window.updateModuleCycling();
    
    // Update all EVE defense systems  
    window.updateShieldRegeneration();
    // Note: Armor and hull repair now handled by cycling modules, not continuous
    window.updateCapacitor();
    
    // Update drone systems
    window.updateDroneAI();
    window.updateDroneProjectiles();
    window.autoLaunchDrones();
    
    // Update visual effects
    if (window.updateDefenseEffects) {
      window.updateDefenseEffects();
    }
    
  } catch (error) {
    console.warn('EVE systems update error:', error);
  }
};`;

html = safeReplace(html, oldEVEUpdate, newEVEUpdate);

// ══ PHASE 5: ADD EVE DEFENSE SYSTEMS TO GAME LOOP ══
console.log('🎮 Phase 5: Adding EVE defense systems to game loop...');

const gameLoopInsertPoint = `    // ── Flight Control State Updates ──
    updateFlightControls(dt);`;

const eveSystemsGameLoopIntegration = `    // ── EVE Defense Systems (NEW MODULE CYCLING) ──
    if (typeof window.updateEVEDefenseSystems === 'function') {
      window.updateEVEDefenseSystems(dt);
    }

    // ── Flight Control State Updates ──
    updateFlightControls(dt);`;

html = safeReplace(html, gameLoopInsertPoint, eveSystemsGameLoopIntegration);

// ══ PHASE 6: ADD MODULE ACTIVATION KEYBINDS ══  
console.log('🎹 Phase 6: Adding module activation keybinds...');

const keybindInsertPoint = `    if (e.key === 'f') { // Flash debug`;

const moduleKeybinds = `    // ── MODULE ACTIVATION KEYBINDS ──
    if (e.key >= '1' && e.key <= '8') {
      const slotIndex = parseInt(e.key) - 1;
      // Try to activate mid slot modules (shield booster, energy absorber, etc.)
      if (state.shipFitting.slots.mid[slotIndex]) {
        const isOverheated = e.shiftKey; // Shift + number = overheat
        window.activateModule('mid', slotIndex, isOverheated);
      }
      e.preventDefault();
    }
    
    if (e.key === 'q') { // Hull repair (low slot 0)
      if (state.shipFitting.slots.low[0]) {
        const isOverheated = e.shiftKey;
        window.activateModule('low', 0, isOverheated);
      }
      e.preventDefault();
    }
    
    if (e.key === 'e') { // Armor repair (low slot 1) 
      if (state.shipFitting.slots.low[1]) {
        const isOverheated = e.shiftKey;
        window.activateModule('low', 1, isOverheated);
      }
      e.preventDefault();
    }

    if (e.key === 'f') { // Flash debug`;

html = safeReplace(html, keybindInsertPoint, moduleKeybinds);

// ══ PHASE 7: INTEGRATE DAMAGE TRACKING FOR ENERGY ABSORBER ══
console.log('🩸 Phase 7: Integrating damage tracking for energy absorber...');

// Find the damage application in applyEVEDamage and add tracking
const damageTrackingPoint = `  return {
    shieldsRemaining: defense.shields.current,
    armorRemaining: defense.armor.current,
    hullRemaining: defense.hull.current,
    totalDamageApplied: incomingDamage
  };`;

const damageTrackingIntegration = `  // Track damage for energy absorber module
  if (typeof window.recordDamageForEnergyAbsorber === 'function') {
    window.recordDamageForEnergyAbsorber(incomingDamage);
  }

  return {
    shieldsRemaining: defense.shields.current,
    armorRemaining: defense.armor.current,
    hullRemaining: defense.hull.current,
    totalDamageApplied: incomingDamage
  };`;

html = safeReplace(html, damageTrackingPoint, damageTrackingIntegration);

// ══ PHASE 8: REMOVE OLD CONTINUOUS REPAIR SYSTEMS ══
console.log('🗑️ Phase 8: Removing old continuous repair systems...');

const oldArmorRepair = `// Armor Nanobot Repair System  
window.updateArmorRepair = function() {
  const armor = window.eveDefenseSystems.armor;
  const capacitor = window.eveDefenseSystems.capacitor;
  
  if (armor.nanobots.active && armor.current < armor.maximum) {
    // Check capacitor
    if (capacitor.current >= armor.nanobots.capacitorDrain / 60) {
      // Repair armor
      const repairAmount = (armor.repairRate * armor.nanobots.efficiency) / 60;
      armor.current = Math.min(armor.maximum, armor.current + repairAmount);
      
      // Drain capacitor
      capacitor.current -= armor.nanobots.capacitorDrain / 60;
      
      // Nanobot effects
      if (Math.random() < 0.1) window.createNanobotEffect();
    }
  }
};`;

const oldHullRepair = `// Hull Self-Repair System
window.updateHullRepair = function() {
  const hull = window.eveDefenseSystems.hull;
  const capacitor = window.eveDefenseSystems.capacitor;
  
  if (hull.selfRepair.active && hull.current < hull.maximum) {
    if (capacitor.current >= hull.selfRepair.capacitorDrain / 60) {
      const repairAmount = (hull.repairRate * hull.selfRepair.efficiency) / 60;
      hull.current = Math.min(hull.maximum, hull.current + repairAmount);
      
      capacitor.current -= hull.selfRepair.capacitorDrain / 60;
      
      if (Math.random() < 0.05) window.createHullRepairEffect();
    }
  }
};`;

// Replace with placeholders that explain the new system
const newArmorRepairPlaceholder = `// Armor Repair System — NOW MODULE-BASED
// Armor repair is now handled by the 'armor_repair' cycling module
// Use 'E' key to activate armor repair cycle (Shift+E to overheat)
window.updateArmorRepair = function() {
  // Legacy function - armor repair now handled by module cycling system
  // See window.applyModuleEffect() for actual armor repair implementation
};`;

const newHullRepairPlaceholder = `// Hull Repair System — NOW MODULE-BASED  
// Hull repair is now handled by the 'repair_drone' cycling module
// Use 'Q' key to activate hull repair cycle (Shift+Q to overheat)
window.updateHullRepair = function() {
  // Legacy function - hull repair now handled by module cycling system
  // See window.applyModuleEffect() for actual hull repair implementation  
};`;

html = safeReplace(html, oldArmorRepair, newArmorRepairPlaceholder);
html = safeReplace(html, oldHullRepair, newHullRepairPlaceholder);

// ══ WRITE RESULT ══
fs.writeFileSync(indexPath, html, 'utf8');

console.log('✅ Module cycling system implementation complete!');
console.log('');
console.log('🎯 IMPLEMENTED FEATURES:');
console.log('   • Module Cycling: Shield Booster (10s), Energy Absorber (6s)');
console.log('   • Repair Modules: Hull Repair (12s), Armor Repair (8s)');
console.log('   • Heat System: Overheating reduces cycle time but damages modules'); 
console.log('   • Capacitor Integration: Per-cycle drains instead of continuous');
console.log('   • Module Integrity: 0-100% effectiveness based on heat damage');
console.log('   • Damage Tracking: Energy absorber converts recent damage to capacitor');
console.log('');
console.log('🎮 CONTROLS:');
console.log('   • 1-8: Activate mid-slot modules (shield booster, energy absorber)');
console.log('   • Q: Activate hull repair module');
console.log('   • E: Activate armor repair module');
console.log('   • Shift + key: Overheat module (faster cycle, more effect, damages module)');
console.log('');
console.log('⚡ NEXT STEPS:');
console.log('   • Add module UI indicators (cycle progress, heat levels)'); 
console.log('   • Test module cycling in actual combat');
console.log('   • Run QA Board verification');

process.exit(0);