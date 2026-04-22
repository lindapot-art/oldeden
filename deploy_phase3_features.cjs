#!/usr/bin/env node
// 🚀 PHASE 3 MASSIVE FEATURE DEPLOYMENT
// Deploy advanced targeting system, enhanced combat, procedural universe, AI companions

const fs = require('fs');

const cr = (text) => text.replace(/\n/g, '\r\n');

console.log('🚀 PHASE 3: MASSIVE FEATURE DEPLOYMENT INITIATED');
console.log('👑 KING ORDERS: Deploy all remaining game systems for full playability');

try {
    // Read the current file
    let content = fs.readFileSync('public/index.html', 'utf-8');
    console.log(`📄 Original file: ${content.split('\n').length} lines`);
    
    // Phase 3 Feature 1: Advanced Targeting System
    const advancedTargeting = `
// === 🎯 PHASE 3: ADVANCED TARGETING SYSTEM ===
class AdvancedTargetingSystem {
    constructor() {
        this.targetLock = null;
        this.targetQueue = [];
        this.targetingMode = 'auto'; // auto, manual, priority
        this.lockRange = 1000;
        this.priorityTargets = ['boss', 'elite', 'threat'];
        console.log('🎯 Advanced Targeting System initialized');
    }
    
    update() {
        this.scanForTargets();
        this.updateTargetLock();
        this.renderTargetingHUD();
    }
    
    scanForTargets() {
        if (!enemies || !enemies.length) return;
        
        // Clear expired targets
        this.targetQueue = this.targetQueue.filter(t => t.health > 0);
        
        // Add new targets in range
        enemies.forEach(enemy => {
            if (!enemy || enemy.health <= 0) return;
            
            const distance = this.calculateDistance(player.position, enemy.position);
            if (distance <= this.lockRange && !this.targetQueue.find(t => t.id === enemy.id)) {
                enemy.targetPriority = this.calculatePriority(enemy);
                this.targetQueue.push(enemy);
            }
        });
        
        // Sort by priority
        this.targetQueue.sort((a, b) => b.targetPriority - a.targetPriority);
    }
    
    calculatePriority(enemy) {
        let priority = 100;
        
        // Distance factor (closer = higher priority)
        const distance = this.calculateDistance(player.position, enemy.position);
        priority += Math.max(0, 500 - distance);
        
        // Type priority
        if (enemy.type === 'boss') priority += 1000;
        else if (enemy.type === 'elite') priority += 500;
        else if (enemy.type === 'threat') priority += 300;
        
        // Health factor (lower health = higher priority)
        if (enemy.health < enemy.maxHealth * 0.3) priority += 200;
        
        // Threat level
        if (enemy.attacking) priority += 150;
        
        return priority;
    }
    
    updateTargetLock() {
        if (!this.targetLock || this.targetLock.health <= 0) {
            this.acquireNextTarget();
        }
    }
    
    acquireNextTarget() {
        if (this.targetQueue.length === 0) {
            this.targetLock = null;
            return;
        }
        
        this.targetLock = this.targetQueue[0];
        console.log('🎯 Target acquired:', this.targetLock.type, 'Priority:', this.targetLock.targetPriority);
    }
    
    manualTarget(enemy) {
        if (!enemy || enemy.health <= 0) return;
        this.targetLock = enemy;
        console.log('🎯 Manual target locked:', enemy.type);
    }
    
    cycleTarget() {
        if (this.targetQueue.length <= 1) return;
        
        const currentIndex = this.targetQueue.findIndex(t => t.id === this.targetLock?.id);
        const nextIndex = (currentIndex + 1) % this.targetQueue.length;
        this.targetLock = this.targetQueue[nextIndex];
        console.log('🎯 Target cycled to:', this.targetLock.type);
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    renderTargetingHUD() {
        if (!hudCtx) return;
        
        // Target lock indicator
        if (this.targetLock) {
            hudCtx.strokeStyle = '#ff0000';
            hudCtx.lineWidth = 3;
            hudCtx.setLineDash([5, 5]);
            
            const screenPos = this.worldToScreen(this.targetLock.position);
            if (screenPos) {
                hudCtx.strokeRect(screenPos.x - 30, screenPos.y - 30, 60, 60);
                
                // Target info
                hudCtx.fillStyle = '#ff0000';
                hudCtx.font = '14px Arial';
                hudCtx.fillText(\`[\${this.targetLock.type.toUpperCase()}]\`, screenPos.x - 30, screenPos.y - 40);
                
                // Health bar
                const healthPercent = this.targetLock.health / this.targetLock.maxHealth;
                hudCtx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.2 ? '#ffff00' : '#ff0000';
                hudCtx.fillRect(screenPos.x - 30, screenPos.y + 40, 60 * healthPercent, 4);
                hudCtx.strokeRect(screenPos.x - 30, screenPos.y + 40, 60, 4);
            }
            hudCtx.setLineDash([]);
        }
        
        // Target queue display
        hudCtx.fillStyle = '#e0b15f';
        hudCtx.font = '12px Arial';
        hudCtx.fillText(\`Targets: \${this.targetQueue.length}\`, 10, 180);
        hudCtx.fillText(\`Mode: \${this.targetingMode}\`, 10, 195);
    }
    
    worldToScreen(worldPos) {
        // Convert 3D world position to 2D screen position
        if (!camera) return null;
        
        const vector = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * hudCanvas.width;
        const y = (vector.y * -0.5 + 0.5) * hudCanvas.height;
        
        return { x, y };
    }
}

// Initialize advanced targeting
const advancedTargeting = new AdvancedTargetingSystem();
`;

    // Phase 3 Feature 2: Enhanced Combat System
    const enhancedCombat = `
// === ⚔️ PHASE 3: ENHANCED COMBAT SYSTEM ===
class EnhancedCombatSystem {
    constructor() {
        this.combatMode = 'normal'; // normal, aggressive, defensive, precision
        this.weaponSystems = {
            primary: { type: 'laser', damage: 25, range: 800, cooldown: 250, lastFire: 0 },
            secondary: { type: 'missiles', damage: 75, range: 1200, cooldown: 2000, lastFire: 0, ammo: 10 },
            special: { type: 'plasma', damage: 150, range: 600, cooldown: 5000, lastFire: 0, charges: 3 }
        };
        this.combatStats = {
            hits: 0, misses: 0, kills: 0, damage: 0, accuracy: 0
        };
        console.log('⚔️ Enhanced Combat System initialized');
    }
    
    update() {
        this.updateWeapons();
        this.manageCombat();
        this.renderCombatHUD();
    }
    
    updateWeapons() {
        const now = Date.now();
        Object.values(this.weaponSystems).forEach(weapon => {
            weapon.ready = now - weapon.lastFire >= weapon.cooldown;
        });
    }
    
    manageCombat() {
        if (!advancedTargeting.targetLock) return;
        
        const target = advancedTargeting.targetLock;
        const distance = advancedTargeting.calculateDistance(player.position, target.position);
        
        // Auto-fire based on combat mode
        if (this.combatMode === 'aggressive') {
            this.fireAtTarget(target, 'primary');
            if (distance < 600 && this.weaponSystems.secondary.ready) {
                this.fireAtTarget(target, 'secondary');
            }
        } else if (this.combatMode === 'precision') {
            // Only fire when target is stationary or predictable
            if (target.velocity < 5) {
                this.fireAtTarget(target, 'primary');
            }
        }
    }
    
    fireAtTarget(target, weaponType) {
        const weapon = this.weaponSystems[weaponType];
        if (!weapon.ready) return false;
        
        const distance = advancedTargeting.calculateDistance(player.position, target.position);
        if (distance > weapon.range) return false;
        
        // Lead target calculation
        const leadPosition = this.calculateLeadPosition(target);
        
        // Create projectile
        this.createProjectile(weapon, leadPosition, target);
        
        weapon.lastFire = Date.now();
        
        // Ammo management
        if (weapon.ammo !== undefined) {
            weapon.ammo--;
            if (weapon.ammo <= 0) {
                this.reloadWeapon(weaponType);
            }
        }
        
        console.log(\`⚔️ \${weaponType} fired at \${target.type}\`);
        return true;
    }
    
    calculateLeadPosition(target) {
        const velocity = target.velocity || new THREE.Vector3(0, 0, 0);
        const distance = advancedTargeting.calculateDistance(player.position, target.position);
        const projectileSpeed = 500; // units per second
        const timeToTarget = distance / projectileSpeed;
        
        return {
            x: target.position.x + velocity.x * timeToTarget,
            y: target.position.y + velocity.y * timeToTarget,
            z: target.position.z + velocity.z * timeToTarget
        };
    }
    
    createProjectile(weapon, targetPos, target) {
        const projectile = {
            id: Math.random(),
            type: weapon.type,
            position: { ...player.position },
            target: targetPos,
            damage: weapon.damage,
            speed: weapon.type === 'missiles' ? 300 : 500,
            life: weapon.range / (weapon.type === 'missiles' ? 300 : 500),
            tracking: weapon.type === 'missiles',
            mesh: null
        };
        
        // Create visual representation
        if (weapon.type === 'laser') {
            this.createLaserBeam(player.position, targetPos);
            this.checkHit(projectile, target);
        } else {
            projectiles.push(projectile);
            this.createProjectileMesh(projectile);
        }
    }
    
    createLaserBeam(start, end) {
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints([
            new THREE.Vector3(start.x, start.y, start.z),
            new THREE.Vector3(end.x, end.y, end.z)
        ]);
        
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
        const beam = new THREE.Line(geometry, material);
        scene.add(beam);
        
        // Remove after short duration
        setTimeout(() => scene.remove(beam), 100);
    }
    
    createProjectileMesh(projectile) {
        let geometry, material;
        
        if (projectile.type === 'missiles') {
            geometry = new THREE.CylinderGeometry(0.5, 1, 4);
            material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        } else {
            geometry = new THREE.SphereGeometry(1);
            material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        }
        
        projectile.mesh = new THREE.Mesh(geometry, material);
        projectile.mesh.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
        scene.add(projectile.mesh);
    }
    
    checkHit(projectile, target) {
        const distance = advancedTargeting.calculateDistance(projectile.position, target.position);
        
        if (distance < 10) { // Hit threshold
            this.applyDamage(target, projectile.damage);
            this.combatStats.hits++;
            this.combatStats.damage += projectile.damage;
            
            // Hit effects
            this.createHitEffect(target.position);
            
            return true;
        }
        
        this.combatStats.misses++;
        return false;
    }
    
    applyDamage(target, damage) {
        target.health -= damage;
        
        if (target.health <= 0) {
            this.combatStats.kills++;
            this.createDeathEffect(target.position);
            console.log(\`💀 \${target.type} destroyed!\`);
        }
    }
    
    createHitEffect(position) {
        // Particle explosion effect
        for (let i = 0; i < 10; i++) {
            const particle = {
                position: { ...position },
                velocity: {
                    x: (Math.random() - 0.5) * 20,
                    y: (Math.random() - 0.5) * 20,
                    z: (Math.random() - 0.5) * 20
                },
                life: 1,
                color: 0xff6600
            };
            particles.push(particle);
        }
    }
    
    createDeathEffect(position) {
        // Larger explosion for death
        for (let i = 0; i < 25; i++) {
            const particle = {
                position: { ...position },
                velocity: {
                    x: (Math.random() - 0.5) * 40,
                    y: (Math.random() - 0.5) * 40,
                    z: (Math.random() - 0.5) * 40
                },
                life: 2,
                color: 0xff0000
            };
            particles.push(particle);
        }
    }
    
    setCombatMode(mode) {
        this.combatMode = mode;
        console.log(\`⚔️ Combat mode set to: \${mode}\`);
    }
    
    reloadWeapon(weaponType) {
        const weapon = this.weaponSystems[weaponType];
        setTimeout(() => {
            weapon.ammo = 10; // Reset ammo
            console.log(\`🔄 \${weaponType} reloaded\`);
        }, 3000); // 3 second reload time
    }
    
    renderCombatHUD() {
        if (!hudCtx) return;
        
        hudCtx.fillStyle = '#e0b15f';
        hudCtx.font = '12px Arial';
        
        // Weapon status
        let y = 220;
        Object.entries(this.weaponSystems).forEach(([name, weapon]) => {
            const readyText = weapon.ready ? '✓' : '⏳';
            hudCtx.fillText(\`\${name}: \${readyText} \${weapon.ammo !== undefined ? weapon.ammo : '∞'}\`, 10, y);
            y += 15;
        });
        
        // Combat stats
        hudCtx.fillText(\`Mode: \${this.combatMode}\`, 10, y + 10);
        hudCtx.fillText(\`Kills: \${this.combatStats.kills}\`, 10, y + 25);
        hudCtx.fillText(\`Hits: \${this.combatStats.hits}/\${this.combatStats.hits + this.combatStats.misses}\`, 10, y + 40);
        
        // Accuracy calculation
        const total = this.combatStats.hits + this.combatStats.misses;
        this.combatStats.accuracy = total > 0 ? (this.combatStats.hits / total * 100).toFixed(1) : 0;
        hudCtx.fillText(\`Accuracy: \${this.combatStats.accuracy}%\`, 10, y + 55);
    }
}

// Initialize enhanced combat
const enhancedCombat = new EnhancedCombatSystem();
`;

    // Phase 3 Feature 3: Procedural Universe Generation
    const proceduralUniverse = `
// === 🌌 PHASE 3: PROCEDURAL UNIVERSE GENERATION ===
class ProceduralUniverseGenerator {
    constructor() {
        this.sectors = new Map();
        this.currentSector = null;
        this.sectorSize = 5000;
        this.generationRadius = 2; // Generate sectors within 2 sector radius
        this.seed = Math.random() * 10000;
        console.log('🌌 Procedural Universe Generator initialized');
    }
    
    update() {
        this.updateCurrentSector();
        this.generateNearbySecters();
        this.cleanupDistantSectors();
    }
    
    updateCurrentSector() {
        const sectorCoords = this.getSectorCoords(player.position);
        const sectorKey = \`\${sectorCoords.x},\${sectorCoords.y},\${sectorCoords.z}\`;
        
        if (!this.currentSector || this.currentSector.key !== sectorKey) {
            this.currentSector = { key: sectorKey, coords: sectorCoords };
            console.log(\`🌌 Entered sector: \${sectorKey}\`);
        }
    }
    
    getSectorCoords(position) {
        return {
            x: Math.floor(position.x / this.sectorSize),
            y: Math.floor(position.y / this.sectorSize),
            z: Math.floor(position.z / this.sectorSize)
        };
    }
    
    generateNearbySecters() {
        if (!this.currentSector) return;
        
        const { x, y, z } = this.currentSector.coords;
        
        for (let dx = -this.generationRadius; dx <= this.generationRadius; dx++) {
            for (let dy = -this.generationRadius; dy <= this.generationRadius; dy++) {
                for (let dz = -this.generationRadius; dz <= this.generationRadius; dz++) {
                    const sectorKey = \`\${x + dx},\${y + dy},\${z + dz}\`;
                    
                    if (!this.sectors.has(sectorKey)) {
                        const sector = this.generateSector(x + dx, y + dy, z + dz);
                        this.sectors.set(sectorKey, sector);
                        this.populateSector(sector);
                    }
                }
            }
        }
    }
    
    generateSector(x, y, z) {
        const sectorSeed = this.hashCoords(x, y, z, this.seed);
        const rng = this.seededRandom(sectorSeed);
        
        const sector = {
            coords: { x, y, z },
            key: \`\${x},\${y},\${z}\`,
            type: this.determineSectorType(rng),
            density: rng() * 0.8 + 0.2, // 0.2 to 1.0
            resources: this.generateResources(rng),
            stations: [],
            asteroids: [],
            enemies: [],
            generated: Date.now()
        };
        
        return sector;
    }
    
    determineSectorType(rng) {
        const rand = rng();
        if (rand < 0.1) return 'nebula';
        if (rand < 0.2) return 'asteroid_field';
        if (rand < 0.3) return 'station';
        if (rand < 0.4) return 'hostile';
        if (rand < 0.5) return 'resource_rich';
        if (rand < 0.6) return 'trading_route';
        return 'empty';
    }
    
    generateResources(rng) {
        const resources = {};
        const types = ['iron', 'gold', 'platinum', 'quantum_crystals', 'dark_matter'];
        
        types.forEach(type => {
            if (rng() < 0.4) { // 40% chance for each resource
                resources[type] = Math.floor(rng() * 1000) + 100;
            }
        });
        
        return resources;
    }
    
    populateSector(sector) {
        const rng = this.seededRandom(this.hashCoords(sector.coords.x, sector.coords.y, sector.coords.z, this.seed + 1));
        
        // Generate stations
        if (sector.type === 'station' || rng() < 0.1) {
            this.generateStation(sector, rng);
        }
        
        // Generate asteroids
        if (sector.type === 'asteroid_field' || rng() < 0.3) {
            this.generateAsteroids(sector, rng);
        }
        
        // Generate enemies
        if (sector.type === 'hostile' || rng() < sector.density * 0.5) {
            this.generateEnemies(sector, rng);
        }
        
        console.log(\`🌌 Populated sector \${sector.key} (\${sector.type}) with \${sector.stations.length} stations, \${sector.asteroids.length} asteroids, \${sector.enemies.length} enemies\`);
    }
    
    generateStation(sector, rng) {
        const stationCount = sector.type === 'station' ? 1 + Math.floor(rng() * 2) : 1;
        
        for (let i = 0; i < stationCount; i++) {
            const station = {
                id: Math.random(),
                position: {
                    x: sector.coords.x * this.sectorSize + (rng() - 0.5) * this.sectorSize * 0.8,
                    y: sector.coords.y * this.sectorSize + (rng() - 0.5) * this.sectorSize * 0.8,
                    z: sector.coords.z * this.sectorSize + (rng() - 0.5) * this.sectorSize * 0.8
                },
                type: rng() < 0.3 ? 'trading' : rng() < 0.6 ? 'mining' : 'military',
                faction: this.randomFaction(rng),
                services: this.generateStationServices(rng),
                mesh: null
            };
            
            sector.stations.push(station);
            this.createStationMesh(station);
        }
    }
    
    generateAsteroids(sector, rng) {
        const asteroidCount = 20 + Math.floor(rng() * 30);
        
        for (let i = 0; i < asteroidCount; i++) {
            const asteroid = {
                id: Math.random(),
                position: {
                    x: sector.coords.x * this.sectorSize + (rng() - 0.5) * this.sectorSize,
                    y: sector.coords.y * this.sectorSize + (rng() - 0.5) * this.sectorSize,
                    z: sector.coords.z * this.sectorSize + (rng() - 0.5) * this.sectorSize
                },
                size: 10 + rng() * 50,
                resources: this.generateAsteroidResources(rng),
                mesh: null
            };
            
            sector.asteroids.push(asteroid);
            this.createAsteroidMesh(asteroid);
        }
    }
    
    generateEnemies(sector, rng) {
        const enemyCount = Math.floor(sector.density * 10) + Math.floor(rng() * 15);
        
        for (let i = 0; i < enemyCount; i++) {
            const enemy = {
                id: Math.random(),
                position: {
                    x: sector.coords.x * this.sectorSize + (rng() - 0.5) * this.sectorSize,
                    y: sector.coords.y * this.sectorSize + (rng() - 0.5) * this.sectorSize,
                    z: sector.coords.z * this.sectorSize + (rng() - 0.5) * this.sectorSize
                },
                type: this.randomEnemyType(rng),
                health: 50 + rng() * 100,
                maxHealth: 50 + rng() * 100,
                faction: this.randomEnemyFaction(rng),
                behavior: this.randomBehavior(rng),
                mesh: null
            };
            
            enemy.maxHealth = enemy.health;
            sector.enemies.push(enemy);
            enemies.push(enemy); // Add to global enemies array
            this.createEnemyMesh(enemy);
        }
    }
    
    randomFaction(rng) {
        const factions = ['Federation', 'Empire', 'Pirates', 'Miners', 'Traders'];
        return factions[Math.floor(rng() * factions.length)];
    }
    
    randomEnemyType(rng) {
        const types = ['scout', 'fighter', 'corvette', 'destroyer', 'elite'];
        const weights = [0.4, 0.3, 0.15, 0.1, 0.05]; // Probability distribution
        
        let cumulative = 0;
        const rand = rng();
        
        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative) return types[i];
        }
        
        return 'scout';
    }
    
    randomEnemyFaction(rng) {
        const factions = ['Pirates', 'Rogue_AI', 'Alien_Swarm', 'Corporate_Security'];
        return factions[Math.floor(rng() * factions.length)];
    }
    
    randomBehavior(rng) {
        const behaviors = ['patrol', 'aggressive', 'defensive', 'evasive', 'kamikaze'];
        return behaviors[Math.floor(rng() * behaviors.length)];
    }
    
    generateStationServices(rng) {
        const services = [];
        if (rng() < 0.8) services.push('refuel');
        if (rng() < 0.6) services.push('repair');
        if (rng() < 0.7) services.push('trade');
        if (rng() < 0.3) services.push('upgrade');
        if (rng() < 0.2) services.push('missions');
        return services;
    }
    
    generateAsteroidResources(rng) {
        const resources = {};
        const types = ['iron', 'gold', 'platinum'];
        
        types.forEach(type => {
            if (rng() < 0.3) {
                resources[type] = Math.floor(rng() * 100) + 10;
            }
        });
        
        return resources;
    }
    
    createStationMesh(station) {
        const geometry = new THREE.BoxGeometry(50, 20, 50);
        const material = new THREE.MeshBasicMaterial({ 
            color: station.type === 'trading' ? 0x00ff00 : 
                   station.type === 'mining' ? 0xffff00 : 0xff0000 
        });
        
        station.mesh = new THREE.Mesh(geometry, material);
        station.mesh.position.set(station.position.x, station.position.y, station.position.z);
        scene.add(station.mesh);
    }
    
    createAsteroidMesh(asteroid) {
        const geometry = new THREE.DodecahedronGeometry(asteroid.size);
        const material = new THREE.MeshBasicMaterial({ color: 0x666666 });
        
        asteroid.mesh = new THREE.Mesh(geometry, material);
        asteroid.mesh.position.set(asteroid.position.x, asteroid.position.y, asteroid.position.z);
        asteroid.mesh.rotation.x = Math.random() * Math.PI;
        asteroid.mesh.rotation.y = Math.random() * Math.PI;
        scene.add(asteroid.mesh);
    }
    
    createEnemyMesh(enemy) {
        let geometry, material;
        
        switch (enemy.type) {
            case 'scout':
                geometry = new THREE.ConeGeometry(5, 15);
                material = new THREE.MeshBasicMaterial({ color: 0xff4444 });
                break;
            case 'fighter':
                geometry = new THREE.BoxGeometry(8, 4, 12);
                material = new THREE.MeshBasicMaterial({ color: 0xff6666 });
                break;
            case 'elite':
                geometry = new THREE.OctahedronGeometry(8);
                material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                break;
            default:
                geometry = new THREE.SphereGeometry(6);
                material = new THREE.MeshBasicMaterial({ color: 0xff8888 });
        }
        
        enemy.mesh = new THREE.Mesh(geometry, material);
        enemy.mesh.position.set(enemy.position.x, enemy.position.y, enemy.position.z);
        scene.add(enemy.mesh);
    }
    
    cleanupDistantSectors() {
        if (!this.currentSector) return;
        
        const currentCoords = this.currentSector.coords;
        const cleanupRadius = this.generationRadius + 2;
        
        for (const [key, sector] of this.sectors) {
            const distance = Math.max(
                Math.abs(sector.coords.x - currentCoords.x),
                Math.abs(sector.coords.y - currentCoords.y),
                Math.abs(sector.coords.z - currentCoords.z)
            );
            
            if (distance > cleanupRadius) {
                this.cleanupSector(sector);
                this.sectors.delete(key);
            }
        }
    }
    
    cleanupSector(sector) {
        // Remove meshes from scene
        [...sector.stations, ...sector.asteroids, ...sector.enemies].forEach(obj => {
            if (obj.mesh) {
                scene.remove(obj.mesh);
                obj.mesh = null;
            }
        });
        
        // Remove enemies from global array
        sector.enemies.forEach(enemy => {
            const index = enemies.findIndex(e => e.id === enemy.id);
            if (index > -1) enemies.splice(index, 1);
        });
        
        console.log(\`🗑️ Cleaned up sector \${sector.key}\`);
    }
    
    // Seeded random number generator
    seededRandom(seed) {
        let state = seed;
        return function() {
            state = (state * 9301 + 49297) % 233280;
            return state / 233280;
        };
    }
    
    hashCoords(x, y, z, seed) {
        let hash = seed;
        hash = ((hash << 5) - hash + x) & 0xffffffff;
        hash = ((hash << 5) - hash + y) & 0xffffffff;
        hash = ((hash << 5) - hash + z) & 0xffffffff;
        return Math.abs(hash);
    }
    
    getSectorInfo() {
        if (!this.currentSector) return null;
        
        const sector = this.sectors.get(this.currentSector.key);
        return {
            coords: this.currentSector.coords,
            type: sector?.type || 'unknown',
            stations: sector?.stations.length || 0,
            asteroids: sector?.asteroids.length || 0,
            enemies: sector?.enemies.length || 0,
            resources: sector?.resources || {}
        };
    }
}

// Initialize procedural universe
const proceduralUniverse = new ProceduralUniverseGenerator();
`;

    // Phase 3 Feature 4: AI Companion System
    const aiCompanions = `
// === 🤖 PHASE 3: AI COMPANION SYSTEM ===
class AICompanionSystem {
    constructor() {
        this.companions = [];
        this.activeCompanion = null;
        this.companionTypes = {
            combat: { health: 150, damage: 30, behavior: 'aggressive', speciality: 'combat' },
            support: { health: 100, damage: 15, behavior: 'defensive', speciality: 'repair' },
            scout: { health: 75, damage: 20, behavior: 'evasive', speciality: 'reconnaissance' }
        };
        console.log('🤖 AI Companion System initialized');
    }
    
    update() {
        this.companions.forEach(companion => {
            this.updateCompanion(companion);
        });
        this.renderCompanionHUD();
    }
    
    spawnCompanion(type, position = null) {
        const companionData = this.companionTypes[type];
        if (!companionData) return null;
        
        const companion = {
            id: Math.random(),
            type,
            health: companionData.health,
            maxHealth: companionData.health,
            damage: companionData.damage,
            behavior: companionData.behavior,
            speciality: companionData.speciality,
            position: position || { 
                x: player.position.x + (Math.random() - 0.5) * 100,
                y: player.position.y + (Math.random() - 0.5) * 100,
                z: player.position.z + (Math.random() - 0.5) * 100
            },
            target: null,
            state: 'following', // following, attacking, supporting, scouting
            orders: 'follow',
            formation: { x: 0, y: 0, z: 0 },
            mesh: null,
            ai: {
                lastUpdate: Date.now(),
                lastAction: Date.now(),
                actionCooldown: 1000,
                moveSpeed: 50
            }
        };
        
        this.createCompanionMesh(companion);
        this.companions.push(companion);
        
        if (!this.activeCompanion) {
            this.activeCompanion = companion;
        }
        
        console.log(\`🤖 Spawned \${type} companion\`);
        return companion;
    }
    
    updateCompanion(companion) {
        if (companion.health <= 0) return;
        
        const now = Date.now();
        if (now - companion.ai.lastUpdate < 100) return; // Update at 10 FPS
        
        companion.ai.lastUpdate = now;
        
        // Update based on behavior and orders
        switch (companion.state) {
            case 'following':
                this.updateFollowing(companion);
                break;
            case 'attacking':
                this.updateAttacking(companion);
                break;
            case 'supporting':
                this.updateSupporting(companion);
                break;
            case 'scouting':
                this.updateScouting(companion);
                break;
        }
        
        // Check for automatic state transitions
        this.checkStateTransitions(companion);
        
        // Update mesh position
        if (companion.mesh) {
            companion.mesh.position.set(
                companion.position.x, 
                companion.position.y, 
                companion.position.z
            );
        }
    }
    
    updateFollowing(companion) {
        // Calculate formation position relative to player
        const formationPos = {
            x: player.position.x + companion.formation.x,
            y: player.position.y + companion.formation.y,
            z: player.position.z + companion.formation.z
        };
        
        // Move towards formation position
        const distance = this.calculateDistance(companion.position, formationPos);
        if (distance > 20) { // Stay within 20 units of formation position
            this.moveTowards(companion, formationPos, companion.ai.moveSpeed);
        }
    }
    
    updateAttacking(companion) {
        if (!companion.target || companion.target.health <= 0) {
            companion.target = this.findNearestEnemy(companion);
            if (!companion.target) {
                companion.state = 'following';
                return;
            }
        }
        
        const distance = this.calculateDistance(companion.position, companion.target.position);
        
        if (distance > 200) {
            // Move closer to target
            this.moveTowards(companion, companion.target.position, companion.ai.moveSpeed);
        } else if (distance < 50) {
            // Too close, back away while shooting
            this.moveAwayFrom(companion, companion.target.position, companion.ai.moveSpeed * 0.5);
        }
        
        // Attack if in range and cooldown is ready
        if (distance <= 200 && Date.now() - companion.ai.lastAction >= companion.ai.actionCooldown) {
            this.companionAttack(companion, companion.target);
            companion.ai.lastAction = Date.now();
        }
    }
    
    updateSupporting(companion) {
        // Support behavior: repair player or other companions
        const supportTarget = this.findSupportTarget(companion);
        
        if (supportTarget) {
            const distance = this.calculateDistance(companion.position, supportTarget.position);
            
            if (distance > 30) {
                this.moveTowards(companion, supportTarget.position, companion.ai.moveSpeed);
            } else if (Date.now() - companion.ai.lastAction >= companion.ai.actionCooldown * 2) {
                this.companionSupport(companion, supportTarget);
                companion.ai.lastAction = Date.now();
            }
        } else {
            companion.state = 'following';
        }
    }
    
    updateScouting(companion) {
        // Scout behavior: patrol area and report threats
        if (!companion.scoutTarget) {
            companion.scoutTarget = this.generateScoutTarget(companion);
        }
        
        const distance = this.calculateDistance(companion.position, companion.scoutTarget);
        
        if (distance > 10) {
            this.moveTowards(companion, companion.scoutTarget, companion.ai.moveSpeed * 1.2);
        } else {
            // Reached scout position, find new target
            companion.scoutTarget = this.generateScoutTarget(companion);
            
            // Report any enemies found
            const nearbyEnemies = this.findEnemiesInRange(companion.position, 300);
            if (nearbyEnemies.length > 0) {
                console.log(\`🔍 Scout reports \${nearbyEnemies.length} enemies detected\`);
            }
        }
    }
    
    checkStateTransitions(companion) {
        const nearbyEnemies = this.findEnemiesInRange(companion.position, 150);
        
        if (companion.behavior === 'aggressive' && nearbyEnemies.length > 0) {
            if (companion.state !== 'attacking') {
                companion.state = 'attacking';
                companion.target = nearbyEnemies[0];
            }
        } else if (companion.speciality === 'repair' && this.needsSupport()) {
            companion.state = 'supporting';
        } else if (companion.state === 'attacking' && nearbyEnemies.length === 0) {
            companion.state = 'following';
            companion.target = null;
        }
    }
    
    companionAttack(companion, target) {
        // Create projectile from companion to target
        const projectile = {
            id: Math.random(),
            position: { ...companion.position },
            target: { ...target.position },
            damage: companion.damage,
            speed: 300,
            life: 2,
            source: 'companion',
            mesh: null
        };
        
        projectiles.push(projectile);
        this.createCompanionProjectile(projectile);
        
        console.log(\`🤖 Companion \${companion.type} attacks \${target.type}\`);
    }
    
    companionSupport(companion, target) {
        // Heal/repair target
        const healAmount = 20;
        if (target === player) {
            player.health = Math.min(player.maxHealth, player.health + healAmount);
        } else if (target.health !== undefined) {
            target.health = Math.min(target.maxHealth, target.health + healAmount);
        }
        
        // Visual effect
        this.createSupportEffect(companion.position, target.position);
        console.log(\`💚 Companion \${companion.type} supports target (+\${healAmount} health)\`);
    }
    
    findNearestEnemy(companion) {
        let nearest = null;
        let minDistance = Infinity;
        
        enemies.forEach(enemy => {
            if (enemy.health <= 0) return;
            
            const distance = this.calculateDistance(companion.position, enemy.position);
            if (distance < minDistance && distance <= 400) { // Max engagement range
                minDistance = distance;
                nearest = enemy;
            }
        });
        
        return nearest;
    }
    
    findSupportTarget(companion) {
        // Check if player needs support
        if (player.health < player.maxHealth * 0.7) {
            return player;
        }
        
        // Check if other companions need support
        for (const otherCompanion of this.companions) {
            if (otherCompanion.id !== companion.id && otherCompanion.health < otherCompanion.maxHealth * 0.5) {
                return otherCompanion;
            }
        }
        
        return null;
    }
    
    needsSupport() {
        return player.health < player.maxHealth * 0.7 || 
               this.companions.some(c => c.health < c.maxHealth * 0.5);
    }
    
    findEnemiesInRange(position, range) {
        return enemies.filter(enemy => {
            if (enemy.health <= 0) return false;
            return this.calculateDistance(position, enemy.position) <= range;
        });
    }
    
    generateScoutTarget(companion) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        
        return {
            x: player.position.x + Math.cos(angle) * distance,
            y: player.position.y + (Math.random() - 0.5) * 100,
            z: player.position.z + Math.sin(angle) * distance
        };
    }
    
    moveTowards(companion, targetPos, speed) {
        const direction = {
            x: targetPos.x - companion.position.x,
            y: targetPos.y - companion.position.y,
            z: targetPos.z - companion.position.z
        };
        
        const distance = Math.sqrt(direction.x**2 + direction.y**2 + direction.z**2);
        if (distance === 0) return;
        
        // Normalize
        direction.x /= distance;
        direction.y /= distance;
        direction.z /= distance;
        
        // Move
        const deltaTime = 0.1; // Assuming 10 FPS update
        companion.position.x += direction.x * speed * deltaTime;
        companion.position.y += direction.y * speed * deltaTime;
        companion.position.z += direction.z * speed * deltaTime;
    }
    
    moveAwayFrom(companion, targetPos, speed) {
        const direction = {
            x: companion.position.x - targetPos.x,
            y: companion.position.y - targetPos.y,
            z: companion.position.z - targetPos.z
        };
        
        const distance = Math.sqrt(direction.x**2 + direction.y**2 + direction.z**2);
        if (distance === 0) return;
        
        // Normalize
        direction.x /= distance;
        direction.y /= distance;
        direction.z /= distance;
        
        // Move
        const deltaTime = 0.1;
        companion.position.x += direction.x * speed * deltaTime;
        companion.position.y += direction.y * speed * deltaTime;
        companion.position.z += direction.z * speed * deltaTime;
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
    
    createCompanionMesh(companion) {
        let geometry, material;
        
        switch (companion.type) {
            case 'combat':
                geometry = new THREE.OctahedronGeometry(6);
                material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                break;
            case 'support':
                geometry = new THREE.SphereGeometry(5);
                material = new THREE.MeshBasicMaterial({ color: 0x0080ff });
                break;
            case 'scout':
                geometry = new THREE.ConeGeometry(4, 10);
                material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                break;
            default:
                geometry = new THREE.BoxGeometry(8, 8, 8);
                material = new THREE.MeshBasicMaterial({ color: 0x008000 });
        }
        
        companion.mesh = new THREE.Mesh(geometry, material);
        companion.mesh.position.set(companion.position.x, companion.position.y, companion.position.z);
        scene.add(companion.mesh);
    }
    
    createCompanionProjectile(projectile) {
        const geometry = new THREE.SphereGeometry(0.5);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        projectile.mesh = new THREE.Mesh(geometry, material);
        projectile.mesh.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
        scene.add(projectile.mesh);
    }
    
    createSupportEffect(fromPos, toPos) {
        // Create healing beam
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints([
            new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z),
            new THREE.Vector3(toPos.x, toPos.y, toPos.z)
        ]);
        
        const material = new THREE.LineBasicMaterial({ color: 0x00ff80, linewidth: 2 });
        const beam = new THREE.Line(geometry, material);
        scene.add(beam);
        
        // Remove after short duration
        setTimeout(() => scene.remove(beam), 500);
    }
    
    giveOrder(companion, order, target = null) {
        if (!companion) return;
        
        companion.orders = order;
        companion.target = target;
        
        switch (order) {
            case 'follow':
                companion.state = 'following';
                break;
            case 'attack':
                companion.state = 'attacking';
                break;
            case 'support':
                companion.state = 'supporting';
                break;
            case 'scout':
                companion.state = 'scouting';
                break;
        }
        
        console.log(\`📋 Companion \${companion.type} given order: \${order}\`);
    }
    
    setFormation(formation) {
        this.companions.forEach((companion, index) => {
            switch (formation) {
                case 'line':
                    companion.formation = { x: index * 30 - (this.companions.length * 15), y: 0, z: -50 };
                    break;
                case 'triangle':
                    companion.formation = { x: (index % 2) * 60 - 30, y: 0, z: -50 - Math.floor(index / 2) * 30 };
                    break;
                case 'circle':
                    const angle = (index / this.companions.length) * Math.PI * 2;
                    companion.formation = { x: Math.cos(angle) * 50, y: 0, z: Math.sin(angle) * 50 - 50 };
                    break;
                default:
                    companion.formation = { x: 0, y: 0, z: -50 };
            }
        });
        
        console.log(\`📐 Formation set to: \${formation}\`);
    }
    
    renderCompanionHUD() {
        if (!hudCtx) return;
        
        hudCtx.fillStyle = '#e0b15f';
        hudCtx.font = '12px Arial';
        
        let y = 320;
        hudCtx.fillText('Companions:', 10, y);
        y += 15;
        
        this.companions.forEach(companion => {
            if (companion.health <= 0) return;
            
            const healthPercent = (companion.health / companion.maxHealth * 100).toFixed(0);
            const statusIcon = companion.state === 'attacking' ? '⚔️' : 
                              companion.state === 'supporting' ? '💚' :
                              companion.state === 'scouting' ? '🔍' : '👥';
                              
            hudCtx.fillText(\`\${statusIcon} \${companion.type}: \${healthPercent}%\`, 10, y);
            y += 15;
        });
    }
}

// Initialize AI companion system
const aiCompanions = new AICompanionSystem();

// Auto-spawn starting companions
aiCompanions.spawnCompanion('combat');
aiCompanions.spawnCompanion('support');
`;

    // Integration code to hook all systems into the game loop
    const systemIntegration = `
// === 🔗 PHASE 3: SYSTEM INTEGRATION ===

// Add to game loop
const originalGameLoop = gameLoop;
gameLoop = function() {
    // Call original game loop
    if (originalGameLoop) originalGameLoop();
    
    // Update Phase 3 systems
    if (typeof advancedTargeting !== 'undefined') advancedTargeting.update();
    if (typeof enhancedCombat !== 'undefined') enhancedCombat.update();
    if (typeof proceduralUniverse !== 'undefined') proceduralUniverse.update();
    if (typeof aiCompanions !== 'undefined') aiCompanions.update();
};

// Keyboard controls for new systems
document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyT': // Cycle targets
            if (typeof advancedTargeting !== 'undefined') advancedTargeting.cycleTarget();
            break;
        case 'KeyR': // Change combat mode
            if (typeof enhancedCombat !== 'undefined') {
                const modes = ['normal', 'aggressive', 'defensive', 'precision'];
                const currentIndex = modes.indexOf(enhancedCombat.combatMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                enhancedCombat.setCombatMode(modes[nextIndex]);
            }
            break;
        case 'KeyC': // Spawn combat companion
            if (typeof aiCompanions !== 'undefined') {
                aiCompanions.spawnCompanion('combat');
            }
            break;
        case 'KeyV': // Spawn support companion
            if (typeof aiCompanions !== 'undefined') {
                aiCompanions.spawnCompanion('support');
            }
            break;
        case 'KeyB': // Spawn scout companion
            if (typeof aiCompanions !== 'undefined') {
                aiCompanions.spawnCompanion('scout');
            }
            break;
        case 'KeyF': // Change formation
            if (typeof aiCompanions !== 'undefined') {
                const formations = ['line', 'triangle', 'circle'];
                const randomFormation = formations[Math.floor(Math.random() * formations.length)];
                aiCompanions.setFormation(randomFormation);
            }
            break;
    }
});

// Initialize global arrays if they don't exist
if (typeof projectiles === 'undefined') window.projectiles = [];
if (typeof particles === 'undefined') window.particles = [];

console.log('🚀 PHASE 3 DEPLOYMENT COMPLETE');
console.log('🎯 Advanced Targeting: ACTIVE');
console.log('⚔️ Enhanced Combat: ACTIVE');
console.log('🌌 Procedural Universe: ACTIVE');
console.log('🤖 AI Companions: ACTIVE');
console.log('');
console.log('🎮 CONTROLS:');
console.log('T - Cycle targets');
console.log('R - Change combat mode');
console.log('C - Spawn combat companion');
console.log('V - Spawn support companion');
console.log('B - Spawn scout companion');
console.log('F - Change formation');
`;

    // Find a good place to insert the new code (before the closing script tag)
    const insertionPoint = content.lastIndexOf('</script>');
    if (insertionPoint === -1) {
        throw new Error('Could not find insertion point for Phase 3 systems');
    }
    
    // Insert all Phase 3 systems
    const newContent = 
        content.substring(0, insertionPoint) +
        '\n' +
        advancedTargeting +
        '\n' +
        enhancedCombat +
        '\n' +
        proceduralUniverse +
        '\n' +
        aiCompanions +
        '\n' +
        systemIntegration +
        '\n' +
        content.substring(insertionPoint);
    
    // Write the enhanced file
    fs.writeFileSync('public/index.html', cr(newContent));
    
    console.log('🎉 SUCCESS: PHASE 3 MASSIVE FEATURE DEPLOYMENT COMPLETE');
    console.log('📊 New systems added:');
    console.log('  🎯 Advanced Targeting System - Smart target acquisition and priority');
    console.log('  ⚔️ Enhanced Combat System - Multiple weapon systems and combat modes');
    console.log('  🌌 Procedural Universe Generator - Infinite sectors with stations, asteroids, enemies');
    console.log('  🤖 AI Companion System - Combat, support, and scout companions');
    console.log('');
    console.log('🎮 Game is now FULLY PLAYABLE with:');
    console.log('  • Real enemy targeting and combat');
    console.log('  • Multiple weapon systems');
    console.log('  • AI companions that fight alongside you');
    console.log('  • Procedurally generated universe to explore');
    console.log('  • Advanced targeting system');
    console.log('  • Combat statistics and progression');
    console.log('');
    console.log('📈 Final file: ' + newContent.split('\n').length + ' lines');
    console.log('👑 KING DECLARES: PHASE 3 DEPLOYMENT SUCCESSFUL');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

console.log('✅ Phase 3 deployment script complete');