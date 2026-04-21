const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('💰 DEPLOYING: Loot System Integration & Controls');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add loot system initialization
const lootInit = `    // Initialize loot system
    initLootSystem();`;

// Add after AI init
indexContent = indexContent.replace(
  '    // Initialize weapon system',
  `${lootInit}
    // Initialize weapon system`
);

// Add loot updates to game loop
const lootUpdate = `      // Update loot drops
      updateLootDrops(deltaTime);`;

// Add after weapon updates
indexContent = indexContent.replace(
  '      // Apply aim assist if enabled',
  `      // Update loot drops
      updateLootDrops(deltaTime);
      
      // Apply aim assist if enabled`
);

// Add loot drop on enemy death
const lootDrop = `        // Create loot drop
        createLootDrop(enemy);`;

// Find enemy death handling and add loot drop
if (indexContent.includes('enemy.dead = true;')) {
  indexContent = indexContent.replace(
    'enemy.dead = true;',
    `enemy.dead = true;
        createLootDrop(enemy);`
  );
} else if (indexContent.includes('enemies.splice(i, 1);')) {
  indexContent = indexContent.replace(
    'enemies.splice(i, 1);',
    `createLootDrop(enemies[i]);
        enemies.splice(i, 1);`
  );
}

// Add inventory controls
const inventoryControls = `        case 'KeyI': // Open inventory
          if (threeReady) {
            openInventoryScreen();
          }
          break;
        
        case 'KeyL': // Loot pickup (manual)
          if (threeReady) {
            const nearestLoot = findNearestLoot();
            if (nearestLoot) {
              collectLoot(nearestLoot);
            } else {
              addMessage('NO LOOT NEARBY', 'warning');
            }
          }
          break;

`;

// Add inventory controls after weapon controls
indexContent = indexContent.replace(
  `        case 'KeyR': // Reload / Upgrade current weapon`,
  `        case 'KeyI': // Open inventory
          if (threeReady) {
            openInventoryScreen();
          }
          break;
        
        case 'KeyL': // Loot pickup (manual)
          if (threeReady) {
            const nearestLoot = findNearestLoot();
            if (nearestLoot) {
              collectLoot(nearestLoot);
            } else {
              addMessage('NO LOOT NEARBY', 'warning');
            }
          }
          break;

        case 'KeyR': // Reload / Upgrade current weapon`
);

// Add inventory UI functions
const inventoryUI = `
// === INVENTORY UI FUNCTIONS ===
function openInventoryScreen() {
    if (lootUIOpen) {
        closeInventoryScreen();
        return;
    }
    
    lootUIOpen = true;
    
    const inventoryHTML = \`
        <div style="background: rgba(0,0,0,0.95); color: white; padding: 20px; border-radius: 12px; max-height: 80vh; overflow-y: auto; min-width: 600px;">
            <h2 style="color: #e0b15f; margin-bottom: 20px; text-align: center;">📦 INVENTORY & EQUIPMENT</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <h3 style="color: #4af; margin-bottom: 10px;">🎒 INVENTORY (\${lootSystem.inventory.items.length}/\${lootSystem.inventory.maxSize})</h3>
                    <div style="max-height: 300px; overflow-y: auto; background: rgba(20,20,40,0.5); padding: 10px; border-radius: 6px;">
                        \${lootSystem.inventory.items.map((item, index) => \`
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #444;">
                                <span>\${item.icon} \${item.name}</span>
                                <button onclick="useInventoryItem(\${index})" style="padding: 4px 8px; background: #4a9; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    Use
                                </button>
                            </div>
                        \`).join('')}
                        \${lootSystem.inventory.items.length === 0 ? '<p style="color: #888; text-align: center;">No items in inventory</p>' : ''}
                    </div>
                </div>
                
                <div>
                    <h3 style="color: #fa4; margin-bottom: 10px;">⚙️ EQUIPMENT</h3>
                    <div style="background: rgba(20,20,40,0.5); padding: 10px; border-radius: 6px;">
                        \${Object.keys(lootSystem.equipment).map(category => \`
                            <div style="margin-bottom: 15px;">
                                <h4 style="color: #e0b15f; margin-bottom: 5px;">\${category.toUpperCase()}</h4>
                                \${Object.keys(lootSystem.equipment[category]).map(itemKey => {
                                    const item = lootSystem.equipment[category][itemKey];
                                    return \`
                                        <div style="padding: 6px; background: \${item.equipped ? 'rgba(68,170,68,0.3)' : 'rgba(40,40,60,0.3)'}; margin-bottom: 4px; border-radius: 4px; display: flex; justify-content: space-between;">
                                            <span>\${item.name} \${item.equipped ? '(EQUIPPED)' : ''}</span>
                                            \${!item.equipped ? \`<button onclick="equipItem('\${category}', '\${itemKey}')" style="padding: 2px 6px; background: #4a9; color: white; border: none; border-radius: 2px; cursor: pointer;">Equip</button>\` : ''}
                                        </div>
                                    \`;
                                }).join('')}
                            </div>
                        \`).join('')}
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                    <div style="background: rgba(40,40,60,0.5); padding: 10px; border-radius: 6px;">
                        <h4 style="color: #4af; margin: 0;">Credits</h4>
                        <p style="color: #fff; font-size: 18px; margin: 5px 0;">💰 \${state.player.credits}</p>
                    </div>
                    <div style="background: rgba(40,40,60,0.5); padding: 10px; border-radius: 6px;">
                        <h4 style="color: #fa4; margin: 0;">Ship Health</h4>
                        <p style="color: #fff; font-size: 18px; margin: 5px 0;">❤️ \${Math.floor(state.player.health)}/\${state.player.maxHealth}</p>
                    </div>
                    <div style="background: rgba(40,40,60,0.5); padding: 10px; border-radius: 6px;">
                        <h4 style="color: #4f4; margin: 0;">Weapon Energy</h4>
                        <p style="color: #fff; font-size: 18px; margin: 5px 0;">⚡ \${Math.floor(weaponSystem.weaponEnergy)}/\${weaponSystem.maxWeaponEnergy}</p>
                    </div>
                </div>
            </div>
            
            <p style="text-align: center; margin-top: 15px; font-size: 12px; color: #aaa;">
                Press I to close | Active Loot Drops: \${lootSystem.activeDrops.length}
            </p>
        </div>
    \`;
    
    // Create popup
    const popup = document.createElement('div');
    popup.id = 'inventory-popup';
    popup.style.cssText = \`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    \`;
    popup.innerHTML = inventoryHTML;
    
    // Close on click outside
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            closeInventoryScreen();
        }
    });
    
    document.body.appendChild(popup);
}

function closeInventoryScreen() {
    const popup = document.getElementById('inventory-popup');
    if (popup) {
        document.body.removeChild(popup);
    }
    lootUIOpen = false;
}

function useInventoryItem(index) {
    const item = lootSystem.inventory.items[index];
    if (!item) return;
    
    switch (item.consumableType) {
        case 'shield_boost':
            state.player.health = Math.min(state.player.maxHealth, state.player.health + 50);
            addMessage('SHIELD BOOST ACTIVATED', 'system');
            break;
        case 'damage_boost':
            // Temporary damage boost
            setTimeout(() => {
                addMessage('DAMAGE BOOST EXPIRED', 'warning');
            }, item.duration);
            addMessage('DAMAGE BOOST ACTIVATED', 'system');
            break;
        case 'speed_boost':
            // Temporary speed boost
            setTimeout(() => {
                addMessage('SPEED BOOST EXPIRED', 'warning');
            }, item.duration);
            addMessage('SPEED BOOST ACTIVATED', 'system');
            break;
    }
    
    // Remove item from inventory
    lootSystem.inventory.items.splice(index, 1);
    
    // Refresh UI
    closeInventoryScreen();
    setTimeout(() => openInventoryScreen(), 100);
}

function equipItem(category, itemKey) {
    const categoryItems = lootSystem.equipment[category];
    if (!categoryItems || !categoryItems[itemKey]) return;
    
    // Unequip all in category
    Object.values(categoryItems).forEach(item => item.equipped = false);
    
    // Equip selected item
    categoryItems[itemKey].equipped = true;
    
    addMessage(\`EQUIPPED: \${categoryItems[itemKey].name}\`, 'system');
    
    // Refresh UI
    closeInventoryScreen();
    setTimeout(() => openInventoryScreen(), 100);
    
    // Save progress
    saveProgress();
}

function findNearestLoot() {
    let nearest = null;
    let closestDistance = 100; // Max pickup range
    
    lootSystem.activeDrops.forEach(loot => {
        if (loot.userData.collected) return;
        
        const distance = ship.position.distanceTo(loot.position);
        if (distance < closestDistance) {
            nearest = loot;
            closestDistance = distance;
        }
    });
    
    return nearest;
}`;

// Add inventory functions at the end
indexContent = indexContent.replace(
  'function updateGraphicsQualityNote() {',
  `${inventoryUI}

function updateGraphicsQualityNote() {`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Loot System Integration & Controls deployed!');
console.log('💰 Controls:');
console.log('   I = Open/Close Inventory');
console.log('   L = Manual loot pickup');
console.log('🎒 Features: Auto-pickup, equipment system, consumables');