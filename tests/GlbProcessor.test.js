/**
 * Tests for the GlbProcessor module.
 *
 * Validates GLB/glTF inspection and validation using gltf-transform.
 */

import { jest } from '@jest/globals';
import { GlbProcessor, SUPPORTED_EXTENSIONS } from '../src/assets/GlbProcessor.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Build a minimal valid GLB binary (glTF 2.0).
 * Contains a single scene with one mesh (a triangle).
 */
function createMinimalGlb() {
  const gltfJson = JSON.stringify({
    asset: { version: '2.0', generator: 'OldEden-Test' },
    scene: 0,
    scenes: [{ name: 'TestScene', nodes: [0] }],
    nodes: [{ name: 'TriangleNode', mesh: 0 }],
    meshes: [{
      name: 'TriangleMesh',
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0,
      }],
    }],
    materials: [{ name: 'TestMaterial', pbrMetallicRoughness: {} }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: 3,
        type: 'VEC3',
        max: [1, 1, 0],
        min: [0, 0, 0],
      },
      {
        bufferView: 1,
        componentType: 5123, // UNSIGNED_SHORT
        count: 3,
        type: 'SCALAR',
        max: [2],
        min: [0],
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
      { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 },
    ],
    buffers: [{ byteLength: 44 }],
  });

  // Pad JSON to 4-byte boundary
  const jsonPadded = gltfJson + ' '.repeat((4 - (gltfJson.length % 4)) % 4);
  const jsonBuf = Buffer.from(jsonPadded, 'utf8');

  // Binary data: 3 vertices (VEC3 float) + 3 indices (unsigned short) + padding
  const binData = Buffer.alloc(44);
  // Vertex 0: (0, 0, 0)
  binData.writeFloatLE(0, 0);
  binData.writeFloatLE(0, 4);
  binData.writeFloatLE(0, 8);
  // Vertex 1: (1, 0, 0)
  binData.writeFloatLE(1, 12);
  binData.writeFloatLE(0, 16);
  binData.writeFloatLE(0, 20);
  // Vertex 2: (0, 1, 0)
  binData.writeFloatLE(0, 24);
  binData.writeFloatLE(1, 28);
  binData.writeFloatLE(0, 32);
  // Indices: 0, 1, 2
  binData.writeUInt16LE(0, 36);
  binData.writeUInt16LE(1, 38);
  binData.writeUInt16LE(2, 40);
  // 2 bytes padding to align to 4
  binData.writeUInt8(0, 42);
  binData.writeUInt8(0, 43);

  // Pad bin to 4 bytes
  const binPadded = binData.length % 4 === 0 ? binData : Buffer.concat([binData, Buffer.alloc(4 - (binData.length % 4))]);

  // GLB header: magic + version + length
  const totalLength = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);          // version
  header.writeUInt32LE(totalLength, 8);

  // JSON chunk header
  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

  // BIN chunk header
  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binPadded.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonChunkHeader, jsonBuf, binChunkHeader, binPadded]);
}

describe('GlbProcessor', () => {
  let tmpDir;
  let processor;

  beforeAll(() => {
    processor = new GlbProcessor();
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glb-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── SUPPORTED_EXTENSIONS ──────────────────────────────────────────────────

  test('exports SUPPORTED_EXTENSIONS with .glb and .gltf', () => {
    expect(SUPPORTED_EXTENSIONS.has('.glb')).toBe(true);
    expect(SUPPORTED_EXTENSIONS.has('.gltf')).toBe(true);
  });

  // ── inspect() ─────────────────────────────────────────────────────────────

  test('inspect() returns valid report for a minimal GLB', async () => {
    const glbPath = path.join(tmpDir, 'test.glb');
    fs.writeFileSync(glbPath, createMinimalGlb());

    const report = await processor.inspect(glbPath);

    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.stats).not.toBeNull();
    expect(report.stats.meshCount).toBe(1);
    expect(report.stats.totalVertices).toBe(3);
    expect(report.stats.totalTriangles).toBe(1);
    expect(report.stats.materialCount).toBe(1);
    expect(report.stats.sceneCount).toBe(1);
    expect(report.stats.fileSize).toBeGreaterThan(0);
    expect(report.stats.fileSizeMB).toBeGreaterThanOrEqual(0);
  });

  test('inspect() returns error for nonexistent file', async () => {
    const report = await processor.inspect('/nonexistent/path.glb');

    expect(report.valid).toBe(false);
    expect(report.errors).toContain('File not found.');
    expect(report.stats).toBeNull();
  });

  test('inspect() returns error for invalid GLB content', async () => {
    const badPath = path.join(tmpDir, 'bad.glb');
    fs.writeFileSync(badPath, Buffer.from('this is not a GLB file'));

    const report = await processor.inspect(badPath);

    expect(report.valid).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors[0]).toMatch(/Failed to parse/);
    expect(report.stats).toBeNull();
  });

  // ── validate() ────────────────────────────────────────────────────────────

  test('validate() returns valid for a proper GLB', async () => {
    const glbPath = path.join(tmpDir, 'valid.glb');
    fs.writeFileSync(glbPath, createMinimalGlb());

    const result = await processor.validate(glbPath);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('validate() returns invalid for corrupt file', async () => {
    const badPath = path.join(tmpDir, 'corrupt.glb');
    fs.writeFileSync(badPath, Buffer.alloc(64, 0xFF));

    const result = await processor.validate(badPath);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('validate() returns error for missing file', async () => {
    const result = await processor.validate('/does/not/exist.glb');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('File not found.');
  });
});
