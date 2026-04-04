import mongoose from 'mongoose';

const npcSchema = new mongoose.Schema({
  name: { type: String, maxlength: 64 },
  sectorId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['merchant', 'pirate', 'patrol', 'quest_giver', 'civilian'],
    default: 'civilian',
  },
  statusScore: { type: Number, default: 0, index: true },
  genome: { type: [Number], default: [] },
  lifecycle: {
    type: String,
    enum: ['spawned', 'active', 'idle', 'despawning', 'dead'],
    default: 'spawned',
  },
  stats: {
    hull: { type: Number, default: 50 },
    shields: { type: Number, default: 20 },
    speed: { type: Number, default: 1 },
    firepower: { type: Number, default: 1 },
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
  },
  faction: { type: String, default: null },
}, {
  timestamps: true,
  collection: 'npcs',
});

npcSchema.index({ sectorId: 1, statusScore: -1 });

export const NPC = mongoose.model('NPC', npcSchema);
