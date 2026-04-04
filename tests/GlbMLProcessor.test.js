/**
 * Tests for GlbMLProcessor — ML-enhanced GLB asset processing.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GlbMLProcessor } from '../src/ai/GlbMLProcessor.js';

describe('GlbMLProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new GlbMLProcessor({ mock: true });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const proc = new GlbMLProcessor();
      expect(proc).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const proc = new GlbMLProcessor({
        serviceUrl: 'http://custom:9000',
        apiKey: 'test-key',
        maxFileSize: 1000000,
      });
      expect(proc).toBeDefined();
    });

    it('should support mock mode', () => {
      const proc = new GlbMLProcessor({ mock: true });
      expect(proc._mock).toBe(true);
    });
  });

  describe('Procedural Generation', () => {
    it('should generate ship model from description', async () => {
      const result = await processor.generateShipModel({
        description: 'A sleek fighter ship',
        shipClass: 'fighter',
        faction: 'Vanguard',
        polyCount: 10000,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.type).toBe('ship');
      expect(result.url).toContain('ship');
      expect(result.polyCount).toBeDefined();
    });

    it('should generate character model from genome', async () => {
      const genome = new Uint8Array(256);
      genome[0] = 128; // height
      genome[1] = 150; // build
      genome[128] = 100; // skin tone

      const result = await processor.generateCharacterModel(genome);

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.type).toBe('character');
    });

    it('should generate environment props', async () => {
      const result = await processor.generateEnvironmentProp({
        type: 'asteroid',
        attributes: { size: 'large', composition: 'metallic' },
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.type).toBe('prop');
    });

    it('should handle different ship classes', async () => {
      const classes = ['fighter', 'freighter', 'capital', 'shuttle'];

      for (const shipClass of classes) {
        const result = await processor.generateShipModel({
          description: `Test ${shipClass}`,
          shipClass,
          faction: 'TestFaction',
        });

        expect(result).toBeDefined();
        expect(result.status).toBe('mock');
      }
    });
  });

  describe('Model Optimization', () => {
    it('should optimize model mesh', async () => {
      const result = await processor.optimizeModel('/path/to/model.glb', {
        targetPolyCount: 5000,
        qualityThreshold: 0.95,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.originalPolyCount).toBeGreaterThan(0);
      expect(result.optimizedPolyCount).toBeLessThanOrEqual(result.originalPolyCount);
      expect(result.reduction).toBeGreaterThan(0);
      expect(result.qualityScore).toBe(0.95);
    });

    it('should generate LOD variants', async () => {
      const result = await processor.generateLODs('/path/to/model.glb', {
        lodLevels: [0.5, 0.25, 0.1],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.lods).toHaveLength(3);

      result.lods.forEach((lod, i) => {
        expect(lod.level).toBe(i + 1);
        expect(lod.reductionRatio).toBeGreaterThan(0);
        expect(lod.path).toContain(`lod${i + 1}`);
      });
    });

    it('should handle custom LOD levels', async () => {
      const customLevels = [0.75, 0.5, 0.25, 0.1];
      const result = await processor.generateLODs('/path/to/model.glb', {
        lodLevels: customLevels,
      });

      expect(result.lods).toHaveLength(customLevels.length);
    });
  });

  describe('Quality Assessment', () => {
    it('should assess model quality', async () => {
      const result = await processor.assessQuality('/path/to/model.glb');

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(1);
      expect(result.details).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should validate asset against requirements', async () => {
      const result = await processor.validateAsset('/path/to/model.glb', {
        maxPolyCount: 50000,
        maxTextureSize: 2048,
        maxMaterials: 5,
        requiresRigging: false,
      });

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
      expect(result.issues).toBeInstanceOf(Array);
      expect(result.inspection).toBeDefined();
      expect(result.requirements).toBeDefined();
    });

    it('should flag models exceeding poly count', async () => {
      // Mock a model with high poly count
      processor._glbProcessor.inspect = jest.fn().mockResolvedValue({
        polyCount: 100000,
        materials: [],
      });

      const result = await processor.validateAsset('/path/to/model.glb', {
        maxPolyCount: 50000,
      });

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].severity).toBe('error');
    });

    it('should validate models within requirements', async () => {
      processor._glbProcessor.inspect = jest.fn().mockResolvedValue({
        polyCount: 15000,
        materials: [{ name: 'Material1' }, { name: 'Material2' }],
      });

      const result = await processor.validateAsset('/path/to/model.glb', {
        maxPolyCount: 50000,
        maxMaterials: 5,
      });

      expect(result.valid).toBe(true);
      expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Style Transfer', () => {
    it('should apply faction style to model', async () => {
      const result = await processor.applyFactionStyle(
        '/path/to/model.glb',
        'Vanguard',
        { intensity: 0.8 }
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.faction).toBe('Vanguard');
      expect(result.intensity).toBe(0.8);
      expect(result.outputPath).toContain('vanguard');
    });

    it('should handle different factions', async () => {
      const factions = ['Vanguard', 'Corsairs', 'Traders Guild', 'Commonwealth'];

      for (const faction of factions) {
        const result = await processor.applyFactionStyle(
          '/path/to/model.glb',
          faction
        );

        expect(result).toBeDefined();
        expect(result.faction).toBe(faction);
      }
    });

    it('should support different intensity levels', async () => {
      const intensities = [0.3, 0.5, 0.7, 1.0];

      for (const intensity of intensities) {
        const result = await processor.applyFactionStyle(
          '/path/to/model.glb',
          'TestFaction',
          { intensity }
        );

        expect(result.intensity).toBe(intensity);
      }
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple files in batch', async () => {
      const files = [
        '/path/to/model1.glb',
        '/path/to/model2.glb',
        '/path/to/model3.glb',
      ];

      const result = await processor.batchProcess(files, 'optimize', {
        targetPolyCount: 5000,
      });

      expect(result).toBeDefined();
      expect(result.status).toBe('mock');
      expect(result.totalFiles).toBe(files.length);
      expect(result.successful).toBe(files.length);
      expect(result.failed).toBe(0);
    });

    it('should handle different batch operations', async () => {
      const files = ['/path/to/model.glb'];
      const operations = ['optimize', 'assess', 'generate_lods'];

      for (const operation of operations) {
        const result = await processor.batchProcess(files, operation);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Genome Trait Extraction', () => {
    it('should extract traits from genome', () => {
      const genome = new Uint8Array(256);
      genome[0] = 128;
      genome[1] = 200;
      genome[2] = 100;
      genome[3] = 150;
      genome[4] = 180;
      genome[128] = 120;

      const traits = processor._extractGenomeTraits(genome);

      expect(traits).toBeDefined();
      expect(traits.height).toBeCloseTo(128 / 255);
      expect(traits.build).toBeCloseTo(200 / 255);
      expect(traits.skinTone).toBe(120);
      expect(traits.musculature).toBeCloseTo(100 / 255);
      expect(traits.proportions).toBeDefined();
    });

    it('should handle edge case genomes', () => {
      const genome = new Uint8Array(256);
      genome.fill(0);

      const traits = processor._extractGenomeTraits(genome);

      expect(traits.height).toBe(0);
      expect(traits.build).toBe(0);
      expect(traits.skinTone).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in non-mock mode', async () => {
      const proc = new GlbMLProcessor({ mock: false, serviceUrl: 'http://invalid:9999' });

      await expect(
        proc.generateShipModel({
          description: 'test',
          shipClass: 'fighter',
          faction: 'test',
        })
      ).rejects.toThrow();
    });

    it('should handle timeout scenarios', async () => {
      const proc = new GlbMLProcessor({ mock: false });

      // Mock fetch to delay
      global.fetch = jest.fn(() =>
        new Promise((resolve) => setTimeout(resolve, 100000))
      );

      await expect(
        proc._request('/test', {}, 100)
      ).rejects.toThrow('timed out');
    });
  });

  describe('File Size Validation', () => {
    it('should respect max file size setting', () => {
      const smallLimit = new GlbMLProcessor({ maxFileSize: 1000 });
      const largeLimit = new GlbMLProcessor({ maxFileSize: 1000000000 });

      expect(smallLimit._maxFileSize).toBe(1000);
      expect(largeLimit._maxFileSize).toBe(1000000000);
    });

    it('should use default max file size (500MB)', () => {
      const proc = new GlbMLProcessor();
      expect(proc._maxFileSize).toBe(500_000_000);
    });
  });
});
