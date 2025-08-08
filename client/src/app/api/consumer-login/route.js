import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import dbConnect from '@/lib/mongodb';
import ConsumerSignupRequest from '@/models/ConsumerSignupRequest';
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// ABI helper function
function getMergedABI() {
  const mergedABI = [];
  if (DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
    Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
      const contractData = DiamondMergedABI.contracts[contractName];
      if (contractData && contractData.abi && Array.isArray(contractData.abi)) {
        mergedABI.push(...contractData.abi);
      }
    });
  }
  return mergedABI;
}

// Initialize blockchain connection
async function getBlockchainContract() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL || "https://rpc-amoy.polygon.technology");
    const mergedABI = getMergedABI();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, mergedABI, provider);
    return contract;
  } catch (error) {
    console.error('Failed to initialize blockchain contract:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { identifier, identifierType, pin } = body;

    // Validate required fields
    if (!identifier || !identifierType || !pin) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      );
    }

    let aadhaarNumber = null;

    // Extract Aadhaar number based on identifier type
    if (identifierType === 'aadhar') {
      // Validate Aadhar number format (12 digits)
      if (!/^\d{12}$/.test(identifier)) {
        return NextResponse.json(
          { error: 'Aadhar number must be exactly 12 digits' },
          { status: 400 }
        );
      }
      aadhaarNumber = identifier;
    } else if (identifierType === 'ration') {
      // For ration card, we need to look up the Aadhaar from database first
      await dbConnect();
      const rationCardUser = await ConsumerSignupRequest.findOne({ 
        rationCardId: identifier, 
        status: 'approved' 
      });
      
      if (!rationCardUser) {
        return NextResponse.json(
          { error: 'No approved account found with this Ration Card ID' },
          { status: 404 }
        );
      }
      
      aadhaarNumber = rationCardUser.aadharNumber;
    } else {
      return NextResponse.json(
        { error: 'Invalid identifier type' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking blockchain for consumer with Aadhaar: ${aadhaarNumber}`);

    // Step 1: Check if consumer exists on blockchain
    const contract = await getBlockchainContract();
    if (!contract) {
      return NextResponse.json(
        { error: 'Blockchain connection failed. Please try again.' },
        { status: 503 }
      );
    }

    let blockchainConsumer = null;
    try {
      // Try to get consumer from blockchain
      blockchainConsumer = await contract.getConsumerByAadhaar(BigInt(aadhaarNumber));
      
      // Check if consumer exists and has valid data
      if (!blockchainConsumer || !blockchainConsumer.name || blockchainConsumer.aadhaar === BigInt(0)) {
        return NextResponse.json(
          { error: 'No registered consumer found with this Aadhaar number on blockchain' },
          { status: 404 }
        );
      }
      
      console.log(`✅ Found consumer on blockchain: ${blockchainConsumer.name}`);
      
    } catch (blockchainError) {
      console.error('Blockchain lookup failed:', blockchainError);
      return NextResponse.json(
        { error: 'Failed to verify consumer on blockchain. Please try again.' },
        { status: 503 }
      );
    }

    // Step 2: Check/Create database record for PIN verification
    await dbConnect();
    let databaseConsumer = await ConsumerSignupRequest.findOne({
      aadharNumber: aadhaarNumber
    });

    // If consumer doesn't exist in database, create one with default PIN
    if (!databaseConsumer) {
      console.log(`🔄 Consumer not in database, creating record for ${aadhaarNumber}`);
      
      const bcrypt = require('bcryptjs');
      const defaultPin = '123456'; // Default PIN for blockchain consumers
      const hashedPin = await bcrypt.hash(defaultPin, 10);
      
      databaseConsumer = new ConsumerSignupRequest({
        name: blockchainConsumer.name,
        phone: blockchainConsumer.mobile || '0000000000',
        homeAddress: 'Village (Synced from blockchain)',
        rationCardId: `RC${aadhaarNumber}`,
        aadharNumber: aadhaarNumber,
        pin: hashedPin,
        status: 'approved',
        approvedAt: new Date(),
        blockchainTxHash: 'blockchain-sync',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await databaseConsumer.save();
      console.log(`✅ Created database record for ${blockchainConsumer.name}`);
    }

    // Step 3: Verify PIN
    const isPinValid = await databaseConsumer.comparePin(pin);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'Invalid PIN. If this is your first login, try PIN: 123456' },
        { status: 401 }
      );
    }

    console.log(`✅ Login successful for ${blockchainConsumer.name}`);

    // Step 4: Return consumer information combining blockchain and database data
    return NextResponse.json(
      { 
        message: 'Login successful',
        consumer: {
          id: databaseConsumer._id,
          name: blockchainConsumer.name,
          phone: blockchainConsumer.mobile || databaseConsumer.phone,
          homeAddress: databaseConsumer.homeAddress,
          rationCardId: databaseConsumer.rationCardId,
          aadharNumber: aadhaarNumber,
          category: blockchainConsumer.category,
          status: 'approved',
          isActive: blockchainConsumer.isActive,
          assignedShopkeeper: blockchainConsumer.assignedShopkeeper,
          totalTokensReceived: Number(blockchainConsumer.totalTokensReceived || 0),
          totalTokensClaimed: Number(blockchainConsumer.totalTokensClaimed || 0),
          registrationTime: Number(blockchainConsumer.registrationTime || 0),
          source: 'blockchain'
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error during consumer login:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}