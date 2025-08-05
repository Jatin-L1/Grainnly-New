const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

// Contract ABI - Copy the ABI from your compiled contract
const contractABI = require('./contractABI.json');

// Configure Express
const app = express();
app.use(cors());
app.use(express.json());

// Configure ethers provider
const getProvider = () => {
  const network = process.env.NETWORK;
  const apiKey = process.env.ALCHEMY_API_KEY;
  
  if (network === 'sepolia') {
    return new ethers.providers.JsonRpcProvider(
      `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
    );
  } else if (network === 'mumbai') {
    return new ethers.providers.JsonRpcProvider(
      `https://polygon-mumbai.g.alchemy.com/v2/${apiKey}`
    );
  } else if (network === 'polygon') {
    return new ethers.providers.JsonRpcProvider(
      `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`
    );
  } else {
    throw new Error('Invalid network specified');
  }
};

// Get admin wallet
const getAdminWallet = () => {
  const provider = getProvider();
  return new ethers.Wallet(process.env.PRIVATE_KEY, provider);
};

// Get contract instance
const getContract = () => {
  const wallet = getAdminWallet();
  return new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractABI,
    wallet
  );
};

// API Routes

// Register a new user
app.post('/api/users', async (req, res) => {
  try {
    const { walletAddress, name, category } = req.body;
    
    // Validate input
    if (!walletAddress || !name || (category !== 0 && category !== 1)) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const contract = getContract();
    
    // Send transaction
    const tx = await contract.registerUser(walletAddress, name, category);
    const receipt = await tx.wait();
    
    // Extract user ID from event
    const userRegisteredEvent = receipt.events.find(e => e.event === 'UserRegistered');
    const userId = userRegisteredEvent.args.userId.toString();
    
    res.status(201).json({ 
      success: true, 
      userId,
      transactionHash: receipt.transactionHash 
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register a new depot
app.post('/api/depots', async (req, res) => {
  try {
    const { walletAddress, name, location } = req.body;
    
    // Validate input
    if (!walletAddress || !name || !location) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const contract = getContract();
    
    // Send transaction
    const tx = await contract.registerDepot(walletAddress, name, location);
    const receipt = await tx.wait();
    
    // Extract depot ID from event
    const depotRegisteredEvent = receipt.events.find(e => e.event === 'DepotRegistered');
    const depotId = depotRegisteredEvent.args.depotId.toString();
    
    res.status(201).json({ 
      success: true, 
      depotId,
      transactionHash: receipt.transactionHash 
    });
  } catch (error) {
    console.error('Error registering depot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Register a new delivery person
app.post('/api/delivery-persons', async (req, res) => {
  try {
    const { walletAddress, name } = req.body;
    
    // Validate input
    if (!walletAddress || !name) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const contract = getContract();
    
    // Send transaction
    const tx = await contract.registerDeliveryPerson(walletAddress, name);
    const receipt = await tx.wait();
    
    // Extract delivery person ID from event
    const deliveryPersonRegisteredEvent = receipt.events.find(e => e.event === 'DeliveryPersonRegistered');
    const deliveryPersonId = deliveryPersonRegisteredEvent.args.deliveryPersonId.toString();
    
    res.status(201).json({ 
      success: true, 
      deliveryPersonId,
      transactionHash: receipt.transactionHash 
    });
  } catch (error) {
    console.error('Error registering delivery person:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign depot to user
app.post('/api/users/:userId/depot', async (req, res) => {
  try {
    const { userId } = req.params;
    const { depotId } = req.body;
    
    // Validate input
    if (!userId || !depotId) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const contract = getContract();
    
    // Send transaction
    const tx = await contract.assignDepot(userId, depotId);
    const receipt = await tx.wait();
    
    res.status(200).json({ 
      success: true, 
      transactionHash: receipt.transactionHash 
    });
  } catch (error) {
    console.error('Error assigning depot to user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign delivery person to depot
app.post('/api/delivery-persons/:deliveryPersonId/depot', async (req, res) => {
  try {
    const { deliveryPersonId } = req.params;
    const { depotId } = req.body;
    
    // Validate input
    if (!deliveryPersonId || !depotId) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const contract = getContract();
    
    // Send transaction
    const tx = await contract.assignDeliveryPersonToDepot(deliveryPersonId, depotId);
    const receipt = await tx.wait();
    
    res.status(200).json({ 
      success: true, 
      transactionHash: receipt.transactionHash 
    });
  } catch (error) {
    console.error('Error assigning delivery person to depot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Allocate ration
app.post('/api/rations', async (req, res) => {
  try {
    const { userId, deliveryPersonId, amount } = req.body;
    
    // Validate input
    if (!userId || !deliveryPersonId || !amount) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const contract = getContract();
    
    // Send transaction
    const tx = await contract.allocateRation(userId, deliveryPersonId, amount);
    const receipt = await tx.wait();
    
    // Extract delivery ID from event
    const rationAllocatedEvent = receipt.events.find(e => e.event === 'RationAllocated');
    const deliveryId = rationAllocatedEvent.args.deliveryId.toString();
    
    res.status(201).json({ 
      success: true, 
      deliveryId,
      transactionHash: receipt.transactionHash 
    });
  } catch (error) {
    console.error('Error allocating ration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate OTP for delivery (continued)
app.post('/api/deliveries/:deliveryId/otp', async (req, res) => {
    try {
      const { deliveryId } = req.params;
      const { depotPrivateKey } = req.body; // In production, use proper authentication
      
      // Validate input
      if (!deliveryId || !depotPrivateKey) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      
      // Create a wallet instance with the depot's private key
      const provider = getProvider();
      const depotWallet = new ethers.Wallet(depotPrivateKey, provider);
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        depotWallet
      );
      
      // Send transaction
      const tx = await contract.generateOTP(deliveryId);
      const receipt = await tx.wait();
      
      // Extract OTP from event
      const otpGeneratedEvent = receipt.events.find(e => e.event === 'OTPGenerated');
      const otp = otpGeneratedEvent.args.otp.toString();
      
      res.status(200).json({ 
        success: true, 
        otp,
        transactionHash: receipt.transactionHash 
      });
    } catch (error) {
      console.error('Error generating OTP:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Verify OTP
  app.post('/api/deliveries/:deliveryId/verify-otp', async (req, res) => {
    try {
      const { deliveryId } = req.params;
      const { otp, deliveryPersonPrivateKey } = req.body; // In production, use proper authentication
      
      // Validate input
      if (!deliveryId || !otp || !deliveryPersonPrivateKey) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      
      // Create a wallet instance with the delivery person's private key
      const provider = getProvider();
      const deliveryPersonWallet = new ethers.Wallet(deliveryPersonPrivateKey, provider);
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        deliveryPersonWallet
      );
      
      // Send transaction
      const tx = await contract.verifyOTP(deliveryId, otp);
      const receipt = await tx.wait();
      
      res.status(200).json({ 
        success: true, 
        transactionHash: receipt.transactionHash 
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Verify location
  app.post('/api/deliveries/:deliveryId/verify-location', async (req, res) => {
    try {
      const { deliveryId } = req.params;
      const { latitude, longitude, depotPrivateKey } = req.body; // In production, use proper authentication
      
      // Validate input
      if (!deliveryId || latitude === undefined || longitude === undefined || !depotPrivateKey) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      
      // Create a wallet instance with the depot's private key
      const provider = getProvider();
      const depotWallet = new ethers.Wallet(depotPrivateKey, provider);
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        depotWallet
      );
      
      // Convert latitude and longitude to integers (solidity doesn't handle floating-point)
      // Assuming we're using 6 decimal places of precision
      const latInt = Math.round(latitude * 1000000);
      const lonInt = Math.round(longitude * 1000000);
      
      // Send transaction
      const tx = await contract.verifyLocation(deliveryId, latInt, lonInt);
      const receipt = await tx.wait();
      
      res.status(200).json({ 
        success: true, 
        transactionHash: receipt.transactionHash 
      });
    } catch (error) {
      console.error('Error verifying location:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Complete delivery and payment
  app.post('/api/deliveries/:deliveryId/complete', async (req, res) => {
    try {
      const { deliveryId } = req.params;
      const { depotPrivateKey, paymentAmount } = req.body; // In production, use proper authentication
      
      // Validate input
      if (!deliveryId || !depotPrivateKey || !paymentAmount) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      
      // Create a wallet instance with the depot's private key
      const provider = getProvider();
      const depotWallet = new ethers.Wallet(depotPrivateKey, provider);
      const contract = new ethers.Contract(
        process.env.CONTRACT_ADDRESS,
        contractABI,
        depotWallet
      );
      
      // Send transaction with value
      const tx = await contract.completeDelivery(deliveryId, {
        value: ethers.utils.parseEther(paymentAmount)
      });
      const receipt = await tx.wait();
      
      res.status(200).json({ 
        success: true, 
        transactionHash: receipt.transactionHash 
      });
    } catch (error) {
      console.error('Error completing delivery:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get user details
  app.get('/api/users/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const contract = getContract();
      const userDetails = await contract.getUserDetails(userId);
      
      res.status(200).json({
        id: userDetails.id.toString(),
        walletAddress: userDetails.walletAddress,
        name: userDetails.name,
        category: userDetails.category,
        isRegistered: userDetails.isRegistered,
        assignedDepotId: userDetails.assignedDepotId.toString()
      });
    } catch (error) {
      console.error('Error getting user details:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get depot details
  app.get('/api/depots/:depotId', async (req, res) => {
    try {
      const { depotId } = req.params;
      
      const contract = getContract();
      const depotDetails = await contract.getDepotDetails(depotId);
      
      res.status(200).json({
        id: depotDetails.id.toString(),
        walletAddress: depotDetails.walletAddress,
        name: depotDetails.name,
        location: depotDetails.location,
        isActive: depotDetails.isActive
      });
    } catch (error) {
      console.error('Error getting depot details:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get delivery person details
  app.get('/api/delivery-persons/:deliveryPersonId', async (req, res) => {
    try {
      const { deliveryPersonId } = req.params;
      
      const contract = getContract();
      const deliveryPersonDetails = await contract.getDeliveryPersonDetails(deliveryPersonId);
      
      res.status(200).json({
        id: deliveryPersonDetails.id.toString(),
        walletAddress: deliveryPersonDetails.walletAddress,
        name: deliveryPersonDetails.name,
        isActive: deliveryPersonDetails.isActive,
        assignedDepotIds: deliveryPersonDetails.assignedDepotIds.map(id => id.toString())
      });
    } catch (error) {
      console.error('Error getting delivery person details:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get delivery details
  app.get('/api/deliveries/:deliveryId', async (req, res) => {
    try {
      const { deliveryId } = req.params;
      
      const contract = getContract();
      const deliveryDetails = await contract.getDeliveryDetails(deliveryId);
      
      res.status(200).json({
        id: deliveryDetails.id.toString(),
        userId: deliveryDetails.userId.toString(),
        depotId: deliveryDetails.depotId.toString(),
        deliveryPersonId: deliveryDetails.deliveryPersonId.toString(),
        amount: deliveryDetails.amount.toString(),
        status: deliveryDetails.status,
        createdAt: new Date(deliveryDetails.createdAt.toNumber() * 1000).toISOString(),
        deliveredAt: deliveryDetails.deliveredAt.toNumber() > 0 
          ? new Date(deliveryDetails.deliveredAt.toNumber() * 1000).toISOString() 
          : null
      });
    } catch (error) {
      console.error('Error getting delivery details:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });