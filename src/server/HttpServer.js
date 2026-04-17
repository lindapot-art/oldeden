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
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAssetUploadRouter } from './AssetUploadRouter.js';
import { logEvent } from './Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', '..', 'public');

/**
 * Create and configure the Express application.
 *
 * @param {object} [options]
 * @param {string} [options.uploadDir='uploads']  Root directory for uploaded files
 * @param {number} [options.maxFileSize]           Max upload size in bytes
 * @returns {{ app: express.Application, start: (port: number) => Promise<import('http').Server> }}
 */
export function createHttpServer({ uploadDir = 'uploads', maxFileSize, corsOrigins } = {}) {
  const app = express();
  app.disable('x-powered-by');

  // JSON body parsing for non-upload routes (capped at 512 KB)
  app.use(express.json({ limit: '512kb' }));

  // ── CORS for REST API ─────────────────────────────────────────────────────
  const allowedOrigins = corsOrigins || [
    'http://localhost:3847',
    'http://localhost:3000',
    'https://oldeden.onrender.com',
  ];
  app.use(cors({
    origin(origin, cb) {
      // Allow requests with no origin (same-origin, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error('CORS blocked'));
    },
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  }));

  // ── Security headers ──────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0'); // Deprecated but harmless
    // HSTS — only in production (breaks localhost HTTP)
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    // Content Security Policy — game uses inline scripts/styles so we need 'unsafe-inline'
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss: https://cdn.jsdelivr.net blob:",
      "worker-src 'self' blob:",
      "font-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '));
    next();
  });

  // ── REST API rate limiting ────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
  app.use('/api/game', apiLimiter);

  // ── Serve frontend static files ───────────────────────────────────────────
  app.use(express.static(publicDir));

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ── Log all requests (basic event logging) ──
  app.use((req, res, next) => {
    logEvent('request', `${req.method} ${req.url}`, { ip: req.ip });
    next();
  });

  // ── Static serving of uploaded assets ─────────────────────────────────────
  app.use('/assets', express.static(path.resolve(uploadDir)));

  // ── Asset upload API ──────────────────────────────────────────────────────
  app.use('/api/assets', createAssetUploadRouter({ uploadDir, maxFileSize }));

  // ── Log server start event ──
  logEvent('server', 'Express server initialized');

  /**
   * Add the SPA fallback — call AFTER registering game API routes in index.js.
   * Excludes /api/* routes so they properly return 404 instead of index.html.
   */
  function addFallback() {
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(publicDir, 'index.html'));
    });
    // Catch-all for unmatched API routes
    app.use('/api', (_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
    // Global error handler — catches unhandled Express errors and logs them
    app.use((err, req, res, _next) => {
      logEvent('error', err.message, { url: req.url, stack: err.stack });
      console.error('[Express] Unhandled error:', err.message);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Start the HTTP server on the given port.
   * If the port is busy, automatically tries the next port (up to maxRetries).
   * @param {number} port
   * @param {object} [opts]
   * @param {number} [opts.maxRetries=10]
   * @returns {Promise<import('http').Server>}
   */
  function start(port, { maxRetries = 10 } = {}) {
    return new Promise((resolve, reject) => {
      let attempt = 0;

      function tryListen(p) {
        const server = app.listen(p);

        server.once('listening', () => {
          if (p !== port) {
            console.log(`[HttpServer] Port ${port} was busy — auto-rotated to port ${p}`);
          }
          console.log(`[HttpServer] Listening on port ${p}`);
          resolve(server);
        });

        server.once('error', (err) => {
          server.close(); // Ensure handle is freed before retry
          if (err.code === 'EADDRINUSE' && attempt < maxRetries) {
            attempt++;
            const next = port + attempt;
            console.log(`[HttpServer] Port ${p} in use, trying ${next}…`);
            tryListen(next);
          } else {
            reject(err);
          }
        });
      }

      tryListen(port);
    });
  }

  return { app, start, addFallback };
}
