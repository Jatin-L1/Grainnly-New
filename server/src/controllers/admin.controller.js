import Admin from "../models/admin.model.js";
import DeliveryRider from "../models/delivery.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Authentication Controllers
export const registerAdmin = async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ username }, { email }]
    });
    
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Username or email already in use"
      });
    }
    
    // Create new admin
    const newAdmin = await Admin.create({
      username,
      email,
      password, // Will be hashed by pre-save hook
      avatar: avatar || "https://via.placeholder.com/150"
    });
    
    // Generate access token
    const accessToken = generateAccessToken(newAdmin);
    
    // Remove password from response
    newAdmin.password = undefined;
    
    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        admin: newAdmin,
        accessToken
      }
    });
  } catch (error) {
    console.error("Error in registerAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register admin",
      error: error.message
    });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }
    
    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username },
        { email: username } // Allow login with email too
      ]
    }).select("+password"); // Include password for verification
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }
    
    // Verify password
    const isPasswordValid = await admin.isPasswordCorrect(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);
    
    // Remove password from response
    admin.password = undefined;
    
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Error in loginAdmin:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Error in logout:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message
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
    
    // Verify token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    if (!decoded || !decoded.id || decoded.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }
    
    // Find admin by id
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(admin);
    
    res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        accessToken
      }
    });
  } catch (error) {
    console.error("Error in refreshAccessToken:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message
    });
  }
};

// Delivery Rider Management
export const getAllDeliveryRiders = async (req, res) => {
  try {
    const { 
      status, 
      limit = 10, 
      page = 1, 
      sortBy = 'createdAt',
      sortOrder = -1,
      search
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by status
    if (status) query.status = status;
    
    // Search by name, email or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = parseInt(sortOrder);
    
    // Fetch riders
    const riders = await DeliveryRider.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCount = await DeliveryRider.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        riders,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Error in getAllDeliveryRiders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery riders",
      error: error.message
    });
  }
};

export const getDeliveryRiderById = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    const rider = await DeliveryRider.findById(riderId);
    
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found"
      });
    }
    
    res.status(200).json({
      success: true,
      data: rider
    });
  } catch (error) {
    console.error("Error in getDeliveryRiderById:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch delivery rider",
      error: error.message
    });
  }
};


export const assignDeliveryRider = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { deliveryId } = req.body;
    
    if (!deliveryId) {
      return res.status(400).json({
        success: false,
        message: "Delivery ID is required"
      });
    }
    
    // Update rider status and assign delivery
    const rider = await DeliveryRider.findByIdAndUpdate(
      riderId,
      { 
        status: "busy",
        currentDelivery: deliveryId
      },
      { new: true }
    );
    
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Delivery assigned successfully",
      data: rider
    });
  } catch (error) {
    console.error("Error in assignDeliveryRider:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign delivery",
      error: error.message
    });
  }
};

export const assignLocation = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { coordinates, address } = req.body;
    
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "Valid coordinates [longitude, latitude] are required"
      });
    }
    
    // Update rider destination
    const rider = await DeliveryRider.findByIdAndUpdate(
      riderId,
      { 
        destinationLocation: {
          type: "Point",
          coordinates
        }
      },
      { new: true }
    );
    
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: "Delivery rider not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Location assigned successfully",
      data: rider
    });
  } catch (error) {
    console.error("Error in assignLocation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign location",
      error: error.message
    });
  }
};

// Helper functions
function generateAccessToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      username: admin.username,
      role: 'admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function generateRefreshToken(admin) {
  return jwt.sign(
    {
      id: admin._id,
      role: 'admin'
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}