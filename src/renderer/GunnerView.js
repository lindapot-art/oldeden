/**
 * GunnerView — first-person gun-turret controller for Old Eden.
 *
 * Implements a "Death Star gunner booth" style first-person view:
 *   - Camera positioned at the turret mount point on the ship
 *   - Mouse look (yaw + pitch) within clamped angles
 *   - Visible cockpit frame: glass canopy shield, gun barrels, instrument panels
 *   - HUD crosshair, weapon status, and shield readouts
 *
 * The cockpit interior geometry is added to the camera so it moves with the
 * player's head. Exterior space (stars, planets, enemies) is visible through
 * the transparent canopy.
 *
 * Usage:
 *   const gunner = new GunnerView(THREE, camera, canvas);
 *   gunner.attachToShip(shipGroup, turretMount);
 *   gunner.enter();          // switch into gunner mode
 *   gunner.update(deltaMs);  // call in animation loop
 *   gunner.exit();           // switch back to navigation
 */

export class GunnerView {
  /**
   * @param {object} THREE       Three.js namespace.
   * @param {object} camera      The PerspectiveCamera to take over.
   * @param {HTMLCanvasElement} canvas  For pointer-lock events.
   * @param {object} [options]
   * @param {number} [options.sensitivity=0.002]    Mouse look sensitivity.
   * @param {number} [options.maxPitch=1.2]         Max pitch (radians, ~69°).
   * @param {number} [options.maxYaw=1.5]           Max yaw (radians, ~86°).
   * @param {number} [options.fov=75]               FOV when in gunner mode.
   */
  constructor(THREE, camera, canvas, options = {}) {
    this._THREE  = THREE;
    this._camera = camera;
    this._canvas = canvas;

    this._sensitivity = options.sensitivity ?? 0.002;
    this._maxPitch    = options.maxPitch    ?? 1.2;
    this._maxYaw      = options.maxYaw      ?? 1.5;
    this._gunnerFov   = options.fov         ?? 75;

    this._active  = false;
    this._yaw     = 0;
    this._pitch   = 0;

    this._shipGroup   = null;
    this._turretMount = null;

    /** Cockpit interior group (attached to camera) */
    this._cockpit = null;

    /** Saved camera state to restore on exit */
    this._savedState = null;

    // Bound event handlers
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onPointerLockChange = this._handlePointerLockChange.bind(this);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Link the gunner view to a ship.
   * @param {THREE.Group} shipGroup     The ship root group.
   * @param {THREE.Object3D} turretMount  The turret mount-point object.
   */
  attachToShip(shipGroup, turretMount) {
    this._shipGroup   = shipGroup;
    this._turretMount = turretMount;
  }

  /**
   * Whether the gunner view is currently active.
   * @returns {boolean}
   */
  get isActive() {
    return this._active;
  }

  /**
   * Enter gunner (first-person) mode.
   */
  enter() {
    if (this._active) return;
    if (!this._turretMount) {
      console.warn('[GunnerView] No turret mount attached — cannot enter gunner mode.');
      return;
    }

    this._active = true;
    this._yaw = 0;
    this._pitch = 0;

    // Save current camera state
    this._savedState = {
      fov: this._camera.fov,
      position: this._camera.position.clone(),
      rotation: this._camera.rotation.clone(),
      parent: this._camera.parent,
    };

    // Set gunner FOV
    this._camera.fov = this._gunnerFov;
    this._camera.updateProjectionMatrix();

    // Build cockpit geometry (first time only)
    if (!this._cockpit) {
      this._cockpit = this._buildCockpit();
    }
    this._camera.add(this._cockpit);

    // Request pointer lock
    this._canvas.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    this._canvas.requestPointerLock?.();

    console.log('[GunnerView] Entered gunner mode.');
  }

  /**
   * Exit gunner mode and restore previous camera state.
   */
  exit() {
    if (!this._active) return;
    this._active = false;

    // Remove cockpit from camera
    if (this._cockpit) {
      this._camera.remove(this._cockpit);
    }

    // Restore camera
    if (this._savedState) {
      this._camera.fov = this._savedState.fov;
      this._camera.updateProjectionMatrix();
    }

    // Release pointer lock
    this._canvas.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.exitPointerLock?.();

    this._savedState = null;
    console.log('[GunnerView] Exited gunner mode.');
  }

  /**
   * Per-frame update. Call inside the animation loop.
   * @param {number} _deltaMs  Milliseconds since last frame (reserved for future anim).
   */
  update(_deltaMs) {
    if (!this._active || !this._turretMount) return;

    // Position camera at turret mount world position
    const worldPos = new this._THREE.Vector3();
    this._turretMount.getWorldPosition(worldPos);
    this._camera.position.copy(worldPos);

    // Apply yaw/pitch from mouse look
    const euler = new this._THREE.Euler(0, 0, 0, 'YXZ');

    // Get ship's world quaternion for base orientation
    const shipQuat = new this._THREE.Quaternion();
    this._shipGroup.getWorldQuaternion(shipQuat);

    // Combine ship orientation with mouse look
    const lookQuat = new this._THREE.Quaternion();
    euler.set(-this._pitch, -this._yaw, 0, 'YXZ');
    lookQuat.setFromEuler(euler);

    this._camera.quaternion.copy(shipQuat).multiply(lookQuat);
  }

  /**
   * Dispose of all cockpit geometry and listeners.
   */
  dispose() {
    this.exit();
    if (this._cockpit) {
      this._cockpit.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this._cockpit = null;
    }
  }

  // ── Private — Cockpit Geometry ──────────────────────────────────────────────

  /**
   * Build the cockpit interior group.
   * This is attached to the camera so it moves with the player's view.
   *
   * Contains:
   *   - Glass canopy shield (transparent sphere segment in front)
   *   - Gun barrel tips visible at bottom of FOV
   *   - Instrument frame / mounting bracket
   *   - Side panel outlines
   *
   * @returns {THREE.Group}
   */
  _buildCockpit() {
    const THREE = this._THREE;
    const cockpit = new THREE.Group();
    cockpit.name = 'gunner-cockpit';

    // ── Glass canopy (large transparent sphere in front of camera) ────
    const canopyMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.06,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const canopyGeo = new THREE.SphereGeometry(3.0, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.position.set(0, 0, -2.5);
    canopyMesh.rotation.x = Math.PI;
    canopyMesh.name = 'canopy-glass';
    cockpit.add(canopyMesh);

    // Canopy frame rings (visible structural lines)
    const frameMat = new THREE.MeshBasicMaterial({
      color: 0x334466, transparent: true, opacity: 0.5,
    });

    // Vertical frame struts
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const strutGeo = new THREE.CylinderGeometry(0.015, 0.015, 3.5, 4);
      const strut = new THREE.Mesh(strutGeo, frameMat);
      strut.position.set(
        Math.sin(angle) * 2.8,
        Math.cos(angle) * 2.0,
        -3.0
      );
      strut.rotation.x = Math.PI * 0.3;
      strut.rotation.z = angle;
      cockpit.add(strut);
    }

    // ── Gun barrels (visible at bottom of FOV) ────────────────────────
    const gunMat = new THREE.MeshBasicMaterial({
      color: 0x445566, transparent: true, opacity: 0.8,
    });

    // Left barrel
    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6);
    const barrelL = new THREE.Mesh(barrelGeo, gunMat);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.18, -0.55, -2.0);
    barrelL.name = 'cockpit-gun-left';
    cockpit.add(barrelL);

    const barrelR = new THREE.Mesh(barrelGeo, gunMat);
    barrelR.rotation.x = Math.PI / 2;
    barrelR.position.set(0.18, -0.55, -2.0);
    barrelR.name = 'cockpit-gun-right';
    cockpit.add(barrelR);

    // Gun barrel tips (muzzle flash points)
    const muzzleGeo = new THREE.RingGeometry(0.03, 0.06, 8);
    const muzzleMat = new THREE.MeshBasicMaterial({
      color: 0x66aaff, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
    });
    const muzzleL = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzleL.position.set(-0.18, -0.55, -3.3);
    cockpit.add(muzzleL);
    const muzzleR = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzleR.position.set(0.18, -0.55, -3.3);
    cockpit.add(muzzleR);

    // ── Gun mounting bracket ──────────────────────────────────────────
    const bracketGeo = new THREE.BoxGeometry(0.8, 0.08, 0.5);
    const bracket = new THREE.Mesh(bracketGeo, gunMat);
    bracket.position.set(0, -0.6, -0.8);
    cockpit.add(bracket);

    // Vertical support
    const supportGeo = new THREE.BoxGeometry(0.06, 0.4, 0.06);
    const supportL = new THREE.Mesh(supportGeo, gunMat);
    supportL.position.set(-0.35, -0.4, -0.8);
    cockpit.add(supportL);
    const supportR = new THREE.Mesh(supportGeo, gunMat);
    supportR.position.set(0.35, -0.4, -0.8);
    cockpit.add(supportR);

    // ── Side instrument panels (visible at edges of FOV) ──────────────
    const panelMat = new THREE.MeshBasicMaterial({
      color: 0x1a2a3a, transparent: true, opacity: 0.6,
    });

    // Left panel
    const panelGeo = new THREE.BoxGeometry(0.04, 0.8, 1.2);
    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.set(-1.3, -0.2, -1.0);
    panelL.rotation.y = 0.3;
    cockpit.add(panelL);

    // Right panel
    const panelR = new THREE.Mesh(panelGeo, panelMat);
    panelR.position.set(1.3, -0.2, -1.0);
    panelR.rotation.y = -0.3;
    cockpit.add(panelR);

    // Panel glow strips (indicator lights on side panels)
    const stripMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88, transparent: true, opacity: 0.4,
    });
    const stripGeo = new THREE.BoxGeometry(0.01, 0.05, 0.8);
    const stripL = new THREE.Mesh(stripGeo, stripMat);
    stripL.position.set(-1.28, 0.0, -1.0);
    stripL.rotation.y = 0.3;
    cockpit.add(stripL);
    const stripR = new THREE.Mesh(stripGeo, stripMat);
    stripR.position.set(1.28, 0.0, -1.0);
    stripR.rotation.y = -0.3;
    cockpit.add(stripR);

    // ── Bottom console (below gun barrels) ────────────────────────────
    const consoleMat = new THREE.MeshBasicMaterial({
      color: 0x0a1520, transparent: true, opacity: 0.7,
    });
    const consoleGeo = new THREE.BoxGeometry(1.6, 0.06, 1.0);
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(0, -0.75, -1.2);
    consoleMesh.rotation.x = -0.2;
    cockpit.add(consoleMesh);

    // Console indicator dots
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    const dotGeo = new THREE.CircleGeometry(0.015, 8);
    for (let i = 0; i < 8; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat.clone());
      dot.material.color.setHex([0x44ff88, 0xff4444, 0x44aaff, 0xffaa00][i % 4]);
      dot.position.set(-0.5 + i * 0.14, -0.71, -1.0);
      dot.rotation.x = -0.2;
      cockpit.add(dot);
    }

    return cockpit;
  }

  // ── Private — Event Handlers ────────────────────────────────────────────────

  /** @param {MouseEvent} e */
  _handleMouseMove(e) {
    if (!this._active) return;
    if (!document.pointerLockElement) return;

    this._yaw   += e.movementX * this._sensitivity;
    this._pitch  += e.movementY * this._sensitivity;

    // Clamp
    this._yaw   = Math.max(-this._maxYaw, Math.min(this._maxYaw, this._yaw));
    this._pitch  = Math.max(-this._maxPitch, Math.min(this._maxPitch, this._pitch));
  }

  _handlePointerLockChange() {
    if (!document.pointerLockElement && this._active) {
      // Pointer lock was released externally — remain in gunner mode
      // but stop tracking mouse until re-locked.
    }
  }
}
