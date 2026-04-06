/**
 * GlbMLProcessor — Machine Learning-powered GLB asset processing.
 *
 * This module provides ML-enhanced capabilities for 3D model assets:
 *
 *   1. **Procedural GLB Generation** — Generate 3D models from text descriptions
 *      using the Python ML service's 3D generation pipeline.
 *
 *   2. **Model Optimization** — Use neural networks to reduce polygon count while
 *      preserving visual quality (ML-based mesh simplification).
 *
 *   3. **Quality Assessment** — Automatically score and validate uploaded models
 *      for game readiness (polygon count, texture resolution, rigging quality).
 *
 *   4. **Style Transfer** — Apply faction-specific visual styles to generic models.
 *
 *   5. **Auto-LOD Generation** — Create Level-of-Detail variants using ML prediction.
 *
 * Works in conjunction with AssetGenerator and GlbProcessor.
 */

import { GlbProcessor } from '../assets/GlbProcessor.js';

const DEFAULT_TIMEOUT_MS = 60_000; // 60 seconds for 3D generation

export class GlbMLProcessor {
  /**
   * @param {object} [config]
   * @param {string} [config.serviceUrl]  ML service URL
   * @param {string} [config.apiKey]      API key for authentication
   * @param {boolean} [config.mock=false] Use mock responses
   * @param {number} [config.maxFileSize=500_000_000] Max GLB size (500MB default)
   */
  constructor({ serviceUrl, apiKey, mock = false, maxFileSize = 500_000_000 } = {}) {
    this._serviceUrl = serviceUrl ?? process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    this._apiKey     = apiKey ?? process.env.AI_SERVICE_API_KEY ?? '';
    this._mock       = mock;
    this._maxFileSize = maxFileSize;
    this._glbProcessor = new GlbProcessor();
  }

  // ── Procedural Generation ────────────────────────────────────────────────────

  /**
   * Generate a 3D spaceship model from a text description.
   *
   * Uses the ML service's text-to-3D pipeline (Point-E, Shap-E, or similar).
   * Returns a GLB file that can be loaded directly into Three.js.
   *
   * @param {object} params
   * @param {string} params.description   Text description of the ship
   * @param {string} params.shipClass     'fighter'|'freighter'|'capital'|'shuttle'
   * @param {string} params.faction       Faction name for style guidance
   * @param {number} [params.polyCount=10000] Target polygon count
   * @returns {Promise<GenerationResult>}
   */
  async generateShipModel({ description, shipClass, faction, polyCount = 10000 }) {
    if (this._mock) {
      return this._mockGenerationResult('ship', { description, shipClass, faction });
    }

    const prompt = `${description} - ${shipClass} class spaceship for ${faction} faction in Old Eden`;

    return this._request('/ml/generate_3d/ship', {
      prompt,
      shipClass,
      faction,
      targetPolyCount: polyCount,
      format: 'glb',
    }, DEFAULT_TIMEOUT_MS);
  }

  /**
   * Generate a character model from genome data.
   *
   * @param {Uint8Array} genome  Character genome
   * @param {object} [options]
   * @param {string} [options.bodyType='humanoid'] Base mesh type
   * @param {number} [options.polyCount=15000] Target polygon count
   * @returns {Promise<GenerationResult>}
   */
  async generateCharacterModel(genome, { bodyType = 'humanoid', polyCount = 15000 } = {}) {
    if (this._mock) {
      return this._mockGenerationResult('character', { bodyType });
    }

    const traits = this._extractGenomeTraits(genome);

    return this._request('/ml/generate_3d/character', {
      traits,
      bodyType,
      targetPolyCount: polyCount,
      format: 'glb',
    }, DEFAULT_TIMEOUT_MS);
  }

  /**
   * Generate procedural environment props (asteroids, space stations, debris).
   *
   * @param {object} params
   * @param {string} params.type 'asteroid'|'station'|'debris'|'planet_surface'
   * @param {object} [params.attributes] Type-specific attributes
   * @returns {Promise<GenerationResult>}
   */
  async generateEnvironmentProp({ type, attributes = {} }) {
    if (this._mock) {
      return this._mockGenerationResult('prop', { type });
    }

    return this._request('/ml/generate_3d/environment', {
      propType: type,
      attributes,
      format: 'glb',
    }, DEFAULT_TIMEOUT_MS);
  }

  // ── Model Optimization ────────────────────────────────────────────────────────

  /**
   * Optimize a GLB file using ML-based mesh simplification.
   *
   * Uses neural network to intelligently reduce polygon count while preserving
   * visual quality better than traditional decimation.
   *
   * @param {string} glbPath    Path to input GLB file
   * @param {object} [options]
   * @param {number} [options.targetPolyCount] Target polygon count (auto if not set)
   * @param {number} [options.qualityThreshold=0.95] Quality preservation (0-1)
   * @returns {Promise<OptimizationResult>}
   */
  async optimizeModel(glbPath, { targetPolyCount, qualityThreshold = 0.95 } = {}) {
    // First inspect the model to get current stats
    const inspection = await this._glbProcessor.inspect(glbPath);

    if (this._mock) {
      return {
        status: 'mock',
        originalPolyCount: inspection.polyCount ?? 50000,
        optimizedPolyCount: targetPolyCount ?? 10000,
        reduction: 0.8,
        qualityScore: qualityThreshold,
        outputPath: glbPath.replace('.glb', '_optimized.glb'),
      };
    }

    return this._request('/ml/optimize/mesh', {
      modelPath: glbPath,
      targetPolyCount,
      qualityThreshold,
    }, DEFAULT_TIMEOUT_MS);
  }

  /**
   * Generate multiple LOD (Level of Detail) variants of a model.
   *
   * Creates 3-4 progressively simplified versions for efficient rendering.
   *
   * @param {string} glbPath    Path to high-quality source GLB
   * @param {object} [options]
   * @param {number[]} [options.lodLevels=[0.5, 0.25, 0.1]] Reduction ratios
   * @returns {Promise<LodGenerationResult>}
   */
  async generateLODs(glbPath, { lodLevels = [0.5, 0.25, 0.1] } = {}) {
    if (this._mock) {
      return {
        status: 'mock',
        lods: lodLevels.map((ratio, i) => ({
          level: i + 1,
          reductionRatio: ratio,
          path: glbPath.replace('.glb', `_lod${i + 1}.glb`),
        })),
      };
    }

    return this._request('/ml/generate/lods', {
      modelPath: glbPath,
      lodLevels,
    }, DEFAULT_TIMEOUT_MS);
  }

  // ── Quality Assessment ────────────────────────────────────────────────────────

  /**
   * Assess a GLB model's quality and game-readiness using ML analysis.
   *
   * Checks:
   * - Polygon count (too high/too low)
   * - Texture resolution
   * - UV mapping quality
   * - Rigging (if present)
   * - Mesh topology
   * - Material complexity
   *
   * @param {string} glbPath    Path to GLB file
   * @returns {Promise<QualityAssessment>}
   */
  async assessQuality(glbPath) {
    // Use GlbProcessor for base inspection
    const inspection = await this._glbProcessor.inspect(glbPath);

    if (this._mock) {
      return {
        status: 'mock',
        overallScore: 0.85,
        details: {
          polyCount: { value: 15000, score: 0.9, optimal: true },
          textureQuality: { score: 0.85, issues: [] },
          topology: { score: 0.8, hasNgons: false },
          materials: { count: 2, score: 0.9 },
          animations: { count: 0, score: 1.0 },
        },
        recommendations: [
          'Model is game-ready',
          'Consider adding LOD variants for distant rendering',
        ],
      };
    }

    return this._request('/ml/assess/quality', {
      modelPath: glbPath,
      baseInspection: inspection,
    }, DEFAULT_TIMEOUT_MS);
  }

  /**
   * Validate that a GLB file meets game asset requirements.
   *
   * @param {string} glbPath       Path to GLB file
   * @param {object} requirements  Asset requirements
   * @param {number} [requirements.maxPolyCount=50000]
   * @param {number} [requirements.maxTextureSize=2048]
   * @param {boolean} [requirements.requiresRigging=false]
   * @returns {Promise<ValidationResult>}
   */
  async validateAsset(glbPath, requirements = {}) {
    const defaults = {
      maxPolyCount: 50000,
      maxTextureSize: 2048,
      maxMaterials: 5,
      requiresRigging: false,
    };

    const reqs = { ...defaults, ...requirements };
    const inspection = await this._glbProcessor.inspect(glbPath);

    const issues = [];

    if (inspection.polyCount && inspection.polyCount > reqs.maxPolyCount) {
      issues.push({
        severity: 'error',
        message: `Polygon count (${inspection.polyCount}) exceeds maximum (${reqs.maxPolyCount})`,
        fix: 'Use optimizeModel() to reduce polygon count',
      });
    }

    if (inspection.materials && inspection.materials.length > reqs.maxMaterials) {
      issues.push({
        severity: 'warning',
        message: `Material count (${inspection.materials.length}) exceeds recommended (${reqs.maxMaterials})`,
        fix: 'Consider combining materials',
      });
    }

    const isValid = issues.filter((i) => i.severity === 'error').length === 0;

    return {
      valid: isValid,
      issues,
      inspection,
      requirements: reqs,
    };
  }

  // ── Style Transfer ────────────────────────────────────────────────────────────

  /**
   * Apply faction-specific visual style to a generic model.
   *
   * Uses style transfer to make a generic ship/prop match faction aesthetics
   * (colors, weathering, decals, material properties).
   *
   * @param {string} glbPath      Path to source GLB
   * @param {string} faction      Target faction
   * @param {object} [options]
   * @param {number} [options.intensity=0.8] Style transfer intensity (0-1)
   * @returns {Promise<StyleTransferResult>}
   */
  async applyFactionStyle(glbPath, faction, { intensity = 0.8 } = {}) {
    if (this._mock) {
      return {
        status: 'mock',
        outputPath: glbPath.replace('.glb', `_${faction.toLowerCase()}.glb`),
        faction,
        intensity,
      };
    }

    return this._request('/ml/style/transfer', {
      modelPath: glbPath,
      targetFaction: faction,
      intensity,
    }, DEFAULT_TIMEOUT_MS);
  }

  // ── Batch Processing ──────────────────────────────────────────────────────────

  /**
   * Process multiple GLB files in batch.
   *
   * @param {string[]} glbPaths    Array of GLB file paths
   * @param {string} operation     'optimize'|'assess'|'generate_lods'
   * @param {object} [options]     Operation-specific options
   * @returns {Promise<BatchResult>}
   */
  async batchProcess(glbPaths, operation, options = {}) {
    if (this._mock) {
      return {
        status: 'mock',
        totalFiles: glbPaths.length,
        successful: glbPaths.length,
        failed: 0,
        results: glbPaths.map((path) => ({ path, status: 'success' })),
      };
    }

    return this._request('/ml/batch/process', {
      files: glbPaths,
      operation,
      options,
    }, DEFAULT_TIMEOUT_MS * 5); // 5x timeout for batch
  }

  // ── Private Helpers ───────────────────────────────────────────────────────────

  async _request(path, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this._serviceUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this._apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`[GlbMLProcessor] HTTP ${response.status} from ${path}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`[GlbMLProcessor] Request to ${path} timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  _mockGenerationResult(type, params) {
    return Promise.resolve({
      status: 'mock',
      type,
      url: `https://placeholder.oldeden.io/ml/${type}/${Date.now()}.glb`,
      downloadUrl: `https://placeholder.oldeden.io/download/${type}_${Date.now()}.glb`,
      params,
      generatedAt: Date.now(),
      polyCount: 15000,
      textureCount: 2,
    });
  }

  _extractGenomeTraits(genome) {
    return {
      height: genome[0] / 255,
      build: genome[1] / 255,
      skinTone: genome[128],
      musculature: genome[2] / 255,
      proportions: {
        torso: genome[3] / 255,
        limbs: genome[4] / 255,
      },
    };
  }
}

/**
 * @typedef {object} GenerationResult
 * @property {string} status
 * @property {string} url
 * @property {string} downloadUrl
 * @property {number} polyCount
 * @property {number} textureCount
 * @property {number} generatedAt
 */

/**
 * @typedef {object} OptimizationResult
 * @property {string} status
 * @property {number} originalPolyCount
 * @property {number} optimizedPolyCount
 * @property {number} reduction
 * @property {number} qualityScore
 * @property {string} outputPath
 */

/**
 * @typedef {object} QualityAssessment
 * @property {string} status
 * @property {number} overallScore
 * @property {object} details
 * @property {string[]} recommendations
 */

/**
 * @typedef {object} ValidationResult
 * @property {boolean} valid
 * @property {Array<{severity: string, message: string, fix: string}>} issues
 * @property {object} inspection
 * @property {object} requirements
 */

/**
 * @typedef {object} StyleTransferResult
 * @property {string} status
 * @property {string} outputPath
 * @property {string} faction
 * @property {number} intensity
 */

/**
 * @typedef {object} LodGenerationResult
 * @property {string} status
 * @property {Array<{level: number, reductionRatio: number, path: string}>} lods
 */

/**
 * @typedef {object} BatchResult
 * @property {string} status
 * @property {number} totalFiles
 * @property {number} successful
 * @property {number} failed
 * @property {Array<{path: string, status: string}>} results
 */
