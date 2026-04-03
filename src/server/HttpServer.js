/**
 * HttpServer — Express HTTP server for Old Eden.
 *
 * Provides REST API endpoints for:
 *   - Asset uploads (3D models, textures) via /api/assets
 *   - Static file serving from the uploads directory
 *   - Health check at GET /health
 *
 * Designed to run alongside the GameEngine and be initialised from index.js.
 */

import express from 'express';
import path from 'node:path';
import { createAssetUploadRouter } from './AssetUploadRouter.js';

/**
 * Create and configure the Express application.
 *
 * @param {object} [options]
 * @param {string} [options.uploadDir='uploads']  Root directory for uploaded files
 * @param {number} [options.maxFileSize]           Max upload size in bytes
 * @returns {{ app: express.Application, start: (port: number) => Promise<import('http').Server> }}
 */
export function createHttpServer({ uploadDir = 'uploads', maxFileSize } = {}) {
  const app = express();

  // JSON body parsing for non-upload routes
  app.use(express.json());

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // ── Static serving of uploaded assets ─────────────────────────────────────
  app.use('/assets', express.static(path.resolve(uploadDir)));

  // ── Asset upload API ──────────────────────────────────────────────────────
  app.use('/api/assets', createAssetUploadRouter({ uploadDir, maxFileSize }));

  /**
   * Start the HTTP server on the given port.
   * @param {number} port
   * @returns {Promise<import('http').Server>}
   */
  function start(port) {
    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        console.log(`[HttpServer] Listening on port ${port}`);
        resolve(server);
      });
    });
  }

  return { app, start };
}
