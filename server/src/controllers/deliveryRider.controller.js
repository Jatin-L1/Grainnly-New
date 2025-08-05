import DeliveryRider from "../models/delivery.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const registerDeliveryRider = async (req, res) => {
  try {
    const { name, email, phone, profileImage, vehicleType, vehicleNumber, status, password } = req.body;

    // Check if required fields are provided
    if (!name || !email || !phone || !vehicleNumber || !vehicleType || !password) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if rider with same email or phone already exists
    const existingRider = await DeliveryRider.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingRider) {
      return res.status(409).json({
        success: false,
        message: "A rider with this email or phone already exists",
      });
    }

    // Create new rider with password (will be hashed by pre-save hook)
    const newRider = await DeliveryRider.create(req.body);

    // Generate tokens
    const accessToken = generateAccessToken(newRider);
    const refreshToken = generateRefreshToken(newRider);

    // Store refresh token in database
    newRider.refreshToken = refreshToken;
    await newRider.save();

    // Remove password from response data
    const riderObject = newRider.toObject();
    delete riderObject.password;
    delete riderObject.refreshToken;

    res.status(201).json({
      success: true,
      message: "Delivery rider registered successfully",
      data: {
        rider: riderObject,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Error in registerDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register delivery rider",
      error: error.message,
    });
  }
};

export const loginDeliveryRider = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }
    
    // Find rider with password included
    const rider = await DeliveryRider.findOne({ email }).select("+password");
      
    if (!rider) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    // Verify password
    const isPasswordValid = await rider.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(rider);
    const refreshToken = generateRefreshToken(rider);

    // Store refresh token in database
    rider.refreshToken = refreshToken;
    await rider.save();
    
    // Remove password from response
    const riderObject = rider.toObject();
    delete riderObject.password;
    delete riderObject.refreshToken;
    
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        rider: riderObject,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Error in loginDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
};

export const getDeliveryRider = async (req, res) => {
  try {
    const { riderId } = req.query;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    // Find rider
    const rider = await DeliveryRider.findById(riderId);
    
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found",
      });
    }

    res.status(200).json({
      success: true,
      data: rider,
    });
  } catch (error) {
    console.error("Error in getDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery rider",
      error: error.message,
    });
  }
};

export const getAllDeliveryRiders = async (req, res) => {
  try {
    const { 
      status, 
      limit = 10, 
      page = 1, 
      sortBy = 'createdAt',
      sortOrder = -1
    } = req.query;

    // Build query
    const query = {};
    if (status) query.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = parseInt(sortOrder);

    // Fetch riders with pagination and sorting
    const riders = await DeliveryRider.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalRiders = await DeliveryRider.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        riders,
        pagination: {
          total: totalRiders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalRiders / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllDeliveryRiders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery riders",
      error: error.message,
    });
  }
};

export const updateLocation = async (req, res) => {
  try {
    const { riderId } = req.query;
    const { coordinates } = req.body;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required",
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates [longitude, latitude] are required",
      });
    }

    // Update rider location
    const updatedRider = await DeliveryRider.findByIdAndUpdate(
      riderId,
      {
        destinationLocation: {
          type: "Point",
          coordinates: coordinates,
        },
      },
      { new: true }
    );

    if (!updatedRider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: updatedRider,
    });
  } catch (error) {
    console.error("Error in updateLocation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rider location",
      error: error.message,
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required"
      });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Find user with matching refresh token
    const rider = await DeliveryRider.findOne({
      _id: decoded.id,
      refreshToken: refreshToken
    });
    
    if (!rider) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken(rider);
    
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    console.error("Error in refreshAccessToken:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
      error: error.message
    });
  }
};

// Helper functions
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      role: 'rider'
    }, 
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

// Update rider profile
export const updateDeliveryRider = async (req, res) => {
  try {
    const { riderId } = req.query;
    const updateData = req.body;
    
    if (!riderId) {
      return res.status(400).json({
        success: false,
        message: "Rider ID is required"
      });
    }
    
    // Remove protected fields
    delete updateData.password;
    delete updateData.refreshToken;
    
    // Update rider
    const updatedRider = await DeliveryRider.findByIdAndUpdate(
      riderId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
    
    if (!updatedRider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Rider profile updated successfully",
      data: updatedRider
    });
  } catch (error) {
    console.error("Error in updateDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rider profile",
      error: error.message
    });
  }
};