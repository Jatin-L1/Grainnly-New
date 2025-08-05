import mongoose from 'mongoose';

const ShopkeeperSignupRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  shopLicense: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: String,
    trim: true
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  txHash: {
    type: String,
    trim: true
  },
  blockchainRegistered: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
ShopkeeperSignupRequestSchema.index({ walletAddress: 1 });
ShopkeeperSignupRequestSchema.index({ status: 1 });
ShopkeeperSignupRequestSchema.index({ area: 1 });

// Prevent re-compilation in development
const ShopkeeperSignupRequest = mongoose.models.ShopkeeperSignupRequest || mongoose.model('ShopkeeperSignupRequest', ShopkeeperSignupRequestSchema);

export default ShopkeeperSignupRequest;
