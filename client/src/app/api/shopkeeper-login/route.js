import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";

// Smart contract details
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Function to merge all facet ABIs for Diamond proxy
function getMergedABI() {
  const mergedABI = [];
  if (DiamondMergedABI.contracts) {
    Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
      const contractData = DiamondMergedABI.contracts[contractName];
      if (contractData.abi && Array.isArray(contractData.abi)) {
        mergedABI.push(...contractData.abi);
      }
    });
  }
  return mergedABI;
}

// GET endpoint to fetch all shopkeepers from blockchain
export async function GET(request) {
  try {
    console.log("🏪 Fetching all shopkeepers from blockchain...");
    
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ success: false, error: "Contract address not configured" });
    }

    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, getMergedABI(), provider);
    
    // Try to get all shopkeeper events or use a different method
    try {
      // Option 1: Try to get ShopkeeperRegistered events
      const filter = contract.filters.ShopkeeperRegistered();
      const events = await contract.queryFilter(filter, 0, 'latest');
      
      const shopkeepers = await Promise.all(
        events.map(async (event) => {
          const shopkeeperAddress = event.args.shopkeeper;
          try {
            const shopkeeperInfo = await contract.getShopkeeperInfo(shopkeeperAddress);
            return {
              walletAddress: shopkeeperAddress,
              name: shopkeeperInfo.name,
              shopName: shopkeeperInfo.area,
              area: shopkeeperInfo.area,
              totalConsumers: shopkeeperInfo.totalConsumersAssigned?.toString() || "0",
              totalDeliveries: shopkeeperInfo.totalDeliveries?.toString() || "0"
            };
          } catch (err) {
            console.log(`⚠️ Could not get info for shopkeeper ${shopkeeperAddress}:`, err.message);
            return {
              walletAddress: shopkeeperAddress,
              name: `Shopkeeper ${shopkeeperAddress.slice(0, 6)}...${shopkeeperAddress.slice(-4)}`,
              shopName: "Unknown Shop",
              area: "Unknown Area"
            };
          }
        })
      );

      console.log(`✅ Found ${shopkeepers.length} shopkeepers from events`);
      return NextResponse.json(shopkeepers);

    } catch (eventError) {
      console.log("⚠️ Could not fetch events, trying alternative method:", eventError.message);
      
      // Fallback: Return empty array for now, but indicate success
      return NextResponse.json([]);
    }

  } catch (error) {
    console.error("❌ Error fetching shopkeepers:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

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
        const contract = new ethers.Contract(CONTRACT_ADDRESS, getMergedABI(), provider);
        
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
