import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from "../../../../../abis/DiamondMergedABI.json";
import DCVTokenABI from "../../../../../abis/DCVToken.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3329CA690f619bae73b9f36eb43839892D20045f";
const DCVTOKEN_ADDRESS = process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS || "0xf0905E91c81888E921AD14C1e1393d44112912dc";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOKpCaYjFCdQ9";

export async function POST(request) {
  try {
    const { aadhaar } = await request.json();
    
    console.log("🔍 Getting unclaimed tokens for Aadhaar:", aadhaar);
    
    if (!aadhaar) {
      return NextResponse.json({
        success: false,
        error: "Aadhaar number is required"
      }, { status: 400 });
    }

    // Create provider and contract instances
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Use DCVToken contract for token-related functions
    const dcvTokenContract = new ethers.Contract(
      DCVTOKEN_ADDRESS,
      DCVTokenABI,
      provider
    );

    console.log("📄 Using DCVToken contract at:", DCVTOKEN_ADDRESS);

    // Get unclaimed tokens for the Aadhaar number - convert to number for contract call
    const tokenIds = await dcvTokenContract.getUnclaimedTokensByAadhaar(BigInt(aadhaar));
    
    console.log("🎫 Found unclaimed token IDs:", tokenIds);

    // Get detailed token data for each token
    const detailedTokens = [];
    for (const tokenId of tokenIds) {
      try {
        const tokenData = await dcvTokenContract.getTokenData(Number(tokenId));
        
        // Parse the token data tuple according to DCVToken ABI
        // Convert BigInt to regular numbers to avoid JSON serialization issues
        const tokenInfo = {
          tokenId: Number(tokenData[0]),
          aadhaar: tokenData[1].toString(), // Convert BigInt to string
          assignedShopkeeper: tokenData[2],
          rationAmount: Number(tokenData[3]),
          issuedTime: Number(tokenData[4]),
          expiryTime: Number(tokenData[5]),
          claimTime: Number(tokenData[6]),
          isClaimed: Boolean(tokenData[7]),
          isExpired: Boolean(tokenData[8]),
          category: String(tokenData[9])
        };
        
        detailedTokens.push(tokenInfo);
        console.log(`📝 Token ${tokenId} details:`, tokenInfo);
      } catch (err) {
        console.error(`❌ Error getting data for token ${tokenId}:`, err);
        // Add basic token info if detailed fetch fails
        detailedTokens.push({
          tokenId: Number(tokenId),
          aadhaar: aadhaar.toString(),
          error: "Could not fetch detailed data"
        });
      }
    }

    return NextResponse.json({
      success: true,
      tokens: detailedTokens,
      count: detailedTokens.length,
      aadhaar: aadhaar.toString()
    });

  } catch (error) {
    console.error("❌ Error getting unclaimed tokens:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}