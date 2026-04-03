/**
 * PlaceholderShip — procedural vector-style spaceship built from Three.js primitives.
 *
 * Creates a low-poly placeholder ship mesh group for use until proper 3D models
 * are supplied. The ship is built entirely from basic geometry (boxes, cones,
 * cylinders) to form a recognisable starfighter silhouette.
 *
 * The ship includes a tagged gun-turret mount point so the GunnerView can
 * attach a first-person camera at the correct position.
 *
 * Usage:
 *   import { PlaceholderShip } from './PlaceholderShip.js';
 *   const builder = new PlaceholderShip(THREE);
 *   const { group, turretMount } = builder.build();
 *   scene.add(group);
 */

export class PlaceholderShip {
  /**
   * @param {object} THREE  The Three.js namespace.
   * @param {object} [options]
   * @param {number} [options.hullColor=0x334455]     Base hull colour.
   * @param {number} [options.accentColor=0x44aaff]   Engine / accent colour.
   * @param {number} [options.canopyColor=0x88ccff]    Canopy glass colour.
   * @param {number} [options.gunColor=0x556677]       Gun barrel colour.
   * @param {number} [options.scale=1]                 Uniform scale.
   */
  constructor(THREE, options = {}) {
    this._THREE = THREE;
    this._hullColor    = options.hullColor    ?? 0x334455;
    this._accentColor  = options.accentColor  ?? 0x44aaff;
    this._canopyColor  = options.canopyColor  ?? 0x88ccff;
    this._gunColor     = options.gunColor     ?? 0x556677;
    this._scale        = options.scale        ?? 1;
  }

  /**
   * Build the placeholder ship mesh.
   *
   * @returns {{ group: THREE.Group, turretMount: THREE.Object3D }}
   *   group       — the root Group containing all ship geometry.
   *   turretMount — an empty Object3D placed at the gun-turret seat position
   *                 (top of hull, facing forward along −Z).
   */
  build() {
    const THREE = this._THREE;
    const group = new THREE.Group();
    group.name = 'placeholder-ship';

    // ── Materials ───────────────────────────────────────────────────────
    const hullMat = new THREE.MeshStandardMaterial({
      color: this._hullColor, roughness: 0.6, metalness: 0.4,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: this._accentColor, roughness: 0.3, metalness: 0.6,
      emissive: this._accentColor, emissiveIntensity: 0.3,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: this._canopyColor, roughness: 0.1, metalness: 0.8,
      transparent: true, opacity: 0.35,
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: this._gunColor, roughness: 0.4, metalness: 0.7,
    });

    // ── Main hull (elongated box) ──────────────────────────────────────
    const hullGeo = new THREE.BoxGeometry(3, 1, 10);
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.name = 'hull-main';
    group.add(hull);

    // ── Nose cone ──────────────────────────────────────────────────────
    const noseGeo = new THREE.ConeGeometry(1.5, 4, 4);
    const nose = new THREE.Mesh(noseGeo, hullMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -7;
    nose.name = 'hull-nose';
    group.add(nose);

    // ── Wings (two flat boxes angled slightly) ─────────────────────────
    const wingGeo = new THREE.BoxGeometry(8, 0.15, 4);
    const wingL = new THREE.Mesh(wingGeo, hullMat);
    wingL.position.set(-4.5, 0, 1);
    wingL.rotation.z = -0.08;
    wingL.name = 'wing-left';
    group.add(wingL);

    const wingR = new THREE.Mesh(wingGeo, hullMat);
    wingR.position.set(4.5, 0, 1);
    wingR.rotation.z = 0.08;
    wingR.name = 'wing-right';
    group.add(wingR);

    // ── Wing tips (small angled fins) ──────────────────────────────────
    const finGeo = new THREE.BoxGeometry(0.15, 1.5, 2);
    const finL = new THREE.Mesh(finGeo, accentMat);
    finL.position.set(-8.4, 0.6, 1);
    finL.name = 'fin-left';
    group.add(finL);

    const finR = new THREE.Mesh(finGeo, accentMat);
    finR.position.set(8.4, 0.6, 1);
    finR.name = 'fin-right';
    group.add(finR);

    // ── Tail fins (vertical stabilisers) ───────────────────────────────
    const tailFinGeo = new THREE.BoxGeometry(0.15, 2, 2.5);
    const tailL = new THREE.Mesh(tailFinGeo, hullMat);
    tailL.position.set(-1.2, 1.2, 4.5);
    tailL.rotation.z = 0.15;
    tailL.name = 'tail-left';
    group.add(tailL);

    const tailR = new THREE.Mesh(tailFinGeo, hullMat);
    tailR.position.set(1.2, 1.2, 4.5);
    tailR.rotation.z = -0.15;
    tailR.name = 'tail-right';
    group.add(tailR);

    // ── Engines (two cylinders at rear) ────────────────────────────────
    const engGeo = new THREE.CylinderGeometry(0.5, 0.7, 2, 8);
    const engL = new THREE.Mesh(engGeo, accentMat);
    engL.rotation.x = Math.PI / 2;
    engL.position.set(-1, -0.2, 5.5);
    engL.name = 'engine-left';
    group.add(engL);

    const engR = new THREE.Mesh(engGeo, accentMat);
    engR.rotation.x = Math.PI / 2;
    engR.position.set(1, -0.2, 5.5);
    engR.name = 'engine-right';
    group.add(engR);

    // Engine glow discs
    const glowGeo = new THREE.CircleGeometry(0.65, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this._accentColor, transparent: true, opacity: 0.7,
    });
    const glowL = new THREE.Mesh(glowGeo, glowMat);
    glowL.position.set(-1, -0.2, 6.51);
    group.add(glowL);
    const glowR = new THREE.Mesh(glowGeo, glowMat);
    glowR.position.set(1, -0.2, 6.51);
    group.add(glowR);

    // ── Cockpit canopy (glass dome on top) ─────────────────────────────
    const canopyGeo = new THREE.SphereGeometry(1.0, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.5, -3);
    canopy.name = 'canopy';
    group.add(canopy);

    // ── Gun turret (top-mounted twin barrels) ──────────────────────────
    const turretBaseGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.4, 8);
    const turretBase = new THREE.Mesh(turretBaseGeo, gunMat);
    turretBase.position.set(0, 0.8, -1);
    turretBase.name = 'turret-base';
    group.add(turretBase);

    const barrelGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 6);
    const barrelL = new THREE.Mesh(barrelGeo, gunMat);
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.25, 0.95, -2.5);
    barrelL.name = 'gun-barrel-left';
    group.add(barrelL);

    const barrelR = new THREE.Mesh(barrelGeo, gunMat);
    barrelR.rotation.x = Math.PI / 2;
    barrelR.position.set(0.25, 0.95, -2.5);
    barrelR.name = 'gun-barrel-right';
    group.add(barrelR);

    // ── Turret mount point (empty object for camera attachment) ────────
    const turretMount = new THREE.Object3D();
    turretMount.name = 'turret-mount';
    // Positioned at seat-level behind the gun turret, looking forward (−Z)
    turretMount.position.set(0, 1.2, -0.5);
    group.add(turretMount);

    // Apply scale
    if (this._scale !== 1) {
      group.scale.setScalar(this._scale);
    }

    return { group, turretMount };
  }
}
