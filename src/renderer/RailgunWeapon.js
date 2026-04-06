/**
 * RailgunWeapon — visual and mechanical representation of a railgun weapon.
 *
 * Creates a dynamic 3D railgun asset with:
 *   - Long rail/barrel (electromagnetic accelerator)
 *   - Giant nail/spike ammo visible in chamber
 *   - Recoil animation on fire
 *   - Charging glow effect
 *   - Muzzle flash
 *   - Shell ejection
 *
 * The railgun fires high-velocity ferromagnetic spikes (giant nails) that
 * penetrate armor and shields. The weapon recoils backward along the barrel
 * axis and returns to rest position with damped spring physics.
 *
 * Usage:
 *   const railgun = new RailgunWeapon(THREE, {
 *     barrelLength: 5.0,
 *     recoilDistance: 0.3,
 *   });
 *   cockpitGroup.add(railgun.group);
 *   
 *   // Fire (in animation loop or on input)
 *   railgun.fire();
 *   railgun.update(deltaMs);
 */

export class RailgunWeapon {
  /**
   * @param {object} THREE       Three.js namespace.
   * @param {object} [options]
   * @param {number} [options.barrelLength=5.0]      Length of the rail barrel.
   * @param {number} [options.recoilDistance=0.3]    Max recoil backward distance.
   * @param {number} [options.recoilSpring=15]       Spring stiffness (higher = faster return).
   * @param {number} [options.recoilDamping=0.8]     Damping factor (0-1, higher = less oscillation).
   * @param {number} [options.chargeTimeMs=800]      Time to fully charge before fire.
   * @param {number} [options.cooldownTimeMs=1200]   Time before next shot can be fired.
   */
  constructor(THREE, options = {}) {
    this._THREE = THREE;
    this._barrelLength = options.barrelLength ?? 5.0;
    this._recoilDistance = options.recoilDistance ?? 0.3;
    this._recoilSpring = options.recoilSpring ?? 15;
    this._recoilDamping = options.recoilDamping ?? 0.8;
    this._chargeTimeMs = options.chargeTimeMs ?? 800;
    this._cooldownTimeMs = options.cooldownTimeMs ?? 1200;

    /** Root group (attach to scene or cockpit) */
    this.group = new THREE.Group();
    this.group.name = 'railgun-weapon';

    /** Recoil state */
    this._recoilOffset = 0;       // Current recoil displacement (m)
    this._recoilVelocity = 0;     // Recoil velocity (m/s)
    this._isFiring = false;

    /** Charge state */
    this._isCharging = false;
    this._chargeLevel = 0;        // 0 to 1
    this._chargeStartTime = 0;

    /** Cooldown state */
    this._isCoolingDown = false;
    this._cooldownEndTime = 0;

    /** Ammo */
    this._ammoCount = 24;         // Giant nails in magazine
    this._maxAmmo = 24;

    /** Sub-meshes (created in _build) */
    this._barrelGroup = null;     // Contains barrel, rails, recoil-able parts
    this._nailMesh = null;        // Visible giant nail in chamber
    this._chargeMesh = null;      // Glowing charge effect
    this._muzzleFlash = null;     // Flash on fire
    this._railGlowL = null;       // Left rail glow
    this._railGlowR = null;       // Right rail glow

    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Attempt to fire the railgun.
   * @returns {boolean} True if fired, false if charging/cooling down or no ammo.
   */
  fire() {
    if (this._isCharging || this._isCoolingDown || this._ammoCount <= 0) {
      return false;
    }

    // Start charging
    this._isCharging = true;
    this._chargeLevel = 0;
    this._chargeStartTime = Date.now();

    return true;
  }

  /**
   * Check if weapon is ready to fire.
   * @returns {boolean}
   */
  get isReady() {
    return !this._isCharging && !this._isCoolingDown && this._ammoCount > 0;
  }

  /**
   * Get current ammo count.
   * @returns {number}
   */
  get ammo() {
    return this._ammoCount;
  }

  /**
   * Get max ammo capacity.
   * @returns {number}
   */
  get maxAmmo() {
    return this._maxAmmo;
  }

  /**
   * Get charge level (0 to 1).
   * @returns {number}
   */
  get chargeLevel() {
    return this._chargeLevel;
  }

  /**
   * Reload ammo to max.
   */
  reload() {
    this._ammoCount = this._maxAmmo;
  }

  /**
   * Add ammo (clamped to max).
   * @param {number} count
   */
  addAmmo(count) {
    this._ammoCount = Math.min(this._maxAmmo, this._ammoCount + count);
  }

  /**
   * Per-frame update. Handles recoil physics, charge animation, cooldown.
   * @param {number} deltaMs  Milliseconds since last frame.
   */
  update(deltaMs) {
    const deltaSec = deltaMs / 1000;

    // ── Charging animation ────────────────────────────────────────────
    if (this._isCharging) {
      const elapsed = Date.now() - this._chargeStartTime;
      this._chargeLevel = Math.min(1, elapsed / this._chargeTimeMs);

      // Update charge glow intensity
      if (this._chargeMesh) {
        this._chargeMesh.material.opacity = this._chargeLevel * 0.6;
        this._chargeMesh.scale.setScalar(1 + this._chargeLevel * 0.5);
      }

      // Update rail glow
      if (this._railGlowL && this._railGlowR) {
        this._railGlowL.material.opacity = this._chargeLevel * 0.8;
        this._railGlowR.material.opacity = this._chargeLevel * 0.8;
      }

      // When fully charged, fire!
      if (this._chargeLevel >= 1.0) {
        this._executeFire();
      }
    }

    // ── Cooldown timer ────────────────────────────────────────────────
    if (this._isCoolingDown) {
      if (Date.now() >= this._cooldownEndTime) {
        this._isCoolingDown = false;
      }
    }

    // ── Recoil physics (damped spring) ────────────────────────────────
    if (Math.abs(this._recoilOffset) > 0.001 || Math.abs(this._recoilVelocity) > 0.001) {
      // Spring force: F = -k * x
      const springForce = -this._recoilSpring * this._recoilOffset;
      
      // Damping force: F = -c * v
      const dampingForce = -this._recoilDamping * this._recoilVelocity;
      
      // Acceleration
      const accel = springForce + dampingForce;
      this._recoilVelocity += accel * deltaSec;
      this._recoilOffset += this._recoilVelocity * deltaSec;

      // Stop if settled
      if (Math.abs(this._recoilOffset) < 0.001 && Math.abs(this._recoilVelocity) < 0.001) {
        this._recoilOffset = 0;
        this._recoilVelocity = 0;
      }

      // Apply recoil offset to barrel group
      if (this._barrelGroup) {
        this._barrelGroup.position.z = this._recoilOffset;
      }
    }

    // ── Muzzle flash fade ─────────────────────────────────────────────
    if (this._muzzleFlash && this._muzzleFlash.visible) {
      this._muzzleFlash.material.opacity -= deltaSec * 8;
      if (this._muzzleFlash.material.opacity <= 0) {
        this._muzzleFlash.visible = false;
      }
    }
  }

  /**
   * Dispose of all geometry and materials.
   */
  dispose() {
    this.group.traverse((child) => {
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

  // ── Private — Build Geometry ────────────────────────────────────────────────

  _build() {
    const THREE = this._THREE;

    // ── Barrel group (recoils together) ──────────────────────────────
    this._barrelGroup = new THREE.Group();
    this._barrelGroup.name = 'railgun-barrel';

    // Materials
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x445566, roughness: 0.3, metalness: 0.9,
    });
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x334455, roughness: 0.4, metalness: 0.8,
    });
    const nailMat = new THREE.MeshStandardMaterial({
      color: 0xaabbcc, roughness: 0.2, metalness: 1.0,
    });
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x44aaff, transparent: true, opacity: 0,
    });

    // ── Main barrel (long cylinder) ─────────────────────────────────
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.12, this._barrelLength, 12);
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -this._barrelLength / 2;
    barrel.name = 'barrel-main';
    this._barrelGroup.add(barrel);

    // ── Electromagnetic rails (two parallel bars) ───────────────────
    const railGeo = new THREE.BoxGeometry(0.04, 0.04, this._barrelLength);
    
    // Left rail
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-0.14, 0.05, -this._barrelLength / 2);
    railL.name = 'rail-left';
    this._barrelGroup.add(railL);
    
    // Right rail
    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(0.14, 0.05, -this._barrelLength / 2);
    railR.name = 'rail-right';
    this._barrelGroup.add(railR);

    // Rail glow (charge effect)
    const railGlowGeo = new THREE.BoxGeometry(0.06, 0.06, this._barrelLength);
    this._railGlowL = new THREE.Mesh(railGlowGeo, glowMat.clone());
    this._railGlowL.position.set(-0.14, 0.05, -this._barrelLength / 2);
    this._barrelGroup.add(this._railGlowL);
    
    this._railGlowR = new THREE.Mesh(railGlowGeo, glowMat.clone());
    this._railGlowR.position.set(0.14, 0.05, -this._barrelLength / 2);
    this._barrelGroup.add(this._railGlowR);

    // ── Breech/chamber (rear housing) ───────────────────────────────
    const breechGeo = new THREE.BoxGeometry(0.35, 0.25, 0.4);
    const breech = new THREE.Mesh(breechGeo, barrelMat);
    breech.position.set(0, 0, 0.2);
    breech.name = 'breech';
    this._barrelGroup.add(breech);

    // ── Giant nail ammo (visible in chamber) ────────────────────────
    const nailGeo = new THREE.CylinderGeometry(0.03, 0.005, 0.6, 8);
    this._nailMesh = new THREE.Mesh(nailGeo, nailMat);
    this._nailMesh.rotation.x = Math.PI / 2;
    this._nailMesh.position.set(0, 0, -0.1);
    this._nailMesh.name = 'nail-ammo';
    this._barrelGroup.add(this._nailMesh);

    // Nail tip (sharp point)
    const tipGeo = new THREE.ConeGeometry(0.03, 0.15, 8);
    const tip = new THREE.Mesh(tipGeo, nailMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0, -0.45);
    this._nailMesh.add(tip);

    // ── Charge glow sphere (at breech) ──────────────────────────────
    const chargeGeo = new THREE.SphereGeometry(0.15, 16, 12);
    this._chargeMesh = new THREE.Mesh(chargeGeo, glowMat.clone());
    this._chargeMesh.position.set(0, 0, 0.2);
    this._chargeMesh.name = 'charge-glow';
    this._barrelGroup.add(this._chargeMesh);

    // ── Muzzle flash (at barrel tip) ────────────────────────────────
    const flashGeo = new THREE.RingGeometry(0.12, 0.4, 16);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0x44bbff, transparent: true, opacity: 0, side: THREE.DoubleSide,
    });
    this._muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this._muzzleFlash.position.set(0, 0, -this._barrelLength - 0.1);
    this._muzzleFlash.visible = false;
    this._muzzleFlash.name = 'muzzle-flash';
    this._barrelGroup.add(this._muzzleFlash);

    // ── Mounting bracket ────────────────────────────────────────────
    const mountGeo = new THREE.BoxGeometry(0.5, 0.15, 0.3);
    const mount = new THREE.Mesh(mountGeo, railMat);
    mount.position.set(0, -0.1, 0.3);
    mount.name = 'mount';
    this._barrelGroup.add(mount);

    // ── Support struts ──────────────────────────────────────────────
    const strutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
    const strutL = new THREE.Mesh(strutGeo, railMat);
    strutL.position.set(-0.18, -0.15, 0);
    strutL.rotation.x = Math.PI * 0.15;
    this._barrelGroup.add(strutL);
    
    const strutR = new THREE.Mesh(strutGeo, railMat);
    strutR.position.set(0.18, -0.15, 0);
    strutR.rotation.x = Math.PI * 0.15;
    this._barrelGroup.add(strutR);

    this.group.add(this._barrelGroup);

    // Position railgun at bottom-center of cockpit view
    this.group.position.set(0, -0.5, -1.5);
  }

  // ── Private — Fire Execution ────────────────────────────────────────────────

  /**
   * Execute the actual fire after charge is complete.
   */
  _executeFire() {
    this._isCharging = false;
    this._isFiring = true;
    this._chargeLevel = 0;

    // Consume ammo
    this._ammoCount = Math.max(0, this._ammoCount - 1);

    // Apply recoil impulse
    this._recoilOffset = this._recoilDistance;
    this._recoilVelocity = 0;

    // Hide nail (it's been fired)
    if (this._nailMesh) {
      this._nailMesh.visible = false;
      // Reload nail after brief delay
      setTimeout(() => {
        if (this._nailMesh) this._nailMesh.visible = true;
      }, 400);
    }

    // Show muzzle flash
    if (this._muzzleFlash) {
      this._muzzleFlash.visible = true;
      this._muzzleFlash.material.opacity = 1.0;
    }

    // Reset charge glow
    if (this._chargeMesh) {
      this._chargeMesh.material.opacity = 0;
      this._chargeMesh.scale.setScalar(1);
    }
    if (this._railGlowL) this._railGlowL.material.opacity = 0;
    if (this._railGlowR) this._railGlowR.material.opacity = 0;

    // Start cooldown
    this._isCoolingDown = true;
    this._cooldownEndTime = Date.now() + this._cooldownTimeMs;

    this._isFiring = false;
  }
}
