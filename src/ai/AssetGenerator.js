/**
 * AssetGenerator — ML-based procedural asset generation for Old Eden.
 *
 * This module acts as the client interface to the Python-based ML microservice
 * that runs Stable Diffusion and custom GANs for generating:
 *
 *   1. Character Phenotypes — translate genome bytes into a visual face/body description
 *      that is fed to the image generation pipeline.
 *
 *   2. Spaceship Hulls — from ship class + faction aesthetic → hull variant image + 3D prompt
 *
 *   3. Planet Surfaces — from biome + atmosphere → terrain texture
 *
 *   4. Quest Illustrations — from quest summary text → cinematic scene image
 *
 * The ML service runs at AI_SERVICE_URL (set in .env) and exposes a REST API.
 * All generation requests are asynchronous — the result is delivered via webhook
 * or polling.
 *
 * In development/testing, the service can be mocked to return placeholder URLs.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

export class AssetGenerator {
  /**
   * @param {object} [config]
   * @param {string} [config.serviceUrl]  Override AI service URL
   * @param {string} [config.apiKey]      API key for authentication
   * @param {boolean} [config.mock=false] Use mock responses (no network calls)
   */
  constructor({ serviceUrl, apiKey, mock = false } = {}) {
    this._serviceUrl = serviceUrl ?? process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
    this._apiKey     = apiKey ?? process.env.AI_SERVICE_API_KEY ?? '';
    this._mock       = mock;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate a character portrait URL from a genome.
   *
   * The genome's appearance cluster (bytes 128–159) is mapped to a text prompt
   * describing facial features, which is sent to the image generation service.
   *
   * @param {Uint8Array} genome
   * @param {object} [options]
   * @param {string} [options.style='realistic'] 'realistic'|'stylised'|'painterly'
   * @returns {Promise<GenerationResult>}
   */
  async generateCharacterPortrait(genome, { style = 'realistic' } = {}) {
    const prompt = this._genomeToPortraitPrompt(genome, style);
    return this._request('/generate/portrait', { prompt, style, seed: this._genomeSeed(genome) });
  }

  /**
   * Generate a spaceship hull image for a given ship class and faction.
   *
   * @param {object} params
   * @param {string} params.shipClass   'fighter'|'freighter'|'capital'|'shuttle'
   * @param {string} params.faction     Faction name (influences aesthetic)
   * @param {string} [params.style='sci-fi']
   * @returns {Promise<GenerationResult>}
   */
  async generateShipHull({ shipClass, faction, style = 'sci-fi' }) {
    const prompt = `A ${style} ${shipClass} spaceship hull design for the ${faction} faction in Old Eden. Detailed, high-quality 3D render concept art.`;
    return this._request('/generate/ship', { prompt, shipClass, faction });
  }

  /**
   * Generate a planet surface texture from biome data.
   *
   * @param {object} planet  Planet object from ProceduralGenerator
   * @returns {Promise<GenerationResult>}
   */
  async generatePlanetTexture(planet) {
    const prompt = `A ${planet.biome} alien planet surface texture with atmospheric density ${planet.atmosphereDensity}. ${planet.hasLife ? 'Signs of alien life visible.' : 'Barren and lifeless.'}`;
    return this._request('/generate/planet_texture', { prompt, biome: planet.biome });
  }

  /**
   * Generate a cinematic illustration for a quest hook.
   *
   * @param {import('../systems/ProceduralGenerator.js').QuestHook} quest
   * @returns {Promise<GenerationResult>}
   */
  async generateQuestIllustration(quest) {
    const prompt = `Cinematic space opera scene: ${quest.summary} Dark, dramatic lighting.`;
    return this._request('/generate/quest_art', { prompt, questId: quest.id });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  async _request(path, body) {
    if (this._mock) {
      return this._mockResponse(path, body);
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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
        throw new Error(`[AssetGenerator] HTTP ${response.status} from AI service at ${path}`);
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  _mockResponse(path, body) {
    return Promise.resolve({
      status: 'mock',
      url: `https://placeholder.oldeden.io${path}/${Date.now()}.png`,
      prompt: body.prompt ?? '',
      generatedAt: Date.now(),
    });
  }

  /**
   * Convert the appearance cluster of a genome into a portrait text prompt.
   * Bytes 128–159 encode visual traits that map to descriptive adjectives.
   *
   * @param {Uint8Array} genome
   * @param {string} style
   * @returns {string}
   */
  _genomeToPortraitPrompt(genome, style) {
    const skinTone = ['fair', 'olive', 'tan', 'dark', 'ashen', 'pale'][Math.floor(genome[128] / 43)];
    const faceShape = ['angular', 'round', 'narrow', 'broad', 'gaunt'][Math.floor(genome[129] / 52)];
    const eyeColor  = ['blue', 'green', 'brown', 'grey', 'amber', 'violet'][Math.floor(genome[130] / 43)];
    const hairStyle = ['short', 'long', 'shaved', 'braided', 'wild'][Math.floor(genome[131] / 52)];

    return `${style} portrait of a space colonist with ${skinTone} skin, ${faceShape} face, ${eyeColor} eyes, ${hairStyle} hair. Futuristic setting, dramatic lighting.`;
  }

  /**
   * Derive a deterministic seed integer from a genome for stable generation.
   * @param {Uint8Array} genome
   * @returns {number}
   */
  _genomeSeed(genome) {
    let seed = 0;
    for (let i = 0; i < Math.min(8, genome.length); i++) {
      seed = (seed * 256 + genome[i]) >>> 0;
    }
    return seed;
  }
}

/**
 * @typedef {object} GenerationResult
 * @property {string} status   'queued'|'complete'|'mock'
 * @property {string} url      URL of the generated asset
 * @property {string} [prompt] The prompt used for generation
 * @property {number} [generatedAt]
 */
