const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('⚔️ DEPLOYING: Weapon System Controls & Integration');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add weapon switching controls
const weaponKeys = `        case 'Digit1': // Switch to Pulse Cannon
          if (threeReady) switchWeapon('pulse');
          break;
        
        case 'Digit2': // Switch to Plasma Rifle
          if (threeReady) switchWeapon('plasma');
          break;
        
        case 'Digit3': // Switch to Laser Beam
          if (threeReady) switchWeapon('laser');
          break;
        
        case 'Digit4': // Switch to Ion Cannon
          if (threeReady) switchWeapon('ion');
          break;
        
        case 'Digit5': // Switch to Missile Launcher
          if (threeReady) switchWeapon('missile');
          break;
        
        case 'Digit6': // Switch to Railgun
          if (threeReady) switchWeapon('railgun');
          break;
        
        case 'KeyQ': // Quick weapon switch (next weapon)
          if (threeReady) {
            const weapons = Object.keys(weaponSystem.weapons);
            const unlockedWeapons = weapons.filter(key => weaponSystem.weapons[key].unlocked);
            const currentIndex = unlockedWeapons.indexOf(weaponSystem.currentWeapon);
            const nextIndex = (currentIndex + 1) % unlockedWeapons.length;
            switchWeapon(unlockedWeapons[nextIndex]);
          }
          break;
        
        case 'KeyR': // Reload / Upgrade current weapon
          if (threeReady && state.currentScreen === 'gunner') {
            const weapon = getCurrentWeapon();
            if (weapon && weapon.level < weapon.maxLevel) {
              if (upgradeWeapon(weaponSystem.currentWeapon)) {
                addMessage('WEAPON UPGRADED!', 'system');
              } else {
                addMessage('INSUFFICIENT CREDITS', 'warning');
              }
            } else {
              addMessage('WEAPON AT MAX LEVEL', 'warning');
            }
          }
          break;

`;

// Add weapon key handlers after existing controls
indexContent = indexContent.replace(
  `        case 'KeyB': // Toggle aim assist
          if (threeReady && targetingSystem.enabled) {
            targetingSystem.aimAssist.enabled = !targetingSystem.aimAssist.enabled;
            addMessage(targetingSystem.aimAssist.enabled ? 'AIM ASSIST ON' : 'AIM ASSIST OFF', 'system');
          }
          break;`,
  `        case 'KeyB': // Toggle aim assist
          if (threeReady && targetingSystem.enabled) {
            targetingSystem.aimAssist.enabled = !targetingSystem.aimAssist.enabled;
            addMessage(targetingSystem.aimAssist.enabled ? 'AIM ASSIST ON' : 'AIM ASSIST OFF', 'system');
          }
          break;

${weaponKeys}`
);

// Add weapon system initialization
const weaponInit = `    // Initialize weapon system
    initWeaponSystem();`;

// Add after targeting system init
indexContent = indexContent.replace(
  `    // Initialize advanced targeting system
    initTargetingSystem();`,
  `    // Initialize advanced targeting system
    initTargetingSystem();
${weaponInit}`
);

// Add weapon energy updates to game loop
const weaponUpdate = `      // Update weapon energy
      updateWeaponEnergy(deltaTime);
      
      // Update weapon UI
      if (Date.now() % 1000 < 50) { // Update UI every second
        updateWeaponUI();
      }`;

// Add after targeting updates
indexContent = indexContent.replace(
  `      // Apply aim assist if enabled
      applyAimAssist();`,
  `      // Apply aim assist if enabled
      applyAimAssist();
${weaponUpdate}`
);

// Update weapon firing to use new weapon system
const weaponFiring = `          // Advanced weapon system firing
          if (fireCurrentWeapon(fireDirection)) {
            // Weapon fired successfully
            addWeaponXP(1); // Gain XP for firing
          } else if (!canFireWeapon()) {
            if (weaponSystem.weaponEnergy < getCurrentWeapon().energyCost) {
              // Low energy warning (occasionally)
              if (Math.random() < 0.1) {
                addMessage('LOW WEAPON ENERGY', 'warning');
              }
            }
          }`;

// Find and replace the projectile creation code
if (indexContent.includes('const projectile = new THREE.Mesh(projectileGeo, projectileMat);')) {
  // Replace the entire projectile creation section with weapon system call
  const oldProjectileCode = indexContent.match(/\/\/ Create projectile[\s\S]*?projectiles\.push\(projectile\);/);
  if (oldProjectileCode) {
    indexContent = indexContent.replace(oldProjectileCode[0], weaponFiring);
  }
} else {
  console.log('⚠️ Could not find exact projectile creation code to replace');
  // Try a simpler replacement
  if (indexContent.includes('projectiles.push(projectile);')) {
    indexContent = indexContent.replace(
      'projectiles.push(projectile);',
      `projectiles.push(projectile);
          
          // Add weapon XP for successful firing
          addWeaponXP(1);`
    );
  }
}

// Add weapon shop integration to market screen
const weaponShop = `
// === WEAPON SHOP INTEGRATION ===
function openWeaponShop() {
    const shopHTML = \`
        <div style="background: rgba(0,0,0,0.9); color: white; padding: 20px; border-radius: 10px; max-height: 400px; overflow-y: auto;">
            <h2 style="color: #e0b15f; margin-bottom: 15px;">🛸 WEAPON ARSENAL</h2>
            <div style="display: grid; gap: 10px;">
                \${Object.keys(weaponSystem.weapons).map(key => {
                    const weapon = weaponSystem.weapons[key];
                    const upgradeCost = Math.floor(weapon.upgradeCost * Math.pow(1.5, weapon.level - 1));
                    const canUpgrade = weapon.unlocked && weapon.level < weapon.maxLevel && state.player.credits >= upgradeCost;
                    const canUnlock = !weapon.unlocked && weapon.unlockCost && state.player.credits >= weapon.unlockCost;
                    
                    return \`
                        <div style="border: 1px solid #444; padding: 12px; border-radius: 6px; background: rgba(20,20,40,0.5);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <h3 style="margin: 0; color: \${weapon.unlocked ? '#4a9' : '#888'};">\${weapon.name}</h3>
                                    <p style="margin: 5px 0; font-size: 12px; color: #ccc;">\${weapon.description}</p>
                                    <div style="font-size: 11px; color: #aaa;">
                                        Damage: \${Math.floor(weapon.damage * (1 + (weapon.level - 1) * 0.1))} | 
                                        Level: \${weapon.level}/\${weapon.maxLevel}
                                    </div>
                                </div>
                                <div>
                                    \${!weapon.unlocked && weapon.unlockCost ? 
                                        \`<button onclick="unlockWeapon('\${key}')" style="padding: 6px 12px; background: \${canUnlock ? '#4a9' : '#666'}; color: white; border: none; border-radius: 4px; cursor: \${canUnlock ? 'pointer' : 'not-allowed'};">
                                            Unlock (\${weapon.unlockCost}¢)
                                        </button>\` :
                                        weapon.unlocked ? 
                                            \`<button onclick="upgradeWeapon('\${key}')" style="padding: 6px 12px; background: \${canUpgrade ? '#e0b15f' : '#666'}; color: white; border: none; border-radius: 4px; cursor: \${canUpgrade ? 'pointer' : 'not-allowed'};">
                                                Upgrade (\${upgradeCost}¢)
                                            </button>\` :
                                            '<span style="color: #888;">Locked</span>'
                                    }
                                </div>
                            </div>
                        </div>
                    \`;
                }).join('')}
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #aaa;">
                Current Credits: \${state.player.credits}¢ | Weapon XP: \${weaponSystem.xp} | Total Kills: \${weaponSystem.totalKills}
            </p>
        </div>
    \`;
    
    // Show weapon shop in popup
    const popup = document.createElement('div');
    popup.id = 'weapon-shop-popup';
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
    popup.innerHTML = shopHTML;
    
    // Close on click outside
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            document.body.removeChild(popup);
        }
    });
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    closeBtn.style.cssText = \`
        position: absolute;
        top: 10px;
        right: 10px;
        background: #f44;
        color: white;
        border: none;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
    \`;
    closeBtn.onclick = () => document.body.removeChild(popup);
    popup.firstElementChild.appendChild(closeBtn);
    
    document.body.appendChild(popup);
}

// Add weapon shop key
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyW' && threeReady && state.currentScreen === 'gunner') {
        openWeaponShop();
    }
});`;

// Add weapon shop at the end
indexContent = indexContent.replace(
  '        updateGraphicsQualityNote();',
  `        updateGraphicsQualityNote();
${weaponShop}`
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Weapon System Controls & Integration deployed!');
console.log('⚔️ Controls:');
console.log('   1-6 = Switch weapons');
console.log('   Q = Next weapon');
console.log('   R = Upgrade weapon');
console.log('   W = Weapon shop');
console.log('🎮 6 weapons ready for combat!');