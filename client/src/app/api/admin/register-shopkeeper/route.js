import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

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

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, DiamondMergedABI, wallet);

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
