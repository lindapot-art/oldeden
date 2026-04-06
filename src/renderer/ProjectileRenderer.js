/**
 * ProjectileRenderer — renders active projectiles in 3D space.
 *
 * Visualizes projectile trails, impacts, and effects:
 *   - Railgun: long glowing trail with nail projectile
 *   - Laser: instant beam with fade
 *   - Ballistic: bullet trail with tracer
 *   - Missile: rocket trail with smoke
 *
 * Usage:
 *   const renderer = new ProjectileRenderer(THREE, scene, projectileSystem);
 *   renderer.update(deltaMs);  // Call in animation loop
 */

export class ProjectileRenderer {
  /**
   * @param {object} THREE            Three.js namespace.
   * @param {THREE.Scene} scene       The 3D scene to add projectiles to.
   * @param {object} projectileSystem Reference to ProjectileSystem.
   */
  constructor(THREE, scene, projectileSystem) {
    this._THREE = THREE;
    this._scene = scene;
    this._projectileSystem = projectileSystem;

    /** Map<projectileId, THREE.Group> - visual representation of each projectile */
    this._projectileMeshes = new Map();

    /** Trail segments for long trails (railgun, missile) */
    this._trailSegments = new Map();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Update projectile visuals. Call every frame.
   * @param {number} deltaMs  Milliseconds since last frame.
   */
  update(deltaMs) {
    const activeProjectiles = this._projectileSystem.getActiveProjectiles();
    const activeIds = new Set(activeProjectiles.map(p => p.id));

    // Remove meshes for expired projectiles
    for (const [id, group] of this._projectileMeshes) {
      if (!activeIds.has(id)) {
        this._scene.remove(group);
        this._disposeMesh(group);
        this._projectileMeshes.delete(id);
        this._trailSegments.delete(id);
      }
    }

    // Update or create meshes for active projectiles
    for (const proj of activeProjectiles) {
      if (!this._projectileMeshes.has(proj.id)) {
        this._createProjectileMesh(proj);
      }
      this._updateProjectileMesh(proj, deltaMs);
    }
  }

  /**
   * Clear all projectile meshes (e.g., on scene reset).
   */
  clearAll() {
    for (const [id, group] of this._projectileMeshes) {
      this._scene.remove(group);
      this._disposeMesh(group);
    }
    this._projectileMeshes.clear();
    this._trailSegments.clear();
  }

  /**
   * Dispose of all resources.
   */
  dispose() {
    this.clearAll();
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Create visual mesh for a projectile.
   * @param {object} proj  Projectile data from ProjectileSystem.
   */
  _createProjectileMesh(proj) {
    const THREE = this._THREE;
    const config = this._projectileSystem.getProjectileConfig(proj.type);
    if (!config) return;

    const group = new THREE.Group();
    group.name = `projectile-${proj.id}`;

    // ── Railgun: Giant nail with long trail ────────────────────────────
    if (proj.type === 'RAILGUN') {
      // Nail body
      const nailGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.4, 8);
      const nailMat = new THREE.MeshBasicMaterial({
        color: 0xaabbcc,
        transparent: true,
        opacity: 0.9,
      });
      const nail = new THREE.Mesh(nailGeo, nailMat);
      nail.rotation.x = Math.PI / 2;
      group.add(nail);

      // Nail tip
      const tipGeo = new THREE.ConeGeometry(0.02, 0.1, 8);
      const tip = new THREE.Mesh(tipGeo, nailMat);
      tip.rotation.x = Math.PI / 2;
      tip.position.z = -0.25;
      group.add(tip);

      // Glow sphere
      const glowGeo = new THREE.SphereGeometry(0.08, 12, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.6,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      // Trail line
      const trailPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, config.trailLength),
      ];
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
      const trailMat = new THREE.LineBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.8,
        linewidth: 2,
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      group.add(trail);

      this._trailSegments.set(proj.id, { trail, points: [] });
    }

    // ── Laser: Fast beam with short trail ──────────────────────────────
    else if (proj.type === 'LASER') {
      const beamGeo = new THREE.CylinderGeometry(0.03, 0.03, config.trailLength, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.9,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.rotation.x = Math.PI / 2;
      beam.position.z = config.trailLength / 2;
      group.add(beam);

      // Glow
      const glowGeo = new THREE.SphereGeometry(0.1, 12, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.5,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);
    }

    // ── Ballistic: Small bullet with short trail ───────────────────────
    else if (proj.type === 'BALLISTIC') {
      const bulletGeo = new THREE.SphereGeometry(0.04, 8, 6);
      const bulletMat = new THREE.MeshBasicMaterial({
        color: 0xffcc44,
        transparent: true,
        opacity: 0.9,
      });
      const bullet = new THREE.Mesh(bulletGeo, bulletMat);
      group.add(bullet);

      // Short trail
      const trailGeo = new THREE.CylinderGeometry(0.01, 0.01, config.trailLength, 6);
      const trailMat = new THREE.MeshBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.6,
      });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.rotation.x = Math.PI / 2;
      trail.position.z = config.trailLength / 2;
      group.add(trail);
    }

    // ── Missile: Rocket with exhaust trail ─────────────────────────────
    else if (proj.type === 'MISSILE') {
      const bodyGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
      const bodyMat = new THREE.MeshBasicMaterial({
        color: 0x888888,
        transparent: true,
        opacity: 0.9,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = Math.PI / 2;
      group.add(body);

      // Nose cone
      const noseGeo = new THREE.ConeGeometry(0.05, 0.15, 8);
      const nose = new THREE.Mesh(noseGeo, bodyMat);
      nose.rotation.x = Math.PI / 2;
      nose.position.z = -0.225;
      group.add(nose);

      // Exhaust glow
      const exhaustGeo = new THREE.SphereGeometry(0.08, 12, 8);
      const exhaustMat = new THREE.MeshBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.7,
      });
      const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
      exhaust.position.z = 0.2;
      group.add(exhaust);

      // Trail
      const trailPoints = [
        new THREE.Vector3(0, 0, 0.2),
        new THREE.Vector3(0, 0, 0.2 + config.trailLength),
      ];
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
      const trailMat = new THREE.LineBasicMaterial({
        color: config.trailColor,
        transparent: true,
        opacity: 0.6,
        linewidth: 2,
      });
      const trail = new THREE.Line(trailGeo, trailMat);
      group.add(trail);
    }

    this._scene.add(group);
    this._projectileMeshes.set(proj.id, group);
  }

  /**
   * Update projectile mesh position and orientation.
   * @param {object} proj  Projectile data.
   * @param {number} deltaMs  Delta time.
   */
  _updateProjectileMesh(proj, deltaMs) {
    const group = this._projectileMeshes.get(proj.id);
    if (!group) return;

    const THREE = this._THREE;

    // Update position
    group.position.copy(proj.position);

    // Orient toward velocity direction
    if (proj.velocity.length() > 0.01) {
      const direction = proj.velocity.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      
      // Create quaternion to face direction
      const targetQuat = new THREE.Quaternion();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(new THREE.Vector3(0, 0, 0), direction, up);
      targetQuat.setFromRotationMatrix(matrix);
      
      group.quaternion.copy(targetQuat);
    }

    // Update trail (for railgun and missiles with dynamic trails)
    const trailData = this._trailSegments.get(proj.id);
    if (trailData) {
      // Add current position to trail history
      trailData.points.push(proj.position.clone());
      
      // Keep only last N points
      const maxPoints = 20;
      if (trailData.points.length > maxPoints) {
        trailData.points.shift();
      }

      // Update trail geometry — reuse pre-allocated buffer
      if (trailData.points.length >= 2) {
        if (!trailData.posBuffer || trailData.posBuffer.length < maxPoints * 3) {
          trailData.posBuffer = new Float32Array(maxPoints * 3);
          trailData.posAttr = new THREE.BufferAttribute(trailData.posBuffer, 3);
          trailData.posAttr.setUsage(THREE.DynamicDrawUsage);
          trailData.trail.geometry.setAttribute('position', trailData.posAttr);
        }
        const buf = trailData.posBuffer;
        for (let i = 0; i < trailData.points.length; i++) {
          buf[i * 3]     = trailData.points[i].x;
          buf[i * 3 + 1] = trailData.points[i].y;
          buf[i * 3 + 2] = trailData.points[i].z;
        }
        trailData.posAttr.needsUpdate = true;
        trailData.trail.geometry.setDrawRange(0, trailData.points.length);
        trailData.trail.geometry.computeBoundingSphere();
      }
    }

    // Fade out older projectiles (optional visual effect)
    const ageRatio = proj.age / 10000;  // Fade after 10 seconds
    if (ageRatio > 0.8) {
      group.traverse((child) => {
        if (child.material && child.material.transparent) {
          child.material.opacity *= 0.98;
        }
      });
    }
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
