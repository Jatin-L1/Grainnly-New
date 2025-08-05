import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../../abis/DiamondMergedABI.json";

// Backend wallet configuration - using your existing structure
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { action, adminNote = '', adminId, name, phone, walletAddress, shopkeeperAddress } = body;

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Find the signup request
    const signupRequest = await DeliverySignupRequest.findById(id);
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (signupRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    let txHash = null;

    // Handle blockchain operations for approval - CORRECTED VERSION
    if (action === 'approve') {
      if (!walletAddress) {
        return NextResponse.json(
          { error: 'Wallet address is required for approval' },
          { status: 400 }
        );
      }

      if (!shopkeeperAddress) {
        return NextResponse.json(
          { error: 'Shopkeeper address is required for approval' },
          { status: 400 }
        );
      }

      try {
        // Initialize backend wallet using your existing structure
        if (!ADMIN_PRIVATE_KEY || !RPC_URL || !DIAMOND_PROXY_ADDRESS) {
          throw new Error('Backend wallet configuration missing in environment variables');
        }

        // Use your existing RPC setup
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
        const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, wallet);

        console.log('🚀 Starting blockchain registration for delivery agent:', {
          walletAddress,
          name: name || signupRequest.name,
          phone: phone || signupRequest.phone,
          shopkeeperAddress
        });

        // Step 1: Register delivery agent on blockchain - CORRECT FUNCTION NAME
        console.log('📝 Registering delivery agent...');
        const registerTx = await contract.registerDeliveryAgent(
          walletAddress,
          name || signupRequest.name,
          phone || signupRequest.phone
        );

        console.log('⏳ Waiting for registration transaction confirmation:', registerTx.hash);
        const registerReceipt = await registerTx.wait();
        console.log('✅ Registration transaction confirmed');

        // Step 2: Assign delivery agent to shopkeeper
        try {
          console.log('🔗 Assigning delivery agent to shopkeeper...');
          const assignTx = await contract.assignDeliveryAgentToShopkeeper(
            walletAddress,
            shopkeeperAddress
          );

          console.log('⏳ Waiting for assignment transaction confirmation:', assignTx.hash);
          await assignTx.wait();
          console.log('✅ Assignment transaction confirmed');
          
          txHash = assignTx.hash; // Use assignment transaction hash for reference
        } catch (assignError) {
          console.log('⚠️ Assignment failed, but registration successful:', assignError.message);
          txHash = registerTx.hash; // Use registration transaction hash
        }

        console.log('🎉 Blockchain registration completed successfully!');

      } catch (blockchainError) {
        console.error('❌ Blockchain operation failed:', blockchainError);
        return NextResponse.json(
          { 
            error: `Blockchain registration failed: ${blockchainError.message}`,
            details: 'The delivery partner could not be registered on the blockchain. Please check the contract configuration and try again.'
          },
          { status: 500 }
        );
      }
    }

    // Update the database record
    signupRequest.status = action === 'approve' ? 'approved' : 'rejected';
    signupRequest.adminNote = adminNote;
    signupRequest.reviewedAt = new Date();
    signupRequest.reviewedBy = adminId || 'Admin';

    if (action === 'approve' && txHash) {
      signupRequest.blockchainTxHash = txHash;
    }

    await signupRequest.save();

    const response = {
      message: `Request ${action}d successfully`,
      request: {
        id: signupRequest._id,
        status: signupRequest.status,
        reviewedAt: signupRequest.reviewedAt,
        reviewedBy: signupRequest.reviewedBy
      }
    };

    // Include transaction hash in response if available
    if (txHash) {
      response.txHash = txHash;
      response.explorerUrl = `https://amoy.polygonscan.com/tx/${txHash}`;
      response.blockchainSuccess = true;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error processing delivery signup request:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const signupRequest = await DeliverySignupRequest.findById(id);
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: signupRequest });

  } catch (error) {
    console.error('Error fetching delivery signup request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}