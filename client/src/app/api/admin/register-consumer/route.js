import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

export async function POST(request) {
  try {
    const { aadhaar, name, mobile, category, shopkeeperAddress } = await request.json();

    // Validate inputs
    if (!aadhaar || !name || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required consumer data (aadhaar, name, category)' },
        { status: 400 }
      );
    }

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Contract address not configured in environment variables' },
        { status: 500 }
      );
    }
    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Admin private key not configured in environment variables' },
        { status: 500 }
      );
    }
    if (!RPC_URL) {
      return NextResponse.json(
        { success: false, error: 'RPC URL not configured in environment variables' },
        { status: 500 }
      );
    }

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    // Create contract instance with merged ABI
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DiamondMergedABI, wallet);

    // Convert Aadhaar to BigInt for blockchain
    const aadhaarBN = BigInt(aadhaar);

    // Use empty string for mobile if not provided
    const mobileStr = mobile || "";

    // Use zero address for shopkeeper if not provided
    const shopkeeperAddr = shopkeeperAddress || "0x0000000000000000000000000000000000000000";

    console.log('Registering consumer on blockchain:', {
      aadhaar: aadhaarBN.toString(),
      name,
      mobile: mobileStr,
      category,
      shopkeeperAddress: shopkeeperAddr
    });

    // Register consumer on blockchain
    const tx = await contract.registerConsumer(
      aadhaarBN,
      name,
      mobileStr,
      category,
      shopkeeperAddr
    );

    console.log('Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt);

    const explorerBase = process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL || "https://amoy.polygonscan.com/tx/";
    const explorerUrl = `${explorerBase}${tx.hash}`;

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      explorerUrl
    });
  } catch (error) {
    console.error('Consumer registration failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}