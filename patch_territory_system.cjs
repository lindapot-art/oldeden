const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🏗️ DEPLOYING: Territory Control & Base Building System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add territory control state
const territoryState = `      // Territory Control & Base Building System
      territories: {
        controlled: new Map(), // territory ID -> player data
        contested: new Set(), // territory IDs under attack
        bases: new Map(), // territory ID -> base data
        resources: new Map(), // territory ID -> resource nodes
        upgradeQueue: [],
        constructionProjects: new Map(),
        defenseStructures: new Map()
      },`;

// Add to state object
indexContent = indexContent.replace(
  '      // Multiplayer system',
  `${territoryState}
      
      // Multiplayer system`
);

// Add territory control system initialization
const territoryInit = `
// === TERRITORY CONTROL & BASE BUILDING SYSTEM ===
const territorySystem = {
  // Territory Management
  territories: new Map(),
  playerBases: new Map(),
  resourceNodes: new Map(),
  
  // Construction System
  buildings: {
    'command_center': { cost: 1000, hp: 500, produces: 'control' },
    'mining_station': { cost: 500, hp: 200, produces: 'resources' },
    'defense_turret': { cost: 300, hp: 150, produces: 'defense' },
    'research_lab': { cost: 800, hp: 250, produces: 'tech' },
    'hangar': { cost: 600, hp: 300, produces: 'ships' },
    'shield_generator': { cost: 700, hp: 100, produces: 'shields' }
  },
  
  // Territory Types
  territoryTypes: {
    'asteroid_field': { resources: 'minerals', defensibility: 'low' },
    'gas_giant': { resources: 'energy', defensibility: 'medium' },
    'space_station': { resources: 'tech', defensibility: 'high' },
    'debris_field': { resources: 'salvage', defensibility: 'medium' },
    'nebula': { resources: 'exotic', defensibility: 'high' }
  },
  
  // UI Elements
  territoryUI: {
    panel: null,
    basePanel: null,
    constructionQueue: null,
    territoryMap: null
  },
  
  // Game State
  selectedTerritory: null,
  constructionMode: false,
  upgradeInProgress: false
};

function initTerritorySystem() {
    // Generate initial territories
    generateTerritories();
    
    // Initialize UI
    createTerritoryUI();
    
    // Set up base building mechanics
    initBaseBuildingSystem();
    
    console.log('🏗️ Territory Control & Base Building System initialized');
}

function generateTerritories() {
    const territoryCount = 12;
    const territoryTypes = Object.keys(territorySystem.territoryTypes);
    
    for (let i = 0; i < territoryCount; i++) {
        const territory = {
            id: \`territory_\${i}\`,
            name: generateTerritoryName(i),
            type: territoryTypes[Math.floor(Math.random() * territoryTypes.length)],
            position: new THREE.Vector3(
                (Math.random() - 0.5) * 800,
                (Math.random() - 0.5) * 600,
                0
            ),
            controller: null, // null = neutral, 'player' or other faction
            contestedBy: [],
            resourceValue: Math.floor(Math.random() * 100) + 50,
            defensiveValue: Math.floor(Math.random() * 50) + 25,
            buildings: new Map(),
            defenses: []
        };
        
        territorySystem.territories.set(territory.id, territory);
        
        // Create visual marker
        createTerritoryMarker(territory);
    }
}

function generateTerritoryName(index) {
    const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
    const suffixes = ['Sector', 'Quadrant', 'Zone', 'Region', 'System', 'Cluster'];
    
    return \`\${prefixes[index % prefixes.length]} \${suffixes[Math.floor(index / prefixes.length)]}\`;
}

function createTerritoryMarker(territory) {
    // Create territory marker mesh
    const geometry = new THREE.RingGeometry(15, 18, 8);
    
    // Color based on control status
    let color = 0x666666; // Neutral
    if (territory.controller === 'player') color = 0x00ff00; // Player controlled
    else if (territory.controller) color = 0xff0000; // Enemy controlled
    if (territory.contestedBy.length > 0) color = 0xffff00; // Contested
    
    const material = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.7
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(territory.position);
    marker.userData = {
        type: 'territory',
        territory: territory,
        isTerritory: true
    };
    
    scene.add(marker);
    
    // Add resource indicator
    const resourceGeo = new THREE.SphereGeometry(2, 8, 8);
    const resourceMat = new THREE.MeshBasicMaterial({ 
        color: getTerritoryResourceColor(territory.type),
        emissive: getTerritoryResourceColor(territory.type),
        emissiveIntensity: 0.3
    });
    const resourceIndicator = new THREE.Mesh(resourceGeo, resourceMat);
    resourceIndicator.position.copy(territory.position);
    resourceIndicator.position.y += 20;
    
    scene.add(resourceIndicator);
    
    territory.marker = marker;
    territory.resourceIndicator = resourceIndicator;
}

function getTerritoryResourceColor(type) {
    const colors = {
        'asteroid_field': 0x8B4513, // Brown for minerals
        'gas_giant': 0x4169E1,     // Blue for energy
        'space_station': 0x9370DB, // Purple for tech
        'debris_field': 0x708090,  // Gray for salvage
        'nebula': 0xFF69B4        // Pink for exotic
    };
    return colors[type] || 0x666666;
}`;

// Add territory system after multiplayer system
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${territoryInit}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Territory Control & Base Building System (Part 1) deployed!');
console.log('🏗️ Features: Territory generation, resource nodes, control markers');
console.log('🗺️ Generated 12 territories with 5 different types');
console.log('💎 Resource types: minerals, energy, tech, salvage, exotic');