/**
 * FileStore — simple JSON file-based persistence for player saves.
 *
 * Writes player state to saves/{playerId}.json.
 * Bridge to MongoDB — swap this implementation later without changing callers.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_SAVE_SIZE = 102_400; // 100 KB max
const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export class FileStore {
  /**
   * @param {string} [saveDir='saves'] Directory for save files
   */
  constructor(saveDir = 'saves') {
    this._saveDir = path.resolve(saveDir);
  }

  async init() {
    await fs.mkdir(this._saveDir, { recursive: true });
  }

  /**
   * Save player data.
   * @param {string} playerId
   * @param {object} data
   */
  async save(playerId, data) {
    if (!VALID_ID.test(playerId)) throw new Error('Invalid player ID');
    const json = JSON.stringify(data);
    if (json.length > MAX_SAVE_SIZE) throw new Error('Save data too large');
    const filePath = path.join(this._saveDir, `${playerId}.json`);
    // Atomic write: temp file + rename prevents corruption from concurrent writes
    const tmpPath = filePath + '.tmp';
    await fs.writeFile(tmpPath, json, 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  /**
   * Load player data. Returns null if not found.
   * @param {string} playerId
   * @returns {object|null}
   */
  async load(playerId) {
    if (!VALID_ID.test(playerId)) return null;
    const filePath = path.join(this._saveDir, `${playerId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  /**
   * Delete a save file.
   * @param {string} playerId
   */
  async remove(playerId) {
    if (!VALID_ID.test(playerId)) return;
    const filePath = path.join(this._saveDir, `${playerId}.json`);
    await fs.unlink(filePath).catch(() => {});
  }
}
