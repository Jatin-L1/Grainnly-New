import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

// Import the merged ABI - same approach as working files
import DiamondABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

// Fallback RPC URLs for Polygon Amoy
const FALLBACK_RPCS = [
  'https://rpc-amoy.polygon.technology/',
  'https://polygon-amoy-bor-rpc.publicnode.com'
];

// Function to merge all facet ABIs for Diamond proxy
function getMergedABI() {
  const mergedABI = [];
  const seenFunctions = new Set();
  
  if (DiamondABI.contracts) {
    Object.keys(DiamondABI.contracts).forEach(contractName => {
      const contractData = DiamondABI.contracts[contractName];
      if (contractData.abi && Array.isArray(contractData.abi)) {
        contractData.abi.forEach(item => {
          const signature = item.type === 'function' 
            ? `${item.name}(${item.inputs?.map(i => i.type).join(',') || ''})`
            : item.type;
          
          if (!seenFunctions.has(signature)) {
            seenFunctions.add(signature);
            mergedABI.push(item);
          }
        });
      }
    });
  }
  return mergedABI;
}

// Function to get a working RPC provider
async function getWorkingProvider() {
  const rpcUrls = [
    'https://rpc-amoy.polygon.technology/',
    'https://polygon-amoy-bor-rpc.publicnode.com',
    RPC_URL // Try user's RPC last since it was giving errors
  ].filter(Boolean);
  
  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`🔗 Trying RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl, {
        name: 'polygon-amoy',
        chainId: 80002
      });
      
      // Test the connection
      const network = await provider.getNetwork();
      console.log(`✅ RPC working: ${rpcUrl} - Chain: ${network.chainId}`);
      return provider;
    } catch (error) {
      console.log(`❌ RPC failed: ${rpcUrl} - ${error.message}`);
      continue;
    }
  }
  
  throw new Error('No working RPC provider found');
}

export async function POST(request) {
  try {
    console.log('🚀 Consumer Registration API Started');
    console.log('CONTRACT_ADDRESS:', CONTRACT_ADDRESS);
    console.log('RPC_URL:', RPC_URL);
    console.log('ADMIN_PRIVATE_KEY present:', !!ADMIN_PRIVATE_KEY);

    const { aadhaar, name, mobile, category, shopkeeperAddress } = await request.json();

    // Validate inputs
    if (!aadhaar || !name || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: aadhaar, name, category' },
        { status: 400 }
      );
    }

    if (!CONTRACT_ADDRESS || !ADMIN_PRIVATE_KEY || !RPC_URL) {
      return NextResponse.json(
        { success: false, error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    // Initialize provider and wallet with better RPC configuration
    console.log('🔗 Finding working RPC provider...');
    const provider = await getWorkingProvider();
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

    // Test connection
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'chainId:', network.chainId);

    // Create contract instance
    const contractABI = getMergedABI();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

    // Validate contract
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      return NextResponse.json(
        { success: false, error: 'Contract not deployed' },
        { status: 500 }
      );
    }

    // Convert and validate inputs
    const aadhaarBN = BigInt(aadhaar);
    const mobileStr = mobile || "";
    const normalizedCategory = category.toUpperCase();

    // Validate inputs
    if (aadhaar.toString().length !== 12) {
      return NextResponse.json(
        { success: false, error: 'Aadhaar must be 12 digits' },
        { status: 400 }
      );
    }

    if (!mobileStr.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mobile number is required' },
        { status: 400 }
      );
    }

    const validCategories = ['BPL', 'AAY', 'APL', 'PHH', 'ANNAPURNA'];
    if (!validCategories.includes(normalizedCategory)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    if (!shopkeeperAddress || shopkeeperAddress === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json(
        { success: false, error: 'Valid shopkeeper address required' },
        { status: 400 }
      );
    }

    // Validate shopkeeper exists
    try {
      const shopkeeperInfo = await contract.getShopkeeperInfo(shopkeeperAddress);
      if (!shopkeeperInfo || shopkeeperInfo[0] === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json(
          { success: false, error: 'Shopkeeper not registered' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to validate shopkeeper' },
        { status: 400 }
      );
    }

    console.log('✅ All validations passed');
    console.log('📋 Registration data:', {
      aadhaar: aadhaarBN.toString(),
      name,
      mobile: mobileStr,
      category: normalizedCategory,
      shopkeeper: shopkeeperAddress
    });

    // 🔥 FIX: Use simple gas settings that match your successful Cast command
    // Estimate gas first, then add buffer
    let gasEstimate;
    try {
      gasEstimate = await contract.registerConsumer.estimateGas(
        aadhaarBN,           // uint256 aadhaar
        name,                // string name  
        mobileStr,           // string mobile
        normalizedCategory,  // string category
        shopkeeperAddress    // address assignedShopkeeper
      );
      console.log('⛽ Gas estimate:', gasEstimate.toString());
    } catch (gasError) {
      console.error('❌ Gas estimation failed:', gasError);
      return NextResponse.json(
        { success: false, error: 'Failed to estimate gas: ' + gasError.message },
        { status: 400 }
      );
    }

    const gasSettings = {
      gasLimit: gasEstimate * BigInt(120) / BigInt(100), // 20% buffer
      gasPrice: ethers.parseUnits('30', 'gwei')  // Lower gas price to ensure acceptance
    };

    console.log('⛽ Final gas settings:', {
      gasLimit: gasSettings.gasLimit.toString(),
      gasPrice: ethers.formatUnits(gasSettings.gasPrice, 'gwei') + ' gwei'
    });

    // Call contract function with same parameters as Cast
    console.log('📝 Calling registerConsumer...');
    console.log('📋 Final parameters:', {
      aadhaar: aadhaarBN.toString(),
      name: name,
      mobile: mobileStr,
      category: normalizedCategory,
      shopkeeperAddress: shopkeeperAddress,
      gasLimit: gasSettings.gasLimit.toString(),
      gasPrice: ethers.formatUnits(gasSettings.gasPrice, 'gwei') + ' gwei'
    });

    let tx;
    try {
      tx = await contract.registerConsumer(
        aadhaarBN,           // uint256 aadhaar
        name,                // string name  
        mobileStr,           // string mobile
        normalizedCategory,  // string category
        shopkeeperAddress,   // address assignedShopkeeper
        gasSettings
      );
    } catch (txError) {
      console.error('❌ Transaction send failed:', txError);
      
      // Try to get more details about the error
      if (txError.reason) {
        return NextResponse.json(
          { success: false, error: 'Transaction failed: ' + txError.reason },
          { status: 400 }
        );
      } else if (txError.code) {
        return NextResponse.json(
          { success: false, error: 'Transaction error (' + txError.code + '): ' + txError.message },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { success: false, error: 'Transaction send failed: ' + txError.message },
          { status: 400 }
        );
      }
    }

    console.log('✅ Transaction sent:', tx.hash);
    console.log('📊 Transaction details:', {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') + ' gwei' : 'N/A',
      value: tx.value?.toString(),
      nonce: tx.nonce
    });

    // Verify transaction exists on the network
    console.log('🔍 Verifying transaction exists on network...');
    try {
      const networkTx = await provider.getTransaction(tx.hash);
      if (!networkTx) {
        console.error('❌ Transaction not found on network!');
        return NextResponse.json(
          { success: false, error: 'Transaction was not properly submitted to network' },
          { status: 500 }
        );
      } else {
        console.log('✅ Transaction verified on network');
      }
    } catch (verifyError) {
      console.error('⚠️ Could not verify transaction on network:', verifyError.message);
    }

    // Wait for confirmation with longer timeout and better error handling (60 seconds)
    let receipt = null;
    let confirmed = false;

    try {
      console.log('⏳ Waiting for confirmation (60s timeout)...');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 60000)
      );
      
      receipt = await Promise.race([tx.wait(1), timeoutPromise]);
      
      if (receipt && receipt.status === 1) {
        confirmed = true;
        console.log('✅ Transaction confirmed!');
        console.log('⛽ Gas used:', receipt.gasUsed.toString());
      }
    } catch (error) {
      if (error.message === 'timeout') {
        console.log('⚠️ Confirmation timeout (60s) - checking transaction status manually...');
        
        // Try to get transaction receipt directly
        try {
          const manualReceipt = await provider.getTransactionReceipt(tx.hash);
          if (manualReceipt && manualReceipt.status === 1) {
            receipt = manualReceipt;
            confirmed = true;
            console.log('✅ Transaction found and confirmed manually!');
          } else if (manualReceipt && manualReceipt.status === 0) {
            throw new Error('Transaction failed on blockchain');
          }
        } catch (manualError) {
          console.log('⚠️ Could not verify transaction status manually:', manualError.message);
        }
      } else {
        throw error;
      }
    }

    const explorerUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;

    // Return response
    if (confirmed) {
      return NextResponse.json({
        success: true,
        txHash: tx.hash,
        explorerUrl,
        message: 'Consumer registered successfully and confirmed',
        confirmed: true,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
        consumer: {
          aadhaar,
          name,
          mobile: mobileStr,
          category: normalizedCategory,
          shopkeeperAddress
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        txHash: tx.hash,
        explorerUrl,
        message: 'Consumer registration transaction sent successfully',
        confirmed: false,
        warning: 'Transaction is processing. Check PolygonScan for status.',
        consumer: {
          aadhaar,
          name,
          mobile: mobileStr,
          category: normalizedCategory,
          shopkeeperAddress
        }
      });
    }

  } catch (error) {
    console.error('❌ Registration failed:', error);

    let errorMessage = error.message;
    let errorCode = 500;

    // Handle specific errors
    if (error.reason) {
      errorMessage = error.reason;
      if (error.reason.includes('Already registered')) {
        errorMessage = `Consumer with Aadhaar ${aadhaar} already registered`;
        errorCode = 400;
      } else if (error.reason.includes('Invalid shopkeeper')) {
        errorMessage = `Shopkeeper not registered`;
        errorCode = 400;
      }
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Insufficient MATIC for gas fees';
      errorCode = 400;
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network connection error';
      errorCode = 503;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: errorCode }
    );
  }
}

// Status check endpoint
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get('txHash');
  const aadhaar = searchParams.get('aadhaar');
  
  if (!txHash && !aadhaar) {
    return NextResponse.json(
      { success: false, error: 'txHash or aadhaar parameter required' },
      { status: 400 }
    );
  }
  
  try {
    const provider = await getWorkingProvider();
    const contractABI = getMergedABI();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
    
    let result = { timestamp: new Date().toISOString() };
    
    // Check transaction status
    if (txHash) {
      try {
        const tx = await provider.getTransaction(txHash);
        const receipt = await provider.getTransactionReceipt(txHash);
        
        result.transaction = {
          hash: txHash,
          status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : (tx ? 'pending' : 'not_found'),
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString(),
          explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`
        };
      } catch (txError) {
        result.transaction = { 
          hash: txHash, 
          status: 'error', 
          error: txError.message,
          explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`
        };
      }
    }
    
    // Check consumer registration
    if (aadhaar) {
      try {
        const consumer = await contract.getConsumerByAadhaar(BigInt(aadhaar));
        const isRegistered = consumer && consumer.aadhaar && consumer.aadhaar.toString() === aadhaar;
        
        result.consumer = {
          aadhaar: aadhaar,
          registered: isRegistered,
          details: isRegistered ? {
            aadhaar: consumer.aadhaar?.toString(),
            name: consumer.name,
            mobile: consumer.mobile,
            category: consumer.category,
            shopkeeper: consumer.assignedShopkeeper,
            isActive: consumer.isActive
          } : null
        };
      } catch (consumerError) {
        result.consumer = { 
          aadhaar: aadhaar,
          registered: false, 
          error: consumerError.message 
        };
      }
    }
    
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
