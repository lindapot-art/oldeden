import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema({
  _id: { type: String },                      // characterId (UUID)
  playerId: { type: String, required: true, index: true },
  name: { type: String, maxlength: 32, default: 'Unnamed' },
  faction: { type: String, default: 'free_traders' },
  genome: { type: [Number], default: [] },     // genetic data array
  stats: {
    hull: { type: Number, default: 100 },
    shields: { type: Number, default: 50 },
    speed: { type: Number, default: 1 },
    firepower: { type: Number, default: 1 },
    luck: { type: Number, default: 1 },
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
    sectorId: { type: String, default: null },
  },
  skills: { type: Map, of: Number, default: {} },   // skillId → level
  inventory: [{ type: String }],                     // item IDs
  rebirthCount: { type: Number, default: 0 },
  alive: { type: Boolean, default: true },
}, {
  timestamps: true,
  collection: 'characters',
});

characterSchema.index({ faction: 1 });
characterSchema.index({ 'position.sectorId': 1 });

export const Character = mongoose.model('Character', characterSchema);
