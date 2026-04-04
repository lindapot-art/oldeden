/**
 * @fileoverview Mining Beam - Visual laser beam for asteroid mining.
 * Creates a continuous beam effect from ship to asteroid.
 */

export class MiningBeam {
  /**
   * @param {THREE} THREE - Three.js library
   * @param {THREE.Scene} scene - Scene to add beam to
   */
  constructor(THREE, scene) {
    this._THREE = THREE;
    this._scene = scene;
    
    this._active = false;
    this._beam = null;
    this._particles = null;
    this._startPoint = new THREE.Vector3();
    this._endPoint = new THREE.Vector3();
    
    this._createBeam();
  }
  
  /**
   * Create the mining beam geometry
   */
  _createBeam() {
    // Main laser beam (cylinder from start to end)
    const geometry = new this._THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const material = new this._THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00ff00,
      emissiveIntensity: 2
    });
    
    this._beam = new this._THREE.Mesh(geometry, material);
    this._beam.visible = false;
    this._scene.add(this._beam);
    
    // Impact particles
    const particleGeometry = new this._THREE.BufferGeometry();
    const particleCount = 20;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 0;
    }
    
    particleGeometry.setAttribute('position', new this._THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new this._THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new this._THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: this._THREE.AdditiveBlending
    });
    
    this._particles = new this._THREE.Points(particleGeometry, particleMaterial);
    this._particles.visible = false;
    this._scene.add(this._particles);
  }
  
  /**
   * Start the mining beam
   * @param {THREE.Vector3} startPoint - Beam origin (ship position)
   * @param {THREE.Vector3} endPoint - Beam target (asteroid position)
   */
  start(startPoint, endPoint) {
    this._active = true;
    this._startPoint.copy(startPoint);
    this._endPoint.copy(endPoint);
    
    this._beam.visible = true;
    this._particles.visible = true;
    
    this._updateBeamGeometry();
  }
  
  /**
   * Stop the mining beam
   */
  stop() {
    this._active = false;
    this._beam.visible = false;
    this._particles.visible = false;
  }
  
  /**
   * Update beam geometry to match start/end points
   */
  _updateBeamGeometry() {
    if (!this._active) return;
    
    // Calculate beam direction and length
    const direction = new this._THREE.Vector3()
      .subVectors(this._endPoint, this._startPoint);
    const length = direction.length();
    
    // Position beam at midpoint
    const midpoint = new this._THREE.Vector3()
      .addVectors(this._startPoint, this._endPoint)
      .multiplyScalar(0.5);
    
    this._beam.position.copy(midpoint);
    this._beam.scale.y = length;
    
    // Rotate beam to point from start to end
    this._beam.quaternion.setFromUnitVectors(
      new this._THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    
    // Position particles at impact point
    this._particles.position.copy(this._endPoint);
  }
  
  /**
   * Update beam animation
   */
  update(deltaTime, startPoint, endPoint) {
    if (!this._active) return;
    
    if (startPoint) this._startPoint.copy(startPoint);
    if (endPoint) this._endPoint.copy(endPoint);
    
    this._updateBeamGeometry();
    
    // Animate particles
    const positions = this._particles.geometry.attributes.position;
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < positions.count; i++) {
      const angle = (i / positions.count) * Math.PI * 2 + time * 2;
      const radius = 0.5 + Math.sin(time * 3 + i) * 0.3;
      
      positions.setXYZ(
        i,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        Math.sin(time * 4 + i) * 0.3
      );
    }
    
    positions.needsUpdate = true;
    
    // Pulse beam opacity
    this._beam.material.opacity = 0.5 + Math.sin(time * 10) * 0.1;
  }
  
  /**
   * Check if beam is active
   */
  isActive() {
    return this._active;
  }
  
  /**
   * Cleanup
   */
  dispose() {
    this._scene.remove(this._beam);
    this._scene.remove(this._particles);
    
    this._beam.geometry.dispose();
    this._beam.material.dispose();
    this._particles.geometry.dispose();
    this._particles.material.dispose();
  }
}
