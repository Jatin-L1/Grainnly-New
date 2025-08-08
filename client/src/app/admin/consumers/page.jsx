"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  UserCheck, 
  UserX, 
  Package, 
  CreditCard,
  Truck,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  Activity
} from "lucide-react";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// ABI helper function
function getMergedABI() {
  const mergedABI = [];
  if (DiamondMergedABI.contracts && typeof DiamondMergedABI.contracts === 'object') {
    Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
      const contractData = DiamondMergedABI.contracts[contractName];
      if (contractData && contractData.abi && Array.isArray(contractData.abi)) {
        mergedABI.push(...contractData.abi);
      }
    });
  }
  return mergedABI;
}

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

export default function AdminConsumersPage() {
  // Core states
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('name'); // name, aadhaar, mobile
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shopkeeperFilter, setShopkeeperFilter] = useState('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalConsumers, setTotalConsumers] = useState(0);

  // Detail view states
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [consumerDetails, setConsumerDetails] = useState(null);
  const [consumerTokens, setConsumerTokens] = useState([]);
  const [consumerPayments, setConsumerPayments] = useState([]);
  const [consumerDistribution, setConsumerDistribution] = useState([]);

  // Stats states
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    withTokens: 0,
    needingHelp: 0,
    byCategory: {}
  });

  // Contract instance
  const [contract, setContract] = useState(null);

  // Available categories and shopkeepers
  const [categories, setCategories] = useState(['BPL', 'APL', 'AAY', 'PHH']);
  const [shopkeepers, setShopkeepers] = useState([]);

  useEffect(() => {
    initializeContract();
  }, []);

  useEffect(() => {
    if (contract) {
      fetchConsumers();
      fetchStats();
      fetchShopkeepers();
    }
  }, [contract, currentPage, categoryFilter, statusFilter, shopkeeperFilter]);

  // Initialize blockchain contract
  const initializeContract = async () => {
    try {
      console.log("🔗 Initializing contract connection...");
      
      if (!CONTRACT_ADDRESS || !RPC_URL) {
        throw new Error('Contract configuration missing');
      }

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const mergedABI = getMergedABI();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, mergedABI, provider);
      
      setContract(contractInstance);
      console.log("✅ Contract initialized successfully");
    } catch (err) {
      console.error("❌ Contract initialization failed:", err);
      setError(`Failed to initialize contract: ${err.message}`);
    }
  };

  // Fetch consumers from blockchain
  const fetchConsumers = async () => {
    if (!contract) return;

    try {
      setRefreshing(true);
      setError('');
      
      console.log("📊 Fetching consumers from blockchain...");

      let consumerList = [];

      // Try different methods to get consumers
      try {
        // Method 1: Get paginated consumers
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedResult = await contract.getConsumersPaginated(startIndex, itemsPerPage);
        consumerList = paginatedResult[0] || [];
        setTotalConsumers(Number(paginatedResult[1] || 0));
        console.log("✅ Got paginated consumers:", consumerList.length);
      } catch (paginationError) {
        console.log("⚠️ Pagination failed, trying alternative method:", paginationError.message);
        
        // Method 2: Get consumers by category if filter is set
        if (categoryFilter !== 'all') {
          try {
            consumerList = await contract.getConsumersByCategory(categoryFilter);
            console.log(`✅ Got consumers by category ${categoryFilter}:`, consumerList.length);
          } catch (categoryError) {
            console.log("⚠️ Category fetch failed:", categoryError.message);
          }
        }

        // Method 3: Get consumers by shopkeeper if filter is set
        if (shopkeeperFilter !== 'all' && shopkeeperFilter !== '') {
          try {
            consumerList = await contract.getConsumersByShopkeeper(shopkeeperFilter);
            console.log("✅ Got consumers by shopkeeper:", consumerList.length);
          } catch (shopkeeperError) {
            console.log("⚠️ Shopkeeper fetch failed:", shopkeeperError.message);
          }
        }
      }

      // Process and format consumer data
      const formattedConsumers = await Promise.all(
        consumerList.map(async (consumer, index) => {
          try {
            const aadhaar = BigInt(consumer.aadhaar || consumer[0] || index);
            
            // Get additional consumer details
            let consumerDetail = null;
            try {
              consumerDetail = await contract.getConsumerByAadhaar(aadhaar);
            } catch (detailError) {
              console.log(`⚠️ Could not get details for consumer ${aadhaar}:`, detailError.message);
            }

            // Check if consumer has monthly token
            let hasMonthlyToken = false;
            try {
              hasMonthlyToken = await contract.hasConsumerReceivedMonthlyToken(aadhaar);
            } catch (tokenError) {
              console.log(`⚠️ Could not check token status for ${aadhaar}:`, tokenError.message);
            }

            return {
              id: aadhaar.toString(),
              aadhaar: aadhaar.toString(),
              name: consumer.name || consumerDetail?.name || `Consumer ${aadhaar.toString().slice(-4)}`,
              mobile: consumer.mobile || consumerDetail?.mobile || 'N/A',
              category: consumer.category || consumerDetail?.category || 'GENERAL',
              assignedShopkeeper: consumer.assignedShopkeeper || consumerDetail?.assignedShopkeeper || ethers.ZeroAddress,
              isActive: consumer.isActive !== undefined ? consumer.isActive : (consumerDetail?.isActive || true),
              registrationTime: consumer.registrationTime || consumerDetail?.registrationTime || 0,
              totalTokensReceived: Number(consumer.totalTokensReceived || consumerDetail?.totalTokensReceived || 0),
              totalTokensClaimed: Number(consumer.totalTokensClaimed || consumerDetail?.totalTokensClaimed || 0),
              lastTokenIssuedTime: consumer.lastTokenIssuedTime || consumerDetail?.lastTokenIssuedTime || 0,
              hasMonthlyToken,
              walletAddress: null, // Will be fetched separately if needed
            };
          } catch (processingError) {
            console.error(`❌ Error processing consumer ${index}:`, processingError);
            return null;
          }
        })
      );

      const validConsumers = formattedConsumers.filter(consumer => consumer !== null);
      setConsumers(validConsumers);
      
      console.log("✅ Successfully loaded", validConsumers.length, "consumers");
      setSuccess(`Loaded ${validConsumers.length} consumers from blockchain`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error("❌ Error fetching consumers:", err);
      setError(`Failed to fetch consumers: ${err.message}`);
      setConsumers([]);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    if (!contract) return;

    try {
      console.log("📈 Fetching consumer statistics...");

      const [totalConsumersCount, categoryStats, consumersNeedingHelp] = await Promise.all([
        contract.getTotalConsumers().catch(() => BigInt(0)),
        contract.getCategoryWiseStats().catch(() => [[], [], []]),
        contract.getConsumersNeedingEmergencyHelp().catch(() => [])
      ]);

      const categoryMap = {};
      if (categoryStats && categoryStats[0] && categoryStats[1]) {
        categoryStats[0].forEach((category, index) => {
          categoryMap[category] = Number(categoryStats[1][index] || 0);
        });
      }

      setStats({
        total: Number(totalConsumersCount),
        active: consumers.filter(c => c.isActive).length,
        inactive: consumers.filter(c => !c.isActive).length,
        withTokens: consumers.filter(c => c.hasMonthlyToken).length,
        needingHelp: consumersNeedingHelp.length,
        byCategory: categoryMap
      });

    } catch (err) {
      console.error("❌ Error fetching stats:", err);
    }
  };

  // Fetch shopkeepers for filter
  const fetchShopkeepers = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-shopkeepers');
      const data = await response.json();
      
      if (data.success && data.data) {
        setShopkeepers(data.data);
      }
    } catch (err) {
      console.error("❌ Error fetching shopkeepers:", err);
    }
  };

  // Search consumers
  const handleSearch = async () => {
    if (!contract || !searchTerm.trim()) {
      fetchConsumers();
      return;
    }

    try {
      setLoading(true);
      setError('');

      let searchResults = [];

      if (searchType === 'name') {
        searchResults = await contract.searchConsumersByName(searchTerm);
      } else if (searchType === 'aadhaar') {
        try {
          const aadhaarBN = BigInt(searchTerm);
          const consumer = await contract.getConsumerByAadhaar(aadhaarBN);
          if (consumer && consumer.aadhaar && consumer.aadhaar !== BigInt(0)) {
            searchResults = [consumer];
          }
        } catch (aadhaarError) {
          setError("Invalid Aadhaar number format");
          return;
        }
      } else if (searchType === 'mobile') {
        const consumer = await contract.getConsumerByMobile(searchTerm);
        if (consumer && consumer.aadhaar && consumer.aadhaar !== BigInt(0)) {
          searchResults = [consumer];
        }
      }

      // Format search results
      const formattedResults = searchResults.map(consumer => ({
        id: consumer.aadhaar.toString(),
        aadhaar: consumer.aadhaar.toString(),
        name: consumer.name || 'N/A',
        mobile: consumer.mobile || 'N/A',
        category: consumer.category || 'GENERAL',
        assignedShopkeeper: consumer.assignedShopkeeper || ethers.ZeroAddress,
        isActive: consumer.isActive || true,
        registrationTime: consumer.registrationTime || 0,
        totalTokensReceived: Number(consumer.totalTokensReceived || 0),
        totalTokensClaimed: Number(consumer.totalTokensClaimed || 0),
        lastTokenIssuedTime: consumer.lastTokenIssuedTime || 0,
      }));

      setConsumers(formattedResults);
      setSuccess(`Found ${formattedResults.length} consumers matching "${searchTerm}"`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error("❌ Search error:", err);
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed consumer information
  const fetchConsumerDetails = async (aadhaar) => {
    if (!contract) return;

    try {
      setSelectedConsumer(aadhaar);
      console.log(`🔍 Fetching detailed info for consumer ${aadhaar}...`);

      const [
        consumerData,
        consumerDashboard,
        tokens,
        payments,
        distributionHistory
      ] = await Promise.all([
        contract.getConsumerByAadhaar(BigInt(aadhaar)).catch(() => null),
        contract.getConsumerDashboard(BigInt(aadhaar)).catch(() => null),
        contract.getTokensByAadhaar(BigInt(aadhaar)).catch(() => []),
        contract.getConsumerPaymentHistory(BigInt(aadhaar)).catch(() => []),
        contract.getConsumerDistributionHistory(BigInt(aadhaar), 6).catch(() => [])
      ]);

      setConsumerDetails(consumerData);
      setConsumerTokens(tokens);
      setConsumerPayments(payments);
      setConsumerDistribution(distributionHistory);

      console.log("✅ Consumer details loaded successfully");
    } catch (err) {
      console.error("❌ Error fetching consumer details:", err);
      setError(`Failed to load consumer details: ${err.message}`);
    }
  };

  // Filter consumers
  const filteredConsumers = consumers.filter(consumer => {
    const matchesCategory = categoryFilter === 'all' || consumer.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && consumer.isActive) ||
      (statusFilter === 'inactive' && !consumer.isActive) ||
      (statusFilter === 'with-tokens' && consumer.hasMonthlyToken) ||
      (statusFilter === 'no-tokens' && !consumer.hasMonthlyToken);
    const matchesShopkeeper = shopkeeperFilter === 'all' || consumer.assignedShopkeeper === shopkeeperFilter;

    return matchesCategory && matchesStatus && matchesShopkeeper;
  });

  // Pagination
  const totalPages = Math.ceil(filteredConsumers.length / itemsPerPage);
  const paginatedConsumers = filteredConsumers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format functions
  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return 'Never';
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const formatAadhaar = (aadhaar) => {
    return `****-****-${aadhaar.slice(-4)}`;
  };

  const getStatusBadge = (consumer) => {
    if (!consumer.isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (consumer.hasMonthlyToken) {
      return <Badge variant="default" className="bg-green-600">Has Token</Badge>;
    }
    return <Badge variant="secondary">Active</Badge>;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'BPL': 'bg-red-100 text-red-800',
      'APL': 'bg-blue-100 text-blue-800',
      'AAY': 'bg-purple-100 text-purple-800',
      'PHH': 'bg-green-100 text-green-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Consumer Management</h1>
          <p className="text-gray-600">
            Manage and monitor all registered consumers in the PDS system
          </p>
        </div>

        {/* Stats Cards */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Consumers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Registered in system
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">With Tokens</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.withTokens}</div>
                <p className="text-xs text-muted-foreground">
                  Have monthly tokens
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Need Help</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.needingHelp}</div>
                <p className="text-xs text-muted-foreground">
                  Emergency cases
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.inactive}</div>
                <p className="text-xs text-muted-foreground">
                  Deactivated accounts
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Consumers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="flex gap-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option key="search-name" value="name">Name</option>
                    <option key="search-aadhaar" value="aadhaar">Aadhaar</option>
                    <option key="search-mobile" value="mobile">Mobile</option>
                  </select>
                  <Input
                    placeholder={`Search by ${searchType}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option key="all-categories" value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={`category-${category}`} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option key="all-status" value="all">All Status</option>
                  <option key="status-active" value="active">Active</option>
                  <option key="status-inactive" value="inactive">Inactive</option>
                  <option key="status-with-tokens" value="with-tokens">With Tokens</option>
                  <option key="status-no-tokens" value="no-tokens">No Tokens</option>
                </select>
              </div>

              {/* Shopkeeper Filter */}
              <div>
                <select
                  value={shopkeeperFilter}
                  onChange={(e) => setShopkeeperFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option key="all-shopkeepers" value="all">All Shopkeepers</option>
                  {shopkeepers.filter(shopkeeper => shopkeeper && shopkeeper.address).map((shopkeeper, index) => (
                    <option key={`shopkeeper-${shopkeeper.address || index}`} value={shopkeeper.address}>
                      {shopkeeper.name || 'Unknown Shopkeeper'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleSearch} size="sm">
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
                <Button 
                  onClick={fetchConsumers} 
                  variant="outline" 
                  size="sm"
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
            {success}
          </div>
        )}

        {/* Consumer List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Consumers ({filteredConsumers.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading consumers...</span>
              </div>
            ) : paginatedConsumers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No consumers found</h3>
                <p className="text-gray-500">No consumers match the current filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedConsumers.map((consumer) => (
                  <motion.div
                    key={consumer.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    variants={itemVariants}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Basic Info */}
                        <div>
                          <h3 className="font-semibold text-lg">{consumer.name}</h3>
                          <p className="text-sm text-gray-600">
                            Aadhaar: {formatAadhaar(consumer.aadhaar)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{consumer.mobile}</span>
                          </div>
                        </div>

                        {/* Category & Status */}
                        <div>
                          <Badge className={getCategoryColor(consumer.category)} variant="secondary">
                            {consumer.category}
                          </Badge>
                          <div className="mt-2">
                            {getStatusBadge(consumer)}
                          </div>
                        </div>

                        {/* Token Info */}
                        <div>
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-blue-500" />
                              <span>Received: {consumer.totalTokensReceived}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span>Claimed: {consumer.totalTokensClaimed}</span>
                            </div>
                          </div>
                        </div>

                        {/* Registration */}
                        <div className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Registered: {formatDate(consumer.registrationTime)}</span>
                          </div>
                          {consumer.lastTokenIssuedTime > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Activity className="h-3 w-3" />
                              <span>Last Token: {formatDate(consumer.lastTokenIssuedTime)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchConsumerDetails(consumer.aadhaar)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredConsumers.length)} of{' '}
                      {filteredConsumers.length} consumers
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <span className="px-3 py-1 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consumer Details Modal/Panel */}
        {selectedConsumer && consumerDetails && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  Consumer Details - {consumerDetails.name}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedConsumer(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="distribution">Distribution</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {consumerDetails.name}</div>
                        <div><strong>Aadhaar:</strong> {formatAadhaar(consumerDetails.aadhaar.toString())}</div>
                        <div><strong>Mobile:</strong> {consumerDetails.mobile}</div>
                        <div><strong>Category:</strong> 
                          <Badge className={getCategoryColor(consumerDetails.category)} variant="secondary">
                            {consumerDetails.category}
                          </Badge>
                        </div>
                        <div><strong>Status:</strong> {consumerDetails.isActive ? 'Active' : 'Inactive'}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">System Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Registration Date:</strong> {formatDate(consumerDetails.registrationTime)}</div>
                        <div><strong>Total Tokens Received:</strong> {Number(consumerDetails.totalTokensReceived)}</div>
                        <div><strong>Total Tokens Claimed:</strong> {Number(consumerDetails.totalTokensClaimed)}</div>
                        <div><strong>Last Token Issued:</strong> {formatDate(consumerDetails.lastTokenIssuedTime)}</div>
                        <div><strong>Assigned Shopkeeper:</strong> 
                          <code className="text-xs">{consumerDetails.assignedShopkeeper}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tokens" className="space-y-4">
                  <h4 className="font-semibold">Token History</h4>
                  {consumerTokens.length === 0 ? (
                    <p className="text-gray-500">No tokens found for this consumer.</p>
                  ) : (
                    <div className="space-y-2">
                      {consumerTokens.map((token, index) => (
                        <div key={index} className="border rounded p-3 text-sm">
                          <div><strong>Token ID:</strong> {token.tokenId?.toString() || index}</div>
                          <div><strong>Status:</strong> {token.isClaimed ? 'Claimed' : 'Pending'}</div>
                          <div><strong>Issue Date:</strong> {formatDate(token.issueTime)}</div>
                          {token.claimTime > 0 && (
                            <div><strong>Claim Date:</strong> {formatDate(token.claimTime)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                  <h4 className="font-semibold">Payment History</h4>
                  {consumerPayments.length === 0 ? (
                    <p className="text-gray-500">No payment records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {consumerPayments.map((payment, index) => (
                        <div key={index} className="border rounded p-3 text-sm">
                          <div><strong>Amount:</strong> ₹{ethers.formatEther(payment.amount)}</div>
                          <div><strong>Date:</strong> {formatDate(payment.timestamp)}</div>
                          <div><strong>Transaction:</strong> <code className="text-xs">{payment.txHash}</code></div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="distribution" className="space-y-4">
                  <h4 className="font-semibold">Distribution History (Last 6 Months)</h4>
                  {consumerDistribution.length === 0 ? (
                    <p className="text-gray-500">No distribution records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {consumerDistribution.map((distribution, index) => (
                        <div key={index} className="border rounded p-3 text-sm">
                          <div><strong>Month:</strong> {distribution.month}/{distribution.year}</div>
                          <div><strong>Amount:</strong> {distribution.amount} kg</div>
                          <div><strong>Date:</strong> {formatDate(distribution.distributionTime)}</div>
                          <div><strong>Shopkeeper:</strong> <code className="text-xs">{distribution.shopkeeper}</code></div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
