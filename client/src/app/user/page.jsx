'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";
import DCVTokenABI from "../../../abis/DCVToken.json";
import { User, CreditCard, CheckCircle2, AlertCircle, Package, Users, Store, Wallet, Calendar, BarChart2, ShieldAlert } from "lucide-react";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DCVTOKEN_ADDRESS = process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS;

const cardClass = "rounded-xl shadow border border-green-100 bg-white p-5 flex flex-col gap-2";
const statLabel = "text-xs text-gray-500 font-medium";
const statValue = "text-2xl font-bold text-green-900";
const statIcon = "h-6 w-6 text-green-600";

// Function to get the correct ABI from the merged structure
function getContractABI() {
  if (DiamondMergedABI.contracts && DiamondMergedABI.contracts.Diamond && DiamondMergedABI.contracts.Diamond.abi) {
    return DiamondMergedABI.contracts.Diamond.abi;
  }
  
  // Fallback to merged ABI approach if structure is different
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

export default function ConsumerDashboard() {
  const searchParams = useSearchParams();
  const aadhaar = searchParams.get("aadhaar");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [unclaimedTokens, setUnclaimedTokens] = useState([]);
  const [hasMonthlyToken, setHasMonthlyToken] = useState(false);
  const [distributionHistory, setDistributionHistory] = useState(null);
  const [shopkeeper, setShopkeeper] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [rationAmounts, setRationAmounts] = useState(null);
  const [dcvTokens, setDcvTokens] = useState([]);
  const [fraudStatus, setFraudStatus] = useState(null);
  const [fraudLoading, setFraudLoading] = useState(false);

  // New state variables for missing functions
  const [currentMonth, setCurrentMonth] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [tokenStatuses, setTokenStatuses] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState(null);
  const [paymentCalculations, setPaymentCalculations] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState(0);

  // Authentication check - ensure user has logged in properly
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      setError("Please log in to access your dashboard.");
      setLoading(false);
      return;
    }

    try {
      const userData = JSON.parse(currentUser);
      if (userData.type !== 'consumer' || !userData.data) {
        setError("Invalid authentication. Please log in again.");
        setLoading(false);
        return;
      }

      // Verify the aadhaar from URL matches the logged-in user
      if (aadhaar && userData.data.aadharNumber !== aadhaar) {
        setError("Authentication mismatch. Please log in with the correct account.");
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      setError("Authentication error. Please log in again.");
      setLoading(false);
      return;
    }
  }, [aadhaar]);

  useEffect(() => {
    if (!aadhaar) {
      setError("Aadhaar not provided.");
      setLoading(false);
      return;
    }

    // Additional authentication verification
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        console.log("🔐 Authenticated user data:", userData);
        if (userData.type === 'consumer' && userData.data.aadharNumber === aadhaar) {
          console.log("✅ Authentication verified for consumer:", userData.data.name);
        }
      } catch (error) {
        console.warn("⚠️ Could not parse user authentication data");
      }
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        console.log("🔍 Starting data fetch for aadhaar:", aadhaar);
        console.log("🔗 Contract address:", DIAMOND_PROXY_ADDRESS);
        console.log("🌐 RPC URL:", RPC_URL);
        
        if (!DIAMOND_PROXY_ADDRESS || !RPC_URL) {
          throw new Error("Contract address or RPC URL not configured");
        }
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        
        // Use the corrected ABI structure - same as other working files
        const contractABI = getContractABI();
        console.log('📋 Contract ABI length:', contractABI.length);
        
        // Debug: List all available functions in the ABI
        const availableFunctions = contractABI
          .filter(item => item.type === 'function')
          .map(item => item.name);
        console.log('📋 Available functions in ABI:', availableFunctions.slice(0, 10), '... and', availableFunctions.length - 10, 'more');
        
        // Check for specific functions we need
        const importantFunctions = ['getTotalConsumers', 'getConsumerDashboard', 'getConsumerByAadhaar'];
        importantFunctions.forEach(funcName => {
          const hasFunction = contractABI.find(item => 
            item.type === 'function' && item.name === funcName
          );
          console.log(`🔍 ${funcName} function found in ABI:`, !!hasFunction);
        });
        
        const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, contractABI, provider);
        const aadhaarBigInt = BigInt(aadhaar);

        // Start with the consumer-specific functions - primary connection test
        console.log("🧪 Testing contract connection with getConsumerDashboard...");
        
        try {
          console.log("🧪 Testing getConsumerDashboard function...");
          const dashboardTest = await contract.getConsumerDashboard(aadhaarBigInt);
          console.log("✅ getConsumerDashboard test successful:", dashboardTest);
          console.log("✅ Contract connection verified!");
        } catch (dashboardTestError) {
          console.warn("⚠️ getConsumerDashboard test failed:", dashboardTestError.message);
          // If this specific consumer doesn't exist, that's okay - we'll continue
          if (!dashboardTestError.message.includes("Consumer not found")) {
            console.error("❌ Contract connection failed with unexpected error:", dashboardTestError.message);
          }
        }

        console.log("👤 Fetching consumer profile...");
        try {
          const profileData = await contract.getConsumerByAadhaar(aadhaarBigInt);
          console.log("✅ Profile data:", profileData);
          setProfile(profileData);
          
          // If we have profile data, fetch related information
          if (profileData && profileData.assignedShopkeeper && profileData.assignedShopkeeper !== ethers.ZeroAddress) {
            console.log("🏪 Fetching shopkeeper info...");
            try {
              const shopkeeperInfo = await contract.getShopkeeperInfo(profileData.assignedShopkeeper);
              console.log("✅ Shopkeeper info:", shopkeeperInfo);
              setShopkeeper(shopkeeperInfo);
            } catch (shopkeeperError) {
              console.warn("⚠️ Shopkeeper info fetch failed:", shopkeeperError.message);
            }
          }
          
        } catch (profileError) {
          console.warn("⚠️ Profile fetch failed:", profileError.message);
          if (profileError.message.includes("Consumer not found")) {
            // Set a helpful error message
            setError(`Consumer with Aadhaar ${aadhaar} not found in the system. Try using Aadhaar: 123456780012 (test consumer)`);
            return; // Exit early if consumer doesn't exist
          }
        }

        console.log("📊 Fetching consumer dashboard...");
        try {
          const dashboardData = await contract.getConsumerDashboard(aadhaarBigInt);
          console.log("✅ Dashboard data:", dashboardData);
          setDashboard(dashboardData);
        } catch (dashboardError) {
          console.warn("⚠️ Dashboard fetch failed:", dashboardError.message);
          // Continue without dashboard data
        }

        console.log("🎫 Fetching unclaimed tokens...");
        try {
          const tokens = await contract.getUnclaimedTokensByAadhaar(aadhaarBigInt);
          console.log("✅ Unclaimed tokens:", tokens);
          setUnclaimedTokens(Array.isArray(tokens) ? tokens : []);
        } catch (tokensError) {
          console.warn("⚠️ Unclaimed tokens fetch failed:", tokensError.message);
          setUnclaimedTokens([]);
        }

        console.log("📅 Checking monthly token status...");
        try {
          const hasToken = await contract.hasConsumerReceivedMonthlyToken(aadhaarBigInt);
          console.log("✅ Has monthly token:", hasToken);
          setHasMonthlyToken(hasToken);
        } catch (monthlyError) {
          console.warn("⚠️ Monthly token check failed:", monthlyError.message);
          setHasMonthlyToken(false);
        }

        console.log("📜 Fetching distribution history...");
        try {
          const history = await contract.getConsumerDistributionHistory(aadhaarBigInt, 6);
          console.log("✅ Distribution history:", history);
          setDistributionHistory(history);
        } catch (historyError) {
          console.warn("⚠️ Distribution history fetch failed:", historyError.message);
          setDistributionHistory(null);
        }

        console.log("💰 Fetching wallet address...");
        let walletAddr = null;
        try {
          walletAddr = await contract.getWalletByAadhaar(aadhaarBigInt);
          console.log("✅ Wallet address:", walletAddr);
          setWallet(walletAddr);
        } catch (walletError) {
          console.warn("⚠️ Wallet fetch failed:", walletError.message);
          setWallet(null);
        }

        console.log("📈 Fetching system stats...");
        try {
          // Try different function names that might exist in the ABI
          let stats = null;
          try {
            stats = await contract.getDashboardData();
            console.log("✅ System stats (getDashboardData):", stats);
          } catch (dashboardDataError) {
            try {
              stats = await contract.getSystemStatus();
              console.log("✅ System stats (getSystemStatus):", stats);
            } catch (systemStatusError) {
              console.warn("⚠️ Both getDashboardData and getSystemStatus failed");
              stats = null;
            }
          }
          
          if (stats) {
            setSystemStats(stats);
          }
        } catch (statsError) {
          console.warn("⚠️ System stats fetch failed:", statsError.message);
        }

        console.log("🌾 Fetching ration amounts...");
        try {
          const rationAmts = await contract.getRationAmounts();
          console.log("✅ Ration amounts:", rationAmts);
          setRationAmounts(rationAmts);
        } catch (rationError) {
          console.warn("⚠️ Ration amounts fetch failed:", rationError.message);
        }

        // ========== MISSING FUNCTIONS - ADDING NOW ==========

        // Current system state functions
        console.log("📅 Fetching current system state...");
        try {
          const currentMonth = await contract.getCurrentMonth();
          const currentYear = await contract.getCurrentYear();
          const systemStatus = await contract.getSystemStatus();
          console.log("✅ Current Month:", currentMonth.toString());
          console.log("✅ Current Year:", currentYear.toString());
          console.log("✅ System Status:", systemStatus);
          
          // Set these to state
          setCurrentMonth(currentMonth);
          setCurrentYear(currentYear);
          setSystemStatus(systemStatus);
        } catch (systemStateError) {
          console.warn("⚠️ System state fetch failed:", systemStateError.message);
        }

        // Token status checking for unclaimed tokens
        if (unclaimedTokens.length > 0) {
          console.log("🔍 Checking token statuses for unclaimed tokens...");
          try {
            const tokenStatuses = await Promise.all(
              unclaimedTokens.slice(0, 5).map(async (tokenId) => { // Limit to first 5 for performance
                try {
                  // Note: These functions are on the DCVToken contract, not the main contract
                  const dcvTokenContract = new ethers.Contract(DCVTOKEN_ADDRESS, DCVTokenABI, provider);
                  
                  const exists = await dcvTokenContract.tokenExists(tokenId);
                  const claimed = await dcvTokenContract.isTokenClaimed(tokenId);
                  const expired = await dcvTokenContract.isTokenExpired(tokenId);
                  const tokenData = await dcvTokenContract.getTokenData(tokenId);
                  
                  return { tokenId, exists, claimed, expired, tokenData };
                } catch (tokenError) {
                  console.warn(`⚠️ Token ${tokenId} status check failed:`, tokenError.message);
                  return { tokenId, exists: false, claimed: false, expired: false, tokenData: null };
                }
              })
            );
            console.log("✅ Token statuses:", tokenStatuses);
            setTokenStatuses(tokenStatuses);
          } catch (tokenError) {
            console.warn("⚠️ Token status batch check failed:", tokenError.message);
          }
        }

        // Payment/subsidy information
        console.log("💰 Fetching payment history and calculations...");
        try {
          const paymentHistory = await contract.getConsumerPaymentHistory(aadhaarBigInt);
          console.log("✅ Payment history:", paymentHistory);
          setPaymentHistory(paymentHistory);

          // If there are unclaimed tokens, calculate payment amounts
          if (unclaimedTokens.length > 0) {
            const paymentCalculations = await Promise.all(
              unclaimedTokens.slice(0, 3).map(async (tokenId) => { // Limit to first 3
                try {
                  const calculation = await contract.calculatePaymentAmount(aadhaarBigInt, tokenId);
                  return { tokenId, ...calculation };
                } catch (calcError) {
                  console.warn(`⚠️ Payment calculation for token ${tokenId} failed:`, calcError.message);
                  return { tokenId, totalAmount: 0, subsidyAmount: 0, payableAmount: 0 };
                }
              })
            );
            console.log("✅ Payment calculations:", paymentCalculations);
            setPaymentCalculations(paymentCalculations);
          }
        } catch (paymentError) {
          console.warn("⚠️ Payment info fetch failed:", paymentError.message);
        }

        // Check delivery status
        console.log("🚚 Checking delivery status...");
        try {
          const pendingDeliveries = await contract.hasConsumerPendingDeliveries(aadhaarBigInt);
          console.log("✅ Pending deliveries count:", pendingDeliveries.toString());
          setPendingDeliveries(pendingDeliveries);
        } catch (deliveryError) {
          console.warn("⚠️ Delivery status check failed:", deliveryError.message);
        }

        // Get all tokens for reference (optional - might be a lot of data)
        try {
          const allTokens = await contract.getAllTokens();
          console.log("📋 Total tokens in system:", allTokens.length);
          // Don't set to state as it might be too much data
        } catch (allTokensError) {
          console.warn("⚠️ All tokens fetch failed (this is optional):", allTokensError.message);
        }

        // --- DCV Token Section ---
        if (walletAddr && walletAddr !== ethers.ZeroAddress && DCVTOKEN_ADDRESS) {
          console.log("🪙 Fetching DCV tokens...");
          try {
            const dcvToken = new ethers.Contract(DCVTOKEN_ADDRESS, DCVTokenABI, provider);
            // For demo, check token IDs 1 to 10
            const tokenIds = Array.from({ length: 10 }, (_, i) => i + 1);
            const balances = await Promise.all(
              tokenIds.map(tokenId => dcvToken.balanceOf(walletAddr, tokenId))
            );
            const ownedTokens = tokenIds
              .map((tokenId, idx) => ({ tokenId, balance: balances[idx] }))
              .filter(t => t.balance > 0);
            console.log("✅ DCV tokens:", ownedTokens);
            setDcvTokens(ownedTokens);
          } catch (dcvError) {
            console.warn("⚠️ DCV token fetch failed:", dcvError.message);
            setDcvTokens([]);
          }
        } else {
          console.log("⏭️ Skipping DCV tokens (no wallet or token address)");
          setDcvTokens([]);
        }
        // --- End DCV Token Section ---

        console.log("✅ All data fetched successfully!");

      } catch (err) {
        console.error("❌ Error fetching data:", err);
        setError("Failed to fetch data from blockchain: " + (err.reason || err.message || err.toString()));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [aadhaar]);

  const handleReportFraud = async () => {
    setFraudStatus(null);
    setFraudLoading(true);
    try {
      const res = await fetch("https://grainllyvoiceagent.onrender.com/api/report-fraud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ aadhaar: aadhaar }) // <-- fixed key spelling
      });
      if (res.ok) {
        setFraudStatus("Fraud report submitted successfully.");
      } else {
        setFraudStatus("Failed to submit fraud report.");
      }
    } catch (e) {
      setFraudStatus("Failed to submit fraud report.");
    }
    setFraudLoading(false);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-green-900 mb-4">Loading dashboard...</div>
        <div className="text-sm text-gray-600">Fetching data from blockchain for Aadhaar: {aadhaar}</div>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center">
        <div className="text-lg font-semibold text-red-600 mb-4">Error Loading Dashboard</div>
        <div className="text-sm text-gray-600 mb-4">{error}</div>
        <div className="text-xs text-gray-500">
          <p>Aadhaar searched: {aadhaar}</p>
          {error.includes("log in") && (
            <div className="mt-4">
              <a 
                href="/login" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium inline-block"
              >
                Go to Login Page
              </a>
            </div>
          )}
          {error.includes("Consumer not found") && (
            <p>Try using Aadhaar: 123456780012 (test consumer in the system)</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Welcome Message */}
      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-sm text-green-800">
          {(() => {
            try {
              const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
              if (currentUser.data && currentUser.data.name) {
                return `Welcome back, ${currentUser.data.name}! 👋`;
              }
            } catch (error) {
              console.warn("Could not parse user data for welcome message");
            }
            return "Welcome to your Dashboard! 👋";
          })()}
        </div>
      </div>

      <h1 className="text-3xl font-bold text-green-900 mb-6 flex items-center gap-2">
        <User className="h-7 w-7 text-green-700" /> Consumer Dashboard
      </h1>

      {/* Report Fraud Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleReportFraud}
          disabled={fraudLoading}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow transition"
        >
          <ShieldAlert className="h-5 w-5" />
          {fraudLoading ? "Reporting..." : "Report Fraud"}
        </button>
      </div>
      {fraudStatus && (
        <div className={`mb-4 text-center font-semibold ${fraudStatus.includes("success") ? "text-green-700" : "text-red-600"}`}>
          {fraudStatus}
        </div>
      )}

      {/* Unclaimed Ration Token IDs */}
      {unclaimedTokens && unclaimedTokens.length > 0 && (
        <div className="mb-8">
          <div className="rounded-xl shadow border-2 border-green-400 bg-green-50 p-6 flex flex-col items-center">
            <div className="text-3xl font-bold text-green-900 mb-2">
              Your Unclaimed Ration Token IDs
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {unclaimedTokens.map((tokenId, i) => (
                <span key={i} className="text-2xl font-mono text-green-700 bg-white border border-green-200 rounded px-3 py-1">
                  #{tokenId.toString()}
                </span>
              ))}
            </div>
            <div className="text-green-800">
              Show any of these token numbers at your shop to collect your ration.
            </div>
          </div>
        </div>
      )}

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className={cardClass + " border-blue-100"}>
          <div className="flex items-center gap-2">
            <CreditCard className={statIcon + " bg-blue-50 rounded-full p-1"} />
            <span className={statLabel}>Unclaimed Tokens</span>
          </div>
          <span className={statValue}>{unclaimedTokens.length}</span>
        </div>
        <div className={cardClass + " border-green-100"}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={statIcon + " bg-green-50 rounded-full p-1"} />
            <span className={statLabel}>Current Month Token</span>
          </div>
          <span className={statValue}>{hasMonthlyToken ? "Yes" : "No"}</span>
        </div>
        <div className={cardClass + " border-yellow-100"}>
          <div className="flex items-center gap-2">
            <Package className={statIcon + " bg-yellow-50 rounded-full p-1"} />
            <span className={statLabel}>Active Tokens</span>
          </div>
          <span className={statValue}>{dashboard?.activeTokensCount?.toString() || 0}</span>
        </div>
        <div className={cardClass + " border-purple-100"}>
          <div className="flex items-center gap-2">
            <BarChart2 className={statIcon + " bg-purple-50 rounded-full p-1"} />
            <span className={statLabel}>Total Tokens</span>
          </div>
          <span className={statValue}>{dashboard?.totalTokensReceived?.toString() || 0}</span>
        </div>
      </div>

      {/* Profile & Shopkeeper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {/* Profile */}
        {profile && (
          <div className={cardClass + " border-green-200"}>
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-green-700" /> Profile
            </h2>
            <div className="text-sm">
              <div><span className="font-medium">Name:</span> {profile.name}</div>
              <div><span className="font-medium">Aadhaar:</span> {profile.aadhaar?.toString()}</div>
              <div><span className="font-medium">Mobile:</span> {profile.mobile}</div>
              <div><span className="font-medium">Category:</span> {profile.category}</div>
              <div><span className="font-medium">Registered:</span> {profile.registrationTime ? new Date(Number(profile.registrationTime) * 1000).toLocaleString() : "N/A"}</div>
              <div><span className="font-medium">Status:</span> <span className={profile.isActive ? "text-green-700" : "text-red-600"}>{profile.isActive ? "Active" : "Inactive"}</span></div>
            </div>
          </div>
        )}
        {/* Shopkeeper */}
        {shopkeeper && (
          <div className={cardClass + " border-blue-200"}>
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-700" /> Assigned Shopkeeper
            </h2>
            <div className="text-sm">
              <div><span className="font-medium">Name:</span> {shopkeeper.name}</div>
              <div><span className="font-medium">Area:</span> {shopkeeper.area}</div>
              <div><span className="font-medium">Address:</span> {shopkeeper.shopkeeperAddress || shopkeeper.address}</div>
              <div><span className="font-medium">Status:</span> <span className={shopkeeper.isActive ? "text-green-700" : "text-red-600"}>{shopkeeper.isActive ? "Active" : "Inactive"}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Info */}
      {dashboard && (
        <div className={cardClass + " border-green-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-green-700" /> Dashboard Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Total Tokens Received:</span> {dashboard.totalTokensReceived?.toString()}</div>
            <div><span className="font-medium">Total Tokens Claimed:</span> {dashboard.totalTokensClaimed?.toString()}</div>
            <div><span className="font-medium">Active Tokens:</span> {dashboard.activeTokensCount?.toString()}</div>
            <div><span className="font-medium">Current Month Token:</span> {dashboard.hasCurrentMonthToken ? "Yes" : "No"}</div>
            <div><span className="font-medium">Monthly Ration Amount:</span> {dashboard.monthlyRationAmount?.toString()}</div>
            <div><span className="font-medium">Last Token Issued:</span> {dashboard.lastTokenIssuedTime ? new Date(Number(dashboard.lastTokenIssuedTime) * 1000).toLocaleString() : "N/A"}</div>
          </div>
        </div>
      )}

      {/* System Status Information */}
      {(currentMonth !== null || currentYear !== null || systemStatus !== null) && (
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {currentMonth !== null && (
                <div>
                  <span className="font-medium text-blue-800">Current Month:</span>
                  <span className="ml-2 text-blue-900">{currentMonth.toString()}</span>
                </div>
              )}
              {currentYear !== null && (
                <div>
                  <span className="font-medium text-blue-800">Current Year:</span>
                  <span className="ml-2 text-blue-900">{currentYear.toString()}</span>
                </div>
              )}
              {systemStatus !== null && (
                <div>
                  <span className="font-medium text-blue-800">System Status:</span>
                  <span className="ml-2 text-blue-900">{systemStatus.toString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pending Deliveries Alert */}
      {pendingDeliveries > 0 && (
        <div className="mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              <span className="font-semibold text-orange-900">
                You have {pendingDeliveries.toString()} pending delivery(ies)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unclaimed Tokens */}
      <div className={cardClass + " border-yellow-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-yellow-700" /> Unclaimed Tokens
        </h2>
        {unclaimedTokens && unclaimedTokens.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {unclaimedTokens.map((tokenId, i) => (
              <li key={i} className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1 text-yellow-800 font-mono">
                Token #{tokenId.toString()}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No unclaimed tokens.</div>
        )}
      </div>

      {/* Monthly Token Status */}
      <div className={cardClass + " border-green-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-700" /> Monthly Token Status
        </h2>
        <div className={hasMonthlyToken ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
          {hasMonthlyToken ? "You have received your token for this month." : "You have not received your token for this month."}
        </div>
      </div>

      {/* Distribution History */}
      <div className={cardClass + " border-blue-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-700" /> Distribution History (last 6 months)
        </h2>
        {distributionHistory && distributionHistory[0]?.length > 0 ? (
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-green-50">
                <th className="p-2">Month</th>
                <th className="p-2">Year</th>
                <th className="p-2">Token Received</th>
                <th className="p-2">Token Claimed</th>
              </tr>
            </thead>
            <tbody>
              {distributionHistory[0].map((month, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2">{month}</td>
                  <td className="p-2">{distributionHistory[1][idx]}</td>
                  <td className="p-2">{distributionHistory[2][idx] ? <CheckCircle2 className="inline h-4 w-4 text-green-600" /> : <AlertCircle className="inline h-4 w-4 text-red-600" />}</td>
                  <td className="p-2">{distributionHistory[3][idx] ? <CheckCircle2 className="inline h-4 w-4 text-green-600" /> : <AlertCircle className="inline h-4 w-4 text-red-600" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-gray-500">No distribution history found.</div>
        )}
      </div>

      {/* Wallet Info */}
      <div className={cardClass + " border-purple-200 mb-8"}>
        <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-700" /> Linked Wallet
        </h2>
        <div className="font-mono text-sm break-all">
          {wallet && wallet !== ethers.ZeroAddress ? wallet : "No wallet linked"}
        </div>
      </div>

      {/* System Stats */}
      {systemStats && (
        <div className={cardClass + " border-green-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-700" /> System Stats
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">Total Consumers:</span> {systemStats.totalConsumers?.toString()}</div>
            <div><span className="font-medium">Total Shopkeepers:</span> {systemStats.totalShopkeepers?.toString()}</div>
            <div><span className="font-medium">Total Delivery Agents:</span> {systemStats.totalDeliveryAgents?.toString()}</div>
            <div><span className="font-medium">Total Tokens Issued:</span> {systemStats.totalTokensIssued?.toString()}</div>
          </div>
        </div>
      )}

      {/* Ration Amounts */}
      {rationAmounts && (
        <div className={cardClass + " border-yellow-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <Package className="h-5 w-5 text-yellow-700" /> Ration Amounts Per Category
          </h2>
          <div className="flex flex-wrap gap-3">
            {rationAmounts.categories?.map((cat, idx) => (
              <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded px-3 py-1 text-yellow-800 font-mono">
                {cat}: {rationAmounts.amounts[idx]?.toString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DCV Tokens */}
      {dcvTokens.length > 0 && (
        <div className={cardClass + " border-indigo-300 mb-8"}>
          <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-indigo-700" /> DCV Tokens Owned
          </h2>
          <div className="flex flex-wrap gap-3">
            {dcvTokens.map(({ tokenId, balance }) => (
              <div key={tokenId} className="bg-indigo-50 border border-indigo-200 rounded px-3 py-1 text-indigo-800 font-mono">
                Token #{tokenId}: {balance.toString()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}