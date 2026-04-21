const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🎯 DEPLOYING: Targeting System Controls & Integration');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add targeting key handlers - find existing key handlers
const targetingKeys = `        case 'KeyT': // Toggle targeting system
          if (threeReady) {
            targetingSystem.enabled = !targetingSystem.enabled;
            console.log('🎯 Targeting system:', targetingSystem.enabled ? 'ENABLED' : 'DISABLED');
            if (!targetingSystem.enabled) {
              setTarget(null);
            }
            addMessage(targetingSystem.enabled ? 'TARGETING SYSTEM ONLINE' : 'TARGETING SYSTEM OFFLINE', 'system');
          }
          break;
        
        case 'KeyG': // Next target / Target nearest enemy
          if (threeReady && targetingSystem.enabled) {
            const newTarget = findBestTarget();
            setTarget(newTarget);
            if (newTarget) {
              addMessage('TARGET ACQUIRED', 'combat');
            } else {
              addMessage('NO TARGETS IN RANGE', 'warning');
            }
          }
          break;
        
        case 'KeyY': // Change targeting priority
          if (threeReady && targetingSystem.enabled) {
            const priorities = ['closest', 'weakest', 'strongest'];
            const currentIndex = priorities.indexOf(targetingSystem.priorityTargeting);
            const nextIndex = (currentIndex + 1) % priorities.length;
            targetingSystem.priorityTargeting = priorities[nextIndex];
            addMessage(\`PRIORITY: "\$"+"{targetingSystem.priorityTargeting.toUpperCase()}"\`, 'system');
          }
          break;
        
        case 'KeyB': // Toggle aim assist
          if (threeReady && targetingSystem.enabled) {
            targetingSystem.aimAssist.enabled = !targetingSystem.aimAssist.enabled;
            addMessage(targetingSystem.aimAssist.enabled ? 'AIM ASSIST ON' : 'AIM ASSIST OFF', 'system');
          }
          break;

`;

// Find location in key handlers - look for existing key case
indexContent = indexContent.replace(
  `        case 'KeyN': // Alliance screen
          showScreen('alliance');
          break;`,
  `        case 'KeyN': // Alliance screen
          showScreen('alliance');
          break;

${targetingKeys}`
);

// Add targeting initialization to three.js init
const targetingInit = `    // Initialize advanced targeting system
    initTargetingSystem();`;

// Find location after three.js setup
indexContent = indexContent.replace(
  `    console.log('✓ Three.js scene ready');
    threeReady = true;`,
  `    console.log('✓ Three.js scene ready');
    threeReady = true;
${targetingInit}`
);

// Add targeting updates to the game loop
const targetingUpdate = `      // Update advanced targeting system
      updateTargeting(deltaTime);
      
      // Apply aim assist if enabled
      applyAimAssist();`;

// Find location in the game loop - after enemy updates
indexContent = indexContent.replace(
  `      // Update enemies
      updateEnemies(deltaTime);`,
  `      // Update enemies
      updateEnemies(deltaTime);
${targetingUpdate}`
);

// Modify weapon firing to use targeting
const weaponTargeting = `          // Use targeted position if available
          let fireDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
          
          if (targetingSystem.lockOnActive && targetingSystem.currentTarget) {
            const targetPos = getTargetedPosition();
            if (targetPos) {
              fireDirection = targetPos.clone().sub(ship.position).normalize();
              console.log('🎯 Firing at locked target!');
            }
          }`;

// Find the weapon firing code
if (indexContent.includes('let fireDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);')) {
  indexContent = safeReplace(indexContent, 
    'let fireDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);',
    weaponTargeting
  );
} else {
  console.log('⚠️ Could not find weapon firing code - targeting assistance may not work');
}

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Targeting System Controls & Integration deployed!');
console.log('🎮 Key Controls:');
console.log('   T = Toggle targeting system on/off');
console.log('   G = Target nearest enemy');
console.log('   Y = Change targeting priority (closest/weakest/strongest)');
console.log('   B = Toggle aim assist');
console.log('🎯 Targeting system now fully integrated!');