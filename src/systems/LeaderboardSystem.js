// LeaderboardSystem.js — tracks and serves top player scores
import { MongoClient } from 'mongodb';

export class LeaderboardSystem {
  constructor(engine) {
    this.engine = engine;
    this.db = null;
    this.collection = null;
  }

  /**
   * Initialize the leaderboard system.
   * If called with a string, treat as MongoDB URI. If called with engine, skip DB.
   */
  async init(arg, dbName = 'oldeden') {
    if (typeof arg === 'string' && arg.length > 0) {
      if (!this.db) {
        const client = new MongoClient(arg, { useUnifiedTopology: true });
        await client.connect();
        this.db = client.db(dbName);
        this.collection = this.db.collection('leaderboard');
      }
    } else {
      // Called by engine with engine instance; skip DB connection
    }
  }

  // Update or insert player score
  async submitScore(playerId, name, score, kills, credits) {
    if (!this.collection) return;
    await this.collection.updateOne(
      { playerId },
      { $set: { name, score, kills, credits, updated: new Date() } },
      { upsert: true }
    );
  }

  // Get top N scores
  async getTopScores(limit = 10) {
    if (!this.collection) return [];
    return this.collection.find({}).sort({ score: -1 }).limit(limit).toArray();
  }

  // Get a player's rank and score
  async getPlayerRank(playerId) {
    if (!this.collection) return null;
    const all = await this.collection.find({}).sort({ score: -1 }).toArray();
    const idx = all.findIndex(e => e.playerId === playerId);
    return idx === -1 ? null : { rank: idx + 1, ...all[idx] };
  }
}
