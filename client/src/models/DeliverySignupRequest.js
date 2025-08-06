import mongoose from 'mongoose';

const DeliverySignupRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['bicycle', 'motorcycle', 'car', 'van', 'truck'],
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    trim: true
  },
  walletAddress: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum wallet address format'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  // Add this field to your existing schema (if not already present)

// ...existing code...

blockchainTxHash: {
  type: String,
  default: null
},

// ...rest of your schema...
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String // Admin ID or name
  }
}, {
  timestamps: true
});

// Index for faster queries
DeliverySignupRequestSchema.index({ status: 1, submittedAt: -1 });
DeliverySignupRequestSchema.index({ licenseNumber: 1 }, { unique: true });
DeliverySignupRequestSchema.index({ walletAddress: 1 }, { unique: true });

export default mongoose.models.DeliverySignupRequest || mongoose.model('DeliverySignupRequest', DeliverySignupRequestSchema);