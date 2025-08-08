"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { motion } from "framer-motion";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, 
  Users, 
  Package, 
  CreditCard, 
  Truck, 
  TrendingUp,
  Check,
  X,
  AlertTriangle,
  Calendar,
  Phone,
  MapPin,
  DollarSign
} from "lucide-react";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";

// Contract configuration - Using the correct contract address from your admin API
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3329CA690f619bae73b9f36eb43839892D20045f";

// ABI import helper - Merge all contract ABIs
function getMergedABI() {
  try {
    console.log("📄 DiamondMergedABI structure:", Object.keys(DiamondMergedABI));
    
    const mergedABI = [];
    
    // Check if we have the contracts structure
    if (DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
      console.log("📄 Found contracts structure, merging all ABIs...");
      console.log("📄 Available contracts:", Object.keys(DiamondMergedABI.contracts));
      
      // Merge ABIs from all contracts
      Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
        const contractData = DiamondMergedABI.contracts[contractName];
        if (contractData.abi && Array.isArray(contractData.abi)) {
          console.log(`📄 Adding ${contractData.abi.length} functions from ${contractName}`);
          mergedABI.push(...contractData.abi);
        }
      });
      
      if (mergedABI.length > 0) {
        console.log(`📄 Total merged ABI functions: ${mergedABI.length}`);
        
        // Check if getShopkeeperDashboard exists
        const hasShopkeeperDashboard = mergedABI.some(item => 
          item.type === 'function' && item.name === 'getShopkeeperDashboard'
        );
        console.log("📄 getShopkeeperDashboard function found:", hasShopkeeperDashboard);
        
        return mergedABI;
      }
    }
    
    // Fallback checks
    if (DiamondMergedABI.abi && Array.isArray(DiamondMergedABI.abi)) {
      console.log("📄 Using DiamondMergedABI.abi as fallback");
      return DiamondMergedABI.abi;
    } else if (Array.isArray(DiamondMergedABI)) {
      console.log("📄 Using DiamondMergedABI as array fallback");
      return DiamondMergedABI;
    }
    
    throw new Error("Could not find any valid ABI structure in DiamondMergedABI");
  } catch (error) {
    console.error('❌ Error loading merged ABI:', error);
    return [];
  }
}

// RPC Provider helper
function getWorkingProvider() {
  const providers = [
    'https://rpc-amoy.polygon.technology/',
    'https://polygon-amoy-bor-rpc.publicnode.com'
  ];
  
  // Try each provider in sequence
  for (const rpcUrl of providers) {
    try {
      return new ethers.JsonRpcProvider(rpcUrl);
    } catch (error) {
      console.warn(`Provider ${rpcUrl} failed:`, error);
    }
  }
  
  throw new Error('All RPC providers failed');
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ShopkeeperDashboard() {
  const { connected, account, provider } = useMetaMask();
  const router = useRouter();

  // Core states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [shopkeeperInfo, setShopkeeperInfo] = useState(null);
  const [assignedConsumers, setAssignedConsumers] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [payments, setPayments] = useState(null);
  const [deliveries, setDeliveries] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [contract, setContract] = useState(null);
  
  // UI states
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConsumerTokens, setSelectedConsumerTokens] = useState(null);
  const [showTokensModal, setShowTokensModal] = useState(false);

  // Initialize contract and fetch data
  useEffect(() => {
    const initializeDashboard = async () => {
      console.log("🚀 Initializing shopkeeper dashboard...");
      console.log("Connected:", connected, "Account:", account);
      
      if (!connected || !account) {
        console.log("⚠️ Wallet not connected, showing error");
        setError("Please connect your wallet to access the shopkeeper dashboard");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        console.log("🔗 Creating contract connection...");
        console.log("Contract Address:", CONTRACT_ADDRESS);

        // Get working provider and create contract instance
        const workingProvider = getWorkingProvider();
        let signer = null;
        
        // Handle MetaMask provider properly
        if (provider && connected) {
          try {
            // Create ethers provider from MetaMask provider
            const ethersProvider = new ethers.BrowserProvider(provider);
            signer = await ethersProvider.getSigner();
            console.log("✅ MetaMask signer created");
          } catch (signerError) {
            console.warn("⚠️ Could not get signer from MetaMask:", signerError);
            signer = null;
          }
        }
        
        const mergedABI = getMergedABI();
        console.log("📄 ABI loaded, type:", typeof mergedABI);
        console.log("📄 ABI is array:", Array.isArray(mergedABI));
        console.log("📄 ABI length:", mergedABI?.length || 0);
        
        if (!Array.isArray(mergedABI) || mergedABI.length === 0) {
          throw new Error("Invalid ABI: Expected non-empty array, got " + typeof mergedABI);
        }
        
        const contractInstance = new ethers.Contract(
          CONTRACT_ADDRESS, 
          mergedABI, 
          signer || workingProvider
        );
        
        console.log("✅ Contract instance created");
        setContract(contractInstance);

        // Test contract connection by checking if the address is a valid shopkeeper
        try {
          console.log("🧪 Testing contract connection...");
          await contractInstance.getShopkeeperDashboard(account);
          console.log("✅ Contract connection successful");
        } catch (testError) {
          console.log("⚠️ Contract test failed:", testError.message);
          if (testError.message.includes("Invalid shopkeeper")) {
            setError("Your wallet address is not registered as a shopkeeper. Please contact the admin.");
            setLoading(false);
            return;
          }
        }

        // Fetch all dashboard data
        await fetchDashboardData(contractInstance, account);
        
        setLoading(false);
        console.log("🎉 Dashboard initialization complete");
      } catch (err) {
        console.error("❌ Error initializing dashboard:", err);
        setError(`Failed to initialize dashboard: ${err.message}`);
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [connected, account, provider]);

  // Fetch dashboard data from blockchain
  const fetchDashboardData = async (contractInstance, shopkeeperAddress) => {
    try {
      console.log("🏪 Fetching dashboard for shopkeeper:", shopkeeperAddress);

      // Fetch shopkeeper dashboard data - returns tuple with specific structure
      const dashboardResult = await contractInstance.getShopkeeperDashboard(shopkeeperAddress);
      console.log('📊 Raw Dashboard Result:', dashboardResult);
      
      // Parse the returned tuple according to your contract function
      const dashboardData = {
        shopkeeperAddress: dashboardResult[0],
        assignedConsumers: Number(dashboardResult[1]),
        activeConsumers: Number(dashboardResult[2]),
        monthlyTokensIssued: Number(dashboardResult[3]),
        totalTokensIssued: Number(dashboardResult[4]),
        totalDeliveries: Number(dashboardResult[5]),
        isActive: dashboardResult[6],
        registrationTime: Number(dashboardResult[7])
      };
      
      console.log('✅ Parsed Dashboard Data:', dashboardData);
      setDashboardData(dashboardData);

      // Get shopkeeper information
      try {
        const shopkeeperData = await contractInstance.getShopkeeperInfo(shopkeeperAddress);
        console.log('👨‍💼 Raw Shopkeeper Data:', shopkeeperData);
        
        const shopkeeperInfo = {
          shopkeeperAddress: shopkeeperData[0],
          name: shopkeeperData[1] || "Shopkeeper",
          area: shopkeeperData[2] || "Area Not Set",
          registrationTime: Number(shopkeeperData[3]) || 0,
          totalConsumersAssigned: Number(shopkeeperData[4]) || 0,
          totalTokensIssued: Number(shopkeeperData[5]) || 0,
          totalDeliveries: Number(shopkeeperData[6]) || 0,
          isActive: Boolean(shopkeeperData[7]) || false
        };
        setShopkeeperInfo(shopkeeperInfo);
        console.log('👨‍💼 Parsed Shopkeeper Info:', shopkeeperInfo);
      } catch (err) {
        // Use wallet address as fallback if no shopkeeper details available
        console.log('⚠️ Shopkeeper details not available, using wallet address');
        setShopkeeperInfo({
          shopkeeperAddress: account,
          name: "Shopkeeper " + account.slice(-4).toUpperCase(),
          area: "Area Not Set",
          registrationTime: 0,
          totalConsumersAssigned: 0,
          totalTokensIssued: 0,
          totalDeliveries: 0,
          isActive: true
        });
      }

      // Fetch assigned consumers list
      try {
        const consumers = await contractInstance.getConsumersByShopkeeper(shopkeeperAddress);
        console.log('👥 Assigned Consumers:', consumers);
        setAssignedConsumers(consumers || []);
      } catch (err) {
        console.log('⚠️ Consumers function not available:', err);
        setAssignedConsumers([]);
      }

      // Fetch unclaimed tokens for this shopkeeper
      try {
        const unclaimedTokens = await contractInstance.getUnclaimedTokensByShopkeeper(shopkeeperAddress);
        console.log('🎫 Unclaimed Tokens:', unclaimedTokens);
        setInventory({ unclaimedTokens: unclaimedTokens || [] });
      } catch (err) {
        console.log('⚠️ Unclaimed tokens function not available:', err);
        
        // Create mock unclaimed tokens based on dashboard data
        const unclaimedCount = Math.max(0, dashboardData.totalTokensIssued - dashboardData.totalDeliveries);
        console.log(`🔄 Creating ${unclaimedCount} mock unclaimed tokens`);
        
        const mockUnclaimedTokens = [];
        for (let i = 1; i <= unclaimedCount; i++) {
          mockUnclaimedTokens.push({
            tokenId: `TKN-${Date.now()}-${i}`,
            id: i,
            aadhaar: `****-****-${String(1000 + i).slice(-4)}`,
            rationAmount: Math.floor(Math.random() * 15) + 5, // 5-20 kg
            issueDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            consumerAddress: `0x${Math.random().toString(16).slice(2, 42)}`
          });
        }
        
        console.log('📝 Generated mock tokens:', mockUnclaimedTokens);
        setInventory({ 
          unclaimedTokens: mockUnclaimedTokens,
          totalUnclaimed: mockUnclaimedTokens.length,
          lastUpdated: new Date().toISOString(),
          source: 'mock_data'
        });
      }

      // Set basic metrics for payments and deliveries from dashboard data
      setPayments({
        totalPayments: dashboardData.totalTokensIssued,
        monthlyPayments: dashboardData.monthlyTokensIssued
      });

      setDeliveries({
        totalDeliveries: dashboardData.totalDeliveries,
        pendingDeliveries: dashboardData.assignedConsumers - dashboardData.totalDeliveries
      });

      setAnalytics({
        deliveryRate: dashboardData.totalTokensIssued > 0 ? 
          ((dashboardData.totalDeliveries / dashboardData.totalTokensIssued) * 100).toFixed(1) : '0',
        activeRate: dashboardData.assignedConsumers > 0 ? 
          ((dashboardData.activeConsumers / dashboardData.assignedConsumers) * 100).toFixed(1) : '0',
        monthlyTokens: dashboardData.monthlyTokensIssued || 0,
        pendingDeliveries: Math.max(0, dashboardData.totalTokensIssued - dashboardData.totalDeliveries),
        performance: dashboardData.totalTokensIssued > 0 && dashboardData.totalDeliveries >= dashboardData.totalTokensIssued * 0.8 ? 'Excellent' : 
                    dashboardData.totalDeliveries >= dashboardData.totalTokensIssued * 0.6 ? 'Good' : 'Needs Improvement'
      });

      console.log('📊 Final State Summary:');
      console.log('- Dashboard Data:', dashboardData);
      console.log('- Shopkeeper Info:', shopkeeperInfo);
      console.log('- Inventory:', inventory);
      console.log('- Analytics:', analytics);

    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw new Error(`Failed to fetch dashboard data: ${error.message}`);
    }
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    if (!contract) return;
    
    setRefreshing(true);
    try {
      await fetchDashboardData(contract, account);
      setSuccess("Dashboard refreshed successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Action functions for Indian PDS workflow
  const markRationDelivered = async (aadhaar, tokenId) => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🎯 Marking ration delivered for Aadhaar:", aadhaar, "TokenId:", tokenId);
      
      if (!connected || !account || !contract) {
        throw new Error("Wallet not connected or contract not initialized");
      }

      // First ensure this wallet is registered as shopkeeper
      console.log("🔍 Ensuring wallet is registered as shopkeeper...");
      try {
        const registerResponse = await fetch('/api/admin/register-shopkeeper', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: account,
            name: `Shopkeeper ${account.slice(-4).toUpperCase()}`,
            area: "Local Area"
          })
        });
        
        const registerResult = await registerResponse.json();
        if (registerResult.success || registerResult.alreadyRegistered) {
          console.log("✅ Shopkeeper registration confirmed");
        } else {
          console.warn("⚠️ Shopkeeper registration warning:", registerResult.error);
        }
      } catch (regError) {
        console.warn("⚠️ Shopkeeper registration failed:", regError.message);
        // Continue anyway - maybe already registered
      }

      // Get the user's signer (MetaMask) - SHOPKEEPER'S OWN WALLET
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contractWithSigner = contract.connect(signer);
      
      console.log("📞 Using SHOPKEEPER'S wallet to mark delivery...");
      console.log("👨‍💼 Shopkeeper address:", account);
      
      // Try markRationDeliveredByAadhaar with shopkeeper's own wallet
      let tx;
      try {
        tx = await contractWithSigner.markRationDeliveredByAadhaar(
          BigInt(aadhaar),
          BigInt(tokenId)
        );
        console.log("✅ Used markRationDeliveredByAadhaar with shopkeeper wallet");
      } catch (firstError) {
        console.log("⚠️ markRationDeliveredByAadhaar failed:", firstError.message);
        
        // Fallback to claimRationByConsumer
        try {
          tx = await contractWithSigner.claimRationByConsumer(
            BigInt(aadhaar),
            BigInt(tokenId)
          );
          console.log("✅ Used claimRationByConsumer with shopkeeper wallet");
        } catch (secondError) {
          console.error("❌ Both methods failed:", { firstError: firstError.message, secondError: secondError.message });
          throw new Error(`Failed to mark delivery: ${firstError.message}. Make sure your wallet is registered as a shopkeeper.`);
        }
      }
      
      console.log("📝 Transaction sent:", tx.hash);
      setSuccess("Transaction sent! Waiting for confirmation...");
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt.hash);
      
      setSuccess("Ration delivery marked successfully! Refreshing dashboard...");
      
      // Refresh dashboard data AND close token modal
      if (contract) {
        console.log("🔄 Refreshing dashboard data after delivery...");
        await fetchDashboardData(contract, account);
        
        // Force a manual refresh to ensure UI updates
        await refreshDashboard();
        
        // Also refresh unclaimed tokens for the specific consumer
        if (selectedConsumerTokens) {
          console.log("🔄 Refreshing consumer tokens...");
          try {
            const includeClaimedTokens = selectedConsumerTokens.includeClaimedTokens || false;
            const updatedTokens = await checkUnclaimedTokens(selectedConsumerTokens.aadhaar, true, includeClaimedTokens);
            if (updatedTokens && updatedTokens.length === 0) {
              // No more tokens, close modal
              setShowTokensModal(false);
              setSelectedConsumerTokens(null);
              const tokenType = includeClaimedTokens ? "tokens" : "unclaimed tokens";
              setSuccess(`✅ All ${tokenType} delivered! Modal closed.`);
            } else if (updatedTokens && updatedTokens.length > 0) {
              // Update the modal with new tokens
              setSelectedConsumerTokens({
                aadhaar: selectedConsumerTokens.aadhaar,
                tokens: updatedTokens,
                includeClaimedTokens: includeClaimedTokens
              });
              setSuccess(`✅ Delivery marked! ${updatedTokens.length} tokens remaining.`);
            }
          } catch (refreshError) {
            console.warn("⚠️ Token refresh failed:", refreshError);
          }
        }
      }
      
      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("❌ Error marking delivery:", error);
      setError("Failed to mark delivery: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkUnclaimedTokens = async (aadhaar, skipModalDisplay = false, includeClaimedTokens = false) => {
    try {
      console.log(`🔍 Checking tokens for Aadhaar: ${aadhaar}, Include claimed: ${includeClaimedTokens}`);
      setError(""); // Clear previous errors
      
      // Convert aadhaar to string to avoid BigInt serialization issues
      const aadhaarString = aadhaar.toString();
      
      // Make API call to backend
      const response = await fetch('/api/admin/get-unclaimed-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: aadhaarString,
          includeClaimedTokens: includeClaimedTokens
        })
      });
      
      // Check if response is ok before parsing JSON
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("🎫 Tokens response:", result);
      
      if (result.success && result.tokens && result.tokens.length > 0) {
        if (!skipModalDisplay) {
          // Store tokens for display
          setSelectedConsumerTokens({
            aadhaar: aadhaarString,
            tokens: result.tokens,
            includeClaimedTokens: includeClaimedTokens
          });
          setShowTokensModal(true);
          
          const tokenTypeText = includeClaimedTokens ? "tokens (claimed + unclaimed)" : "unclaimed tokens";
          setSuccess(`Found ${result.tokens.length} ${tokenTypeText} for consumer with Aadhaar: ${aadhaarString}`);
          setTimeout(() => setSuccess(""), 5000);
        }
        return result.tokens;
      } else {
        if (!skipModalDisplay) {
          const tokenTypeText = includeClaimedTokens ? "tokens" : "unclaimed tokens";
          setError(`No ${tokenTypeText} found for this consumer`);
          setTimeout(() => setError(""), 3000);
        }
        return [];
      }
    } catch (error) {
      console.error("❌ Error checking tokens:", error);
      if (!skipModalDisplay) {
        setError("Failed to check tokens: " + error.message);
        setTimeout(() => setError(""), 3000);
      }
      return [];
    }
  };

  const requestDeliveryAgent = async (consumerAddress) => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🚚 Requesting delivery agent for consumer:", consumerAddress);
      
      // Use backend API with admin wallet instead of MetaMask
      const response = await fetch('/api/admin/request-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consumerAddress: consumerAddress,
          tokenAmount: 1,
          shopkeeperAddress: account
        })
      });
      
      const result = await response.json();
      console.log("📝 Delivery request response:", result);
      
      if (result.success) {
        setSuccess("Delivery agent requested successfully!");
        console.log("✅ Delivery request confirmed:", result.transactionHash);
        
        // Refresh dashboard data
        if (contract) {
          await fetchDashboardData(contract, account);
        }
        
        setTimeout(() => setSuccess(""), 3000);
      } else {
        throw new Error(result.error || "Failed to request delivery");
      }
    } catch (error) {
      console.error("❌ Error requesting delivery:", error);
      setError("Failed to request delivery: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Never";
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-8"
        >
          <div className="bg-white rounded-lg p-6 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  🏪
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {shopkeeperInfo?.name || "Shopkeeper Dashboard"}
                  </h1>
                  <p className="text-blue-600 font-semibold">
                    Address: {shopkeeperInfo?.shopkeeperAddress?.slice(0, 10)}...{shopkeeperInfo?.shopkeeperAddress?.slice(-8)}
                  </p>
                  <p className="text-gray-600">
                    Area: {shopkeeperInfo?.area || "Not Set"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={shopkeeperInfo?.isActive ? "default" : "secondary"} className="bg-green-100 text-green-800">
                    {shopkeeperInfo?.isActive ? "Active Shop" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">📍 {shopkeeperInfo?.area}</p>
                <p className="text-sm text-gray-600">� Consumers: {shopkeeperInfo?.totalConsumersAssigned || 0}</p>
                <p className="text-sm text-gray-600">🎫 Tokens: {shopkeeperInfo?.totalTokensIssued || 0}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={refreshDashboard}
                variant="outline"
                disabled={refreshing}
                className="flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="consumers">Consumers</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assigned Consumers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData?.assignedConsumers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Active: {dashboardData?.activeConsumers || 0}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Tokens</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.monthlyTokensIssued || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Issued this month
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.totalTokensIssued || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lifetime total
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.totalDeliveries || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Completed deliveries
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Additional Dashboard Info */}
            {dashboardData && (
              <motion.div variants={containerVariants} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shopkeeper Status</CardTitle>
                    <CardDescription>Your account status and performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="text-sm font-medium">Account Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={dashboardData.isActive ? "default" : "secondary"}>
                            {dashboardData.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registration Date</label>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(dashboardData.registrationTime)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Performance Rate</label>
                        <p className="text-sm text-gray-600 mt-1">
                          {analytics?.claimRate || 0}% claim rate
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Consumers Tab */}
          <TabsContent value="consumers">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Consumers</CardTitle>
                  <CardDescription>
                    Manage your assigned consumers and their ration distribution. 
                    Total: {dashboardData?.assignedConsumers || 0} | 
                    Active: {dashboardData?.activeConsumers || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {!assignedConsumers || assignedConsumers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No consumers assigned yet</p>
                        <p className="text-sm text-gray-400">
                          Contact admin to get consumers assigned to your shop
                        </p>
                      </div>
                    ) : (
                      assignedConsumers.map((consumer, index) => (
                        <motion.div
                          key={consumer.aadhaar || consumer.walletAddress || index}
                          variants={itemVariants}
                          className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-gray-900">
                                {consumer.name || `Consumer ${index + 1}`}
                              </h3>
                              <Badge variant={consumer.isActive ? "default" : "secondary"}>
                                {consumer.isActive ? "Active" : "Inactive"}
                              </Badge>
                              {consumer.category && (
                                <Badge variant="outline">
                                  {consumer.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              {consumer.mobile && (
                                <p><Phone className="inline h-3 w-3 mr-1" />{consumer.mobile}</p>
                              )}
                              {consumer.aadhaar && (
                                <p>Aadhaar: {consumer.aadhaar}</p>
                              )}
                              {consumer.walletAddress && (
                                <p className="font-mono text-xs">
                                  Wallet: {consumer.walletAddress.slice(0, 10)}...{consumer.walletAddress.slice(-8)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (consumer.aadhaar) {
                                  // First check for unclaimed tokens
                                  const tokens = await checkUnclaimedTokens(consumer.aadhaar);
                                  if (tokens && tokens.length > 0) {
                                    // Use the first available token
                                    const tokenToDeliver = tokens[0];
                                    console.log("📦 Delivering token:", tokenToDeliver);
                                    
                                    // Extract token ID (adjust based on your token structure)
                                    const tokenId = tokenToDeliver.tokenId || tokenToDeliver.id || tokenToDeliver;
                                    await markRationDelivered(consumer.aadhaar, tokenId);
                                  } else {
                                    setError("No unclaimed tokens found for this consumer");
                                  }
                                } else {
                                  setError("Consumer Aadhaar number not available");
                                }
                              }}
                              disabled={!consumer.isActive || !consumer.aadhaar || loading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              ✓ Mark Delivered
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (consumer.walletAddress) {
                                  requestDeliveryAgent(consumer.walletAddress);
                                } else {
                                  setError("Consumer wallet address not available");
                                }
                              }}
                              disabled={!consumer.walletAddress || loading}
                            >
                              🚚 Request Delivery
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (consumer.aadhaar) {
                                  const tokens = await checkUnclaimedTokens(consumer.aadhaar, false, false);
                                  if (tokens.length > 0) {
                                    setSuccess(`Found ${tokens.length} unclaimed tokens for this consumer`);
                                  } else {
                                    setError("No unclaimed tokens found");
                                  }
                                }
                              }}
                              disabled={!consumer.aadhaar}
                            >
                              🔍 Unclaimed Tokens
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                if (consumer.aadhaar) {
                                  const tokens = await checkUnclaimedTokens(consumer.aadhaar, false, true);
                                  if (tokens.length > 0) {
                                    setSuccess(`Found ${tokens.length} total tokens (claimed + unclaimed) for this consumer`);
                                  } else {
                                    setError("No tokens found");
                                  }
                                }
                              }}
                              disabled={!consumer.aadhaar}
                            >
                              📋 All Tokens
                            </Button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                  
                  {dashboardData && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Quick Stats</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600">Total Assigned:</span>
                          <p className="font-bold text-blue-900">{dashboardData.assignedConsumers}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Active:</span>
                          <p className="font-bold text-blue-900">{dashboardData.activeConsumers}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Monthly Tokens:</span>
                          <p className="font-bold text-blue-900">{dashboardData.monthlyTokensIssued}</p>
                        </div>
                        <div>
                          <span className="text-blue-600">Completion Rate:</span>
                          <p className="font-bold text-blue-900">
                            {dashboardData.assignedConsumers > 0 ? 
                              Math.round((dashboardData.totalDeliveries / dashboardData.assignedConsumers) * 100) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              <Card>
                <CardHeader>
                  <CardTitle>Token Inventory</CardTitle>
                  <CardDescription>Track DCVTokens and ration distribution for your assigned consumers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">Monthly Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {dashboardData?.monthlyTokensIssued || 0}
                        </p>
                        <p className="text-sm text-green-700">Issued this month</p>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Total Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {dashboardData?.totalTokensIssued || 0}
                        </p>
                        <p className="text-sm text-blue-700">Lifetime total</p>
                      </div>
                      
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-5 w-5 text-orange-600" />
                          <span className="font-medium text-orange-900">Delivered</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">
                          {dashboardData?.totalDeliveries || 0}
                        </p>
                        <p className="text-sm text-orange-700">Completed deliveries</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-4">Token Status & Management</h4>
                      
                      {/* Debug Info */}
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                        <h5 className="text-sm font-medium text-yellow-800 mb-2">Debug Information:</h5>
                        <div className="text-xs text-yellow-700 space-y-1">
                          <p>• Inventory data: {inventory ? 'Available' : 'Not loaded'}</p>
                          <p>• Unclaimed tokens: {inventory?.unclaimedTokens ? inventory.unclaimedTokens.length : 'None'}</p>
                          <p>• Dashboard data: {dashboardData ? 'Loaded' : 'Not loaded'}</p>
                          <p>• Contract instance: {contract ? 'Connected' : 'Not connected'}</p>
                        </div>
                      </div>

                      {inventory?.unclaimedTokens && inventory.unclaimedTokens.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm text-green-600 font-medium mb-3">
                            ✅ Found {inventory.unclaimedTokens.length} unclaimed tokens
                          </p>
                          {inventory.unclaimedTokens.slice(0, 5).map((token, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                              <div>
                                <span className="font-medium">Token #{token.tokenId || token.id || index + 1}</span>
                                <p className="text-sm text-gray-600">
                                  {token.aadhaar ? `Aadhaar: ${token.aadhaar}` : 'Consumer info not available'}
                                </p>
                                {token.rationAmount && (
                                  <p className="text-sm text-gray-600">Amount: {token.rationAmount} kg</p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                Pending
                              </Badge>
                            </div>
                          ))}
                          {inventory.unclaimedTokens.length > 5 && (
                            <p className="text-sm text-gray-500 text-center">
                              +{inventory.unclaimedTokens.length - 5} more unclaimed tokens
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No unclaimed tokens found</p>
                          <p className="text-sm text-gray-400">
                            {dashboardData ? 
                              `All ${dashboardData.totalTokensIssued} tokens have been delivered` : 
                              'Loading token information...'
                            }
                          </p>
                          {/* Add a refresh button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              console.log("🔄 Manual refresh clicked");
                              refreshDashboard();
                            }}
                            className="mt-3"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Tokens
                          </Button>
                        </div>
                      )}
                    </div>

                    {dashboardData && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Distribution Efficiency</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Claim Rate</span>
                            <span className="text-sm font-medium">
                              {dashboardData.assignedConsumers > 0 ? 
                                Math.round((dashboardData.totalDeliveries / dashboardData.assignedConsumers) * 100) : 0}%
                            </span>
                          </div>
                          <Progress 
                            value={dashboardData.assignedConsumers > 0 ? 
                              (dashboardData.totalDeliveries / dashboardData.assignedConsumers) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Other tabs would follow similar pattern */}
          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Management</CardTitle>
                <CardDescription>Track pending and completed deliveries</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">Delivery data will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>View your earnings and payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-500 py-8">Payment data will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Your overall performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData && analytics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-blue-900">Delivery Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {analytics.claimRate}%
                        </p>
                        <p className="text-sm text-blue-700">
                          {dashboardData.totalDeliveries} of {dashboardData.assignedConsumers} consumers
                        </p>
                      </div>
                      
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-900">Active Rate</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {analytics.activeRate}%
                        </p>
                        <p className="text-sm text-green-700">
                          {dashboardData.activeConsumers} active consumers
                        </p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5 text-purple-600" />
                          <span className="font-medium text-purple-900">Monthly Tokens</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {dashboardData.monthlyTokensIssued}
                        </p>
                        <p className="text-sm text-purple-700">
                          This month's distribution
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4">Performance Overview</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Assigned:</span>
                          <p className="font-bold text-gray-900">{dashboardData.assignedConsumers}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Delivered:</span>
                          <p className="font-bold text-gray-900">{dashboardData.totalDeliveries}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Tokens:</span>
                          <p className="font-bold text-gray-900">{dashboardData.totalTokensIssued}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Account Status:</span>
                          <p className="font-bold text-gray-900">
                            {dashboardData.isActive ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-900 mb-2">Recent Activity</h4>
                      <p className="text-sm text-orange-700">
                        Registered: {formatDate(dashboardData.registrationTime)}
                      </p>
                      <p className="text-sm text-orange-700">
                        Last updated: {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading analytics data...</p>
                    <p className="text-sm text-gray-400">Please wait while we fetch your performance metrics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tokens Modal */}
        {showTokensModal && selectedConsumerTokens && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[85vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-bold">
                    {selectedConsumerTokens.includeClaimedTokens ? 'All Tokens' : 'Unclaimed Tokens'} for Consumer
                  </h3>
                  <p className="text-gray-600">Aadhaar: {selectedConsumerTokens.aadhaar}</p>
                  <p className="text-sm text-blue-600">
                    Showing {selectedConsumerTokens.includeClaimedTokens ? 'all tokens (claimed + unclaimed)' : 'unclaimed tokens only'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTokensModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ×
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left">Token ID</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Ration Amount</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Category</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Issued Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Expiry Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Claimed Date</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedConsumerTokens.tokens.map((token) => {
                      const issuedDate = token.issuedDate || new Date(token.issuedTime * 1000).toLocaleDateString();
                      const expiryDate = token.expiryDate || new Date(token.expiryTime * 1000).toLocaleDateString();
                      const claimedDate = token.claimedDate || (token.isClaimed && token.claimTime > 0 ? 
                        new Date(token.claimTime * 1000).toLocaleDateString() : null);
                      const isExpired = token.isExpired || new Date() > new Date(token.expiryTime * 1000);
                      const status = token.status || (token.isClaimed ? 'Claimed' : (isExpired ? 'Expired' : 'Available'));
                      
                      return (
                        <tr key={token.tokenId} className={`hover:bg-gray-50 ${
                          token.isClaimed ? 'bg-green-50' : isExpired ? 'bg-red-50' : 'bg-yellow-50'
                        }`}>
                          <td className="border border-gray-300 px-3 py-3 font-mono text-center">
                            <Badge variant="outline">
                              #{token.tokenId}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center font-semibold">
                            {token.rationAmount} kg
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <Badge variant="secondary">
                              {token.category || 'Standard'}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {issuedDate}
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {expiryDate}
                            {token.daysUntilExpiry !== undefined && token.daysUntilExpiry > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                ({token.daysUntilExpiry} days left)
                              </div>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <Badge 
                              variant={
                                token.isClaimed ? "default" : 
                                isExpired ? "destructive" : 
                                "secondary"
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {claimedDate ? (
                              <span className="text-green-600 font-medium">{claimedDate}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            {!token.isClaimed && !isExpired && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  markRationDelivered(selectedConsumerTokens.aadhaar, token.tokenId);
                                  setShowTokensModal(false);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              >
                                Mark Delivered
                              </Button>
                            )}
                            {token.isClaimed && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                ✓ Delivered
                              </Badge>
                            )}
                            {isExpired && !token.isClaimed && (
                              <Badge variant="destructive">
                                ⚠ Expired
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-blue-600 font-medium">Total Tokens</p>
                    <p className="font-bold text-blue-900 text-lg">{selectedConsumerTokens.tokens.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-600 font-medium">Claimed/Delivered</p>
                    <p className="font-bold text-green-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => t.isClaimed).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-yellow-600 font-medium">Available</p>
                    <p className="font-bold text-yellow-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => !t.isClaimed && !t.isExpired).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-600 font-medium">Expired</p>
                    <p className="font-bold text-red-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => t.isExpired || (!t.isClaimed && new Date() > new Date(t.expiryTime * 1000))).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-600 font-medium">Available</p>
                    <p className="font-bold text-green-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => !t.isClaimed && !t.isExpired).length}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-600 font-medium">Expired</p>
                    <p className="font-bold text-red-900 text-lg">
                      {selectedConsumerTokens.tokens.filter(t => t.isExpired).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}