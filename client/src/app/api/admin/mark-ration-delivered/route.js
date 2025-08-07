import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from "../../../../../abis/DiamondMergedABI.json";
import DCVTokenABI from "../../../../../abis/DCVToken.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3329CA690f619bae73b9f36eb43839892D20045f";
const DCVTOKEN_ADDRESS = process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS || "0xf0905E91c81888E921AD14C1e1393d44112912dc";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOKpCaYjFCdQ9";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// ABI helper function
function getMergedABI() {
  try {
    if (DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
      const mergedABI = [];
      Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
        const contractData = DiamondMergedABI.contracts[contractName];
        if (contractData.abi && Array.isArray(contractData.abi)) {
          mergedABI.push(...contractData.abi);
        }
      });
      return mergedABI;
    }
    
    if (DiamondMergedABI.abi && Array.isArray(DiamondMergedABI.abi)) {
      return DiamondMergedABI.abi;
    } else if (Array.isArray(DiamondMergedABI)) {
      return DiamondMergedABI;
    }
    
    throw new Error("Could not find valid ABI structure");
  } catch (error) {
    console.error('❌ Error loading merged ABI:', error);
    return [];
  }
}

export async function POST(request) {
  try {
    const { aadhaar, tokenId, shopkeeperAddress, registeredShopkeeper } = await request.json();
    
    console.log("🎯 Marking ration delivered:", { aadhaar, tokenId, shopkeeperAddress, registeredShopkeeper });
    console.log("ℹ️ Note: Using admin wallet to mark delivery on behalf of registered shopkeeper");
    
    if (!aadhaar || !tokenId) {
      return NextResponse.json({
        success: false,
        error: "Aadhaar and tokenId are required"
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
    
    // Get the correct merged ABI for Diamond contract
    const diamondABI = getMergedABI();
    console.log("📄 Using merged Diamond ABI with", diamondABI.length, "functions");
    
    // Check if the required functions exist
    const hasClaimRationByConsumer = diamondABI.some(f => f.name === 'claimRationByConsumer');
    const hasClaimRationByWallet = diamondABI.some(f => f.name === 'claimRationByWallet');
    const hasMarkRationDelivered = diamondABI.some(f => f.name === 'markRationDeliveredByAadhaar');
    console.log("📄 Functions available:", { hasClaimRationByConsumer, hasClaimRationByWallet, hasMarkRationDelivered });
    
    // Try Diamond contract first (for claimRationByConsumer)
    const diamondContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      diamondABI,
      adminWallet
    );

    // Also create DCVToken contract (for markAsClaimed as fallback)
    const dcvTokenContract = new ethers.Contract(
      DCVTOKEN_ADDRESS,
      DCVTokenABI,
      adminWallet
    );

    console.log("🔍 Trying to mark ration delivered...");

    let tx;
    try {
      // First ensure admin wallet is registered as shopkeeper
      console.log("🔍 Ensuring admin wallet is registered as shopkeeper...");
      try {
        // Try to register admin as shopkeeper first
        const registerTx = await diamondContract.registerShopkeeper(
          adminWallet.address,
          "Admin Shopkeeper",
          "Government Area"
        );
        await registerTx.wait();
        console.log("✅ Admin wallet registered as shopkeeper");
      } catch (registerError) {
        if (registerError.message.includes("Shopkeeper already registered")) {
          console.log("ℹ️ Admin wallet already registered as shopkeeper");
        } else {
          console.warn("⚠️ Failed to register admin as shopkeeper:", registerError.message);
        }
      }

      // Now try markRationDeliveredByAadhaar as shopkeeper
      console.log("📞 Trying Diamond contract markRationDeliveredByAadhaar as admin shopkeeper...");
      tx = await diamondContract.markRationDeliveredByAadhaar(
        BigInt(aadhaar),
        BigInt(tokenId)
      );
      console.log("✅ Used Diamond markRationDeliveredByAadhaar function");
    } catch (adminError) {
      console.log("⚠️ markRationDeliveredByAadhaar failed, trying DCVToken markAsClaimed:", adminError.message);
      try {
        // Fallback to DCVToken markAsClaimed
        tx = await dcvTokenContract.markAsClaimed(BigInt(tokenId));
        console.log("✅ Used DCVToken markAsClaimed function");
      } catch (dcvError) {
        console.error("❌ Both methods failed:", { 
          adminError: adminError.message, 
          dcvError: dcvError.message 
        });
        throw new Error(`Failed to mark delivery - markRationDeliveredByAadhaar: ${adminError.message}, DCVToken markAsClaimed: ${dcvError.message}`);
      }
    }
    
    console.log("📝 Transaction sent:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    console.log("✅ Transaction confirmed:", receipt.hash);

    return NextResponse.json({
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      aadhaar: aadhaar,
      tokenId: tokenId
    });

  } catch (error) {
    console.error("❌ Error marking ration delivered:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
