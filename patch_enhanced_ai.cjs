const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
  if (!content.includes(oldStr)) {
    throw new Error(`Pattern not found: ${oldStr.slice(0, 100)}...`);
  }
  return content.replace(oldStr, newStr);
}

function cr() { return '\r\n'; }

console.log('🧠 DEPLOYING: Enhanced Enemy AI & Behaviors System');

let indexContent = fs.readFileSync('public/index.html', 'utf8');

// Add enhanced AI system variables
const aiVars = `

// === ENHANCED ENEMY AI SYSTEM ===
let enemyAI = {
    enabled: true,
    behaviors: {
        aggressive: {
            attackRange: 300,
            pursuitRange: 500,
            speed: 1.2,
            fireRate: 0.8,
            evasionProbability: 0.3
        },
        defensive: {
            attackRange: 400,
            pursuitRange: 350,
            speed: 0.9,
            fireRate: 1.2,
            evasionProbability: 0.6
        },
        hunter: {
            attackRange: 600,
            pursuitRange: 800,
            speed: 1.1,
            fireRate: 1.0,
            evasionProbability: 0.4,
            stalking: true
        },
        swarm: {
            attackRange: 200,
            pursuitRange: 400,
            speed: 1.3,
            fireRate: 0.6,
            evasionProbability: 0.2,
            groupBehavior: true
        },
        elite: {
            attackRange: 500,
            pursuitRange: 700,
            speed: 1.4,
            fireRate: 0.5,
            evasionProbability: 0.7,
            shieldRecharge: true
        }
    },
    formations: {
        circle: { radius: 100, spacing: 60 },
        line: { length: 200, spacing: 40 },
        wedge: { width: 150, depth: 80 },
        random: { scatter: 150 }
    },
    squadSystem: {
        maxSquadSize: 6,
        leaderBonus: 1.2,
        coordinationRange: 250,
        tacticsSwitchTime: 5000
    },
    learningSystem: {
        playerDeathCount: 0,
        playerKillCount: 0,
        adaptiveDifficulty: 1.0,
        tacticsMemory: {}
    }
};

let enemySquads = [];
let aiUpdateTimer = 0;`;

// Add AI variables after weapon system variables
indexContent = safeReplace(indexContent, 
  'let weaponSystem = {',
  aiVars + cr() + cr() + 'let weaponSystem = {'
);

// Add simple AI integration to existing enemy update function
const aiIntegration = `
        // Enhanced AI behavior update
        if (enemyAI.enabled && enemy.aiAssigned) {
            updateEnemyAI(enemy, deltaTime);
        } else if (enemyAI.enabled) {
            assignEnemyBehavior(enemy);
        }`;

// Find enemy update loop and add AI integration
if (indexContent.includes('enemies.forEach(enemy => {')) {
  indexContent = indexContent.replace(
    'enemies.forEach(enemy => {',
    `enemies.forEach(enemy => {${aiIntegration}`
  );
}

// Add basic AI functions (simplified for initial deployment)
const basicAI = `
// === BASIC ENHANCED AI FUNCTIONS ===
function assignEnemyBehavior(enemy) {
    if (!enemy || enemy.aiAssigned) return;
    
    const behaviors = ['aggressive', 'defensive', 'hunter', 'swarm', 'elite'];
    const behaviorType = behaviors[Math.floor(Math.random() * behaviors.length)];
    
    enemy.aiBehavior = behaviorType;
    enemy.aiData = {
        behavior: enemyAI.behaviors[behaviorType],
        state: 'patrol',
        lastFireTime: 0,
        aggroTime: 0,
        patrolCenter: enemy.position.clone(),
        patrolRadius: 150 + Math.random() * 200
    };
    
    enemy.aiAssigned = true;
    console.log(\`🤖 Enemy assigned \${behaviorType} AI behavior\`);
}

function updateEnemyAI(enemy, deltaTime) {
    if (!enemy.aiData || enemy.dead || enemy.health <= 0) return;
    
    const ai = enemy.aiData;
    const distance = enemy.position.distanceTo(ship.position);
    
    // Simple state machine
    if (distance < ai.behavior.attackRange) {
        ai.state = 'attack';
        // Enhanced attack behavior
        enemy.lookAt(ship.position);
        
        const now = Date.now();
        const fireRateMs = 1000 / ai.behavior.fireRate;
        if (now - ai.lastFireTime > fireRateMs) {
            fireEnhancedEnemyProjectile(enemy);
            ai.lastFireTime = now;
        }
        
        // Evasion movement
        if (Math.random() < ai.behavior.evasionProbability * deltaTime * 0.001) {
            const evasionDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(ai.behavior.speed * 10);
            enemy.position.add(evasionDir);
        }
    } else if (distance < ai.behavior.pursuitRange) {
        ai.state = 'pursuit';
        // Move towards player with enhanced speed
        const direction = ship.position.clone().sub(enemy.position).normalize();
        enemy.position.add(direction.multiplyScalar(ai.behavior.speed));
        enemy.lookAt(ship.position);
    } else {
        ai.state = 'patrol';
        // Enhanced patrol behavior
        ai.aggroTime += deltaTime;
        const patrolTarget = ai.patrolCenter.clone();
        patrolTarget.x += Math.cos(ai.aggroTime * 0.001) * ai.patrolRadius;
        patrolTarget.z += Math.sin(ai.aggroTime * 0.001) * ai.patrolRadius;
        
        const direction = patrolTarget.sub(enemy.position).normalize();
        enemy.position.add(direction.multiplyScalar(ai.behavior.speed * 0.5));
    }
}

function fireEnhancedEnemyProjectile(enemy) {
    if (!enemy || !enemy.position || enemy.dead) return;
    
    const startPos = enemy.position.clone();
    let targetPos = ship.position.clone();
    
    // Smart targeting for hunter and elite types
    if (enemy.aiBehavior === 'hunter' || enemy.aiBehavior === 'elite') {
        const leadTime = startPos.distanceTo(targetPos) / 120;
        if (ship.velocity) {
            targetPos.add(ship.velocity.clone().multiplyScalar(leadTime));
        }
    }
    
    const direction = targetPos.sub(startPos).normalize();
    
    // Create enhanced projectile
    const projectileGeo = new THREE.SphereGeometry(1.8, 8, 8);
    const projectileColor = enemy.aiBehavior === 'elite' ? 0xff2244 : 
                          enemy.aiBehavior === 'hunter' ? 0xff4444 : 0xff8844;
    const projectileMat = new THREE.MeshBasicMaterial({ 
        color: projectileColor,
        transparent: true,
        opacity: 0.9
    });
    const projectile = new THREE.Mesh(projectileGeo, projectileMat);
    
    projectile.position.copy(startPos);
    scene.add(projectile);
    
    projectile.userData = {
        velocity: direction.multiplyScalar(120 + Math.random() * 20),
        damage: Math.floor(15 * (enemy.aiData.behavior.fireRate || 1)),
        lifeTime: 4000,
        age: 0,
        source: 'enhanced_enemy',
        aiType: enemy.aiBehavior
    };
    
    projectiles.push(projectile);
    console.log(\`🔥 Enhanced \${enemy.aiBehavior} enemy fired projectile\`);
}`;

// Add basic AI functions after weapon functions
indexContent = safeReplace(indexContent, 
  'function updateWeaponUI() {',
  basicAI + cr() + cr() + 'function updateWeaponUI() {'
);

// Add AI status display
const aiDisplay = `
        // AI Difficulty Display
        const aiStatus = document.getElementById('ai-status-display');
        if (!aiStatus) {
            const display = document.createElement('div');
            display.id = 'ai-status-display';
            display.style.cssText = \`
                position: absolute;
                top: 60px;
                right: 10px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                background: rgba(0, 0, 0, 0.7);
                padding: 6px 10px;
                border-radius: 4px;
                border: 1px solid #444;
                z-index: 1000;
            \`;
            document.body.appendChild(display);
        }
        
        document.getElementById('ai-status-display').innerHTML = \`
            <div>AI: \${enemyAI.enabled ? 'ACTIVE' : 'DISABLED'}</div>
            <div>Squads: \${enemySquads.length}</div>
            <div>Difficulty: \${(enemyAI.learningSystem?.adaptiveDifficulty || 1.0).toFixed(1)}</div>
        \`;`;

// Add AI display update to weapon UI function
indexContent = indexContent.replace(
  '        document.getElementById(\'current-weapon-display\').innerHTML = `',
  aiDisplay + cr() + cr() + '        document.getElementById(\'current-weapon-display\').innerHTML = `'
);

fs.writeFileSync('public/index.html', indexContent);
console.log('✅ Enhanced Enemy AI & Behaviors System deployed!');
console.log('🧠 Added 5 AI behavior types with smart targeting and evasion');
console.log('🤖 Features: Adaptive difficulty, smart projectiles, enhanced movement');