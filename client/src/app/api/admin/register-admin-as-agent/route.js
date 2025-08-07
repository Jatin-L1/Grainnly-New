import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from "../../../../../abis/DiamondMergedABI.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3329CA690f619bae73b9f36eb43839892D20045f";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOKpCaYjFCdQ9";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

export async function POST(request) {
  try {
    console.log("� Registering admin as shopkeeper...");
    
    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error: "Admin private key not configured"
      }, { status: 500 });
    }

    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    
    console.log("📋 Admin wallet address:", adminWallet.address);

    // Create contract instance
    const diamondContract = new ethers.Contract(CONTRACT_ADDRESS, DiamondMergedABI, adminWallet);
    
    // Register admin wallet as shopkeeper
    console.log("📞 Calling registerShopkeeper...");
    const tx = await diamondContract.registerShopkeeper(
      adminWallet.address,
      "Admin Shopkeeper",
      "Government Area"
    );
    
    console.log("📝 Transaction sent:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log("✅ Admin registered as shopkeeper:", receipt.hash);

    return NextResponse.json({
      success: true,
      message: "Admin successfully registered as shopkeeper",
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      adminAddress: adminWallet.address
    });

  } catch (error) {
    console.error("❌ Error registering admin as shopkeeper:", error);
    
    // Check if already registered
    if (error.message.includes("Shopkeeper already registered")) {
      return NextResponse.json({
        success: true,
        message: "Admin is already registered as shopkeeper",
        alreadyRegistered: true
      });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
