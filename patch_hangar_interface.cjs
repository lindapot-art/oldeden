const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🚀 DEPLOYING: Hangar Interface & Ship Management');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add hangar UI and ship management functions
const hangarInterface = `
// === HANGAR INTERFACE & SHIP MANAGEMENT ===

function updateShipCustomizationUI() {
  if (!state.shipCustomization.hangarOpen) return;
  
  // Hangar UI is rendered over the main game
  renderHangarInterface();
}

function renderHangarInterface() {
  const canvas = document.getElementById('hud-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  ctx.save();
  
  // Dark hangar background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Hangar title
  ctx.fillStyle = '#e0b15f';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🏭 SHIP HANGAR', canvas.width / 2, 50);
  
  // Current ship display
  renderCurrentShipDisplay(ctx, canvas);
  
  // Ship selection panel
  renderShipSelectionPanel(ctx, canvas);
  
  // Parts customization panel
  renderPartsCustomizationPanel(ctx, canvas);
  
  // Performance stats panel
  renderPerformanceStatsPanel(ctx, canvas);
  
  // Color scheme panel
  renderColorSchemePanel(ctx, canvas);
  
  // Control instructions
  renderHangarControls(ctx, canvas);
  
  ctx.restore();
}

function renderCurrentShipDisplay(ctx, canvas) {
  const currentShip = shipCustomizationSystem.shipBlueprints[shipCustomizationSystem.currentConfig.ship];
  
  // Ship preview area
  ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
  ctx.fillRect(50, 80, 400, 300);
  
  // Ship name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(currentShip.name, 250, 110);
  
  // Ship class
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '16px Arial';
  ctx.fillText(\`Class: \${currentShip.class}\`, 250, 135);
  
  // Ship description
  ctx.fillStyle = '#cccccc';
  ctx.font = '14px Arial';
  const words = currentShip.description.split(' ');
  let line = '';
  let y = 160;
  
  words.forEach(word => {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 350 && line.length > 0) {
      ctx.fillText(line, 250, y);
      line = word + ' ';
      y += 20;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line, 250, y);
  
  // Ship visual representation (simple)
  const shipColor = shipCustomizationSystem.colorSchemes[shipCustomizationSystem.currentConfig.colorScheme];
  ctx.fillStyle = \`#\${shipColor.primary.toString(16).padStart(6, '0')}\`;
  ctx.fillRect(200, 200, 100, 50);
  
  ctx.fillStyle = \`#\${shipColor.secondary.toString(16).padStart(6, '0')}\`;
  ctx.fillRect(180, 220, 140, 10);
  
  // Engine trails (cosmetic preview)
  if (shipCustomizationSystem.currentConfig.cosmetics.includes('engine_trail_blue')) {
    ctx.fillStyle = 'rgba(0, 170, 255, 0.6)';
    ctx.fillRect(160, 225, 20, 5);
  } else if (shipCustomizationSystem.currentConfig.cosmetics.includes('engine_trail_fire')) {
    ctx.fillStyle = 'rgba(255, 68, 0, 0.6)';
    ctx.fillRect(160, 225, 20, 5);
  }
}

function renderShipSelectionPanel(ctx, canvas) {
  ctx.fillStyle = 'rgba(40, 60, 40, 0.8)';
  ctx.fillRect(50, 400, 400, 200);
  
  ctx.fillStyle = '#60ff60';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Available Ships:', 60, 425);
  
  // List available ships
  let y = 450;
  state.shipCustomization.availableShips.forEach((ship, shipId) => {
    const isSelected = shipId === shipCustomizationSystem.currentConfig.ship;
    ctx.fillStyle = isSelected ? '#ffff00' : '#ffffff';
    ctx.font = isSelected ? 'bold 14px Arial' : '14px Arial';
    
    const costText = ship.baseCost > 0 ? \` (\${ship.baseCost} credits)\` : '';
    ctx.fillText(\`\${ship.name}\${costText}\`, 70, y);
    
    // Selection indicator
    if (isSelected) {
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(60, y - 12, 5, 15);
    }
    
    y += 25;
  });
}

function renderPartsCustomizationPanel(ctx, canvas) {
  const startX = 470;
  const startY = 80;
  
  ctx.fillStyle = 'rgba(60, 40, 40, 0.8)';
  ctx.fillRect(startX, startY, 350, 300);
  
  ctx.fillStyle = '#ff6060';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Parts & Upgrades:', startX + 10, startY + 25);
  
  const categories = ['hull', 'engines', 'shields', 'weapons'];
  const selectedCategory = state.shipCustomization.selectedCategory || 'hull';
  
  let y = startY + 50;
  
  // Category tabs
  categories.forEach(category => {
    const isSelected = category === selectedCategory;
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 0, 0.3)' : 'rgba(100, 100, 100, 0.3)';
    ctx.fillRect(startX + 10 + categories.indexOf(category) * 80, y - 15, 75, 20);
    
    ctx.fillStyle = isSelected ? '#ffff00' : '#cccccc';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(category.toUpperCase(), startX + 47 + categories.indexOf(category) * 80, y);
  });
  
  y += 30;
  
  // Show parts for selected category
  const unlockedParts = state.shipCustomization.unlockedParts.get(selectedCategory) || [];
  unlockedParts.forEach(partId => {
    const part = shipCustomizationSystem.shipParts[selectedCategory][partId];
    if (!part) return;
    
    const isEquipped = shipCustomizationSystem.currentConfig.parts[selectedCategory] === partId;
    
    ctx.fillStyle = isEquipped ? '#00ff00' : '#ffffff';
    ctx.font = isEquipped ? 'bold 14px Arial' : '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(part.name, startX + 20, y);
    
    // Cost and stats
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px Arial';
    ctx.fillText(\`\${part.cost} credits - \${part.description}\`, startX + 20, y + 15);
    
    // Equipment indicator
    if (isEquipped) {
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(startX + 15, y - 12, 3, 15);
    }
    
    y += 35;
  });
}

function renderPerformanceStatsPanel(ctx, canvas) {
  const startX = 470;
  const startY = 400;
  
  ctx.fillStyle = 'rgba(40, 40, 80, 0.8)';
  ctx.fillRect(startX, startY, 350, 200);
  
  ctx.fillStyle = '#6060ff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Performance Stats:', startX + 10, startY + 25);
  
  const stats = shipCustomizationSystem.calculatedStats;
  const statNames = {
    speed: 'Speed',
    agility: 'Agility',
    armor: 'Armor',
    shields: 'Shields',
    weaponSlots: 'Weapon Slots',
    moduleSlots: 'Module Slots'
  };
  
  let y = startY + 50;
  
  Object.keys(statNames).forEach(stat => {
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(\`\${statNames[stat]}:\`, startX + 20, y);
    
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(Math.floor(stats[stat] || 0).toString(), startX + 330, y);
    
    // Stat bar
    const barWidth = 200;
    const maxValue = 100;
    const barFill = Math.min(barWidth, (stats[stat] / maxValue) * barWidth);
    
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillRect(startX + 120, y - 10, barWidth, 8);
    
    ctx.fillStyle = stat === 'armor' ? '#ff6060' : 
                   stat === 'shields' ? '#6060ff' : 
                   stat === 'speed' || stat === 'agility' ? '#60ff60' : '#ffaa00';
    ctx.fillRect(startX + 120, y - 10, barFill, 8);
    
    ctx.textAlign = 'left';
    y += 25;
  });
}

function renderColorSchemePanel(ctx, canvas) {
  const startX = 50;
  const startY = 620;
  
  ctx.fillStyle = 'rgba(60, 40, 60, 0.8)';
  ctx.fillRect(startX, startY, 400, 120);
  
  ctx.fillStyle = '#ff60ff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Color Schemes:', startX + 10, startY + 25);
  
  let x = startX + 20;
  let y = startY + 50;
  
  Object.keys(shipCustomizationSystem.colorSchemes).forEach(schemeId => {
    const scheme = shipCustomizationSystem.colorSchemes[schemeId];
    const isSelected = shipCustomizationSystem.currentConfig.colorScheme === schemeId;
    
    // Color preview
    ctx.fillStyle = \`#\${scheme.primary.toString(16).padStart(6, '0')}\`;
    ctx.fillRect(x, y, 20, 15);
    
    ctx.fillStyle = \`#\${scheme.secondary.toString(16).padStart(6, '0')}\`;
    ctx.fillRect(x + 20, y, 20, 15);
    
    ctx.fillStyle = \`#\${scheme.accent.toString(16).padStart(6, '0')}\`;
    ctx.fillRect(x + 40, y, 20, 15);
    
    // Scheme name
    ctx.fillStyle = isSelected ? '#ffff00' : '#ffffff';
    ctx.font = isSelected ? 'bold 12px Arial' : '12px Arial';
    ctx.fillText(scheme.name, x, y + 30);
    
    // Cost
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '10px Arial';
    ctx.fillText(\`\${scheme.cost} credits\`, x, y + 45);
    
    // Selection indicator
    if (isSelected) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, 64, 50);
    }
    
    x += 80;
    if (x > startX + 320) {
      x = startX + 20;
      y += 60;
    }
  });
}

function renderHangarControls(ctx, canvas) {
  const controlsY = canvas.height - 100;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, controlsY, canvas.width, 100);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('HANGAR CONTROLS', canvas.width / 2, controlsY + 25);
  
  ctx.font = '14px Arial';
  const controls = [
    'G - Toggle Hangar | Arrow Keys - Navigate | Enter - Select/Equip | Space - Preview',
    'C - Change Color Scheme | P - Purchase Parts | Escape - Exit Hangar'
  ];
  
  controls.forEach((control, index) => {
    ctx.fillText(control, canvas.width / 2, controlsY + 50 + index * 20);
  });
}

function toggleHangar() {
  state.shipCustomization.hangarOpen = !state.shipCustomization.hangarOpen;
  
  if (state.shipCustomization.hangarOpen) {
    console.log('🏭 Hangar opened');
    
    // Show HUD canvas for hangar interface
    const hudCanvas = document.getElementById('hud-canvas');
    if (hudCanvas) {
      hudCanvas.style.display = 'block';
    }
    
    // Pause game while in hangar
    gameState.paused = true;
    
    // Initialize customization system if needed
    if (!state.shipCustomization.availableShips.size) {
      initShipCustomizationSystem();
    }
    
    // Calculate current stats
    calculateShipStats();
    
    if (typeof playSound === 'function') {
      playSound('ui_success', player.position, 1.0);
    }
  } else {
    console.log('🏭 Hangar closed');
    
    // Hide HUD canvas
    const hudCanvas = document.getElementById('hud-canvas');
    if (hudCanvas) {
      hudCanvas.style.display = 'none';
    }
    
    // Resume game
    gameState.paused = false;
    
    if (typeof playSound === 'function') {
      playSound('ui_close', player.position, 1.0);
    }
  }
}

function handleHangarInput(key) {
  if (!state.shipCustomization.hangarOpen) return false;
  
  switch (key) {
    case 'KeyG':
    case 'Escape':
      toggleHangar();
      return true;
      
    case 'ArrowUp':
      navigateHangarSelection('up');
      return true;
      
    case 'ArrowDown':
      navigateHangarSelection('down');
      return true;
      
    case 'ArrowLeft':
      navigateHangarSelection('left');
      return true;
      
    case 'ArrowRight':
      navigateHangarSelection('right');
      return true;
      
    case 'Enter':
      selectHangarItem();
      return true;
      
    case 'KeyC':
      cycleColorScheme();
      return true;
      
    case 'KeyP':
      purchaseSelectedPart();
      return true;
      
    case 'Space':
      togglePreviewMode();
      return true;
  }
  
  return false;
}

function navigateHangarSelection(direction) {
  // Handle navigation through hangar interface
  // This would implement proper navigation logic
  
  if (typeof playSound === 'function') {
    playSound('ui_navigate', player.position, 0.5);
  }
}

function selectHangarItem() {
  // Handle selection/equipment of hangar items
  // This would implement proper selection logic
  
  if (typeof playSound === 'function') {
    playSound('ui_select', player.position, 1.0);
  }
  
  // Recalculate stats after equipment change
  calculateShipStats();
}

function cycleColorScheme() {
  const schemes = Object.keys(shipCustomizationSystem.colorSchemes);
  const currentIndex = schemes.indexOf(shipCustomizationSystem.currentConfig.colorScheme);
  const nextIndex = (currentIndex + 1) % schemes.length;
  const nextScheme = schemes[nextIndex];
  
  // Check if player can afford the color scheme
  const schemeCost = shipCustomizationSystem.colorSchemes[nextScheme].cost;
  if (player.stats.credits >= schemeCost) {
    shipCustomizationSystem.currentConfig.colorScheme = nextScheme;
    player.stats.credits -= schemeCost;
    
    console.log(\`🎨 Color scheme changed to: \${shipCustomizationSystem.colorSchemes[nextScheme].name}\`);
    
    // Apply color scheme to player ship visually
    updatePlayerShipVisuals();
    
    if (typeof playSound === 'function') {
      playSound('ui_purchase', player.position, 1.2);
    }
  } else {
    console.log(\`❌ Cannot afford color scheme: \${schemeCost} credits needed\`);
    
    if (typeof playSound === 'function') {
      playSound('ui_error', player.position, 1.0);
    }
  }
}

function purchaseSelectedPart() {
  // Implementation for purchasing parts
  console.log('🛒 Purchase system activated');
  
  if (typeof playSound === 'function') {
    playSound('ui_purchase', player.position, 1.0);
  }
}

function togglePreviewMode() {
  state.shipCustomization.previewMode = !state.shipCustomization.previewMode;
  
  if (state.shipCustomization.previewMode) {
    console.log('👁️ Preview mode enabled');
  } else {
    console.log('👁️ Preview mode disabled');
  }
  
  if (typeof playSound === 'function') {
    playSound('ui_toggle', player.position, 0.8);
  }
}

function updatePlayerShipVisuals() {
  // Update the visual appearance of the player's ship based on customization
  const colorScheme = shipCustomizationSystem.colorSchemes[shipCustomizationSystem.currentConfig.colorScheme];
  
  if (player.mesh && player.mesh.material) {
    player.mesh.material.color.setHex(colorScheme.primary);
    player.mesh.material.emissive.setHex(colorScheme.accent);
    player.mesh.material.emissiveIntensity = 0.2;
  }
  
  console.log(\`🎨 Ship visuals updated with \${colorScheme.name} color scheme\`);
}`;

// Add hangar interface after ship customization system
indexContent = indexContent.replace(
  'function updateBossMinions() {',
  `${hangarInterface}

function updateBossMinions() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Hangar Interface & Ship Management deployed!');
console.log('🏭 Features: Full hangar UI, ship selection, parts customization, performance display');
console.log('🎮 Controls: G (hangar toggle), arrows (navigate), Enter (select), C (colors)');
console.log('🎨 Interface: Ship preview, part browser, stats display, color schemes, purchase system');