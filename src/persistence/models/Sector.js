import mongoose from 'mongoose';

const sectorSchema = new mongoose.Schema({
  _id: { type: String },                               // sector/system ID
  name: { type: String, maxlength: 64 },
  seed: { type: Number, default: 0 },                  // procedural seed
  type: {
    type: String,
    enum: ['star', 'nebula', 'asteroid_field', 'void', 'station'],
    default: 'star',
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    z: { type: Number, default: 0 },
  },
  resources: { type: Map, of: Number, default: {} },   // resourceType → amount
  hazardLevel: { type: Number, default: 0, min: 0, max: 10 },
  controllingFaction: { type: String, default: null },
  connections: [{ type: String }],                      // linked sector IDs
  modifications: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
  collection: 'sectors',
});

sectorSchema.index({ controllingFaction: 1 });

export const Sector = mongoose.model('Sector', sectorSchema);
