"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";
import { motion } from "framer-motion";
import {
  Package,
  Users,
  Truck,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Eye,
  Settings,
  Bell,
  Archive,
  FileText,
  Activity
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { NotificationPanel } from "@/components/NotificationPanel";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ShopkeeperDashboard() {
  const { connected, account, provider } = useMetaMask();
  const router = useRouter();

  // Core data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [assignedConsumers, setAssignedConsumers] = useState([]);
  const [assignedDeliveryAgent, setAssignedDeliveryAgent] = useState(null);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [deliveredTokens, setDeliveredTokens] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [paymentDashboard, setPaymentDashboard] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [currentMonthTokens, setCurrentMonthTokens] = useState([]);
  
  // Shopkeeper info
  const [shopkeeperInfo, setShopkeeperInfo] = useState(null);
  const [shopkeeperAddress, setShopkeeperAddress] = useState("");
  
  // UI states
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [processingTx, setProcessingTx] = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);

  // Check authentication with proper loading state
  useEffect(() => {
    const checkAuth = async () => {
      // First check localStorage for existing user data
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.type === 'shopkeeper') {
            console.log("✅ Found stored shopkeeper data, proceeding with dashboard");
            // If we have stored data but no wallet connection yet, wait a bit
            if (!connected || !account) {
              console.log("⏳ Waiting for wallet connection...");
              return; // Don't redirect yet, wait for wallet to connect
            }
          }
        } catch (e) {
          console.error("Error parsing stored user data:", e);
          localStorage.removeItem('currentUser');
        }
      }
      
      // Only redirect to login if we're sure there's no wallet connection after a reasonable delay
      if (!connected || !account) {
        // Give MetaMask time to connect (especially on page refresh)
        setTimeout(() => {
          if (!connected || !account) {
            console.log("🚫 No wallet connection found, redirecting to login");
            localStorage.removeItem('currentUser'); // Clear stale auth data
            router.push("/login?auth=failed");
          }
        }, 2000); // Wait 2 seconds before redirecting
        return;
      }
      
      // Ensure account is valid before setting it
      if (account && typeof account === 'string' && account.length > 0) {
        setShopkeeperAddress(account);
        await fetchAllData();
      } else {
        console.error("Invalid account address:", account);
        setError("Invalid wallet address detected");
      }
    };

    checkAuth();
  }, [connected, account, router]);

  // Fetch all dashboard data
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      console.log("🏪 Fetching shopkeeper dashboard data for:", account);
      
      // Fetch all data in parallel
      await Promise.all([
        fetchDashboardData(contract),
        fetchConsumers(contract),
        fetchDeliveryAgent(contract),
        fetchPendingDeliveries(contract),
        fetchDeliveredTokens(contract),
        fetchDeliveryHistory(contract),
        fetchPerformanceMetrics(contract),
        fetchPaymentData(contract),
        fetchCurrentMonthTokens(contract)
      ]);
      
    } catch (error) {
      console.error("❌ Error fetching dashboard data:", error);
      setError("Failed to load dashboard data: " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Individual fetch functions
  const fetchDashboardData = async (contract) => {
    try {
      const data = await contract.getShopkeeperDashboard(account);
      setDashboardData(data);
      console.log("✅ Dashboard data:", data);
    } catch (error) {
      console.log("⚠️ Dashboard data not available");
    }
  };

  const fetchConsumers = async (contract) => {
    try {
      const consumers = await contract.getConsumersByShopkeeper(account);
      // Ensure all consumer data is properly formatted
      const formattedConsumers = consumers.map(consumer => ({
        ...consumer,
        walletAddress: consumer.walletAddress || '',
        name: consumer.name || 'Unknown',
        aadhaar: consumer.aadhaar || '',
        mobile: consumer.mobile || '',
        category: consumer.category || 'Unknown',
        isActive: consumer.isActive || false,
        registrationTime: consumer.registrationTime || 0
      }));
      setAssignedConsumers(formattedConsumers);
      console.log("✅ Assigned consumers:", formattedConsumers.length);
    } catch (error) {
      console.log("⚠️ Error fetching consumers:", error);
      setAssignedConsumers([]);
    }
  };

  const fetchDeliveryAgent = async (contract) => {
    try {
      const [agent, hasAgent] = await contract.getAssignedDeliveryAgent(account);
      if (hasAgent && agent) {
        // Ensure all agent data is properly formatted
        const formattedAgent = {
          ...agent,
          agentAddress: agent.agentAddress || '',
          name: agent.name || 'Unknown',
          mobile: agent.mobile || '',
          totalDeliveries: agent.totalDeliveries || 0,
          registrationTime: agent.registrationTime || 0
        };
        setAssignedDeliveryAgent(formattedAgent);
        console.log("✅ Assigned delivery agent:", formattedAgent.name);
      }
    } catch (error) {
      console.log("⚠️ No delivery agent assigned");
    }
  };

  const fetchPendingDeliveries = async (contract) => {
    try {
      const [tokenIds, aadhaars, names, amounts, expiryTimes] = await contract.getPendingDeliveriesForShopkeeper(account);
      
      // Ensure all arrays exist and have same length
      if (!tokenIds || !aadhaars || !names || !amounts || !expiryTimes) {
        console.log("⚠️ Incomplete delivery data received");
        setPendingDeliveries([]);
        return;
      }
      
      const pending = tokenIds.map((tokenId, index) => ({
        tokenId: tokenId ? tokenId.toString() : `unknown_${index}`,
        aadhaar: aadhaars[index] ? aadhaars[index].toString() : '',
        consumerName: names[index] || 'Unknown Consumer',
        rationAmount: amounts[index] ? amounts[index].toString() : '0',
        expiryTime: expiryTimes[index] ? Number(expiryTimes[index]) : 0,
        status: "pending"
      }));
      
      setPendingDeliveries(pending);
      console.log("✅ Pending deliveries:", pending.length);
    } catch (error) {
      console.log("⚠️ Error fetching pending deliveries:", error);
      setPendingDeliveries([]);
    }
  };

  const fetchDeliveredTokens = async (contract) => {
    try {
      const [tokenIds, aadhaars, names, deliveryTimes] = await contract.getDeliveredUnclaimedTokens(account);
      
      // Ensure all arrays exist and have same length
      if (!tokenIds || !aadhaars || !names || !deliveryTimes) {
        console.log("⚠️ Incomplete delivered tokens data received");
        setDeliveredTokens([]);
        return;
      }
      
      const delivered = tokenIds.map((tokenId, index) => ({
        tokenId: tokenId ? tokenId.toString() : `unknown_${index}`,
        aadhaar: aadhaars[index] ? aadhaars[index].toString() : '',
        consumerName: names[index] || 'Unknown Consumer',
        deliveryTime: deliveryTimes[index] ? Number(deliveryTimes[index]) : 0,
        status: "delivered"
      }));
      
      setDeliveredTokens(delivered);
      console.log("✅ Delivered unclaimed tokens:", delivered.length);
    } catch (error) {
      console.log("⚠️ Error fetching delivered tokens:", error);
      setDeliveredTokens([]);
    }
  };

  const fetchDeliveryHistory = async (contract) => {
    try {
      const history = await contract.getShopkeeperDeliveryHistory(account, 20);
      // Ensure all history data is properly formatted
      const formattedHistory = history.map(item => ({
        ...item,
        actor: item.actor || '',
        target: item.target || '',
        action: item.action || 'Unknown action',
        details: item.details || '',
        timestamp: item.timestamp || 0
      }));
      setDeliveryHistory(formattedHistory);
      console.log("✅ Delivery history:", formattedHistory.length);
    } catch (error) {
      console.log("⚠️ Error fetching delivery history:", error);
      setDeliveryHistory([]);
    }
  };

  const fetchPerformanceMetrics = async (contract) => {
    try {
      const [
        totalAssigned,
        activeConsumers,
        tokensIssued,
        deliveries,
        pending,
        overdue,
        successRate
      ] = await contract.getShopkeeperPerformanceMetrics(account);
      
      setPerformanceMetrics({
        totalAssignedConsumers: Number(totalAssigned),
        activeConsumers: Number(activeConsumers),
        currentMonthTokensIssued: Number(tokensIssued),
        currentMonthDeliveries: Number(deliveries),
        pendingDeliveries: Number(pending),
        overdueDeliveries: Number(overdue),
        deliverySuccessRate: Number(successRate)
      });
      
      console.log("✅ Performance metrics loaded");
    } catch (error) {
      console.log("⚠️ Error fetching performance metrics:", error);
    }
  };

  const fetchPaymentData = async (contract) => {
    try {
      // Payment dashboard
      const [
        todayPayments,
        todayAmount,
        weeklyPayments,
        weeklyAmount,
        monthlyPayments,
        monthlyAmount,
        pendingPayments,
        totalEarnings
      ] = await contract.getShopkeeperPaymentDashboard(account);
      
      setPaymentDashboard({
        todayPayments: Number(todayPayments),
        todayAmount: ethers.formatEther(todayAmount),
        weeklyPayments: Number(weeklyPayments),
        weeklyAmount: ethers.formatEther(weeklyAmount),
        monthlyPayments: Number(monthlyPayments),
        monthlyAmount: ethers.formatEther(monthlyAmount),
        pendingPayments: Number(pendingPayments),
        totalEarnings: ethers.formatEther(totalEarnings)
      });

      // Recent payments
      const [payments, consumerNames, categories] = await contract.getRecentPaymentTransactions(account, 10);
      const recentPaymentsData = payments.map((payment, index) => ({
        paymentId: payment.paymentId.toString(),
        aadhaar: payment.aadhaar.toString(),
        tokenId: payment.tokenId.toString(),
        amount: ethers.formatEther(payment.amount),
        timestamp: Number(payment.timestamp),
        isVerified: payment.isVerified,
        consumerName: consumerNames[index],
        category: categories[index],
        paymentMethod: payment.paymentMethod
      }));
      setRecentPayments(recentPaymentsData);

      // Pending payment actions
      const [paymentIds, aadhaars, names, amounts, tokenIds] = await contract.getPendingPaymentActions(account);
      const pendingPaymentsData = paymentIds.map((paymentId, index) => ({
        paymentId: paymentId.toString(),
        aadhaar: aadhaars[index].toString(),
        consumerName: names[index],
        amount: ethers.formatEther(amounts[index]),
        tokenId: tokenIds[index].toString()
      }));
      setPendingPayments(pendingPaymentsData);

      // Payment analytics
      const [dailyPayments, dailyAmounts, topCategories, categoryAmounts] = await contract.getPaymentAnalytics(account, 7);
      setPaymentAnalytics({
        dailyPayments: dailyPayments.map(Number),
        dailyAmounts: dailyAmounts.map(amount => ethers.formatEther(amount)),
        topCategories,
        categoryAmounts: categoryAmounts.map(amount => ethers.formatEther(amount))
      });

      console.log("✅ Payment data loaded");
    } catch (error) {
      console.log("⚠️ Error fetching payment data:", error);
    }
  };

  const fetchCurrentMonthTokens = async (contract) => {
    try {
      const [tokenIds, aadhaars, names, categories, amounts] = await contract.getCurrentMonthPendingTokens(account);
      
      // Ensure all arrays exist and have same length
      if (!tokenIds || !aadhaars || !names || !categories || !amounts) {
        console.log("⚠️ Incomplete current month tokens data received");
        setCurrentMonthTokens([]);
        return;
      }
      
      const tokens = tokenIds.map((tokenId, index) => ({
        tokenId: tokenId ? tokenId.toString() : `unknown_${index}`,
        aadhaar: aadhaars[index] ? aadhaars[index].toString() : '',
        consumerName: names[index] || 'Unknown Consumer',
        category: categories[index] || 'Unknown',
        rationAmount: amounts[index] ? amounts[index].toString() : '0'
      }));
      
      setCurrentMonthTokens(tokens);
      console.log("✅ Current month tokens:", tokens.length);
    } catch (error) {
      console.log("⚠️ Error fetching current month tokens:", error);
      setCurrentMonthTokens([]);
    }
  };

  // Mark delivery as completed
  const markDeliveryComplete = async (aadhaar, tokenId) => {
    try {
      setProcessingTx(true);
      setError("");
      setSuccess("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      const tx = await contract.markRationDeliveredByAadhaar(aadhaar, tokenId);
      console.log("📤 Transaction sent:", tx.hash);

      await tx.wait();
      console.log("✅ Delivery marked complete");

      setSuccess(`Delivery marked as complete for token ${tokenId}`);
      await fetchAllData(); // Refresh data
    } catch (error) {
      console.error("❌ Error marking delivery:", error);
      setError("Failed to mark delivery: " + (error.reason || error.message));
    } finally {
      setProcessingTx(false);
    }
  };

  // Bulk mark deliveries
  const bulkMarkDeliveries = async () => {
    if (selectedDeliveries.length === 0) {
      setError("Please select deliveries to mark");
      return;
    }

    try {
      setProcessingTx(true);
      setError("");
      setSuccess("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      const aadhaars = selectedDeliveries.map(d => d.aadhaar);
      const tokenIds = selectedDeliveries.map(d => d.tokenId);

      const tx = await contract.bulkMarkDeliveries(aadhaars, tokenIds);
      console.log("📤 Bulk delivery transaction sent:", tx.hash);

      await tx.wait();
      console.log("✅ Bulk deliveries marked complete");

      setSuccess(`${selectedDeliveries.length} deliveries marked as complete`);
      setSelectedDeliveries([]);
      await fetchAllData(); // Refresh data
    } catch (error) {
      console.error("❌ Error bulk marking deliveries:", error);
      setError("Failed to mark deliveries: " + (error.reason || error.message));
    } finally {
      setProcessingTx(false);
    }
  };

  // Initiate payment
  const initiatePayment = async (aadhaar, tokenId, paymentMethod = "UPI") => {
    try {
      setProcessingTx(true);
      setError("");
      setSuccess("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      const tx = await contract.initiatePayment(aadhaar, tokenId, paymentMethod);
      console.log("📤 Payment initiation sent:", tx.hash);

      await tx.wait();
      console.log("✅ Payment initiated");

      setSuccess(`Payment initiated for token ${tokenId}`);
      await fetchAllData(); // Refresh data
    } catch (error) {
      console.error("❌ Error initiating payment:", error);
      setError("Failed to initiate payment: " + (error.reason || error.message));
    } finally {
      setProcessingTx(false);
    }
  };

  // Complete payment
  const completePayment = async (paymentId, upiTransactionId) => {
    try {
      setProcessingTx(true);
      setError("");
      setSuccess("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      const tx = await contract.completePayment(paymentId, upiTransactionId);
      console.log("📤 Payment completion sent:", tx.hash);

      await tx.wait();
      console.log("✅ Payment completed");

      setSuccess(`Payment completed for ID ${paymentId}`);
      await fetchAllData(); // Refresh data
    } catch (error) {
      console.error("❌ Error completing payment:", error);
      setError("Failed to complete payment: " + (error.reason || error.message));
    } finally {
      setProcessingTx(false);
    }
  };

  // Helper functions
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Unknown';
    try {
      return new Date(timestamp * 1000).toLocaleDateString('en-IN');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Unknown';
    try {
      return new Date(timestamp * 1000).toLocaleTimeString('en-IN');
    } catch (e) {
      return 'Invalid time';
    }
  };

  const getExpiryStatus = (expiryTime) => {
    const now = Date.now() / 1000;
    const daysLeft = Math.ceil((expiryTime - now) / 86400);
    
    if (daysLeft < 0) return { status: "expired", color: "destructive", text: "Expired" };
    if (daysLeft <= 2) return { status: "urgent", color: "destructive", text: `${daysLeft} days left` };
    if (daysLeft <= 5) return { status: "warning", color: "warning", text: `${daysLeft} days left` };
    return { status: "good", color: "secondary", text: `${daysLeft} days left` };
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "APL": return "bg-blue-100 text-blue-800";
      case "BPL": return "bg-green-100 text-green-800";
      case "AAY": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || (!connected && !localStorage.getItem('currentUser'))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium text-gray-700">Loading Shopkeeper Dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">
            {!connected ? "Connecting to wallet..." : "Fetching PDS data from blockchain"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-8"
        >
          <motion.div variants={itemVariants} className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                PDS Shopkeeper Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Public Distribution System - Shopkeeper Portal
              </p>
              <p className="text-sm text-gray-500">
                Address: {shopkeeperAddress ? `${shopkeeperAddress.slice(0, 6)}...${shopkeeperAddress.slice(-4)}` : 'Not connected'}
              </p>
            </div>
            <div className="flex gap-2">
              <NotificationPanel 
                userAddress={account} 
                userType="shopkeeper" 
              />
              <Button
                variant="outline"
                onClick={() => {
                  setRefreshing(true);
                  fetchAllData().finally(() => setRefreshing(false));
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </motion.div>

          {/* Error/Success Messages */}
          {error && (
            <motion.div variants={itemVariants} className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {success && (
            <motion.div variants={itemVariants} className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800">{success}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Consumers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {assignedConsumers.length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Active: {performanceMetrics?.activeConsumers || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending Deliveries</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {pendingDeliveries.length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-amber-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Overdue: {performanceMetrics?.overdueDeliveries || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delivery Agent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {assignedDeliveryAgent ? "1" : "0"}
                    </p>
                  </div>
                  <Truck className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {assignedDeliveryAgent ? assignedDeliveryAgent.name : "Not assigned"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{paymentDashboard?.monthlyAmount || "0"}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {paymentDashboard?.monthlyPayments || 0} transactions
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="consumers">Consumers</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {performanceMetrics ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Delivery Success Rate</span>
                        <span className="text-lg font-bold text-green-600">
                          {performanceMetrics.deliverySuccessRate}%
                        </span>
                      </div>
                      <Progress value={performanceMetrics.deliverySuccessRate} className="h-2" />
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tokens Issued</p>
                          <p className="font-semibold">{performanceMetrics.currentMonthTokensIssued}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Deliveries Made</p>
                          <p className="font-semibold">{performanceMetrics.currentMonthDeliveries}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pending</p>
                          <p className="font-semibold text-amber-600">{performanceMetrics.pendingDeliveries}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Overdue</p>
                          <p className="font-semibold text-red-600">{performanceMetrics.overdueDeliveries}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Performance data not available</p>
                  )}
                </CardContent>
              </Card>

              {/* Current Month Tokens */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Current Month Tokens
                  </CardTitle>
                  <CardDescription>
                    Tokens issued for current month requiring delivery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {currentMonthTokens.length > 0 ? (
                      currentMonthTokens.map((token, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{token.consumerName}</p>
                            <p className="text-xs text-gray-600">Token: {token.tokenId}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className={getCategoryColor(token.category)}>
                              {token.category}
                            </Badge>
                            <p className="text-xs text-gray-600 mt-1">{token.rationAmount} kg</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No tokens for current month</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveryHistory.length > 0 ? (
                    deliveryHistory.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-600">
                            {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
                          </p>
                        </div>
                        <Badge variant="outline">Completed</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Delivery Management</h2>
              <div className="flex gap-2">
                {selectedDeliveries.length > 0 && (
                  <Button
                    onClick={bulkMarkDeliveries}
                    disabled={processingTx}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark {selectedDeliveries.length} as Delivered
                  </Button>
                )}
              </div>
            </div>

            {/* Pending Deliveries */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Deliveries</CardTitle>
                <CardDescription>
                  Ration tokens waiting for delivery to consumers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingDeliveries.length > 0 ? (
                    pendingDeliveries.map((delivery, index) => {
                      const expiryStatus = getExpiryStatus(delivery.expiryTime);
                      const isSelected = selectedDeliveries.some(d => d.tokenId === delivery.tokenId);
                      
                      return (
                        <div
                          key={index}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDeliveries(prev => prev.filter(d => d.tokenId !== delivery.tokenId));
                            } else {
                              setSelectedDeliveries(prev => [...prev, delivery]);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded"
                                />
                                <h4 className="font-medium">{delivery.consumerName}</h4>
                                <Badge variant="outline">
                                  Token: {delivery.tokenId}
                                </Badge>
                              </div>
                              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                <span>Aadhaar: {delivery.aadhaar ? delivery.aadhaar.toString() : 'Not available'}</span>
                                <span>Amount: {delivery.rationAmount || 0} kg</span>
                                <Badge variant={expiryStatus.color}>
                                  {expiryStatus.text}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markDeliveryComplete(delivery.aadhaar, delivery.tokenId);
                                }}
                                disabled={processingTx}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Mark Delivered
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  initiatePayment(delivery.aadhaar, delivery.tokenId);
                                }}
                                disabled={processingTx}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Initiate Payment
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No pending deliveries</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivered but Unclaimed */}
            <Card>
              <CardHeader>
                <CardTitle>Delivered but Unclaimed</CardTitle>
                <CardDescription>
                  Tokens delivered but not yet claimed by consumers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveredTokens.length > 0 ? (
                    deliveredTokens.map((token, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-blue-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{token.consumerName}</h4>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                              <span>Token: {token.tokenId || 'Unknown'}</span>
                              <span>Aadhaar: {token.aadhaar ? token.aadhaar.toString() : 'Not available'}</span>
                              <span>Delivered: {token.deliveryTime ? formatDate(token.deliveryTime) : 'Unknown'}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            Delivered
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No delivered unclaimed tokens</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consumers Tab */}
          <TabsContent value="consumers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assigned Consumers</CardTitle>
                <CardDescription>
                  List of all consumers assigned to your shop
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignedConsumers.length > 0 ? (
                    assignedConsumers.map((consumer, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{consumer.name}</h4>
                              <Badge variant="outline" className={getCategoryColor(consumer.category)}>
                                {consumer.category}
                              </Badge>
                              {consumer.isActive ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-800">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Aadhaar:</span> {consumer.aadhaar ? consumer.aadhaar.toString() : 'Not available'}
                              </div>
                              <div>
                                <span className="font-medium">Mobile:</span> {consumer.mobile}
                              </div>
                              <div>
                                <span className="font-medium">Wallet:</span> 
                                {consumer.walletAddress ? `${consumer.walletAddress.slice(0, 6)}...${consumer.walletAddress.slice(-4)}` : 'Not set'}
                              </div>
                              <div>
                                <span className="font-medium">Registration:</span> 
                                {formatDate(consumer.registrationTime)}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button size="sm" variant="outline">
                              <Phone className="h-4 w-4 mr-1" />
                              Contact
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No consumers assigned</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Agent Info */}
            {assignedDeliveryAgent && (
              <Card>
                <CardHeader>
                  <CardTitle>Assigned Delivery Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-lg bg-green-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{assignedDeliveryAgent.name}</h4>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Mobile:</span> {assignedDeliveryAgent.mobile}
                          </div>
                          <div>
                            <span className="font-medium">Total Deliveries:</span> {assignedDeliveryAgent.totalDeliveries.toString()}
                          </div>
                          <div>
                            <span className="font-medium">Address:</span> 
                            {assignedDeliveryAgent.agentAddress ? `${assignedDeliveryAgent.agentAddress.slice(0, 6)}...${assignedDeliveryAgent.agentAddress.slice(-4)}` : 'Not set'}
                          </div>
                          <div>
                            <span className="font-medium">Registration:</span> 
                            {formatDate(assignedDeliveryAgent.registrationTime)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Active Agent
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            {/* Payment Dashboard */}
            {paymentDashboard && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                      <p className="text-2xl font-bold text-green-600">₹{paymentDashboard.todayAmount}</p>
                      <p className="text-xs text-gray-500">{paymentDashboard.todayPayments} transactions</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Weekly Earnings</p>
                      <p className="text-2xl font-bold text-blue-600">₹{paymentDashboard.weeklyAmount}</p>
                      <p className="text-xs text-gray-500">{paymentDashboard.weeklyPayments} transactions</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-purple-600">₹{paymentDashboard.totalEarnings}</p>
                      <p className="text-xs text-gray-500">All time</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pending Payment Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Payment Actions</CardTitle>
                <CardDescription>
                  Payments requiring completion or action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingPayments.length > 0 ? (
                    pendingPayments.map((payment, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-amber-50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{payment.consumerName}</h4>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                              <span>Payment ID: {payment.paymentId}</span>
                              <span>Amount: ₹{payment.amount}</span>
                              <span>Token: {payment.tokenId}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => completePayment(payment.paymentId, "UPI_" + Date.now())}
                            disabled={processingTx}
                          >
                            Complete Payment
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No pending payment actions</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Payment Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPayments.length > 0 ? (
                    recentPayments.map((payment, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{payment.consumerName}</h4>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                              <span>₹{payment.amount}</span>
                              <span>{payment.paymentMethod}</span>
                              <span>{formatDate(payment.timestamp)}</span>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={payment.isVerified 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {payment.isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent payments</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Analytics</CardTitle>
                <CardDescription>
                  Payment trends and category breakdown for the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentAnalytics ? (
                  <div className="space-y-6">
                    {/* Daily Payment Chart Placeholder */}
                    <div>
                      <h4 className="font-medium mb-3">Daily Payment Trends</h4>
                      <div className="grid grid-cols-7 gap-2 h-32">
                        {paymentAnalytics.dailyAmounts.map((amount, index) => {
                          const maxAmount = Math.max(...paymentAnalytics.dailyAmounts.map(a => parseFloat(a)));
                          const height = maxAmount > 0 ? (parseFloat(amount) / maxAmount) * 100 : 0;
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div
                                className="bg-blue-500 w-full rounded-t"
                                style={{ height: `${height}%` }}
                              ></div>
                              <div className="text-xs text-gray-600 mt-1">
                                Day {index + 1}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Category Breakdown */}
                    <div>
                      <h4 className="font-medium mb-3">Category Breakdown</h4>
                      <div className="space-y-3">
                        {paymentAnalytics.topCategories.map((category, index) => {
                          const amount = parseFloat(paymentAnalytics.categoryAmounts[index]);
                          const totalAmount = paymentAnalytics.categoryAmounts.reduce((sum, amt) => sum + parseFloat(amt), 0);
                          const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
                          
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={getCategoryColor(category)}>
                                  {category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-24">
                                  <Progress value={percentage} className="h-2" />
                                </div>
                                <span className="text-sm font-medium">₹{amount.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Analytics data not available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery History</CardTitle>
                <CardDescription>
                  Complete history of all deliveries made
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveryHistory.length > 0 ? (
                    deliveryHistory.map((delivery, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">{delivery.action}</h4>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                              <span>Actor: {delivery.actor ? `${delivery.actor.slice(0, 6)}...${delivery.actor.slice(-4)}` : 'Unknown'}</span>
                              <span>Target: {delivery.target ? `${delivery.target.slice(0, 6)}...${delivery.target.slice(-4)}` : 'Unknown'}</span>
                              <span>{formatDate(delivery.timestamp)} at {formatTime(delivery.timestamp)}</span>
                            </div>
                            {delivery.details && (
                              <p className="text-sm text-gray-600 mt-1">{delivery.details}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No delivery history available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
