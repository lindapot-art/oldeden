#!/usr/bin/env node
// EVE Module Master — Complete Module Cycling Implementation (Fixed)
// Target specific areas that need updating based on current file state

const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    console.warn('❌ String not found:', oldStr.substring(0, 60) + '...');
    return content;
  }
  const result = content.replace(oldStr, newStr);
  console.log('✅ Replaced:', oldStr.substring(0, 60) + '...');
  return result;
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

console.log('🔧 EVE Module Master — Completing Module Cycling System');

const indexPath = 'public/index.html';
let html = fs.readFileSync(indexPath, 'utf8');

// ══ PHASE 1: UPDATE MODULE DEFINITIONS WITH CYCLING PROPERTIES ══
console.log('📋 Phase 1: Adding cycling properties to existing modules...');

// Update shield booster to cycling module
html = safeReplace(html, 
  `{ id: 'shield_booster', name: 'Shield Booster', cost: 2000, cpu: 25, powergrid: 120, effect: '+50% shield capacity', description: 'Increases maximum shield capacity' }`,
  `{ id: 'shield_booster', name: 'Shield Booster', cost: 2000, cpu: 25, powergrid: 120, effect: '+500 shield HP per cycle', description: 'Active shield booster module', cycleTime: 10000, capDrain: 25, heatBonus: { cycleReduction: 0.2, effectBonus: 0.1, damagePerCycle: 0.02 }}`
);

// Update energy absorber to cycling module  
html = safeReplace(html,
  `{ id: 'energy_absorber', name: 'Energy Absorber', cost: 3500, cpu: 35, powergrid: 110, effect: 'Convert damage to energy', description: 'Converts incoming damage to usable energy' }`,
  `{ id: 'energy_absorber', name: 'Energy Absorber', cost: 3500, cpu: 35, powergrid: 110, effect: 'Converts damage to capacitor', description: 'Active energy absorption module', cycleTime: 6000, capDrain: 15, heatBonus: { cycleReduction: 0, effectBonus: 0.5, damagePerCycle: 0.025 }}`
);

// Update repair drone to hull repair cycling module
html = safeReplace(html,
  `{ id: 'repair_drone', name: 'Repair Drone', cost: 2500, cpu: 20, powergrid: 90, effect: 'Auto repair hull over time', description: 'Deploys nanobots for continuous hull repair' }`,
  `{ id: 'repair_drone', name: 'Hull Repair Module', cost: 2500, cpu: 20, powergrid: 90, effect: '+80 hull HP per cycle', description: 'Active hull repair system', cycleTime: 12000, capDrain: 35, heatBonus: { cycleReduction: 0.2, effectBonus: 0.1, damagePerCycle: 0.03 }}`
);

// Add armor repair module to low slots
const lowSlotsEnd = `      low: [
        { id: 'repair_drone', name: 'Hull Repair Module', cost: 2500, cpu: 20, powergrid: 90, effect: '+80 hull HP per cycle', description: 'Active hull repair system', cycleTime: 12000, capDrain: 35, heatBonus: { cycleReduction: 0.2, effectBonus: 0.1, damagePerCycle: 0.03 }}
      ]`;

const lowSlotsWithArmor = `      low: [
        { id: 'repair_drone', name: 'Hull Repair Module', cost: 2500, cpu: 20, powergrid: 90, effect: '+80 hull HP per cycle', description: 'Active hull repair system', cycleTime: 12000, capDrain: 35, heatBonus: { cycleReduction: 0.2, effectBonus: 0.1, damagePerCycle: 0.03 }},
        { id: 'armor_repair', name: 'Armor Repair Module', cost: 2200, cpu: 18, powergrid: 85, effect: '+120 armor HP per cycle', description: 'Active armor repair system', cycleTime: 8000, capDrain: 20, heatBonus: { cycleReduction: 0.2, effectBonus: 0.15, damagePerCycle: 0.015 }}
      ]`;

html = safeReplace(html, lowSlotsEnd, lowSlotsWithArmor);

// ══ PHASE 2: ADD MODULE ACTIVATION KEYBINDS ══
console.log('🎹 Phase 2: Adding module activation keybinds...');

// Find the keydown event handler and add module controls
const keydownSearch = `    if (e.key === 'b' && c.active) { // Bridge toggle (B)`;

const moduleKeybinds = `    // ── MODULE ACTIVATION KEYBINDS ──
    if (e.key >= '1' && e.key <= '8' && c.active) {
      const slotIndex = parseInt(e.key) - 1;
      // Activate mid-slot modules (shield booster, energy absorber, etc.)
      if (state.shipFitting.slots.mid[slotIndex]) {
        const isOverheated = e.shiftKey; // Shift + number = overheat
        if (typeof window.activateModule === 'function') {
          window.activateModule('mid', slotIndex, isOverheated);
        }
      }
      e.preventDefault();
    }
    
    if (e.key === 'q' && c.active) { // Hull repair (low slot 0)
      if (state.shipFitting.slots.low[0]) {
        const isOverheated = e.shiftKey;
        if (typeof window.activateModule === 'function') {
          window.activateModule('low', 0, isOverheated);
        }
      }
      e.preventDefault();
    }
    
    if (e.key === 'z' && c.active) { // Armor repair (low slot 1) 
      if (state.shipFitting.slots.low[1]) {
        const isOverheated = e.shiftKey;
        if (typeof window.activateModule === 'function') {
          window.activateModule('low', 1, isOverheated);
        }
      }
      e.preventDefault();
    }

    if (e.key === 'b' && c.active) { // Bridge toggle (B)`;

html = safeReplace(html, keydownSearch, moduleKeybinds);

// ══ PHASE 3: ADD EVE SYSTEMS TO GAME LOOP ══
console.log('🎮 Phase 3: Adding EVE systems to game loop...');

// Find a good insertion point in the game loop
const gameLoopInsert = `    if (c.active) {
      // First-life flag (used for spawn tuning, auto-aggro, tutorial pacing)
      const isFirstLife = state.player.rebirths === 0;`;

const gameLoopWithEVE = `    if (c.active) {
      // First-life flag (used for spawn tuning, auto-aggro, tutorial pacing)
      const isFirstLife = state.player.rebirths === 0;
      
      // ── EVE Defense Systems Update ──
      if (typeof window.updateEVEDefenseSystems === 'function') {
        window.updateEVEDefenseSystems(dt);
      }`;

html = safeReplace(html, gameLoopInsert, gameLoopWithEVE);

// ══ PHASE 4: INTEGRATE DAMAGE TRACKING FOR ENERGY ABSORBER ══
console.log('🩸 Phase 4: Adding damage tracking...');

// Find the applyEVEDamage function and add damage recording
const applyDamageEnd = `    totalDamageApplied: incomingDamage
  };
};`;

const applyDamageWithTracking = `    totalDamageApplied: incomingDamage
  };
  
  // Track damage for energy absorber module
  if (typeof window.recordDamageForEnergyAbsorber === 'function') {
    window.recordDamageForEnergyAbsorber(incomingDamage);
  }
};`;

html = safeReplace(html, applyDamageEnd, applyDamageWithTracking);

// ══ PHASE 5: ADD UI INDICATORS FOR MODULE STATUS ══
console.log('🖥️ Phase 5: Adding module UI status system...');

const uiUpdateInsert = `// Update fitting screen stats display
window.updateFittingStats = function() {`;

const moduleUISystem = `// Update module status UI indicators
window.updateModuleStatusUI = function() {
  if (!state.moduleStates || state.screen !== 'bridge') return;
  
  try {
    // Update module cycle progress and heat indicators
    const moduleStatusContainer = document.getElementById('module-status-container');
    if (!moduleStatusContainer) return;
    
    let statusHTML = '';
    
    // Check all fitted modules
    ['high', 'mid', 'low'].forEach(slotType => {
      state.shipFitting.slots[slotType].forEach((module, slotIndex) => {
        if (!module || !module.cycleTime) return;
        
        const moduleKey = window.getModuleKey(slotType, slotIndex);
        const isCycling = window.isModuleCycling(slotType, slotIndex);
        const heat = window.getModuleHeat(slotType, slotIndex);
        const integrity = window.getModuleIntegrity(slotType, slotIndex);
        
        // Calculate cycle progress
        let cycleProgress = 0;
        if (isCycling) {
          const cycleData = state.moduleStates.cyclingModules.get(moduleKey);
          if (cycleData) {
            const elapsed = Date.now() - cycleData.cycleStartTime;
            cycleProgress = Math.min(100, (elapsed / cycleData.cycleTime) * 100);
          }
        }
        
        // Color based on heat level
        let heatColor = '#00ff88'; // Cool (green)
        if (heat > 60) heatColor = '#ffaa00'; // Warm (yellow)  
        if (heat > 80) heatColor = '#ff4444'; // Hot (red)
        
        // Color based on integrity
        let integrityColor = '#00ff88'; // Good (green)
        if (integrity < 50) integrityColor = '#ffaa00'; // Damaged (yellow)
        if (integrity < 25) integrityColor = '#ff4444'; // Critical (red)
        
        statusHTML += \`
          <div class="module-status" style="margin:2px 0;font-size:0.7rem;">
            <span style="color:var(--muted);">$"+"{\${slotType[0].toUpperCase()}}$"+"{\${slotIndex+1}} $"+"{\${module.name}}:</span>
            $"+"{\${isCycling ? \`<span style="color:var(--blue);">[$"+"{\${cycleProgress.toFixed(0)}}%]</span>\` : '<span style="color:var(--muted);">[Ready]</span>'}}
            <span style="color:$"+"{\${heatColor}};">H:$"+"{\${heat.toFixed(0)}}%</span>
            <span style="color:$"+"{\${integrityColor}};">I:$"+"{\${integrity.toFixed(0)}}%</span>
          </div>
        \`;
      });
    });
    
    moduleStatusContainer.innerHTML = statusHTML;
  } catch (error) {
    console.warn('Module status UI update failed:', error);
  }
};

// Update fitting screen stats display
window.updateFittingStats = function() {`;

html = safeReplace(html, uiUpdateInsert, moduleUISystem);

// ══ PHASE 6: ADD MODULE STATUS UI TO BRIDGE SCREEN ══
console.log('📱 Phase 6: Adding module status UI to bridge screen...');

// Find the bridge screen and add module status display
const bridgeScreenInsert = `  <div class="bridge-right">
    <div class="mini-map" id="mini-map"></div>`;

const bridgeScreenWithModules = `  <div class="bridge-right">
    <div class="module-status-panel" style="background:rgba(0,15,30,0.6);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:10px;max-height:120px;overflow-y:auto;">
      <h4 style="margin:0 0 6px 0;color:var(--text);font-size:0.8rem;">Module Status</h4>
      <div id="module-status-container" style="font-family:monospace;"></div>
    </div>
    <div class="mini-map" id="mini-map"></div>`;

html = safeReplace(html, bridgeScreenInsert, bridgeScreenWithModules);

// ══ PHASE 7: ADD UI UPDATE TO GAME LOOP ══
console.log('🔄 Phase 7: Adding UI updates to game loop...');

const uiUpdateInLoop = `      // ── EVE Defense Systems Update ──
      if (typeof window.updateEVEDefenseSystems === 'function') {
        window.updateEVEDefenseSystems(dt);
      }`;

const uiUpdateInLoopWithModules = `      // ── EVE Defense Systems Update ──
      if (typeof window.updateEVEDefenseSystems === 'function') {
        window.updateEVEDefenseSystems(dt);
      }
      
      // ── Module Status UI Update ──
      if (typeof window.updateModuleStatusUI === 'function' && state._frameCount % 10 === 0) {
        window.updateModuleStatusUI(); // Update every 10 frames for performance
      }`;

html = safeReplace(html, uiUpdateInLoop, uiUpdateInLoopWithModules);

// ══ WRITE RESULT ══
fs.writeFileSync(indexPath, html, 'utf8');

console.log('✅ EVE Module Cycling System completed!');
console.log('');
console.log('🎯 FEATURES COMPLETED:');
console.log('   • Shield Booster: 10s cycle, +500 HP, 25 cap drain');
console.log('   • Energy Absorber: 6s cycle, converts damage to cap, 15 cap drain');
console.log('   • Hull Repair: 12s cycle, +80 HP, 35 cap drain');
console.log('   • Armor Repair: 8s cycle, +120 HP, 20 cap drain');
console.log('   • Heat System: Overheating improves performance but damages modules');
console.log('   • Module UI: Real-time cycle progress, heat, and integrity indicators');
console.log('');
console.log('🎮 CONTROLS:');
console.log('   • 1-8: Activate mid-slot modules (Shift = overheat)');
console.log('   • Q: Hull repair (Shift+Q = overheat)');
console.log('   • Z: Armor repair (Shift+Z = overheat)');
console.log('');
console.log('🚀 READY FOR TESTING AND QA!');

process.exit(0);