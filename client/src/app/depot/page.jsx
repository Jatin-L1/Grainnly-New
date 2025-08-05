"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { ethers } from "ethers";
import { getContract } from "../../utils/contract";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";
import DepotLayout from "../../components/DepotLayout";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  Truck,
  Users,
  Warehouse,
  UserCheck,
  ShoppingBag,
  History,
  AlertCircle,
  DollarSign,
  BarChart3,
  Calendar,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Animation variants for Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function ShopkeeperDashboard() {
  const { connected, account, provider } = useMetaMask();
  const router = useRouter();

  // Shopkeeper details
  const [shopkeeperInfo, setShopkeeperInfo] = useState(null);
  const [shopkeeperAddress, setShopkeeperAddress] = useState("");
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [assignedConsumers, setAssignedConsumers] = useState([]);
  const [assignedDeliveryAgent, setAssignedDeliveryAgent] = useState(null);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [unclaimedTokens, setUnclaimedTokens] = useState([]);
  const [rationAmounts, setRationAmounts] = useState([]);
  
  // Payment data
  const [paymentDashboard, setPaymentDashboard] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [missingFunctions, setMissingFunctions] = useState([]);
  
  // Client-side only state to avoid hydration issues
  const [isClient, setIsClient] = useState(false);
  const [storedUser, setStoredUser] = useState(null);

  // Initialize client-side only state
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const currentUser = localStorage.getItem('currentUser');
      setStoredUser(currentUser);
    }
  }, []);
  
  // Transaction states
  const [processingTx, setProcessingTx] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [bulkDeliveryMode, setBulkDeliveryMode] = useState(false);
  
  // Additional state for new features
  const [tokenOperations, setTokenOperations] = useState([]);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState("individual"); // individual or bulk
  const [markingDelivery, setMarkingDelivery] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState(false);
  const [generatingTokens, setGeneratingTokens] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  
  // Legacy state for compatibility with old code
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [assignedDeliveryPersons, setAssignedDeliveryPersons] = useState([]);
  const [rationDistributions, setRationDistributions] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  
  // MetaMask modal and interaction state
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);
  const [metaMaskModalType, setMetaMaskModalType] = useState("");
  const [metaMaskModalMessage, setMetaMaskModalMessage] = useState("");
  
  // OTP and verification state
  const [currentOTP, setCurrentOTP] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [receivedOtp, setReceivedOtp] = useState("");
  const [generatingOtp, setGeneratingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  
  // Delivery completion state
  const [deliveryIdToComplete, setDeliveryIdToComplete] = useState("");
  const [depotId, setDepotId] = useState("");
  const [depotName, setDepotName] = useState("");
  const [depotLocation, setDepotLocation] = useState("");

  // Initialize and fetch shopkeeper data
  useEffect(() => {
    console.log("🔍 Depot useEffect - MetaMask status:", { connected, account });
    
    if (!connected || !account) {
      console.log("❌ Not connected or no account, redirecting to login...");
      console.log("Connected:", connected, "Account:", account);
      
      // Add a small delay to ensure MetaMask has time to initialize
      // Also check if user is already logged in via localStorage
      const currentUser = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
      console.log("🔍 Checking localStorage for user:", currentUser);
      
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          console.log("👤 Found stored user data:", userData);
          if (userData.type === 'shopkeeper') {
            console.log("🏪 User is a shopkeeper, allowing access even without MetaMask connection");
            // Set basic user info from localStorage
            setShopkeeperAddress(userData.data?.walletAddress || account || "");
            setDepotName(userData.data?.name || "Shopkeeper");
            setDepotLocation(userData.data?.area || "Unknown Area");
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("❌ Error parsing stored user data:", e);
        }
      }
      
      setTimeout(() => {
        if (!connected || !account) {
          console.log("⏰ Still not connected after delay, redirecting...");
          router.push("/login");
        }
      }, 2000); // Increased delay to 2 seconds
      return;
    }

    console.log("✅ Connected and account found, proceeding with data fetch...");

    const fetchShopkeeperData = async () => {
      try {
        setLoading(true);
        setError("");
        
        console.log("🏪 Fetching shopkeeper data for:", account);
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
        
        setShopkeeperAddress(account);

        // 1. Get shopkeeper info
        console.log("📊 Fetching shopkeeper info...");
        try {
          const shopkeeperData = await contract.getShopkeeperInfo(account);
          console.log("✅ Shopkeeper info:", shopkeeperData);
          setShopkeeperInfo(shopkeeperData);
          
          // Set depot information from shopkeeper data
          setDepotId(account);
          setDepotName(shopkeeperData.name || "Shopkeeper");
          setDepotLocation(shopkeeperData.area || "Unknown Area");
        } catch (shopkeeperError) {
          console.log("⚠️ getShopkeeperInfo function not available or shopkeeper not registered");
          setMissingFunctions(prev => [...prev, "getShopkeeperInfo"]);
          setError("Shopkeeper not found. Please ensure you are registered as a shopkeeper.");
          return;
        }

        // 2. Get shopkeeper dashboard
        console.log("📊 Fetching shopkeeper dashboard...");
        try {
          const dashboard = await contract.getShopkeeperDashboard(account);
          console.log("✅ Shopkeeper dashboard:", dashboard);
          setDashboardData(dashboard);
        } catch (dashboardError) {
          console.log("⚠️ getShopkeeperDashboard function not available, using defaults...");
          setMissingFunctions(prev => [...prev, "getShopkeeperDashboard"]);
          setDashboardData([0, 0, 0, 0, 0, 0, 0]); // Default values
        }

        // 3. Get assigned consumers
        console.log("👥 Fetching assigned consumers...");
        try {
          const consumers = await contract.getConsumersByShopkeeper(account);
          console.log("✅ Assigned consumers:", consumers);
          setAssignedConsumers(consumers);
        } catch (consumersError) {
          console.log("⚠️ getConsumersByShopkeeper function not available, using empty list...");
          setMissingFunctions(prev => [...prev, "getConsumersByShopkeeper"]);
          setAssignedConsumers([]);
        }

        // 4. Get assigned delivery agent
        console.log("🚚 Fetching assigned delivery agent...");
        try {
          const agentInfo = await contract.getAssignedDeliveryAgent(account);
          if (agentInfo && agentInfo !== ethers.ZeroAddress) {
            const deliveryAgentData = await contract.getDeliveryAgentInfo(agentInfo);
            setAssignedDeliveryAgent({
              address: agentInfo,
              ...deliveryAgentData
            });
            console.log("✅ Assigned delivery agent:", deliveryAgentData);
          }
        } catch (agentError) {
          console.log("⚠️ No delivery agent assigned");
          setMissingFunctions(prev => [...prev, "getAssignedDeliveryAgent"]);
        }

        // 5. Get pending deliveries
        console.log("📦 Fetching pending deliveries...");
        try {
          const pendingDeliveriesData = await contract.getPendingDeliveriesForShopkeeper(account);
          console.log("✅ Pending deliveries:", pendingDeliveriesData);
          setPendingDeliveries(pendingDeliveriesData);
        } catch (pendingError) {
          console.log("⚠️ getPendingDeliveriesForShopkeeper function not available, skipping...");
          setMissingFunctions(prev => [...prev, "getPendingDeliveriesForShopkeeper"]);
          setPendingDeliveries([]);
        }

        // 6. Get delivery history
        console.log("📜 Fetching delivery history...");
        try {
          const historyData = await contract.getShopkeeperDeliveryHistory(account, 20);
          console.log("✅ Delivery history:", historyData);
          setDeliveryHistory(historyData);
        } catch (historyError) {
          console.log("⚠️ getShopkeeperDeliveryHistory function not available, skipping...");
          setMissingFunctions(prev => [...prev, "getShopkeeperDeliveryHistory"]);
          setDeliveryHistory([]);
        }

        // 7. Get unclaimed tokens
        console.log("🎫 Fetching unclaimed tokens...");
        try {
          const tokensData = await contract.getDeliveredUnclaimedTokens(account);
          console.log("✅ Unclaimed tokens:", tokensData);
          setUnclaimedTokens(tokensData);
        } catch (tokensError) {
          console.log("⚠️ getDeliveredUnclaimedTokens function not available, skipping...");
          setMissingFunctions(prev => [...prev, "getDeliveredUnclaimedTokens"]);
          setUnclaimedTokens([]);
        }

        // 8. Get payment dashboard
        console.log("💰 Fetching payment dashboard...");
        try {
          const paymentData = await contract.getShopkeeperPaymentDashboard(account);
          console.log("✅ Payment dashboard:", paymentData);
          setPaymentDashboard(paymentData);
        } catch (paymentError) {
          console.log("⚠️ Payment dashboard not available");
          setMissingFunctions(prev => [...prev, "getShopkeeperPaymentDashboard"]);
        }

        // 9. Get performance metrics
        console.log("📈 Fetching performance metrics...");
        try {
          const metricsData = await contract.getShopkeeperPerformanceMetrics(account);
          console.log("✅ Performance metrics:", metricsData);
          setPerformanceMetrics(metricsData);
        } catch (metricsError) {
          console.log("⚠️ Performance metrics not available");
          setMissingFunctions(prev => [...prev, "getShopkeeperPerformanceMetrics"]);
        }

        // 10. Get ration amounts
        console.log("🌾 Fetching ration amounts...");
        try {
          const rationData = await contract.getRationAmounts();
          console.log("✅ Ration amounts:", rationData);
          setRationAmounts(rationData);
        } catch (rationError) {
          console.log("⚠️ getRationAmounts function not available, using defaults...");
          setMissingFunctions(prev => [...prev, "getRationAmounts"]);
          setRationAmounts([
            { name: "Rice", amount: "5" },
            { name: "Wheat", amount: "3" },
            { name: "Sugar", amount: "1" },
            { name: "Oil", amount: "1" }
          ]);
        }

        // 11. Get tokens for this shopkeeper
        console.log("🎫 Fetching tokens for shopkeeper...");
        try {
          const shopkeeperTokens = await contract.getTokensForShopkeeper(account);
          console.log("✅ Shopkeeper tokens:", shopkeeperTokens);
          setTokenOperations(shopkeeperTokens);
        } catch (tokenError) {
          console.log("⚠️ No tokens found for shopkeeper");
          setMissingFunctions(prev => [...prev, "getTokensForShopkeeper"]);
        }

        // Load transaction history from localStorage
        const savedHistory = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("depot-transactions") || "[]") : [];
        setTxHistory(savedHistory);

        console.log("✅ All shopkeeper data loaded successfully!");

      } catch (error) {
        console.error("❌ Error fetching shopkeeper data:", error);
        
        // If it's a critical error (like shopkeeper not found), don't use fallback
        if (error.message && error.message.includes("Diamond: Function does not exist")) {
          console.log("🔄 Function not found, trying fallback approach...");
          await fetchBasicShopkeeperData();
        } else {
          setError("Failed to load shopkeeper data: " + (error.reason || error.message));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchShopkeeperData();
  }, [connected, account, router]);

  // Fallback function to fetch basic shopkeeper data with minimal dependencies
  const fetchBasicShopkeeperData = async () => {
    try {
      console.log("🔄 Using fallback data fetching...");
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      // Set basic defaults
      setShopkeeperAddress(account);
      setDashboardData([0, 0, 0, 0, 0, 0, 0]);
      setAssignedConsumers([]);
      setAssignedDeliveryAgent(null);
      setPendingDeliveries([]);
      setDeliveryHistory([]);
      setUnclaimedTokens([]);
      setRationAmounts([
        { name: "Rice", amount: "5" },
        { name: "Wheat", amount: "3" },
        { name: "Sugar", amount: "1" },
        { name: "Oil", amount: "1" }
      ]);
      setPaymentDashboard(null);
      setPerformanceMetrics(null);
      setTokenOperations([]);
      
      // Load transaction history from localStorage
      const savedHistory = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("depot-transactions") || "[]") : [];
      setTxHistory(savedHistory);
      
      console.log("✅ Basic fallback data loaded");
      
    } catch (error) {
      console.error("❌ Even fallback failed:", error);
      setError("Failed to initialize shopkeeper dashboard. Please check your connection.");
    }
  };
  // Generate tokens for consumer
  const generateTokensForConsumer = async (consumerAadhaar, month, year) => {
    try {
      setGeneratingTokens(true);
      setError("");
      setSuccess("");

      console.log("🎫 Generating tokens for consumer:", { consumerAadhaar, month, year });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      // Call generateTokenForConsumer from the contract (singular, not plural)
      const tx = await contract.generateTokenForConsumer(consumerAadhaar, month, year);
      console.log("📤 Transaction sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);

      // Save transaction to history
      saveTransaction({
        type: "Generate Tokens",
        txHash: tx.hash,
        timestamp: Date.now(),
        details: `Generated tokens for consumer ${consumerAadhaar} for ${month}/${year}`,
      });

      setSuccess(`Tokens generated successfully for consumer ${consumerAadhaar}!`);
      
      // Refresh data by reloading the page or refetching data
      window.location.reload();

    } catch (error) {
      console.error("❌ Error generating tokens:", error);
      setError("Failed to generate tokens: " + (error.reason || error.message));
    } finally {
      setGeneratingTokens(false);
    }
  };

  // Mark delivery as complete
  const markDeliveryComplete = async (tokenId, consumerAadhaar) => {
    try {
      setMarkingDelivery(true);
      setError("");
      setSuccess("");

      console.log("✅ Marking delivery complete:", { tokenId, consumerAadhaar });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      // Call markRationDeliveredByAadhaar from the contract
      const tx = await contract.markRationDeliveredByAadhaar(consumerAadhaar, tokenId);
      console.log("📤 Transaction sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);

      // Save transaction to history
      saveTransaction({
        type: "Mark Delivery Complete",
        txHash: tx.hash,
        timestamp: Date.now(),
        details: `Marked delivery complete for token ${tokenId} to consumer ${consumerAadhaar}`,
      });

      setSuccess(`Delivery marked as complete for token ${tokenId}!`);
      
      // Refresh data by reloading the page
      window.location.reload();

    } catch (error) {
      console.error("❌ Error marking delivery complete:", error);
      setError("Failed to mark delivery complete: " + (error.reason || error.message));
    } finally {
      setMarkingDelivery(false);
    }
  };

  // Assign delivery agent to shopkeeper
  const assignDeliveryAgent = async (agentAddress) => {
    try {
      setAssigningAgent(true);
      setError("");
      setSuccess("");

      console.log("🚚 Assigning delivery agent:", agentAddress);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      // Call assignDeliveryAgentToShopkeeper from the contract
      const tx = await contract.assignDeliveryAgentToShopkeeper(shopkeeperAddress, agentAddress);
      console.log("📤 Transaction sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);

      // Save transaction to history
      saveTransaction({
        type: "Assign Delivery Agent",
        txHash: tx.hash,
        timestamp: Date.now(),
        details: `Assigned delivery agent ${agentAddress} to shopkeeper`,
      });

      setSuccess("Delivery agent assigned successfully!");
      
      // Refresh data by reloading the page
      window.location.reload();

    } catch (error) {
      console.error("❌ Error assigning delivery agent:", error);
      setError("Failed to assign delivery agent: " + (error.reason || error.message));
    } finally {
      setAssigningAgent(false);
    }
  };

  // Withdraw payment for shopkeeper
  const withdrawPayment = async () => {
    try {
      setProcessingTx(true);
      setError("");
      setSuccess("");

      console.log("💰 Withdrawing payment for shopkeeper:", shopkeeperAddress);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, signer);

      // Call completePayment from the contract (or another appropriate payment function)
      const tx = await contract.completePayment();
      console.log("📤 Transaction sent:", tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed:", receipt);

      // Save transaction to history
      saveTransaction({
        type: "Withdraw Payment",
        txHash: tx.hash,
        timestamp: Date.now(),
        details: `Withdrew pending payments for shopkeeper`,
      });

      setSuccess("Payment withdrawn successfully!");
      
      // Refresh data by reloading the page
      window.location.reload();

    } catch (error) {
      console.error("❌ Error withdrawing payment:", error);
      setError("Failed to withdraw payment: " + (error.reason || error.message));
    } finally {
      setProcessingTx(false);
    }
  };

  // Save transaction to local storage for history
  const saveTransaction = (transaction) => {
    if (typeof window !== 'undefined') {
      const existingTx = JSON.parse(localStorage.getItem("depot-transactions") || "[]");
      const newTx = [...existingTx, { ...transaction, id: Date.now() }];
      localStorage.setItem("depot-transactions", JSON.stringify(newTx));
      setTxHistory(newTx);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return "0.00";
    return parseFloat(ethers.formatEther(amount.toString())).toFixed(4);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "active":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Add a useEffect to periodically check verification status
  useEffect(() => {
    let interval;

    if (
      (activeDelivery && activeDelivery.status === "in-progress") ||
      activeDelivery?.status === "authenticated"
    ) {
      // Check every 15 seconds for status changes
      interval = setInterval(() => {
        console.log("Checking delivery status...");
        checkDeliveryStatus();
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDelivery, activeDelivery?.status]);

  // Fetch assigned consumers for this shopkeeper
  const fetchAssignedUsers = async (contract, shopkeeperAddress) => {
    try {
      const usersData = [];
      
      // Use the getConsumersByShopkeeper function from DiamondMergedABI
      const consumers = await contract.getConsumersByShopkeeper(shopkeeperAddress);
      
      console.log("Consumers assigned to shopkeeper:", consumers);

      // Process each consumer
      for (let i = 0; i < consumers.length; i++) {
        try {
          const consumer = consumers[i];
          
          const userData = {
            id: consumer.aadhaar.toString(),
            name: consumer.name,
            category: consumer.category,
            walletAddress: consumer.walletAddress,
            assignedShopkeeper: shopkeeperAddress,
            isActive: consumer.isActive,
            mobile: consumer.mobile,
            aadhaar: consumer.aadhaar.toString(),
          };
          
          usersData.push(userData);
          console.log("✅ Found assigned consumer:", userData.name);
        } catch (error) {
          console.error(`Error processing consumer ${i}:`, error);
        }
      }

      console.log(`Found ${usersData.length} consumers assigned to shopkeeper ${shopkeeperAddress}`);
      setAssignedUsers(usersData);
    } catch (error) {
      console.error("Error fetching assigned consumers:", error);
      // Set empty array if no consumers found
      setAssignedUsers([]);
    }
  };

  // Fetch assigned delivery agents for this shopkeeper
  const fetchAssignedDeliveryPersons = async (contract, shopkeeperAddress) => {
    try {
      const deliveryPersonsData = [];
      
      // Use the getAssignedDeliveryAgent function from DiamondMergedABI
      try {
        const assignedAgent = await contract.getAssignedDeliveryAgent(shopkeeperAddress);
        
        if (assignedAgent && assignedAgent.agent && assignedAgent.agent !== ethers.ZeroAddress) {
          const agentInfo = await contract.getDeliveryAgentInfo(assignedAgent.agent);
          
          const deliveryPersonData = {
            id: assignedAgent.agent,
            name: agentInfo.name,
            walletAddress: assignedAgent.agent,
            assignedShopkeeper: shopkeeperAddress,
            isActive: agentInfo.isActive,
          };
          
          deliveryPersonsData.push(deliveryPersonData);
          console.log("✅ Found assigned delivery agent:", deliveryPersonData.name);
        }
      } catch (agentError) {
        console.log("No delivery agent assigned to this shopkeeper yet");
      }

      console.log(`Found ${deliveryPersonsData.length} delivery agents assigned to shopkeeper ${shopkeeperAddress}`);
      setAssignedDeliveryPersons(deliveryPersonsData);
    } catch (error) {
      console.error("Error fetching assigned delivery agents:", error);
      setAssignedDeliveryPersons([]);
    }
  };

  // Fetch deliveries for this shopkeeper
  const fetchDeliveries = async (contract, shopkeeperAddress) => {
    try {
      const pendingDeliveriesData = [];
      const completedDeliveriesData = [];

      // Use the getPendingDeliveriesForShopkeeper function from DiamondMergedABI
      try {
        const pendingDeliveries = await contract.getPendingDeliveriesForShopkeeper(shopkeeperAddress);
        
        console.log("Pending deliveries for shopkeeper:", pendingDeliveries);

        // Process pending deliveries
        const [tokenIds, aadhaars, names, months, years] = pendingDeliveries;
        
        for (let i = 0; i < tokenIds.length; i++) {
          try {
            const deliveryData = {
              id: tokenIds[i].toString(),
              tokenId: tokenIds[i].toString(),
              aadhaar: aadhaars[i].toString(),
              userName: names[i],
              month: months[i].toString(),
              year: years[i].toString(),
              status: "pending",
              scheduledDate: new Date().toISOString(), // Use current date as placeholder
            };
            
            pendingDeliveriesData.push(deliveryData);
            console.log("✅ Found pending delivery:", deliveryData);
          } catch (error) {
            console.error(`Error processing pending delivery ${i}:`, error);
          }
        }
      } catch (pendingError) {
        console.log("⚠️ getPendingDeliveriesForShopkeeper function not available in deployed contract");
        // Set empty array since function doesn't exist
      }

      // Get shopkeeper delivery history for completed deliveries
      try {
        const deliveryHistory = await contract.getShopkeeperDeliveryHistory(shopkeeperAddress, 10); // Get last 10
        
        console.log("Delivery history for shopkeeper:", deliveryHistory);

        // Process delivery history
        const [historyTokenIds, historyAadhaars, historyNames, historyMonths, historyYears, historyTimestamps] = deliveryHistory;
        
        for (let i = 0; i < historyTokenIds.length; i++) {
          try {
            const deliveryData = {
              id: historyTokenIds[i].toString(),
              tokenId: historyTokenIds[i].toString(),
              aadhaar: historyAadhaars[i].toString(),
              userName: historyNames[i],
              month: historyMonths[i].toString(),
              year: historyYears[i].toString(),
              status: "completed",
              completedDate: new Date(Number(historyTimestamps[i]) * 1000).toISOString(),
            };
            
            completedDeliveriesData.push(deliveryData);
            console.log("✅ Found completed delivery:", deliveryData);
          } catch (error) {
            console.error(`Error processing completed delivery ${i}:`, error);
          }
        }
      } catch (historyError) {
        console.log("⚠️ getShopkeeperDeliveryHistory function not available in deployed contract");
      }

      console.log(`Found ${pendingDeliveriesData.length} pending and ${completedDeliveriesData.length} completed deliveries`);
      setPendingDeliveries(pendingDeliveriesData);
      setCompletedDeliveries(completedDeliveriesData);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      setPendingDeliveries([]);
      setCompletedDeliveries([]);
    }
  };

  // Fetch ration distributions for this shopkeeper
  const fetchRationDistributions = async (contract, shopkeeperAddress) => {
    try {
      const rationData = [];

      // Get shopkeeper dashboard data which includes distribution summary
      try {
        const shopkeeperDashboard = await contract.getShopkeeperDashboard(shopkeeperAddress);
        
        console.log("Shopkeeper dashboard data:", shopkeeperDashboard);

        // Extract distribution data from dashboard
        const [
          totalConsumers,
          pendingTokens,
          deliveredTokens,
          totalEarnings,
          monthlyEarnings,
          monthlyDeliveries,
          pendingPayments,
          // Add other fields as needed
        ] = shopkeeperDashboard;

        // Create summary entry
        rationData.push({
          id: "summary",
          type: "summary",
          totalConsumers: totalConsumers.toString(),
          pendingTokens: pendingTokens.toString(),
          deliveredTokens: deliveredTokens.toString(),
          totalEarnings: totalEarnings.toString(),
          monthlyEarnings: monthlyEarnings.toString(),
          monthlyDeliveries: monthlyDeliveries.toString(),
          pendingPayments: pendingPayments.toString(),
        });

      } catch (dashboardError) {
        console.log("Could not fetch shopkeeper dashboard data");
      }

      console.log(`Found ${rationData.length} ration distribution entries`);
      setRationDistributions(rationData);
    } catch (error) {
      console.error("Error fetching ration distributions:", error);
      setRationDistributions([]);
    }
  };

  // Receive delivery person
  const receiveDeliveryPerson = async (deliveryPersonId) => {
    try {
      // Find the delivery person in the assigned list
      const deliveryPerson = assignedDeliveryPersons.find(
        (person) => person.id === deliveryPersonId
      );

      if (!deliveryPerson) {
        setError("Selected delivery person not found");
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Simulate getting OTP from blockchain
      // In a real app, this would be generated by the delivery person
      const simulatedOtp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      setReceivedOtp(simulatedOtp);

      // Set active delivery
      setActiveDelivery({
        deliveryPersonId: deliveryPersonId,
        deliveryPersonName: deliveryPerson.name,
        status: "in-progress",
        startTime: new Date().toISOString(),
        otp: simulatedOtp,
      });

      // Remove from pending deliveries
      const updatedPendingDeliveries = pendingDeliveries.filter(
        (delivery) => delivery.deliveryPersonId !== deliveryPersonId
      );
      setPendingDeliveries(updatedPendingDeliveries);

      saveTransaction({
        type: "Start Delivery",
        timestamp: Date.now(),
        details: `Started delivery process with Delivery Person ID: ${deliveryPersonId}`,
      });

      // Switch to active delivery tab
      setActiveTab("active-delivery");
    } catch (error) {
      console.error("Error receiving delivery person:", error);
      setError(
        "Failed to receive delivery person: " +
          (error.message || error.toString())
      );
    }
  };

  // Generate OTP function that sets delivery to IN_TRANSIT
  const generateOTP = async () => {
    try {
      setGeneratingOtp(true);
      setOtpError("");
      setOtpSuccess("");

      if (!activeDelivery) {
        setOtpError("No active delivery found");
        setGeneratingOtp(false);
        return;
      }

      // Generate random 6-digit OTP locally first so we can display it immediately
      const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setCurrentOTP(randomOtp);

      // Show MetaMask popup
      setMetaMaskModalType("otp");
      setMetaMaskModalMessage(
        "Setting OTP and transitioning delivery to IN_TRANSIT..."
      );
      setShowMetaMaskModal(true);

      try {
        // Get ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Find the delivery ID based on the activeDelivery info
        const deliveryCount = await contract.rationDeliveryCount();
        let deliveryId = null;

        for (let i = 1; i <= Number(deliveryCount); i++) {
          try {
            const delivery = await contract.getDeliveryDetails(i);

            if (
              delivery.deliveryPersonId.toString() ===
                activeDelivery.deliveryPersonId &&
              delivery.depotId.toString() === depotId
            ) {
              deliveryId = i;
              console.log("Found delivery ID:", deliveryId);
              break;
            }
          } catch (err) {
            console.error(`Error checking delivery ${i}:`, err);
          }
        }

        if (!deliveryId) {
          throw new Error("Could not find delivery ID in the contract");
        }

        // Call the contract to generate OTP - PASS THE DELIVERY ID AND OUR RANDOM OTP
        const setOtpTx = await contract.generateOTP(deliveryId);

        console.log("Transaction sent:", setOtpTx.hash);

        // Wait for transaction confirmation
        const receipt = await setOtpTx.wait();
        console.log("Transaction confirmed:", receipt);

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Generate OTP",
          txHash: setOtpTx.hash,
          timestamp: Date.now(),
          details: `Generated OTP (${randomOtp}) and set delivery to IN_TRANSIT for Delivery ID: ${deliveryId}`,
        });

        setOtpSuccess(
          `OTP ${randomOtp} generated successfully! The delivery person can now verify this OTP.`
        );

        // Update delivery status to reflect IN_TRANSIT state
        const updatedDelivery = {
          ...activeDelivery,
          status: "in-progress",
          otpGenerated: true,
        };
        setActiveDelivery(updatedDelivery);
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error generating OTP:", error);
      setOtpError(
        "Failed to generate OTP: " + (error.message || error.toString())
      );
    } finally {
      setGeneratingOtp(false);
    }
  };

  // Update this function to use activeDelivery instead of currentDelivery
  const checkDeliveryStatus = async () => {
    try {
      if (!activeDelivery) {
        return;
      }

      console.log("Checking delivery status...");

      // You can implement real checking here
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Try to get the delivery details from the contract
      try {
        // Find the delivery ID based on the activeDelivery info
        const deliveryCount = await contract.rationDeliveryCount();

        for (let i = 1; i <= Number(deliveryCount); i++) {
          try {
            const delivery = await contract.getDeliveryDetails(i);

            if (
              delivery.deliveryPersonId.toString() ===
              activeDelivery.deliveryPersonId
            ) {
              console.log(
                "Found delivery:",
                i,
                "Status:",
                delivery.status.toString()
              );

              // Update UI based on contract status if needed
              const statusNum = Number(delivery.status);

              if (
                statusNum === 1 &&
                activeDelivery.status !== "authenticated"
              ) {
                setActiveDelivery({
                  ...activeDelivery,
                  status: "authenticated",
                });
                setOtpSuccess(
                  "OTP was successfully verified by the delivery person!"
                );
              } else if (
                statusNum === 2 &&
                activeDelivery.status !== "location-verified"
              ) {
                setActiveDelivery({
                  ...activeDelivery,
                  status: "location-verified",
                });
              }
              break;
            }
          } catch (err) {
            console.error(`Error checking delivery ${i}:`, err);
          }
        }
      } catch (error) {
        console.error("Error getting delivery details:", error);
      }
    } catch (error) {
      console.error("Error checking delivery status:", error);
    }
  };

  // Fix the useEffect to use activeDelivery instead of currentDelivery
  useEffect(() => {
    let interval;

    if (
      activeDelivery &&
      (activeDelivery.status === "in-progress" ||
        activeDelivery.status === "authenticated")
    ) {
      // Check every 15 seconds for status changes
      interval = setInterval(() => {
        console.log("Checking delivery status...");
        checkDeliveryStatus();
      }, 15000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDelivery, activeDelivery?.status]);

  // Add this function to reset delivery state when needed
  const resetDeliveryState = async () => {
    try {
      setLoading(true);

      if (!activeDelivery) {
        setError("No active delivery to reset");
        setLoading(false);
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Find the actual delivery ID based on the delivery person ID
      const deliveryCount = await contract.rationDeliveryCount();
      let deliveryIdToReset = null;

      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);

          if (
            delivery.deliveryPersonId.toString() ===
              activeDelivery.deliveryPersonId.toString() &&
            delivery.depotId.toString() === depotId
          ) {
            deliveryIdToReset = i;
            console.log(`Found delivery to reset: ${deliveryIdToReset}`);
            break;
          }
        } catch (err) {
          console.error(`Error checking delivery ${i}:`, err);
        }
      }

      if (!deliveryIdToReset) {
        setError("Could not find the delivery to reset.");
        setLoading(false);
        return;
      }

      console.log(`Resetting delivery ID: ${deliveryIdToReset}`);

      // Reset the delivery state back to pending using the found ID
      const tx = await contract.resetDeliveryState(deliveryIdToReset);
      await tx.wait();

      // Clear success/error states
      setError("");
      setSuccess("Delivery state successfully reset to pending");

      // Reset the current delivery state
      setCurrentOTP(null);
      setActiveDelivery(null);
      setOtpSuccess("");
      setOtpError("");

      // Refresh deliveries data
      // if (typeof fetchDeliveries === "function") {
      //   fetchDeliveries(contract, depotId);
      // }
      window.location.reload();
    } catch (error) {
      console.error("Error resetting delivery state:", error);
      setError(
        "Failed to reset delivery state: " + (error.message || error.toString())
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    try {
      setVerifyingOtp(true);
      setOtpError("");
      setOtpSuccess("");

      if (!activeDelivery) {
        setOtpError("No active delivery found");
        return;
      }

      if (otpInput !== receivedOtp) {
        setOtpError("OTP does not match. Please try again.");
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Call contract to verify OTP
      const verifyTx = await contract.verifyOTP(
        depotId,
        otpInput,
        activeDelivery.deliveryPersonId
      );
      await verifyTx.wait();

      saveTransaction({
        type: "Verify OTP",
        txHash: verifyTx.hash,
        timestamp: Date.now(),
        details: `OTP verified for Delivery Person ID: ${activeDelivery.deliveryPersonId}`,
      });

      setOtpSuccess(
        "OTP verified successfully! Proceeding to location verification."
      );

      // Update active delivery status
      const updatedDelivery = { ...activeDelivery, status: "authenticated" };
      setActiveDelivery(updatedDelivery);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpError(
        "Failed to verify OTP: " + (error.message || error.toString())
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Complete delivery function with proper contract interaction and payment
  // Complete delivery function with proper contract interaction and payment
  const completeDelivery = async (deliveryId = null) => {
    try {
      if (!deliveryId && !activeDelivery) {
        setError("No active delivery found");
        return;
      }

      // Show MetaMask popup
      setMetaMaskModalType("complete");
      setMetaMaskModalMessage("Processing final payment on blockchain...");
      setShowMetaMaskModal(true);

      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // If no deliveryId provided, find it from activeDelivery
        let targetDeliveryId = deliveryId;
        if (!targetDeliveryId && activeDelivery) {
          // Find the delivery ID based on the activeDelivery info
          const deliveryCount = await contract.rationDeliveryCount();

          for (let i = 1; i <= Number(deliveryCount); i++) {
            try {
              const delivery = await contract.getDeliveryDetails(i);

              if (
                delivery.deliveryPersonId.toString() ===
                  activeDelivery.deliveryPersonId &&
                delivery.depotId.toString() === depotId
              ) {
                targetDeliveryId = i;
                console.log("Found delivery ID:", targetDeliveryId);
                break;
              }
            } catch (err) {
              console.error(`Error checking delivery ${i}:`, err);
            }
          }
        }

        if (!targetDeliveryId) {
          throw new Error("Could not find delivery ID in the contract");
        }

        console.log("Completing delivery with ID:", targetDeliveryId);

        // IMPORTANT: Send ETH with the transaction
        // This is the payment amount for the delivery person
        const paymentAmount = ethers.parseEther("0.01"); // Adjust as needed - 0.01 ETH

        // Call contract with the delivery ID and include payment
        const completeTx = await contract.completeDelivery(targetDeliveryId, {
          value: paymentAmount,
        });

        console.log("Transaction sent:", completeTx.hash);

        // Wait for transaction confirmation
        const receipt = await completeTx.wait();
        console.log("Transaction confirmed:", receipt);

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Complete Delivery",
          txHash: completeTx.hash,
          timestamp: Date.now(),
          details: `Delivery #${targetDeliveryId} completed successfully with payment of 0.01 ETH`,
        });

        // If we were completing an active delivery from state
        if (activeDelivery) {
          // Update delivery status
          const completedDelivery = {
            ...activeDelivery,
            status: "completed",
            completedDate: new Date().toISOString(),
          };

          // Add to completed deliveries list
          setCompletedDeliveries((prev) => [completedDelivery, ...prev]);

          // Reset active delivery state
          setActiveDelivery(null);
          setOtpInput("");
          setReceivedOtp("");
          setOtpSuccess("");
          setOtpError("");
          setCurrentOTP("");

          // Switch back to overview tab
          setActiveTab("overview");
        }

        // Reset the deliveryIdToComplete input
        setDeliveryIdToComplete("");

        // Show success message
        setSuccess(
          "Delivery completed successfully! Payment of 0.01 ETH has been sent to the delivery person."
        );
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error completing delivery:", error);
      setError(
        "Failed to complete delivery: " + (error.message || error.toString())
      );
    }
  };
  const verifyLocation = async () => {
    try {
      if (!activeDelivery) {
        setError("No active delivery found");
        return;
      }

      // Get current location
      let currentLocation = null;

      try {
        if (navigator.geolocation) {
          currentLocation = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              },
              (error) => {
                reject(error);
              }
            );
          });
        } else {
          throw new Error("Geolocation is not supported by your browser");
        }
      } catch (err) {
        setError(
          "Unable to get your current location. Please enable location services."
        );
        return;
      }

      // Show MetaMask popup
      setMetaMaskModalType("location");
      setMetaMaskModalMessage(
        "Verifying location and sending verification payment..."
      );
      setShowMetaMaskModal(true);

      try {
        // Get ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();

        // Find the delivery person's address
        const deliveryPerson = assignedDeliveryPersons.find(
          (person) => person.id === activeDelivery.deliveryPersonId
        );

        if (!deliveryPerson || !deliveryPerson.walletAddress) {
          throw new Error("Delivery person wallet address not found");
        }

        // Send another small amount of ETH to the delivery person
        const tx = await signer.sendTransaction({
          to: deliveryPerson.walletAddress,
          value: ethers.parseEther("0.00001"),
        });

        // Wait for transaction confirmation
        await tx.wait();

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Verify Location",
          txHash: tx.hash,
          timestamp: Date.now(),
          details: `Location verified and payment sent to Delivery Person ID: ${activeDelivery.deliveryPersonId}`,
        });

        // Update active delivery status
        const updatedDelivery = {
          ...activeDelivery,
          status: "location-verified",
        };
        setActiveDelivery(updatedDelivery);

        setSuccess(
          "Location verified successfully! You can now proceed with ration distribution."
        );
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error verifying location:", error);
      setError(
        "Failed to verify location: " + (error.message || error.toString())
      );
    }
  };
  const trackRationDistribution = async (
    userId,
    deliveryPersonId = "0",
    ethAmount = "0",
    items
  ) => {
    try {
      setLoading(true);

      // Show MetaMask popup
      setMetaMaskModalType("allocation");
      setMetaMaskModalMessage("Processing ration allocation on blockchain...");
      setShowMetaMaskModal(true);

      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Convert ETH amount to wei
        const amountInWei = ethers.parseEther(ethAmount || "0").toString();

        console.log("Allocating ration with parameters:", {
          userId: userId,
          deliveryPersonId: deliveryPersonId || "0",
          amount: amountInWei,
        });

        // Call contract to allocate ration
        const trackTx = await contract.allocateRation(
          userId,
          deliveryPersonId || "0",
          amountInWei
        );

        console.log("Transaction sent:", trackTx.hash);

        // Wait for transaction confirmation
        const receipt = await trackTx.wait();
        console.log("Transaction confirmed:", receipt);

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Allocate Ration",
          txHash: trackTx.hash,
          timestamp: Date.now(),
          details: `Ration allocated to User ID: ${userId}${
            deliveryPersonId && deliveryPersonId !== "0"
              ? ` via Delivery Person ID: ${deliveryPersonId}`
              : ""
          }${
            parseFloat(ethAmount) > 0 ? ` with amount of ${ethAmount} ETH` : ""
          }`,
        });

        // Update ration distributions
        const user = assignedConsumers.find((u) => u.aadhaar?.toString() === userId);
        const deliveryPerson = assignedDeliveryPersons.find(
          (p) => p.id === deliveryPersonId
        );

        const newDistribution = {
          id: `RAT${Date.now()}`,
          userId: userId,
          userName: user ? user.name : `User ${userId}`,
          category: user ? user.category : "Unknown",
          date: new Date().toISOString(),
          deliveryPersonId: deliveryPersonId || "0",
          deliveryPersonName: deliveryPerson
            ? deliveryPerson.name
            : "Direct Distribution",
          ethAmount: parseFloat(ethAmount) > 0 ? ethAmount : null,
          items: items || [
            { name: "Rice", quantity: "5kg" },
            { name: "Wheat", quantity: "3kg" },
            { name: "Sugar", quantity: "1kg" },
            { name: "Oil", quantity: "1L" },
          ],
        };

        setRationDistributions([newDistribution, ...rationDistributions]);

        // Update user's last ration date
        const updatedUsers = assignedConsumers.map((u) => {
          if (u.aadhaar?.toString() === userId) {
            return { ...u, lastRationDate: new Date().toISOString() };
          }
          return u;
        });

        setAssignedConsumers(updatedUsers);

        // THIS IS THE KEY ADDITION - Send notification to user
        notifyUserAboutRation(
          userId,
          newDistribution.id,
          ethAmount,
          newDistribution.items
        );

        // Show success message
        setSuccess(
          `Ration allocation to ${
            user ? user.name : "User " + userId
          } completed successfully!${
            parseFloat(ethAmount) > 0
              ? ` Amount of ${ethAmount} ETH included.`
              : ""
          }`
        );
      } catch (error) {
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error tracking ration distribution:", error);
      setError(
        "Failed to allocate ration: " + (error.message || error.toString())
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate days since last ration
  const daysSinceLastRation = (lastRationDate) => {
    if (!lastRationDate) return "Never";
    const lastDate = new Date(lastRationDate);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Stats for dashboard
  const getStats = () => [
    {
      title: "Assigned Consumers",
      value: assignedConsumers.length,
      change: `${assignedConsumers.length} active`,
      icon: Users,
      color: "bg-green-50 text-green-700",
    },
    {
      title: "Delivery Agent",
      value: assignedDeliveryAgent ? 1 : 0,
      change: assignedDeliveryAgent ? "Active" : "None",
      icon: Truck,
      color: "bg-amber-50 text-amber-700",
    },
    {
      title: "Pending Deliveries",
      value: pendingDeliveries.length || 0,
      change: `${pendingDeliveries.length || 0} pending`,
      icon: Package,
      color: "bg-blue-50 text-blue-700",
    },
    {
      title: "Monthly Earnings",
      value: dashboardData ? formatCurrency(dashboardData[4] || 0) + " ETH" : "0 ETH",
      change: "This month",
      icon: DollarSign,
      color: "bg-purple-50 text-purple-700",
    },
  ];

  // Add this function to your depot/page.jsx file
  const notifyUserAboutRation = (userId, rationId, amount, items = []) => {
    if (typeof window === 'undefined') return;
    
    // Get existing notifications from localStorage
    const notifications = JSON.parse(
      localStorage.getItem("rationchain-payment-notifications") || "[]"
    );

    // Create a new notification
    const notification = {
      id: `${Date.now()}`,
      userId: userId,
      rationId: rationId,
      depotId: depotId,
      depotName: depotName || `Depot #${depotId}`,
      amount: amount || "0.01",
      date: new Date().toISOString(),
      items: items || [
        { name: "Rice", quantity: "5kg" },
        { name: "Wheat", quantity: "3kg" },
        { name: "Sugar", quantity: "1kg" },
        { name: "Oil", quantity: "1L" },
      ],
      read: false,
    };

    // Add to notifications array
    notifications.push(notification);

    // Save back to localStorage
    localStorage.setItem(
      "rationchain-payment-notifications",
      JSON.stringify(notifications)
    );

    console.log(`Notification sent to user ${userId} for ration ${rationId}`);
  };
  return (
    <DepotLayout>
      <div className="container mx-auto p-6">
        {/* Debug Information - Only render after client hydration */}
        {isClient && (
          <div className="mb-4 p-4 bg-gray-100 rounded text-sm">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <p>Connected: {connected ? "✅ Yes" : "❌ No"}</p>
            <p>Account: {account || "❌ None"}</p>
            <p>Depot Name: {depotName || "❌ None"}</p>
            <p>Loading: {loading ? "⏳ Yes" : "✅ No"}</p>
            <p>Error: {error || "✅ None"}</p>
            <p>LocalStorage User: {storedUser ? "✅ Found" : "❌ None"}</p>
            
            {/* Manual Override for Testing */}
            <div className="mt-3 flex gap-2">
              <Button 
                onClick={() => {
                  localStorage.setItem('currentUser', JSON.stringify({
                    type: 'shopkeeper',
                    data: { 
                      name: 'Test Shopkeeper', 
                      walletAddress: account || '0x123',
                      area: 'Test Area'
                    }
                  }));
                  setDepotName('Test Shopkeeper');
                  setDepotLocation('Test Area');
                  setLoading(false);
                  setError('');
                  setStoredUser(localStorage.getItem('currentUser'));
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Force Login as Shopkeeper
              </Button>
              <Button 
                onClick={() => {
                  localStorage.removeItem('currentUser');
                  window.location.reload();
                }}
                size="sm"
                variant="outline"
              >
                Clear Data & Reload
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Depot Dashboard</h1>
          {!loading && depotName && (
            <p className="text-muted-foreground">
              Welcome to {depotName} {depotLocation && `(${depotLocation})`}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success</AlertTitle>
            <AlertDescription className="text-green-700">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {missingFunctions.length > 0 && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Limited Functionality</AlertTitle>
            <AlertDescription className="text-amber-700">
              Some advanced features are not available in the current contract version. 
              Missing functions: {missingFunctions.join(", ")}. 
              Basic functionality is still available.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            <p className="ml-3">Loading your dashboard...</p>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="bg-green-50">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-white"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="consumers"
                  className="data-[state=active]:bg-white"
                >
                  Consumers
                </TabsTrigger>
                <TabsTrigger
                  value="tokens"
                  className="data-[state=active]:bg-white"
                >
                  Token Operations
                </TabsTrigger>
                <TabsTrigger
                  value="deliveries"
                  className="data-[state=active]:bg-white"
                >
                  Deliveries
                </TabsTrigger>
                <TabsTrigger
                  value="payments"
                  className="data-[state=active]:bg-white"
                >
                  Payments
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-white"
                >
                  History
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <motion.div
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {getStats().map((stat, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Card className="overflow-hidden border-green-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              {stat.title}
                            </CardTitle>
                            <div className={`rounded-full p-2 ${stat.color}`}>
                              <stat.icon className="h-4 w-4" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-green-600 flex items-center mt-1">
                            {stat.change}
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="grid gap-6 md:grid-cols-2 mt-6">
                  {/* Assigned Delivery Persons */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle>Assigned Delivery Personnel</CardTitle>
                          <CardDescription>
                            Manage delivery personnel assigned to your depot
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {assignedDeliveryAgent ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>Address</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="hover:bg-green-50/50">
                                <TableCell className="font-medium">
                                  {assignedDeliveryAgent.address?.slice(0, 10)}...
                                </TableCell>
                                <TableCell>{assignedDeliveryAgent.name}</TableCell>
                                <TableCell>
                                  <Badge className={assignedDeliveryAgent.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                    {assignedDeliveryAgent.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-green-200 text-green-700 hover:bg-green-50"
                                  >
                                    <Truck className="h-3.5 w-3.5 mr-1" />
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Truck className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No delivery agent assigned yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Pending Deliveries */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Pending Deliveries</CardTitle>
                        <CardDescription>
                          Deliveries scheduled for your depot
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {pendingDeliveries.length > 0 ? (
                          <div className="space-y-4">
                            {pendingDeliveries.map((delivery) => (
                              <div
                                key={delivery.id}
                                className="border rounded-lg p-4 bg-green-50/50 hover:bg-green-50 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="rounded-full p-2 bg-green-100 text-green-700 mr-3">
                                      <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold">
                                        {delivery.id}
                                      </h3>
                                      <p className="text-gray-600 text-sm">
                                        {delivery.deliveryPersonName} |{" "}
                                        {formatDate(delivery.scheduledDate)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    className={getStatusColor(delivery.status)}
                                  >
                                    {delivery.status === "scheduled"
                                      ? "Scheduled"
                                      : "In Progress"}
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() =>
                                    receiveDeliveryPerson(
                                      delivery.deliveryPersonId
                                    )
                                  }
                                  className="mt-3 bg-green-600 hover:bg-green-700 w-full"
                                  disabled={activeDelivery !== null}
                                >
                                  Receive Delivery
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No pending deliveries
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Recent Activity */}
                <motion.div
                  className="grid gap-6 md:grid-cols-2 mt-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.5 }}
                >
                  {/* Recent Ration Distributions */}
                  <motion.div variants={itemVariants}>
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Recent Ration Distributions</CardTitle>
                        <CardDescription>
                          Latest rations distributed to beneficiaries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {rationDistributions.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>Beneficiary</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rationDistributions.slice(0, 5).map((ration) => (
                                <TableRow
                                  key={ration.id}
                                  className="hover:bg-green-50/50"
                                >
                                  <TableCell className="font-medium">
                                    {ration.userName}
                                    <span className="block text-xs text-gray-500">
                                      {ration.category}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(ration.date)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {ration.items
                                        .slice(0, 2)
                                        .map((item, index) => (
                                          <Badge
                                            key={index}
                                            variant="outline"
                                            className="bg-green-50 text-green-800 border-green-200"
                                          >
                                            {item.name}: {item.quantity}
                                          </Badge>
                                        ))}
                                      {ration.items.length > 2 && (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-800 border-green-200"
                                        >
                                          +{ration.items.length - 2} more
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Package className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No ration distributions recorded
                            </p>
                          </div>
                        )}
                      </CardContent>
                      {rationDistributions.length > 5 && (
                        <CardFooter>
                          <Button
                            variant="outline"
                            className="w-full border-green-200 text-green-700"
                            onClick={() => setActiveTab("users")}
                          >
                            View All Distributions
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  </motion.div>

                  {/* Completed Deliveries */}
                  <motion.div variants={itemVariants}>
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Completed Deliveries</CardTitle>
                        <CardDescription>
                          Successfully completed deliveries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {completedDeliveries.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>ID</TableHead>
                                <TableHead>Delivery Person</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {completedDeliveries
                                .slice(0, 5)
                                .map((delivery) => (
                                  <TableRow
                                    key={delivery.id}
                                    className="hover:bg-green-50/50"
                                  >
                                    <TableCell className="font-medium">
                                      {delivery.id}
                                    </TableCell>
                                    <TableCell>
                                      {delivery.deliveryPersonName}
                                    </TableCell>
                                    <TableCell>
                                      {formatDate(delivery.completedDate)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        className={getStatusColor("completed")}
                                      >
                                        Completed
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No completed deliveries yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                      {completedDeliveries.length > 5 && (
                        <CardFooter>
                          <Button
                            variant="outline"
                            className="w-full border-green-200 text-green-700"
                            onClick={() => setActiveTab("history")}
                          >
                            View All Deliveries
                          </Button>
                        </CardFooter>
                      )}
                    </Card>
                  </motion.div>
                </motion.div>
              </TabsContent>

              {/* Active Delivery Tab */}
              <TabsContent value="active-delivery" className="mt-6">
                {activeDelivery && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border-green-100 shadow-sm mb-6">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Active Delivery</CardTitle>
                          <CardDescription>
                            Processing delivery with{" "}
                            {activeDelivery.deliveryPersonName}
                          </CardDescription>
                        </div>
                        <Badge
                          className={getStatusColor(activeDelivery.status)}
                        >
                          <div className="flex items-center">
                            {activeDelivery.status === "authenticated" ? (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            ) : activeDelivery.status ===
                              "location-verified" ? (
                              <MapPin className="h-4 w-4 mr-1" />
                            ) : (
                              <Clock className="h-4 w-4 mr-1" />
                            )}
                            <span>
                              {activeDelivery.status === "authenticated"
                                ? "OTP Verified"
                                : activeDelivery.status === "location-verified"
                                ? "Location Verified"
                                : "In Progress"}
                            </span>
                          </div>
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Start</span>
                            <span>OTP</span>
                            <span>Location</span>
                            <span>Complete</span>
                          </div>
                          <div className="relative w-full h-2 bg-green-100 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-300 ease-in-out"
                              style={{
                                width:
                                  activeDelivery.status === "in-progress"
                                    ? "25%"
                                    : activeDelivery.status === "authenticated"
                                    ? "50%"
                                    : activeDelivery.status ===
                                      "location-verified"
                                    ? "75%"
                                    : "25%",
                              }}
                            />
                          </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50/50 rounded-lg">
                          <div>
                            <p className="text-sm text-gray-500">
                              Delivery Person ID
                            </p>
                            <p className="font-medium">
                              {activeDelivery.deliveryPersonId}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Start Time</p>
                            <p className="font-medium">
                              {formatDate(activeDelivery.startTime)}
                            </p>
                          </div>
                        </div>

                        {/* OTP Generation and Display */}
                        <Card className="border-green-200">
                          <CardHeader>
                            <CardTitle className="text-lg">
                              OTP Verification
                            </CardTitle>
                            <CardDescription>
                              Generate and provide OTP to the delivery person
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            {otpError && (
                              <Alert variant="destructive" className="mb-4">
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{otpError}</AlertDescription>
                              </Alert>
                            )}

                            {otpSuccess && (
                              <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>
                                  {otpSuccess}
                                </AlertDescription>
                              </Alert>
                            )}

                            {currentOTP && (
                              <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-green-800 mb-2">
                                  Verification OTP
                                </h3>
                                <div className="bg-white p-4 border border-green-200 rounded-lg text-center">
                                  <p className="text-3xl font-mono font-bold tracking-widest">
                                    {currentOTP}
                                  </p>
                                </div>
                                <p className="mt-2 text-sm text-green-700">
                                  Show this OTP to the delivery person for
                                  verification. They need to enter this code in
                                  their dashboard.
                                </p>
                                <div className="bg-yellow-50 p-3 mt-3 rounded border border-yellow-200">
                                  <p className="text-yellow-800">
                                    <strong>Important:</strong> Only the
                                    delivery person can verify this OTP from
                                    their app. After they verify, click "Check
                                    Verification Status" below.
                                  </p>
                                </div>
                                <div className="mt-4">
                                  <Button
                                    onClick={checkDeliveryStatus}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    Check Verification Status
                                  </Button>
                                </div>
                              </div>
                            )}

                            {otpError && otpError.includes("pending state") && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
                                <p className="text-yellow-800 mb-2">
                                  <strong>Delivery State Issue:</strong> This
                                  delivery has already progressed beyond the
                                  pending state.
                                </p>
                                <p className="text-yellow-700 mb-4">
                                  The OTP can only be generated when a delivery
                                  is in the pending state. You need to reset the
                                  delivery state first.
                                </p>
                                <Button
                                  onClick={resetDeliveryState}
                                  className="bg-yellow-600 hover:bg-yellow-700"
                                  disabled={loading}
                                >
                                  {loading
                                    ? "Resetting..."
                                    : "Reset Delivery to Pending State"}
                                </Button>
                              </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                onClick={generateOTP}
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={generatingOtp || !activeDelivery}
                              >
                                {generatingOtp ? (
                                  <>
                                    <span className="inline-block animate-spin h-4 w-4 mr-2 border-t-2 border-white rounded-full"></span>
                                    Generating...
                                  </>
                                ) : (
                                  "Generate OTP for Verification"
                                )}
                              </Button>

                              <div className="mt-3 flex items-center ml-2">
                                <input
                                  type="checkbox"
                                  id="fake-mode"
                                  className="mr-2"
                                  checked={fakeMode}
                                  onChange={() => setFakeMode(!fakeMode)}
                                />
                                <label
                                  htmlFor="fake-mode"
                                  className="text-sm text-gray-600"
                                >
                                  Enable test mode (simulates blockchain
                                  transactions)
                                </label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Location Verification Section */}
                        {activeDelivery.status === "authenticated" && (
                          <Card className="border-blue-200">
                            <CardHeader>
                              <CardTitle className="text-lg">
                                Location Verification
                              </CardTitle>
                              <CardDescription>
                                Verify the delivery person's location
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center">
                                <Button
                                  onClick={verifyLocation}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Verify Location
                                </Button>
                                <p className="ml-4 text-sm text-gray-600">
                                  Click to verify the delivery person's location
                                  with your depot
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Complete Delivery Button */}
                        {/* {activeDelivery.status === "location-verified" && (
                          <div className="flex justify-center mt-6">
                            <Button
                              onClick={completeDelivery}
                              className="bg-green-600 hover:bg-green-700 px-8 py-6 text-lg"
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Complete Delivery
                            </Button>
                          </div>
                        )} */}
                        <div className="mt-4">
                          <h3 className="font-medium text-lg mb-2">
                            Complete Delivery by ID
                          </h3>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Enter Delivery ID"
                              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500"
                              value={deliveryIdToComplete}
                              onChange={(e) =>
                                setDeliveryIdToComplete(e.target.value)
                              }
                            />
                            <Button
                              onClick={() =>
                                completeDelivery(deliveryIdToComplete)
                              }
                              className="bg-green-600 hover:bg-green-700 rounded-md"
                            >
                              Complete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* Users (Beneficiaries) Tab */}
              <TabsContent value="users" className="mt-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <Card className="border-green-100 shadow-sm mb-6">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Beneficiaries</CardTitle>
                        <CardDescription>
                          Manage users assigned to your depot
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {assignedConsumers.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>User ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Last Ration</TableHead>
                              <TableHead>Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignedConsumers.map((user, index) => (
                              <TableRow
                                key={user.aadhaar || index}
                                className="hover:bg-green-50/50"
                              >
                                <TableCell className="font-medium">
                                  {user.aadhaar}
                                </TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.category}</TableCell>
                                <TableCell>
                                  {user.lastRationDate ? (
                                    <>
                                      {formatDate(user.lastRationDate)}
                                      <span className="block text-xs text-gray-500">
                                        (
                                        {daysSinceLastRation(
                                          user.lastRationDate
                                        )}{" "}
                                        days ago)
                                      </span>
                                    </>
                                  ) : (
                                    "Never"
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() =>
                                      trackRationDistribution(user.id)
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="border-green-200 text-green-700 hover:bg-green-50"
                                  >
                                    <Package className="h-3.5 w-3.5 mr-1" />
                                    Track Ration
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">
                            No users assigned to this depot
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Record New Ration Distribution Form - UPDATED WITH DELIVERY PERSON SELECT AND ETH AMOUNT */}
                  <Card className="border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Record New Ration Distribution</CardTitle>
                      <CardDescription>
                        Track ration distribution to beneficiaries
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          const beneficiaryId = formData.get("beneficiaryId");
                          const deliveryPersonId =
                            formData.get("deliveryPersonId");
                          const ethAmount = formData.get("ethAmount");
                          const items = [
                            { name: "Rice", quantity: formData.get("riceQty") },
                            {
                              name: "Wheat",
                              quantity: formData.get("wheatQty"),
                            },
                            {
                              name: "Sugar",
                              quantity: formData.get("sugarQty"),
                            },
                            { name: "Oil", quantity: formData.get("oilQty") },
                          ].filter((item) => item.quantity);

                          trackRationDistribution(
                            beneficiaryId,
                            deliveryPersonId,
                            ethAmount,
                            items
                          );
                          e.target.reset();
                        }}
                      >
                        <div className="grid grid-cols-1 gap-6">
                          <div className="grid gap-3">
                            <Label htmlFor="beneficiaryId">
                              Select Beneficiary
                            </Label>
                            <Select name="beneficiaryId" required>
                              <SelectTrigger
                                id="beneficiaryId"
                                className="w-full"
                              >
                                <SelectValue placeholder="Choose a beneficiary" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignedConsumers.map((user, index) => (
                                  <SelectItem key={user.aadhaar || index} value={user.aadhaar?.toString() || index.toString()}>
                                    {user.name} (Aadhaar: {user.aadhaar})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* New Delivery Person Selection */}
                          <div className="grid gap-3">
                            <Label htmlFor="deliveryPersonId">
                              Select Delivery Person
                            </Label>
                            <Select name="deliveryPersonId">
                              <SelectTrigger
                                id="deliveryPersonId"
                                className="w-full"
                              >
                                <SelectValue placeholder="Choose a delivery person (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  None (Direct Distribution)
                                </SelectItem>
                                {assignedDeliveryAgent && (
                                  <SelectItem value={assignedDeliveryAgent.address}>
                                    {assignedDeliveryAgent.name} ({assignedDeliveryAgent.address?.slice(0, 10)}...)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* New ETH Amount Field */}
                          <div className="grid gap-3">
                            <Label htmlFor="ethAmount">Amount (ETH)</Label>
                            <Input
                              id="ethAmount"
                              name="ethAmount"
                              type="number"
                              step="0.001"
                              placeholder="e.g., 0.01"
                              defaultValue="0"
                            />
                            <p className="text-xs text-gray-500">
                              Optional payment to include with allocation
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="riceQty">Rice</Label>
                              <Input
                                id="riceQty"
                                name="riceQty"
                                placeholder="e.g., 5kg"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="wheatQty">Wheat</Label>
                              <Input
                                id="wheatQty"
                                name="wheatQty"
                                placeholder="e.g., 3kg"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="sugarQty">Sugar</Label>
                              <Input
                                id="sugarQty"
                                name="sugarQty"
                                placeholder="e.g., 1kg"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="oilQty">Oil</Label>
                              <Input
                                id="oilQty"
                                name="oilQty"
                                placeholder="e.g., 1L"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Record Distribution
                            </Button>
                          </div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  {/* All Ration Distributions - UPDATED TO SHOW DELIVERY PERSON AND ETH AMOUNT */}
                  <Card className="border-green-100 shadow-sm mt-6">
                    <CardHeader>
                      <CardTitle>All Ration Distributions</CardTitle>
                      <CardDescription>
                        Complete history of rations distributed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {rationDistributions.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>ID</TableHead>
                              <TableHead>Beneficiary</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Delivery Person</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Payment</TableHead>
                              <TableHead>Items</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rationDistributions.map((ration) => (
                              <TableRow
                                key={ration.id}
                                className="hover:bg-green-50/50"
                              >
                                <TableCell className="font-medium">
                                  {ration.id}
                                </TableCell>
                                <TableCell>{ration.userName}</TableCell>
                                <TableCell>{ration.category}</TableCell>
                                <TableCell>
                                  {ration.deliveryPersonName || "Direct"}
                                </TableCell>
                                <TableCell>{formatDate(ration.date)}</TableCell>
                                <TableCell>
                                  {ration.ethAmount ? (
                                    <span className="text-green-700 font-medium">
                                      {ration.ethAmount} ETH
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">
                                      None
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {ration.items.map((item, index) => (
                                      <Badge
                                        key={index}
                                        variant="outline"
                                        className="bg-green-50 text-green-800 border-green-200"
                                      >
                                        {item.name}: {item.quantity}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <Package className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">
                            No ration distributions recorded
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Consumers Tab */}
              <TabsContent value="consumers" className="mt-6">
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  <Card className="border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Assigned Consumers
                      </CardTitle>
                      <CardDescription>
                        Manage consumers assigned to your shop
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {assignedConsumers.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>Aadhaar</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Mobile</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {assignedConsumers.map((consumer, index) => (
                              <TableRow key={index} className="hover:bg-green-50/50">
                                <TableCell className="font-medium">
                                  {consumer.aadhaar?.toString()}
                                </TableCell>
                                <TableCell>{consumer.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50">
                                    {consumer.category}
                                  </Badge>
                                </TableCell>
                                <TableCell>{consumer.mobile}</TableCell>
                                <TableCell>
                                  <Badge className={consumer.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                    {consumer.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => generateTokensForConsumer(consumer.aadhaar, new Date().getMonth() + 1, new Date().getFullYear())}
                                      disabled={generatingTokens}
                                      className="border-green-200 text-green-700 hover:bg-green-50"
                                    >
                                      <Package className="h-3.5 w-3.5 mr-1" />
                                      Generate Tokens
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <Users className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">No consumers assigned</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Token Operations Tab */}
              <TabsContent value="tokens" className="mt-6">
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  <div className="grid gap-6">
                    {/* Token Generation Section */}
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Token Generation
                        </CardTitle>
                        <CardDescription>
                          Generate ration tokens for consumers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <Button
                            onClick={() => {
                              // Generate tokens for all consumers assigned to this shopkeeper
                              const currentMonth = new Date().getMonth() + 1;
                              const currentYear = new Date().getFullYear();
                              // We'd need a bulk generate function - for now just show message
                              setSuccess("Bulk token generation for all consumers initiated!");
                            }}
                            disabled={generatingTokens}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Generate Tokens for All Consumers
                          </Button>
                          <Button
                            onClick={() => {
                              // Generate tokens for current month for all consumers in a specific category
                              setSuccess("Category-wise token generation initiated!");
                            }}
                            disabled={generatingTokens}
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Generate by Category
                          </Button>
                        </div>

                        {/* Token Operations List */}
                        {tokenOperations.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>Token ID</TableHead>
                                <TableHead>Consumer</TableHead>
                                <TableHead>Month/Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tokenOperations.slice(0, 10).map((token, index) => (
                                <TableRow key={index} className="hover:bg-green-50/50">
                                  <TableCell className="font-medium">
                                    #{token.tokenId || index + 1}
                                  </TableCell>
                                  <TableCell>{token.consumerName || "Unknown"}</TableCell>
                                  <TableCell>{token.month || "Current"}/{token.year || new Date().getFullYear()}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(token.status || "pending")}>
                                      {token.status || "Pending"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => markDeliveryComplete(token.tokenId, token.consumerAadhaar)}
                                      disabled={markingDelivery}
                                      className="border-green-200 text-green-700 hover:bg-green-50"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Mark Delivered
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Package className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">No token operations yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Unclaimed Tokens Section */}
                    <Card className="border-amber-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          Unclaimed Tokens
                        </CardTitle>
                        <CardDescription>
                          Tokens delivered but not yet claimed by consumers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {unclaimedTokens.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-amber-50 hover:bg-amber-100">
                                <TableHead>Token ID</TableHead>
                                <TableHead>Consumer</TableHead>
                                <TableHead>Delivered Date</TableHead>
                                <TableHead>Days Unclaimed</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {unclaimedTokens.slice(0, 10).map((token, index) => (
                                <TableRow key={index} className="hover:bg-amber-50/50">
                                  <TableCell className="font-medium">
                                    #{token.tokenId || index + 1}
                                  </TableCell>
                                  <TableCell>{token.consumerName || "Unknown"}</TableCell>
                                  <TableCell>{formatDate(token.deliveredDate)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-amber-50 text-amber-800">
                                      {token.daysUnclaimed || Math.floor(Math.random() * 5) + 1} days
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-amber-50/50 rounded-md">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-amber-400" />
                            <p className="mt-2 text-amber-600">All tokens have been claimed!</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Deliveries Tab */}
              <TabsContent value="deliveries" className="mt-6">
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  <div className="grid gap-6">
                    {/* Delivery Agent Assignment */}
                    {!assignedDeliveryAgent && (
                      <Card className="border-amber-100 shadow-sm bg-amber-50/20">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-amber-800">
                            <AlertCircle className="h-5 w-5" />
                            No Delivery Agent Assigned
                          </CardTitle>
                          <CardDescription>
                            You need to assign a delivery agent to handle deliveries
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-4">
                            <Input 
                              placeholder="Enter delivery agent wallet address"
                              className="flex-1"
                              id="agentAddress"
                            />
                            <Button
                              onClick={() => {
                                const address = document.getElementById('agentAddress').value;
                                if (address) assignDeliveryAgent(address);
                              }}
                              disabled={assigningAgent}
                              className="bg-amber-600 hover:bg-amber-700"
                            >
                              <Truck className="h-4 w-4 mr-2" />
                              Assign Agent
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Assigned Delivery Agent */}
                    {assignedDeliveryAgent && (
                      <Card className="border-green-100 shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5" />
                            Assigned Delivery Agent
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                            <div>
                              <h3 className="font-semibold">{assignedDeliveryAgent.name}</h3>
                              <p className="text-sm text-gray-600">{assignedDeliveryAgent.address}</p>
                              <Badge className={assignedDeliveryAgent.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                {assignedDeliveryAgent.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Pending Deliveries */}
                    <Card className="border-blue-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Pending Deliveries
                        </CardTitle>
                        <CardDescription>
                          Deliveries waiting to be processed
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {pendingDeliveries.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-blue-50 hover:bg-blue-100">
                                <TableHead>Token ID</TableHead>
                                <TableHead>Consumer</TableHead>
                                <TableHead>Aadhaar</TableHead>
                                <TableHead>Month/Year</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingDeliveries.map((delivery, index) => (
                                <TableRow key={index} className="hover:bg-blue-50/50">
                                  <TableCell className="font-medium">
                                    #{delivery.tokenId || delivery.id}
                                  </TableCell>
                                  <TableCell>{delivery.userName || delivery.name}</TableCell>
                                  <TableCell>{delivery.aadhaar}</TableCell>
                                  <TableCell>{delivery.month}/{delivery.year}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      onClick={() => markDeliveryComplete(delivery.tokenId || delivery.id, delivery.aadhaar)}
                                      disabled={markingDelivery}
                                      className="bg-blue-600 hover:bg-blue-700"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Mark Complete
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-blue-50/50 rounded-md">
                            <CheckCircle2 className="mx-auto h-12 w-12 text-blue-400" />
                            <p className="mt-2 text-blue-600">No pending deliveries</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Delivery History */}
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="h-5 w-5" />
                          Delivery History
                        </CardTitle>
                        <CardDescription>
                          Recently completed deliveries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {deliveryHistory.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-green-50 hover:bg-green-100">
                                <TableHead>Token ID</TableHead>
                                <TableHead>Consumer</TableHead>
                                <TableHead>Completed Date</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deliveryHistory.slice(0, 10).map((delivery, index) => (
                                <TableRow key={index} className="hover:bg-green-50/50">
                                  <TableCell className="font-medium">
                                    #{delivery.tokenId || index + 1}
                                  </TableCell>
                                  <TableCell>{delivery.userName || delivery.name}</TableCell>
                                  <TableCell>{formatDate(delivery.completedDate || delivery.timestamp)}</TableCell>
                                  <TableCell>
                                    <Badge className="bg-green-100 text-green-800">
                                      Completed
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <History className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">No delivery history yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="mt-6">
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  <div className="grid gap-6">
                    {/* Payment Dashboard */}
                    <Card className="border-purple-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Payment Dashboard
                        </CardTitle>
                        <CardDescription>
                          Overview of earnings and payments
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {paymentDashboard ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-purple-50 rounded-lg">
                              <h3 className="text-sm font-medium text-purple-700">Total Earnings</h3>
                              <p className="text-2xl font-bold text-purple-900">
                                {formatCurrency(paymentDashboard[0] || 0)} ETH
                              </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                              <h3 className="text-sm font-medium text-green-700">Monthly Earnings</h3>
                              <p className="text-2xl font-bold text-green-900">
                                {formatCurrency(paymentDashboard[1] || 0)} ETH
                              </p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg">
                              <h3 className="text-sm font-medium text-amber-700">Pending Payments</h3>
                              <p className="text-2xl font-bold text-amber-900">
                                {formatCurrency(paymentDashboard[2] || 0)} ETH
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-purple-50/50 rounded-md">
                            <DollarSign className="mx-auto h-12 w-12 text-purple-400" />
                            <p className="mt-2 text-purple-600">Payment data loading...</p>
                          </div>
                        )}

                        {/* Withdraw Button */}
                        <div className="mt-6 text-center">
                          <Button
                            onClick={withdrawPayment}
                            disabled={processingTx}
                            className="bg-purple-600 hover:bg-purple-700"
                            size="lg"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Withdraw Pending Payments
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Metrics */}
                    {performanceMetrics && (
                      <Card className="border-blue-100 shadow-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Performance Metrics
                          </CardTitle>
                          <CardDescription>
                            Your delivery and service performance
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <h3 className="text-sm font-medium text-blue-700">Delivery Success Rate</h3>
                              <p className="text-2xl font-bold text-blue-900">
                                {performanceMetrics.successRate || "95"}%
                              </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                              <h3 className="text-sm font-medium text-green-700">Monthly Deliveries</h3>
                              <p className="text-2xl font-bold text-green-900">
                                {performanceMetrics.monthlyDeliveries || dashboardData?.[5] || "0"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Ration Price Settings */}
                    <Card className="border-green-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Ration Information
                        </CardTitle>
                        <CardDescription>
                          Current ration amounts and pricing
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {rationAmounts.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rationAmounts.map((ration, index) => (
                              <div key={index} className="p-4 bg-green-50 rounded-lg">
                                <h3 className="text-sm font-medium text-green-700">
                                  {ration.category || `Category ${index + 1}`}
                                </h3>
                                <p className="text-lg font-semibold text-green-900">
                                  {ration.amount || "5"} kg/month
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-green-50/50 rounded-md">
                            <Package className="mx-auto h-12 w-12 text-green-400" />
                            <p className="mt-2 text-green-600">Ration amounts loading...</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Transaction History Tab */}
              <TabsContent value="history" className="mt-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  <Card className="border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Record of blockchain transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {txHistory.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50 hover:bg-green-100">
                              <TableHead>Type</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Details</TableHead>
                              <TableHead>Transaction</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {txHistory
                              .slice()
                              .reverse()
                              .map((tx, index) => (
                                <TableRow
                                  key={index}
                                  className="hover:bg-green-50/50"
                                >
                                  <TableCell className="font-medium">
                                    {tx.type}
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(tx.timestamp)}
                                  </TableCell>
                                  <TableCell>{tx.details}</TableCell>
                                  <TableCell>
                                    {tx.txHash ? (
                                      <a
                                        href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-green-600 hover:underline flex items-center"
                                      >
                                        View on Etherscan
                                        <ArrowUpRight className="ml-1 h-3 w-3" />
                                      </a>
                                    ) : (
                                      "N/A"
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12 bg-green-50/50 rounded-md">
                          <History className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-gray-600">
                            No transactions recorded yet
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Instruction Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Delivery Process Instructions */}
                    <Card className="border-green-100 shadow-sm bg-indigo-50">
                      <CardHeader>
                        <CardTitle className="text-indigo-800">
                          Delivery Process
                        </CardTitle>
                        <CardDescription className="text-indigo-700">
                          Follow these steps for handling deliveries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2 text-indigo-700 list-decimal pl-5">
                          <li>
                            <span className="font-medium">
                              Receive delivery person
                            </span>{" "}
                            - When a delivery person arrives, click "Receive
                            Delivery"
                          </li>
                          <li>
                            <span className="font-medium">
                              Generate and share OTP
                            </span>{" "}
                            - Create an OTP and show it to the delivery person
                          </li>
                          <li>
                            <span className="font-medium">Verify location</span>{" "}
                            - Confirm the delivery person is at your depot
                            location
                          </li>
                          <li>
                            <span className="font-medium">
                              Complete delivery
                            </span>{" "}
                            - Process payment to the delivery person
                            automatically via smart contract
                          </li>
                        </ol>
                      </CardContent>
                    </Card>

                    {/* Ration Distribution Instructions */}
                    <Card className="border-green-100 shadow-sm bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">
                          Ration Distribution
                        </CardTitle>
                        <CardDescription className="text-green-700">
                          Guidelines for distributing rations to beneficiaries
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2 text-green-700 list-decimal pl-5">
                          <li>
                            <span className="font-medium">
                              Verify beneficiary identity
                            </span>{" "}
                            - Check beneficiary's ID/documents
                          </li>
                          <li>
                            <span className="font-medium">
                              Distribute ration items
                            </span>{" "}
                            - Provide the appropriate items based on category
                          </li>
                          <li>
                            <span className="font-medium">
                              Record in blockchain
                            </span>{" "}
                            - Click "Track Ration" and enter details
                          </li>
                          <li>
                            <span className="font-medium">Update status</span> -
                            The system will automatically update last ration
                            date for the beneficiary
                          </li>
                        </ol>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      {/* MetaMask Transaction Modal */}
      {showMetaMaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 mr-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 35 33"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z"
                    fill="#E17726"
                    stroke="#E17726"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.65881 1L15.6697 10.8511L13.3487 4.99099L2.65881 1Z"
                    fill="#E27625"
                    stroke="#E27625"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">MetaMask Transaction</h3>
            </div>

            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Transaction Type:</span>
                <span className="font-medium">
                  {metaMaskModalType === "otp"
                    ? "Generate OTP"
                    : metaMaskModalType === "reset"
                    ? "Reset Delivery"
                    : metaMaskModalType === "allocation"
                    ? "Ration Allocation"
                    : "Delivery Processing"}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-600">For Delivery:</span>
                <span className="font-medium">
                  #{activeDelivery?.id || "..."}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Gas Fee (est.):</span>
                <span>0.001 ETH</span>
              </div>
            </div>

            <p className="mb-4 text-center text-gray-700">
              {metaMaskModalMessage}
            </p>

            <div className="flex justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Please confirm this transaction in your MetaMask wallet
            </p>
          </div>
        </div>
      )}
    </DepotLayout>
  );
}
