const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🎯 DEPLOYING: Advanced Lock-On Targeting System v3');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add advanced targeting variables after the main variables
const targetingVars = `let starLayers = [];

// === ADVANCED TARGETING SYSTEM ===
let targetingSystem = {
    enabled: false,
    currentTarget: null,
    targetQueue: [],
    autoTargetRange: 800,
    lockOnTime: 0,
    lockOnDuration: 2000, // 2 seconds to lock on
    lockOnActive: false,
    leadPrediction: true,
    priorityTargeting: 'closest', // closest, weakest, strongest
    targetLockSound: null,
    targetLostSound: null,
    aimAssist: {
        enabled: true,
        strength: 0.3,
        maxAdjustment: 50,
        smoothing: 0.1
    }
};

let targetingCrosshair = {
    element: null,
    tracking: false,
    position: { x: 0, y: 0 },
    lockIndicator: null,
    distanceDisplay: null
};`;

indexContent = safeReplace(indexContent, 'let starLayers = [];', targetingVars);

// Add advanced targeting functions
const targetingFunctions = `

// === ADVANCED TARGETING FUNCTIONS ===
function initTargetingSystem() {
    console.log('🎯 Initializing Advanced Targeting System...');
    
    // Create targeting crosshair
    const crosshair = document.createElement('div');
    crosshair.id = 'targeting-crosshair';
    crosshair.style.cssText = \`
        position: absolute;
        width: 40px;
        height: 40px;
        border: 2px solid #ff4444;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        display: none;
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
        box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
    \`;
    document.body.appendChild(crosshair);
    targetingCrosshair.element = crosshair;

    // Create lock-on indicator
    const lockIndicator = document.createElement('div');
    lockIndicator.id = 'lock-indicator';
    lockIndicator.style.cssText = \`
        position: absolute;
        width: 60px;
        height: 60px;
        border: 3px solid #ffff44;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1001;
        display: none;
        transform: translate(-50%, -50%);
        animation: lockPulse 1s infinite;
        box-shadow: 0 0 15px rgba(255, 255, 68, 0.7);
    \`;
    document.body.appendChild(lockIndicator);
    targetingCrosshair.lockIndicator = lockIndicator;

    // Create distance display
    const distanceDisplay = document.createElement('div');
    distanceDisplay.id = 'target-distance';
    distanceDisplay.style.cssText = \`
        position: absolute;
        color: #ffff44;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1002;
        display: none;
        background: rgba(0, 0, 0, 0.6);
        padding: 4px 8px;
        border-radius: 4px;
    \`;
    document.body.appendChild(distanceDisplay);
    targetingCrosshair.distanceDisplay = distanceDisplay;

    // Create target info display
    const targetInfo = document.createElement('div');
    targetInfo.id = 'target-info';
    targetInfo.style.cssText = \`
        position: absolute;
        color: #ffffff;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        pointer-events: none;
        z-index: 1003;
        display: none;
        background: rgba(0, 0, 0, 0.7);
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #444;
    \`;
    document.body.appendChild(targetInfo);
    targetingCrosshair.targetInfo = targetInfo;

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = \`
        @keyframes lockPulse {
            0% { border-color: #ffff44; transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { border-color: #ff8844; transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
            100% { border-color: #ffff44; transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes targetPulse {
            0% { border-color: #ff4444; }
            50% { border-color: #ff8844; }
            100% { border-color: #ff4444; }
        }
        @keyframes targetAcquired {
            0% { transform: translate(-50%, -50%) scale(1); }
            20% { transform: translate(-50%, -50%) scale(1.3); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
    \`;
    document.head.appendChild(style);
    
    console.log('🎯 Targeting system initialized successfully!');
}

function findBestTarget() {
    let candidates = [];
    enemies.forEach(enemy => {
        if (!enemy.dead && enemy.health > 0 && enemy.visible) {
            const distance = ship.position.distanceTo(enemy.position);
            if (distance <= targetingSystem.autoTargetRange) {
                candidates.push({
                    enemy: enemy,
                    distance: distance,
                    health: enemy.health,
                    maxHealth: enemy.maxHealth || 100,
                    angle: Math.atan2(enemy.position.z - ship.position.z, enemy.position.x - ship.position.x),
                    type: enemy.type || 'Unknown'
                });
            }
        }
    });

    if (candidates.length === 0) return null;

    // Sort by priority
    switch(targetingSystem.priorityTargeting) {
        case 'closest':
            candidates.sort((a, b) => a.distance - b.distance);
            break;
        case 'weakest':
            candidates.sort((a, b) => (a.health / a.maxHealth) - (b.health / b.maxHealth));
            break;
        case 'strongest':
            candidates.sort((a, b) => (b.health / b.maxHealth) - (a.health / a.maxHealth));
            break;
    }

    return candidates[0].enemy;
}

function setTarget(enemy) {
    // Clear old target
    if (targetingSystem.currentTarget) {
        if (targetingSystem.currentTarget.userData.targetHighlight) {
            scene.remove(targetingSystem.currentTarget.userData.targetHighlight);
            targetingSystem.currentTarget.userData.targetHighlight = null;
        }
    }

    targetingSystem.currentTarget = enemy;
    targetingSystem.lockOnTime = 0;
    targetingSystem.lockOnActive = false;

    if (enemy) {
        // Add target highlighting
        const highlight = new THREE.Mesh(
            new THREE.RingGeometry(15, 20, 8),
            new THREE.MeshBasicMaterial({ 
                color: 0xff4444, 
                transparent: true, 
                opacity: 0.8,
                side: THREE.DoubleSide
            })
        );
        highlight.position.copy(enemy.position);
        scene.add(highlight);
        enemy.userData = enemy.userData || {};
        enemy.userData.targetHighlight = highlight;

        // Show targeting UI
        targetingCrosshair.element.style.display = 'block';
        targetingCrosshair.element.style.animation = 'targetAcquired 0.3s ease';
        targetingCrosshair.distanceDisplay.style.display = 'block';
        targetingCrosshair.targetInfo.style.display = 'block';
        
        console.log('🎯 Target acquired:', enemy.type || 'Unknown Enemy');
        addMessage('TARGET ACQUIRED: ' + (enemy.type || 'UNKNOWN'), 'combat');
        playSound('beep');
    } else {
        // Hide targeting UI
        targetingCrosshair.element.style.display = 'none';
        targetingCrosshair.lockIndicator.style.display = 'none';
        targetingCrosshair.distanceDisplay.style.display = 'none';
        targetingCrosshair.targetInfo.style.display = 'none';
        console.log('🎯 Target cleared');
    }
}

function updateTargeting(deltaTime) {
    if (!targetingSystem.enabled) return;

    // Check if current target is still valid
    if (targetingSystem.currentTarget && 
        (targetingSystem.currentTarget.dead || 
         targetingSystem.currentTarget.health <= 0 ||
         ship.position.distanceTo(targetingSystem.currentTarget.position) > targetingSystem.autoTargetRange)) {
        setTarget(null);
        return;
    }

    // Update targeting UI if we have a target
    if (targetingSystem.currentTarget && camera && ship) {
        const targetWorldPos = targetingSystem.currentTarget.position.clone();
        const targetScreenPos = targetWorldPos.project(camera);
        
        const crosshair = targetingCrosshair.element;
        const lockIndicator = targetingCrosshair.lockIndicator;
        const distanceDisplay = targetingCrosshair.distanceDisplay;
        const targetInfo = targetingCrosshair.targetInfo;

        // Update crosshair position
        const x = (targetScreenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (targetScreenPos.y * -0.5 + 0.5) * window.innerHeight;
        
        crosshair.style.left = x + 'px';
        crosshair.style.top = y + 'px';
        
        // Update distance display
        const distance = ship.position.distanceTo(targetingSystem.currentTarget.position);
        distanceDisplay.textContent = \`\${Math.floor(distance)}m\`;
        distanceDisplay.style.left = (x + 30) + 'px';
        distanceDisplay.style.top = (y - 30) + 'px';

        // Update target info
        const healthPercent = Math.floor((targetingSystem.currentTarget.health / (targetingSystem.currentTarget.maxHealth || 100)) * 100);
        targetInfo.innerHTML = \`
            <div>TARGET: \${targetingSystem.currentTarget.type || 'UNKNOWN'}</div>
            <div>HULL: \${healthPercent}%</div>
            <div>RANGE: \${Math.floor(distance)}m</div>
        \`;
        targetInfo.style.left = (x + 50) + 'px';
        targetInfo.style.top = (y + 30) + 'px';

        // Update lock-on progress
        targetingSystem.lockOnTime += deltaTime;
        if (targetingSystem.lockOnTime >= targetingSystem.lockOnDuration && !targetingSystem.lockOnActive) {
            targetingSystem.lockOnActive = true;
            lockIndicator.style.display = 'block';
            lockIndicator.style.left = x + 'px';
            lockIndicator.style.top = y + 'px';
            
            // Change crosshair color to indicate lock
            crosshair.style.borderColor = '#44ff44';
            crosshair.style.boxShadow = '0 0 15px rgba(68, 255, 68, 0.8)';
            
            console.log('🎯 Target LOCKED ON:', targetingSystem.currentTarget.type || 'Enemy');
            addMessage('TARGET LOCKED', 'combat');
            playSound('beep');
        }

        // Update target highlight position
        if (targetingSystem.currentTarget.userData && targetingSystem.currentTarget.userData.targetHighlight) {
            targetingSystem.currentTarget.userData.targetHighlight.position.copy(targetingSystem.currentTarget.position);
            targetingSystem.currentTarget.userData.targetHighlight.lookAt(camera.position);
        }
    }
}

function getTargetedPosition() {
    if (!targetingSystem.currentTarget || !targetingSystem.lockOnActive) return null;

    const target = targetingSystem.currentTarget;
    let targetPos = target.position.clone();

    // Lead prediction if enabled
    if (targetingSystem.leadPrediction && target.velocity) {
        const distance = ship.position.distanceTo(target.position);
        const projectileSpeed = 200; // Adjust based on weapon
        const leadTime = distance / projectileSpeed;
        
        targetPos.add(target.velocity.clone().multiplyScalar(leadTime));
    }

    return targetPos;
}

function applyAimAssist() {
    if (!targetingSystem.aimAssist.enabled || !targetingSystem.currentTarget || !targetingSystem.lockOnActive) return;

    const targetWorldPos = getTargetedPosition();
    if (!targetWorldPos) return;

    // Calculate angle to target
    const targetDirection = targetWorldPos.clone().sub(ship.position).normalize();
    const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    
    // Calculate angular difference
    const angle = shipForward.angleTo(targetDirection);
    
    if (angle < Math.PI / 4) { // Only assist within 45 degrees
        // Apply gentle rotation towards target
        const adjustmentStrength = targetingSystem.aimAssist.strength * Math.min(1, angle / (Math.PI / 8));
        const cross = shipForward.clone().cross(targetDirection);
        const rotationAxis = cross.normalize();
        
        if (rotationAxis.length() > 0) {
            ship.rotateOnWorldAxis(rotationAxis, adjustmentStrength * 0.01);
        }
    }
}`;

// Find a good location for functions - after graphics functions
const functionLocation = `function updateGraphicsQualityNote() {`;
indexContent = safeReplace(indexContent, functionLocation, targetingFunctions + cr() + cr() + functionLocation);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Advanced Lock-On Targeting System v3 deployed!');
console.log('🎮 Variables and Functions added successfully!');