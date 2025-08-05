import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ConsumerSignupRequestSchema = new mongoose.Schema({
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
  homeAddress: {
    type: String,
    required: true,
    trim: true
  },
  rationCardId: {
    type: String,
    required: true,
    trim: true
  },
  aadharNumber: {
    type: String,
    required: true,
    trim: true,
    length: 12
  },
  pin: {
    type: String,
    required: true
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
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: String // Admin ID or name
  },
  processedAt: {
    type: Date
  },
  txHash: {
    type: String
  },
  rejectionReason: {
    type: String
  }
}, {
  timestamps: true
});

// Hash PIN before saving
ConsumerSignupRequestSchema.pre('save', async function(next) {
  if (!this.isModified('pin')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare PIN
ConsumerSignupRequestSchema.methods.comparePin = async function(candidatePin) {
  return await bcrypt.compare(candidatePin, this.pin);
};

// Index for faster queries
ConsumerSignupRequestSchema.index({ status: 1, submittedAt: -1 });
ConsumerSignupRequestSchema.index({ phone: 1 }, { unique: true });
ConsumerSignupRequestSchema.index({ rationCardId: 1 }, { unique: true });
ConsumerSignupRequestSchema.index({ aadharNumber: 1 }, { unique: true });

export default mongoose.models.ConsumerSignupRequest || mongoose.model('ConsumerSignupRequest', ConsumerSignupRequestSchema);