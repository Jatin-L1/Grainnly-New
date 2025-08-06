import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Function to merge all facet ABIs for Diamond proxy - same as other working files
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

    // Use the same merged ABI approach as other working files
    const contractABI = getMergedABI();
    
    console.log('Contract ABI length:', contractABI.length);
    console.log('Looking for registerConsumer function...');
    
    // Debug: Check if registerConsumer exists in ABI
    const registerConsumerFunction = contractABI.find(item => 
      item.type === 'function' && item.name === 'registerConsumer'
    );
    console.log('registerConsumer function found:', !!registerConsumerFunction);
    if (registerConsumerFunction) {
      console.log('registerConsumer inputs:', registerConsumerFunction.inputs);
    }
    
    // Create contract instance with the merged ABI - same as other working files
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

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

    // Instead of waiting indefinitely, return immediately with transaction hash
    // The user can check the transaction status on the blockchain explorer
    const explorerBase = process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL || "https://amoy.polygonscan.com/tx/";
    const explorerUrl = `${explorerBase}${tx.hash}`;

    // Optional: Try to wait for confirmation with a timeout
    let receipt = null;
    try {
      // Wait maximum 30 seconds for confirmation
      console.log('Waiting for transaction confirmation (max 30 seconds)...');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
      );
      
      receipt = await Promise.race([tx.wait(), timeoutPromise]);
      console.log('Transaction confirmed:', receipt);
    } catch (timeoutError) {
      console.log('Transaction confirmation timeout, but transaction was sent successfully');
      // Continue anyway - transaction was sent successfully
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      explorerUrl,
      message: 'Consumer registration transaction sent successfully',
      confirmed: !!receipt,
      note: receipt ? 'Transaction confirmed' : 'Transaction sent but confirmation pending - check explorer for status'
    });
  } catch (error) {
    console.error('Consumer registration failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}