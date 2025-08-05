"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Search,
  Users,
  Package,
  FileText,
  Calendar,
  Phone,
  MapPin,
  CreditCard,
  Hash,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ConsumerRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Shopkeeper states
  const [allShopkeepers, setAllShopkeepers] = useState([]);
  const [shopkeepersLoading, setShopkeepersLoading] = useState(false);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingApprovalRequest, setPendingApprovalRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
    fetchShopkeepers(); // Fetch shopkeepers when component mounts
  }, [currentPage, statusFilter]);

  // Fetch shopkeepers for dropdown - Use the working admin API endpoint
  const fetchShopkeepers = async () => {
    try {
      setShopkeepersLoading(true);
      console.log('🔍 Fetching shopkeepers from admin API...');
      
      // Use the same endpoint that works in admin dashboard
      const response = await fetch('/api/admin?endpoint=get-shopkeepers');
      const data = await response.json();
      
      console.log('📋 Raw API response:', data);
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        console.log('✅ Found shopkeepers:', data.data.length);
        console.log('📊 Shopkeeper data:', data.data);
        
        // Filter only active shopkeepers with valid addresses
        const validShopkeepers = data.data.filter(shopkeeper => {
          const hasValidAddress = shopkeeper.shopkeeperAddress && 
                                 shopkeeper.shopkeeperAddress !== '0x0000000000000000000000000000000000000000';
          const isActive = shopkeeper.isActive !== false; // Allow true or undefined
          
          // Accept shopkeepers from both blockchain and database
          const isValidSource = shopkeeper.dataSource === 'blockchain' || shopkeeper.dataSource === 'database';
          
          console.log(`🔍 ${shopkeeper.name}: Address=${hasValidAddress}, Active=${isActive}, Source=${shopkeeper.dataSource}`);
          
          return hasValidAddress && isActive && isValidSource;
        });
        
        console.log('🎯 Valid shopkeepers for assignment:', validShopkeepers.length);
        setAllShopkeepers(validShopkeepers);
        
        toast({
          title: "Shopkeepers Loaded",
          description: `Found ${validShopkeepers.length} registered shopkeepers available for assignment`,
        });
      } else {
        // No shopkeepers found
        console.log('⚠️ No shopkeepers found in response:', data);
        setAllShopkeepers([]);
        toast({
          title: "No Shopkeepers Available",
          description: "No active shopkeepers are registered. Please register shopkeepers first.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error fetching shopkeepers:', error);
      setAllShopkeepers([]);
      toast({
        title: "Error",
        description: "Failed to fetch shopkeepers: " + error.message,
        variant: "destructive",
      });
    } finally {
      setShopkeepersLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        status: statusFilter
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/consumer-signup?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setRequests(data.requests);
        setTotalPages(data.pagination.pages);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch consumer requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRequests();
  };

  // Show approval dialog
  const showApprovalDialogForRequest = (request) => {
    setPendingApprovalRequest(request);
    setSelectedShopkeeper(''); // Reset selection
    setShowApprovalDialog(true);
  };

  // Approve consumer with shopkeeper assignment
  const approveConsumerWithShopkeeper = async () => {
    if (!pendingApprovalRequest) return;
    
    const request = pendingApprovalRequest;
    const requestId = request._id;
    
    if (!selectedShopkeeper) {
      toast({
        title: "Error",
        description: "Please select a shopkeeper before approving",
        variant: "destructive",
      });
      return;
    }

    setProcessing(prev => ({...prev, [requestId]: true}));

    try {
      // Register consumer on blockchain
      const registrationResponse = await fetch('/api/admin/register-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: request.aadharNumber,
          name: request.name,
          mobile: request.phone,
          category: 'BPL', // Default category - you can make this configurable
          shopkeeperAddress: selectedShopkeeper
        }),
      });

      const registrationData = await registrationResponse.json();

      if (registrationData.success) {
        // Update request status in database
        const updateResponse = await fetch('/api/consumer-signup/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId,
            status: 'approved',
            txHash: registrationData.txHash,
            assignedShopkeeper: selectedShopkeeper
          }),
        });

        if (updateResponse.ok) {
          toast({
            title: "Success",
            description: `Consumer ${request.name} approved and registered on blockchain`,
          });
          
          // Close dialog and refresh
          setShowApprovalDialog(false);
          setPendingApprovalRequest(null);
          setSelectedShopkeeper('');
          fetchRequests(); // Refresh the list
        } else {
          throw new Error('Failed to update request status');
        }
      } else {
        throw new Error(registrationData.error || 'Blockchain registration failed');
      }

    } catch (error) {
      console.error('Error approving consumer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve consumer",
        variant: "destructive",
      });
    } finally {
      setProcessing(prev => ({...prev, [requestId]: false}));
    }
  };

  const rejectConsumer = async (request) => {
    const requestId = request._id;
    setProcessing(prev => ({...prev, [requestId]: true}));

    try {
      const response = await fetch('/api/consumer-signup/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          status: 'rejected'
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Consumer ${request.name} request rejected`,
        });
        fetchRequests(); // Refresh the list
      } else {
        throw new Error('Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting consumer:', error);
      toast({
        title: "Error",
        description: "Failed to reject consumer request",
        variant: "destructive",
      });
    } finally {
      setProcessing(prev => ({...prev, [requestId]: false}));
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consumer requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consumer Requests</h1>
        <p className="text-gray-600 mt-2">
          Manage and approve consumer registration requests
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, or Aadhaar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} variant="outline">
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Found</h3>
              <p className="text-gray-600">
                {statusFilter === 'pending' ? 'No pending consumer requests at the moment.' : `No ${statusFilter} requests found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.name}
                      </h3>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Aadhaar:</span>
                        <span className="font-mono">{request.aadharNumber}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Phone:</span>
                        <span>{request.phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Address:</span>
                        <span className="truncate" title={request.address}>
                          {request.address}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Family:</span>
                        <span>{request.familyMembers} members</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Submitted:</span>
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                    
                    {request.adminNote && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Admin Note:</strong> {request.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-6 flex flex-col gap-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => showApprovalDialogForRequest(request)}
                          disabled={processing[request._id]}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processing[request._id] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => rejectConsumer(request)}
                          disabled={processing[request._id]}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Consumer Request</DialogTitle>
            <DialogDescription>
              Select a shopkeeper to assign to {pendingApprovalRequest?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Assign Shopkeeper</Label>
              <Select value={selectedShopkeeper} onValueChange={setSelectedShopkeeper}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={shopkeepersLoading ? "Loading shopkeepers..." : "Select a shopkeeper"} />
                </SelectTrigger>
                <SelectContent>
                  {shopkeepersLoading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : allShopkeepers.length === 0 ? (
                    <SelectItem value="none" disabled>No shopkeepers available</SelectItem>
                  ) : (
                    allShopkeepers.map((shopkeeper) => (
                      <SelectItem key={shopkeeper.shopkeeperAddress} value={shopkeeper.shopkeeperAddress}>
                        {shopkeeper.name} - {shopkeeper.area}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={approveConsumerWithShopkeeper}
              disabled={!selectedShopkeeper || processing[pendingApprovalRequest?._id]}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing[pendingApprovalRequest?._id] ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
