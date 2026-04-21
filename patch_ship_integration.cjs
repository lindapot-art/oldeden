const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🚀 DEPLOYING: Ship Customization Integration & Game Loop');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add ship customization controls to keyboard handler
const shipCustomizationControls = `        
        // === SHIP CUSTOMIZATION CONTROLS ===
        case 'KeyG': // Toggle hangar
          toggleHangar();
          break;
          
        case 'KeyZ': // Quick color cycle (in-game)
          if (!state.shipCustomization.hangarOpen) {
            cycleColorScheme();
          }
          break;
          
        case 'KeyX': // Ship stats display
          if (!state.shipCustomization.hangarOpen) {
            console.log('🚀 Current Ship Stats:');
            const stats = shipCustomizationSystem.calculatedStats;
            console.log(\`Speed: \${Math.floor(stats.speed)}, Agility: \${Math.floor(stats.agility)}\`);
            console.log(\`Armor: \${Math.floor(stats.armor)}, Shields: \${Math.floor(stats.shields)}\`);
            console.log(\`Weapon Slots: \${stats.weaponSlots}, Module Slots: \${stats.moduleSlots}\`);
          }
          break;`;

// Add ship customization controls to existing keyboard handler
indexContent = indexContent.replace(
  '        case \'KeyK\': // Target nearest boss',
  `${shipCustomizationControls}
          
        case 'KeyK': // Target nearest boss`
);

// Handle hangar input in keyboard event
const hangarInputHandler = `
      // Handle hangar interface input
      if (handleHangarInput(event.code)) {
        return; // Hangar consumed the input
      }
      
      `;

// Add hangar input handling to keyboard event
indexContent = indexContent.replace(
  '      switch (event.code) {',
  `${hangarInputHandler}switch (event.code) {`
);

// Add ship customization UI to main UI rendering
const shipCustomizationUI = `
      // === SHIP CUSTOMIZATION STATUS ===
      if (!state.shipCustomization.hangarOpen) {
        // Ship status indicator (bottom left)
        const currentShip = shipCustomizationSystem.shipBlueprints[shipCustomizationSystem.currentConfig.ship];
        const colorScheme = shipCustomizationSystem.colorSchemes[shipCustomizationSystem.currentConfig.colorScheme];
        
        ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
        ctx.fillRect(20, canvas.height - 150, 300, 80);
        
        // Ship name and class
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(\`🚀 \${currentShip.name}\`, 30, canvas.height - 125);
        
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px Arial';
        ctx.fillText(\`Class: \${currentShip.class}\`, 30, canvas.height - 110);
        
        // Quick stats
        const stats = shipCustomizationSystem.calculatedStats;
        ctx.fillStyle = '#60ff60';
        ctx.font = '11px Arial';
        ctx.fillText(\`SPD:\${Math.floor(stats.speed)} AGI:\${Math.floor(stats.agility)} ARM:\${Math.floor(stats.armor)} SLD:\${Math.floor(stats.shields)}\`, 30, canvas.height - 95);
        
        // Color scheme indicator
        ctx.fillStyle = \`#\${colorScheme.primary.toString(16).padStart(6, '0')}\`;
        ctx.fillRect(270, canvas.height - 140, 15, 15);
        ctx.fillStyle = \`#\${colorScheme.secondary.toString(16).padStart(6, '0')}\`;
        ctx.fillRect(270, canvas.height - 125, 15, 15);
        ctx.fillStyle = \`#\${colorScheme.accent.toString(16).padStart(6, '0')}\`;
        ctx.fillRect(270, canvas.height - 110, 15, 15);
        
        // Customization credits
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(\`Hangar Credits: \${player.stats.credits}\`, 30, canvas.height - 80);
      }
      
      // Render hangar interface if open
      updateShipCustomizationUI();
      
      // === SHIP CUSTOMIZATION CONTROLS HELP ===
      if (showControls) {
        const shipControlsText = [
          '',
          '=== SHIP CONTROLS ===',
          'G - Open/Close Hangar',
          'Z - Quick Color Change',
          'X - Show Ship Stats'
        ];
        
        let yOffset = 620;
        shipControlsText.forEach(line => {
          if (line.startsWith('===')) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 14px Arial';
          } else {
            ctx.fillStyle = '#cccccc';
            ctx.font = '12px Arial';
          }
          ctx.textAlign = 'left';
          ctx.fillText(line, canvas.width - 280, yOffset);
          yOffset += 18;
        });
      }`;

// Add ship customization UI to existing UI rendering
indexContent = indexContent.replace(
  '      // === BOSS CONTROLS HELP ===',
  `${shipCustomizationUI}
      
      // === BOSS CONTROLS HELP ===`
);

// Update game loop to include ship customization system
const gameLoopShipIntegration = `    // Update ship customization system
    if (state.shipCustomization.hangarOpen) {
      updateShipCustomizationUI();
    } else {
      // Apply ship performance in-game
      applyShipPerformanceEffects();
    }
    
    `;

// Add ship system to game loop
indexContent = indexContent.replace(
  '    // Update boss system',
  `${gameLoopShipIntegration}// Update boss system`
);

// Add ship performance effects
const shipPerformanceEffects = `
// === SHIP PERFORMANCE EFFECTS ===

function applyShipPerformanceEffects() {
  // Apply ship customization effects to gameplay
  const stats = shipCustomizationSystem.calculatedStats;
  
  // Update player movement based on ship stats
  const baseSpeed = 25; // Default speed
  player.maxSpeed = stats.speed || baseSpeed;
  player.acceleration = (stats.agility || 20) * 0.1;
  
  // Update defensive stats
  player.maxArmor = stats.armor || 15;
  player.maxShields = stats.shields || 10;
  
  // Apply module effects
  shipCustomizationSystem.currentConfig.modules.forEach(moduleId => {
    const module = shipCustomizationSystem.performanceModules[moduleId];
    if (module) {
      applyModuleGameplayEffect(module);
    }
  });
  
  // Apply cosmetic effects
  updateShipCosmeticEffects();
}

function applyModuleGameplayEffect(module) {
  switch (module.effect) {
    case 'accuracy_boost':
      // Apply accuracy boost to targeting system
      if (targetingSystem && targetingSystem.lockOn) {
        targetingSystem.accuracy = Math.min(1.0, (targetingSystem.accuracy || 0.7) * (1 + module.magnitude));
      }
      break;
      
    case 'shield_regen':
      // Apply shield regeneration boost
      if (player.shields < player.maxShields) {
        player.shields = Math.min(player.maxShields, player.shields + (module.magnitude * 0.1));
      }
      break;
      
    case 'damage_reduction':
      // Applied when taking damage
      break;
      
    case 'power_boost':
      // Applied to all systems
      break;
  }
}

function updateShipCosmeticEffects() {
  // Handle engine trails and other cosmetic effects
  const cosmetics = shipCustomizationSystem.currentConfig.cosmetics;
  
  cosmetics.forEach(cosmeticId => {
    const cosmetic = shipCustomizationSystem.cosmeticItems[cosmeticId];
    if (cosmetic && cosmetic.type === 'trail') {
      createShipEngineTrail(cosmetic);
    }
  });
}

function createShipEngineTrail(cosmetic) {
  // Create particle trail behind ship
  if (Math.random() < 0.3) { // Don't create every frame
    const trailParticle = {
      position: new THREE.Vector3(
        player.position.x - 3 + (Math.random() - 0.5),
        player.position.y - 2 + (Math.random() - 0.5),
        player.position.z
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        0
      ),
      color: cosmetic.color,
      life: 1.0,
      size: 0.5 + Math.random() * 0.5
    };
    
    // Add to particle system (if exists) or create simple effect
    if (typeof addParticle === 'function') {
      addParticle(trailParticle);
    }
  }
}

function handleShipDamage(damage, damageType) {
  // Apply ship damage reduction modules
  let actualDamage = damage;
  
  shipCustomizationSystem.currentConfig.modules.forEach(moduleId => {
    const module = shipCustomizationSystem.performanceModules[moduleId];
    if (module && module.effect === 'damage_reduction') {
      actualDamage *= (1 - module.magnitude);
    }
  });
  
  // Apply damage to shields first, then armor
  if (player.shields > 0) {
    const shieldDamage = Math.min(actualDamage, player.shields);
    player.shields -= shieldDamage;
    actualDamage -= shieldDamage;
  }
  
  if (actualDamage > 0) {
    player.armor -= actualDamage;
  }
  
  // Ship damage effects
  if (player.armor <= 0) {
    handleShipDestruction();
  }
}

function handleShipDestruction() {
  // Ship destroyed - handle respawn with ship customization
  console.log('💥 Ship destroyed! Respawning...');
  
  // Reset player position and health
  player.position.set(0, 0, 0);
  player.armor = player.maxArmor;
  player.shields = player.maxShields;
  
  // Small credit penalty
  player.stats.credits = Math.max(0, player.stats.credits - 100);
  
  // Create destruction effect
  createExplosionEffect(player.position.clone(), 8, 0xff4444);
  
  if (typeof playSound === 'function') {
    playSound('ship_destruction', player.position, 2.0);
  }
}`;

// Add ship performance effects before update functions
indexContent = indexContent.replace(
  'function updateBossMinions() {',
  `${shipPerformanceEffects}

function updateBossMinions() {`
);

// Initialize ship customization system
const initShipCustomization = `  // Initialize ship customization system
  initShipCustomizationSystem();
  
  `;

// Add ship customization initialization to init function
indexContent = indexContent.replace(
  '  // Initialize boss system',
  `${initShipCustomization}// Initialize boss system`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Ship Customization Integration & Game Loop deployed!');
console.log('🎮 Controls: G (hangar), Z (quick color), X (ship stats)');
console.log('🚀 Integration: Performance effects, cosmetic trails, damage system');
console.log('💫 Features: Real-time stat application, module effects, ship destruction handling');