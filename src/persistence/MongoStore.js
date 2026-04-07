/**
 * MongoStore — MongoDB/Mongoose persistence layer for Old Eden.
 *
 * Drop-in replacement for FileStore. Provides the same init/save/load interface
 * plus model-specific helpers for structured queries.
 */

import mongoose from 'mongoose';
import { Player } from './models/Player.js';
import { Character } from './models/Character.js';
import { NPC } from './models/NPC.js';
import { Sector } from './models/Sector.js';
import { Item } from './models/Item.js';

const VALID_ID = /^[a-zA-Z0-9_-]{1,64}$/;

export class MongoStore {
  /**
   * @param {string} [uri] MongoDB connection URI
   */
  constructor(uri) {
    this._uri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/oldeden';
    this._connected = false;
  }

  /**
   * Connect to MongoDB. Logs errors but does not throw — caller can check .connected.
   */
  async init() {
    try {
      await mongoose.connect(this._uri);
      this._connected = true;
      console.log(`[MongoStore] Connected to MongoDB at ${this._uri.replace(/\/\/[^@]+@/, '//***@')}`);
    } catch (err) {
      this._connected = false;
      console.error('[MongoStore] Failed to connect to MongoDB:', err.message);
      console.error('[MongoStore] Persistence will not work until MongoDB is available.');
    }
  }

  get connected() {
    return this._connected;
  }

  // ── Generic save/load (FileStore-compatible interface) ─────────────────────

  /**
   * Save arbitrary player data by ID (mirrors FileStore.save).
   * Stores as a Player document with raw data in a `_raw` field.
   */
  async save(playerId, data) {
    if (!VALID_ID.test(playerId)) throw new Error('Invalid player ID');
    // Recursively reject keys starting with $ to prevent NoSQL operator injection
    const sanitized = MongoStore._sanitize(data);
    await Player.findByIdAndUpdate(
      playerId,
      { $set: { ...sanitized, _id: playerId } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  static _sanitize(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => MongoStore._sanitize(v));
    const out = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith('$')) continue;
      out[key] = MongoStore._sanitize(val);
    }
    return out;
  }

  /**
   * Load arbitrary player data by ID (mirrors FileStore.load).
   * @returns {object|null}
   */
  async load(playerId) {
    if (!VALID_ID.test(playerId)) return null;
    const doc = await Player.findById(playerId).lean();
    return doc || null;
  }

  /**
   * Delete a player document.
   */
  async remove(playerId) {
    if (!VALID_ID.test(playerId)) return;
    await Player.findByIdAndDelete(playerId);
  }

  // ── Player helpers ─────────────────────────────────────────────────────────

  async findPlayer(playerId) {
    return Player.findById(playerId).lean();
  }

  async savePlayer(playerId, data) {
    return Player.findByIdAndUpdate(
      playerId,
      { $set: { ...data, _id: playerId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  // ── Character helpers ──────────────────────────────────────────────────────

  async findCharacter(characterId) {
    return Character.findById(characterId).lean();
  }

  async findCharactersByPlayer(playerId) {
    return Character.find({ playerId }).lean();
  }

  async saveCharacter(characterId, data) {
    return Character.findByIdAndUpdate(
      characterId,
      { $set: { ...data, _id: characterId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  // ── NPC helpers ────────────────────────────────────────────────────────────

  async findNPCsBySector(sectorId, limit = 100) {
    return NPC.find({ sectorId }).sort({ statusScore: -1 }).limit(limit).lean();
  }

  async saveNPC(npcData) {
    if (npcData._id) {
      return NPC.findByIdAndUpdate(npcData._id, { $set: npcData }, { upsert: true, new: true }).lean();
    }
    const doc = await NPC.create(npcData);
    return doc.toObject();
  }

  // ── Sector helpers ─────────────────────────────────────────────────────────

  async findSector(sectorId) {
    return Sector.findById(sectorId).lean();
  }

  async saveSector(sectorId, data) {
    return Sector.findByIdAndUpdate(
      sectorId,
      { $set: { ...data, _id: sectorId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }

  async listSectors() {
    return Sector.find().lean();
  }

  // ── Item helpers ───────────────────────────────────────────────────────────

  async findItem(itemId) {
    return Item.findById(itemId).lean();
  }

  async findItemsByOwner(ownerId) {
    return Item.find({ ownerId }).lean();
  }

  async saveItem(itemData) {
    if (itemData._id) {
      return Item.findByIdAndUpdate(itemData._id, { $set: itemData }, { upsert: true, new: true }).lean();
    }
    const doc = await Item.create(itemData);
    return doc.toObject();
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  async close() {
    if (this._connected) {
      await mongoose.disconnect();
      this._connected = false;
      console.log('[MongoStore] Disconnected from MongoDB.');
    }
  }
}
