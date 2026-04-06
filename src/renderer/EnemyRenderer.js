/**
 * EnemyRenderer — renders enemy ships in 3D space.
 *
 * Creates procedural enemy ship meshes based on enemy type:
 *   - Scout: small, agile fighter
 *   - Fighter: medium-sized combat ship
 *   - Bomber: large, heavily armored
 *   - Interceptor: sleek, fast design
 *
 * Usage:
 *   const renderer = new EnemyRenderer(THREE, scene, enemySpawnSystem);
 *   renderer.update(deltaMs);  // Call in animation loop
 */

export class EnemyRenderer {
  /**
   * @param {object} THREE           Three.js namespace.
   * @param {THREE.Scene} scene      The 3D scene to add enemies to.
   * @param {object} enemySpawnSystem Reference to EnemySpawnSystem.
   */
  constructor(THREE, scene, enemySpawnSystem) {
    this._THREE = THREE;
    this._scene = scene;
    this._enemySpawnSystem = enemySpawnSystem;

    /** Map<enemyId, THREE.Group> - visual representation of each enemy */
    this._enemyMeshes = new Map();

    // Reusable temp objects (avoid per-frame allocation)
    this._tmpDir = new THREE.Vector3();
    this._tmpUp = new THREE.Vector3(0, 1, 0);
    this._tmpQuat = new THREE.Quaternion();
    this._tmpMat4 = new THREE.Matrix4();
    this._tmpOrigin = new THREE.Vector3();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Update enemy visuals. Call every frame.
   * @param {number} deltaMs  Milliseconds since last frame.
   */
  update(deltaMs) {
    const activeEnemies = this._enemySpawnSystem.getActiveEnemies();
    const activeIds = new Set(activeEnemies.map(e => e.id));

    // Remove meshes for dead/removed enemies
    for (const [id, group] of this._enemyMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(group);
        this._disposeMesh(group);
        this._enemyMeshes.delete(id);
      }
    }

    // Update or create meshes for active enemies
    for (const enemy of activeEnemies) {
      if (!this._enemyMeshes.has(enemy.id)) {
        this._createEnemyMesh(enemy);
      }
      this._updateEnemyMesh(enemy, deltaMs);
    }
  }

  /**
   * Clear all enemy meshes (e.g., on scene reset).
   */
  clearAll() {
    for (const [id, group] of this._enemyMeshes) {
      this._scene.remove(group);
      this._disposeMesh(group);
    }
    this._enemyMeshes.clear();
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    this.clearAll();
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Create visual mesh for an enemy ship.
   * @param {object} enemy  Enemy data from EnemySpawnSystem.
   */
  _createEnemyMesh(enemy) {
    const THREE = this._THREE;
    const group = new THREE.Group();
    group.name = `enemy-${enemy.id}`;

    const scale = enemy.scale || 1.0;
    const color = enemy.color || 0xaa4444;

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.7,
      emissive: color,
      emissiveIntensity: 0.2,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x44aaff,
      roughness: 0.3,
      metalness: 0.8,
      emissive: 0x44aaff,
      emissiveIntensity: 0.4,
    });

    // ── Scout: small, angular fighter ──────────────────────────────────
    if (enemy.type === 'SCOUT') {
      // Hull
      const hullGeo = new THREE.BoxGeometry(1.5, 0.6, 3);
      const hull = new THREE.Mesh(hullGeo, mat);
      group.add(hull);

      // Nose
      const noseGeo = new THREE.ConeGeometry(0.75, 1.5, 4);
      const nose = new THREE.Mesh(noseGeo, mat);
      nose.rotation.x = Math.PI / 2;
      nose.position.z = -2.25;
      group.add(nose);

      // Wings
      const wingGeo = new THREE.BoxGeometry(4, 0.1, 1.5);
      const wings = new THREE.Mesh(wingGeo, mat);
      wings.position.z = 0.5;
      group.add(wings);

      // Engines
      const engGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 8);
      const engL = new THREE.Mesh(engGeo, accentMat);
      engL.rotation.x = Math.PI / 2;
      engL.position.set(-0.5, 0, 1.9);
      group.add(engL);
      
      const engR = new THREE.Mesh(engGeo, accentMat);
      engR.rotation.x = Math.PI / 2;
      engR.position.set(0.5, 0, 1.9);
      group.add(engR);
    }

    // ── Fighter: balanced combat ship ───────────────────────────────────
    else if (enemy.type === 'FIGHTER') {
      // Hull
      const hullGeo = new THREE.BoxGeometry(2.5, 1.0, 5);
      const hull = new THREE.Mesh(hullGeo, mat);
      group.add(hull);

      // Nose
      const noseGeo = new THREE.ConeGeometry(1.25, 2.5, 4);
      const nose = new THREE.Mesh(noseGeo, mat);
      nose.rotation.x = Math.PI / 2;
      nose.position.z = -3.75;
      group.add(nose);

      // Wings
      const wingGeo = new THREE.BoxGeometry(6, 0.15, 2.5);
      const wings = new THREE.Mesh(wingGeo, mat);
      wings.position.z = 0.5;
      group.add(wings);

      // Weapon pods
      const podGeo = new THREE.BoxGeometry(0.6, 0.4, 2);
      const podL = new THREE.Mesh(podGeo, accentMat);
      podL.position.set(-3, 0, -0.5);
      group.add(podL);
      
      const podR = new THREE.Mesh(podGeo, accentMat);
      podR.position.set(3, 0, -0.5);
      group.add(podR);

      // Engines
      const engGeo = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 8);
      const engL = new THREE.Mesh(engGeo, accentMat);
      engL.rotation.x = Math.PI / 2;
      engL.position.set(-1, 0, 3.1);
      group.add(engL);
      
      const engR = new THREE.Mesh(engGeo, accentMat);
      engR.rotation.x = Math.PI / 2;
      engR.position.set(1, 0, 3.1);
      group.add(engR);
    }

    // ── Bomber: large, heavily armored ──────────────────────────────────
    else if (enemy.type === 'BOMBER') {
      // Hull
      const hullGeo = new THREE.BoxGeometry(3.5, 1.8, 7);
      const hull = new THREE.Mesh(hullGeo, mat);
      group.add(hull);

      // Nose
      const noseGeo = new THREE.BoxGeometry(3.5, 1.8, 2);
      const nose = new THREE.Mesh(noseGeo, mat);
      nose.position.z = -4.5;
      group.add(nose);

      // Wings (small)
      const wingGeo = new THREE.BoxGeometry(5, 0.2, 3);
      const wings = new THREE.Mesh(wingGeo, mat);
      wings.position.z = 1;
      group.add(wings);

      // Turrets
      const turretGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8);
      const turretT = new THREE.Mesh(turretGeo, accentMat);
      turretT.position.set(0, 1.3, -1);
      group.add(turretT);
      
      const turretB = new THREE.Mesh(turretGeo, accentMat);
      turretB.position.set(0, -1.3, 1);
      turretB.rotation.x = Math.PI;
      group.add(turretB);

      // Engines (large)
      const engGeo = new THREE.CylinderGeometry(0.6, 0.8, 2, 8);
      const engL = new THREE.Mesh(engGeo, accentMat);
      engL.rotation.x = Math.PI / 2;
      engL.position.set(-1.2, 0, 4.5);
      group.add(engL);
      
      const engR = new THREE.Mesh(engGeo, accentMat);
      engR.rotation.x = Math.PI / 2;
      engR.position.set(1.2, 0, 4.5);
      group.add(engR);
    }

    // ── Interceptor: sleek, fast design ─────────────────────────────────
    else if (enemy.type === 'INTERCEPTOR') {
      // Hull (narrow)
      const hullGeo = new THREE.BoxGeometry(1.2, 0.8, 4.5);
      const hull = new THREE.Mesh(hullGeo, mat);
      group.add(hull);

      // Nose (very sharp)
      const noseGeo = new THREE.ConeGeometry(0.6, 2, 6);
      const nose = new THREE.Mesh(noseGeo, mat);
      nose.rotation.x = Math.PI / 2;
      nose.position.z = -3.25;
      group.add(nose);

      // Wings (swept back)
      const wingGeo = new THREE.BoxGeometry(5, 0.1, 2);
      const wingL = new THREE.Mesh(wingGeo, mat);
      wingL.position.set(-2.5, 0, 1);
      wingL.rotation.z = 0.2;
      group.add(wingL);
      
      const wingR = new THREE.Mesh(wingGeo, mat);
      wingR.position.set(2.5, 0, 1);
      wingR.rotation.z = -0.2;
      group.add(wingR);

      // Engines (twin, glowing)
      const engGeo = new THREE.CylinderGeometry(0.25, 0.3, 1, 8);
      const engL = new THREE.Mesh(engGeo, accentMat);
      engL.rotation.x = Math.PI / 2;
      engL.position.set(-0.4, 0, 2.75);
      group.add(engL);
      
      const engR = new THREE.Mesh(engGeo, accentMat);
      engR.rotation.x = Math.PI / 2;
      engR.position.set(0.4, 0, 2.75);
      group.add(engR);

      // Canopy
      const canopyGeo = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const canopyMat = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        metalness: 0.9,
      });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(0, 0.4, -1);
      group.add(canopy);
    }

    // Apply scale
    group.scale.setScalar(scale);

    this._scene.add(group);
    this._enemyMeshes.set(enemy.id, group);
  }

  /**
   * Update enemy mesh position and orientation.
   * @param {object} enemy  Enemy data.
   * @param {number} deltaMs  Delta time.
   */
  _updateEnemyMesh(enemy, deltaMs) {
    const group = this._enemyMeshes.get(enemy.id);
    if (!group) return;

    const THREE = this._THREE;

    // Update position
    group.position.set(enemy.position.x, enemy.position.y, enemy.position.z);

    // Orient toward velocity direction (if moving)
    if (enemy.velocity) {
      const vx = enemy.velocity.x;
      const vy = enemy.velocity.y;
      const vz = enemy.velocity.z;
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      
      if (speed > 0.1) {
        this._tmpDir.set(vx, vy, vz).normalize();
        this._tmpUp.set(0, 1, 0);
        this._tmpOrigin.set(0, 0, 0);
        
        this._tmpMat4.lookAt(this._tmpOrigin, this._tmpDir, this._tmpUp);
        this._tmpQuat.setFromRotationMatrix(this._tmpMat4);
        
        // Smooth rotation
        group.quaternion.slerp(this._tmpQuat, 0.1);
      }
    }

    // Pulse engine glow based on health
    const healthRatio = enemy.health / enemy.maxHealth;
    group.traverse((child) => {
      if (child.material && child.material.emissiveIntensity !== undefined) {
        // Increase glow when damaged
        child.material.emissiveIntensity = 0.2 + (1 - healthRatio) * 0.3;
      }
    });
  }

  /**
   * Dispose of a mesh group.
   * @param {THREE.Group} group
   */
  _disposeMesh(group) {
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
}
