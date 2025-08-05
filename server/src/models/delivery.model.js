import mongoose from "mongoose";
import bcrypt from "bcrypt";
const { Schema } = mongoose;

const pointSchema = new Schema({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const deliveryRiderSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't include password in query results by default
    },
    profileImage: {
      type: String,
      default: "",
    },
    destinationLocation: {
      type: pointSchema,
      index: "2dsphere",  
    },
    status: {
      type: String,
      enum: ["available", "busy", "offline", "suspended"],
      default: "offline",
    },
    vehicleType: {
      type: String,
      enum: ["ship", "car", "truck"],
      default: "truck",
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    refreshToken: {
      type: String,
      select: false,
    }
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
deliveryRiderSchema.pre("save", async function(next) {
  // Only hash the password if it's been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
deliveryRiderSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Find nearby riders
deliveryRiderSchema.statics.findNearbyRiders = function(coordinates, maxDistance = 5000) {
  return this.find({
    destinationLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: coordinates
        },
        $maxDistance: maxDistance // in meters
      }
    },
    status: "available"
  });
};

const DeliveryRider = mongoose.model("DeliveryRider", deliveryRiderSchema);

export default DeliveryRider;