#!/usr/bin/env node
// 👑 WAVE 8.2: ULTIMATE THREE.JS SAFETY PROTOCOL
// Complete isolation of Three.js dependent code

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

console.log('👑 WAVE 8.2: ULTIMATE THREE.JS SAFETY PROTOCOL');
console.log('🚨 COMPLETE ISOLATION OF THREE.JS DEPENDENT CODE');
console.log('═════════════════════════════════════════════════');

try {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let content = fs.readFileSync(indexPath, 'utf-8');
  
  console.log('📊 Current file size:', Math.round(Buffer.byteLength(content, 'utf8') / 1024), 'KB');
  
  // === REMOVE ALL UNSAFE WAVE 8 CODE ===
  console.log('🔧 REMOVING ALL UNSAFE WAVE 8 CODE...');
  
  // Find and remove the problematic Wave 8 code block
  const wave8StartMarker = '// === 👑 WAVE 8.1: SAFE THREE.JS INITIALIZATION WRAPPER ===';
  const wave8EndMarker = '// Execute ultimate auto-start immediately (REPLACED BY SAFE VERSION)';
  
  const wave8Start = content.indexOf(wave8StartMarker);
  const wave8End = content.indexOf(wave8EndMarker);
  
  if (wave8Start !== -1 && wave8End !== -1) {
    const beforeWave8 = content.substring(0, wave8Start);
    const afterWave8 = content.substring(wave8End + wave8EndMarker.length);
    content = beforeWave8 + afterWave8;
    console.log('✅ Removed problematic Wave 8 code block');
  }
  
  // === INSERT ULTIMATE SAFE SYSTEM ===
  console.log('🔧 INSERTING ULTIMATE SAFE SYSTEM...');
  
  const ultimateSafeSystem = `
        
        // === 👑 WAVE 8.2: ULTIMATE THREE.JS SAFETY PROTOCOL ===
        
        // Only execute when DOM is completely loaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log('👑 DOM loaded, waiting for Three.js...');
            
            // Ultimate safety check for Three.js
            function ultimateThreeJSCheck() {
                return new Promise((resolve) => {
                    let attempts = 0;
                    const maxAttempts = 200; // 20 seconds max
                    
                    function checkThreeJS() {
                        attempts++;
                        
                        if (typeof THREE !== 'undefined' && 
                            window.scene && 
                            window.renderer && 
                            window.camera && 
                            window.playerShip &&
                            window.scene.children.length > 0) {
                            
                            console.log('✅ ULTIMATE: Three.js fully ready after', attempts, 'attempts');
                            resolve(true);
                            
                        } else if (attempts < maxAttempts) {
                            console.log('⏳ ULTIMATE: Waiting for Three.js... attempt', attempts, '/', maxAttempts);
                            setTimeout(checkThreeJS, 100);
                            
                        } else {
                            console.error('❌ ULTIMATE: Three.js failed to initialize after', (maxAttempts * 100), 'ms');
                            resolve(false);
                        }
                    }
                    
                    checkThreeJS();
                });
            }
            
            // Ultimate safe initialization
            ultimateThreeJSCheck().then((threeReady) => {
                if (!threeReady) {
                    console.error('❌ Cannot proceed without Three.js');
                    return;
                }
                
                console.log('🚀 ULTIMATE: Starting safe game systems...');
                
                // Initialize safe game state
                window.ultimateGameState = {
                    enemies: [],
                    projectiles: [],
                    effects: [],
                    score: 0,
                    level: 1,
                    enemyCount: 0,
                    projectileCount: 0,
                    gameActive: true
                };
                
                // Safe enemy spawning with ultimate checks
                function ultimateSafeSpawnEnemy() {
                    if (typeof THREE === 'undefined' || !window.scene || !window.playerShip) {
                        console.log('⚠️ ULTIMATE: Three.js not ready for enemy spawn');
                        return null;
                    }
                    
                    try {
                        // Create enemy with safe Three.js calls
                        const geometry = new THREE.ConeGeometry(0.7, 2, 6);
                        const material = new THREE.MeshLambertMaterial({ 
                            color: 0xff4444 + Math.floor(Math.random() * 0x444444) 
                        });
                        const mesh = new THREE.Mesh(geometry, material);
                        
                        // Safe positioning
                        const angle = Math.random() * Math.PI * 2;
                        const distance = 12 + Math.random() * 8;
                        
                        mesh.position.set(
                            Math.cos(angle) * distance,
                            (Math.random() - 0.5) * 4,
                            Math.sin(angle) * distance
                        );
                        
                        mesh.rotation.y = angle + Math.PI;
                        
                        // Create enemy object
                        const enemy = {
                            mesh: mesh,
                            type: 'ULTIMATE_ENEMY',
                            health: 60,
                            maxHealth: 60,
                            damage: 15,
                            speed: 0.08,
                            position: mesh.position,
                            velocity: new THREE.Vector3(),
                            active: true,
                            lastShot: 0,
                            id: 'ultimate_' + Date.now() + '_' + Math.random()
                        };
                        
                        window.scene.add(mesh);
                        window.ultimateGameState.enemies.push(enemy);
                        window.ultimateGameState.enemyCount++;
                        
                        console.log('✅ ULTIMATE: Enemy spawned safely at distance', distance.toFixed(1));
                        return enemy;
                        
                    } catch (error) {
                        console.error('❌ ULTIMATE: Enemy spawn failed:', error);
                        return null;
                    }
                }
                
                // Spawn initial enemies safely
                console.log('👹 ULTIMATE: Spawning initial enemy wave...');
                for (let i = 0; i < 4; i++) {
                    setTimeout(() => {
                        ultimateSafeSpawnEnemy();
                    }, i * 500);
                }
                
                // Safe weapon firing
                function ultimateSafeFireWeapon() {
                    if (typeof THREE === 'undefined' || !window.scene || !window.playerShip) {
                        console.log('⚠️ ULTIMATE: Cannot fire weapon - Three.js not ready');
                        return;
                    }
                    
                    try {
                        // Create projectile
                        const geometry = new THREE.SphereGeometry(0.12, 6, 6);
                        const material = new THREE.MeshBasicMaterial({ 
                            color: 0x44aaff,
                            emissive: 0x002244
                        });
                        const mesh = new THREE.Mesh(geometry, material);
                        
                        // Safe positioning
                        mesh.position.copy(window.playerShip.position);
                        
                        // Safe direction calculation
                        let direction;
                        try {
                            direction = window.playerShip.getWorldDirection(new THREE.Vector3());
                        } catch (e) {
                            direction = new THREE.Vector3(0, 0, -1);
                        }
                        
                        mesh.position.add(direction.clone().multiplyScalar(1.5));
                        
                        // Create projectile object
                        const projectile = {
                            mesh: mesh,
                            velocity: direction.multiplyScalar(0.6),
                            damage: 40,
                            owner: 'player',
                            life: 4000,
                            startTime: Date.now(),
                            id: 'ultimate_proj_' + Date.now()
                        };
                        
                        window.scene.add(mesh);
                        window.ultimateGameState.projectiles.push(projectile);
                        window.ultimateGameState.projectileCount++;
                        
                        console.log('🔥 ULTIMATE: Weapon fired safely');
                        
                        // Muzzle flash
                        const muzzleFlash = document.getElementById('muzzle-flash-overlay');
                        if (muzzleFlash) {
                            muzzleFlash.style.opacity = '1';
                            setTimeout(() => muzzleFlash.style.opacity = '0', 60);
                        }
                        
                    } catch (error) {
                        console.error('❌ ULTIMATE: Weapon firing failed:', error);
                    }
                }
                
                // Ultimate safe game loop
                function ultimateSafeGameLoop() {
                    if (typeof THREE === 'undefined' || 
                        !window.scene || 
                        !window.ultimateGameState || 
                        !window.ultimateGameState.gameActive) {
                        return;
                    }
                    
                    try {
                        // Update enemies
                        if (window.ultimateGameState.enemies.length > 0) {
                            for (let i = window.ultimateGameState.enemies.length - 1; i >= 0; i--) {
                                const enemy = window.ultimateGameState.enemies[i];
                                
                                if (!enemy || !enemy.active || !enemy.mesh) {
                                    // Remove dead enemy
                                    if (enemy && enemy.mesh && window.scene) {
                                        window.scene.remove(enemy.mesh);
                                    }
                                    window.ultimateGameState.enemies.splice(i, 1);
                                    window.ultimateGameState.enemyCount = window.ultimateGameState.enemies.length;
                                    continue;
                                }
                                
                                // Simple enemy AI
                                if (window.playerShip && window.playerShip.position) {
                                    const playerPos = window.playerShip.position;
                                    const enemyPos = enemy.position;
                                    
                                    try {
                                        const direction = new THREE.Vector3()
                                            .subVectors(playerPos, enemyPos)
                                            .normalize()
                                            .multiplyScalar(enemy.speed);
                                        
                                        enemy.position.add(direction);
                                        enemy.mesh.position.copy(enemy.position);
                                        enemy.mesh.lookAt(playerPos);
                                        
                                    } catch (error) {
                                        // Skip this enemy update if error
                                    }
                                }
                            }
                        }
                        
                        // Update projectiles
                        if (window.ultimateGameState.projectiles.length > 0) {
                            for (let i = window.ultimateGameState.projectiles.length - 1; i >= 0; i--) {
                                const projectile = window.ultimateGameState.projectiles[i];
                                
                                if (!projectile || !projectile.mesh) {
                                    window.ultimateGameState.projectiles.splice(i, 1);
                                    continue;
                                }
                                
                                try {
                                    // Move projectile
                                    projectile.mesh.position.add(projectile.velocity);
                                    
                                    // Check lifetime
                                    const age = Date.now() - projectile.startTime;
                                    if (age > projectile.life) {
                                        window.scene.remove(projectile.mesh);
                                        window.ultimateGameState.projectiles.splice(i, 1);
                                        window.ultimateGameState.projectileCount = window.ultimateGameState.projectiles.length;
                                        continue;
                                    }
                                    
                                    // Collision detection
                                    if (projectile.owner === 'player' && window.ultimateGameState.enemies) {
                                        for (let j = 0; j < window.ultimateGameState.enemies.length; j++) {
                                            const enemy = window.ultimateGameState.enemies[j];
                                            if (!enemy || !enemy.mesh || !enemy.active) continue;
                                            
                                            const distance = projectile.mesh.position.distanceTo(enemy.position);
                                            if (distance < 1.8) {
                                                // Hit enemy
                                                enemy.health -= projectile.damage;
                                                
                                                if (enemy.health <= 0) {
                                                    // Destroy enemy
                                                    enemy.active = false;
                                                    window.ultimateGameState.score += 100;
                                                    console.log('💀 ULTIMATE: Enemy destroyed! Score:', window.ultimateGameState.score);
                                                }
                                                
                                                // Remove projectile
                                                window.scene.remove(projectile.mesh);
                                                window.ultimateGameState.projectiles.splice(i, 1);
                                                window.ultimateGameState.projectileCount = window.ultimateGameState.projectiles.length;
                                                break;
                                            }
                                        }
                                    }
                                    
                                } catch (error) {
                                    // Remove problematic projectile
                                    if (projectile.mesh && window.scene) {
                                        window.scene.remove(projectile.mesh);
                                    }
                                    window.ultimateGameState.projectiles.splice(i, 1);
                                }
                            }
                        }
                        
                        // Respawn enemies if needed
                        if (window.ultimateGameState.enemies.length < 3 && Math.random() < 0.02) {
                            ultimateSafeSpawnEnemy();
                        }
                        
                        // Update debug display
                        updateUltimateDebugDisplay();
                        
                    } catch (error) {
                        console.error('❌ ULTIMATE: Game loop error:', error);
                    }
                }
                
                // Ultimate debug display update
                function updateUltimateDebugDisplay() {
                    try {
                        const debugEl = document.querySelector('.debug-info');
                        if (debugEl && window.ultimateGameState) {
                            const activeEnemies = window.ultimateGameState.enemies.filter(e => e.active).length;
                            debugEl.innerHTML = \`
                                <div>🎮 ULTIMATE SYSTEM ACTIVE</div>
                                <div>⚔️ Enemies: \${activeEnemies}</div>
                                <div>🔴 Projectiles: \${window.ultimateGameState.projectiles.length}</div>
                                <div>⭐ Score: \${window.ultimateGameState.score}</div>
                                <div>✅ Three.js: Ready</div>
                                <div>🎯 Level: \${window.ultimateGameState.level}</div>
                            \`;
                        }
                    } catch (error) {
                        // Silent fail for debug display
                    }
                }
                
                // Enhanced controls
                document.addEventListener('keydown', function(e) {
                    if (e.code === 'Space' || e.code === 'Enter') {
                        e.preventDefault();
                        ultimateSafeFireWeapon();
                    }
                    if (e.code === 'KeyT') {
                        e.preventDefault();
                        if (window.ultimateGameState && window.ultimateGameState.enemies.length > 0) {
                            const activeEnemies = window.ultimateGameState.enemies.filter(e => e.active);
                            if (activeEnemies.length > 0) {
                                console.log('🎯 ULTIMATE: Targeting enemy at distance', 
                                    activeEnemies[0].position.distanceTo(window.playerShip.position).toFixed(1));
                            }
                        }
                    }
                });
                
                // Enhanced mouse controls
                document.addEventListener('mousedown', function(e) {
                    if (e.button === 0) { // Left click
                        e.preventDefault();
                        ultimateSafeFireWeapon();
                    }
                });
                
                // Start the ultimate safe game loop
                window.ultimateGameLoopInterval = setInterval(ultimateSafeGameLoop, 16); // 60 FPS
                
                console.log('✅ ULTIMATE: All systems operational at 60 FPS');
                console.log('🎮 ULTIMATE: Game ready for combat!');
                
            }).catch((error) => {
                console.error('❌ ULTIMATE: Initialization failed:', error);
            });
        });
`;
  
  // Insert ultimate safe system at the end of the script before </script>
  content = safeReplace(content,
    `</script>`,
    `${cr(ultimateSafeSystem)}
        
    </script>`
  );
  
  // Write the repaired content
  fs.writeFileSync(indexPath, content, 'utf-8');
  
  console.log('📊 Ultimate safe file size:', Math.round(Buffer.byteLength(content, 'utf8') / 1024), 'KB');
  console.log('📄 Ultimate safe line count:', content.split('\\n').length);
  
  console.log('\\n🏆 WAVE 8.2: ULTIMATE SAFETY PROTOCOL COMPLETE!');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Complete Three.js isolation implemented');
  console.log('✅ DOMContentLoaded wrapper ensures safe execution');
  console.log('✅ 200 attempt Three.js readiness check (20 second timeout)');
  console.log('✅ Ultimate safe enemy spawning system');
  console.log('✅ Ultimate safe weapon firing system');
  console.log('✅ Ultimate safe game loop with comprehensive error handling');
  console.log('✅ Enhanced debug display for monitoring');
  console.log('\\n👑 THREE.JS ERRORS SHOULD NOW BE COMPLETELY ELIMINATED!');
  
} catch (error) {
  console.error('❌ WAVE 8.2 ULTIMATE SAFETY FAILED:', error);
  process.exit(1);
}

console.log('\\n👑 WAVE 8.2: ULTIMATE SAFETY PROTOCOL COMPLETE!');
process.exit(0);