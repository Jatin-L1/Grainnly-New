import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Helper function to extract ABI from the JSON structure
function getMergedABI() {
  try {
    console.log('📄 Processing DiamondMergedABI structure...');
    console.log('📄 DiamondMergedABI keys:', Object.keys(DiamondMergedABI));
    
    // Check if the ABI is already in the correct format (array)
    if (Array.isArray(DiamondMergedABI)) {
      console.log('✅ ABI is already an array with', DiamondMergedABI.length, 'functions');
      return DiamondMergedABI;
    }
    
    const mergedABI = [];
    
    // First try: abiMap structure (most likely for our Diamond pattern)
    if (DiamondMergedABI.abiMap && typeof DiamondMergedABI.abiMap === 'object') {
      console.log('📦 Using abiMap structure...');
      console.log('📦 abiMap contracts:', Object.keys(DiamondMergedABI.abiMap));
      
      Object.keys(DiamondMergedABI.abiMap).forEach(contractName => {
        const abi = DiamondMergedABI.abiMap[contractName];
        if (Array.isArray(abi)) {
          console.log(`📄 Adding ${abi.length} functions from abiMap.${contractName}`);
          mergedABI.push(...abi);
        }
      });
    }
    
    // Second try: contracts structure (if abiMap fails)
    if (mergedABI.length === 0 && DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
      console.log('📦 Fallback to contracts structure...');
      console.log('📦 Found contracts:', Object.keys(DiamondMergedABI.contracts));
      
      Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
        const contractData = DiamondMergedABI.contracts[contractName];
        if (contractData && contractData.abi && Array.isArray(contractData.abi)) {
          console.log(`📄 Adding ${contractData.abi.length} functions from ${contractName}`);
          mergedABI.push(...contractData.abi);
        }
      });
    }
    
    if (mergedABI.length > 0) {
      console.log('✅ Merged ABI created with', mergedABI.length, 'total functions');
      
      // Log available function names for debugging
      const functionNames = mergedABI
        .filter(item => item.type === 'function')
        .map(item => item.name)
        .slice(0, 10); // First 10 functions
      console.log('📋 Available functions (first 10):', functionNames);
      
      return mergedABI;
    }
    
    throw new Error('No valid ABI found in DiamondMergedABI.json');
  } catch (error) {
    console.error('❌ Error parsing ABI:', error);
    throw new Error(`ABI parsing failed: ${error.message}`);
  }
}

export async function POST(request) {
  try {
    const { address, name, area } = await request.json();
    
    console.log('🏪 Registering shopkeeper:', { address, name, area });

    // Validate inputs
    if (!address || !name || !area) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: address, name, area' },
        { status: 400 }
      );
    }

    // Validate Ethereum address
    if (!ethers.isAddress(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Check environment variables
    if (!RPC_URL || !DIAMOND_ADDRESS || !ADMIN_PRIVATE_KEY) {
      console.error('Missing environment variables:', {
        RPC_URL: !!RPC_URL,
        DIAMOND_ADDRESS: !!DIAMOND_ADDRESS,
        ADMIN_PRIVATE_KEY: !!ADMIN_PRIVATE_KEY
      });
      return NextResponse.json(
        { success: false, error: 'Server configuration error - missing environment variables' },
        { status: 500 }
      );
    }

    console.log('🔗 Connecting to blockchain...');
    console.log('📍 Diamond Address:', DIAMOND_ADDRESS);
    console.log('📍 RPC URL:', RPC_URL);

    // Get the proper ABI format
    const mergedABI = getMergedABI();
    console.log('📄 ABI loaded successfully, functions count:', mergedABI.length);

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, mergedABI, wallet);

    // Check if shopkeeper is already registered
    try {
      console.log('🔍 Checking if shopkeeper already exists...');
      const existingShopkeeper = await contract.getShopkeeperInfo(address);
      
      if (existingShopkeeper.shopkeeperAddress && existingShopkeeper.shopkeeperAddress !== ethers.ZeroAddress) {
        return NextResponse.json(
          { success: false, error: `Shopkeeper ${address} is already registered as "${existingShopkeeper.name}"` },
          { status: 400 }
        );
      }
    } catch (checkError) {
      // If getShopkeeperInfo fails, shopkeeper doesn't exist - this is expected
      console.log('✅ Shopkeeper not registered yet (expected for new registration)');
    }

    // Register shopkeeper on blockchain
    console.log('📝 Registering shopkeeper on blockchain...');
    const tx = await contract.registerShopkeeper(address, name, area);
    
    console.log('⏳ Transaction sent, waiting for confirmation...');
    console.log('📋 Transaction hash:', tx.hash);
    
    const receipt = await tx.wait(1); // Wait for 1 confirmation
    console.log('✅ Registration confirmed!');
    console.log('⛽ Gas used:', receipt.gasUsed.toString());

    // Verify registration was successful
    try {
      const verifyShopkeeper = await contract.getShopkeeperInfo(address);
      console.log('✅ Verification successful:', {
        address: verifyShopkeeper.shopkeeperAddress,
        name: verifyShopkeeper.name,
        area: verifyShopkeeper.area,
        isActive: verifyShopkeeper.isActive
      });
    } catch (verifyError) {
      console.warn('⚠️ Could not verify registration, but transaction was successful');
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      message: `Shopkeeper "${name}" registered successfully`,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      shopkeeper: {
        address,
        name,
        area,
        registrationTime: Date.now(),
        isActive: true
      }
    });

  } catch (error) {
    console.error('❌ Shopkeeper registration failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      if (error.message.includes('execution reverted')) {
        errorMessage = 'Transaction reverted - ' + (error.reason || 'check contract conditions');
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees';
      } else if (error.message.includes('nonce')) {
        errorMessage = 'Transaction nonce error - please try again';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: {
          code: error.code,
          reason: error.reason,
          action: error.action
        }
      },
      { status: 500 }
    );
  }
}
