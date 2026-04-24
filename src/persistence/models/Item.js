import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  name: { type: String, maxlength: 64, required: true },
  type: {
    type: String,
    enum: ['weapon', 'shield', 'engine', 'hull', 'consumable', 'cosmetic', 'material', 'quest'],
    required: true,
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
    default: 'common',
  },
  stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  ownerId: { type: String, default: null, index: true },   // playerId or null (unowned/shop)
  isNFT: { type: Boolean, default: false },
  tokenId: { type: String, default: null },                 // on-chain token ID if NFT
  contractAddress: { type: String, default: null },
  stackable: { type: Boolean, default: false },
  quantity: { type: Number, default: 1 },
}, {
  timestamps: true,
  collection: 'items',
});

itemSchema.index({ type: 1, rarity: 1 });
itemSchema.index({ isNFT: 1 }, { sparse: true });

export const Item = mongoose.model('Item', itemSchema);
