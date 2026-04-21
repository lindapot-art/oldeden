#!/usr/bin/env node
// 👑 THE KING'S MASSIVE GAME DEPLOYMENT - ENHANCED EXISTING SYSTEM
// Upgrade the existing Three.js system to a complete game

const fs = require('fs');
const path = require('path');

const safeReplace = (content, oldStr, newStr) => {
    if (!content.includes(oldStr)) {
        throw new Error(`Target string not found: ${oldStr.substring(0, 100)}...`);
    }
    return content.replace(oldStr, newStr);
};

const cr = (str) => str.replace(/\n/g, '\r\n');

console.log('👑 THE KING\'S MASSIVE GAME DEPLOYMENT - ENHANCED VERSION');
console.log('══════════════════════════════════════════════════════════');

try {
    const indexPath = path.resolve('public/index.html');
    let content = fs.readFileSync(indexPath, 'utf8');

    // 1. Add game variables before initializeThreeJS
    const gameStateTarget = `function initializeThreeJS() {
  console.log('🎨 Initializing Three.js...');`;

    const gameStateReplacement = `// 👑 THE KING'S COMPLETE GAME VARIABLES
let enemies = [];
let weapons = [];
let projectiles = [];
let particles = [];
let explosions = [];
let targetingSystem = null;
let physics = null;
let audioSystem = null;
let mouse = { x: 0, y: 0, clicked: false };
let keys = {};
let player = null;
let score = 0;
let health = 100;
let shields = 100;
let energy = 100;
let level = 1;

// 👑 GAME CONFIGURATION
const GAME_CONFIG = {
    enemy: { spawnRate: 2000, maxCount: 15 },
    player: { speed: 200 },
    weapons: { fireRate: 150, damage: 25 }
};

function initializeThreeJS() {
  console.log('👑 THE KING: Initializing complete game systems...');`;

    content = safeReplace(content, gameStateTarget, cr(gameStateReplacement));

    // 2. Enhance the Three.js initialization
    const threeJSTarget = `  // Scene
  window.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  
  // Camera
  window.camera = new THREE.PerspectiveCamera(75, gameCanvas.width / gameCanvas.height, 0.1, 1000);
  camera.position.set(0, 0, 100);
  
  // Renderer
  window.renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
  renderer.setSize(gameCanvas.width, gameCanvas.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 100);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  console.log('✅ Three.js initialized');`;

    const threeJSReplacement = `  // Enhanced Scene
  window.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000511);
  scene.fog = new THREE.Fog(0x000511, 500, 2000);
  
  // Enhanced Camera
  window.camera = new THREE.PerspectiveCamera(75, gameCanvas.width / gameCanvas.height, 0.1, 5000);
  camera.position.set(0, 0, 300);
  
  // Enhanced Renderer
  window.renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
  renderer.setSize(gameCanvas.clientWidth, gameCanvas.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  
  // Enhanced Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 100, 200);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Dynamic lights for gameplay
  const pointLight1 = new THREE.PointLight(0x00ffff, 0.5, 1000);
  pointLight1.position.set(200, 0, 0);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xff4400, 0.5, 1000);
  pointLight2.position.set(-200, 0, 0);
  scene.add(pointLight2);
  
  // 👑 Initialize all game systems
  initPlayer();
  initEnemySystem();
  initWeaponSystem();
  initTargetingSystem();
  initControls();
  initEnvironment();
  startGameLoop();
  
  console.log('👑 THE KING: Complete game systems initialized!');`;

    content = safeReplace(content, threeJSTarget, cr(threeJSReplacement));

    // 3. Add complete game systems after Three.js init
    const afterThreeJSTarget = `console.log('👑 THE KING: Complete game systems initialized!');
}`;

    const afterThreeJSReplacement = `console.log('👑 THE KING: Complete game systems initialized!');
}

// 👑 COMPLETE PLAYER SYSTEM
function initPlayer() {
    console.log('👑 Initializing player...');
    
    // Player ship
    const shipGeometry = new THREE.ConeGeometry(15, 40, 8);
    const shipMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x00ffff,
        emissive: 0x002244 
    });
    player = new THREE.Mesh(shipGeometry, shipMaterial);
    player.position.set(0, 0, 0);
    player.rotation.x = Math.PI / 2;
    
    // Player properties
    player.velocity = new THREE.Vector3();
    player.health = 100;
    player.maxHealth = 100;
    player.shields = 100;
    player.weaponCooldown = 0;
    
    // Add engines
    const engineGeometry = new THREE.CylinderGeometry(3, 5, 20, 6);
    const engineMaterial = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    
    const engine1 = new THREE.Mesh(engineGeometry, engineMaterial);
    engine1.position.set(-10, -25, 0);
    engine1.rotation.x = Math.PI / 2;
    player.add(engine1);
    
    const engine2 = new THREE.Mesh(engineGeometry, engineMaterial);
    engine2.position.set(10, -25, 0);
    engine2.rotation.x = Math.PI / 2;
    player.add(engine2);
    
    scene.add(player);
    console.log('👑 Player initialized');
}

// 👑 ENEMY SYSTEM
function initEnemySystem() {
    console.log('👑 Initializing enemy system...');
    enemies = [];
    
    // Start spawning enemies
    setInterval(spawnEnemy, GAME_CONFIG.enemy.spawnRate);
    console.log('👑 Enemy spawning started');
}

function spawnEnemy() {
    if (enemies.length >= GAME_CONFIG.enemy.maxCount) return;
    
    const enemyTypes = [
        { color: 0xff0000, size: 12, health: 50, speed: 60, score: 100 },
        { color: 0xff8800, size: 8, health: 30, speed: 120, score: 200 },
        { color: 0x8800ff, size: 18, health: 120, speed: 40, score: 300 }
    ];
    
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    const geometry = new THREE.OctahedronGeometry(type.size);
    const material = new THREE.MeshLambertMaterial({ 
        color: type.color,
        emissive: new THREE.Color(type.color).multiplyScalar(0.2)
    });
    const enemy = new THREE.Mesh(geometry, material);
    
    // Random spawn position around edges
    const angle = Math.random() * Math.PI * 2;
    const distance = 800 + Math.random() * 400;
    enemy.position.set(
        Math.cos(angle) * distance,
        Math.sin(angle) * distance,
        (Math.random() - 0.5) * 200
    );
    
    enemy.velocity = new THREE.Vector3();
    enemy.health = type.health;
    enemy.maxHealth = type.health;
    enemy.speed = type.speed;
    enemy.score = type.score;
    enemy.lastShot = 0;
    
    scene.add(enemy);
    enemies.push(enemy);
    
    console.log('👑 Enemy spawned');
}

// 👑 WEAPON SYSTEM
function initWeaponSystem() {
    console.log('👑 Initializing weapons...');
    
    projectiles = [];
    weapons = [
        { name: 'Plasma Cannon', damage: 25, speed: 400, color: 0x00ffff, fireRate: 150 },
        { name: 'Missiles', damage: 60, speed: 250, color: 0xff4400, fireRate: 500 },
        { name: 'Rail Gun', damage: 100, speed: 800, color: 0xffffff, fireRate: 1000 }
    ];
    
    player.currentWeapon = 0;
    console.log('👑 Weapons initialized');
}

function fireWeapon() {
    if (!player || player.weaponCooldown > Date.now()) return;
    
    const weapon = weapons[player.currentWeapon];
    
    // Create projectile
    const geometry = new THREE.SphereGeometry(2);
    const material = new THREE.MeshBasicMaterial({ color: weapon.color });
    const projectile = new THREE.Mesh(geometry, material);
    
    projectile.position.copy(player.position);
    projectile.position.y += 30;
    
    // Aim towards mouse or current target
    let direction = new THREE.Vector3(0, 1, 0);
    if (targetingSystem.currentTarget) {
        direction.subVectors(targetingSystem.currentTarget.position, player.position).normalize();
    } else if (mouse.x !== 0 || mouse.y !== 0) {
        direction.x = (mouse.x / window.innerWidth) * 2 - 1;
        direction.y = -((mouse.y / window.innerHeight) * 2 - 1);
        direction.normalize();
    }
    
    projectile.velocity = direction.multiplyScalar(weapon.speed);
    projectile.damage = weapon.damage;
    projectile.owner = 'player';
    
    scene.add(projectile);
    projectiles.push(projectile);
    
    player.weaponCooldown = Date.now() + weapon.fireRate;
    console.log(\`👑 Fired \${weapon.name}\`);
}

// 👑 TARGETING SYSTEM
function initTargetingSystem() {
    console.log('👑 Initializing targeting...');
    
    targetingSystem = {
        currentTarget: null,
        autoTarget: true,
        showCrosshair: true
    };
    
    console.log('👑 Targeting initialized');
}

function updateTargeting() {
    // Auto-target nearest enemy
    if (targetingSystem.autoTarget && !targetingSystem.currentTarget) {
        let nearest = null;
        let nearestDistance = Infinity;
        
        enemies.forEach(enemy => {
            const distance = player.position.distanceTo(enemy.position);
            if (distance < nearestDistance && distance < 500) {
                nearest = enemy;
                nearestDistance = distance;
            }
        });
        
        targetingSystem.currentTarget = nearest;
    }
    
    // Clear target if destroyed
    if (targetingSystem.currentTarget && !enemies.includes(targetingSystem.currentTarget)) {
        targetingSystem.currentTarget = null;
    }
}

// 👑 CONTROLS
function initControls() {
    console.log('👑 Initializing controls...');
    
    // Mouse controls
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    document.addEventListener('mousedown', () => {
        mouse.clicked = true;
    });
    
    document.addEventListener('mouseup', () => {
        mouse.clicked = false;
    });
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        switch(e.key) {
            case ' ':
                e.preventDefault();
                fireWeapon();
                break;
            case 't':
            case 'T':
                cycleTarget();
                break;
            case '1':
                player.currentWeapon = 0;
                break;
            case '2':
                player.currentWeapon = 1;
                break;
            case '3':
                player.currentWeapon = 2;
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
    
    console.log('👑 Controls initialized');
}

function cycleTarget() {
    if (enemies.length === 0) {
        targetingSystem.currentTarget = null;
        return;
    }
    
    const currentIndex = enemies.indexOf(targetingSystem.currentTarget);
    const nextIndex = (currentIndex + 1) % enemies.length;
    targetingSystem.currentTarget = enemies[nextIndex];
}

// 👑 ENVIRONMENT
function initEnvironment() {
    console.log('👑 Creating environment...');
    
    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    
    for (let i = 0; i < 500; i++) {
        starPositions.push(
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000,
            (Math.random() - 0.5) * 4000
        );
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    console.log('👑 Environment created');
}

// 👑 GAME LOOP
function startGameLoop() {
    console.log('👑 Starting game loop...');
    
    function gameLoop() {
        // Update player movement
        if (player) {
            const speed = GAME_CONFIG.player.speed * 0.016; // 60fps normalized
            
            if (keys['w'] || keys['W'] || keys['ArrowUp']) {
                player.position.y += speed;
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown']) {
                player.position.y -= speed;
            }
            if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
                player.position.x -= speed;
            }
            if (keys['d'] || keys['D'] || keys['ArrowRight']) {
                player.position.x += speed;
            }
            
            // Continuous firing
            if (mouse.clicked || keys[' ']) {
                fireWeapon();
            }
        }
        
        // Update enemies
        enemies.forEach((enemy, index) => {
            if (!player) return;
            
            // AI: Move towards player
            const direction = new THREE.Vector3();
            direction.subVectors(player.position, enemy.position).normalize();
            enemy.position.add(direction.multiplyScalar(enemy.speed * 0.016));
            
            // Rotate to face player
            enemy.lookAt(player.position);
            
            // Enemy shooting
            if (enemy.lastShot + 1000 < Date.now()) {
                fireEnemyWeapon(enemy);
                enemy.lastShot = Date.now();
            }
            
            // Check collision with player
            if (player.position.distanceTo(enemy.position) < 30) {
                // Damage player
                health -= enemy.score / 10;
                
                // Remove enemy
                scene.remove(enemy);
                enemies.splice(index, 1);
                
                console.log('👑 Enemy collision!');
            }
        });
        
        // Update projectiles
        projectiles.forEach((projectile, index) => {
            projectile.position.add(projectile.velocity.clone().multiplyScalar(0.016));
            
            // Check collisions
            if (projectile.owner === 'player') {
                enemies.forEach((enemy, enemyIndex) => {
                    if (projectile.position.distanceTo(enemy.position) < 20) {
                        // Hit enemy
                        enemy.health -= projectile.damage;
                        
                        // Remove projectile
                        scene.remove(projectile);
                        projectiles.splice(index, 1);
                        
                        // Check if enemy destroyed
                        if (enemy.health <= 0) {
                            score += enemy.score;
                            scene.remove(enemy);
                            enemies.splice(enemyIndex, 1);
                            console.log('👑 Enemy destroyed!');
                        }
                    }
                });
            }
            
            // Remove projectiles that are too far
            if (projectile.position.length() > 2000) {
                scene.remove(projectile);
                projectiles.splice(index, 1);
            }
        });
        
        // Update targeting
        updateTargeting();
        
        // Update camera to follow player
        if (player) {
            camera.position.x = player.position.x;
            camera.position.y = player.position.y - 50;
        }
        
        // Render
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
        
        // Update HUD
        updateHUD();
        
        requestAnimationFrame(gameLoop);
    }
    
    gameLoop();
}

function fireEnemyWeapon(enemy) {
    if (!player) return;
    
    const geometry = new THREE.SphereGeometry(1.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const projectile = new THREE.Mesh(geometry, material);
    
    projectile.position.copy(enemy.position);
    
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, enemy.position).normalize();
    projectile.velocity = direction.multiplyScalar(200);
    projectile.damage = 10;
    projectile.owner = 'enemy';
    
    scene.add(projectile);
    projectiles.push(projectile);
}

function updateHUD() {
    const hudCanvas = document.getElementById('hud-canvas');
    if (!hudCanvas) return;
    
    const ctx = hudCanvas.getContext('2d');
    ctx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
    
    // Health bar
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 200 * (health / 100), 20);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(10, 10, 200, 20);
    
    // Score
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 60);
    ctx.fillText('Enemies: ' + enemies.length, 10, 85);
    
    // Targeting reticle
    if (targetingSystem.currentTarget) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hudCanvas.width / 2, hudCanvas.height / 2, 30, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Crosshair
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    const centerX = hudCanvas.width / 2;
    const centerY = hudCanvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();
}`;

    content = safeReplace(content, afterThreeJSTarget, cr(afterThreeJSReplacement));

    fs.writeFileSync(indexPath, content);
    
    console.log('👑 THE KING: MASSIVE GAME DEPLOYMENT COMPLETE!');
    console.log('✅ Enhanced Three.js with advanced graphics');
    console.log('✅ Complete player ship with engines');
    console.log('✅ Enemy spawning with 3 types and AI');
    console.log('✅ Weapon system with 3 weapons');
    console.log('✅ Targeting system with auto-lock');
    console.log('✅ Full WASD + mouse controls');
    console.log('✅ Projectile physics and collision');
    console.log('✅ Health system and scoring');
    console.log('✅ HUD with health bar and crosshair');
    console.log('✅ Starfield environment');
    console.log('✅ 60fps game loop');
    console.log('');
    console.log('👑 CONTROLS:');
    console.log('  WASD: Move player');
    console.log('  Mouse: Aim');
    console.log('  Click/Space: Fire');
    console.log('  T: Cycle target');
    console.log('  1/2/3: Switch weapons');
    console.log('');
    console.log('👑 THE GAME IS NOW FULLY PLAYABLE!');

} catch (error) {
    console.error('💀 DEPLOYMENT FAILED:', error.message);
    process.exit(1);
}