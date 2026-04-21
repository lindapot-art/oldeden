const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('💰 DEPLOYING: Loot & Equipment Management System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add loot system variables
const lootVars = `

// === LOOT & EQUIPMENT SYSTEM ===
let lootSystem = {
    enabled: true,
    dropChance: {
        common: 0.6,
        uncommon: 0.25,
        rare: 0.1,
        epic: 0.04,
        legendary: 0.01
    },
    lootTypes: {
        credits: { weight: 40, amounts: [10, 25, 50, 100, 200] },
        energy: { weight: 30, amounts: [20, 40, 60] },
        weaponUpgrade: { weight: 15, rarities: ['common', 'uncommon', 'rare'] },
        shipUpgrade: { weight: 10, rarities: ['common', 'uncommon', 'rare', 'epic'] },
        consumables: { weight: 5, types: ['shield_boost', 'damage_boost', 'speed_boost'] }
    },
    activeDrops: [],
    equipment: {
        shields: {
            basic: { name: 'Basic Shield', capacity: 100, rechargeRate: 10, equipped: true },
            reinforced: { name: 'Reinforced Shield', capacity: 150, rechargeRate: 12, equipped: false },
            adaptive: { name: 'Adaptive Shield', capacity: 200, rechargeRate: 15, equipped: false },
            quantum: { name: 'Quantum Shield', capacity: 300, rechargeRate: 20, equipped: false }
        },
        engines: {
            standard: { name: 'Standard Engine', speed: 1.0, maneuverability: 1.0, equipped: true },
            turbo: { name: 'Turbo Engine', speed: 1.3, maneuverability: 0.9, equipped: false },
            precision: { name: 'Precision Engine', speed: 0.9, maneuverability: 1.4, equipped: false },
            quantum: { name: 'Quantum Engine', speed: 1.5, maneuverability: 1.3, equipped: false }
        },
        armor: {
            light: { name: 'Light Armor', protection: 1.0, weight: 1.0, equipped: true },
            heavy: { name: 'Heavy Armor', protection: 1.4, weight: 1.3, equipped: false },
            composite: { name: 'Composite Armor', protection: 1.2, weight: 0.9, equipped: false },
            reactive: { name: 'Reactive Armor', protection: 1.6, weight: 1.1, equipped: false }
        }
    },
    inventory: {
        maxSize: 50,
        items: []
    }
};

let lootUIOpen = false;`;

// Add loot variables after AI system
indexContent = safeReplace(indexContent, 
  'let aiUpdateTimer = 0;',
  'let aiUpdateTimer = 0;' + lootVars
);

// Add loot functions
const lootFunctions = `

// === LOOT & EQUIPMENT FUNCTIONS ===
function initLootSystem() {
    console.log('💰 Initializing Loot & Equipment System...');
    
    // Load equipment from save
    if (state.lootSystem) {
        Object.assign(lootSystem, state.lootSystem);
    }
    
    // Create loot pickup radius indicator
    const pickupIndicator = document.createElement('div');
    pickupIndicator.id = 'loot-pickup-indicator';
    pickupIndicator.style.cssText = \`
        position: absolute;
        width: 100px;
        height: 100px;
        border: 2px dashed #44ff44;
        border-radius: 50%;
        pointer-events: none;
        z-index: 999;
        display: none;
        transform: translate(-50%, -50%);
        opacity: 0.6;
    \`;
    document.body.appendChild(pickupIndicator);
    
    console.log(\`💰 Loot system initialized with \${lootSystem.inventory.items.length} inventory items\`);
}

function createLootDrop(enemy) {
    if (!enemy || !lootSystem.enabled || Math.random() > 0.7) return;
    
    const lootRarity = determineLootRarity();
    const lootType = determineLootType();
    const lootData = generateLootItem(lootType, lootRarity);
    
    if (!lootData) return;
    
    // Create visual loot drop
    const lootGeo = new THREE.BoxGeometry(3, 1, 3);
    const lootColor = getRarityColor(lootRarity);
    const lootMat = new THREE.MeshBasicMaterial({ 
        color: lootColor,
        transparent: true,
        opacity: 0.8
    });
    
    const lootMesh = new THREE.Mesh(lootGeo, lootMat);
    lootMesh.position.copy(enemy.position);
    lootMesh.position.y += 2; // Float above ground
    
    scene.add(lootMesh);
    
    // Add loot properties
    lootMesh.userData = {
        ...lootData,
        rarity: lootRarity,
        type: lootType,
        age: 0,
        maxAge: 30000, // 30 seconds
        pickupRadius: 25,
        collected: false,
        floatOffset: Math.random() * Math.PI * 2
    };
    
    // Add floating animation
    lootMesh.userData.originalY = lootMesh.position.y;
    
    lootSystem.activeDrops.push(lootMesh);
    
    console.log(\`💎 Dropped \${lootRarity} \${lootType}: \${lootData.name || lootType}\`);
}

function determineLootRarity() {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [rarity, chance] of Object.entries(lootSystem.dropChance)) {
        cumulative += chance;
        if (roll <= cumulative) {
            return rarity;
        }
    }
    return 'common';
}

function determineLootType() {
    const types = Object.keys(lootSystem.lootTypes);
    const totalWeight = Object.values(lootSystem.lootTypes).reduce((sum, type) => sum + type.weight, 0);
    
    let roll = Math.random() * totalWeight;
    
    for (const type of types) {
        roll -= lootSystem.lootTypes[type].weight;
        if (roll <= 0) return type;
    }
    
    return 'credits';
}

function generateLootItem(lootType, rarity) {
    const rarityMultiplier = { common: 1, uncommon: 1.5, rare: 2.5, epic: 4, legendary: 8 };
    const multiplier = rarityMultiplier[rarity] || 1;
    
    switch (lootType) {
        case 'credits':
            const amounts = lootSystem.lootTypes.credits.amounts;
            const baseAmount = amounts[Math.floor(Math.random() * amounts.length)];
            return {
                name: \`\${Math.floor(baseAmount * multiplier)} Credits\`,
                amount: Math.floor(baseAmount * multiplier),
                icon: '💰'
            };
            
        case 'energy':
            const energyAmounts = lootSystem.lootTypes.energy.amounts;
            const energyAmount = energyAmounts[Math.floor(Math.random() * energyAmounts.length)];
            return {
                name: \`Energy Cell (+\${Math.floor(energyAmount * multiplier)})\`,
                amount: Math.floor(energyAmount * multiplier),
                icon: '⚡'
            };
            
        case 'weaponUpgrade':
            return {
                name: \`Weapon Upgrade Material (\${rarity})\`,
                upgradeValue: Math.floor(50 * multiplier),
                icon: '🔧'
            };
            
        case 'shipUpgrade':
            const upgradeTypes = ['shield', 'engine', 'armor'];
            const upgradeType = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
            return {
                name: \`\${rarity.toUpperCase()} \${upgradeType.toUpperCase()} Upgrade\`,
                upgradeType: upgradeType,
                upgradeValue: Math.floor(10 * multiplier),
                icon: '⭐'
            };
            
        case 'consumables':
            const consumableTypes = lootSystem.lootTypes.consumables.types;
            const consumableType = consumableTypes[Math.floor(Math.random() * consumableTypes.length)];
            return {
                name: \`\${consumableType.replace('_', ' ').toUpperCase()}\`,
                consumableType: consumableType,
                duration: 10000 + Math.floor(5000 * multiplier),
                icon: '💊'
            };
    }
    
    return null;
}

function getRarityColor(rarity) {
    const colors = {
        common: 0x888888,
        uncommon: 0x44aa44,
        rare: 0x4444ff,
        epic: 0xaa44aa,
        legendary: 0xffaa44
    };
    return colors[rarity] || 0x888888;
}

function updateLootDrops(deltaTime) {
    lootSystem.activeDrops.forEach((loot, index) => {
        if (!loot || loot.userData.collected) {
            lootSystem.activeDrops.splice(index, 1);
            return;
        }
        
        const userData = loot.userData;
        userData.age += deltaTime;
        
        // Floating animation
        userData.floatOffset += deltaTime * 0.003;
        loot.position.y = userData.originalY + Math.sin(userData.floatOffset) * 2;
        
        // Rotation animation
        loot.rotation.y += deltaTime * 0.002;
        
        // Fade out near expiration
        if (userData.age > userData.maxAge * 0.8) {
            const fadeProgress = (userData.age - userData.maxAge * 0.8) / (userData.maxAge * 0.2);
            loot.material.opacity = 0.8 * (1 - fadeProgress);
        }
        
        // Remove expired loot
        if (userData.age > userData.maxAge) {
            scene.remove(loot);
            lootSystem.activeDrops.splice(index, 1);
            console.log('💸 Loot expired:', userData.name);
            return;
        }
        
        // Check for pickup
        const distance = ship.position.distanceTo(loot.position);
        if (distance <= userData.pickupRadius) {
            collectLoot(loot);
        }
        
        // Update pickup indicator
        if (distance <= userData.pickupRadius * 2) {
            showLootPickupIndicator(loot);
        }
    });
}

function collectLoot(loot) {
    if (!loot || loot.userData.collected) return;
    
    const userData = loot.userData;
    userData.collected = true;
    
    // Apply loot effects
    switch (userData.type) {
        case 'credits':
            state.player.credits += userData.amount;
            addMessage(\`+\${userData.amount} CREDITS\`, 'loot');
            break;
            
        case 'energy':
            weaponSystem.weaponEnergy = Math.min(weaponSystem.maxWeaponEnergy, 
                                                weaponSystem.weaponEnergy + userData.amount);
            addMessage(\`+\${userData.amount} ENERGY\`, 'loot');
            break;
            
        case 'weaponUpgrade':
            // Add to inventory or apply directly
            addToInventory(userData);
            addMessage(\`WEAPON UPGRADE MATERIAL COLLECTED\`, 'loot');
            break;
            
        case 'shipUpgrade':
            applyShipUpgrade(userData);
            addMessage(\`SHIP UPGRADE: \${userData.name}\`, 'loot');
            break;
            
        case 'consumables':
            addToInventory(userData);
            addMessage(\`CONSUMABLE: \${userData.name}\`, 'loot');
            break;
    }
    
    // Create pickup effect
    createLootPickupEffect(loot.position);
    
    // Remove from scene
    scene.remove(loot);
    
    // Play sound
    playSound('loot_fuel');
    
    console.log(\`✅ Collected \${userData.rarity} \${userData.name}\`);
}

function createLootPickupEffect(position) {
    // Create sparkle effect
    for (let i = 0; i < 8; i++) {
        const sparkleGeo = new THREE.SphereGeometry(0.5, 4, 4);
        const sparkleMat = new THREE.MeshBasicMaterial({ 
            color: 0xffff44,
            transparent: true,
            opacity: 1
        });
        const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
        
        sparkle.position.copy(position);
        sparkle.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        ));
        
        scene.add(sparkle);
        
        // Animate sparkle
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            Math.random() * 15 + 5,
            (Math.random() - 0.5) * 20
        );
        
        const animateSparkle = () => {
            sparkle.position.add(velocity.clone().multiplyScalar(0.1));
            velocity.y -= 1; // Gravity
            sparkle.material.opacity -= 0.05;
            
            if (sparkle.material.opacity <= 0) {
                scene.remove(sparkle);
            } else {
                requestAnimationFrame(animateSparkle);
            }
        };
        
        setTimeout(() => animateSparkle(), i * 50);
    }
}

function addToInventory(item) {
    if (lootSystem.inventory.items.length >= lootSystem.inventory.maxSize) {
        addMessage('INVENTORY FULL!', 'warning');
        return false;
    }
    
    lootSystem.inventory.items.push({
        ...item,
        id: Date.now() + Math.random(),
        acquired: Date.now()
    });
    
    return true;
}

function applyShipUpgrade(upgrade) {
    // Apply temporary or permanent ship upgrades
    const upgradeType = upgrade.upgradeType;
    const value = upgrade.upgradeValue;
    
    switch (upgradeType) {
        case 'shield':
            if (state.player.maxShield) {
                state.player.maxShield += value;
            } else {
                state.player.maxShield = 100 + value;
            }
            break;
            
        case 'engine':
            // Temporarily boost movement speed
            ship.userData = ship.userData || {};
            ship.userData.speedBoost = (ship.userData.speedBoost || 1) + (value * 0.01);
            break;
            
        case 'armor':
            // Damage reduction boost
            if (!state.player.armorRating) state.player.armorRating = 0;
            state.player.armorRating += value * 0.5;
            break;
    }
    
    saveProgress();
}

function showLootPickupIndicator(loot) {
    const indicator = document.getElementById('loot-pickup-indicator');
    if (!indicator || !camera) return;
    
    const screenPos = loot.position.clone().project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
    
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
    indicator.style.display = 'block';
    indicator.style.borderColor = '#' + getRarityColor(loot.userData.rarity).toString(16).padStart(6, '0');
}`;

// Add loot functions after AI functions
indexContent = safeReplace(indexContent, 
  'function fireEnhancedEnemyProjectile(enemy) {',
  lootFunctions + cr() + cr() + 'function fireEnhancedEnemyProjectile(enemy) {'
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Loot & Equipment Management System v1 deployed!');
console.log('💰 Added 5 loot types with rarity system and equipment upgrades');