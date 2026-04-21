const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('⚔️ DEPLOYING: Advanced Weapon Variety & Upgrade System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add weapon system variables
const weaponVars = `

// === ADVANCED WEAPON SYSTEM ===
let weaponSystem = {
    currentWeapon: 'pulse',
    weapons: {
        pulse: {
            name: 'Pulse Cannon',
            damage: 25,
            fireRate: 400, // ms between shots
            projectileSpeed: 200,
            energyCost: 5,
            color: 0x4488ff,
            sound: 'pulse',
            projectileLife: 3000,
            spread: 0,
            penetration: 0,
            size: 2,
            unlocked: true,
            level: 1,
            maxLevel: 10,
            upgradeCost: 100,
            description: 'Standard energy weapon'
        },
        plasma: {
            name: 'Plasma Rifle',
            damage: 40,
            fireRate: 600,
            projectileSpeed: 180,
            energyCost: 8,
            color: 0xff4444,
            sound: 'plasma',
            projectileLife: 2500,
            spread: 0.1,
            penetration: 0,
            size: 3,
            unlocked: false,
            level: 1,
            maxLevel: 10,
            upgradeCost: 200,
            unlockCost: 500,
            description: 'High-damage plasma bolts'
        },
        laser: {
            name: 'Laser Beam',
            damage: 15,
            fireRate: 100, // rapid fire
            projectileSpeed: 400,
            energyCost: 3,
            color: 0x44ff44,
            sound: 'laser',
            projectileLife: 2000,
            spread: 0,
            penetration: 1,
            size: 1,
            unlocked: false,
            level: 1,
            maxLevel: 10,
            upgradeCost: 150,
            unlockCost: 300,
            description: 'Fast, precise laser beam'
        },
        railgun: {
            name: 'Railgun',
            damage: 100,
            fireRate: 2000, // slow but powerful
            projectileSpeed: 500,
            energyCost: 25,
            color: 0xffff44,
            sound: 'railgun',
            projectileLife: 4000,
            spread: 0,
            penetration: 3,
            size: 1,
            unlocked: false,
            level: 1,
            maxLevel: 10,
            upgradeCost: 400,
            unlockCost: 1000,
            description: 'Devastating kinetic weapon'
        },
        missile: {
            name: 'Missile Launcher',
            damage: 80,
            fireRate: 1500,
            projectileSpeed: 150,
            energyCost: 20,
            color: 0xff8844,
            sound: 'missile',
            projectileLife: 5000,
            spread: 0,
            penetration: 0,
            size: 4,
            tracking: true,
            unlocked: false,
            level: 1,
            maxLevel: 10,
            upgradeCost: 350,
            unlockCost: 800,
            description: 'Tracking explosive missiles'
        },
        ion: {
            name: 'Ion Cannon',
            damage: 60,
            fireRate: 800,
            projectileSpeed: 220,
            energyCost: 15,
            color: 0x8844ff,
            sound: 'ion',
            projectileLife: 3500,
            spread: 0,
            penetration: 2,
            size: 3,
            shield_bonus: 2.0, // extra damage to shields
            unlocked: false,
            level: 1,
            maxLevel: 10,
            upgradeCost: 300,
            unlockCost: 600,
            description: 'Energy weapon effective vs shields'
        }
    },
    lastFireTime: 0,
    weaponEnergy: 100,
    maxWeaponEnergy: 100,
    energyRegenRate: 20, // per second
    xp: 0,
    totalKills: 0
};`;

// Find location for weapon variables
indexContent = safeReplace(indexContent, 
  'let targetingCrosshair = {',
  weaponVars + cr() + cr() + 'let targetingCrosshair = {'
);

// Add weapon functions
const weaponFunctions = `

// === WEAPON SYSTEM FUNCTIONS ===
function initWeaponSystem() {
    console.log('⚔️ Initializing Advanced Weapon System...');
    
    // Load weapon progression from save
    if (state.weapons) {
        Object.keys(state.weapons).forEach(weaponKey => {
            if (weaponSystem.weapons[weaponKey]) {
                Object.assign(weaponSystem.weapons[weaponKey], state.weapons[weaponKey]);
            }
        });
        weaponSystem.currentWeapon = state.currentWeapon || 'pulse';
        weaponSystem.xp = state.weaponXp || 0;
        weaponSystem.totalKills = state.weaponKills || 0;
    }
    
    updateWeaponUI();
    console.log('⚔️ Weapon system initialized with', Object.keys(weaponSystem.weapons).length, 'weapon types');
}

function getCurrentWeapon() {
    return weaponSystem.weapons[weaponSystem.currentWeapon];
}

function getWeaponDamage() {
    const weapon = getCurrentWeapon();
    if (!weapon) return 25;
    
    // Level scaling: +10% damage per level
    const levelMultiplier = 1 + (weapon.level - 1) * 0.1;
    return Math.floor(weapon.damage * levelMultiplier);
}

function getWeaponFireRate() {
    const weapon = getCurrentWeapon();
    if (!weapon) return 400;
    
    // Level scaling: -5% fire rate delay per level (faster firing)
    const levelMultiplier = 1 - (weapon.level - 1) * 0.05;
    return Math.floor(weapon.fireRate * Math.max(0.5, levelMultiplier));
}

function canFireWeapon() {
    const weapon = getCurrentWeapon();
    if (!weapon) return false;
    
    const now = Date.now();
    const timeSinceLastFire = now - weaponSystem.lastFireTime;
    const fireRate = getWeaponFireRate();
    
    return timeSinceLastFire >= fireRate && weaponSystem.weaponEnergy >= weapon.energyCost;
}

function fireCurrentWeapon(fireDirection) {
    const weapon = getCurrentWeapon();
    if (!weapon || !canFireWeapon()) return false;
    
    weaponSystem.lastFireTime = Date.now();
    weaponSystem.weaponEnergy = Math.max(0, weaponSystem.weaponEnergy - weapon.energyCost);
    
    createWeaponProjectile(weapon, fireDirection);
    playSound(weapon.sound);
    
    // Create muzzle flash effect
    createMuzzleFlash(weapon);
    
    return true;
}

function createWeaponProjectile(weapon, direction) {
    const startPos = ship.position.clone();
    startPos.add(direction.clone().multiplyScalar(15)); // Offset from ship center
    
    // Apply weapon spread
    if (weapon.spread > 0) {
        const spread = weapon.spread;
        direction.x += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
    }
    
    const velocity = direction.clone().multiplyScalar(weapon.projectileSpeed);
    
    // Create projectile geometry based on weapon type
    let geometry, material;
    
    switch(weaponSystem.currentWeapon) {
        case 'laser':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 6);
            material = new THREE.MeshBasicMaterial({ 
                color: weapon.color, 
                transparent: true, 
                opacity: 0.9 
            });
            break;
        case 'missile':
            geometry = new THREE.ConeGeometry(1.5, 6, 6);
            material = new THREE.MeshBasicMaterial({ color: weapon.color });
            break;
        case 'railgun':
            geometry = new THREE.SphereGeometry(1, 8, 8);
            material = new THREE.MeshBasicMaterial({ 
                color: weapon.color, 
                transparent: true, 
                opacity: 0.8 
            });
            break;
        default:
            geometry = new THREE.SphereGeometry(weapon.size || 2, 8, 8);
            material = new THREE.MeshBasicMaterial({ color: weapon.color });
    }
    
    const projectile = new THREE.Mesh(geometry, material);
    projectile.position.copy(startPos);
    projectile.lookAt(startPos.clone().add(direction));
    
    scene.add(projectile);
    
    // Add projectile properties
    projectile.userData = {
        velocity: velocity,
        damage: getWeaponDamage(),
        penetration: weapon.penetration || 0,
        lifeTime: weapon.projectileLife,
        age: 0,
        weaponType: weaponSystem.currentWeapon,
        tracking: weapon.tracking || false,
        shield_bonus: weapon.shield_bonus || 1.0
    };
    
    projectiles.push(projectile);
    
    console.log(\`🔫 Fired \${weapon.name} - Damage: \${projectile.userData.damage}\`);
}

function createMuzzleFlash(weapon) {
    const flashGeo = new THREE.SphereGeometry(5, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ 
        color: weapon.color, 
        transparent: true, 
        opacity: 0.7 
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    
    const flashPos = ship.position.clone();
    flashPos.add(new THREE.Vector3(0, 0, -15).applyQuaternion(ship.quaternion));
    flash.position.copy(flashPos);
    
    scene.add(flash);
    
    // Animate muzzle flash
    const startTime = Date.now();
    const flashDuration = 100;
    
    const animateFlash = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / flashDuration;
        
        if (progress >= 1) {
            scene.remove(flash);
            return;
        }
        
        flash.material.opacity = 0.7 * (1 - progress);
        flash.scale.setScalar(1 + progress * 2);
        
        requestAnimationFrame(animateFlash);
    };
    
    animateFlash();
}

function updateWeaponEnergy(deltaTime) {
    if (weaponSystem.weaponEnergy < weaponSystem.maxWeaponEnergy) {
        weaponSystem.weaponEnergy = Math.min(
            weaponSystem.maxWeaponEnergy,
            weaponSystem.weaponEnergy + weaponSystem.energyRegenRate * deltaTime / 1000
        );
    }
}

function switchWeapon(weaponKey) {
    if (weaponSystem.weapons[weaponKey] && weaponSystem.weapons[weaponKey].unlocked) {
        weaponSystem.currentWeapon = weaponKey;
        const weapon = getCurrentWeapon();
        addMessage(\`WEAPON: \${weapon.name.toUpperCase()}\`, 'system');
        updateWeaponUI();
        playSound('beep');
        console.log(\`⚔️ Switched to \${weapon.name}\`);
        return true;
    }
    return false;
}

function upgradeWeapon(weaponKey) {
    const weapon = weaponSystem.weapons[weaponKey];
    if (!weapon || !weapon.unlocked || weapon.level >= weapon.maxLevel) return false;
    
    const cost = Math.floor(weapon.upgradeCost * Math.pow(1.5, weapon.level - 1));
    if (state.player.credits < cost) return false;
    
    state.player.credits -= cost;
    weapon.level++;
    
    addMessage(\`\${weapon.name.toUpperCase()} UPGRADED TO LEVEL \${weapon.level}\`, 'system');
    updateWeaponUI();
    playSound('upgrade');
    saveProgress();
    
    return true;
}

function unlockWeapon(weaponKey) {
    const weapon = weaponSystem.weapons[weaponKey];
    if (!weapon || weapon.unlocked || !weapon.unlockCost) return false;
    
    if (state.player.credits < weapon.unlockCost) return false;
    
    state.player.credits -= weapon.unlockCost;
    weapon.unlocked = true;
    
    addMessage(\`NEW WEAPON UNLOCKED: \${weapon.name.toUpperCase()}\`, 'achievement');
    updateWeaponUI();
    playSound('achievement');
    saveProgress();
    
    return true;
}

function addWeaponXP(amount) {
    weaponSystem.xp += amount;
    
    // Check for weapon unlocks based on XP
    const xpThresholds = {
        plasma: 100,
        laser: 250,
        ion: 500,
        missile: 750,
        railgun: 1000
    };
    
    Object.keys(xpThresholds).forEach(weaponKey => {
        const weapon = weaponSystem.weapons[weaponKey];
        if (!weapon.unlocked && weaponSystem.xp >= xpThresholds[weaponKey]) {
            weapon.unlocked = true;
            addMessage(\`XP UNLOCK: \${weapon.name.toUpperCase()}\`, 'achievement');
            playSound('achievement');
        }
    });
    
    updateWeaponUI();
}

function updateWeaponUI() {
    // Update weapon display in HUD
    const weaponDisplay = document.getElementById('current-weapon-display');
    if (!weaponDisplay) {
        // Create weapon display if it doesn't exist
        const display = document.createElement('div');
        display.id = 'current-weapon-display';
        display.style.cssText = \`
            position: absolute;
            top: 10px;
            left: 10px;
            color: #fff;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            background: rgba(0, 0, 0, 0.7);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #444;
            z-index: 1000;
        \`;
        document.body.appendChild(display);
    }
    
    const weapon = getCurrentWeapon();
    if (weapon) {
        document.getElementById('current-weapon-display').innerHTML = \`
            <div><strong>\${weapon.name}</strong> (Lvl \${weapon.level})</div>
            <div>Energy: \${Math.floor(weaponSystem.weaponEnergy)}/\${weaponSystem.maxWeaponEnergy}</div>
            <div>Damage: \${getWeaponDamage()}</div>
        \`;
    }
}`;

// Find location for weapon functions
indexContent = safeReplace(indexContent, 
  'function applyAimAssist() {',
  weaponFunctions + cr() + cr() + 'function applyAimAssist() {'
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Advanced Weapon Variety & Upgrade System v1 deployed!');
console.log('⚔️ Added 6 weapon types with upgrade system');