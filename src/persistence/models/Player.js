import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  _id: { type: String },                    // playerId (UUID)
  name: { type: String, maxlength: 32, default: 'Unknown Pilot' },
  wallet: {
    ec: { type: Number, default: 0 },       // energy credits
    sm: { type: Number, default: 0 },       // stardust marks
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'supporter', 'prime', 'ascended'],
    default: 'free',
  },
  reputation: { type: Map, of: Number, default: {} },  // factionId → score
  walletAddress: { type: String, default: null },       // Polygon wallet
  lastLogin: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'players',
});

playerSchema.index({ walletAddress: 1 }, { sparse: true });

export const Player = mongoose.model('Player', playerSchema);
