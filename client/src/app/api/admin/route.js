import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import twilio from 'twilio';
import dbConnect from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';
import ShopkeeperSignupRequest from '@/models/ShopkeeperSignupRequest';
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Token Operations ABI - Simplified without events
const TOKEN_OPS_ABI = [
  "function generateTokenForConsumer(uint256 aadhaar) external",
  "function generateTokensForCategory(string category) external", 
  "function generateMonthlyTokensForAll() external"
];

// Dashboard ABI - ALL functions now available in your deployed contract
const DASHBOARD_ABI = [
  "function getAdminDashboard() view returns (tuple(uint256 totalConsumers, uint256 totalShopkeepers, uint256 totalDeliveryAgents, uint256 totalTokensIssued, uint256 totalTokensClaimed, uint256 totalTokensExpired, uint256 pendingTokens, uint256 currentMonth, uint256 currentYear, uint256 lastUpdateTime))",
  "function getShopkeeperInfo(address shopkeeper) view returns (tuple(address shopkeeperAddress, string name, string area, uint256 registrationTime, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, bool isActive))",
  "function getConsumersByShopkeeper(address shopkeeper) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[])",
  "function getTotalShopkeepers() view returns (uint256)",
  "function getTotalDeliveryAgents() view returns (uint256)",
  "function getTotalConsumers() view returns (uint256)",
  "function getCategoryWiseStats() view returns (string[] categories, uint256[] consumerCounts, uint256[] rationAmounts)",
  // NEW FUNCTIONS NOW AVAILABLE:
  "function getAllShopkeepers() view returns (address[])",
  "function getAllDeliveryAgents() view returns (address[])",
  "function getAreaWiseStats() view returns (string[] areas, uint256[] consumerCounts, uint256[] activeShopkeepers, uint256[] tokenDistributed)",
  "function getConsumersPaginated(uint256 offset, uint256 limit) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[] consumerList, uint256 total)",
  "function searchConsumersByName(string name) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[])",
  "function getConsumersNeedingEmergencyHelp() view returns (uint256[])",
  "function getShopkeeperDashboard(address shopkeeper) view returns (tuple(address shopkeeperAddress, string name, string area, uint256 registrationTime, uint256 totalConsumersAssigned, uint256 totalTokensIssued, uint256 totalDeliveries, bool isActive))",
  "function getDeliveryAgentDashboard(address agent) view returns (tuple(address agentAddress, string name, string mobile, address assignedShopkeeper, uint256 totalDeliveries, uint256 registrationTime, bool isActive))"
];

// Use public RPC
const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");

// Contract address
const CONTRACT_ADDRESS = "0x3329CA690f619bae73b9f36eb43839892D20045f";

// Initialize contracts
let adminWallet, dashboardContract, tokenOpsContract, diamondContract;

try {
  adminWallet = new ethers.Wallet(
    process.env.ADMIN_PRIVATE_KEY || "cc7a9fa8676452af481a0fd486b9e2f500143bc63893171770f4d76e7ead33ec", 
    provider
  );
  
  dashboardContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    DASHBOARD_ABI,
    provider
  );

  tokenOpsContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    TOKEN_OPS_ABI,
    adminWallet
  );

  // Add Diamond contract initialization with merged ABI
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
  
  diamondContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    getMergedABI(),
    provider
  );

  console.log('Blockchain components initialized successfully');
  console.log('Admin wallet address:', adminWallet.address);
  console.log('Contract address:', CONTRACT_ADDRESS);
  
} catch (error) {
  console.error('Failed to initialize blockchain components:', error);
}

// SMS Helper Functions
async function sendSMSNotification(phoneNumber, message) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Twilio not configured - SMS notification skipped');
      return { success: false, error: 'Twilio not configured' };
    }

    if (message.length > 160) {
      console.warn(`⚠️ Message too long (${message.length} chars), truncating...`);
      message = message.substring(0, 157) + '...';
    }

    let formattedNumber = phoneNumber.toString().replace(/\D/g, '');
    if (formattedNumber.length === 10) {
      formattedNumber = '+91' + formattedNumber;
    } else if (!formattedNumber.startsWith('+')) {
      formattedNumber = '+91' + formattedNumber;
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });

    console.log('✅ SMS sent successfully:', result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    return { success: false, error: error.message, errorCode: error.code };
  }
}

async function getConsumerDetails(aadhaar) {
  try {
    const consumer = await dashboardContract.getConsumerByAadhaar(aadhaar);
    return {
      aadhaar: Number(consumer.aadhaar),
      name: consumer.name,
      mobile: consumer.mobile,
      category: consumer.category,
      assignedShopkeeper: consumer.assignedShopkeeper
    };
  } catch (error) {
    console.error('Error fetching consumer details:', error);
    return null;
  }
}

async function getShopkeeperDetails(shopkeeperAddress) {
  try {
    const shopkeeper = await dashboardContract.getShopkeeperInfo(shopkeeperAddress);
    return {
      name: shopkeeper.name,
      area: shopkeeper.area,
      address: shopkeeper.shopkeeperAddress
    };
  } catch (error) {
    console.error('Error fetching shopkeeper details:', error);
    return { name: 'Assigned Shop', area: 'Your Area', address: shopkeeperAddress };
  }
}

function createSMSMessage(consumerName, tokenId, shopkeeperName, shopkeeperArea, category, rationAmount = 5) {
  return `🍚 GRAINLY: ${consumerName}, your ${category} ration token #${tokenId} is ready! Collect ${rationAmount}kg from ${shopkeeperName}, ${shopkeeperArea}. Valid till month end.`;
}

function createShortSMSMessage(consumerName, tokenId, category) {
  return `GRAINLY: ${consumerName}, token #${tokenId} ready. Collect your ${category} ration now!`;
}

async function sendSMSToConsumer(consumer, actualTokenId = null) {
  try {
    const shopkeeper = await getShopkeeperDetails(consumer.assignedShopkeeper);
    
    // Use actual token ID if provided, otherwise get latest token for consumer
    let tokenId = actualTokenId;
    if (!tokenId) {
      try {
        // Get the consumer's unclaimed tokens to find the latest one
        const unclaimedTokens = await dashboardContract.getUnclaimedTokensByAadhaar(consumer.aadhaar);
        if (unclaimedTokens && unclaimedTokens.length > 0) {
          // Use the latest token (last in array)
          tokenId = Number(unclaimedTokens[unclaimedTokens.length - 1]);
        } else {
          // Fallback: use a simple token reference
          tokenId = `T-${consumer.aadhaar.toString().slice(-4)}`;
        }
      } catch (error) {
        console.error('Failed to get unclaimed tokens, using fallback token ID');
        tokenId = `T-${consumer.aadhaar.toString().slice(-4)}`;
      }
    }
    
    const message = createSMSMessage(
      consumer.name,
      tokenId,
      shopkeeper.name,
      shopkeeper.area,
      consumer.category,
      5
    );

    let finalMessage = message;
    if (message.length > 160) {
      finalMessage = createShortSMSMessage(consumer.name, tokenId, consumer.category);
    }

    const result = await sendSMSNotification(consumer.mobile, finalMessage);
    
    if (result.success) {
      console.log(`✅ SMS sent to ${consumer.name} (${consumer.mobile}) with token ID: ${tokenId}`);
    } else {
      console.error(`❌ SMS failed for ${consumer.name}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Error sending SMS to consumer:', error);
    return { success: false, error: error.message };
  }
}

function formatConsumerBasic(consumer) {
  return {
    aadhaar: Number(consumer.aadhaar),
    name: consumer.name,
    mobile: consumer.mobile,
    category: consumer.category,
    assignedShopkeeper: consumer.assignedShopkeeper
  };
}

async function sendSMSNotifications(operationType, category = null, aadhaarList = null) {
  try {
    console.log(`📱 Starting SMS notifications for ${operationType}...`);
    
    let consumersToNotify = [];
    
    if (operationType === 'individual' && aadhaarList && aadhaarList.length > 0) {
      for (const aadhaar of aadhaarList) {
        try {
          const consumer = await getConsumerDetails(aadhaar);
          if (consumer) {
            consumersToNotify.push(consumer);
          }
        } catch (error) {
          console.error(`Failed to get consumer ${aadhaar}:`, error);
        }
      }
    } else if (operationType === 'category' && category) {
      try {
        const consumers = await dashboardContract.getConsumersByCategory(category);
        consumersToNotify = consumers.map(formatConsumerBasic);
      } catch (error) {
        console.error('Failed to get category consumers:', error);
      }
    } else if (operationType === 'monthly') {
      try {
        const result = await dashboardContract.getConsumersPaginated(0, 1000);
        consumersToNotify = result.consumerList.map(formatConsumerBasic);
      } catch (error) {
        console.error('Failed to get all consumers:', error);
      }
    }

    console.log(`Found ${consumersToNotify.length} consumers to notify`);

    let smsCount = 0;
    for (const consumer of consumersToNotify) {
      try {
        // Use the improved sendSMSToConsumer that gets real token IDs
        await sendSMSToConsumer(consumer);
        smsCount++;
        console.log(`SMS ${smsCount}/${consumersToNotify.length} sent to ${consumer.name}`);
        
        // Add delay between SMS to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to send SMS to ${consumer.name}:`, error);
      }
    }

    console.log(`📱 SMS notifications completed: ${smsCount}/${consumersToNotify.length} sent`);
    return { success: true, smsSent: smsCount, totalConsumers: consumersToNotify.length };
    
  } catch (error) {
    console.error('SMS notification process failed:', error);
    return { success: false, error: error.message };
  }
}

// GET request handler
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case 'dashboard':
      case 'dashboard-stats':
        return await handleDashboard();
      case 'consumers':
      case 'get-consumers':
        return await handleConsumers(searchParams);
      case 'shopkeepers':
      case 'get-shopkeepers':
        return await handleShopkeepers();
      case 'delivery-agents':
      case 'get-delivery-agents':
        return await handleDeliveryAgents();
      case 'area-stats':
        return await handleAreaStats();
      case 'category-stats':
        return await handleCategoryStats();
      case 'emergency-cases':
        return await handleEmergencyCases();
      case 'system-health-report':
        return await handleSystemHealth();
      case 'recent-activity':
        return await handleRecentActivity(searchParams);
      case 'payment-analytics':
        return await handlePaymentAnalytics();
      case 'system-settings':
        return await handleSystemSettings();
      case 'test-connection':
        return await handleTestConnection();
      case 'system-status':
        return await handleSystemStatus();
      default:
        return NextResponse.json({ success: false, error: 'Invalid endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process request'
    }, { status: 500 });
  }
}

// POST request handler
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    let body = {};
    try {
      const text = await request.text();
      if (text && text.trim() !== '') {
        body = JSON.parse(text);
      }
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    console.log('POST endpoint:', endpoint);
    console.log('Request body:', body);

    switch (endpoint) {
      case 'generate-monthly-tokens':
        return await handleGenerateMonthlyTokens();
      case 'generate-token-consumer':
      case 'generate-individual-token':
        return await handleGenerateTokenForConsumer(body);
      case 'generate-category-tokens':
        return await handleGenerateTokensForCategory(body);
      case 'generate-bpl-tokens':
        return await handleGenerateTokensForCategory({ category: 'BPL' });
      case 'generate-apl-tokens':
        return await handleGenerateTokensForCategory({ category: 'APL' });
      case 'bulk-generate-tokens':
        return await handleBulkGenerateTokens();
      case 'expire-old-tokens':
        return await handleExpireOldTokens();
      case 'pause-system':
        return await handlePauseSystem();
      case 'unpause-system':
        return await handleUnpauseSystem();
      case 'set-ration-price':
        return await handleSetRationPrice(body);
      case 'set-subsidy-percentage':
        return await handleSetSubsidyPercentage(body);
      case 'test-sms':
        return await handleTestSMS();
      case 'register-shopkeeper':
        return await handleRegisterShopkeeper(body);
      case 'assign-delivery-agent':
        return await handleAssignDeliveryAgent(body);
      case 'remove-delivery-agent':
        return await handleRemoveDeliveryAgent(body);
      case 'transfer-consumer':
        return await handleTransferConsumer(body);
      case 'update-consumer-category':
        return await handleUpdateConsumerCategory(body);
      default:
        return NextResponse.json({ 
          success: false, 
          error: `Invalid endpoint: ${endpoint}` 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin API POST Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to process request'
    }, { status: 500 });
  }
}

async function handleGenerateMonthlyTokens() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Generating monthly tokens for all consumers...');
    
    // Use diamondContract instead of tokenOpsContract
    const tx = await diamondContract.connect(adminWallet).generateMonthlyTokensForAll({
      gasLimit: 2000000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('monthly');
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Monthly token generation completed successfully. SMS notifications are being sent to all consumers.'
    });
  } catch (error) {
    console.error('Generate monthly tokens error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate monthly tokens: ${error.message}`
    }, { status: 500 });
  }
}

async function handleGenerateTokenForConsumer(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { aadhaar } = body;
    
    if (!aadhaar) {
      throw new Error('Aadhaar number is required');
    }

    console.log(`🚀 Generating token for consumer: ${aadhaar}`);
    
    // Use diamondContract instead of tokenOpsContract
    const tx = await diamondContract.connect(adminWallet).generateTokenForConsumer(aadhaar, {
      gasLimit: 500000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      // Extract token ID from transaction logs/events
      let actualTokenId = null;
      try {
        // Look for TokenGenerated or similar events in the logs
        const tokenGeneratedEvents = receipt.logs.filter(log => {
          // Check if this looks like a token generation event
          return log.topics && log.topics.length > 0;
        });
        
        if (tokenGeneratedEvents.length > 0) {
          // Try to decode the event to get token ID
          // This is a simplified approach - you might need to adjust based on your contract's event structure
          const eventData = tokenGeneratedEvents[0];
          if (eventData.data && eventData.data !== '0x') {
            // Parse the token ID from event data (this might need adjustment based on your contract)
            try {
              const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], eventData.data);
              actualTokenId = Number(decodedData[0]);
              console.log('📋 Extracted token ID from event:', actualTokenId);
            } catch (decodeError) {
              console.warn('Could not decode token ID from event, will fetch from contract');
            }
          }
        }
      } catch (eventError) {
        console.warn('Could not extract token ID from events:', eventError.message);
      }

      setTimeout(async () => {
        try {
          const consumer = await getConsumerDetails(aadhaar);
          if (consumer) {
            await sendSMSToConsumer(consumer, actualTokenId);
            console.log('📱 SMS notification sent with actual token ID');
          }
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Token generation completed for Aadhaar ${aadhaar}. SMS notification is being sent to the consumer.`
    });
  } catch (error) {
    console.error('Generate token for consumer error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate token: ${error.message}`
    }, { status: 500 });
  }
}

async function handleGenerateTokensForCategory(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { category } = body;
    
    if (!category) {
      throw new Error('Category is required');
    }

    console.log(`🚀 Generating tokens for category: ${category}`);
    
    // Use diamondContract instead of tokenOpsContract
    const tx = await diamondContract.connect(adminWallet).generateTokensForCategory(category, {
      gasLimit: 1500000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('category', category);
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Token generation completed for category ${category}. SMS notifications are being sent to all ${category} consumers.`
    });
  } catch (error) {
    console.error('Generate tokens for category error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to generate tokens for category: ${error.message}`
    }, { status: 500 });
  }
}

async function handleTestSMS() {
  try {
    const testMessage = `GRAINLY TEST: SMS working! Time: ${new Date().getHours()}:${new Date().getMinutes()}`;
    
    console.log('🧪 Testing short SMS...');
    console.log(`📝 Test message length: ${testMessage.length} characters`);
    
    const result = await sendSMSNotification('8284941698', testMessage);
    
    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test SMS sent successfully!' : 'Test SMS failed',
      details: result,
      instructions: result.success 
        ? 'Check your phone for the test message' 
        : 'Check Twilio Console for error details'
    });
  } catch (error) {
    console.error('Test SMS error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function handleDashboard() {
  try {
    console.log('Fetching dashboard data...');
    
    if (!dashboardContract) {
      console.error('Dashboard contract not initialized');
      throw new Error('Dashboard contract not initialized');
    }

    console.log('Calling getAdminDashboard() on contract...');
    const dashboardData = await dashboardContract.getAdminDashboard();
    console.log('Raw dashboard data from blockchain:', dashboardData);
    
    const processedData = {
      totalConsumers: Number(dashboardData.totalConsumers),
      totalShopkeepers: Number(dashboardData.totalShopkeepers),
      totalDeliveryAgents: Number(dashboardData.totalDeliveryAgents),
      totalTokensIssued: Number(dashboardData.totalTokensIssued),
      totalTokensClaimed: Number(dashboardData.totalTokensClaimed),
      totalTokensExpired: Number(dashboardData.totalTokensExpired),
      pendingTokens: Number(dashboardData.pendingTokens),
      currentMonth: Number(dashboardData.currentMonth),
      currentYear: Number(dashboardData.currentYear),
      lastUpdateTime: Number(dashboardData.lastUpdateTime)
    };

    console.log('Processed dashboard data:', processedData);
    
    // Verify the data by cross-checking with individual functions
    try {
      const totalConsumersCheck = await dashboardContract.getTotalConsumers();
      const actualConsumers = Number(totalConsumersCheck);
      
      if (actualConsumers === 0 && processedData.totalConsumers > 0) {
        console.log('⚠️ Dashboard shows consumers but getTotalConsumers returns 0 - using conservative data');
        processedData.totalConsumers = 0;
      }
    } catch (checkError) {
      console.log('Could not verify consumer count:', checkError.message);
    }
    
    return NextResponse.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    // Return actual zeros instead of fallback data to show real state
    return NextResponse.json({
      success: true,
      data: {
        totalConsumers: 0,
        totalShopkeepers: 0,
        totalDeliveryAgents: 0,
        totalTokensIssued: 0,
        totalTokensClaimed: 0,
        totalTokensExpired: 0,
        pendingTokens: 0,
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear(),
        lastUpdateTime: Math.floor(Date.now() / 1000)
      },
      warning: `Blockchain connection failed: ${error.message}`,
      error: true
    });
  }
}

async function handleConsumers(searchParams) {
  try {
    console.log('Fetching consumers from blockchain...');
    
    if (!dashboardContract) {
      console.error('Dashboard contract not initialized');
      throw new Error('Dashboard contract not initialized');
    }

    const offset = parseInt(searchParams.get('offset') || searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    console.log(`Fetching consumers: offset=${offset}, limit=${limit}, category=${category}, search=${search}`);

    let consumers = [];
    let total = 0;
    
    if (search) {
      console.log('Searching consumers by name:', search);
      try {
        const searchResults = await dashboardContract.searchConsumersByName(search);
        console.log('Search results:', searchResults);
        consumers = searchResults.map(formatConsumer);
        total = consumers.length;
      } catch (searchError) {
        console.error('Search function failed:', searchError);
        // Fallback: get all consumers and filter locally
        const result = await dashboardContract.getConsumersPaginated(0, 1000);
        const allConsumers = result.consumerList.map(formatConsumer);
        consumers = allConsumers.filter(c => 
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.aadhaar.toString().includes(search)
        );
        total = consumers.length;
      }
    } else if (category && category !== 'all') {
      console.log('Fetching consumers by category:', category);
      try {
        const categoryConsumers = await dashboardContract.getConsumersByCategory(category);
        console.log('Category consumers:', categoryConsumers);
        consumers = categoryConsumers.map(formatConsumer);
        total = consumers.length;
      } catch (categoryError) {
        console.error('Category function failed:', categoryError);
        // Fallback: get all consumers and filter by category
        const result = await dashboardContract.getConsumersPaginated(0, 1000);
        const allConsumers = result.consumerList.map(formatConsumer);
        consumers = allConsumers.filter(c => c.category === category);
        total = consumers.length;
      }
    } else {
      console.log('Fetching paginated consumers...');
      try {
        const result = await dashboardContract.getConsumersPaginated(offset, limit);
        console.log('Paginated result:', result);
        consumers = result.consumerList ? result.consumerList.map(formatConsumer) : [];
        total = Number(result.total || 0);
        
        console.log(`Found ${consumers.length} consumers, total: ${total}`);
      } catch (paginationError) {
        console.error('Pagination function failed:', paginationError);
        
        // Final fallback: try to get total consumers count
        try {
          const totalConsumers = await dashboardContract.getTotalConsumers();
          total = Number(totalConsumers);
          console.log(`Total consumers from blockchain: ${total}`);
          
          if (total > 0) {
            return NextResponse.json({
              success: true,
              data: [],
              total: total,
              pagination: {
                offset: Number(offset),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
              },
              warning: `Found ${total} consumers on blockchain, but getConsumersPaginated function is not available in the deployed contract. This might be a Diamond contract configuration issue.`,
              info: {
                suggestion: 'Try registering new consumers or check if the Diamond contract facets are properly deployed.',
                contractFunction: 'getConsumersPaginated',
                totalFound: total
              }
            });
          }
        } catch (totalError) {
          console.error('Even getTotalConsumers failed:', totalError);
        }
        
        // Return empty result with error info
        consumers = [];
        total = 0;
      }
    }

    const response = {
      success: true,
      data: consumers,
      total: total,
      pagination: {
        offset: Number(offset),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      },
      dataSource: 'blockchain',
      contractAddress: CONTRACT_ADDRESS,
      timestamp: new Date().toISOString()
    };

    if (consumers.length === 0 && total === 0) {
      response.warning = 'No consumers found on blockchain. This could mean no consumers are registered yet, or there might be a contract configuration issue.';
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Consumers fetch error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
      pagination: {
        offset: 0,
        limit: 50,
        totalPages: 0
      },
      warning: `Blockchain connection issue: ${error.message}. This might be because no consumers are registered yet, or there's a contract deployment issue.`,
      error: true,
      errorDetails: {
        message: error.message,
        code: error.code,
        suggestion: 'Try registering a consumer first through the consumer signup page, or check if the contract is properly deployed.'
      }
    });
  }
}

async function handleShopkeepers() {
  try {
    console.log('🏪 Fetching shopkeepers from blockchain...');
    
    // Try blockchain first with the new getAllShopkeepers function
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    try {
      // Get all shopkeeper addresses using the new function
      const shopkeeperAddresses = await contract.getAllShopkeepers();
      console.log(`✅ Found ${shopkeeperAddresses.length} shopkeepers on blockchain`);
      
      // Get detailed info for each shopkeeper
      const shopkeepers = [];
      for (const address of shopkeeperAddresses) {
        try {
          const info = await contract.getShopkeeperInfo(address);
          shopkeepers.push({
            shopkeeperAddress: info.shopkeeperAddress,
            name: info.name,
            area: info.area,
            mobile: 'Available via blockchain',
            registrationTime: Number(info.registrationTime),
            totalConsumersAssigned: Number(info.totalConsumersAssigned),
            totalTokensIssued: Number(info.totalTokensIssued),
            totalDeliveries: Number(info.totalDeliveries),
            isActive: info.isActive,
            dataSource: 'blockchain'
          });
        } catch (error) {
          console.error(`Error getting info for shopkeeper ${address}:`, error);
        }
      }
      
      console.log(`🎉 Successfully fetched ${shopkeepers.length} shopkeepers from blockchain!`);
      
      return NextResponse.json({
        success: true,
        data: shopkeepers,
        dataSource: 'blockchain',
        message: `Found ${shopkeepers.length} shopkeepers from blockchain`,
        info: {
          totalOnBlockchain: shopkeeperAddresses.length,
          successfullyFetched: shopkeepers.length,
          note: 'Data fetched directly from blockchain using getAllShopkeepers()'
        }
      });
      
    } catch (blockchainError) {
      console.log('❌ getAllShopkeepers failed:', blockchainError.message);
      
      // Fallback to database
      await dbConnect();
      console.log('📦 Falling back to database...');
      
      const shopkeeperRequests = await ShopkeeperSignupRequest.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .lean();
      
      const shopkeepers = shopkeeperRequests.map(request => ({
        shopkeeperAddress: request.walletAddress,
        name: request.name || 'Unknown',
        area: request.area || 'Unknown',
        mobile: request.mobile || 'Not provided',
        registrationTime: Math.floor(new Date(request.updatedAt).getTime() / 1000),
        totalConsumersAssigned: 0,
        totalTokensIssued: 0,
        totalDeliveries: 0,
        isActive: true,
        dataSource: 'database'
      }));

      return NextResponse.json({
        success: true,
        data: shopkeepers,
        dataSource: 'database',
        message: `Found ${shopkeepers.length} shopkeepers from database`,
        blockchainError: blockchainError.message,
        info: {
          note: 'Blockchain function failed, using database fallback',
          totalInDatabase: shopkeepers.length
        }
      });
    }
    
  } catch (error) {
    console.error('Shopkeepers fetch error:', error);
    
    return NextResponse.json({
      success: false,
      data: [],
      error: `Failed to fetch shopkeepers: ${error.message}`
    });
  }
}

// SINGLE handleDeliveryAgents function - Now using getAllDeliveryAgents from blockchain
async function handleDeliveryAgents() {
  try {
    console.log('🚚 Fetching delivery agents from blockchain...');
    
    // Try blockchain first with the new getAllDeliveryAgents function
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );

    let blockchainAgents = [];
    
    try {
      // Get all delivery agent addresses using the new function
      const agentAddresses = await contract.getAllDeliveryAgents();
      console.log(`✅ Found ${agentAddresses.length} delivery agents on blockchain`);
      
      // Get detailed info for each agent
      for (const address of agentAddresses) {
        try {
          const agentInfo = await contract.getDeliveryAgentDashboard(address);
          blockchainAgents.push({
            agentAddress: agentInfo.agentAddress,
            name: agentInfo.name,
            mobile: agentInfo.mobile,
            assignedShopkeeper: agentInfo.assignedShopkeeper,
            totalDeliveries: Number(agentInfo.totalDeliveries),
            registrationTime: Number(agentInfo.registrationTime),
            isActive: agentInfo.isActive,
            dataSource: 'blockchain'
          });
        } catch (infoError) {
          console.log(`⚠️ Could not get details for agent ${address}, using basic info`);
          blockchainAgents.push({
            agentAddress: address,
            name: 'Unknown Agent',
            mobile: 'Not available',
            assignedShopkeeper: '0x0000000000000000000000000000000000000000',
            totalDeliveries: 0,
            registrationTime: 0,
            isActive: true,
            dataSource: 'blockchain-limited'
          });
        }
      }
      
      console.log(`🎉 Successfully fetched ${blockchainAgents.length} agents from blockchain!`);
      
    } catch (blockchainError) {
      console.log('❌ getAllDeliveryAgents failed:', blockchainError.message);
    }

    // Also get approved agents from database for comparison
    await dbConnect();
    const approvedPartners = await DeliverySignupRequest.find({ 
      status: 'approved' 
    }).select('name phone walletAddress vehicleType licenseNumber reviewedAt blockchainTxHash');

    // Combine data from both sources, prioritizing blockchain data
    const combinedAgents = [];
    const processedAddresses = new Set();

    // Add blockchain agents first
    for (const agent of blockchainAgents) {
      combinedAgents.push(agent);
      processedAddresses.add(agent.agentAddress.toLowerCase());
    }

    // Add approved partners not already in blockchain data
    for (const partner of approvedPartners) {
      if (!processedAddresses.has(partner.walletAddress.toLowerCase())) {
        combinedAgents.push({
          agentAddress: partner.walletAddress,
          name: partner.name,
          mobile: partner.phone,
          assignedShopkeeper: '0x0000000000000000000000000000000000000000',
          totalDeliveries: 0,
          registrationTime: Math.floor(new Date(partner.reviewedAt).getTime() / 1000),
          isActive: true,
          dataSource: 'database',
          txHash: partner.blockchainTxHash
        });
      }
    }

    console.log(`📊 Combined agents: ${combinedAgents.length} total (${blockchainAgents.length} from blockchain, ${approvedPartners.length} from database)`);

    return NextResponse.json({
      success: true,
      data: combinedAgents,
      metadata: {
        totalAgents: combinedAgents.length,
        blockchainAgents: blockchainAgents.length,
        databaseAgents: approvedPartners.length,
        lastUpdated: new Date().toISOString(),
        note: blockchainAgents.length > 0 ? 'Successfully using blockchain data' : 'Using database fallback'
      }
    });

  } catch (error) {
    console.error('❌ Delivery agents fetch error:', error);
    
    // Final fallback: Return only database data if everything fails
    try {
      await dbConnect();
      const fallbackPartners = await DeliverySignupRequest.find({ 
        status: 'approved' 
      }).select('name phone walletAddress reviewedAt blockchainTxHash');

      return NextResponse.json({
        success: true,
        data: fallbackPartners.map(partner => ({
          agentAddress: partner.walletAddress,
          name: partner.name,
          mobile: partner.phone,
          assignedShopkeeper: '0x0000000000000000000000000000000000000000',
          totalDeliveries: 0,
          registrationTime: Math.floor(new Date(partner.reviewedAt).getTime() / 1000),
          isActive: true,
          dataSource: 'database_fallback',
          txHash: partner.blockchainTxHash
        })),
        warning: 'Using database fallback due to blockchain connection issues'
      });
    } catch (fallbackError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch delivery agents from any source',
        details: fallbackError.message
      }, { status: 500 });
    }
  }
}

async function handleAreaStats() {
  try {
    console.log('📍 Fetching area statistics from blockchain...');
    
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );
    
    const areaStats = await contract.getAreaWiseStats();
    
    const areas = areaStats.areas;
    const consumerCounts = areaStats.consumerCounts;
    const activeShopkeepers = areaStats.activeShopkeepers;
    const tokenDistributed = areaStats.tokenDistributed;

    const formattedStats = areas.map((area, index) => ({
      area,
      consumers: Number(consumerCounts[index]),
      shopkeepers: Number(activeShopkeepers[index]),
      tokensDistributed: Number(tokenDistributed[index])
    }));

    console.log(`✅ Successfully fetched area stats for ${formattedStats.length} areas`);

    return NextResponse.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Area stats fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No area statistics available - blockchain connection issue',
      error: error.message
    });
  }
}

async function handleCategoryStats() {
  try {
    const categoryStats = await dashboardContract.getCategoryWiseStats();
    
    const categories = categoryStats.categories;
    const consumers = categoryStats.consumerCounts;
    const rationAmounts = categoryStats.rationAmounts;

    const formattedStats = categories.map((category, index) => ({
      category,
      consumers: Number(consumers[index]),
      rationAmounts: Number(rationAmounts[index])
    }));

    return NextResponse.json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    console.error('Category stats fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No category statistics available - blockchain connection issue'
    });
  }
}

async function handleEmergencyCases() {
  try {
    console.log('🚨 Fetching emergency cases from blockchain...');
    
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      DASHBOARD_ABI,
      provider
    );
    
    const emergencyAadhaars = await contract.getConsumersNeedingEmergencyHelp();
    
    const emergencyConsumers = [];
    
    for (const aadhaar of emergencyAadhaars) {
      try {
        const consumer = await contract.getConsumerByAadhaar(aadhaar);
        emergencyConsumers.push(formatConsumer(consumer));
      } catch (error) {
        console.error(`Failed to fetch consumer ${aadhaar}:`, error);
      }
    }

    console.log(`✅ Found ${emergencyConsumers.length} consumers needing emergency help`);

    return NextResponse.json({
      success: true,
      data: emergencyConsumers
    });
  } catch (error) {
    console.error('Emergency cases fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No emergency cases data available - blockchain connection issue',
      error: error.message
    });
  }
}

async function handleSystemHealth() {
  try {
    const healthData = await dashboardContract.getSystemHealthReport();
    
    return NextResponse.json({
      success: true,
      data: {
        totalRegisteredConsumers: Number(healthData.totalRegisteredConsumers),
        activeConsumers: Number(healthData.activeConsumers),
        inactiveConsumers: Number(healthData.inactiveConsumers),
        consumersWithCurrentMonthToken: Number(healthData.consumersWithCurrentMonthToken),
        consumersWithoutCurrentMonthToken: Number(healthData.consumersWithoutCurrentMonthToken),
        totalShopkeepers: Number(healthData.totalShopkeepers),
        totalDeliveryAgents: Number(healthData.totalDeliveryAgents),
        systemEfficiencyScore: Number(healthData.systemEfficiencyScore)
      }
    });
  } catch (error) {
    console.error('System health fetch error:', error);
    return NextResponse.json({
      success: true,
      data: {
        totalRegisteredConsumers: 0,
        activeConsumers: 0,
        inactiveConsumers: 0,
        consumersWithCurrentMonthToken: 0,
        consumersWithoutCurrentMonthToken: 0,
        totalShopkeepers: 0,
        totalDeliveryAgents: 0,
        systemEfficiencyScore: 0
      },
      warning: 'Using fallback health data - blockchain connection issue'
    });
  }
}

async function handleRecentActivity(searchParams) {
  try {
    const limit = searchParams.get('limit') || '10';
    const activity = await dashboardContract.getRecentActivityLogs(limit);
    
    return NextResponse.json({
      success: true,
      data: activity.map(log => ({
        timestamp: Number(log.timestamp),
        actor: log.actor,
        action: log.action,
        aadhaar: Number(log.aadhaar),
        tokenId: Number(log.tokenId),
        details: log.details
      }))
    });
  } catch (error) {
    console.error('Recent activity fetch error:', error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: 'No recent activity data available - blockchain connection issue'
    });
  }
}

async function handlePaymentAnalytics() {
  try {
    console.log('Fetching payment analytics...');
    
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    // Get payment analytics from the blockchain
    try {
      const paymentData = await diamondContract.getPaymentAnalytics();
      
      return NextResponse.json({
        success: true,
        data: {
          totalPayments: Number(paymentData.totalPayments || 0),
          totalAmount: Number(paymentData.totalAmount || 0),
          pendingPayments: Number(paymentData.pendingPayments || 0),
          failedPayments: Number(paymentData.failedPayments || 0),
          successRate: Number(paymentData.successRate || 0),
          averagePayment: Number(paymentData.averagePayment || 0),
          monthlyGrowth: Number(paymentData.monthlyGrowth || 0),
          activeUsers: Number(paymentData.activeUsers || 0)
        }
      });
    } catch (contractError) {
      console.log('Contract method not available, returning zero data');
      // Return zero data if contract method is not available
      return NextResponse.json({
        success: true,
        data: {
          totalPayments: 0,
          totalAmount: 0,
          pendingPayments: 0,
          failedPayments: 0,
          successRate: 0,
          averagePayment: 0,
          monthlyGrowth: 0,
          activeUsers: 0
        },
        warning: 'Payment analytics not available - contract method not implemented'
      });
    }
  } catch (error) {
    console.error('Payment analytics fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function handleSystemSettings() {
  try {
    console.log('Fetching system settings...');
    
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    try {
      // Get system settings from the blockchain
      const rationPrice = await diamondContract.getRationPrice();
      const subsidyPercentage = await diamondContract.getSubsidyPercentage();
      const isPaused = await diamondContract.paused();
      const dcvTokenAddress = await diamondContract.getDCVTokenAddress();
      
      return NextResponse.json({
        success: true,
        data: {
          rationPrice: Number(rationPrice) / 100, // Convert from wei/cents to rupees
          subsidyPercentage: Number(subsidyPercentage),
          isPaused: isPaused,
          dcvTokenAddress: dcvTokenAddress,
          paymentSystemEnabled: true // Assume enabled for now
        }
      });
    } catch (contractError) {
      console.log('Contract methods not available, returning default settings');
      return NextResponse.json({
        success: true,
        data: {
          rationPrice: 0,
          subsidyPercentage: 0,
          isPaused: false,
          dcvTokenAddress: '0x0000000000000000000000000000000000000000',
          paymentSystemEnabled: false
        },
        warning: 'System settings not available - contract methods not implemented'
      });
    }
  } catch (error) {
    console.error('System settings fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

function formatConsumer(consumer) {
  return {
    aadhaar: Number(consumer.aadhaar),
    name: consumer.name,
    mobile: consumer.mobile,
    category: consumer.category,
    registrationTime: Number(consumer.registrationTime),
    assignedShopkeeper: consumer.assignedShopkeeper,
    totalTokensReceived: Number(consumer.totalTokensReceived),
    totalTokensClaimed: Number(consumer.totalTokensClaimed),
    lastTokenIssuedTime: Number(consumer.lastTokenIssuedTime),
    isActive: consumer.isActive,
    hasCurrentMonthToken: Number(consumer.lastTokenIssuedTime) > 0,
    availableTokens: Number(consumer.totalTokensReceived) - Number(consumer.totalTokensClaimed),
    shopkeeper: consumer.assignedShopkeeper === "0x0000000000000000000000000000000000000000" ? "Not Assigned" : "Assigned"
  };
}

async function handleBulkGenerateTokens() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Bulk generating tokens...');
    
    const tx = await diamondContract.bulkGenerateTokens({
      gasLimit: 3000000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');

    if (receipt.status === 1) {
      setTimeout(async () => {
        try {
          const result = await sendSMSNotifications('monthly');
          console.log('📱 SMS notification result:', result);
        } catch (error) {
          console.error('SMS notification error:', error);
        }
      }, 2000);
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Bulk token generation completed successfully.'
    });
  } catch (error) {
    console.error('Bulk generate tokens error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to bulk generate tokens: ${error.message}`
    }, { status: 500 });
  }
}

async function handleExpireOldTokens() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Expiring old tokens...');
    
    const tx = await diamondContract.expireOldTokens({
      gasLimit: 1000000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Old tokens expired successfully.'
    });
  } catch (error) {
    console.error('Expire old tokens error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to expire old tokens: ${error.message}`
    }, { status: 500 });
  }
}

async function handlePauseSystem() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Pausing system...');
    
    const tx = await diamondContract.pause({
      gasLimit: 300000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'System paused successfully.'
    });
  } catch (error) {
    console.error('Pause system error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to pause system: ${error.message}`
    }, { status: 500 });
  }
}

async function handleUnpauseSystem() {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    console.log('🚀 Unpausing system...');
    
    const tx = await diamondContract.unpause({
      gasLimit: 300000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'System unpaused successfully.'
    });
  } catch (error) {
    console.error('Unpause system error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to unpause system: ${error.message}`
    }, { status: 500 });
  }
}

async function handleSetRationPrice(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { price } = body;
    
    if (!price) {
      throw new Error('Price is required');
    }

    console.log(`🚀 Setting ration price to: ${price}`);
    
    // Convert price to appropriate units (assuming contract expects in cents/wei)
    const priceInCents = Math.round(parseFloat(price) * 100);
    
    const tx = await diamondContract.setRationPrice(priceInCents, {
      gasLimit: 300000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Ration price set to ₹${price} successfully.`
    });
  } catch (error) {
    console.error('Set ration price error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to set ration price: ${error.message}`
    }, { status: 500 });
  }
}

async function handleSetSubsidyPercentage(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { percentage } = body;
    
    if (!percentage) {
      throw new Error('Subsidy percentage is required');
    }

    console.log(`🚀 Setting subsidy percentage to: ${percentage}%`);
    
    const tx = await diamondContract.setSubsidyPercentage(percentage, {
      gasLimit: 300000
    });
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: `Subsidy percentage set to ${percentage}% successfully.`
    });
  } catch (error) {
    console.error('Set subsidy percentage error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to set subsidy percentage: ${error.message}`
    }, { status: 500 });
  }
}

async function handleTestConnection() {
  try {
    console.log('Testing blockchain connection...');
    
    const connectionStatus = {
      provider: !!provider,
      dashboardContract: !!dashboardContract,
      diamondContract: !!diamondContract,
      adminWallet: !!adminWallet,
      contractAddress: dashboardContract?.target || 'Not set',
      walletAddress: adminWallet?.address || 'Not set',
      network: 'Polygon Amoy Testnet',
      rpcUrl: 'https://rpc-amoy.polygon.technology'
    };

    console.log('Connection status:', connectionStatus);

    // Test if we can call a simple method
    try {
      const network = await provider.getNetwork();
      connectionStatus.networkId = network.chainId.toString();
      connectionStatus.networkName = network.name;
      
      // Test contract call
      const blockNumber = await provider.getBlockNumber();
      connectionStatus.latestBlock = blockNumber;
      connectionStatus.contractCallTest = 'Success';
    } catch (networkError) {
      console.error('Network test failed:', networkError);
      connectionStatus.contractCallTest = `Failed: ${networkError.message}`;
    }

    return NextResponse.json({
      success: true,
      data: connectionStatus
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        provider: false,
        dashboardContract: false,
        diamondContract: false,
        adminWallet: false,
        contractCallTest: 'Failed'
      }
    });
  }
}

async function handleRegisterShopkeeper(body) {
  try {
    const { shopkeeperAddress, name, area } = body;

    // Validate required fields
    if (!shopkeeperAddress || !name || !area) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: shopkeeperAddress, name, area' },
        { status: 400 }
      );
    }

    // Validate shopkeeper address format
    if (!ethers.isAddress(shopkeeperAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shopkeeper address format' },
        { status: 400 }
      );
    }

    console.log('🏪 Registering shopkeeper on blockchain:', {
      shopkeeperAddress,
      name,
      area
    });

    if (!diamondContract) {
      return NextResponse.json(
        { success: false, error: 'Diamond contract not initialized' },
        { status: 500 }
      );
    }

    console.log('📝 Calling registerShopkeeper function...');

    // Register shopkeeper on blockchain
    const tx = await diamondContract.registerShopkeeper(
      shopkeeperAddress,
      name,
      area
    );

    console.log('⏳ Transaction submitted:', tx.hash);
    console.log('⏳ Waiting for transaction confirmation...');

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

    // Generate PolygonScan URL
    const polygonScanUrl = `https://amoy.polygonscan.com/tx/${tx.hash}`;

    // Send SMS notification if possible
    try {
      await sendSMSNotification(
        '+1234567890', // You might want to add phone number to shopkeeper registration
        `🏪 Shopkeeper Registration: ${name} has been successfully registered at ${area}. Wallet: ${shopkeeperAddress}`
      );
    } catch (smsError) {
      console.log('SMS notification failed:', smsError.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Shopkeeper registered successfully',
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      polygonScanUrl,
      shopkeeper: {
        address: shopkeeperAddress,
        name,
        area
      }
    });

  } catch (error) {
    console.error('❌ Shopkeeper registration failed:', error);
    
    // Handle specific blockchain errors
    if (error.code === 'CALL_EXCEPTION') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Smart contract call failed - shopkeeper may already be registered or invalid parameters',
          details: error.reason || error.message
        },
        { status: 400 }
      );
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient funds for gas fees',
          details: 'Admin wallet needs more MATIC for transaction fees'
        },
        { status: 400 }
      );
    }

    if (error.code === 'NETWORK_ERROR') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Network connection failed',
          details: 'Unable to connect to Polygon network'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to register shopkeeper: ' + error.message,
        details: error.code || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleAssignDeliveryAgent(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { shopkeeperAddress, deliveryAgentAddress } = body;
    
    if (!shopkeeperAddress || !deliveryAgentAddress) {
      throw new Error('Shopkeeper address and delivery agent address are required');
    }

    console.log(`🚀 Assigning delivery agent ${deliveryAgentAddress} to shopkeeper ${shopkeeperAddress}`);
    
    // Pre-flight checks to diagnose the issue
    try {
      console.log('🔍 Performing pre-flight checks...');
      
      // Check if delivery agent exists and is registered
      try {
        const agentInfo = await diamondContract.getDeliveryAgentInfo(deliveryAgentAddress);
        console.log('✅ Delivery agent info:', {
          address: agentInfo.agentAddress,
          name: agentInfo.name,
          isActive: agentInfo.isActive
        });
        
        if (!agentInfo.isActive) {
          throw new Error(`Delivery agent ${deliveryAgentAddress} is not active`);
        }
      } catch (agentError) {
        console.error('❌ Delivery agent check failed:', agentError);
        throw new Error(`Delivery agent ${deliveryAgentAddress} not found or not registered: ${agentError.message}`);
      }
      
      // Check if shopkeeper exists and is registered  
      try {
        const shopkeeperInfo = await diamondContract.getShopkeeperInfo(shopkeeperAddress);
        console.log('✅ Shopkeeper info:', {
          address: shopkeeperInfo.shopkeeperAddress,
          name: shopkeeperInfo.name,
          isActive: shopkeeperInfo.isActive
        });
        
        if (!shopkeeperInfo.isActive) {
          throw new Error(`Shopkeeper ${shopkeeperAddress} is not active`);
        }
      } catch (shopkeeperError) {
        console.error('❌ Shopkeeper check failed:', shopkeeperError);
        throw new Error(`Shopkeeper ${shopkeeperAddress} not found or not registered: ${shopkeeperError.message}`);
      }
      
      // Check if agent is already assigned
      try {
        const currentAssignment = await diamondContract.getAssignedDeliveryAgent(shopkeeperAddress);
        if (currentAssignment && currentAssignment[0] && currentAssignment[0] !== '0x0000000000000000000000000000000000000000') {
          console.log('⚠️ Shopkeeper already has an assigned agent:', currentAssignment[0]);
          // This might not be an error - could be reassignment
        }
      } catch (assignmentError) {
        console.log('ℹ️ Could not check current assignment:', assignmentError.message);
      }
      
      console.log('✅ Pre-flight checks passed, proceeding with assignment...');
    } catch (preflightError) {
      throw preflightError;
    }
    
    const tx = await diamondContract.connect(adminWallet).assignDeliveryAgentToShopkeeper(
      deliveryAgentAddress, // First parameter: delivery agent address
      shopkeeperAddress,    // Second parameter: shopkeeper address
      {
        gasLimit: 500000
      }
    );
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    if (receipt.status === 0) {
      throw new Error('Transaction reverted - check contract logic and requirements');
    }
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Delivery agent assigned successfully.'
    });
  } catch (error) {
    console.error('Assign delivery agent error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to assign delivery agent: ${error.message}`
    }, { status: 500 });
  }
}

async function handleRemoveDeliveryAgent(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { shopkeeperAddress } = body;
    
    if (!shopkeeperAddress) {
      throw new Error('Shopkeeper address is required');
    }

    console.log(`🚀 Removing delivery agent from shopkeeper ${shopkeeperAddress}`);
    
    const tx = await diamondContract.connect(adminWallet).removeDeliveryAgentFromShopkeeper(
      shopkeeperAddress,
      {
        gasLimit: 500000
      }
    );
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Delivery agent removed successfully.'
    });
  } catch (error) {
    console.error('Remove delivery agent error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to remove delivery agent: ${error.message}`
    }, { status: 500 });
  }
}

async function handleTransferConsumer(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { aadhaar, newShopkeeperAddress } = body;
    
    if (!aadhaar || !newShopkeeperAddress) {
      throw new Error('Aadhaar and new shopkeeper address are required');
    }

    console.log(`🚀 Transferring consumer ${aadhaar} to shopkeeper ${newShopkeeperAddress}`);
    
    const tx = await diamondContract.connect(adminWallet).transferConsumerToShopkeeper(
      aadhaar, 
      newShopkeeperAddress,
      {
        gasLimit: 500000
      }
    );
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Consumer transferred successfully.'
    });
  } catch (error) {
    console.error('Transfer consumer error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to transfer consumer: ${error.message}`
    }, { status: 500 });
  }
}

async function handleUpdateConsumerCategory(body) {
  try {
    if (!diamondContract) {
      throw new Error('Diamond contract not initialized');
    }

    const { aadhaar, newCategory } = body;
    
    if (!aadhaar || !newCategory) {
      throw new Error('Aadhaar and new category are required');
    }

    console.log(`🚀 Updating consumer ${aadhaar} category to ${newCategory}`);
    
    const tx = await diamondContract.connect(adminWallet).updateConsumerCategory(
      aadhaar, 
      newCategory,
      {
        gasLimit: 500000
      }
    );
    
    console.log('✅ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.status === 1 ? 'Success' : 'Failed');
    
    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`,
      message: 'Consumer category updated successfully.'
    });
  } catch (error) {
    console.error('Update consumer category error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to update consumer category: ${error.message}`
    }, { status: 500 });
  }
}

async function handleSystemStatus() {
  try {
    console.log('🔍 Performing comprehensive system status check...');
    
    const status = {
      contract: {
        address: CONTRACT_ADDRESS,
        network: 'Polygon Amoy Testnet',
        connected: !!dashboardContract
      },
      functions: {
        available: [],
        unavailable: [],
        testResults: {}
      },
      data: {
        dashboard: null,
        actualCounts: {}
      }
    };

    if (!dashboardContract) {
      throw new Error('Contract not initialized');
    }

    // Test major functions
    const functionsToTest = [
      'getAdminDashboard',
      'getTotalConsumers', 
      'getAllShopkeepers',
      'getDeliveryAgents',
      'getConsumersPaginated'
    ];

    for (const funcName of functionsToTest) {
      try {
        console.log(`Testing ${funcName}...`);
        let result;
        
        switch (funcName) {
          case 'getAdminDashboard':
            result = await dashboardContract.getAdminDashboard();
            status.data.dashboard = {
              totalConsumers: Number(result.totalConsumers),
              totalShopkeepers: Number(result.totalShopkeepers),
              totalDeliveryAgents: Number(result.totalDeliveryAgents)
            };
            break;
          case 'getTotalConsumers':
            result = await dashboardContract.getTotalConsumers();
            status.data.actualCounts.consumers = Number(result);
            break;
          case 'getAllShopkeepers':
            result = await dashboardContract.getAllShopkeepers();
            status.data.actualCounts.shopkeepers = result ? result.length : 0;
            break;
          case 'getDeliveryAgents':
            result = await dashboardContract.getDeliveryAgents();
            status.data.actualCounts.deliveryAgents = result ? result.length : 0;
            break;
          case 'getConsumersPaginated':
            result = await dashboardContract.getConsumersPaginated(0, 10);
            status.data.actualCounts.consumersFromPagination = result.consumerList ? result.consumerList.length : 0;
            break;
        }
        
        status.functions.available.push(funcName);
        status.functions.testResults[funcName] = 'SUCCESS';
        console.log(`✅ ${funcName} - SUCCESS`);
      } catch (error) {
        status.functions.unavailable.push(funcName);
        status.functions.testResults[funcName] = `ERROR: ${error.message}`;
        console.log(`❌ ${funcName} - ERROR: ${error.message}`);
      }
    }

    // Data integrity analysis
    const dashboard = status.data.dashboard;
    const actual = status.data.actualCounts;
    
    status.analysis = {
      dataIntegrityIssues: [],
      recommendations: []
    };

    if (dashboard && actual.consumers !== undefined && dashboard.totalConsumers !== actual.consumers) {
      status.analysis.dataIntegrityIssues.push({
        issue: 'Consumer count mismatch',
        dashboardValue: dashboard.totalConsumers,
        actualValue: actual.consumers,
        severity: 'HIGH'
      });
    }

    if (dashboard && actual.shopkeepers !== undefined && dashboard.totalShopkeepers !== actual.shopkeepers) {
      status.analysis.dataIntegrityIssues.push({
        issue: 'Shopkeeper count mismatch', 
        dashboardValue: dashboard.totalShopkeepers,
        actualValue: actual.shopkeepers,
        severity: 'HIGH'
      });
    }

    if (dashboard && actual.deliveryAgents !== undefined && dashboard.totalDeliveryAgents !== actual.deliveryAgents) {
      status.analysis.dataIntegrityIssues.push({
        issue: 'Delivery agent count mismatch',
        dashboardValue: dashboard.totalDeliveryAgents,
        actualValue: actual.deliveryAgents, 
        severity: 'HIGH'
      });
    }

    // Generate recommendations
    if (status.analysis.dataIntegrityIssues.length > 0) {
      status.analysis.recommendations.push('The contract appears to have test/hardcoded data that doesn\'t match actual registrations');
      status.analysis.recommendations.push('Consider using actual registration counts instead of dashboard totals');
      status.analysis.recommendations.push('This is common in development contracts with pre-seeded data');
    }

    if (status.functions.unavailable.length > 0) {
      status.analysis.recommendations.push('Some Diamond facets may not be properly cut/registered');
      status.analysis.recommendations.push('Check Diamond contract deployment and facet registration');
    }

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('System status check failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}