/**
 * AssetUploadRouter — Express router for uploading 3D models and game assets.
 *
 * Endpoints:
 *   POST /api/assets/models   — Upload 3D model files (GLB, GLTF, FBX, OBJ)
 *   POST /api/assets/textures — Upload texture/image files (PNG, JPG, WEBP, HDR)
 *   GET  /api/assets           — List uploaded assets
 *   DELETE /api/assets/:filename — Remove an uploaded asset
 *
 * All uploaded files are stored in the configurable upload directory
 * (default: uploads/) with unique filenames to prevent collisions.
 */

import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { GlbProcessor, SUPPORTED_EXTENSIONS as GLB_EXTENSIONS } from '../assets/GlbProcessor.js';

/** Allowed file extensions for 3D model uploads */
const MODEL_EXTENSIONS = new Set(['.glb', '.gltf', '.fbx', '.obj']);

/** Allowed file extensions for texture uploads */
const TEXTURE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.hdr']);

/**
 * Validate file extension from the original filename.
 * @param {Set<string>} allowedExtensions
 * @returns {(req: object, file: object, cb: Function) => void}
 */
function extensionFilter(allowedExtensions) {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${ext}" is not allowed. Accepted: ${[...allowedExtensions].join(', ')}`));
    }
  };
}

/**
 * Create the asset upload router.
 *
 * @param {object} [options]
 * @param {string} [options.uploadDir='uploads']  Directory for storing uploaded files
 * @param {number} [options.maxFileSize=150_000_000]  Max file size in bytes (default 150 MB)
 * @returns {Router}
 */
export function createAssetUploadRouter({ uploadDir = 'uploads', maxFileSize = 150_000_000 } = {}) {
  const router = Router();

  // Rate limit all asset routes: 100 requests per 15 minutes per IP
  router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  }));

  const modelsDir   = path.join(uploadDir, 'models');
  const texturesDir = path.join(uploadDir, 'textures');

  // Ensure directories exist
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(texturesDir, { recursive: true });

  // ── Storage configuration ────────────────────────────────────────────────

  function createStorage(subDir) {
    return multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, subDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path
          .basename(file.originalname, ext)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 100);
        cb(null, `${baseName}-${randomUUID()}${ext}`);
      },
    });
  }

  const modelUpload = multer({
    storage: createStorage(modelsDir),
    limits: { fileSize: maxFileSize },
    fileFilter: extensionFilter(MODEL_EXTENSIONS),
  });

  const textureUpload = multer({
    storage: createStorage(texturesDir),
    limits: { fileSize: maxFileSize },
    fileFilter: extensionFilter(TEXTURE_EXTENSIONS),
  });

  // ── Routes ────────────────────────────────────────────────────────────────

  /**
   * POST /api/assets/models
   * Upload one or more 3D model files.
   * Field name: "models"
   */
  const glbProcessor = new GlbProcessor();

  router.post('/models', modelUpload.array('models', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No model files provided. Use field name "models".' });
    }

    const uploaded = [];
    for (const f of req.files) {
      const entry = {
        originalName: f.originalname,
        filename: f.filename,
        size: f.size,
        path: `/assets/models/${f.filename}`,
      };

      // Run glTF-Transform inspection on GLB/glTF files
      const ext = path.extname(f.originalname).toLowerCase();
      if (GLB_EXTENSIONS.has(ext)) {
        try {
          const report = await glbProcessor.inspect(f.path);
          entry.glbReport = report;
        } catch (inspectErr) {
          console.error('[AssetUpload] GLB inspection failed:', inspectErr.message);
          entry.glbReport = { error: 'Inspection failed', detail: inspectErr.message };
        }
      }

      uploaded.push(entry);
    }

    res.status(201).json({ uploaded });
  });

  /**
   * POST /api/assets/textures
   * Upload one or more texture/image files.
   * Field name: "textures"
   */
  router.post('/textures', textureUpload.array('textures', 20), (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No texture files provided. Use field name "textures".' });
    }

    const uploaded = req.files.map((f) => ({
      originalName: f.originalname,
      filename: f.filename,
      size: f.size,
      path: `/assets/textures/${f.filename}`,
    }));

    res.status(201).json({ uploaded });
  });

  /**
   * GET /api/assets/models/:filename/inspect
   * Inspect a previously uploaded GLB/glTF model using glTF-Transform.
   * Returns mesh stats, materials, textures, animations, and validation info.
   */
  router.get('/models/:filename/inspect', async (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(modelsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const ext = path.extname(safeName).toLowerCase();
    if (!GLB_EXTENSIONS.has(ext)) {
      return res.status(400).json({ error: 'Only GLB/glTF files can be inspected.' });
    }

    const report = await glbProcessor.inspect(filePath);
    res.json({ filename: safeName, ...report });
  });

  /**
   * GET /api/assets
   * List all uploaded assets grouped by type.
   */
  router.get('/', (_req, res) => {
    const listDir = (dir) => {
      try {
        return fs.readdirSync(dir).map((name) => {
          const stat = fs.statSync(path.join(dir, name));
          return { name, size: stat.size, uploadedAt: stat.mtime.toISOString() };
        });
      } catch {
        return [];
      }
    };

    res.json({
      models: listDir(modelsDir),
      textures: listDir(texturesDir),
    });
  });

  /**
   * DELETE /api/assets/:type/:filename
   * Remove an uploaded asset by type (models|textures) and filename.
   */
  router.delete('/:type/:filename', (req, res) => {
    const { type, filename } = req.params;

    if (type !== 'models' && type !== 'textures') {
      return res.status(400).json({ error: 'Type must be "models" or "textures".' });
    }

    // Prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(uploadDir, type, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    fs.unlinkSync(filePath);
    res.json({ deleted: safeName });
  });

  // ── Error handler for multer errors ───────────────────────────────────────

  router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `File too large. Maximum size is ${maxFileSize} bytes.` });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  return router;
}
