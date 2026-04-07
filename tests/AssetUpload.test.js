/**
 * Tests for the asset upload HTTP endpoints.
 *
 * Uses supertest to drive the Express app without starting a real server.
 */

import { jest } from '@jest/globals';
import { createHttpServer } from '../src/server/HttpServer.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Dynamic import of supertest so tests can run even if it's a devDep
let request;

beforeAll(async () => {
  const mod = await import('supertest');
  request = mod.default;
});

describe('Asset Upload API', () => {
  let app;
  let uploadDir;
  const TEST_API_KEY = 'test-admin-key-12345';

  beforeEach(() => {
    process.env.ADMIN_API_KEY = TEST_API_KEY;
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oldeden-upload-'));
    ({ app } = createHttpServer({ uploadDir, maxFileSize: 10_000_000 }));
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  // ── Health check ──────────────────────────────────────────────────────────

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // ── Model uploads ─────────────────────────────────────────────────────────

  test('POST /api/assets/models accepts a .glb file', async () => {
    const glbBuffer = Buffer.alloc(1024, 0x67); // Fake GLB content

    const res = await request(app)
      .post('/api/assets/models')
      .attach('models', glbBuffer, 'spaceship.glb');

    expect(res.status).toBe(201);
    expect(res.body.uploaded).toHaveLength(1);
    expect(res.body.uploaded[0].originalName).toBe('spaceship.glb');
    expect(res.body.uploaded[0].size).toBe(1024);
    expect(res.body.uploaded[0].path).toMatch(/^\/assets\/models\/spaceship-/);

    // File actually saved to disk
    const savedFiles = fs.readdirSync(path.join(uploadDir, 'models'));
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0]).toMatch(/^spaceship-.+\.glb$/);
  });

  test('POST /api/assets/models accepts multiple files', async () => {
    const buf1 = Buffer.alloc(512, 0x01);
    const buf2 = Buffer.alloc(256, 0x02);

    const res = await request(app)
      .post('/api/assets/models')
      .attach('models', buf1, 'ship1.glb')
      .attach('models', buf2, 'station.gltf');

    expect(res.status).toBe(201);
    expect(res.body.uploaded).toHaveLength(2);
  });

  test('POST /api/assets/models rejects non-model file extensions', async () => {
    const buf = Buffer.alloc(64);

    const res = await request(app)
      .post('/api/assets/models')
      .attach('models', buf, 'malware.exe');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not allowed/i);
  });

  test('POST /api/assets/models returns 400 when no files sent', async () => {
    const res = await request(app)
      .post('/api/assets/models')
      .send();

    // Multer with no files → empty files array → 400
    expect(res.status).toBe(400);
  });

  // ── Texture uploads ───────────────────────────────────────────────────────

  test('POST /api/assets/textures accepts a .png file', async () => {
    const pngBuffer = Buffer.alloc(2048, 0x89);

    const res = await request(app)
      .post('/api/assets/textures')
      .attach('textures', pngBuffer, 'terrain.png');

    expect(res.status).toBe(201);
    expect(res.body.uploaded).toHaveLength(1);
    expect(res.body.uploaded[0].originalName).toBe('terrain.png');

    const savedFiles = fs.readdirSync(path.join(uploadDir, 'textures'));
    expect(savedFiles).toHaveLength(1);
  });

  test('POST /api/assets/textures rejects unsupported formats', async () => {
    const buf = Buffer.alloc(64);

    const res = await request(app)
      .post('/api/assets/textures')
      .attach('textures', buf, 'document.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not allowed/i);
  });

  // ── Listing ───────────────────────────────────────────────────────────────

  test('GET /api/assets lists uploaded files', async () => {
    // Upload a model first
    const buf = Buffer.alloc(128, 0x01);
    await request(app).post('/api/assets/models').attach('models', buf, 'test.glb');

    const res = await request(app).get('/api/assets');
    expect(res.status).toBe(200);
    expect(res.body.models).toHaveLength(1);
    expect(res.body.models[0].name).toMatch(/^test-.+\.glb$/);
    expect(res.body.textures).toHaveLength(0);
  });

  // ── Deletion ──────────────────────────────────────────────────────────────

  test('DELETE /api/assets/:type/:filename removes the file', async () => {
    const buf = Buffer.alloc(128, 0x01);
    const uploadRes = await request(app)
      .post('/api/assets/models')
      .attach('models', buf, 'deleteme.glb');

    const filename = uploadRes.body.uploaded[0].filename;

    const delRes = await request(app).delete(`/api/assets/models/${filename}`).set('x-api-key', TEST_API_KEY);
    expect(delRes.status).toBe(200);
    expect(delRes.body.deleted).toBe(filename);

    // Verify it's gone
    const savedFiles = fs.readdirSync(path.join(uploadDir, 'models'));
    expect(savedFiles).toHaveLength(0);
  });

  test('DELETE /api/assets/:type/:filename returns 404 for missing file', async () => {
    const res = await request(app).delete('/api/assets/models/nonexistent.glb').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(404);
  });

  test('DELETE /api/assets/:type/:filename rejects invalid type', async () => {
    const res = await request(app).delete('/api/assets/scripts/evil.js').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(400);
  });

  // ── Directory traversal prevention ────────────────────────────────────────

  test('DELETE /api/assets/:type/:filename prevents directory traversal', async () => {
    const res = await request(app).delete('/api/assets/models/..%2F..%2Fpackage.json').set('x-api-key', TEST_API_KEY);
    expect(res.status).toBe(404); // path.basename strips traversal
  });

  test('DELETE /api/assets/:type/:filename rejects without API key', async () => {
    const res = await request(app).delete('/api/assets/models/anything.glb');
    expect(res.status).toBe(401);
  });

  // ── Static file serving ───────────────────────────────────────────────────

  test('GET /assets/models/:filename serves uploaded file', async () => {
    const buf = Buffer.from('fake-glb-content');
    const uploadRes = await request(app)
      .post('/api/assets/models')
      .attach('models', buf, 'serve-test.glb');

    const filename = uploadRes.body.uploaded[0].filename;

    const res = await request(app)
      .get(`/assets/models/${filename}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.body.toString()).toBe('fake-glb-content');
  });
});
