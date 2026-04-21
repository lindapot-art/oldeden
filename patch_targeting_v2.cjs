const fs = require('fs');
const path = require('path');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() {
  return '\r\n';
}

console.log('🎯 DEPLOYING: Advanced Lock-On Targeting System v2');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add advanced targeting variables
const targetingVars = `        // === ADVANCED TARGETING SYSTEM ===
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

// Find targeting variables location - try a different anchor
const targetingVarLocation = `        let ui = {`;
indexContent = safeReplace(indexContent, targetingVarLocation, targetingVars + cr() + cr() + targetingVarLocation);

// Add advanced targeting functions
const targetingFunctions = `
        // === ADVANCED TARGETING FUNCTIONS ===
        function initTargetingSystem() {
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
            \`;
            document.body.appendChild(distanceDisplay);
            targetingCrosshair.distanceDisplay = distanceDisplay;

            // Add lock pulse animation
            const style = document.createElement('style');
            style.textContent = \`
                @keyframes lockPulse {
                    0% { border-color: #ffff44; transform: translate(-50%, -50%) scale(1); }
                    50% { border-color: #ff8844; transform: translate(-50%, -50%) scale(1.1); }
                    100% { border-color: #ffff44; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes targetPulse {
                    0% { border-color: #ff4444; }
                    50% { border-color: #ff8844; }
                    100% { border-color: #ff4444; }
                }
            \`;
            document.head.appendChild(style);
        }

        function findBestTarget() {
            let candidates = [];
            enemies.forEach(enemy => {
                if (!enemy.dead && enemy.health > 0) {
                    const distance = ship.position.distanceTo(enemy.position);
                    if (distance <= targetingSystem.autoTargetRange) {
                        candidates.push({
                            enemy: enemy,
                            distance: distance,
                            health: enemy.health,
                            maxHealth: enemy.maxHealth,
                            angle: Math.atan2(enemy.position.z - ship.position.z, enemy.position.x - ship.position.x)
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
            if (targetingSystem.currentTarget) {
                // Remove old target highlighting
                if (targetingSystem.currentTarget.userData.targetHighlight) {
                    targetingSystem.currentTarget.remove(targetingSystem.currentTarget.userData.targetHighlight);
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
                enemy.userData.targetHighlight = highlight;

                // Show targeting UI
                targetingCrosshair.element.style.display = 'block';
                targetingCrosshair.distanceDisplay.style.display = 'block';
                
                console.log('🎯 Target acquired:', enemy.type || 'Unknown Enemy');
            } else {
                // Hide targeting UI
                targetingCrosshair.element.style.display = 'none';
                targetingCrosshair.lockIndicator.style.display = 'none';
                targetingCrosshair.distanceDisplay.style.display = 'none';
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
            }

            // Update targeting UI if we have a target
            if (targetingSystem.currentTarget) {
                const targetWorldPos = targetingSystem.currentTarget.position.clone();
                const targetScreenPos = targetWorldPos.project(camera);
                
                const crosshair = targetingCrosshair.element;
                const lockIndicator = targetingCrosshair.lockIndicator;
                const distanceDisplay = targetingCrosshair.distanceDisplay;

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

                // Update lock-on progress
                targetingSystem.lockOnTime += deltaTime;
                if (targetingSystem.lockOnTime >= targetingSystem.lockOnDuration && !targetingSystem.lockOnActive) {
                    targetingSystem.lockOnActive = true;
                    lockIndicator.style.display = 'block';
                    lockIndicator.style.left = x + 'px';
                    lockIndicator.style.top = y + 'px';
                    
                    // Change crosshair color to indicate lock
                    crosshair.style.borderColor = '#44ff44';
                    console.log('🎯 Target LOCKED ON:', targetingSystem.currentTarget.type || 'Enemy');
                }

                // Update target highlight position
                if (targetingSystem.currentTarget.userData.targetHighlight) {
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

// Find function location - try different anchor
const functionLocation = `        function showScreen(screenName) {`;
indexContent = safeReplace(indexContent, functionLocation, targetingFunctions + cr() + cr() + functionLocation);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Advanced Lock-On Targeting System v2 deployed!');
console.log('🎮 Variables and Functions added!');