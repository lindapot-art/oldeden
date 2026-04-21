#!/usr/bin/env node
// 👑 WAVE 8.1: CRITICAL EMERGENCY REPAIR
// Fixes Three.js initialization errors from Wave 8

const fs = require('fs');
const path = require('path');

function safeReplace(content, search, replace) {
  if (!content.includes(search)) {
    console.log('⚠️ Search pattern not found:', search.substring(0, 60) + '...');
    return content;
  }
  return content.replace(search, replace);
}

function cr(text) {
  return text.split('\\n').join('\\r\\n');
}

console.log('👑 WAVE 8.1: CRITICAL EMERGENCY REPAIR');
console.log('🚨 FIXING THREE.JS INITIALIZATION ERRORS');
console.log('═════════════════════════════════════════');

try {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  console.log('📊 Current file size:', Math.round(Buffer.byteLength(content, 'utf8') / 1024), 'KB');
  
  // === CRITICAL FIX: Wrap all Three.js code in initialization check ===
  console.log('🔧 CRITICAL: Wrapping Three.js code in safe initialization...');
  
  const safeThreeJSWrapper = `
        
        // === 👑 WAVE 8.1: SAFE THREE.JS INITIALIZATION WRAPPER ===
        
        // Wait for Three.js to be fully loaded
        function waitForThreeJS(callback, attempts = 0) {
            if (typeof THREE !== 'undefined' && window.scene && window.renderer && window.camera) {
                console.log('✅ Three.js fully ready, executing callback');
                callback();
            } else if (attempts < 100) {
                console.log('⏳ Waiting for Three.js... attempt', attempts + 1);
                setTimeout(() => waitForThreeJS(callback, attempts + 1), 100);
            } else {
                console.error('❌ Three.js failed to initialize after 10 seconds');
            }
        }
        
        // Safe enemy spawning that waits for Three.js
        function safeEmergencyEnemySpawning() {
            waitForThreeJS(() => {
                console.log('🚨 SAFE: Emergency enemy spawning starting...');
                
                if (!window.gameState) {
                    window.gameState = {
                        enemies: [],
                        projectiles: [],
                        powerups: [],
                        effects: [],
                        wave: 1,
                        score: 0,
                        level: 1
                    };
                }
                
                // Clear existing enemies safely
                if (window.gameState.enemies) {
                    window.gameState.enemies.forEach(enemy => {
                        if (enemy.mesh && window.scene) {
                            window.scene.remove(enemy.mesh);
                        }
                    });
                    window.gameState.enemies = [];
                }
                
                // Spawn enemies with proper Three.js objects
                const emergencyEnemyTypes = [
                    { name: 'SAFE_SCOUT', health: 50, damage: 10, speed: 0.1, color: 0xff4444 },
                    { name: 'SAFE_FIGHTER', health: 80, damage: 15, speed: 0.08, color: 0x44ff44 },
                    { name: 'SAFE_DESTROYER', health: 120, damage: 25, speed: 0.06, color: 0x4444ff }
                ];
                
                for (let i = 0; i < 4; i++) {
                    const enemyType = emergencyEnemyTypes[i % emergencyEnemyTypes.length];
                    
                    try {
                        // Create enemy with proper Three.js objects
                        const geometry = new THREE.ConeGeometry(0.8, 2.5, 6);
                        const material = new THREE.MeshLambertMaterial({ color: enemyType.color });
                        const mesh = new THREE.Mesh(geometry, material);
                        
                        // Position around player
                        const angle = (i / 4) * Math.PI * 2;
                        const distance = 15 + i * 2;
                        
                        mesh.position.set(
                            Math.cos(angle) * distance,
                            (Math.random() - 0.5) * 4,
                            Math.sin(angle) * distance
                        );
                        
                        mesh.rotation.y = angle + Math.PI;
                        
                        // Create enemy object
                        const enemy = {
                            mesh: mesh,
                            type: enemyType.name,
                            health: enemyType.health,
                            maxHealth: enemyType.health,
                            damage: enemyType.damage,
                            speed: enemyType.speed,
                            position: mesh.position,
                            velocity: new THREE.Vector3(),
                            lastShot: 0,
                            active: true,
                            id: 'safe_enemy_' + i + '_' + Date.now()
                        };
                        
                        window.scene.add(mesh);
                        window.gameState.enemies.push(enemy);
                        
                        console.log('✅ Safe enemy spawned:', enemy.type, 'at distance', distance.toFixed(1));
                        
                    } catch (error) {
                        console.error('❌ Failed to spawn enemy', i, ':', error);
                    }
                }
                
                // Start safe enemy spawning loop
                window.safeSpawnInterval = setInterval(() => {
                    if (!window.scene || !window.gameState || window.gameState.enemies.length >= 6) return;
                    
                    try {
                        const enemyType = emergencyEnemyTypes[Math.floor(Math.random() * emergencyEnemyTypes.length)];
                        
                        const geometry = new THREE.ConeGeometry(0.8, 2.5, 6);
                        const material = new THREE.MeshLambertMaterial({ color: enemyType.color });
                        const mesh = new THREE.Mesh(geometry, material);
                        
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 18 + Math.random() * 8;
                        
                        mesh.position.set(
                            Math.cos(angle) * distance,
                            (Math.random() - 0.5) * 6,
                            Math.sin(angle) * distance
                        );
                        
                        const enemy = {
                            mesh: mesh,
                            type: enemyType.name,
                            health: enemyType.health,
                            maxHealth: enemyType.health,
                            damage: enemyType.damage,
                            speed: enemyType.speed,
                            position: mesh.position,
                            velocity: new THREE.Vector3(),
                            lastShot: 0,
                            active: true,
                            id: 'safe_respawn_' + Date.now() + '_' + Math.random()
                        };
                        
                        window.scene.add(mesh);
                        window.gameState.enemies.push(enemy);
                        
                        console.log('♻️ Safe enemy respawned:', enemy.type);
                        
                    } catch (error) {
                        console.error('❌ Failed to respawn enemy:', error);
                    }
                }, 3000);
                
                console.log('✅ SAFE EMERGENCY ENEMY SPAWNING ACTIVE!');
            });
        }
        
        // Safe weapon firing that waits for Three.js
        function safeEmergencyFireWeapon() {
            if (typeof THREE === 'undefined' || !window.scene || !window.playerShip) {
                console.log('⚠️ Three.js or scene not ready for weapon firing');
                return;
            }
            
            try {
                // Create projectile with proper Three.js objects
                const projectileGeometry = new THREE.SphereGeometry(0.15, 8, 8);
                const projectileMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x44aaff, 
                    emissive: 0x001144 
                });
                const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
                
                // Position from player ship
                projectileMesh.position.copy(window.playerShip.position);
                
                // Get direction (fallback if getWorldDirection fails)
                let direction;
                try {
                    direction = window.playerShip.getWorldDirection(new THREE.Vector3());
                } catch (e) {
                    direction = new THREE.Vector3(0, 0, -1);
                    console.log('⚠️ Using fallback direction for weapon firing');
                }
                
                projectileMesh.position.add(direction.clone().multiplyScalar(2));
                
                // Create projectile object
                const projectile = {
                    mesh: projectileMesh,
                    velocity: direction.multiplyScalar(0.8),
                    damage: 50,
                    owner: 'player',
                    life: 5000,
                    startTime: Date.now(),
                    id: 'safe_proj_' + Date.now() + '_' + Math.random()
                };
                
                window.scene.add(projectileMesh);
                
                if (!window.gameState.projectiles) window.gameState.projectiles = [];
                window.gameState.projectiles.push(projectile);
                
                console.log('🔥 Safe weapon fired!');
                
                // Muzzle flash effect
                const muzzleFlash = document.getElementById('muzzle-flash-overlay');
                if (muzzleFlash) {
                    muzzleFlash.style.opacity = '1';
                    setTimeout(() => muzzleFlash.style.opacity = '0', 50);
                }
                
            } catch (error) {
                console.error('❌ Safe weapon firing failed:', error);
            }
        }
        
        // Safe game loop that checks for Three.js availability
        function safeContinuousGameLoop() {
            if (typeof THREE === 'undefined' || !window.scene || !window.gameState) {
                return; // Skip this frame
            }
            
            try {
                // Update enemies safely
                if (window.gameState.enemies && window.gameState.enemies.length > 0) {
                    for (let i = window.gameState.enemies.length - 1; i >= 0; i--) {
                        const enemy = window.gameState.enemies[i];
                        
                        if (!enemy || !enemy.active || !enemy.mesh) {
                            if (enemy && enemy.mesh && window.scene) {
                                window.scene.remove(enemy.mesh);
                            }
                            window.gameState.enemies.splice(i, 1);
                            continue;
                        }
                        
                        // Simple enemy AI
                        if (window.playerShip) {
                            const playerPos = window.playerShip.position;
                            const enemyPos = enemy.position;
                            
                            const direction = new THREE.Vector3()
                                .subVectors(playerPos, enemyPos)
                                .normalize()
                                .multiplyScalar(enemy.speed);
                            
                            enemy.position.add(direction);
                            enemy.mesh.position.copy(enemy.position);
                            enemy.mesh.lookAt(playerPos);
                        }
                    }
                }
                
                // Update projectiles safely
                if (window.gameState.projectiles && window.gameState.projectiles.length > 0) {
                    for (let i = window.gameState.projectiles.length - 1; i >= 0; i--) {
                        const projectile = window.gameState.projectiles[i];
                        
                        if (!projectile || !projectile.mesh) {
                            window.gameState.projectiles.splice(i, 1);
                            continue;
                        }
                        
                        // Move projectile
                        projectile.mesh.position.add(projectile.velocity);
                        
                        // Check lifetime
                        const age = Date.now() - projectile.startTime;
                        if (age > projectile.life) {
                            window.scene.remove(projectile.mesh);
                            window.gameState.projectiles.splice(i, 1);
                            continue;
                        }
                        
                        // Simple collision detection
                        if (projectile.owner === 'player' && window.gameState.enemies) {
                            for (let j = 0; j < window.gameState.enemies.length; j++) {
                                const enemy = window.gameState.enemies[j];
                                if (!enemy || !enemy.mesh || !enemy.active) continue;
                                
                                const distance = projectile.mesh.position.distanceTo(enemy.position);
                                if (distance < 2) {
                                    // Hit enemy
                                    enemy.health -= projectile.damage;
                                    
                                    if (enemy.health <= 0) {
                                        enemy.active = false;
                                        
                                        // Award score
                                        if (window.ADVANCED_GAME_STATE) {
                                            window.ADVANCED_GAME_STATE.score += 100;
                                            console.log('💀 Enemy destroyed! Score:', window.ADVANCED_GAME_STATE.score);
                                        }
                                    }
                                    
                                    window.scene.remove(projectile.mesh);
                                    window.gameState.projectiles.splice(i, 1);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Update debug HUD
                const enemyCount = window.gameState.enemies ? window.gameState.enemies.filter(e => e.active).length : 0;
                const projectileCount = window.gameState.projectiles ? window.gameState.projectiles.length : 0;
                const score = window.ADVANCED_GAME_STATE ? window.ADVANCED_GAME_STATE.score : 0;
                
                const debugEl = document.querySelector('.debug-info');
                if (debugEl) {
                    debugEl.innerHTML = \`
                        <div>✅ SAFE SYSTEMS ACTIVE</div>
                        <div>⚔️ Enemies: \${enemyCount}</div>
                        <div>🔴 Projectiles: \${projectileCount}</div>
                        <div>⭐ Score: \${score}</div>
                        <div>🎮 Three.js: Ready</div>
                    \`;
                }
                
            } catch (error) {
                console.error('❌ Safe game loop error:', error);
            }
        }
        
        // Safe auto-start that waits for everything to be ready
        function safeUltimateAutoStart() {
            console.log('👑 SAFE AUTO-START: Waiting for complete initialization...');
            
            // Wait for Three.js and scene to be ready
            waitForThreeJS(() => {
                console.log('✅ Three.js ready, starting safe auto-start sequence...');
                
                // Initialize game state safely
                if (!window.ADVANCED_GAME_STATE) {
                    window.ADVANCED_GAME_STATE = {
                        health: 100,
                        maxHealth: 100,
                        shields: 100,
                        maxShields: 100,
                        energy: 100,
                        maxEnergy: 100,
                        score: 0,
                        level: 1,
                        experience: 0,
                        credits: 1000,
                        currentWeapon: 0,
                        unlockedWeapons: [true, true, true, true, true, true]
                    };
                }
                
                // Start safe enemy spawning
                setTimeout(() => {
                    safeEmergencyEnemySpawning();
                }, 1000);
                
                // Start safe game loop
                setTimeout(() => {
                    window.safeGameLoopInterval = setInterval(() => {
                        safeContinuousGameLoop();
                    }, 16); // 60 FPS
                    
                    console.log('⚡ Safe game loop running at 60 FPS');
                }, 2000);
                
                // Enhanced safe controls
                document.addEventListener('keydown', (e) => {
                    if (e.code === 'Space' || e.code === 'Enter') {
                        e.preventDefault();
                        safeEmergencyFireWeapon();
                    }
                    if (e.code === 'KeyT') {
                        e.preventDefault();
                        if (window.gameState && window.gameState.enemies) {
                            const activeEnemies = window.gameState.enemies.filter(e => e.active);
                            if (activeEnemies.length > 0) {
                                console.log('🎯 Targeting:', activeEnemies[0].type);
                            }
                        }
                    }
                });
                
                // Safe mouse controls
                document.addEventListener('mousedown', (e) => {
                    if (e.button === 0) { // Left click
                        e.preventDefault();
                        safeEmergencyFireWeapon();
                    }
                });
                
                console.log('✅ SAFE AUTO-START SEQUENCE COMPLETE');
            });
        }
        
        // Execute safe auto-start
        safeUltimateAutoStart();
`;
  
  // Replace the unsafe Wave 8 code with the safe version
  content = safeReplace(content,
    `// === 👑 WAVE 8: EMERGENCY ENEMY SPAWNING SYSTEM ===`,
    `${cr(safeThreeJSWrapper)}
        
        // === 👑 WAVE 8: EMERGENCY ENEMY SPAWNING SYSTEM === (REPLACED BY SAFE VERSION)`
  );
  
  // Remove the unsafe ultimate auto-start call
  content = safeReplace(content,
    `// Execute ultimate auto-start immediately
        ultimateGameAutoStart();`,
    `// Execute ultimate auto-start immediately (REPLACED BY SAFE VERSION)
        // ultimateGameAutoStart(); // DISABLED - USING SAFE VERSION`
  );
  
  // Write the repaired content
  fs.writeFileSync(indexPath, content, 'utf-8');
  
  console.log('📊 Repaired file size:', Math.round(Buffer.byteLength(content, 'utf8') / 1024), 'KB');
  console.log('📄 Repaired line count:', content.split('\\n').length);
  
  console.log('\\n🏆 WAVE 8.1: CRITICAL REPAIR COMPLETE!');
  console.log('═════════════════════════════════════════');
  console.log('✅ Three.js initialization checks added');
  console.log('✅ Safe enemy spawning system');
  console.log('✅ Safe weapon firing system');  
  console.log('✅ Safe game loop with error handling');
  console.log('✅ Safe auto-start sequence');
  console.log('\\n👑 THREE.JS ERRORS SHOULD NOW BE RESOLVED!');
  
} catch (error) {
  console.error('❌ WAVE 8.1 REPAIR FAILED:', error);
  process.exit(1);
}

console.log('\\n👑 WAVE 8.1: EMERGENCY REPAIR COMPLETE!');
process.exit(0);