import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '@/abis/DiamondMergedABI.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3329CA690f619bae73b9f36eb43839892D20045f";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOKpCaYjFCdQ9";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

export async function POST(request) {
  try {
    const { consumerAddress, tokenAmount, shopkeeperAddress } = await request.json();
    
    console.log("🚚 Requesting delivery:", { consumerAddress, tokenAmount, shopkeeperAddress });
    
    if (!consumerAddress) {
      return NextResponse.json({
        success: false,
        error: "Consumer address is required"
      }, { status: 400 });
    }

    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error: "Admin private key not configured"
      }, { status: 500 });
    }

    // Create provider and signer with admin wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      DiamondMergedABI.contracts.Diamond.abi,
      adminWallet
    );

    // Call the contract function
    const tx = await contract.requestDelivery(
      consumerAddress,
      tokenAmount || 1
    );
    
    console.log("📝 Delivery request sent:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log("✅ Delivery request confirmed:", receipt.hash);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      consumerAddress: consumerAddress,
      tokenAmount: tokenAmount || 1
    });

  } catch (error) {
    console.error("❌ Error requesting delivery:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
