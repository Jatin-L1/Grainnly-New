'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import TransactionMonitor from '@/components/TransactionMonitor';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Download, RefreshCw, Package, Zap, ExternalLink } from "lucide-react";

export default function ConsumerManagement() {
  const [consumers, setConsumers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState({});

  // Transaction monitoring
  const addTransactionToMonitor = (txData) => {
    const event = new CustomEvent('addTransaction', { detail: txData });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    fetchConsumers();
  }, [currentPage, filterCategory]);

  // Debounced search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm) {
        searchConsumers();
      } else {
        fetchConsumers();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const fetchConsumers = async () => {
    try {
      setRefreshing(true);
      setError(''); // Clear previous errors
      
      // Calculate offset from current page (page is 1-indexed, offset is 0-indexed)
      const offset = (currentPage - 1) * 20;
      
      let url = `/api/admin?endpoint=get-consumers&offset=${offset}&limit=20`;
      if (filterCategory !== 'all') {
        url += `&category=${filterCategory}`;
      }

      console.log('Fetching consumers from:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Consumers API response:', data);
      
      if (data.success) {
        setConsumers(data.data || []);
        
        if (data.pagination) {
          setPagination(data.pagination);
          setTotalPages(data.pagination.totalPages);
        }
        
        // Show different messages based on the response
        if (data.warning) {
          setError(`⚠️ ${data.warning}`);
        } else if (data.errorDetails) {
          setError(`❌ ${data.errorDetails.message}. ${data.errorDetails.suggestion}`);
        } else if (data.data.length === 0 && data.total === 0) {
          setError('ℹ️ No consumers registered yet. Try registering a consumer first through the signup page.');
        } else if (data.data.length === 0) {
          setError('ℹ️ No consumers found for the current filter/page');
        } else {
          // Clear any previous errors if data loads successfully
          setError('');
          setSuccess(`✅ Loaded ${data.data.length} consumers from blockchain (Total: ${data.total})`);
        }
      } else {
        setError('❌ Failed to load consumers: ' + data.error);
        setConsumers([]);
      }
    } catch (error) {
      console.error('Error fetching consumers:', error);
      setError('❌ Failed to connect to backend API: ' + error.message);
      setConsumers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const searchConsumers = async () => {
    try {
      setRefreshing(true);
      
      const url = `/api/admin?endpoint=get-consumers&search=${encodeURIComponent(searchTerm)}`;
      console.log('Searching consumers:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Consumer search response:', data);
      
      if (data.success) {
        setConsumers(data.data || []);
        
        if (data.warning) {
          setError(`⚠️ ${data.warning}`);
        } else if (data.data.length === 0) {
          setError('ℹ️ No consumers found matching your search');
        } else {
          setError('');
          setSuccess(`✅ Found ${data.data.length} consumers matching "${searchTerm}"`);
        }
      } else {
        setError('❌ Search failed: ' + data.error);
        setConsumers([]);
      }
    } catch (error) {
      console.error('Error searching consumers:', error);
      setError('❌ Search failed - connection issue');
      setConsumers([]);
    } finally {
      setRefreshing(false);
    }
  };

  const generateTokenForConsumer = async (aadhaar, name) => {
    try {
      setRefreshing(true);
      
      console.log(`Generating token for ${name} (${aadhaar})`);
      const response = await fetch('/api/admin?endpoint=generate-individual-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aadhaar }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Add transaction to monitor
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Individual Token Generation',
          details: `Token for ${name} (${aadhaar})`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Token generation started for ${name}! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        // Refresh data after a delay to show updated counts
        setTimeout(() => fetchConsumers(), 30000); // 30 seconds
      } else {
        setError(`❌ Failed to generate token for ${name}: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setError(`❌ Failed to generate token for ${name}: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const generateCategoryTokens = async (category) => {
    try {
      setRefreshing(true);
      
      const categoryName = category === 0 ? 'BPL' : 'APL';
      console.log(`Generating tokens for ${categoryName} consumers`);
      
      const response = await fetch('/api/admin?endpoint=generate-category-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: categoryName }), // Send as string
      });

      const data = await response.json();
      
      if (data.success) {
        // Add transaction to monitor
        addTransactionToMonitor({
          hash: data.txHash,
          type: `${categoryName} Token Generation`,
          details: `Tokens for all ${categoryName} consumers`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ ${categoryName} token generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => fetchConsumers(), 30000);
      } else {
        setError(`❌ Failed to generate ${categoryName} tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating category tokens:', error);
      setError(`❌ Failed to generate category tokens: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const generateMonthlyTokensForAll = async () => {
    try {
      setRefreshing(true);
      
      console.log('Generating monthly tokens for all consumers...');
      const response = await fetch('/api/admin?endpoint=generate-monthly-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        // Add transaction to monitor
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Monthly Token Generation',
          details: 'Monthly tokens for all consumers',
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });

        setSuccess(`✅ Monthly token generation started! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
        setTimeout(() => fetchConsumers(), 45000); // 45 seconds for bulk operation
      } else {
        setError(`❌ Failed to generate monthly tokens: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating monthly tokens:', error);
      setError(`❌ Failed to generate monthly tokens: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const exportConsumerData = () => {
    const csvContent = [
      ['Name', 'Aadhaar', 'Mobile', 'Category', 'Shopkeeper', 'Available Tokens', 'Total Received', 'Total Claimed'],
      ...filteredConsumers.map(consumer => [
        consumer.name,
        consumer.aadhaar,
        consumer.mobile,
        consumer.category === 1 ? 'APL' : 'BPL',
        consumer.shopkeeper,
        consumer.availableTokens,
        consumer.totalTokensReceived,
        consumer.totalTokensClaimed
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consumers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredConsumers = consumers.filter(consumer => {
    if (!consumer) return false;
    
    const matchesSearch = !searchTerm || 
      consumer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consumer.aadhaar?.includes(searchTerm);
    
    const matchesCategory = filterCategory === 'all' || 
      consumer.category?.toString() === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading consumers from blockchain...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-900">Consumer Management</h1>
              <p className="text-muted-foreground">
                Manage all registered consumers in the PDS blockchain system
              </p>
            </div>
            <button
              onClick={fetchConsumers}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div dangerouslySetInnerHTML={{ __html: error }} />
            <button 
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <div dangerouslySetInnerHTML={{ __html: success }} />
            <button 
              onClick={() => setSuccess('')}
              className="float-right text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Transaction Monitor */}
        <div className="mb-6">
          <TransactionMonitor />
        </div>

        {/* Search and Filter Controls */}
        <Card className="border-green-100 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name or Aadhaar number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-green-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Categories</option>
                  <option value="1">APL (Above Poverty Line)</option>
                  <option value="0">BPL (Below Poverty Line)</option>
                </select>
                <button 
                  onClick={exportConsumerData}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-green-100">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{filteredConsumers.length}</p>
                <p className="text-sm text-gray-600">Total Consumers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {filteredConsumers.filter(c => c.category === 0).length}
                </p>
                <p className="text-sm text-gray-600">BPL Consumers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {filteredConsumers.filter(c => c.category === 1).length}
                </p>
                <p className="text-sm text-gray-600">APL Consumers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {filteredConsumers.reduce((sum, c) => sum + (c.availableTokens || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Total Available Tokens</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Token Generation Actions */}
        <Card className="border-green-100 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Token Generation Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => generateCategoryTokens(0)}
                disabled={refreshing}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2 justify-center"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Generate BPL Tokens
                  </>
                )}
              </button>
              <button
                onClick={() => generateCategoryTokens(1)}
                disabled={refreshing}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2 justify-center"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Generate APL Tokens
                  </>
                )}
              </button>
              <button
                onClick={generateMonthlyTokensForAll}
                disabled={refreshing}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2 justify-center"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate Monthly for All
                  </>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Consumer List */}
        <div className="grid gap-4">
          {filteredConsumers.map((consumer, index) => (
            <Card key={`${consumer.aadhaar}-${index}`} className="border-green-100">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div>
                      <h3 className="font-semibold text-lg">{consumer.name}</h3>
                      <p className="text-sm text-gray-600">Aadhaar: {consumer.aadhaar}</p>
                      <p className="text-sm text-gray-600">Mobile: {consumer.mobile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Category: <Badge className={consumer.category === 1 ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                          {consumer.category === 1 ? 'APL' : 'BPL'}
                        </Badge>
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: <Badge className={consumer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {consumer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Available: <span className="font-semibold text-lg text-green-600">
                          {consumer.availableTokens || 0}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Total Received: {consumer.totalTokensReceived || 0}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total Claimed: {consumer.totalTokensClaimed || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Shopkeeper: {consumer.shopkeeper === 'Not Assigned' 
                          ? <span className="text-orange-600">Not Assigned</span>
                          : <span className="text-green-600">Assigned</span>
                        }
                      </p>
                      <p className="text-sm text-gray-600">
                        On Blockchain: ✅ Verified
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => generateTokenForConsumer(consumer.aadhaar, consumer.name)}
                      disabled={refreshing}
                      className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-1"
                    >
                      {refreshing ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white"></div>
                      ) : (
                        <Package className="h-3 w-3" />
                      )}
                      Generate Token
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredConsumers.length === 0 && !loading && (
          <Card className="border-green-100">
            <CardContent className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No consumers found</h3>
              <p className="text-gray-500">
                {searchTerm ? `No consumers match "${searchTerm}"` : 'No consumers registered yet'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Clear search
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-green-200 text-green-700 rounded-md hover:bg-green-50 disabled:opacity-50"
              >
                Previous
              </button>
              {[...Array(Math.min(pagination.totalPages, 5))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-4 py-2 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-green-600 text-white'
                        : 'border border-green-200 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-4 py-2 border border-green-200 text-green-700 rounded-md hover:bg-green-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Data fetched directly from blockchain • Contract: {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3329CA690f619bae73b9f36eb43839892D20045f'}</p>
          <p>Last updated: {new Date().toLocaleString('en-IN')}</p>
          {pagination.total && (
            <p>Showing {filteredConsumers.length} of {pagination.total} consumers</p>
          )}
          <p className="mt-2">
            <a 
              href={`https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3329CA690f619bae73b9f36eb43839892D20045f'}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline flex items-center justify-center gap-1"
            >
              View Contract on PolygonScan 
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}