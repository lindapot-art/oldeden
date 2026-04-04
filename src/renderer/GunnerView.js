/**
 * GunnerView — first-person gun-turret controller for Old Eden.
 *
 * Implements a "Death Star gunner booth" style first-person view:
 *   - Camera positioned at the turret mount point on the ship
 *   - Mouse look (yaw + pitch) within clamped angles
 *   - Visible cockpit frame: glass canopy shield, gun barrels, instrument panels
 *   - HUD crosshair, weapon status, and shield readouts
 *   - Railgun weapon with giant nail ammo and recoil
 *   - Swivel chair cabin interior
 *   - Holographic targeting displays
 *
 * The cockpit interior geometry is added to the camera so it moves with the
 * player's head. Exterior space (stars, planets, enemies) is visible through
 * the transparent canopy.
 *
 * Usage:
 *   const gunner = new GunnerView(THREE, camera, canvas, railgunWeapon);
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
   * @param {object} railgunWeapon  RailgunWeapon instance.
   * @param {object} [options]
   * @param {number} [options.sensitivity=0.002]    Mouse look sensitivity.
   * @param {number} [options.maxPitch=1.2]         Max pitch (radians, ~69°).
   * @param {number} [options.maxYaw=1.5]           Max yaw (radians, ~86°).
   * @param {number} [options.fov=75]               FOV when in gunner mode.
   * @param {number} [options.gyroSensitivity=0.015] Gyroscope sensitivity.
   * @param {number} [options.gyroDeadZone=0.02]    Gyro dead zone (radians).
   * @param {boolean} [options.autoEnableGyro=true] Auto-enable gyro on mobile.
   */
  constructor(THREE, camera, canvas, railgunWeapon, options = {}) {
    this._THREE  = THREE;
    this._camera = camera;
    this._canvas = canvas;
    this._railgun = railgunWeapon;

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

    // ── Gyroscope controls (mobile) ─────────────────────────────────────
    this._gyroSensitivity = options.gyroSensitivity ?? 0.015;
    this._gyroDeadZone = options.gyroDeadZone ?? 0.02;
    this._autoEnableGyro = options.autoEnableGyro ?? true;
    
    this._gyroEnabled = false;
    this._gyroPermissionGranted = false;
    this._gyroSupported = this._detectGyroSupport();
    this._isMobile = this._detectMobile();
    this._gyroCalibrating = false;
    
    // Gyro calibration baseline (set when calibrating)
    this._gyroBaseline = {
      alpha: 0,  // yaw (compass direction)
      beta: 0,   // pitch (front-back tilt)
      gamma: 0,  // roll (left-right tilt)
    };

    // Bound event handlers
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onPointerLockChange = this._handlePointerLockChange.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onDeviceOrientation = this._handleDeviceOrientation.bind(this);
    this._onTouchStart = this._handleTouchStart.bind(this);
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
   * Whether gyroscope controls are currently enabled.
   * @returns {boolean}
   */
  get isGyroEnabled() {
    return this._gyroEnabled;
  }

  /**
   * Whether gyroscope is supported on this device.
   * @returns {boolean}
   */
  get isGyroSupported() {
    return this._gyroSupported;
  }

  /**
   * Whether device is detected as mobile.
   * @returns {boolean}
   */
  get isMobile() {
    return this._isMobile;
  }

  /**
   * Whether gyroscope is currently calibrating.
   * @returns {boolean}
   */
  get isGyroCalibrating() {
    return this._gyroCalibrating;
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

    // Setup input controls based on device type
    if (this._isMobile && this._autoEnableGyro && this._gyroSupported) {
      // Try to enable gyro on mobile
      this.requestGyroPermission().catch(err => {
        console.warn('[GunnerView] Gyro permission denied, falling back to touch:', err);
      });
      // Add touch support for calibration and firing
      this._canvas.addEventListener('touchstart', this._onTouchStart);
    } else {
      // Desktop: use pointer lock
      this._canvas.addEventListener('mousemove', this._onMouseMove);
      document.addEventListener('pointerlockchange', this._onPointerLockChange);
      this._canvas.requestPointerLock?.();
    }
    
    // Mouse down for firing (both mobile and desktop)
    this._canvas.addEventListener('mousedown', this._onMouseDown);

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

    // Disable gyro if enabled
    if (this._gyroEnabled) {
      this.disableGyro();
    }

    // Release pointer lock and remove event listeners
    this._canvas.removeEventListener('mousemove', this._onMouseMove);
    this._canvas.removeEventListener('mousedown', this._onMouseDown);
    this._canvas.removeEventListener('touchstart', this._onTouchStart);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.exitPointerLock?.();

    this._savedState = null;
    console.log('[GunnerView] Exited gunner mode.');
  }

  /**
   * Per-frame update. Call inside the animation loop.
   * @param {number} deltaMs  Milliseconds since last frame.
   */
  update(deltaMs) {
    if (!this._active || !this._turretMount) return;

    // Update railgun
    if (this._railgun) {
      this._railgun.update(deltaMs);
    }

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

  // ── Gyroscope Controls API ──────────────────────────────────────────────────

  /**
   * Request permission to use device orientation (required on iOS and modern Android).
   * Must be called from a user interaction (e.g., button click).
   * @returns {Promise<boolean>} True if permission granted.
   */
  async requestGyroPermission() {
    if (!this._gyroSupported) {
      console.warn('[GunnerView] Gyroscope not supported on this device.');
      return false;
    }

    // Check if permission API exists (iOS 13+, modern Android)
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        this._gyroPermissionGranted = (permission === 'granted');
        
        if (this._gyroPermissionGranted) {
          this.enableGyro();
          console.log('[GunnerView] Gyroscope permission granted.');
        } else {
          console.warn('[GunnerView] Gyroscope permission denied.');
        }
        
        return this._gyroPermissionGranted;
      } catch (error) {
        console.error('[GunnerView] Error requesting gyroscope permission:', error);
        return false;
      }
    } else {
      // Older browsers or Android without permission API - assume granted
      this._gyroPermissionGranted = true;
      this.enableGyro();
      console.log('[GunnerView] Gyroscope enabled (no permission required).');
      return true;
    }
  }

  /**
   * Enable gyroscope controls.
   */
  enableGyro() {
    if (!this._gyroSupported) {
      console.warn('[GunnerView] Cannot enable gyro: not supported.');
      return;
    }
    
    if (!this._gyroPermissionGranted) {
      console.warn('[GunnerView] Cannot enable gyro: permission not granted.');
      return;
    }

    if (this._gyroEnabled) return;

    this._gyroEnabled = true;
    window.addEventListener('deviceorientation', this._onDeviceOrientation);
    
    // Calibrate immediately
    this.calibrateGyro();
    
    console.log('[GunnerView] Gyroscope controls enabled.');
  }

  /**
   * Disable gyroscope controls.
   */
  disableGyro() {
    if (!this._gyroEnabled) return;

    this._gyroEnabled = false;
    window.removeEventListener('deviceorientation', this._onDeviceOrientation);
    
    console.log('[GunnerView] Gyroscope controls disabled.');
  }

  /**
   * Calibrate gyroscope to current device orientation.
   * This sets the current orientation as the "center" position.
   */
  calibrateGyro() {
    // The next deviceorientation event will set the baseline
    this._gyroCalibrating = true;
    console.log('[GunnerView] Calibrating gyroscope...');
  }

  // ── Private — Cockpit Geometry ──────────────────────────────────────────────

  /**
   * Build the cockpit interior group.
   * This is attached to the camera so it moves with the player's view.
   *
   * Contains:
   *   - Glass canopy shield (transparent sphere segment in front)
   *   - Swivel chair/seat structure
   *   - Railgun weapon mount
   *   - Instrument frame / mounting bracket
   *   - Side panel outlines with holographic readouts
   *   - Bottom console with digital displays
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

    // ── Swivel Chair / Seat ────────────────────────────────────────────
    const seatMat = new THREE.MeshBasicMaterial({
      color: 0x2a3540, transparent: true, opacity: 0.7,
    });
    
    // Seat back (visible at edges when looking around)
    const seatBackGeo = new THREE.BoxGeometry(0.8, 0.6, 0.08);
    const seatBack = new THREE.Mesh(seatBackGeo, seatMat);
    seatBack.position.set(0, -0.1, 0.4);
    seatBack.name = 'seat-back';
    cockpit.add(seatBack);

    // Seat base
    const seatBaseGeo = new THREE.BoxGeometry(0.6, 0.08, 0.5);
    const seatBase = new THREE.Mesh(seatBaseGeo, seatMat);
    seatBase.position.set(0, -0.5, 0.1);
    cockpit.add(seatBase);

    // Armrests (visible at sides)
    const armrestGeo = new THREE.BoxGeometry(0.1, 0.08, 0.4);
    const armrestL = new THREE.Mesh(armrestGeo, seatMat);
    armrestL.position.set(-0.35, -0.35, 0.0);
    cockpit.add(armrestL);
    
    const armrestR = new THREE.Mesh(armrestGeo, seatMat);
    armrestR.position.set(0.35, -0.35, 0.0);
    cockpit.add(armrestR);

    // Chair pivot cylinder (connects seat to floor)
    const pivotGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8);
    const pivot = new THREE.Mesh(pivotGeo, frameMat);
    pivot.position.set(0, -0.75, 0.1);
    cockpit.add(pivot);

    // ── Railgun weapon (if provided) ───────────────────────────────────
    if (this._railgun) {
      cockpit.add(this._railgun.group);
    }

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

    // Holographic readout screens (side panels)
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
    });
    const holoGeo = new THREE.PlaneGeometry(0.3, 0.4);
    const holoL = new THREE.Mesh(holoGeo, holoMat);
    holoL.position.set(-1.25, 0.2, -0.8);
    holoL.rotation.y = 0.3;
    cockpit.add(holoL);
    
    const holoR = new THREE.Mesh(holoGeo, holoMat);
    holoR.position.set(1.25, 0.2, -0.8);
    holoR.rotation.y = -0.3;
    cockpit.add(holoR);

    // ── Bottom console (below gun barrels) ────────────────────────────
    const consoleMat = new THREE.MeshBasicMaterial({
      color: 0x0a1520, transparent: true, opacity: 0.7,
    });
    const consoleGeo = new THREE.BoxGeometry(1.6, 0.06, 1.0);
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(0, -0.75, -1.2);
    consoleMesh.rotation.x = -0.2;
    cockpit.add(consoleMesh);

    // Console indicator dots (status lights)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
    const dotGeo = new THREE.CircleGeometry(0.015, 8);
    for (let i = 0; i < 8; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat.clone());
      dot.material.color.setHex([0x44ff88, 0xff4444, 0x44aaff, 0xffaa00][i % 4]);
      dot.position.set(-0.5 + i * 0.14, -0.71, -1.0);
      dot.rotation.x = -0.2;
      cockpit.add(dot);
    }

    // Digital text displays (holographic numbers)
    const textMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00, transparent: true, opacity: 0.8,
    });
    const textGeo = new THREE.PlaneGeometry(0.2, 0.08);
    for (let i = 0; i < 3; i++) {
      const display = new THREE.Mesh(textGeo, textMat.clone());
      display.position.set(-0.4 + i * 0.4, -0.68, -0.95);
      display.rotation.x = -0.2;
      cockpit.add(display);
    }

    // ── Upper ceiling detail ───────────────────────────────────────────
    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0x1a2530, transparent: true, opacity: 0.5,
    });
    const ceilingGeo = new THREE.BoxGeometry(1.8, 0.04, 1.5);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.set(0, 0.9, -0.5);
    cockpit.add(ceiling);

    // Overhead status lights
    for (let i = 0; i < 4; i++) {
      const lightGeo = new THREE.CircleGeometry(0.02, 8);
      const lightMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff4444 : 0x44ff44,
        transparent: true,
        opacity: 0.7,
      });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(-0.6 + i * 0.4, 0.88, -0.4);
      light.rotation.x = -Math.PI / 2;
      cockpit.add(light);
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

  /** @param {MouseEvent} e */
  _handleMouseDown(e) {
    if (!this._active) return;
    if (e.button !== 0) return;  // Left mouse button only

    // Fire railgun
    if (this._railgun && this._railgun.isReady) {
      this._railgun.fire();
      
      // Emit event with firing direction (camera forward)
      const direction = new this._THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(this._camera.quaternion);
      
      // Custom event for projectile spawning
      const event = new CustomEvent('gunner:fire', {
        detail: {
          origin: this._camera.position.clone(),
          direction: direction,
          weaponType: 'railgun',
        },
      });
      this._canvas.dispatchEvent(event);
    }
  }

  _handlePointerLockChange() {
    if (!document.pointerLockElement && this._active) {
      // Pointer lock was released externally — remain in gunner mode
      // but stop tracking mouse until re-locked.
    }
  }

  /** @param {DeviceOrientationEvent} e */
  _handleDeviceOrientation(e) {
    if (!this._active || !this._gyroEnabled) return;

    // Extract orientation values (in degrees)
    const alpha = e.alpha ?? 0;  // Z-axis rotation (compass, 0-360)
    const beta = e.beta ?? 0;    // X-axis rotation (pitch, -180 to 180)
    const gamma = e.gamma ?? 0;  // Y-axis rotation (roll, -90 to 90)

    // Handle calibration
    if (this._gyroCalibrating) {
      this._gyroBaseline = { alpha, beta, gamma };
      this._gyroCalibrating = false;
      console.log('[GunnerView] Gyro calibrated:', this._gyroBaseline);
      return;
    }

    // Convert to radians and apply baseline offset
    const alphaRad = ((alpha - this._gyroBaseline.alpha) * Math.PI) / 180;
    const betaRad = ((beta - this._gyroBaseline.beta) * Math.PI) / 180;
    const gammaRad = ((gamma - this._gyroBaseline.gamma) * Math.PI) / 180;

    // Map device orientation to yaw/pitch
    // Portrait mode: use gamma for yaw, beta for pitch
    // Landscape mode: use different mapping (could be enhanced later)
    
    // For portrait mode (most common):
    let yaw = -gammaRad * this._gyroSensitivity;
    let pitch = betaRad * this._gyroSensitivity;

    // Apply dead zone to reduce jitter
    if (Math.abs(yaw) < this._gyroDeadZone) yaw = 0;
    if (Math.abs(pitch) < this._gyroDeadZone) pitch = 0;

    // Update yaw and pitch (replace current values, not accumulate)
    this._yaw = yaw;
    this._pitch = pitch;

    // Clamp to limits
    this._yaw = Math.max(-this._maxYaw, Math.min(this._maxYaw, this._yaw));
    this._pitch = Math.max(-this._maxPitch, Math.min(this._maxPitch, this._pitch));
  }

  /** @param {TouchEvent} e */
  _handleTouchStart(e) {
    if (!this._active) return;

    // Single tap to calibrate gyro
    if (e.touches.length === 1 && this._gyroEnabled) {
      this.calibrateGyro();
    }

    // Double tap or two-finger tap to fire
    if (e.touches.length === 2 || e.detail === 2) {
      // Fire railgun
      if (this._railgun && this._railgun.isReady) {
        this._railgun.fire();
        
        // Emit event with firing direction
        const direction = new this._THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this._camera.quaternion);
        
        const event = new CustomEvent('gunner:fire', {
          detail: {
            origin: this._camera.position.clone(),
            direction: direction,
            weaponType: 'railgun',
          },
        });
        this._canvas.dispatchEvent(event);
      }
    }
  }

  // ── Private — Detection Helpers ─────────────────────────────────────────────

  /**
   * Detect if device supports gyroscope.
   * @returns {boolean}
   */
  _detectGyroSupport() {
    return typeof DeviceOrientationEvent !== 'undefined';
  }

  /**
   * Detect if device is mobile.
   * @returns {boolean}
   */
  _detectMobile() {
    // Check user agent and touch support
    const userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || 
                      (typeof navigator !== 'undefined' ? navigator.vendor : '') || 
                      (typeof window !== 'undefined' ? window.opera : '') || '';
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    const hasTouchScreen = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || 
                          (typeof window !== 'undefined' && 'ontouchstart' in window);
    
    return isMobileUA || hasTouchScreen;
  }
}
