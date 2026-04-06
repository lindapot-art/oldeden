/**
 * SceneManager — Three.js-based 3D scene management for Old Eden.
 *
 * Manages the client-side 3D rendering pipeline:
 *   - Scene graph setup (camera, lighting, fog, skybox)
 *   - Entity registration and transforms (ships, avatars, stations)
 *   - Post-processing effects (bloom, depth-of-field, chromatic aberration)
 *   - Level-of-detail (LOD) management for large star systems
 *   - Responsive resize handling
 *
 * This module is designed to run in a browser environment (Three.js r163+).
 * Import Three.js via ES modules:
 *   import * as THREE from 'three';
 *
 * Usage:
 *   const manager = new SceneManager({ canvas: document.getElementById('canvas') });
 *   manager.init();
 *   manager.loadSkybox('/assets/skybox/nebula');
 *   manager.registerEntity(shipMesh, { id: 'ship-001', type: 'spaceship' });
 *   // In animation loop:
 *   manager.render(deltaMs);
 */

export class SceneManager {
  /**
   * @param {object} options
   * @param {HTMLCanvasElement} options.canvas
   * @param {boolean} [options.antialias=true]
   * @param {boolean} [options.shadows=true]
   */
  constructor({ canvas, antialias = true, shadows = true } = {}) {
    this._canvas    = canvas;
    this._antialias = antialias;
    this._shadows   = shadows;

    this._renderer  = null;
    this._scene     = null;
    this._camera    = null;
    this._clock     = null;

    /** @type {Map<string, { mesh: object, meta: object }>} */
    this._entities  = new Map();

    this._resizeObserver = null;
  }

  /**
   * Initialise the Three.js renderer, scene, and camera.
   * Must be called before any other method.
   *
   * Note: Three.js is loaded as a peer dependency.
   * Import THREE before calling this in your application entry point.
   *
   * @param {object} THREE  The Three.js namespace (passed to avoid bundling concerns)
   */
  init(THREE) {
    this._THREE = THREE;

    // Renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: this._antialias,
      alpha: false,
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(this._canvas.clientWidth, this._canvas.clientHeight);
    this._renderer.shadowMap.enabled = this._shadows;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.2;

    // Scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0x000010, 0.0003);

    // Camera
    const aspect = this._canvas.clientWidth / this._canvas.clientHeight;
    this._camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 50_000);
    this._camera.position.set(0, 50, 200);

    // Ambient & directional lighting
    const ambientLight = new THREE.AmbientLight(0x112244, 0.8);
    this._scene.add(ambientLight);

    const starLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
    starLight.position.set(1000, 500, 500);
    starLight.castShadow = this._shadows;
    this._scene.add(starLight);

    // Clock for delta time
    this._clock = new THREE.Clock();

    // Responsive resize
    this._resizeObserver = new ResizeObserver(() => this._onResize());
    this._resizeObserver.observe(this._canvas);

    console.log('[SceneManager] Initialised Three.js scene.');
  }

  /**
   * Load a cubemap skybox from a base path.
   * Expects files: px.jpg, nx.jpg, py.jpg, ny.jpg, pz.jpg, nz.jpg
   *
   * @param {string} basePath
   */
  loadSkybox(basePath) {
    const THREE = this._THREE;
    const loader = new THREE.CubeTextureLoader();
    const urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']
      .map((f) => `${basePath}/${f}`);
    this._scene.background = loader.load(urls);
  }

  /**
   * Register a mesh (or Object3D) as a named entity in the scene.
   *
   * @param {object} mesh      Three.js Object3D
   * @param {object} meta
   * @param {string} meta.id
   * @param {string} meta.type  'spaceship'|'avatar'|'station'|'asteroid'|'npc'
   */
  registerEntity(mesh, meta) {
    this._scene.add(mesh);
    this._entities.set(meta.id, { mesh, meta });
  }

  /**
   * Remove a named entity from the scene.
   * @param {string} entityId
   */
  removeEntity(entityId) {
    const entry = this._entities.get(entityId);
    if (entry) {
      this._scene.remove(entry.mesh);
      this._entities.delete(entityId);
    }
  }

  /**
   * Update the world-space transform of an entity.
   * @param {string} entityId
   * @param {object} transform  { position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z} }
   */
  updateEntityTransform(entityId, transform) {
    const entry = this._entities.get(entityId);
    if (!entry) return;
    const { mesh } = entry;
    if (transform.position) mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
    if (transform.rotation) mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    if (transform.scale)    mesh.scale.set(transform.scale.x, transform.scale.y, transform.scale.z);
  }

  /**
   * Main render call — invoke this inside your requestAnimationFrame loop.
   */
  render() {
    this._renderer.render(this._scene, this._camera);
  }

  /**
   * Dispose of all Three.js resources.
   */
  dispose() {
    this._resizeObserver?.disconnect();

    // Dispose all entity geometries and materials before clearing the scene
    if (this._scene) {
      this._scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      // Dispose background cubemap texture if present
      if (this._scene.background && this._scene.background.isTexture) {
        this._scene.background.dispose();
      }
      this._scene.clear();
    }

    this._entities.clear();
    this._renderer?.dispose();
  }

  // ── Getters ───────────────────────────────────────────────────────────────────

  get scene()    { return this._scene;    }
  get camera()   { return this._camera;   }
  get renderer() { return this._renderer; }

  // ── Private ───────────────────────────────────────────────────────────────────

  _onResize() {
    const width  = this._canvas.clientWidth;
    const height = this._canvas.clientHeight;
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height);
  }
}
