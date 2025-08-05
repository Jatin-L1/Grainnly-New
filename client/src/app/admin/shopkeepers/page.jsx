'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import AdminLayout from '@/components/AdminLayout';
import DiamondMergedABI from "../../../../abis/DiamondMergedABI.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Building, Filter, Plus, RefreshCw, MapPin, Users, Package,
  CheckCircle2, AlertCircle, DollarSign, Truck, Clock, Activity,
  Eye, Settings, CreditCard, FileText, BarChart3
} from "lucide-react";

// Use the correct Diamond Proxy address
const DIAMOND_PROXY_ADDRESS = "0x3329CA690f619bae73b9f36eb43839892D20045f";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

export default function ShopkeeperManagement() {
  const router = useRouter();
  
  // Core states
  const [shopkeepers, setShopkeepers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Detailed view states
  const [selectedShopkeeper, setSelectedShopkeeper] = useState(null);
  const [shopkeeperDetails, setShopkeeperDetails] = useState(null);
  const [shopkeeperTokens, setShopkeeperTokens] = useState([]);
  const [shopkeeperPayments, setShopkeeperPayments] = useState([]);
  const [shopkeeperMetrics, setShopkeeperMetrics] = useState(null);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [assignedAgent, setAssignedAgent] = useState(null);
  
  // Action states
  const [processingAction, setProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllShopkeepers();
  }, []);

  // Fetch all shopkeepers using API
  const fetchAllShopkeepers = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      console.log("🏪 Fetching all shopkeepers via API...");
      
      const response = await fetch('/api/admin?endpoint=get-shopkeepers');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch shopkeepers');
      }
      
      if (data.success && data.data) {
        setShopkeepers(data.data);
        console.log("✅ Successfully loaded", data.data.length, "shopkeepers");
        console.log("📊 Data source:", data.dataSource);
        
        if (data.dataSource === 'blockchain') {
          setSuccess(`🎉 Successfully loaded ${data.data.length} shopkeepers from blockchain!`);
        } else if (data.dataSource === 'database') {
          setSuccess(`📦 Loaded ${data.data.length} shopkeepers from database (blockchain unavailable)`);
        } else {
          setSuccess(`✅ Loaded ${data.data.length} shopkeepers`);
        }
      } else {
        setShopkeepers([]);
        console.log("⚠️ No shopkeepers found");
        setError("No shopkeepers found. Register some shopkeepers first.");
      }
      
    } catch (error) {
      console.error("❌ Error fetching shopkeepers:", error);
      setError(`Failed to fetch shopkeepers: ${error.message}`);
      setShopkeepers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch detailed shopkeeper information using API
  const fetchShopkeeperDetails = async (shopkeeperAddress) => {
    try {
      setProcessingAction(true);
      setError('');
      
      console.log("🔍 Fetching details for shopkeeper:", shopkeeperAddress);
      
      // For now, use basic info from the shopkeepers list
      const shopkeeper = shopkeepers.find(s => s.shopkeeperAddress === shopkeeperAddress);
      if (shopkeeper) {
        setShopkeeperDetails(shopkeeper);
        setShopkeeperTokens([]);
        setShopkeeperPayments([]);
        setShopkeeperMetrics(null);
        setPendingDeliveries([]);
        setAssignedAgent(null);
      }
      
    } catch (error) {
      console.error('❌ Error fetching shopkeeper details:', error);
      setError('Failed to fetch shopkeeper details: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter shopkeepers based on search and filters
  const filteredShopkeepers = shopkeepers.filter(shopkeeper => {
    const matchesSearch = shopkeeper.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shopkeeper.shopkeeperAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shopkeeper.area?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = filterArea === 'all' || shopkeeper.area === filterArea;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && shopkeeper.isActive) ||
                         (filterStatus === 'inactive' && !shopkeeper.isActive);
    
    return matchesSearch && matchesArea && matchesStatus;
  });

  // Get unique areas for filter dropdown
  const uniqueAreas = [...new Set(shopkeepers.map(s => s.area).filter(Boolean))];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading shopkeepers...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Shopkeeper Management</h1>
            <p className="text-gray-600 mt-1">
              Manage and monitor registered shopkeepers
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={fetchAllShopkeepers}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Shopkeeper
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Shopkeepers</p>
                  <p className="text-2xl font-bold">{shopkeepers.length}</p>
                </div>
                <Building className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Shopkeepers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {shopkeepers.filter(s => s.isActive).length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Areas Covered</p>
                  <p className="text-2xl font-bold">{uniqueAreas.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Consumers</p>
                  <p className="text-2xl font-bold">
                    {shopkeepers.reduce((sum, s) => sum + (s.totalConsumersAssigned || 0), 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search shopkeepers by name, address, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Areas</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700">{success}</span>
            </div>
          </div>
        )}

        {/* Shopkeepers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Shopkeepers ({filteredShopkeepers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredShopkeepers.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No shopkeepers found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredShopkeepers.map((shopkeeper) => (
                  <div key={shopkeeper.shopkeeperAddress} 
                       className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold text-lg">{shopkeeper.name}</h3>
                            <p className="text-sm text-gray-600">
                              {shopkeeper.shopkeeperAddress}
                            </p>
                          </div>
                          <Badge variant={shopkeeper.isActive ? "default" : "secondary"}>
                            {shopkeeper.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{shopkeeper.area || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{shopkeeper.totalConsumersAssigned || 0} consumers</span>
                          </div>
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{shopkeeper.currentMonthTokensIssued || 0} tokens</span>
                          </div>
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 mr-1 text-gray-400" />
                            <span>{shopkeeper.currentMonthDeliveries || 0} deliveries</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedShopkeeper(shopkeeper);
                            fetchShopkeeperDetails(shopkeeper.shopkeeperAddress);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopkeeper Details Modal/Panel */}
        {selectedShopkeeper && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  {selectedShopkeeper.name} - Details
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedShopkeeper(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Name:</strong> {selectedShopkeeper.name}</div>
                        <div><strong>Address:</strong> {selectedShopkeeper.shopkeeperAddress}</div>
                        <div><strong>Area:</strong> {selectedShopkeeper.area}</div>
                        <div><strong>Status:</strong> 
                          <Badge className="ml-2" variant={selectedShopkeeper.isActive ? "default" : "secondary"}>
                            {selectedShopkeeper.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Performance Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Consumers Assigned:</strong> {selectedShopkeeper.totalConsumersAssigned || 0}</div>
                        <div><strong>Current Month Tokens:</strong> {selectedShopkeeper.currentMonthTokensIssued || 0}</div>
                        <div><strong>Current Month Deliveries:</strong> {selectedShopkeeper.currentMonthDeliveries || 0}</div>
                        <div><strong>Total Earnings:</strong> {selectedShopkeeper.totalEarnings || '0'} ETH</div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="tokens" className="mt-4">
                  <div className="text-center py-8 text-gray-500">
                    Token information will be displayed here
                  </div>
                </TabsContent>
                
                <TabsContent value="payments" className="mt-4">
                  <div className="text-center py-8 text-gray-500">
                    Payment history will be displayed here
                  </div>
                </TabsContent>
                
                <TabsContent value="metrics" className="mt-4">
                  <div className="text-center py-8 text-gray-500">
                    Performance metrics will be displayed here
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
