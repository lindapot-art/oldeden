#!/usr/bin/env node
// 👑 THE KING'S ECONOMY AND RESOURCE SYSTEM DEPLOYMENT
// Add mining, trading, and resource collection

const fs = require('fs');
const path = require('path');

console.log('👑 THE KING: DEPLOYING ECONOMY AND RESOURCE SYSTEM');
console.log('═══════════════════════════════════════════════════');

const indexPath = path.join(__dirname, 'public', 'index.html');

function safeReplace(content, search, replace) {
  if (content.includes(search)) {
    return content.replace(search, replace);
  } else {
    console.log(`⚠️ Search pattern not found, appending instead...`);
    // If search not found, append to end of script section
    const scriptEnd = content.lastIndexOf('</script>');
    if (scriptEnd > -1) {
      return content.substring(0, scriptEnd) + '\n' + replace + '\n' + content.substring(scriptEnd);
    }
    return content + '\n' + replace;
  }
}

function cr(text) {
  return text.replace(/\n/g, '\r\n');
}

try {
  console.log('📖 Reading index.html...');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  // Add economy and resource system
  console.log('💎 Adding resource and economy system...');
  const economySystem = cr(`
        // 👑 ECONOMY AND RESOURCE COLLECTION SYSTEM
        
        const resourceTypes = [
            { name: 'iron', color: 0x808080, value: 5, rarity: 0.4, size: 0.8 },
            { name: 'copper', color: 0xB87333, value: 8, rarity: 0.3, size: 0.9 },
            { name: 'gold', color: 0xFFD700, value: 25, rarity: 0.15, size: 1.0 },
            { name: 'platinum', color: 0xE5E4E2, value: 50, rarity: 0.08, size: 1.1 },
            { name: 'crystal', color: 0x00FFFF, value: 100, rarity: 0.05, size: 1.3 },
            { name: 'dark_matter', color: 0x4B0082, value: 500, rarity: 0.02, size: 1.5 }
        ];
        
        let resources = [];
        let inventory = {
            iron: 0,
            copper: 0,
            gold: 0,
            platinum: 0,
            crystal: 0,
            dark_matter: 0
        };
        
        let miningLaser = null;
        let miningTarget = null;
        let miningProgress = 0;
        let marketPrices = {
            iron: 5,
            copper: 8,
            gold: 25,
            platinum: 50,
            crystal: 100,
            dark_matter: 500
        };
        
        // Economic fluctuation
        let priceFluctuationTimer = 0;
        
        // Space stations for trading
        let stations = [];
        let nearestStation = null;
        
        function createResource(type, position) {
            const geometry = new THREE.OctahedronGeometry(type.size);
            const material = new THREE.MeshLambertMaterial({ 
                color: type.color,
                transparent: true,
                opacity: 0.8
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(position);
            
            // Add rotation animation
            const rotationSpeed = {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            };
            
            const resource = {
                mesh: mesh,
                type: type.name,
                value: type.value,
                health: type.size * 50, // Mining health
                maxHealth: type.size * 50,
                rotationSpeed: rotationSpeed,
                collected: false
            };
            
            scene.add(mesh);
            return resource;
        }
        
        function spawnResources() {
            // Spawn resources at random intervals
            if (Math.random() < 0.3) { // 30% chance per spawn cycle
                const type = getRandomResourceType();
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 150;
                const position = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    (Math.random() - 0.5) * 40,
                    Math.sin(angle) * distance
                );
                
                const resource = createResource(type, position);
                resources.push(resource);
            }
        }
        
        function getRandomResourceType() {
            const rand = Math.random();
            let cumulative = 0;
            for (const type of resourceTypes) {
                cumulative += type.rarity;
                if (rand <= cumulative) {
                    return type;
                }
            }
            return resourceTypes[0]; // fallback to iron
        }
        
        function createSpaceStation(position) {
            const stationGeometry = new THREE.BoxGeometry(8, 4, 8);
            const stationMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const stationMesh = new THREE.Mesh(stationGeometry, stationMaterial);
            stationMesh.position.copy(position);
            
            // Add station lights
            const light1 = new THREE.PointLight(0x00ff00, 1, 20);
            light1.position.set(0, 3, 0);
            stationMesh.add(light1);
            
            const light2 = new THREE.PointLight(0x0000ff, 1, 20);
            light2.position.set(0, -3, 0);
            stationMesh.add(light2);
            
            const station = {
                mesh: stationMesh,
                position: position.clone(),
                tradingActive: false,
                priceMultiplier: 0.8 + Math.random() * 0.4 // 0.8x to 1.2x base prices
            };
            
            scene.add(stationMesh);
            return station;
        }
        
        function initializeEconomy() {
            // Create 3 space stations
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2) / 3;
                const distance = 200;
                const position = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
                stations.push(createSpaceStation(position));
            }
            
            // Create initial resources
            for (let i = 0; i < 15; i++) {
                spawnResources();
            }
        }
        
        function updateResourcePrices() {
            priceFluctuationTimer++;
            if (priceFluctuationTimer > 300) { // Every 5 seconds at 60fps
                priceFluctuationTimer = 0;
                
                // Fluctuate prices ±20%
                Object.keys(marketPrices).forEach(resource => {
                    const basePrice = resourceTypes.find(r => r.name === resource)?.value || marketPrices[resource];
                    const fluctuation = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
                    marketPrices[resource] = Math.floor(basePrice * fluctuation);
                });
                
                updateEconomyHUD();
            }
        }
        
        function updateResourceMining() {
            // Update resource animations
            resources.forEach((resource, index) => {
                if (resource.collected) return;
                
                resource.mesh.rotation.x += resource.rotationSpeed.x;
                resource.mesh.rotation.y += resource.rotationSpeed.y;
                resource.mesh.rotation.z += resource.rotationSpeed.z;
                
                // Remove resources that are too far
                if (player && resource.mesh.position.distanceTo(player.mesh.position) > 300) {
                    scene.remove(resource.mesh);
                    resources.splice(index, 1);
                }
            });
            
            // Check for mining target
            if (miningTarget && !miningTarget.collected) {
                const distance = player.mesh.position.distanceTo(miningTarget.mesh.position);
                if (distance <= 15) { // Mining range
                    // Mine the resource
                    miningProgress += 2; // Mining speed
                    if (miningProgress >= miningTarget.maxHealth) {
                        // Resource fully mined
                        collectResource(miningTarget);
                        miningTarget = null;
                        miningProgress = 0;
                    }
                } else {
                    miningTarget = null;
                    miningProgress = 0;
                }
            }
        }
        
        function collectResource(resource) {
            if (resource.collected) return;
            
            resource.collected = true;
            scene.remove(resource.mesh);
            
            // Add to inventory
            inventory[resource.type] = (inventory[resource.type] || 0) + 1;
            
            // Show collection effect
            showCollectionEffect(resource.mesh.position, resource.type);
            
            // Remove from resources array
            const index = resources.indexOf(resource);
            if (index > -1) {
                resources.splice(index, 1);
            }
            
            updateInventoryHUD();
        }
        
        function showCollectionEffect(position, resourceType) {
            const effectGeometry = new THREE.SphereGeometry(2);
            const effectMaterial = new THREE.MeshBasicMaterial({ 
                color: resourceTypes.find(r => r.name === resourceType)?.color || 0xffffff,
                transparent: true,
                opacity: 1
            });
            const effectMesh = new THREE.Mesh(effectGeometry, effectMaterial);
            effectMesh.position.copy(position);
            scene.add(effectMesh);
            
            // Animate effect
            let opacity = 1;
            let scale = 1;
            const animateEffect = () => {
                opacity -= 0.05;
                scale += 0.05;
                effectMesh.material.opacity = opacity;
                effectMesh.scale.setScalar(scale);
                
                if (opacity > 0) {
                    requestAnimationFrame(animateEffect);
                } else {
                    scene.remove(effectMesh);
                }
            };
            animateEffect();
        }
        
        function findNearestResource() {
            let nearest = null;
            let nearestDistance = Infinity;
            
            resources.forEach(resource => {
                if (resource.collected) return;
                const distance = player.mesh.position.distanceTo(resource.mesh.position);
                if (distance < nearestDistance && distance <= 50) { // Detection range
                    nearest = resource;
                    nearestDistance = distance;
                }
            });
            
            return nearest;
        }
        
        function findNearestStation() {
            let nearest = null;
            let nearestDistance = Infinity;
            
            stations.forEach(station => {
                const distance = player.mesh.position.distanceTo(station.position);
                if (distance < nearestDistance && distance <= 25) { // Trading range
                    nearest = station;
                    nearestDistance = distance;
                }
            });
            
            return nearest;
        }
        
        function openTradeMenu() {
            if (!nearestStation) return;
            
            const tradeMenu = document.createElement('div');
            tradeMenu.id = 'trade-menu';
            tradeMenu.style.cssText = \`
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 500px;
                background: rgba(0,0,0,0.9);
                border: 2px solid #444;
                border-radius: 10px;
                padding: 20px;
                z-index: 2000;
                color: white;
                font-family: Arial;
            \`;
            
            tradeMenu.innerHTML = \`
                <h2 style="text-align: center; margin: 0 0 20px 0;">Space Station Trading</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h3>Your Inventory</h3>
                        <div id="inventory-list"></div>
                    </div>
                    <div>
                        <h3>Station Prices (Credits)</h3>
                        <div id="station-prices"></div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button id="close-trade" style="padding: 10px 30px; background: #f44336; border: none; color: white; cursor: pointer; border-radius: 5px;">Close</button>
                </div>
            \`;
            
            document.body.appendChild(tradeMenu);
            
            updateTradeMenu();
            
            document.getElementById('close-trade').addEventListener('click', () => {
                document.body.removeChild(tradeMenu);
            });
        }
        
        function updateTradeMenu() {
            const inventoryList = document.getElementById('inventory-list');
            const stationPrices = document.getElementById('station-prices');
            
            if (!inventoryList || !stationPrices) return;
            
            inventoryList.innerHTML = '';
            stationPrices.innerHTML = '';
            
            Object.entries(inventory).forEach(([resource, quantity]) => {
                const price = Math.floor(marketPrices[resource] * nearestStation.priceMultiplier);
                
                if (quantity > 0) {
                    const inventoryItem = document.createElement('div');
                    inventoryItem.style.cssText = 'margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; display: flex; justify-content: space-between; align-items: center;';
                    inventoryItem.innerHTML = \`
                        <span>\${resource.charAt(0).toUpperCase() + resource.slice(1)}: \${quantity}</span>
                        <button onclick="sellResource('\${resource}', 1)" style="padding: 2px 8px; background: #4CAF50; border: none; color: white; cursor: pointer; border-radius: 3px;">Sell</button>
                    \`;
                    inventoryList.appendChild(inventoryItem);
                }
                
                const priceItem = document.createElement('div');
                priceItem.style.cssText = 'margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 3px;';
                priceItem.innerHTML = \`\${resource.charAt(0).toUpperCase() + resource.slice(1)}: \${price} credits\`;
                stationPrices.appendChild(priceItem);
            });
        }
        
        window.sellResource = function(resourceType, quantity) {
            if ((inventory[resourceType] || 0) < quantity) return;
            
            const price = Math.floor(marketPrices[resourceType] * nearestStation.priceMultiplier);
            const totalPrice = price * quantity;
            
            inventory[resourceType] -= quantity;
            credits += totalPrice;
            
            updateInventoryHUD();
            updateTradeMenu();
            
            // Show sale notification
            console.log(\`Sold \${quantity} \${resourceType} for \${totalPrice} credits\`);
        };
        
        function updateInventoryHUD() {
            let inventoryDisplay = document.getElementById('inventory-display');
            if (!inventoryDisplay) {
                inventoryDisplay = document.createElement('div');
                inventoryDisplay.id = 'inventory-display';
                inventoryDisplay.style.cssText = \`
                    position: absolute;
                    top: 120px;
                    left: 10px;
                    background: rgba(0,0,0,0.7);
                    padding: 10px;
                    border-radius: 5px;
                    color: white;
                    font-family: Arial;
                    font-size: 12px;
                    pointer-events: none;
                \`;
                document.getElementById('hud').appendChild(inventoryDisplay);
            }
            
            let inventoryText = '<strong>Inventory:</strong><br>';
            let hasResources = false;
            Object.entries(inventory).forEach(([resource, quantity]) => {
                if (quantity > 0) {
                    inventoryText += \`\${resource.charAt(0).toUpperCase() + resource.slice(1)}: \${quantity}<br>\`;
                    hasResources = true;
                }
            });
            
            if (!hasResources) {
                inventoryText += 'Empty';
            }
            
            inventoryDisplay.innerHTML = inventoryText;
        }
        
        function updateEconomyHUD() {
            let priceDisplay = document.getElementById('price-display');
            if (!priceDisplay) {
                priceDisplay = document.createElement('div');
                priceDisplay.id = 'price-display';
                priceDisplay.style.cssText = \`
                    position: absolute;
                    bottom: 10px;
                    left: 10px;
                    background: rgba(0,0,0,0.7);
                    padding: 10px;
                    border-radius: 5px;
                    color: white;
                    font-family: Arial;
                    font-size: 11px;
                    pointer-events: none;
                    max-width: 200px;
                \`;
                document.getElementById('hud').appendChild(priceDisplay);
            }
            
            let priceText = '<strong>Market Prices:</strong><br>';
            Object.entries(marketPrices).forEach(([resource, price]) => {
                priceText += \`\${resource}: \${price}c<br>\`;
            });
            
            priceDisplay.innerHTML = priceText;
        }
  `);
  
  content = safeReplace(content, '</script>', economySystem + '</script>');
  
  // Add economy update to game loop
  console.log('🔄 Adding economy updates to game loop...');
  const economyUpdates = cr(`
        // Update economy systems
        spawnResources();
        updateResourceMining();
        updateResourcePrices();
        nearestStation = findNearestStation();
        
        // Update mining target
        if (!miningTarget) {
            const nearestResource = findNearestResource();
            if (nearestResource) {
                miningTarget = nearestResource;
                miningProgress = 0;
            }
        }
        
        // Show resource mining HUD
        let miningDisplay = document.getElementById('mining-display');
        if (!miningDisplay) {
            miningDisplay = document.createElement('div');
            miningDisplay.id = 'mining-display';
            miningDisplay.style.cssText = \`
                position: absolute;
                top: 200px;
                left: 10px;
                background: rgba(0,0,0,0.7);
                padding: 10px;
                border-radius: 5px;
                color: white;
                font-family: Arial;
                font-size: 12px;
                pointer-events: none;
            \`;
            document.getElementById('hud').appendChild(miningDisplay);
        }
        
        if (miningTarget) {
            const progress = (miningProgress / miningTarget.maxHealth * 100).toFixed(1);
            miningDisplay.innerHTML = \`
                <strong>Mining:</strong><br>
                \${miningTarget.type.charAt(0).toUpperCase() + miningTarget.type.slice(1)}<br>
                Progress: \${progress}%<br>
                <div style="width: 100px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin-top: 3px;">
                    <div style="width: \${progress}%; height: 100%; background: #4CAF50; border-radius: 3px;"></div>
                </div>
            \`;
        } else {
            miningDisplay.innerHTML = '<strong>Mining:</strong><br>No target';
        }
        
        // Show station trading HUD
        let stationDisplay = document.getElementById('station-display');
        if (!stationDisplay) {
            stationDisplay = document.createElement('div');
            stationDisplay.id = 'station-display';
            stationDisplay.style.cssText = \`
                position: absolute;
                top: 300px;
                left: 10px;
                background: rgba(0,0,0,0.7);
                padding: 10px;
                border-radius: 5px;
                color: white;
                font-family: Arial;
                font-size: 12px;
                pointer-events: none;
            \`;
            document.getElementById('hud').appendChild(stationDisplay);
        }
        
        if (nearestStation) {
            stationDisplay.innerHTML = \`
                <strong>Space Station Nearby</strong><br>
                Press T to Trade
            \`;
        } else {
            stationDisplay.style.display = 'none';
        }
  `);
  
  content = safeReplace(content, 'function gameLoop() {', 'function gameLoop() {\n' + economyUpdates);
  
  // Add trading key control
  console.log('🔑 Adding trading controls...');
  const tradingControls = cr(`
                case 'KeyT':
                    if (nearestStation) {
                        openTradeMenu();
                    }
                    break;
  `);
  
  content = safeReplace(content, 'break;\n            }', 'break;\n' + tradingControls + '            }');
  
  // Initialize economy system
  console.log('🚀 Adding economy initialization...');
  const economyInit = cr(`
        initializeEconomy();
        updateInventoryHUD();
        updateEconomyHUD();
  `);
  
  content = safeReplace(content, 'animate();', economyInit + '\n        animate();');
  
  console.log('💾 Saving enhanced index.html...');
  fs.writeFileSync(indexPath, content);
  
  console.log('\n👑 THE KING: ECONOMY AND RESOURCE SYSTEM DEPLOYMENT COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ 6 different resource types with varying rarity and value');
  console.log('✅ Automatic resource spawning throughout space');
  console.log('✅ Mining system with progress bars and collection');
  console.log('✅ 3 space stations for trading');
  console.log('✅ Dynamic market prices that fluctuate over time');
  console.log('✅ Inventory management system');
  console.log('✅ Resource collection effects and animations');
  console.log('✅ Station proximity detection and trading interface');
  console.log('✅ HUD displays for inventory, prices, and mining status');
  console.log('\n🎮 CONTROLS:');
  console.log('  T - Open trade menu (when near space station)');
  console.log('  Fly near resources to automatically mine them');
  console.log('  Visit space stations to sell resources for credits');
  console.log('\n💎 RESOURCE TYPES:');
  console.log('  • Iron (common) - 5 credits');
  console.log('  • Copper (common) - 8 credits');
  console.log('  • Gold (uncommon) - 25 credits');
  console.log('  • Platinum (rare) - 50 credits');
  console.log('  • Crystal (very rare) - 100 credits');
  console.log('  • Dark Matter (ultra rare) - 500 credits');
  console.log('\n📈 ECONOMY FEATURES:');
  console.log('  • Prices fluctuate every 5 seconds (±20%)');
  console.log('  • Each station has different price multipliers');
  console.log('  • Resources spawn randomly as you explore');
  console.log('  • Mining progress based on resource hardness');
  
} catch (error) {
  console.error('❌ DEPLOYMENT FAILED:', error);
  process.exit(1);
}