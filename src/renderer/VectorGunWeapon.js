/**
 * VectorGunWeapon — visual and mechanical representation of an energy vector weapon.
 *
 * Creates a dynamic 3D energy weapon with:
 *   - Energy emitter array
 *   - Glowing core with pulsing effect
 *   - Instantaneous hitscan firing (no projectile travel)
 *   - Discharge animation
 *   - Heat buildup and cooling
 *
 * The vector gun fires concentrated energy beams that deal consistent damage
 * without travel time. Unlike the railgun, it doesn't recoil but builds up
 * heat with sustained fire.
 *
 * Usage:
 *   const vectorGun = new VectorGunWeapon(THREE, {
 *     heatCapacity: 100,
 *   });
 *   cockpitGroup.add(vectorGun.group);
 *   
 *   vectorGun.fire();
 *   vectorGun.update(deltaMs);
 */

export class VectorGunWeapon {
  /**
   * @param {object} THREE       Three.js namespace.
   * @param {object} [options]
   * @param {number} [options.fireRateMs=150]        Time between shots (burst fire).
   * @param {number} [options.heatCapacity=100]      Max heat before overheat.
   * @param {number} [options.heatPerShot=8]         Heat generated per shot.
   * @param {number} [options.coolingRate=15]        Heat dissipated per second.
   * @param {number} [options.overheatCooldown=3000] Cooldown time when overheated.
   */
  constructor(THREE, options = {}) {
    this._THREE = THREE;
    this._fireRateMs = options.fireRateMs ?? 150;
    this._heatCapacity = options.heatCapacity ?? 100;
    this._heatPerShot = options.heatPerShot ?? 8;
    this._coolingRate = options.coolingRate ?? 15;
    this._overheatCooldown = options.overheatCooldown ?? 3000;

    /** Root group (attach to scene or cockpit) */
    this.group = new THREE.Group();
    this.group.name = 'vector-gun-weapon';

    /** Heat state */
    this._currentHeat = 0;       // 0 to heatCapacity
    this._isOverheated = false;
    this._overheatEndTime = 0;

    /** Fire rate limiter */
    this._lastFireTime = 0;

    /** Discharge animation state */
    this._dischargeTime = 0;     // Time since last shot (for animation)
    this._dischargeActive = false;

    /** Energy capacity (infinite ammo, but limited by heat) */
    this._energyLevel = 100;     // Percentage (visual only)

    /** Sub-meshes (created in _build) */
    this._emitterArray = null;   // Energy emitter tips
    this._coreGlow = null;       // Pulsing core
    this._dischargeMesh = null;  // Flash effect on fire
    this._heatVents = null;      // Heat vent glow

    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Attempt to fire the vector gun.
   * @returns {boolean} True if fired, false if on cooldown or overheated.
   */
  fire() {
    const now = Date.now();

    // Check if overheated
    if (this._isOverheated) {
      if (now < this._overheatEndTime) {
        return false;
      } else {
        // Overheat cooldown complete
        this._isOverheated = false;
        this._currentHeat = 0;
      }
    }

    // Check fire rate
    if (now - this._lastFireTime < this._fireRateMs) {
      return false;
    }

    // Fire!
    this._lastFireTime = now;
    this._currentHeat += this._heatPerShot;
    this._dischargeActive = true;
    this._dischargeTime = 0;

    // Check for overheat
    if (this._currentHeat >= this._heatCapacity) {
      this._isOverheated = true;
      this._overheatEndTime = now + this._overheatCooldown;
      this._currentHeat = this._heatCapacity;
    }

    // Trigger discharge effect
    if (this._dischargeMesh) {
      this._dischargeMesh.visible = true;
      this._dischargeMesh.material.opacity = 1.0;
    }

    return true;
  }

  /**
   * Update weapon state (heat dissipation, animations).
   * @param {number} deltaMs  Time since last frame (milliseconds).
   */
  update(deltaMs) {
    const deltaSec = deltaMs / 1000;

    // Passive cooling (if not overheated or actively firing)
    if (!this._isOverheated && this._currentHeat > 0) {
      this._currentHeat -= this._coolingRate * deltaSec;
      if (this._currentHeat < 0) this._currentHeat = 0;
    }

    // Update discharge animation
    if (this._dischargeActive) {
      this._dischargeTime += deltaMs;
      const fadeTime = 200; // ms

      if (this._dischargeTime > fadeTime) {
        this._dischargeActive = false;
        if (this._dischargeMesh) {
          this._dischargeMesh.visible = false;
        }
      } else {
        // Fade out
        const alpha = 1.0 - (this._dischargeTime / fadeTime);
        if (this._dischargeMesh) {
          this._dischargeMesh.material.opacity = alpha;
        }
      }
    }

    // Update core glow (pulse effect)
    if (this._coreGlow) {
      const pulseSpeed = 2.0;
      const pulseAmount = 0.3;
      const basePulse = 0.7;
      const pulse = basePulse + Math.sin(Date.now() * 0.001 * pulseSpeed) * pulseAmount;
      
      // Increase intensity when hot
      const heatRatio = this._currentHeat / this._heatCapacity;
      this._coreGlow.material.emissiveIntensity = pulse + heatRatio * 0.5;
    }

    // Update heat vents glow
    if (this._heatVents) {
      const heatRatio = this._currentHeat / this._heatCapacity;
      this._heatVents.material.emissiveIntensity = heatRatio * 1.5;
      
      // Change color when overheated
      if (this._isOverheated) {
        this._heatVents.material.emissive.setHex(0xFF0000); // Red
      } else if (heatRatio > 0.7) {
        this._heatVents.material.emissive.setHex(0xFF6600); // Orange
      } else {
        this._heatVents.material.emissive.setHex(0x00AAFF); // Cyan
      }
    }
  }

  /**
   * Reset heat to zero (emergency vent or repair).
   */
  resetHeat() {
    this._currentHeat = 0;
    this._isOverheated = false;
  }

  // ── Build Geometry ──────────────────────────────────────────────────────────

  _build() {
    const T = this._THREE;

    // Main body
    const bodyGeo = new T.BoxGeometry(0.3, 0.3, 1.2);
    const bodyMat = new T.MeshStandardMaterial({ color: 0x333344, metalness: 0.9, roughness: 0.3 });
    const bodyMesh = new T.Mesh(bodyGeo, bodyMat);
    this.group.add(bodyMesh);

    // Energy core (glowing sphere)
    const coreGeo = new T.SphereGeometry(0.15, 16, 16);
    const coreMat = new T.MeshStandardMaterial({
      color: 0x00DDFF,
      emissive: 0x00AAFF,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    this._coreGlow = new T.Mesh(coreGeo, coreMat);
    this._coreGlow.position.set(0, 0, -0.2);
    this.group.add(this._coreGlow);

    // Emitter array (four tips at front)
    this._emitterArray = new T.Group();
    const emitterPositions = [
      [0.1, 0.1, 0.6],
      [0.1, -0.1, 0.6],
      [-0.1, 0.1, 0.6],
      [-0.1, -0.1, 0.6],
    ];

    for (const [x, y, z] of emitterPositions) {
      const emitterGeo = new T.ConeGeometry(0.03, 0.15, 8);
      const emitterMat = new T.MeshStandardMaterial({
        color: 0x88AAFF,
        emissive: 0x4488FF,
        emissiveIntensity: 0.6,
      });
      const emitter = new T.Mesh(emitterGeo, emitterMat);
      emitter.position.set(x, y, z);
      emitter.rotation.x = Math.PI / 2;
      this._emitterArray.add(emitter);
    }
    this.group.add(this._emitterArray);

    // Heat vents (side panels)
    const ventGeo = new T.BoxGeometry(0.35, 0.1, 0.4);
    const ventMat = new T.MeshStandardMaterial({
      color: 0x666677,
      emissive: 0x00AAFF,
      emissiveIntensity: 0,
    });
    this._heatVents = new T.Mesh(ventGeo, ventMat);
    this._heatVents.position.set(0, 0.2, 0);
    this.group.add(this._heatVents);

    // Discharge flash (muzzle flash)
    const flashGeo = new T.SphereGeometry(0.25, 8, 8);
    const flashMat = new T.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0,
    });
    this._dischargeMesh = new T.Mesh(flashGeo, flashMat);
    this._dischargeMesh.position.set(0, 0, 0.7);
    this._dischargeMesh.visible = false;
    this.group.add(this._dischargeMesh);

    // Position weapon (offset from railgun)
    this.group.position.set(0.8, -0.5, 1.5); // Right side of cockpit
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get isReady() {
    return !this._isOverheated && (Date.now() - this._lastFireTime >= this._fireRateMs);
  }

  get heat() {
    return this._currentHeat;
  }

  get maxHeat() {
    return this._heatCapacity;
  }

  get heatLevel() {
    return this._currentHeat / this._heatCapacity;
  }

  get isOverheated() {
    return this._isOverheated;
  }

  get damage() {
    return 45; // Base damage per shot (lower than railgun but faster)
  }

  get weaponType() {
    return 'LASER'; // Uses laser damage type
  }
}
