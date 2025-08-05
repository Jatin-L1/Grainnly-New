"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/AdminLayout';
import { ethers } from 'ethers';

import { Users, UserCheck, UserX, Clock, ArrowUpRight, Link as LinkIcon, Store } from 'lucide-react';

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

export default function ConsumerSignupRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  // State variables for blockchain registration
  const [blockchainTx, setBlockchainTx] = useState(null);
  const [registering, setRegistering] = useState(false);
  // New state variables for shopkeepers
  const [shopkeepers, setShopkeepers] = useState([]);
  const [shopkeepersLoading, setShopkeepersLoading] = useState(false);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState("");
  const [shopkeeperModalOpen, setShopkeeperModalOpen] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState(null);
  const [validCategories, setValidCategories] = useState(['AAY', 'BPL', 'APL', 'PHH']);
  const [selectedCategory, setSelectedCategory] = useState('BPL');

  useEffect(() => {
    fetchRequests();
    fetchShopkeepers();
    fetchValidCategories();
  }, [filter]);

  const fetchValidCategories = async () => {
    try {
      // Try to fetch valid categories from the blockchain
      const response = await fetch('/api/admin/valid-categories');
      if (response.ok) {
        const data = await response.json();
        if (data.categories && data.categories.length > 0) {
          setValidCategories(data.categories);
          setSelectedCategory(data.categories[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching valid categories:', error);
      // Keep the default categories if there's an error
    }
  };

  const fetchShopkeepers = async () => {
    try {
      setShopkeepersLoading(true);
      const response = await fetch('/api/admin/shopkeepers');
      const data = await response.json();
      
      if (data.success && data.shopkeepers) {
        setShopkeepers(data.shopkeepers);
        // Set the first shopkeeper as default if available
        if (data.shopkeepers.length > 0) {
          setSelectedShopkeeper(data.shopkeepers[0].address);
        }
      }
    } catch (error) {
      console.error('Error fetching shopkeepers:', error);
    } finally {
      setShopkeepersLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/consumer-signup?status=${filter}`);
      const data = await response.json();
      setRequests(data.requests);
      
      // Calculate stats
      const allResponse = await fetch('/api/consumer-signup?status=all');
      const allData = await allResponse.json();
      const allRequests = allData.requests;
      
      setStats({
        pending: allRequests.filter(r => r.status === 'pending').length,
        approved: allRequests.filter(r => r.status === 'approved').length,
        rejected: allRequests.filter(r => r.status === 'rejected').length,
        total: allRequests.length
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openShopkeeperModal = (requestId) => {
    setCurrentRequestId(requestId);
    setShopkeeperModalOpen(true);
  };

  const handleApproveWithShopkeeper = async () => {
    if (!selectedShopkeeper) {
      alert("Please select a shopkeeper before approving the request");
      return;
    }
    
    await handleAction(currentRequestId, 'approve');
    setShopkeeperModalOpen(false);
  };

  const handleAction = async (requestId, action, adminNote = '') => {
    try {
      // First update the request status in your database
      const response = await fetch(`/api/consumer-signup/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          adminNote,
          adminId: '69420' // Replace with actual admin ID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      // If approving, register on blockchain
      if (action === 'approve') {
        setRegistering(true);
        
        // Get the consumer details from the request
        const consumerRequest = requests.find(r => r._id === requestId);
        
        if (!consumerRequest) {
          throw new Error('Consumer request not found');
        }
        
        // Use selected shopkeeper and category
        const blockchainData = {
          aadhaar: consumerRequest.aadharNumber,
          name: consumerRequest.name,
          mobile: consumerRequest.phone || '',
          category: selectedCategory,
          shopkeeperAddress: selectedShopkeeper
        };
        
        try {
          // Call blockchain registration API
          const blockchainResponse = await fetch('/api/admin/register-consumer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(blockchainData),
          });
          
          if (!blockchainResponse.ok) {
            const errorData = await blockchainResponse.json();
            throw new Error(errorData.error || 'Blockchain registration failed');
          }
          
          const blockchainResult = await blockchainResponse.json();
          
          if (blockchainResult.success) {
            setBlockchainTx(blockchainResult);
          } else {
            throw new Error(blockchainResult.error || 'Blockchain registration failed');
          }
        } catch (blockchainError) {
          console.error('Blockchain registration error:', blockchainError);
          
          // Show a more user-friendly error notification
          alert(`Request status updated, but blockchain registration failed: ${blockchainError.message}`);
          
          // Still update the UI to reflect the status change
          fetchRequests();
          return;
        }
      }
      
      fetchRequests(); // Refresh the list
    } catch (error) {
      console.error('Error updating request:', error);
      alert(`Error: ${error.message || 'Failed to process request'}`);
    } finally {
      setRegistering(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const shortenAddress = (address) => {
    if (!address) return "No address";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading consumer signup requests...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <h1 className="text-3xl font-bold text-green-900">Consumer Signup Requests</h1>
          <p className="text-muted-foreground">
            Review and manage consumer registration requests.
          </p>
        </div>

        {/* Stats Overview */}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <div className="rounded-full p-2 bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <div className="rounded-full p-2 bg-yellow-100">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <div className="rounded-full p-2 bg-green-100">
                  <UserCheck className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="overflow-hidden border border-green-100 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <div className="rounded-full p-2 bg-red-100">
                  <UserX className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </div>
          </motion.div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-full">
            <div className="bg-white border border-green-100 rounded-lg p-1 inline-flex">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === status 
                      ? 'bg-green-50 text-green-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {requests.length === 0 ? (
            <div className="bg-white shadow-sm rounded-lg border border-green-100 p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-500">No consumer signup requests match the current filter.</p>
            </div>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request._id}
                variants={itemVariants}
                transition={{ delay: index * 0.05 }}
              >
                <div className="bg-white shadow-sm rounded-lg border border-green-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-green-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{request.name}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted on {formatDate(request.submittedAt)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Contact Information</p>
                          <p className="text-sm text-gray-900">{request.email}</p>
                          <p className="text-sm text-gray-900">{request.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Address</p>
                          <p className="text-sm text-gray-900">{request.homeAddress}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Documents</p>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Ration Card:</span> {request.rationCardId}
                          </p>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">Aadhar:</span> {request.aadharNumber}
                          </p>
                        </div>
                        {request.familySize && (
                          <div>
                            <p className="text-sm font-medium text-gray-600">Family Size</p>
                            <p className="text-sm text-gray-900">{request.familySize}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {request.adminNote && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-600">Admin Note:</p>
                        <p className="text-sm text-gray-900 mt-1">{request.adminNote}</p>
                        {request.reviewedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Reviewed on {formatDate(request.reviewedAt)} by {request.reviewedBy}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {request.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => openShopkeeperModal(request._id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                          >
                            Approve Request
                          </button>
                          <button
                            onClick={() => handleAction(request._id, 'reject')}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                          >
                            Reject Request
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Pagination could be added here if needed */}
        {requests.length > 0 && (
          <div className="mt-6 bg-white shadow-sm rounded-lg border border-green-100 px-6 py-4 flex justify-between">
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
              Previous
            </button>
            <button className="px-4 py-2 bg-white border border-green-200 text-green-700 rounded-md hover:bg-green-50">
              Next
            </button>
          </div>
        )}
        
        {/* Shopkeeper Selection Modal */}
        {shopkeeperModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Shopkeeper</h3>
              
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Consumer Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {validCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-6">
                <label htmlFor="shopkeeper" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Shopkeeper
                </label>
                {shopkeepersLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Loading shopkeepers...</span>
                  </div>
                ) : shopkeepers.length === 0 ? (
                  <div className="text-sm text-red-500">No shopkeepers available. Please register shopkeepers first.</div>
                ) : (
                  <select
                    id="shopkeeper"
                    value={selectedShopkeeper}
                    onChange={(e) => setSelectedShopkeeper(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {shopkeepers.map((shopkeeper) => (
                      <option key={shopkeeper.address} value={shopkeeper.address}>
                        {shopkeeper.name} ({shortenAddress(shopkeeper.address)}) - {shopkeeper.area}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShopkeeperModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveWithShopkeeper}
                  disabled={shopkeepersLoading || shopkeepers.length === 0}
                  className={`px-4 py-2 bg-green-600 text-white rounded-md ${
                    shopkeepersLoading || shopkeepers.length === 0
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-green-700'
                  }`}
                >
                  Approve & Register
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blockchain Transaction Notification */}
        {blockchainTx && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 right-4 max-w-md bg-white shadow-lg rounded-lg border border-green-200 p-4 z-50"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <svg
                  className="h-10 w-10 text-green-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3 w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900">Consumer Registered on Blockchain!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Transaction Hash: {blockchainTx.txHash.slice(0, 10)}...{blockchainTx.txHash.slice(-8)}
                </p>
                <div className="mt-2">
                  <a
                    href={blockchainTx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    View on Polygonscan
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </a>
                  <button
                    onClick={() => setBlockchainTx(null)}
                    className="ml-3 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Blockchain Registration Loading Overlay */}
        {registering && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex flex-col items-center text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500 mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Registering Consumer on Blockchain</h3>
                <p className="text-sm text-gray-500">
                  This may take a minute. Please don't close this window.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}