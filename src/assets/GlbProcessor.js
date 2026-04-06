/**
 * GlbProcessor — GLB/glTF asset processing using @gltf-transform/core.
 *
 * Provides utilities for:
 *   - Reading and validating GLB binary files
 *   - Inspecting model metadata (meshes, materials, textures, animations)
 *   - Reporting asset stats (vertex count, file size, texture memory)
 *
 * Used by AssetUploadRouter to validate uploaded 3D models before storing them.
 *
 * @see https://gltf-transform.dev/
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'node:fs';

/**
 * Maximum allowed file size for GLB uploads (500 MB).
 * @type {number}
 */
const MAX_GLB_SIZE = 500 * 1024 * 1024;

/**
 * Supported 3D model extensions that this processor can handle.
 * @type {Set<string>}
 */
export const SUPPORTED_EXTENSIONS = new Set(['.glb', '.gltf']);

export class GlbProcessor {
  constructor() {
    this._io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  }

  /**
   * Read and validate a GLB/glTF file from disk.
   * Returns a structured report with mesh stats, materials, and validation issues.
   *
   * @param {string} filePath  Absolute path to the GLB or glTF file
   * @returns {Promise<ProcessorReport>}
   */
  async inspect(filePath) {
    const errors = [];

    // Check file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, errors: ['File not found.'], stats: null };
    }

    // Check file size
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_GLB_SIZE) {
      return {
        valid: false,
        errors: [`File size (${(stat.size / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed (${MAX_GLB_SIZE / 1024 / 1024} MB).`],
        stats: null,
      };
    }

    let doc;
    try {
      doc = await this._io.read(filePath);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to parse GLB/glTF: ${err.message}`],
        stats: null,
      };
    }

    const root = doc.getRoot();

    // Gather mesh stats
    const meshes = root.listMeshes();
    let totalVertices = 0;
    let totalTriangles = 0;

    for (const mesh of meshes) {
      for (const primitive of mesh.listPrimitives()) {
        const position = primitive.getAttribute('POSITION');
        if (position) {
          totalVertices += position.getCount();
        }
        const indices = primitive.getIndices();
        if (indices) {
          totalTriangles += indices.getCount() / 3;
        } else if (position) {
          totalTriangles += position.getCount() / 3;
        }
      }
    }

    // Gather materials
    const materials = root.listMaterials().map((mat) => ({
      name: mat.getName() || '(unnamed)',
      alphaMode: mat.getAlphaMode(),
      doubleSided: mat.getDoubleSided(),
    }));

    // Gather textures
    const textures = root.listTextures().map((tex) => ({
      name: tex.getName() || '(unnamed)',
      mimeType: tex.getMimeType(),
      size: tex.getImage()?.byteLength ?? 0,
    }));

    // Gather animations
    const animations = root.listAnimations().map((anim) => ({
      name: anim.getName() || '(unnamed)',
      channels: anim.listChannels().length,
      samplers: anim.listSamplers().length,
    }));

    // Gather scenes
    const scenes = root.listScenes().map((scene) => ({
      name: scene.getName() || '(unnamed)',
      nodes: scene.listChildren().length,
    }));

    // Basic validation warnings
    if (meshes.length === 0) {
      errors.push('Model contains no meshes.');
    }
    if (totalVertices === 0) {
      errors.push('Model has zero vertices.');
    }

    const stats = {
      fileSize: stat.size,
      fileSizeMB: +(stat.size / 1024 / 1024).toFixed(2),
      meshCount: meshes.length,
      materialCount: materials.length,
      textureCount: textures.length,
      animationCount: animations.length,
      sceneCount: scenes.length,
      totalVertices,
      totalTriangles: Math.floor(totalTriangles),
      meshes: meshes.map((m) => m.getName() || '(unnamed)'),
      materials,
      textures,
      animations,
      scenes,
    };

    return {
      valid: errors.length === 0,
      errors,
      stats,
    };
  }

  /**
   * Quick validation — checks only that the file can be parsed as valid GLB/glTF.
   * Faster than `inspect()` when you only need a pass/fail result.
   *
   * @param {string} filePath
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  async validate(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: 'File not found.' };
    }

    const stat = fs.statSync(filePath);
    if (stat.size > MAX_GLB_SIZE) {
      return { valid: false, error: `File exceeds maximum size of ${MAX_GLB_SIZE / 1024 / 1024} MB.` };
    }

    try {
      await this._io.read(filePath);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}

/**
 * @typedef {object} ProcessorReport
 * @property {boolean} valid        Whether the GLB file is valid and has content
 * @property {string[]} errors      Validation errors or warnings
 * @property {object|null} stats    Asset statistics (null if file couldn't be parsed)
 * @property {number} stats.fileSize        File size in bytes
 * @property {number} stats.fileSizeMB      File size in MB
 * @property {number} stats.meshCount       Number of meshes
 * @property {number} stats.materialCount   Number of materials
 * @property {number} stats.textureCount    Number of textures
 * @property {number} stats.animationCount  Number of animations
 * @property {number} stats.sceneCount      Number of scenes
 * @property {number} stats.totalVertices   Total vertex count
 * @property {number} stats.totalTriangles  Total triangle count
 */
