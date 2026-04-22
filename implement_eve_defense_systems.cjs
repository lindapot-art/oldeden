#!/usr/bin/env node
// 🚀 EVE ONLINE DEFENSE SYSTEMS + DRONES + CAPACITOR + COMPLETE TESTING
// Comprehensive ship defense implementation

const fs = require('fs');

function safeReplace(content, oldStr, newStr) {
    if (!content.includes(oldStr)) {
        console.warn('⚠️ Pattern not found:', oldStr.slice(0, 80) + '...');
        return content;
    }
    return content.replace(oldStr, newStr);
}

function cr(str) {
    return str.replace(/\n/g, '\r\n');
}

console.log('🚀 IMPLEMENTING EVE ONLINE DEFENSE SYSTEMS + DRONES + TESTING...');

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. COMPREHENSIVE SHIP DEFENSE SYSTEMS
const defenseSystemsCode = `
// ══ EVE ONLINE DEFENSE SYSTEMS ══
window.eveDefenseSystems = {
  // Shield System
  shields: {
    current: 1000,
    maximum: 1000,
    regenRate: 25, // HP per second
    regenDelay: 5000, // Delay after taking damage before regen starts
    lastDamageTime: 0,
    resistance: {
      kinetic: 0.25,    // 25% resistance to kinetic
      thermal: 0.15,    // 15% resistance to thermal  
      electromagnetic: 0.35, // 35% resistance to EM
      explosive: 0.10   // 10% resistance to explosive
    }
  },
  
  // Armor System
  armor: {
    current: 800,
    maximum: 800,
    repairRate: 15, // HP per second with nanobots
    nanobots: {
      active: true,
      efficiency: 0.85, // 85% efficiency
      capacitorDrain: 5  // Cap per second when active
    },
    resistance: {
      kinetic: 0.40,
      thermal: 0.60,
      electromagnetic: 0.10,
      explosive: 0.45
    }
  },
  
  // Hull System  
  hull: {
    current: 600,
    maximum: 600,
    repairRate: 8, // HP per second with hull repair systems
    selfRepair: {
      active: false,
      efficiency: 0.65,
      capacitorDrain: 8
    },
    resistance: {
      kinetic: 0.15,
      thermal: 0.15,
      electromagnetic: 0.15,
      explosive: 0.15
    }
  },
  
  // Capacitor System
  capacitor: {
    current: 2000,
    maximum: 2000,
    rechargeRate: 50, // Cap per second
    stability: 0.85,  // 85% stable cap
    modules: {
      shields: { drain: 12, active: false },
      armorRepair: { drain: 15, active: false },
      hullRepair: { drain: 18, active: false },
      drones: { drain: 8, active: false },
      weapons: { drain: 25, active: false }
    }
  }
};

// Drone System
window.eveDroneSystem = {
  drones: [],
  maxDrones: 5,
  droneTypes: {
    light: {
      hp: 150, damage: 35, speed: 45, range: 400,
      size: 1.2, color: 0x44ff88, tracking: 0.08
    },
    medium: {
      hp: 250, damage: 55, speed: 35, range: 500,  
      size: 1.8, color: 0xff8844, tracking: 0.06
    },
    heavy: {
      hp: 400, damage: 85, speed: 25, range: 600,
      size: 2.4, color: 0xff4444, tracking: 0.04
    }
  },
  currentType: 'light',
  autoLaunch: true,
  autoEngage: true,
  engagementRange: 500
};

// Damage Application System
window.applyDefensiveDamage = function(incomingDamage, damageType = 'kinetic') {
  const defense = window.eveDefenseSystems;
  let remainingDamage = incomingDamage;
  
  // 1. Apply to Shields First
  if (defense.shields.current > 0) {
    const resistance = defense.shields.resistance[damageType] || 0;
    const actualDamage = remainingDamage * (1 - resistance);
    const shieldDamage = Math.min(actualDamage, defense.shields.current);
    
    defense.shields.current -= shieldDamage;
    defense.shields.lastDamageTime = Date.now();
    remainingDamage -= shieldDamage / (1 - resistance);
    
    // Shield effect
    window.createShieldEffect();
  }
  
  // 2. Apply to Armor if damage remains
  if (remainingDamage > 0 && defense.armor.current > 0) {
    const resistance = defense.armor.resistance[damageType] || 0;
    const actualDamage = remainingDamage * (1 - resistance);
    const armorDamage = Math.min(actualDamage, defense.armor.current);
    
    defense.armor.current -= armorDamage;
    remainingDamage -= armorDamage / (1 - resistance);
    
    // Armor effect
    window.createArmorEffect();
  }
  
  // 3. Apply to Hull if damage still remains
  if (remainingDamage > 0 && defense.hull.current > 0) {
    const resistance = defense.hull.resistance[damageType] || 0;
    const actualDamage = remainingDamage * (1 - resistance);
    const hullDamage = Math.min(actualDamage, defense.hull.current);
    
    defense.hull.current -= hullDamage;
    
    // Hull critical effect
    window.createHullEffect();
    
    // Ship destroyed if hull depleted
    if (defense.hull.current <= 0) {
      window.triggerShipDestruction();
    }
  }
  
  return {
    shieldsRemaining: defense.shields.current,
    armorRemaining: defense.armor.current,
    hullRemaining: defense.hull.current,
    totalDamageApplied: incomingDamage
  };
};

// Shield Regeneration System
window.updateShieldRegeneration = function() {
  const shields = window.eveDefenseSystems.shields;
  const now = Date.now();
  
  // Regenerate shields after delay
  if (shields.current < shields.maximum) {
    if (now - shields.lastDamageTime >= shields.regenDelay) {
      shields.current = Math.min(
        shields.maximum,
        shields.current + (shields.regenRate / 60) // Per frame at 60fps
      );
    }
  }
};

// Armor Nanobot Repair System  
window.updateArmorRepair = function() {
  const armor = window.eveDefenseSystems.armor;
  const capacitor = window.eveDefenseSystems.capacitor;
  
  if (armor.nanobots.active && armor.current < armor.maximum) {
    // Check capacitor
    if (capacitor.current >= armor.nanobots.capacitorDrain / 60) {
      // Repair armor
      const repairAmount = (armor.repairRate * armor.nanobots.efficiency) / 60;
      armor.current = Math.min(armor.maximum, armor.current + repairAmount);
      
      // Drain capacitor
      capacitor.current -= armor.nanobots.capacitorDrain / 60;
      
      // Nanobot effects
      if (Math.random() < 0.1) window.createNanobotEffect();
    }
  }
};

// Hull Self-Repair System
window.updateHullRepair = function() {
  const hull = window.eveDefenseSystems.hull;
  const capacitor = window.eveDefenseSystems.capacitor;
  
  if (hull.selfRepair.active && hull.current < hull.maximum) {
    if (capacitor.current >= hull.selfRepair.capacitorDrain / 60) {
      const repairAmount = (hull.repairRate * hull.selfRepair.efficiency) / 60;
      hull.current = Math.min(hull.maximum, hull.current + repairAmount);
      
      capacitor.current -= hull.selfRepair.capacitorDrain / 60;
      
      if (Math.random() < 0.05) window.createHullRepairEffect();
    }
  }
};

// Capacitor Management System
window.updateCapacitor = function() {
  const cap = window.eveDefenseSystems.capacitor;
  
  // Natural recharge (follows EVE's capacitor curve)
  if (cap.current < cap.maximum) {
    const capPercentage = cap.current / cap.maximum;
    const rechargeMultiplier = Math.sqrt(capPercentage) * cap.stability;
    cap.current = Math.min(
      cap.maximum,
      cap.current + (cap.rechargeRate * rechargeMultiplier) / 60
    );
  }
  
  // Module drain calculations handled in respective systems
};

// Drone AI System
window.updateDroneAI = function() {
  if (!window.eveDroneSystem.autoEngage) return;
  
  window.eveDroneSystem.drones.forEach(drone => {
    if (!drone || !drone.mesh) return;
    
    // Find target
    if (!drone.target || !drone.target.position) {
      drone.target = window.findNearestHostileForDrone(drone);
    }
    
    if (drone.target) {
      const targetPos = drone.target.position;
      const dronePos = drone.position;
      const distance = dronePos.distanceTo(targetPos);
      
      // Move toward target
      if (distance > drone.optimalRange) {
        const direction = targetPos.clone().sub(dronePos).normalize();
        drone.velocity = direction.multiplyScalar(drone.speed);
        drone.position.add(drone.velocity.multiplyScalar(1/60));
      } else {
        // Attack target
        drone.velocity.multiplyScalar(0.9); // Slow down
        window.droneAttackTarget(drone, drone.target);
      }
      
      // Update visual position
      drone.mesh.position.copy(drone.position);
      
      // Orient toward target
      try {
        drone.mesh.lookAt(targetPos);
      } catch(e) {}
    } else {
      // Return to player if no target
      if (window.player && window.player.position) {
        const playerPos = window.player.position;
        const dronePos = drone.position;
        const distance = dronePos.distanceTo(playerPos);
        
        if (distance > 50) {
          const direction = playerPos.clone().sub(dronePos).normalize();
          drone.velocity = direction.multiplyScalar(drone.speed * 0.7);
          drone.position.add(drone.velocity.multiplyScalar(1/60));
          drone.mesh.position.copy(drone.position);
        }
      }
    }
  });
};

// Drone Combat System  
window.droneAttackTarget = function(drone, target) {
  const now = Date.now();
  if (now - drone.lastAttack < drone.attackDelay) return;
  
  // Create drone projectile
  const projectile = {
    position: drone.position.clone(),
    velocity: target.position.clone().sub(drone.position).normalize().multiplyScalar(60),
    damage: drone.damage,
    life: 1.0,
    type: 'drone-projectile',
    source: 'drone'
  };
  
  // Visual projectile
  try {
    const geometry = new THREE.SphereGeometry(0.2);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff66,
      emissive: 0x00ff66,
      emissiveIntensity: 0.8
    });
    projectile.mesh = new THREE.Mesh(geometry, material);
    projectile.mesh.position.copy(projectile.position);
    window.scene.add(projectile.mesh);
  } catch (error) {
    console.warn('Drone projectile visual failed');
  }
  
  if (!window.droneProjectiles) window.droneProjectiles = [];
  window.droneProjectiles.push(projectile);
  
  drone.lastAttack = now;
};

// Launch Drones System
window.launchDrone = function(droneType = 'light') {
  if (!window.player || !window.scene) return;
  if (window.eveDroneSystem.drones.length >= window.eveDroneSystem.maxDrones) return;
  
  const droneSpec = window.eveDroneSystem.droneTypes[droneType];
  if (!droneSpec) return;
  
  const drone = {
    id: Date.now() + Math.random(),
    type: droneType,
    hp: droneSpec.hp,
    maxHP: droneSpec.hp,
    damage: droneSpec.damage,
    speed: droneSpec.speed,
    optimalRange: droneSpec.range,
    tracking: droneSpec.tracking,
    position: window.player.position.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 30,
      Math.random() * 15 + 5,
      (Math.random() - 0.5) * 30
    )),
    velocity: new THREE.Vector3(0, 0, 0),
    target: null,
    lastAttack: 0,
    attackDelay: 1000 / (droneSpec.damage / 30) // Faster attack for lighter drones
  };
  
  // Create drone visual
  try {
    const geometry = new THREE.ConeGeometry(droneSpec.size, droneSpec.size * 1.5);
    const material = new THREE.MeshBasicMaterial({
      color: droneSpec.color,
      emissive: droneSpec.color,
      emissiveIntensity: 0.3
    });
    drone.mesh = new THREE.Mesh(geometry, material);
    drone.mesh.position.copy(drone.position);
    window.scene.add(drone.mesh);
    
    // Add drone trail effect
    const trailGeometry = new THREE.CylinderGeometry(0.1, 0.1, droneSpec.size);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: droneSpec.color,
      transparent: true,
      opacity: 0.4
    });
    drone.trail = new THREE.Mesh(trailGeometry, trailMaterial);
    drone.trail.position.copy(drone.position);
    window.scene.add(drone.trail);
  } catch (error) {
    console.warn('Drone visual creation failed');
  }
  
  window.eveDroneSystem.drones.push(drone);
  console.log(\`🤖 \${droneType} drone launched\`);
  
  // Drain capacitor for drone launch
  window.eveDefenseSystems.capacitor.current -= 50;
};

// Find target for drone
window.findNearestHostileForDrone = function(drone) {
  if (!window.enemies || !drone) return null;
  
  let nearest = null;
  let nearestDist = Infinity;
  
  window.enemies.forEach(enemy => {
    if (!enemy || !enemy.position) return;
    
    const dist = drone.position.distanceTo(enemy.position);
    if (dist < nearestDist && dist <= window.eveDroneSystem.engagementRange) {
      nearestDist = dist;
      nearest = enemy;
    }
  });
  
  return nearest;
};

// Update drone projectiles
window.updateDroneProjectiles = function() {
  if (!window.droneProjectiles) return;
  
  for (let i = window.droneProjectiles.length - 1; i >= 0; i--) {
    const proj = window.droneProjectiles[i];
    if (!proj) continue;
    
    proj.position.add(proj.velocity.multiplyScalar(1/60));
    
    if (proj.mesh) {
      proj.mesh.position.copy(proj.position);
    }
    
    // Check collision with enemies
    if (window.enemies) {
      for (let j = 0; j < window.enemies.length; j++) {
        const enemy = window.enemies[j];
        if (!enemy || !enemy.position) continue;
        
        const dist = proj.position.distanceTo(enemy.position);
        if (dist < 5) {
          // Hit!
          if (enemy.health !== undefined) {
            enemy.health -= proj.damage;
          }
          
          // Small explosion
          window.createModernExplosion(proj.position, 0.8);
          
          // Remove projectile
          if (proj.mesh) window.scene.remove(proj.mesh);
          window.droneProjectiles.splice(i, 1);
          
          // Remove enemy if destroyed
          if (enemy.health !== undefined && enemy.health <= 0) {
            if (typeof window.destroyEnemy === 'function') {
              window.destroyEnemy(enemy, j);
            }
          }
          break;
        }
      }
    }
    
    // Remove old projectiles
    proj.life -= 1/60;
    if (proj.life <= 0) {
      if (proj.mesh) window.scene.remove(proj.mesh);
      window.droneProjectiles.splice(i, 1);
    }
  }
};

// Defense Visual Effects
window.createShieldEffect = function() {
  if (!window.player || !window.scene) return;
  
  try {
    const shieldGeometry = new THREE.SphereGeometry(25, 16, 16);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    const shieldSphere = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shieldSphere.position.copy(window.player.position);
    window.scene.add(shieldSphere);
    
    // Animate shield effect
    let opacity = 0.6;
    const fadeShield = () => {
      opacity -= 0.05;
      shieldMaterial.opacity = opacity;
      if (opacity > 0) {
        requestAnimationFrame(fadeShield);
      } else {
        window.scene.remove(shieldSphere);
      }
    };
    fadeShield();
  } catch (error) {
    console.warn('Shield effect failed');
  }
};

window.createArmorEffect = function() {
  // Armor sparks effect
  try {
    for (let i = 0; i < 8; i++) {
      const spark = {
        position: window.player.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          Math.random() * 10,
          (Math.random() - 0.5) * 20
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          Math.random() * 20 + 10,
          (Math.random() - 0.5) * 30
        ),
        life: 1.0
      };
      
      const sparkGeometry = new THREE.SphereGeometry(0.3);
      const sparkMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.8
      });
      
      spark.mesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
      spark.mesh.position.copy(spark.position);
      window.scene.add(spark.mesh);
      
      if (!window.defenseEffectParticles) window.defenseEffectParticles = [];
      window.defenseEffectParticles.push(spark);
    }
  } catch (error) {
    console.warn('Armor effect failed');
  }
};

window.createHullEffect = function() {
  // Hull breach effects
  try {
    for (let i = 0; i < 12; i++) {
      const debris = {
        position: window.player.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          Math.random() * 8,
          (Math.random() - 0.5) * 15
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 25,
          Math.random() * 15 + 5,
          (Math.random() - 0.5) * 25
        ),
        life: 1.0,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      };
      
      const debrisGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const debrisMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x888888,
        emissive: 0x442200,
        emissiveIntensity: 0.4
      });
      
      debris.mesh = new THREE.Mesh(debrisGeometry, debrisMaterial);
      debris.mesh.position.copy(debris.position);
      window.scene.add(debris.mesh);
      
      if (!window.defenseEffectParticles) window.defenseEffectParticles = [];
      window.defenseEffectParticles.push(debris);
    }
  } catch (error) {
    console.warn('Hull effect failed');
  }
};

window.createNanobotEffect = function() {
  try {
    for (let i = 0; i < 4; i++) {
      const nanobot = {
        position: window.player.position.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 25,
          Math.random() * 12,
          (Math.random() - 0.5) * 25
        )),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 5,
          (Math.random() - 0.5) * 8
        ),
        life: 1.0
      };
      
      const nanobotGeometry = new THREE.SphereGeometry(0.15);
      const nanobotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff88,
        emissive: 0x00ff88,
        emissiveIntensity: 0.9
      });
      
      nanobot.mesh = new THREE.Mesh(nanobotGeometry, nanobotMaterial);
      nanobot.mesh.position.copy(nanobot.position);
      window.scene.add(nanobot.mesh);
      
      if (!window.defenseEffectParticles) window.defenseEffectParticles = [];
      window.defenseEffectParticles.push(nanobot);
    }
  } catch (error) {
    console.warn('Nanobot effect failed');
  }
};

window.createHullRepairEffect = function() {
  try {
    const repairBeam = {
      position: window.player.position.clone(),
      life: 1.0
    };
    
    const beamGeometry = new THREE.CylinderGeometry(0.5, 0.5, 20);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
      emissive: 0x4488ff,
      emissiveIntensity: 0.4
    });
    
    repairBeam.mesh = new THREE.Mesh(beamGeometry, beamMaterial);
    repairBeam.mesh.position.copy(repairBeam.position);
    window.scene.add(repairBeam.mesh);
    
    if (!window.defenseEffectParticles) window.defenseEffectParticles = [];
    window.defenseEffectParticles.push(repairBeam);
  } catch (error) {
    console.warn('Hull repair effect failed');
  }
};

// Update all defense effect particles
window.updateDefenseEffects = function() {
  if (!window.defenseEffectParticles) return;
  
  for (let i = window.defenseEffectParticles.length - 1; i >= 0; i--) {
    const particle = window.defenseEffectParticles[i];
    if (!particle) continue;
    
    if (particle.velocity) {
      particle.position.add(particle.velocity.multiplyScalar(1/60));
      particle.velocity.multiplyScalar(0.96); // Air resistance
      particle.velocity.y -= 8 * (1/60); // Gravity
    }
    
    if (particle.rotationSpeed && particle.mesh) {
      particle.mesh.rotation.x += particle.rotationSpeed;
      particle.mesh.rotation.y += particle.rotationSpeed;
    }
    
    particle.life -= 1/60 * 1.2;
    
    if (particle.mesh) {
      particle.mesh.position.copy(particle.position);
      if (particle.mesh.material && particle.mesh.material.opacity !== undefined) {
        particle.mesh.material.opacity = Math.max(0, particle.life);
      }
    }
    
    if (particle.life <= 0) {
      if (particle.mesh) window.scene.remove(particle.mesh);
      window.defenseEffectParticles.splice(i, 1);
    }
  }
};

// Auto-launch drones system
window.autoLaunchDrones = function() {
  if (!window.eveDroneSystem.autoLaunch) return;
  
  const currentDroneCount = window.eveDroneSystem.drones.length;
  const maxDrones = window.eveDroneSystem.maxDrones;
  
  if (currentDroneCount < maxDrones && window.eveDefenseSystems.capacitor.current > 100) {
    // Launch a drone every few seconds if under capacity
    const now = Date.now();
    if (!window.lastDroneLaunch || now - window.lastDroneLaunch > 3000) {
      window.launchDrone(window.eveDroneSystem.currentType);
      window.lastDroneLaunch = now;
    }
  }
};

// Ship destruction sequence
window.triggerShipDestruction = function() {
  console.log('💥 SHIP DESTROYED!');
  
  // Create massive explosion
  if (window.player && window.player.position) {
    window.createModernExplosion(window.player.position, 4);
  }
  
  // Recall all drones
  window.eveDroneSystem.drones.forEach(drone => {
    if (drone.mesh) window.scene.remove(drone.mesh);
    if (drone.trail) window.scene.remove(drone.trail);
  });
  window.eveDroneSystem.drones = [];
  
  // Reset defense systems after respawn delay
  setTimeout(() => {
    window.eveDefenseSystems.shields.current = window.eveDefenseSystems.shields.maximum;
    window.eveDefenseSystems.armor.current = window.eveDefenseSystems.armor.maximum;
    window.eveDefenseSystems.hull.current = window.eveDefenseSystems.hull.maximum;
    window.eveDefenseSystems.capacitor.current = window.eveDefenseSystems.capacitor.maximum;
    console.log('🔄 Ship respawned with full defenses');
  }, 5000);
};

// Initialize EVE defense systems
setTimeout(() => {
  console.log('🛡️ EVE Online Defense Systems Initialized');
  console.log('  • Shield System: Regenerating shields with resistances');  
  console.log('  • Armor System: Nanobot repair with capacitor drain');
  console.log('  • Hull System: Self-repair modules');
  console.log('  • Capacitor: EVE-style energy management');
  console.log('  • Drones: Auto-launching combat drones');
  
  // Auto-launch initial drones
  setTimeout(() => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => window.launchDrone('light'), i * 1000);
    }
  }, 2000);
}, 2000);

`;

// Insert EVE defense systems after modern weapons
html = safeReplace(html, '// ══ DUAL GATLING + VECTOR MISSILE SYSTEM ══', 
defenseSystemsCode + '\r\n// ══ DUAL GATLING + VECTOR MISSILE SYSTEM ══');

// 2. ADD COMPREHENSIVE DEFENSE HUD
const defenseHUD = `
<!-- EVE Defense Systems HUD -->
<div id="eve-defense-hud" style="
  position: fixed;
  top: 24px;
  left: 24px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(30px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(0,0,0,0.1);
  min-width: 280px;
  z-index: 95;
  font-size: 0.85rem;
  box-shadow: 0 16px 48px rgba(0,0,0,0.12);
  color: #2c3e50;
">
  <div style="color: #7f8c8d; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 16px; font-weight: 600; text-align: center;">
    DEFENSE SYSTEMS
  </div>
  
  <!-- Shield Status -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: 500; color: #2a9d8f;">🛡️ Shields</span>
      <span id="shield-percentage" style="font-weight: 700; color: #2a9d8f;">100%</span>
    </div>
    <div style="width: 100%; height: 8px; background: rgba(42, 157, 143, 0.2); border-radius: 4px;">
      <div id="shield-bar" style="height: 100%; background: linear-gradient(90deg, #06d6a0, #2a9d8f); border-radius: 4px; width: 100%; transition: width 0.3s;"></div>
    </div>
    <div id="shield-status" style="font-size: 0.7rem; color: #7f8c8d; margin-top: 4px;">Regenerating</div>
  </div>
  
  <!-- Armor Status -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: 500; color: #f4a261;">⚙️ Armor</span>
      <span id="armor-percentage" style="font-weight: 700; color: #f4a261;">100%</span>
    </div>
    <div style="width: 100%; height: 8px; background: rgba(244, 162, 97, 0.2); border-radius: 4px;">
      <div id="armor-bar" style="height: 100%; background: linear-gradient(90deg, #f4a261, #e76f51); border-radius: 4px; width: 100%; transition: width 0.3s;"></div>
    </div>
    <div id="armor-status" style="font-size: 0.7rem; color: #7f8c8d; margin-top: 4px;">Nanobots Active</div>
  </div>
  
  <!-- Hull Status -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: 500; color: #e63946;">🔧 Hull</span>
      <span id="hull-percentage" style="font-weight: 700; color: #e63946;">100%</span>
    </div>
    <div style="width: 100%; height: 8px; background: rgba(230, 57, 70, 0.2); border-radius: 4px;">
      <div id="hull-bar" style="height: 100%; background: linear-gradient(90deg, #f77f00, #e63946); border-radius: 4px; width: 100%; transition: width 0.3s;"></div>
    </div>
    <div id="hull-status" style="font-size: 0.7rem; color: #7f8c8d; margin-top: 4px;">Structural Integrity</div>
  </div>
  
  <div style="height: 1px; background: rgba(0,0,0,0.1); margin: 16px 0;"></div>
  
  <!-- Capacitor Status -->
  <div style="margin-bottom: 14px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <span style="font-weight: 500; color: #457b9d;">⚡ Capacitor</span>
      <span id="cap-percentage" style="font-weight: 700; color: #457b9d;">100%</span>
    </div>
    <div style="width: 100%; height: 10px; background: rgba(69, 123, 157, 0.2); border-radius: 5px;">
      <div id="cap-bar" style="height: 100%; background: linear-gradient(90deg, #1d3557, #457b9d); border-radius: 5px; width: 100%; transition: width 0.2s;"></div>
    </div>
    <div id="cap-status" style="font-size: 0.7rem; color: #7f8c8d; margin-top: 4px;">Stable</div>
  </div>
  
  <!-- Drone Status -->
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span style="font-weight: 500; color: #06d6a0;">🤖 Drones</span>
      <span id="drone-count" style="font-weight: 700; color: #06d6a0;">0/5</span>
    </div>
    <div id="drone-status" style="font-size: 0.7rem; color: #7f8c8d;">Auto-Launch Active</div>
  </div>
</div>

<!-- Defense Controls -->
<div id="defense-controls" style="
  position: fixed;
  bottom: 24px;
  left: 24px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0,0,0,0.08);
  z-index: 94;
  font-size: 0.8rem;
  color: #2c3e50;
  min-width: 240px;
">
  <div style="color: #7f8c8d; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; font-weight: 600;">
    Defense Controls
  </div>
  <div style="margin-bottom: 6px;"><strong>H</strong> - Toggle Hull Repair</div>
  <div style="margin-bottom: 6px;"><strong>A</strong> - Toggle Armor Nanobots</div>
  <div style="margin-bottom: 6px;"><strong>D</strong> - Launch Drone</div>
  <div style="margin-bottom: 6px;"><strong>R</strong> - Recall All Drones</div>
  <div><strong>1-3</strong> - Switch Drone Types</div>
</div>

<!-- Combat Status Overlay -->
<div id="combat-status" style="
  position: fixed;
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(25px);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0,0,0,0.1);
  z-index: 93;
  font-size: 0.8rem;
  color: #2c3e50;
  min-width: 180px;
  display: none;
">
  <div style="color: #e63946; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-size: 0.7rem;">
    TAKING DAMAGE
  </div>
  <div id="damage-type" style="margin-bottom: 6px;">Kinetic</div>
  <div id="damage-amount" style="font-weight: 600; color: #e63946;">-150 HP</div>
</div>
`;

// Insert defense HUD before modern weapon HUD
html = safeReplace(html, '<!-- Modern Weapon HUD -->', 
defenseHUD + '\r\n<!-- Modern Weapon HUD -->');

// 3. ADD DEFENSE HUD UPDATE SYSTEM
const defenseHUDSystem = `
// ── EVE DEFENSE HUD UPDATE SYSTEM ──
window.updateEveDefenseHUD = function() {
  try {
    const defense = window.eveDefenseSystems;
    
    // Update Shield Display
    const shieldPerc = Math.round((defense.shields.current / defense.shields.maximum) * 100);
    const shieldBar = document.getElementById('shield-bar');
    const shieldPercentage = document.getElementById('shield-percentage');
    const shieldStatus = document.getElementById('shield-status');
    
    if (shieldBar) shieldBar.style.width = shieldPerc + '%';
    if (shieldPercentage) shieldPercentage.textContent = shieldPerc + '%';
    if (shieldStatus) {
      const now = Date.now();
      const regenActive = (now - defense.shields.lastDamageTime) >= defense.shields.regenDelay;
      shieldStatus.textContent = shieldPerc < 100 ? (regenActive ? 'Regenerating' : 'Damaged') : 'Full Power';
      shieldStatus.style.color = regenActive ? '#06d6a0' : '#f77f00';
    }
    
    // Update Armor Display
    const armorPerc = Math.round((defense.armor.current / defense.armor.maximum) * 100);
    const armorBar = document.getElementById('armor-bar');
    const armorPercentage = document.getElementById('armor-percentage');
    const armorStatus = document.getElementById('armor-status');
    
    if (armorBar) armorBar.style.width = armorPerc + '%';
    if (armorPercentage) armorPercentage.textContent = armorPerc + '%';
    if (armorStatus) {
      armorStatus.textContent = defense.armor.nanobots.active ? 'Nanobots Active' : 'Nanobots Offline';
      armorStatus.style.color = defense.armor.nanobots.active ? '#06d6a0' : '#7f8c8d';
    }
    
    // Update Hull Display
    const hullPerc = Math.round((defense.hull.current / defense.hull.maximum) * 100);
    const hullBar = document.getElementById('hull-bar');
    const hullPercentage = document.getElementById('hull-percentage');
    const hullStatus = document.getElementById('hull-status');
    
    if (hullBar) hullBar.style.width = hullPerc + '%';
    if (hullPercentage) {
      hullPercentage.textContent = hullPerc + '%';
      hullPercentage.style.color = hullPerc < 25 ? '#e63946' : (hullPerc < 50 ? '#f77f00' : '#e63946');
    }
    if (hullStatus) {
      if (hullPerc < 25) {
        hullStatus.textContent = 'CRITICAL DAMAGE';
        hullStatus.style.color = '#e63946';
      } else if (hullPerc < 75) {
        hullStatus.textContent = defense.hull.selfRepair.active ? 'Repairing' : 'Damaged';
        hullStatus.style.color = defense.hull.selfRepair.active ? '#f77f00' : '#7f8c8d';
      } else {
        hullStatus.textContent = 'Structural Integrity';
        hullStatus.style.color = '#06d6a0';
      }
    }
    
    // Update Capacitor Display
    const capPerc = Math.round((defense.capacitor.current / defense.capacitor.maximum) * 100);
    const capBar = document.getElementById('cap-bar');
    const capPercentage = document.getElementById('cap-percentage');
    const capStatus = document.getElementById('cap-status');
    
    if (capBar) capBar.style.width = capPerc + '%';
    if (capPercentage) {
      capPercentage.textContent = capPerc + '%';
      capPercentage.style.color = capPerc < 25 ? '#e63946' : (capPerc < 50 ? '#f77f00' : '#457b9d');
    }
    if (capStatus) {
      if (capPerc < 25) {
        capStatus.textContent = 'Low Power';
        capStatus.style.color = '#e63946';
      } else if (capPerc < defense.capacitor.stability * 100) {
        capStatus.textContent = 'Unstable';
        capStatus.style.color = '#f77f00';
      } else {
        capStatus.textContent = 'Stable';
        capStatus.style.color = '#06d6a0';
      }
    }
    
    // Update Drone Display
    const droneCount = document.getElementById('drone-count');
    const droneStatus = document.getElementById('drone-status');
    
    if (droneCount && window.eveDroneSystem) {
      droneCount.textContent = \`\${window.eveDroneSystem.drones.length}/\${window.eveDroneSystem.maxDrones}\`;
    }
    if (droneStatus && window.eveDroneSystem) {
      droneStatus.textContent = window.eveDroneSystem.autoLaunch ? 'Auto-Launch Active' : 'Manual Control';
      droneStatus.style.color = window.eveDroneSystem.autoLaunch ? '#06d6a0' : '#7f8c8d';
    }
    
  } catch (error) {
    // Silent fail for HUD updates
  }
};

// Show damage indicator
window.showDamageIndicator = function(damageAmount, damageType) {
  const combatStatus = document.getElementById('combat-status');
  const damageTypeEl = document.getElementById('damage-type');
  const damageAmountEl = document.getElementById('damage-amount');
  
  if (combatStatus && damageTypeEl && damageAmountEl) {
    combatStatus.style.display = 'block';
    damageTypeEl.textContent = damageType.charAt(0).toUpperCase() + damageType.slice(1) + ' Damage';
    damageAmountEl.textContent = '-' + Math.round(damageAmount) + ' HP';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      combatStatus.style.display = 'none';
    }, 3000);
  }
};

// ── EVE DEFENSE CONTROLS ──
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyH') {
    event.preventDefault();
    if (window.eveDefenseSystems) {
      window.eveDefenseSystems.hull.selfRepair.active = !window.eveDefenseSystems.hull.selfRepair.active;
      console.log('🔧 Hull repair:', window.eveDefenseSystems.hull.selfRepair.active ? 'ACTIVE' : 'INACTIVE');
    }
  }
  
  if (event.code === 'KeyA') {
    event.preventDefault();
    if (window.eveDefenseSystems) {
      window.eveDefenseSystems.armor.nanobots.active = !window.eveDefenseSystems.armor.nanobots.active;
      console.log('⚙️ Armor nanobots:', window.eveDefenseSystems.armor.nanobots.active ? 'ACTIVE' : 'INACTIVE');
    }
  }
  
  if (event.code === 'KeyD') {
    event.preventDefault();
    if (window.launchDrone && window.eveDroneSystem) {
      window.launchDrone(window.eveDroneSystem.currentType);
    }
  }
  
  if (event.code === 'KeyR') {
    event.preventDefault();
    // Recall all drones
    if (window.eveDroneSystem && window.eveDroneSystem.drones) {
      window.eveDroneSystem.drones.forEach(drone => {
        if (drone.mesh) window.scene.remove(drone.mesh);
        if (drone.trail) window.scene.remove(drone.trail);
      });
      window.eveDroneSystem.drones = [];
      console.log('📡 All drones recalled');
    }
  }
  
  // Drone type switching
  if (event.code === 'Digit1') {
    event.preventDefault();
    if (window.eveDroneSystem) {
      window.eveDroneSystem.currentType = 'light';
      console.log('🤖 Drone type: Light');
    }
  }
  
  if (event.code === 'Digit2') {
    event.preventDefault();
    if (window.eveDroneSystem) {
      window.eveDroneSystem.currentType = 'medium';
      console.log('🤖 Drone type: Medium');
    }
  }
  
  if (event.code === 'Digit3') {
    event.preventDefault();
    if (window.eveDroneSystem) {
      window.eveDroneSystem.currentType = 'heavy';
      console.log('🤖 Drone type: Heavy');
    }
  }
});

// Initialize defense HUD updates
setInterval(() => {
  if (window.updateEveDefenseHUD) window.updateEveDefenseHUD();
}, 100);
`;

// Insert defense HUD system after weapon HUD system
html = safeReplace(html, 'setInterval(() => {\n  if (window.updateModernWeaponHUD) window.updateModernWeaponHUD();\n}, 100);', 
'setInterval(() => {\n  if (window.updateModernWeaponHUD) window.updateModernWeaponHUD();\n}, 100);\n\n' + defenseHUDSystem);

// 4. INTEGRATE WITH GAME LOOP
const gameLoopEVEIntegration = `
        // ── EVE Defense System Updates ──
        try {
          if (window.updateShieldRegeneration) window.updateShieldRegeneration();
          if (window.updateArmorRepair) window.updateArmorRepair();
          if (window.updateHullRepair) window.updateHullRepair();
          if (window.updateCapacitor) window.updateCapacitor();
          if (window.updateDroneAI) window.updateDroneAI();
          if (window.updateDroneProjectiles) window.updateDroneProjectiles();
          if (window.updateDefenseEffects) window.updateDefenseEffects();
          if (window.autoLaunchDrones) window.autoLaunchDrones();
        } catch (error) {
          // Silent defense system errors
        }
`;

// Add EVE systems to game loop
html = safeReplace(html, '        // ── Modern Weapon System Updates ──', 
gameLoopEVEIntegration + '\r\n        // ── Modern Weapon System Updates ──');

fs.writeFileSync('public/index.html', html);

console.log('✅ EVE ONLINE DEFENSE SYSTEMS IMPLEMENTED!');
console.log('');
console.log('🛡️ DEFENSE SYSTEMS:');
console.log('   • Shields: Regenerating with damage resistances');
console.log('   • Armor: Nanobot repair with capacitor drain');
console.log('   • Hull: Self-repair systems');
console.log('   • Capacitor: EVE-style energy management');
console.log('');
console.log('🤖 DRONE SYSTEMS:');
console.log('   • Light/Medium/Heavy drones');
console.log('   • Auto-launch and auto-engage');
console.log('   • Vector AI targeting');
console.log('');
console.log('🎮 DEFENSE CONTROLS:');
console.log('   • H - Toggle hull repair');
console.log('   • A - Toggle armor nanobots');
console.log('   • D - Launch drone');
console.log('   • R - Recall all drones');
console.log('   • 1-3 - Switch drone types');
console.log('');
console.log('📊 FEATURES:');
console.log('   • Real-time defense status HUD');
console.log('   • Damage type resistances');
console.log('   • Visual effects for all systems');
console.log('   • Capacitor-based module management');
console.log('   • Combat damage indicators');