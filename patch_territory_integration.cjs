const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🏗️ DEPLOYING: Territory System Integration & Controls');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add territory system initialization
const territorySystemInit = `    // Initialize territory system
    initTerritorySystem();`;

// Add after multiplayer init
indexContent = indexContent.replace(
  '    // Initialize multiplayer system',
  `    // Initialize territory system
    initTerritorySystem();
    
    // Initialize multiplayer system`
);

// Add territory controls
const territoryControls = `        case 'KeyB': // Build menu
          if (threeReady && territorySystem.selectedTerritory) {
            showBuildMenu();
          }
          break;
        
        case 'KeyR': // Resources/Territory panel
          if (threeReady) {
            if (territorySystem.territoryUI.panel.style.display === 'block') {
              hideTerritoryPanel();
            } else if (territorySystem.selectedTerritory) {
              showTerritoryPanel();
            }
          }
          break;
        
        case 'KeyN': // Next territory
          if (threeReady) {
            selectNextTerritory();
          }
          break;

`;

// Add territory controls after multiplayer controls
indexContent = indexContent.replace(
  `        case 'KeyM': // Change game mode`,
  `        case 'KeyB': // Build menu
          if (threeReady && territorySystem.selectedTerritory) {
            showBuildMenu();
          }
          break;
        
        case 'KeyR': // Resources/Territory panel
          if (threeReady) {
            if (territorySystem.territoryUI.panel.style.display === 'block') {
              hideTerritoryPanel();
            } else if (territorySystem.selectedTerritory) {
              showTerritoryPanel();
            }
          }
          break;
        
        case 'KeyN': // Next territory
          if (threeReady) {
            selectNextTerritory();
          }
          break;

        case 'KeyM': // Change game mode`
);

// Add territory updates to game loop
const territoryUpdate = `      // Update territory system
      updateTerritorySystem(deltaTime);`;

// Add after multiplayer updates
indexContent = indexContent.replace(
  '      // Update multiplayer system',
  `      // Update territory system
      updateTerritorySystem(deltaTime);
      
      // Update multiplayer system`
);

// Add territory interaction and update functions
const territoryGameplayFunctions = `
function updateTerritorySystem(deltaTime) {
    // Update construction projects
    updateConstruction(deltaTime);
    
    // Update resource production
    updateResourceProduction(deltaTime);
    
    // Update territory control
    updateTerritoryControl(deltaTime);
    
    // Update territory markers
    updateTerritoryMarkers(deltaTime);
}

function updateConstruction(deltaTime) {
    territorySystem.territories.forEach(territory => {
        if (territory.buildings) {
            territory.buildings.forEach((building, buildingId) => {
                if (building.operational) {
                    // Building is producing resources
                    const productionRate = getProductionRate(buildingId, building);
                    if (productionRate > 0) {
                        state.player.score += productionRate * deltaTime * 0.001;
                    }
                }
            });
        }
    });
}

function getProductionRate(buildingId, building) {
    const baseRates = {
        'command_center': 2,   // Control bonus
        'mining_station': 5,   // Resource generation
        'defense_turret': 0,   // No direct production
        'research_lab': 3,     // Tech points
        'hangar': 1,          // Ship maintenance
        'shield_generator': 0  // Defense only
    };
    
    return baseRates[buildingId] || 0;
}

function updateResourceProduction(deltaTime) {
    // Calculate total resource production from all controlled territories
    let totalProduction = 0;
    
    territorySystem.territories.forEach(territory => {
        if (territory.controller === 'player') {
            totalProduction += territory.resourceValue * 0.01 * deltaTime * 0.001;
        }
    });
    
    state.player.score += totalProduction;
}

function updateTerritoryControl(deltaTime) {
    // Check for territory contests and control changes
    territorySystem.territories.forEach(territory => {
        if (territory.contestedBy.length > 0) {
            // Territory is being contested - animate marker
            if (territory.marker) {
                territory.marker.material.color.setHex(0xffff00); // Yellow for contested
                territory.marker.rotation.z += deltaTime * 0.003; // Spin contested territories
            }
        }
    });
}

function updateTerritoryMarkers(deltaTime) {
    territorySystem.territories.forEach(territory => {
        if (territory.resourceIndicator) {
            // Animate resource indicators
            territory.resourceIndicator.rotation.y += deltaTime * 0.002;
            territory.resourceIndicator.position.y = territory.position.y + 20 + Math.sin(Date.now() * 0.001) * 2;
        }
        
        // Pulse controlled territories
        if (territory.controller === 'player' && territory.marker) {
            const pulseIntensity = 0.7 + Math.sin(Date.now() * 0.002) * 0.3;
            territory.marker.material.opacity = pulseIntensity;
        }
    });
}

function selectNextTerritory() {
    const territories = Array.from(territorySystem.territories.values());
    if (territories.length === 0) return;
    
    let currentIndex = territories.findIndex(t => t === territorySystem.selectedTerritory);
    currentIndex = (currentIndex + 1) % territories.length;
    
    const nextTerritory = territories[currentIndex];
    selectTerritory(nextTerritory);
    
    // Move camera view to territory (optional - smooth camera movement)
    if (nextTerritory.position) {
        console.log(\`🗺️ Selected \${nextTerritory.name}\`);
    }
}

// Add click interaction for territories
function handleTerritoryClick(object) {
    if (object.userData && object.userData.isTerritory) {
        selectTerritory(object.userData.territory);
        return true;
    }
    
    if (object.userData && object.userData.isBuilding) {
        // Show building info
        console.log(\`🏢 Building: \${object.userData.buildingId.replace('_', ' ').toUpperCase()}\`);
        selectTerritory(object.userData.territory);
        return true;
    }
    
    return false;
}`;

// Add territory gameplay functions
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${territoryGameplayFunctions}

function updateGraphicsQualityNote() {`
);

// Add territory status to UI updates
const territoryStatus = `
        // Territory control status
        const territoryStatus = document.getElementById('territory-status-display');
        if (!territoryStatus) {
            const display = document.createElement('div');
            display.id = 'territory-status-display';
            display.style.cssText = \`
                position: absolute;
                top: 320px;
                right: 10px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                background: rgba(0, 20, 40, 0.8);
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #0080ff;
                z-index: 1000;
            \`;
            document.body.appendChild(display);
        }
        
        const controlledCount = Array.from(territorySystem.territories.values()).filter(t => t.controller === 'player').length;
        const totalCount = territorySystem.territories.size;
        const selectedInfo = territorySystem.selectedTerritory ? 
            \`Selected: \${territorySystem.selectedTerritory.name}\` : 'No territory selected';
        
        document.getElementById('territory-status-display').innerHTML = \`
            <div style="color: #0080ff; font-weight: bold;">🏗️ TERRITORIES</div>
            <div>Controlled: \${controlledCount}/\${totalCount}</div>
            <div style="font-size: 10px;">\${selectedInfo}</div>
            <div style="font-size: 10px; color: #888; margin-top: 4px;">
                B = Build | R = Panel | N = Next
            </div>
        \`;`;

// Add territory status to UI updates section
indexContent = indexContent.replace(
  '        document.getElementById(\'ai-status-display\').innerHTML = `',
  territoryStatus + cr() + cr() + '        document.getElementById(\'ai-status-display\').innerHTML = `'
);

// Add territory click handling to mouse event
if (indexContent.includes('// Handle targeting click')) {
  indexContent = indexContent.replace(
    '// Handle targeting click',
    `// Handle territory click
          if (handleTerritoryClick(intersectedObject)) {
            return;
          }
          
          // Handle targeting click`
  );
}

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Territory System Integration & Controls deployed!');
console.log('🎮 Controls integrated: B = Build, R = Panel, N = Next Territory');
console.log('🏗️ Features: Resource production, territory updates, click interaction');
console.log('📊 UI: Territory status panel, controlled count, selection display');