const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🏗️ DEPLOYING: Territory UI & Base Building Mechanics');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add base building UI functions
const baseBuildingUI = `
function createTerritoryUI() {
    // Territory Control Panel
    const territoryPanel = document.createElement('div');
    territoryPanel.id = 'territory-panel';
    territoryPanel.style.cssText = \`
        position: absolute;
        top: 150px;
        right: 10px;
        width: 300px;
        background: rgba(0, 20, 40, 0.9);
        border: 2px solid #0080ff;
        border-radius: 8px;
        padding: 15px;
        color: #fff;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        display: none;
        z-index: 1001;
    \`;
    
    territoryPanel.innerHTML = \`
        <div style="text-align: center; font-weight: bold; margin-bottom: 10px; color: #00ff80;">
            🏗️ TERRITORY CONTROL
        </div>
        <div id="territory-info">Select a territory...</div>
        <div id="territory-buildings" style="margin-top: 10px;"></div>
        <div id="construction-options" style="margin-top: 10px;"></div>
        <div style="margin-top: 10px; font-size: 10px; color: #888;">
            B = Build Menu | R = Resources | N = Next Territory
        </div>
    \`;
    
    document.body.appendChild(territoryPanel);
    territorySystem.territoryUI.panel = territoryPanel;
    
    // Base Building Menu
    const buildMenu = document.createElement('div');
    buildMenu.id = 'build-menu';
    buildMenu.style.cssText = \`
        position: absolute;
        top: 200px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #ffaa00;
        border-radius: 8px;
        padding: 20px;
        color: #fff;
        font-family: 'Courier New', monospace;
        display: none;
        z-index: 1002;
    \`;
    
    buildMenu.innerHTML = \`
        <div style="text-align: center; font-weight: bold; margin-bottom: 15px; color: #ffaa00;">
            🏗️ CONSTRUCTION MENU
        </div>
        <div id="building-list"></div>
        <div style="margin-top: 15px; text-align: center;">
            <button onclick="closeBuildMenu()" style="background: #ff4444; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
    \`;
    
    document.body.appendChild(buildMenu);
    territorySystem.territoryUI.basePanel = buildMenu;
}

function initBaseBuildingSystem() {
    // Set up construction mechanics
    territorySystem.constructionQueue = [];
    territorySystem.buildCosts = new Map();
    
    // Initialize building templates
    Object.entries(territorySystem.buildings).forEach(([id, building]) => {
        territorySystem.buildCosts.set(id, building.cost);
    });
    
    console.log('🏗️ Base building system initialized');
}

function selectTerritory(territory) {
    territorySystem.selectedTerritory = territory;
    updateTerritoryUI();
    showTerritoryPanel();
}

function updateTerritoryUI() {
    const territory = territorySystem.selectedTerritory;
    if (!territory || !territorySystem.territoryUI.panel) return;
    
    const infoDiv = document.getElementById('territory-info');
    const buildingsDiv = document.getElementById('territory-buildings');
    const optionsDiv = document.getElementById('construction-options');
    
    if (!infoDiv || !buildingsDiv || !optionsDiv) return;
    
    // Territory information
    const controlStatus = territory.controller === 'player' ? 
        '<span style="color: #00ff00;">CONTROLLED</span>' :
        territory.controller ? 
        '<span style="color: #ff0000;">ENEMY</span>' :
        '<span style="color: #666666;">NEUTRAL</span>';
    
    infoDiv.innerHTML = \`
        <div><strong>\${territory.name}</strong></div>
        <div>Type: \${territory.type.replace('_', ' ').toUpperCase()}</div>
        <div>Status: \${controlStatus}</div>
        <div>Resources: \${territory.resourceValue}</div>
        <div>Defense: \${territory.defensiveValue}</div>
    \`;
    
    // Buildings list
    let buildingsHTML = '<div style="color: #00ff80; margin-bottom: 5px;">BUILDINGS:</div>';
    if (territory.buildings.size === 0) {
        buildingsHTML += '<div style="color: #888;">No buildings constructed</div>';
    } else {
        territory.buildings.forEach((building, id) => {
            buildingsHTML += \`<div>• \${id.replace('_', ' ').toUpperCase()}: \${building.level || 1}</div>\`;
        });
    }
    buildingsDiv.innerHTML = buildingsHTML;
    
    // Construction options
    if (territory.controller === 'player') {
        optionsDiv.innerHTML = \`
            <button onclick="showBuildMenu()" style="background: #0080ff; color: #fff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Build</button>
            <button onclick="claimTerritory()" style="background: #00ff80; color: #000; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Upgrade</button>
        \`;
    } else if (!territory.controller) {
        optionsDiv.innerHTML = \`
            <button onclick="claimTerritory()" style="background: #ffaa00; color: #000; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Claim Territory</button>
        \`;
    } else {
        optionsDiv.innerHTML = \`
            <button onclick="attackTerritory()" style="background: #ff4444; color: #fff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Attack</button>
        \`;
    }
}

function showTerritoryPanel() {
    const panel = territorySystem.territoryUI.panel;
    if (panel) {
        panel.style.display = 'block';
    }
}

function hideTerritoryPanel() {
    const panel = territorySystem.territoryUI.panel;
    if (panel) {
        panel.style.display = 'none';
    }
}

function showBuildMenu() {
    const buildMenu = territorySystem.territoryUI.basePanel;
    if (!buildMenu) return;
    
    const buildingList = document.getElementById('building-list');
    if (!buildingList) return;
    
    let buildHTML = '';
    Object.entries(territorySystem.buildings).forEach(([id, building]) => {
        const canAfford = state.player.score >= building.cost;
        const colorStyle = canAfford ? 'color: #00ff80' : 'color: #ff6666';
        
        buildHTML += \`
            <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #444; border-radius: 4px;">
                <div style="\${colorStyle}"><strong>\${id.replace('_', ' ').toUpperCase()}</strong></div>
                <div style="font-size: 10px; color: #ccc;">
                    Cost: \${building.cost} | HP: \${building.hp} | Produces: \${building.produces}
                </div>
                <button onclick="buildStructure('\${id}')" 
                        style="background: \${canAfford ? '#0080ff' : '#666'}; color: #fff; border: none; padding: 4px 8px; border-radius: 3px; cursor: \${canAfford ? 'pointer' : 'not-allowed'}; margin-top: 5px;"
                        \${canAfford ? '' : 'disabled'}>
                    Build
                </button>
            </div>
        \`;
    });
    
    buildingList.innerHTML = buildHTML;
    buildMenu.style.display = 'block';
}

function closeBuildMenu() {
    const buildMenu = territorySystem.territoryUI.basePanel;
    if (buildMenu) {
        buildMenu.style.display = 'none';
    }
}

function buildStructure(buildingId) {
    const territory = territorySystem.selectedTerritory;
    if (!territory || territory.controller !== 'player') {
        console.log('❌ Cannot build in uncontrolled territory');
        return;
    }
    
    const building = territorySystem.buildings[buildingId];
    if (!building) return;
    
    if (state.player.score < building.cost) {
        console.log('❌ Insufficient resources for building');
        return;
    }
    
    // Deduct cost
    state.player.score -= building.cost;
    
    // Add building to territory
    territory.buildings.set(buildingId, {
        ...building,
        level: 1,
        constructionTime: Date.now(),
        operational: true
    });
    
    // Create visual representation
    createBuildingMesh(territory, buildingId);
    
    console.log(\`🏗️ \${buildingId.replace('_', ' ').toUpperCase()} constructed in \${territory.name}\`);
    
    // Update UI
    updateTerritoryUI();
    closeBuildMenu();
    
    // Add to combat log
    addCombatLog(\`BUILT: \${buildingId.replace('_', ' ').toUpperCase()}\`, '#00ff80');
}

function createBuildingMesh(territory, buildingId) {
    const building = territory.buildings.get(buildingId);
    if (!building) return;
    
    // Create building geometry based on type
    let geometry, material;
    
    switch(buildingId) {
        case 'command_center':
            geometry = new THREE.BoxGeometry(8, 8, 6);
            material = new THREE.MeshBasicMaterial({ color: 0x0080ff, transparent: true, opacity: 0.8 });
            break;
        case 'mining_station':
            geometry = new THREE.ConeGeometry(4, 6, 6);
            material = new THREE.MeshBasicMaterial({ color: 0x8B4513, transparent: true, opacity: 0.8 });
            break;
        case 'defense_turret':
            geometry = new THREE.CylinderGeometry(2, 4, 5, 8);
            material = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 });
            break;
        case 'research_lab':
            geometry = new THREE.SphereGeometry(4, 8, 8);
            material = new THREE.MeshBasicMaterial({ color: 0x9370DB, transparent: true, opacity: 0.8 });
            break;
        case 'hangar':
            geometry = new THREE.BoxGeometry(10, 6, 4);
            material = new THREE.MeshBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.8 });
            break;
        case 'shield_generator':
            geometry = new THREE.OctahedronGeometry(3);
            material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
            break;
        default:
            geometry = new THREE.BoxGeometry(4, 4, 4);
            material = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.8 });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position building around territory marker
    const buildingCount = territory.buildings.size;
    const angle = (buildingCount - 1) * (Math.PI * 2 / 6); // Max 6 buildings in circle
    const radius = 25;
    
    mesh.position.copy(territory.position);
    mesh.position.x += Math.cos(angle) * radius;
    mesh.position.y += Math.sin(angle) * radius;
    mesh.position.z += 3; // Slightly above ground
    
    mesh.userData = {
        type: 'building',
        buildingId: buildingId,
        territory: territory,
        isBuilding: true
    };
    
    scene.add(mesh);
    
    // Store reference
    if (!territory.buildingMeshes) territory.buildingMeshes = new Map();
    territory.buildingMeshes.set(buildingId, mesh);
}

function claimTerritory() {
    const territory = territorySystem.selectedTerritory;
    if (!territory) return;
    
    if (territory.controller === 'player') {
        console.log('⚠️ Territory already controlled');
        return;
    }
    
    const claimCost = 200 + (territory.resourceValue * 2);
    
    if (state.player.score < claimCost) {
        console.log(\`❌ Need \${claimCost} resources to claim territory\`);
        return;
    }
    
    // Deduct claim cost
    state.player.score -= claimCost;
    
    // Take control
    territory.controller = 'player';
    
    // Update marker color
    if (territory.marker) {
        territory.marker.material.color.setHex(0x00ff00);
    }
    
    console.log(\`🏗️ Claimed \${territory.name}\`);
    addCombatLog(\`TERRITORY CLAIMED: \${territory.name.toUpperCase()}\`, '#00ff80');
    
    // Update UI
    updateTerritoryUI();
}

function attackTerritory() {
    const territory = territorySystem.selectedTerritory;
    if (!territory || !territory.controller) return;
    
    console.log(\`⚔️ Attacking \${territory.name}\`);
    
    // Simple attack mechanic - for now just try to claim
    const attackSuccess = Math.random() > 0.6; // 40% success rate
    
    if (attackSuccess) {
        territory.controller = 'player';
        if (territory.marker) {
            territory.marker.material.color.setHex(0x00ff00);
        }
        addCombatLog(\`TERRITORY CAPTURED: \${territory.name.toUpperCase()}\`, '#ff8800');
    } else {
        addCombatLog(\`ATTACK FAILED: \${territory.name.toUpperCase()}\`, '#ff4444');
    }
    
    updateTerritoryUI();
}`;

// Add UI functions after territory system
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${baseBuildingUI}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Territory UI & Base Building Mechanics deployed!');
console.log('🏗️ Features: Territory control panel, building menu, construction system');
console.log('🎮 Controls: B = Build Menu, R = Resources, N = Next Territory');
console.log('🏢 Buildings: Command Center, Mining Station, Defense Turret, Research Lab, Hangar, Shield Gen');