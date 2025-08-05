'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";
import ERC1155ABI from "../../../abis/ERC1155.json";
import { User, CreditCard, CheckCircle2, AlertCircle, Package, Users, Store, Wallet, Calendar, BarChart2, ShieldAlert } from "lucide-react";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DCVTOKEN_ADDRESS = process.env.NEXT_PUBLIC_DCVTOKEN_ADDRESS;

const cardClass = "rounded-xl shadow border border-green-100 bg-white p-5 flex flex-col gap-2";
const statLabel = "text-xs text-gray-500 font-medium";
const statValue = "text-2xl font-bold text-green-900";
const statIcon = "h-6 w-6 text-green-600";

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

  useEffect(() => {
    if (!aadhaar) {
      setError("Aadhaar not provided.");
      setLoading(false);
      return;
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
        const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
        const aadhaarBigInt = BigInt(aadhaar);

        // Start with the most basic function to test connection
        console.log("🧪 Testing basic contract connection...");
        const totalConsumers = await contract.getTotalConsumers();
        console.log("✅ Contract connection successful, total consumers:", totalConsumers.toString());

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
          const stats = await contract.getDashboardData();
          console.log("✅ System stats:", stats);
          setSystemStats(stats);
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

        // --- DCV Token Section ---
        if (walletAddr && walletAddr !== ethers.ZeroAddress && DCVTOKEN_ADDRESS) {
          console.log("🪙 Fetching DCV tokens...");
          try {
            const dcvToken = new ethers.Contract(DCVTOKEN_ADDRESS, ERC1155ABI, provider);
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
          <p>Try using Aadhaar: 123456780012 (test consumer in the system)</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
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