import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { ethers } from "ethers";

// Smart contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ABI = require("../../../../abis/DiamondMergedABI.json");

export async function POST(request) {
  try {
    const { walletAddress } = await request.json();

    console.log("🔍 Shopkeeper login API called with wallet:", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Check blockchain connection first
    if (!CONTRACT_ADDRESS) {
      console.log("⚠️ No contract address configured, using database only");
    } else {
      // First, check blockchain for registered shopkeeper
      try {
        console.log("🔗 Checking blockchain for shopkeeper...");
        console.log("📍 Contract address:", CONTRACT_ADDRESS);
        console.log("📍 Amoy RPC URL:", process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK");
        
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
        
        const shopkeeperInfo = await contract.getShopkeeperInfo(walletAddress);
        console.log("🔍 Blockchain response:", {
          shopkeeperAddress: shopkeeperInfo.shopkeeperAddress,
          name: shopkeeperInfo.name,
          area: shopkeeperInfo.area,
          totalConsumersAssigned: shopkeeperInfo.totalConsumersAssigned?.toString(),
          totalDeliveries: shopkeeperInfo.totalDeliveries?.toString()
        });
        
        // Check if shopkeeper exists (non-zero address means registered)
        if (shopkeeperInfo.shopkeeperAddress && shopkeeperInfo.shopkeeperAddress !== ethers.ZeroAddress) {
          console.log("✅ Shopkeeper found on blockchain");
          return NextResponse.json({
            success: true,
            shopkeeper: {
              id: walletAddress,
              name: shopkeeperInfo.name,
              walletAddress: shopkeeperInfo.shopkeeperAddress,
              shopName: shopkeeperInfo.area, // Using area as shop name
              area: shopkeeperInfo.area,
              totalConsumers: shopkeeperInfo.totalConsumersAssigned?.toString() || "0",
              totalDeliveries: shopkeeperInfo.totalDeliveries?.toString() || "0",
              source: "blockchain"
            }
          });
        } else {
          console.log("❌ No shopkeeper found on blockchain, checking database...");
        }
      } catch (blockchainError) {
        console.log("⚠️ Blockchain check failed, falling back to database:", blockchainError.message);
        
        // Check if it's a function not found error (BAD_DATA with 0x response)
        if (blockchainError.code === 'BAD_DATA' && blockchainError.value === '0x') {
          console.log("🔧 Function getShopkeeperInfo may not be cut into the Diamond contract");
        }
      }
    }

    // Fallback to database check
    console.log("🗄️ Checking database for shopkeeper...");
    await connectDB();
    
    // Since we don't have a Shopkeeper model, let's check if there's a collection or use a different approach
    // For now, we'll return that no shopkeeper was found in database
    console.log("🔍 Database check: No Shopkeeper model available");
    console.log("❌ No shopkeeper found in blockchain or database");
    return NextResponse.json({
      success: false,
      error: "This wallet is not registered as a shopkeeper. Please register through the admin panel or contact the administrator.",
      shopkeeper: null
    });
  } catch (error) {
    console.error("❌ Shopkeeper login error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while checking shopkeeper status" },
      { status: 500 }
    );
  }
}
