import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DeliverySignupRequest from "@/models/DeliverySignupRequest";
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

export async function POST(request) {
  try {
    const { walletAddress } = await request.json();

    console.log("🔍 Delivery login API called with wallet:", walletAddress);

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
      // First, check blockchain for registered delivery agent
      try {
        console.log("🔗 Checking blockchain for delivery agent...");
        console.log("📍 Contract address:", CONTRACT_ADDRESS);
        console.log("📍 Amoy RPC URL:", process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK");
        
        const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, getMergedABI(), provider);
        
        // Try to call the function and handle potential issues
        const deliveryAgentInfo = await contract.getDeliveryAgentInfo(walletAddress);
        console.log("🔍 Blockchain response:", {
          agentAddress: deliveryAgentInfo.agentAddress,
          name: deliveryAgentInfo.name,
          mobile: deliveryAgentInfo.mobile,
          isActive: deliveryAgentInfo.isActive
        });
        
        // Check if agent exists and is active
        if (deliveryAgentInfo.agentAddress && deliveryAgentInfo.agentAddress !== ethers.ZeroAddress && deliveryAgentInfo.isActive) {
          console.log("✅ Active delivery agent found on blockchain");
          return NextResponse.json({
            success: true,
            deliveryPartner: {
              id: walletAddress,
              name: deliveryAgentInfo.name,
              walletAddress: deliveryAgentInfo.agentAddress,
              phoneNumber: deliveryAgentInfo.mobile,
              vehicleType: "N/A", // Not stored on blockchain
              source: "blockchain",
              isActive: deliveryAgentInfo.isActive
            }
          });
        } else if (deliveryAgentInfo.agentAddress && deliveryAgentInfo.agentAddress !== ethers.ZeroAddress && !deliveryAgentInfo.isActive) {
          console.log("❌ Inactive delivery agent found on blockchain");
          return NextResponse.json({
            success: false,
            error: "Your delivery agent account is inactive. Please contact the administrator.",
            deliveryPartner: null
          });
        } else {
          console.log("❌ No delivery agent found on blockchain, checking database...");
        }
      } catch (blockchainError) {
        console.log("⚠️ Blockchain check failed, falling back to database:", blockchainError.message);
        
        // Check if it's a function not found error (BAD_DATA with 0x response)
        if (blockchainError.code === 'BAD_DATA' && blockchainError.value === '0x') {
          console.log("🔧 Function getDeliveryAgentInfo may not be cut into the Diamond contract");
        }
      }
    }

    // Fallback to database check
    console.log("🗄️ Checking database for delivery agent...");
    await connectDB();

    const deliveryPartner = await DeliverySignupRequest.findOne({
      walletAddress: walletAddress.toLowerCase(),
      status: "approved"
    });

    console.log("🔍 Delivery partner found in database:", deliveryPartner ? "Yes" : "No");

    if (deliveryPartner) {
      console.log("✅ Approved delivery partner found in database");
      return NextResponse.json({
        success: true,
        deliveryPartner: {
          id: deliveryPartner._id,
          name: deliveryPartner.name,
          walletAddress: deliveryPartner.walletAddress,
          phoneNumber: deliveryPartner.phoneNumber,
          vehicleType: deliveryPartner.vehicleType,
          blockchainTxHash: deliveryPartner.blockchainTxHash,
          source: "database",
          status: deliveryPartner.status
        }
      });
    } else {
      console.log("❌ No delivery partner found in blockchain or database");
      return NextResponse.json({
        success: false,
        error: "This wallet is not registered as a delivery agent. Please register or contact the administrator.",
        deliveryPartner: null
      });
    }

  } catch (error) {
    console.error("❌ Delivery login error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while checking delivery agent status" },
      { status: 500 }
    );
  }
}
