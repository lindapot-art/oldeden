/**
 * ModelLoader — Three.js GLB model loading utility for Old Eden.
 *
 * Handles loading, caching, and instantiation of optimized GLB models.
 * Supports faction-specific materials and ship customization.
 *
 * Usage:
 *   const loader = new ModelLoader(THREE);
 *   const model = await loader.load('ship_sentinel');
 *   scene.add(model);
 */

export class ModelLoader {
  /**
   * @param {object} THREE  Three.js namespace.
   */
  constructor(THREE) {
    this._THREE = THREE;
    this._cache = new Map();
    this._loader = null;
    
    // Model manifest mapping names to paths
    this._models = {
      // Garrisons faction ships
      'ship_sentinel': '/models/ship_sentinel.glb',
      'ship_sentinel_variant': '/models/ship_sentinel_variant.glb',
      'ship_titan': '/models/ship_titan.glb',
      'ship_titan_variant': '/models/ship_titan_variant.glb',
      'ship_freighter': '/models/ship_freighter.glb',
      
      // Stations
      'garrisons_habitat': '/models/garrisons_habitat.glb',
      'spacestation_01': '/models/spacestation_01.glb',
      'spacestation_02': '/models/spacestation_02.glb',
      
      // Weapons
      'railgun_weapon': '/models/railgun_weapon.glb',
      'railgun_heavy': '/models/railgun_heavy.glb',
      
      // Misc
      'pod_evacuation_01': '/models/pod_evacuation_01.glb',
      'pod_evacuation_02': '/models/pod_evacuation_02.glb',
    };
    
    // Faction color schemes
    this._factionColors = {
      'garrisons': {
        primary: 0xFF6B35,    // Orange-red (rebel colors)
        secondary: 0x444444,  // Dark gray
        accent: 0xFFAA55,     // Bright orange
        glow: 0xFF8844,       // Orange glow
      },
      'terran_dominion': {
        primary: 0x2244AA,
        secondary: 0x666666,
        accent: 0x4488FF,
        glow: 0x4488FF,
      },
      'neutral': {
        primary: 0x888888,
        secondary: 0x555555,
        accent: 0xAAAAAA,
        glow: 0x88CCFF,
      },
    };
  }
  
  /**
   * Initialize the GLTFLoader. Lazy-loaded to avoid issues in server/test environments.
   * @private
   */
  async _initLoader() {
    if (this._loader) return;
    
    // Import GLTFLoader from Three.js examples
    // This works in browser with the importmap defined in index.html
    try {
      if (typeof window !== 'undefined') {
        // Browser environment - dynamic import
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
        const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');
        
        // Setup DRACO decoder for compressed models
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        
        this._loader = new GLTFLoader();
        this._loader.setDRACOLoader(dracoLoader);
      } else {
        // Server/test environment - no loader
        console.warn('GLTFLoader not available in non-browser environment.');
        this._loader = null;
      }
    } catch (err) {
      console.warn('Failed to load GLTFLoader:', err);
      this._loader = null;
    }
  }
  
  /**
   * Load a model by name. Returns a cloned instance from cache.
   * @param {string} modelName  Model name from manifest.
   * @param {object} [options]  Loading options.
   * @param {string} [options.faction]  Faction name for color scheme.
   * @param {number} [options.scale=1]  Uniform scale factor.
   * @param {boolean} [options.clone=true]  Return a clone (true) or original (false).
   * @returns {Promise<THREE.Group>}
   */
  async load(modelName, options = {}) {
    await this._initLoader();
    
    if (!this._loader) {
      console.error('GLTFLoader not available. Returning empty group.');
      return new this._THREE.Group();
    }
    
    const modelPath = this._models[modelName];
    if (!modelPath) {
      console.error(`Model not found: ${modelName}`);
      return new this._THREE.Group();
    }
    
    // Check cache
    if (!this._cache.has(modelName)) {
      try {
        const gltf = await this._loadGLTF(modelPath);
        this._cache.set(modelName, gltf.scene);
      } catch (err) {
        console.error(`Failed to load model ${modelName}:`, err);
        return new this._THREE.Group();
      }
    }
    
    const cached = this._cache.get(modelName);
    const model = options.clone !== false ? cached.clone() : cached;
    
    // Apply options
    if (options.scale && options.scale !== 1) {
      model.scale.setScalar(options.scale);
    }
    
    if (options.faction) {
      this._applyFactionColors(model, options.faction);
    }
    
    return model;
  }
  
  /**
   * Load a GLTF file using Promise wrapper.
   * @private
   * @param {string} path  Path to GLB file.
   * @returns {Promise<object>}  GLTF object with scene, animations, etc.
   */
  _loadGLTF(path) {
    return new Promise((resolve, reject) => {
      this._loader.load(
        path,
        (gltf) => resolve(gltf),
        undefined,  // onProgress
        (error) => reject(error)
      );
    });
  }
  
  /**
   * Apply faction-specific color scheme to model materials.
   * @private
   * @param {THREE.Object3D} model  The model to colorize.
   * @param {string} factionId  Faction identifier.
   */
  _applyFactionColors(model, factionId) {
    const colors = this._factionColors[factionId] || this._factionColors.neutral;
    
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const material = child.material;
        
        // Apply faction primary color
        if (material.color) {
          material.color.setHex(colors.primary);
        }
        
        // Add emissive glow for engines/lights
        if (material.emissive && child.name.match(/engine|light|glow|thruster/i)) {
          material.emissive.setHex(colors.glow);
          material.emissiveIntensity = 0.5;
        }
      }
    });
  }
  
  /**
   * Preload multiple models into cache.
   * @param {string[]} modelNames  Array of model names to preload.
   * @returns {Promise<void>}
   */
  async preload(modelNames) {
    const promises = modelNames.map(name => this.load(name, { clone: false }));
    await Promise.all(promises);
  }
  
  /**
   * Clear the model cache.
   */
  clearCache() {
    this._cache.clear();
  }
  
  /**
   * Get list of available model names.
   * @returns {string[]}
   */
  getAvailableModels() {
    return Object.keys(this._models);
  }
}
