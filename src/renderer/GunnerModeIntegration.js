/**
 * GunnerModeIntegration — Complete integration example for Death Star style gunner mode.
 *
 * This file demonstrates how to wire up all the gunner mode components:
 *   - ProjectileSystem: tracks fired projectiles
 *   - EnemySpawnSystem: spawns hostile NPCs
 *   - RailgunWeapon: visual weapon with recoil
 *   - GunnerView: first-person cockpit view
 *   - GunnerHUD: canvas overlay HUD
 *   - ProjectileRenderer: renders projectile trails
 *   - EnemyRenderer: renders enemy ships
 *   - Auto-targeting: selects nearest enemy
 *
 * Usage:
 *   import { GunnerModeIntegration } from './GunnerModeIntegration.js';
 *   
 *   // In your main game setup:
 *   const gunnerMode = new GunnerModeIntegration({
 *     THREE,
 *     scene,
 *     camera,
 *     canvas,
 *     hudCanvas,
 *     gameEngine,
 *     combatSystem,
 *     npcSystem,
 *   });
 *   
 *   // In animation loop:
 *   gunnerMode.update(deltaMs);
 *   
 *   // Toggle gunner mode:
 *   gunnerMode.toggle();
 */

import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { EnemySpawnSystem } from '../systems/EnemySpawnSystem.js';
import { RailgunWeapon } from './RailgunWeapon.js';
import { GunnerView } from './GunnerView.js';
import { GunnerHUD } from './GunnerHUD.js';
import { ProjectileRenderer } from './ProjectileRenderer.js';
import { EnemyRenderer } from './EnemyRenderer.js';
import { WEAPON_TYPE } from '../systems/CombatSystem.js';

export class GunnerModeIntegration {
  /**
   * @param {object} config
   * @param {object} config.THREE          Three.js namespace.
   * @param {THREE.Scene} config.scene     The 3D scene.
   * @param {THREE.Camera} config.camera   The camera.
   * @param {HTMLCanvasElement} config.canvas  The WebGL canvas.
   * @param {HTMLCanvasElement} config.hudCanvas  The 2D HUD canvas.
   * @param {object} config.gameEngine     GameEngine instance.
   * @param {object} config.combatSystem   CombatSystem instance.
   * @param {object} config.npcSystem      NPCSystem instance.
   * @param {object} config.shipGroup      Ship THREE.Group.
   * @param {object} config.turretMount    Turret mount point Object3D.
   */
  constructor(config) {
    this._THREE = config.THREE;
    this._scene = config.scene;
    this._camera = config.camera;
    this._canvas = config.canvas;
    this._hudCanvas = config.hudCanvas;
    this._gameEngine = config.gameEngine;
    this._combatSystem = config.combatSystem;
    this._npcSystem = config.npcSystem;
    this._shipGroup = config.shipGroup;
    this._turretMount = config.turretMount;

    // ── Initialize systems ──────────────────────────────────────────────
    
    /** Projectile management */
    this._projectileSystem = new ProjectileSystem(this._combatSystem);
    this._projectileRenderer = new ProjectileRenderer(
      this._THREE,
      this._scene,
      this._projectileSystem
    );

    /** Enemy spawning */
    this._enemySpawnSystem = new EnemySpawnSystem(
      this._npcSystem,
      this._combatSystem,
      { spawnRadius: 150, maxActiveEnemies: 15 }
    );
    this._enemyRenderer = new EnemyRenderer(
      this._THREE,
      this._scene,
      this._enemySpawnSystem
    );

    /** Railgun weapon */
    this._railgun = new RailgunWeapon(this._THREE, {
      barrelLength: 5.0,
      recoilDistance: 0.3,
      chargeTimeMs: 800,
      cooldownTimeMs: 1200,
    });

    /** Gunner view (first-person cockpit) */
    this._gunnerView = new GunnerView(
      this._THREE,
      this._camera,
      this._canvas,
      this._railgun
    );
    this._gunnerView.attachToShip(this._shipGroup, this._turretMount);

    /** HUD overlay */
    this._hud = new GunnerHUD(this._hudCanvas);
    this._hudCanvas.style.display = 'none';  // Hidden by default

    /** Current target lock */
    this._targetLock = null;

    /** Player position (updated externally or from ship) */
    this._playerPosition = new this._THREE.Vector3(0, 0, 0);

    // ── Event listeners ─────────────────────────────────────────────────
    
    // Listen for fire events from GunnerView
    this._canvas.addEventListener('gunner:fire', (e) => {
      this._handleFire(e.detail);
    });

    // Register systems with GameEngine (if not already registered)
    if (this._gameEngine) {
      this._gameEngine.registerSystem('projectiles', this._projectileSystem);
      this._gameEngine.registerSystem('enemies', this._enemySpawnSystem);
    }

    // ── Setup event handlers for combat ─────────────────────────────────
    
    if (this._gameEngine && this._gameEngine.events) {
      // When projectile hits enemy
      this._gameEngine.events.on('projectile:hit', (data) => {
        this._handleProjectileHit(data);
      });

      // When enemy is killed
      this._gameEngine.events.on('enemy:killed', (data) => {
        this._handleEnemyKilled(data);
      });

      // When enemy fires at player
      this._gameEngine.events.on('enemy:fired', (data) => {
        this._handleEnemyFire(data);
      });
    }

    console.log('[GunnerModeIntegration] Initialized.');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Toggle gunner mode on/off.
   */
  toggle() {
    if (this._gunnerView.isActive) {
      this.exit();
    } else {
      this.enter();
    }
  }

  /**
   * Enter gunner mode.
   */
  enter() {
    this._gunnerView.enter();
    this._hudCanvas.style.display = 'block';
    
    // Spawn initial enemy wave
    this._enemySpawnSystem.setPlayerPosition(this._playerPosition);
    this._enemySpawnSystem.spawnWave(this._playerPosition, 2, 5);
    
    console.log('[GunnerModeIntegration] Entered gunner mode.');
  }

  /**
   * Exit gunner mode.
   */
  exit() {
    this._gunnerView.exit();
    this._hudCanvas.style.display = 'none';
    console.log('[GunnerModeIntegration] Exited gunner mode.');
  }

  /**
   * Update all systems. Call every frame.
   * @param {number} deltaMs  Milliseconds since last frame.
   */
  update(deltaMs) {
    // Update player position from ship
    if (this._shipGroup) {
      this._shipGroup.getWorldPosition(this._playerPosition);
      this._enemySpawnSystem.setPlayerPosition(this._playerPosition);
    }

    // Update gunner view
    this._gunnerView.update(deltaMs);

    // Update systems (only if not registered with GameEngine)
    if (!this._gameEngine) {
      this._projectileSystem.tick(deltaMs);
      this._enemySpawnSystem.tick(deltaMs);
    }

    // Update renderers
    this._projectileRenderer.update(deltaMs);
    this._enemyRenderer.update(deltaMs);

    // Update auto-targeting
    if (this._gunnerView.isActive) {
      this._updateAutoTarget();
    }

    // Update HUD
    if (this._gunnerView.isActive) {
      this._updateHUD();
      this._hud.render(deltaMs);
    }

    // Register enemies as projectile targets
    this._updateProjectileTargets();
  }

  /**
   * Set player position manually (if not using shipGroup).
   * @param {THREE.Vector3} position
   */
  setPlayerPosition(position) {
    this._playerPosition.copy(position);
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    this._gunnerView.dispose();
    this._railgun.dispose();
    this._projectileRenderer.dispose();
    this._enemyRenderer.dispose();
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Handle fire event from gunner view.
   * @param {object} detail  { origin, direction, weaponType }
   */
  _handleFire(detail) {
    // Spawn projectile
    this._projectileSystem.fireProjectile({
      type: 'RAILGUN',
      origin: detail.origin,
      direction: detail.direction,
      damage: 75,
      shooterId: 'player',
      weaponType: WEAPON_TYPE.RAILGUN,
      speed: 500,
      targetId: this._targetLock ? this._targetLock.id : null,
    });

    console.log('[GunnerModeIntegration] Fired railgun projectile.');
  }

  /**
   * Handle projectile hit event.
   * @param {object} data
   */
  _handleProjectileHit(data) {
    if (data.targetId && data.targetId.startsWith('enemy-')) {
      // Damage enemy
      const killed = this._enemySpawnSystem.damageEnemy(data.targetId, data.damage);
      
      console.log(`[GunnerModeIntegration] Hit ${data.targetId} for ${data.damage} damage.${killed ? ' KILLED!' : ''}`);
      
      // Visual feedback could go here (explosion, flash, etc.)
    }
  }

  /**
   * Handle enemy killed event.
   * @param {object} data
   */
  _handleEnemyKilled(data) {
    // Clear target lock if current target was killed
    if (this._targetLock && this._targetLock.id === data.enemyId) {
      this._targetLock = null;
    }

    console.log(`[GunnerModeIntegration] Enemy ${data.enemyId} destroyed!`);
    
    // Could trigger explosion effect, score update, etc.
  }

  /**
   * Handle enemy fire event.
   * @param {object} data
   */
  _handleEnemyFire(data) {
    // Enemy fires at player
    const direction = new this._THREE.Vector3(
      this._playerPosition.x - data.position.x,
      this._playerPosition.y - data.position.y,
      this._playerPosition.z - data.position.z
    ).normalize();

    this._projectileSystem.fireProjectile({
      type: 'LASER',
      origin: new this._THREE.Vector3(data.position.x, data.position.y, data.position.z),
      direction: direction,
      damage: data.damage,
      shooterId: data.enemyId,
      weaponType: data.weaponType,
      targetId: 'player',
    });

    console.log(`[GunnerModeIntegration] Enemy ${data.enemyId} fired at player.`);
  }

  /**
   * Update auto-targeting (select nearest enemy in view).
   */
  _updateAutoTarget() {
    const enemies = this._enemySpawnSystem.getActiveEnemies();
    if (enemies.length === 0) {
      this._targetLock = null;
      return;
    }

    // Find nearest enemy in front of camera
    const cameraDir = new this._THREE.Vector3(0, 0, -1);
    cameraDir.applyQuaternion(this._camera.quaternion);

    let nearest = null;
    let nearestDist = Infinity;

    for (const enemy of enemies) {
      const enemyPos = new this._THREE.Vector3(
        enemy.position.x,
        enemy.position.y,
        enemy.position.z
      );
      
      const toEnemy = enemyPos.clone().sub(this._camera.position);
      const dist = toEnemy.length();
      const angle = cameraDir.angleTo(toEnemy.normalize());

      // Only consider enemies within 45-degree cone in front
      if (angle < Math.PI / 4 && dist < nearestDist && dist < 300) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    if (nearest) {
      this._targetLock = {
        id: nearest.id,
        name: nearest.name,
        distance: nearestDist,
        health: (nearest.health / nearest.maxHealth) * 100,
      };
    } else {
      this._targetLock = null;
    }
  }

  /**
   * Update HUD with current status.
   */
  _updateHUD() {
    // Weapon status
    this._hud.updateWeaponStatus({
      ammo: this._railgun.ammo,
      maxAmmo: this._railgun.maxAmmo,
      weaponType: 'RAILGUN',
      charge: this._railgun.chargeLevel,
      heat: 0,
      ready: this._railgun.isReady,
    });

    // Target lock
    if (this._targetLock) {
      this._hud.updateTargetLock({
        locked: true,
        targetName: this._targetLock.name,
        distance: this._targetLock.distance,
        health: this._targetLock.health,
      });
    } else {
      this._hud.updateTargetLock({ locked: false });
    }

    // Shield/hull (placeholder values)
    this._hud.updateShields({
      shield: 85,
      maxShield: 100,
      hull: 100,
      maxHull: 100,
    });
  }

  /**
   * Register all active enemies as projectile targets.
   */
  _updateProjectileTargets() {
    const enemies = this._enemySpawnSystem.getActiveEnemies();
    
    for (const enemy of enemies) {
      this._projectileSystem.registerTarget(enemy.id, {
        position: new this._THREE.Vector3(
          enemy.position.x,
          enemy.position.y,
          enemy.position.z
        ),
        radius: enemy.scale * 2,  // Collision radius
        armorType: enemy.armorType,
      });
    }
  }
}
