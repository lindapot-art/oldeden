/**
 * BossRenderer — renders boss enemy ships with advanced visuals and effects.
 *
 * Creates large, imposing procedural boss ships with:
 *   - Type-specific designs (destroyer, carrier, dreadnought, mothership)
 *   - Dynamic shield effects
 *   - Phase-based visual changes
 *   - Engine glow and particle effects
 *   - Health-based damage indicators
 *   - Special ability visual effects
 *
 * Usage:
 *   const bossRenderer = new BossRenderer(THREE, scene, bossSystem);
 *   
 *   // Update each frame
 *   bossRenderer.update(deltaMs);
 *   
 *   // Boss visuals auto-sync with BossSystem
 */

export class BossRenderer {
  /**
   * @param {object} THREE         Three.js namespace.
   * @param {THREE.Scene} scene    The 3D scene.
   * @param {object} bossSystem    BossSystem instance.
   */
  constructor(THREE, scene, bossSystem) {
    this._THREE = THREE;
    this._scene = scene;
    this._bossSystem = bossSystem;

    /** Map<bossId, {group, parts, effects}> */
    this._renderObjects = new Map();

    /** Track pending timers so we can cancel on dispose */
    this._pendingTimers = new Set();

    /** Animation state */
    this._time = 0;

    // Listen to boss events
    if (bossSystem.events) {
      bossSystem.events.on('boss:spawned', (data) => this._onBossSpawned(data));
      bossSystem.events.on('boss:killed', (data) => this._onBossKilled(data));
      bossSystem.events.on('boss:phase_change', (data) => this._onPhaseChange(data));
      bossSystem.events.on('boss:ability', (data) => this._onAbility(data));
      bossSystem.events.on('boss:damaged', (data) => this._onDamaged(data));
    }
  }

  /**
   * Update all boss visuals.
   * 
   * @param {number} deltaMs
   */
  update(deltaMs) {
    this._time += deltaMs;

    for (const boss of this._bossSystem.getActiveBosses()) {
      const renderObj = this._renderObjects.get(boss.id);
      if (!renderObj) continue;

      // Update position
      renderObj.group.position.set(boss.position.x, boss.position.y, boss.position.z);
      renderObj.group.rotation.y = boss.rotation.y;

      // Update effects
      this._updateEffects(boss, renderObj, deltaMs);
    }
  }

  /**
   * Handle boss spawn event.
   * 
   * @param {object} data
   */
  _onBossSpawned(data) {
    const boss = this._bossSystem.getBoss(data.bossId);
    if (!boss) return;

    // Create boss mesh
    const group = new this._THREE.Group();
    const parts = this._createBossMesh(boss);
    const effects = this._createBossEffects(boss);

    // Add parts to group
    for (const part of parts) {
      group.add(part);
    }
    for (const effect of effects) {
      group.add(effect);
    }

    // Position in scene
    group.position.set(boss.position.x, boss.position.y, boss.position.z);
    this._scene.add(group);

    // Store for updates
    this._renderObjects.set(data.bossId, { group, parts, effects });

    console.log(`[BossRenderer] Created visuals for ${boss.name}`);
  }

  /**
   * Handle boss death event.
   * 
   * @param {object} data
   */
  _onBossKilled(data) {
    const renderObj = this._renderObjects.get(data.bossId);
    if (!renderObj) return;

    // Play death animation/explosion
    this._playDeathEffect(renderObj.group, data.position);

    // Remove and dispose after delay
    const timer = setTimeout(() => {
      this._pendingTimers.delete(timer);
      this._scene.remove(renderObj.group);
      this._disposeGroup(renderObj.group);
      this._renderObjects.delete(data.bossId);
    }, 3000);
    this._pendingTimers.add(timer);
  }

  /**
   * Handle phase change event.
   * 
   * @param {object} data
   */
  _onPhaseChange(data) {
    const renderObj = this._renderObjects.get(data.bossId);
    if (!renderObj) return;

    // Flash effect for phase change
    const flash = new this._THREE.Mesh(
      new this._THREE.SphereGeometry(2, 8, 8),
      new this._THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
    );
    renderObj.group.add(flash);

    const timer = setTimeout(() => {
      this._pendingTimers.delete(timer);
      renderObj.group.remove(flash);
      flash.geometry.dispose();
      flash.material.dispose();
    }, 300);
    this._pendingTimers.add(timer);
  }

  /**
   * Handle ability activation.
   * 
   * @param {object} data
   */
  _onAbility(data) {
    const renderObj = this._renderObjects.get(data.bossId);
    if (!renderObj) return;

    // Visual feedback for ability
    const color = this._getAbilityColor(data.ability);
    const pulse = new this._THREE.Mesh(
      new this._THREE.SphereGeometry(1.5, 8, 8),
      new this._THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
    );
    renderObj.group.add(pulse);

    const timer = setTimeout(() => {
      this._pendingTimers.delete(timer);
      renderObj.group.remove(pulse);
      pulse.geometry.dispose();
      pulse.material.dispose();
    }, 500);
    this._pendingTimers.add(timer);
  }

  /**
   * Handle damage event.
   * 
   * @param {object} data
   */
  _onDamaged(data) {
    const renderObj = this._renderObjects.get(data.bossId);
    if (!renderObj) return;

    // Flash red on damage
    for (const part of renderObj.parts) {
      if (part.material) {
        const originalEmissive = part.material.emissive.clone();
        part.material.emissive.setHex(0xff0000);
        
        setTimeout(() => {
          if (part.material) part.material.emissive.copy(originalEmissive);
        }, 100);
      }
    }
  }

  /**
   * Create boss mesh based on type.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createBossMesh(boss) {
    switch (boss.type) {
      case 'DESTROYER':
        return this._createDestroyerMesh(boss);
      case 'CARRIER':
        return this._createCarrierMesh(boss);
      case 'DREADNOUGHT':
        return this._createDreadnoughtMesh(boss);
      case 'MOTHERSHIP':
        return this._createMothershipMesh(boss);
      default:
        return this._createGenericBossMesh(boss);
    }
  }

  /**
   * Create Destroyer boss mesh — sleek battleship design.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createDestroyerMesh(boss) {
    const parts = [];
    const scale = boss.scale;
    const color = boss.color;

    // Main hull - elongated wedge
    const hullGeom = new this._THREE.BoxGeometry(scale * 0.6, scale * 0.4, scale * 2.0);
    const hullMat = new this._THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      shininess: 60,
    });
    const hull = new this._THREE.Mesh(hullGeom, hullMat);
    parts.push(hull);

    // Bridge tower
    const bridgeGeom = new this._THREE.BoxGeometry(scale * 0.3, scale * 0.6, scale * 0.4);
    const bridge = new this._THREE.Mesh(bridgeGeom, hullMat.clone());
    bridge.position.set(0, scale * 0.3, -scale * 0.5);
    parts.push(bridge);

    // Main railgun turrets (2x)
    for (let i = 0; i < 2; i++) {
      const turretBase = new this._THREE.Mesh(
        new this._THREE.CylinderGeometry(scale * 0.15, scale * 0.15, scale * 0.2, 8),
        hullMat.clone()
      );
      turretBase.position.set(0, scale * 0.25, -scale * 0.3 + i * scale * 0.8);
      parts.push(turretBase);

      // Barrel
      const barrel = new this._THREE.Mesh(
        new this._THREE.CylinderGeometry(scale * 0.05, scale * 0.05, scale * 1.2, 8),
        hullMat.clone()
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, scale * 0.25, -scale * 0.3 + i * scale * 0.8 + scale * 0.6);
      parts.push(barrel);
    }

    // Engine glow
    const engineGeom = new this._THREE.BoxGeometry(scale * 0.4, scale * 0.3, scale * 0.3);
    const engineMat = new this._THREE.MeshPhongMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
    });
    const engine = new this._THREE.Mesh(engineGeom, engineMat);
    engine.position.set(0, 0, -scale);
    parts.push(engine);

    return parts;
  }

  /**
   * Create Carrier boss mesh — massive hangar ship.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createCarrierMesh(boss) {
    const parts = [];
    const scale = boss.scale;
    const color = boss.color;

    const mat = new this._THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.2,
      shininess: 30,
    });

    // Main body - wide flat carrier
    const bodyGeom = new this._THREE.BoxGeometry(scale * 1.5, scale * 0.4, scale * 2.5);
    const body = new this._THREE.Mesh(bodyGeom, mat);
    parts.push(body);

    // Hangar bays (4x)
    for (let i = 0; i < 4; i++) {
      const bayGeom = new this._THREE.BoxGeometry(scale * 0.3, scale * 0.25, scale * 0.4);
      const bayMat = new this._THREE.MeshPhongMaterial({
        color: 0x000000,
        emissive: 0x4444ff,
        emissiveIntensity: 0.5,
      });
      const bay = new this._THREE.Mesh(bayGeom, bayMat);
      const xPos = (i % 2 === 0 ? 1 : -1) * scale * 0.5;
      const zPos = Math.floor(i / 2) * scale * 0.8 - scale * 0.4;
      bay.position.set(xPos, -scale * 0.1, zPos);
      parts.push(bay);
    }

    // Command tower
    const towerGeom = new this._THREE.BoxGeometry(scale * 0.4, scale * 0.8, scale * 0.5);
    const tower = new this._THREE.Mesh(towerGeom, mat);
    tower.position.set(0, scale * 0.5, -scale * 0.8);
    parts.push(tower);

    // Engines (6x)
    for (let i = 0; i < 6; i++) {
      const engineMat = new this._THREE.MeshPhongMaterial({
        color: 0x0088ff,
        emissive: 0x0088ff,
        emissiveIntensity: 0.8,
      });
      const engine = new this._THREE.Mesh(
        new this._THREE.CylinderGeometry(scale * 0.12, scale * 0.12, scale * 0.4, 8),
        engineMat
      );
      engine.rotation.z = Math.PI / 2;
      const xPos = (i % 3 - 1) * scale * 0.4;
      const yPos = (Math.floor(i / 3) === 0 ? 1 : -1) * scale * 0.15;
      engine.position.set(xPos, yPos, -scale * 1.2);
      parts.push(engine);
    }

    return parts;
  }

  /**
   * Create Dreadnought boss mesh — heavily armored fortress.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createDreadnoughtMesh(boss) {
    const parts = [];
    const scale = boss.scale;
    const color = boss.color;

    const mat = new this._THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      shininess: 80,
      metalness: 0.8,
    });

    // Core fortress - cubic design
    const coreGeom = new this._THREE.BoxGeometry(scale * 1.2, scale * 1.2, scale * 1.8);
    const core = new this._THREE.Mesh(coreGeom, mat);
    parts.push(core);

    // Armor plates (8x)
    for (let i = 0; i < 8; i++) {
      const plateGeom = new this._THREE.BoxGeometry(scale * 0.4, scale * 0.8, scale * 0.15);
      const plate = new this._THREE.Mesh(plateGeom, mat.clone());
      const angle = (i / 8) * Math.PI * 2;
      const radius = scale * 0.7;
      plate.position.set(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      plate.rotation.y = -angle;
      parts.push(plate);
    }

    // Heavy weapons (4x turrets)
    for (let i = 0; i < 4; i++) {
      const turretGeom = new this._THREE.SphereGeometry(scale * 0.2, 8, 8);
      const turret = new this._THREE.Mesh(turretGeom, mat.clone());
      const angle = (i / 4) * Math.PI * 2;
      const radius = scale * 0.6;
      turret.position.set(
        Math.cos(angle) * radius,
        scale * 0.4,
        Math.sin(angle) * radius
      );
      parts.push(turret);

      // Barrel
      const barrelGeom = new this._THREE.CylinderGeometry(scale * 0.08, scale * 0.08, scale * 1.0, 8);
      const barrel = new this._THREE.Mesh(barrelGeom, mat.clone());
      barrel.rotation.x = Math.PI / 2;
      barrel.position.copy(turret.position);
      barrel.position.y += scale * 0.2;
      parts.push(barrel);
    }

    // Massive engines (4x)
    for (let i = 0; i < 4; i++) {
      const engineMat = new this._THREE.MeshPhongMaterial({
        color: 0xffaa00,
        emissive: 0xffaa00,
        emissiveIntensity: 0.9,
      });
      const engine = new this._THREE.Mesh(
        new this._THREE.CylinderGeometry(scale * 0.2, scale * 0.25, scale * 0.6, 8),
        engineMat
      );
      const xPos = (i % 2 === 0 ? 1 : -1) * scale * 0.4;
      const yPos = (Math.floor(i / 2) === 0 ? 1 : -1) * scale * 0.3;
      engine.position.set(xPos, yPos, -scale * 1.0);
      engine.rotation.x = Math.PI / 2;
      parts.push(engine);
    }

    return parts;
  }

  /**
   * Create Mothership boss mesh — ultimate titan design.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createMothershipMesh(boss) {
    const parts = [];
    const scale = boss.scale;
    const color = boss.color;

    const mat = new this._THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      shininess: 100,
    });

    // Central sphere core
    const coreGeom = new this._THREE.SphereGeometry(scale * 0.8, 16, 16);
    const core = new this._THREE.Mesh(coreGeom, mat);
    parts.push(core);

    // Ring structure (3 rings)
    for (let ring = 0; ring < 3; ring++) {
      const ringGeom = new this._THREE.TorusGeometry(
        scale * (1.0 + ring * 0.4),
        scale * 0.15,
        16,
        32
      );
      const ringMesh = new this._THREE.Mesh(ringGeom, mat.clone());
      ringMesh.rotation.x = Math.PI / 2 + ring * 0.3;
      parts.push(ringMesh);
    }

    // Weapon pods (12x around sphere)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const podGeom = new this._THREE.BoxGeometry(scale * 0.3, scale * 0.3, scale * 0.6);
      const pod = new this._THREE.Mesh(podGeom, mat.clone());
      
      pod.position.set(
        Math.cos(angle) * scale * 1.2,
        Math.sin(angle * 0.5) * scale * 0.5,
        Math.sin(angle) * scale * 1.2
      );
      pod.lookAt(0, 0, 0);
      parts.push(pod);
    }

    // Command spire
    const spireGeom = new this._THREE.ConeGeometry(scale * 0.4, scale * 2.0, 8);
    const spire = new this._THREE.Mesh(spireGeom, mat);
    spire.position.set(0, scale * 1.5, 0);
    parts.push(spire);

    // Engine clusters (8x)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const engineMat = new this._THREE.MeshPhongMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 1.0,
      });
      const engine = new this._THREE.Mesh(
        new this._THREE.SphereGeometry(scale * 0.25, 8, 8),
        engineMat
      );
      engine.position.set(
        Math.cos(angle) * scale * 1.5,
        0,
        Math.sin(angle) * scale * 1.5 - scale * 0.5
      );
      parts.push(engine);
    }

    return parts;
  }

  /**
   * Create generic boss mesh as fallback.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createGenericBossMesh(boss) {
    const parts = [];
    const scale = boss.scale;
    const color = boss.color;

    const geom = new this._THREE.SphereGeometry(scale * 0.5, 16, 16);
    const mat = new this._THREE.MeshPhongMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const mesh = new this._THREE.Mesh(geom, mat);
    parts.push(mesh);

    return parts;
  }

  /**
   * Create visual effects for boss.
   * 
   * @param {object} boss
   * @returns {THREE.Object3D[]}
   */
  _createBossEffects(boss) {
    const effects = [];

    // Shield sphere (visible when active)
    const shieldGeom = new this._THREE.SphereGeometry(boss.scale * 1.2, 32, 32);
    const shieldMat = new this._THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
      emissive: 0x00ffff,
      emissiveIntensity: 0.3,
      side: this._THREE.DoubleSide,
    });
    const shield = new this._THREE.Mesh(shieldGeom, shieldMat);
    shield.visible = false;
    shield.name = 'shield';
    effects.push(shield);

    // Point light for glow
    const light = new this._THREE.PointLight(boss.color, 10, boss.scale * 3);
    light.position.set(0, 0, 0);
    effects.push(light);

    return effects;
  }

  /**
   * Update visual effects based on boss state.
   * 
   * @param {object} boss
   * @param {object} renderObj
   * @param {number} deltaMs
   */
  _updateEffects(boss, renderObj, deltaMs) {
    // Shield visibility based on shield health
    const shield = renderObj.effects.find(e => e.name === 'shield');
    if (shield) {
      shield.visible = boss.shield > 0;
      if (shield.visible) {
        shield.material.opacity = 0.05 + (boss.shield / boss.maxShield) * 0.2;
        shield.rotation.y += deltaMs * 0.0005;
      }
    }

    // Damage-based emissive intensity
    const healthPercent = boss.health / boss.maxHealth;
    for (const part of renderObj.parts) {
      if (part.material && part.material.emissive) {
        const baseIntensity = 0.2;
        const damageIntensity = (1 - healthPercent) * 0.5;
        part.material.emissiveIntensity = baseIntensity + damageIntensity;
      }
    }

    // Rotation animations
    renderObj.group.rotation.x = Math.sin(this._time * 0.0002) * 0.05;
  }

  /**
   * Play death explosion effect.
   * 
   * @param {THREE.Group} group
   * @param {object} position
   */
  _playDeathEffect(group, position) {
    // Explosion flash — use emissive mesh instead of PointLight
    const flashGeo = new this._THREE.SphereGeometry(5, 8, 8);
    const flashMat = new this._THREE.MeshBasicMaterial({
      color: 0xffaa00, transparent: true, opacity: 1.0,
    });
    const flash = new this._THREE.Mesh(flashGeo, flashMat);
    flash.position.set(position.x, position.y, position.z);
    this._scene.add(flash);

    // Fade out
    let opacity = 1.0;
    const fadeInterval = setInterval(() => {
      opacity -= 0.05;
      flashMat.opacity = opacity;
      flash.scale.setScalar(1 + (1.0 - opacity) * 3);
      if (opacity <= 0) {
        this._scene.remove(flash);
        flashGeo.dispose();
        flashMat.dispose();
        clearInterval(fadeInterval);
        this._pendingTimers.delete(fadeInterval);
      }
    }, 50);
    this._pendingTimers.add(fadeInterval);

    // Make boss parts fly apart
    const velocities = [];
    const children = [...group.children].filter(c => c.isMesh);
    for (const child of children) {
      velocities.push(new this._THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ));
    }
    const animInterval = setInterval(() => {
      for (let i = 0; i < children.length; i++) {
        children[i].position.add(velocities[i]);
        children[i].rotation.x += 0.1;
        children[i].rotation.y += 0.1;
      }
    }, 50);
    this._pendingTimers.add(animInterval);
    const stopTimer = setTimeout(() => {
      clearInterval(animInterval);
      this._pendingTimers.delete(animInterval);
      this._pendingTimers.delete(stopTimer);
    }, 2000);
    this._pendingTimers.add(stopTimer);
  }

  /**
   * Get color for ability visual effect.
   * 
   * @param {string} ability
   * @returns {number}
   */
  _getAbilityColor(ability) {
    const colors = {
      'summon_fighters': 0x00ff00,
      'shield_burst': 0x00ffff,
      'missile_barrage': 0xff0000,
      'laser_sweep': 0xffff00,
      'warp_strike': 0xff00ff,
      'repair_drones': 0x00ff88,
    };
    return colors[ability] || 0xffffff;
  }

  /**
   * Cleanup all boss visuals.
   */
  /**
   * Dispose a group and all its geometries/materials.
   * @param {THREE.Group} group
   */
  _disposeGroup(group) {
    group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  dispose() {
    // Cancel all pending timers
    for (const timer of this._pendingTimers) {
      clearTimeout(timer);
      clearInterval(timer);
    }
    this._pendingTimers.clear();

    for (const renderObj of this._renderObjects.values()) {
      this._scene.remove(renderObj.group);
      this._disposeGroup(renderObj.group);
    }
    this._renderObjects.clear();
  }
}
