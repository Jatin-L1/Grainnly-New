"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Phone, 
  User, 
  MapPin, 
  CreditCard, 
  Hash,
  Calendar,
  Search,
  Loader2,
  Building,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ConsumerRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // New states for shopkeeper dropdown and approval dialog
  const [allShopkeepers, setAllShopkeepers] = useState([]);
  const [shopkeepersLoading, setShopkeepersLoading] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState({
    show: false,
    request: null,
    selectedShopkeeper: '',
    selectedCategory: 'BPL'
  });

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
        
        // Filter only active shopkeepers with valid addresses that are on blockchain
        const validShopkeepers = data.data.filter(shopkeeper => {
          const hasValidAddress = shopkeeper.shopkeeperAddress && 
                                 shopkeeper.shopkeeperAddress !== '0x0000000000000000000000000000000000000000';
          const isActive = shopkeeper.isActive;
          const isOnBlockchain = shopkeeper.registrationTime && shopkeeper.registrationTime > 0;
          
          console.log(`� ${shopkeeper.name}: Address=${hasValidAddress}, Active=${isActive}, OnChain=${isOnBlockchain}`);
          
          return hasValidAddress && isActive && isOnBlockchain;
        });
        
        console.log('🎯 Valid blockchain shopkeepers:', validShopkeepers.length);
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
          description: "No active shopkeepers are registered on blockchain. Please register shopkeepers first.",
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

  // Open approval dialog
  const openApprovalDialog = (request) => {
    setApprovalDialog({
      show: true,
      request: request,
      selectedShopkeeper: '',
      selectedCategory: 'BPL'
    });
  };

  // Close approval dialog
  const closeApprovalDialog = () => {
    setApprovalDialog({
      show: false,
      request: null,
      selectedShopkeeper: '',
      selectedCategory: 'BPL'
    });
  };

  const approveConsumer = async () => {
    const { request, selectedShopkeeper, selectedCategory } = approvalDialog;
    const requestId = request._id;
    
    if (!selectedShopkeeper) {
      toast({
        title: "Error",
        description: "Please select a shopkeeper to assign",
        variant: "destructive",
      });
      return;
    }

    console.log('🎯 Approving consumer with data:', {
      aadhaar: request.aadharNumber,
      name: request.name,
      mobile: request.phone,
      category: selectedCategory,
      shopkeeperAddress: selectedShopkeeper
    });

    setProcessing(prev => ({...prev, [requestId]: true}));

    try {
      // Register consumer on blockchain with selected shopkeeper
      const registrationResponse = await fetch('/api/admin/register-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar: request.aadharNumber,
          name: request.name,
          mobile: request.phone,
          category: selectedCategory,
          shopkeeperAddress: selectedShopkeeper // Use selected shopkeeper instead of zero address
        }),
      });

      const registrationData = await registrationResponse.json();
      console.log('📋 Registration response:', registrationData);

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
            assignedShopkeeper: selectedShopkeeper,
            category: selectedCategory
          }),
        });

        if (updateResponse.ok) {
          const selectedShopkeeperData = allShopkeepers.find(s => 
            s.shopkeeperAddress === selectedShopkeeper || s.address === selectedShopkeeper
          );
          
          toast({
            title: "Success",
            description: `Consumer ${request.name} approved and assigned to ${selectedShopkeeperData?.name || 'selected shopkeeper'}`,
          });
          
          closeApprovalDialog();
          fetchRequests(); // Refresh the list
        } else {
          throw new Error('Failed to update request status');
        }
      } else {
        console.error('❌ Registration failed:', registrationData);
        throw new Error(registrationData.error || 'Blockchain registration failed');
      }

    } catch (error) {
      console.error('❌ Error approving consumer:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message || "Failed to approve consumer";
      
      if (errorMessage.includes("Invalid shopkeeper")) {
        errorMessage = `The selected shopkeeper (${formatAddress(selectedShopkeeper)}) is not registered on the blockchain. Please ensure the shopkeeper is properly registered first.`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
          status: 'rejected',
          reason: 'Rejected by admin'
        }),
      });

      if (response.ok) {
        toast({
          title: "Request Rejected",
          description: `Consumer request for ${request.name} has been rejected`,
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading consumer requests...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Consumer Signup Requests</h1>
        <div className="text-sm text-gray-600">
          {shopkeepersLoading ? 'Loading shopkeepers...' : `${allShopkeepers.length} shopkeepers available for assignment`}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Search</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, phone, or Aadhaar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              No consumer requests found for the selected filters.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request._id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {request.name}
                      {getStatusBadge(request.status)}
                    </CardTitle>
                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4" />
                      Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openApprovalDialog(request)}
                        disabled={processing[request._id]}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {processing[request._id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectConsumer(request)}
                        disabled={processing[request._id]}
                      >
                        {processing[request._id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Phone:</span> {request.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Address:</span> {request.homeAddress}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Ration Card:</span> {request.rationCardId}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">Aadhaar:</span> {request.aadharNumber}
                    </div>
                  </div>
                </div>
                
                {request.status === 'approved' && request.txHash && (
                  <div className="mt-4 p-3 bg-green-50 rounded border">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Registered on blockchain: 
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${request.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 underline hover:no-underline"
                      >
                        {request.txHash?.substring(0, 10)}...
                      </a>
                    </p>
                    {request.assignedShopkeeper && (
                      <p className="text-sm text-green-800 mt-1">
                        <Building className="w-4 h-4 inline mr-1" />
                        Assigned to shopkeeper: {formatAddress(request.assignedShopkeeper)}
                      </p>
                    )}
                    {request.category && (
                      <p className="text-sm text-green-800 mt-1">
                        <Users className="w-4 h-4 inline mr-1" />
                        Category: {request.category}
                      </p>
                    )}
                  </div>
                )}
                
                {request.status === 'rejected' && (
                  <div className="mt-4 p-3 bg-red-50 rounded border">
                    <p className="text-sm text-red-800">
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Request rejected: {request.rejectionReason || 'No reason provided'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Approval Dialog */}
      <Dialog 
        open={approvalDialog.show} 
        onOpenChange={(open) => !open && closeApprovalDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Approve Consumer Registration
            </DialogTitle>
            <DialogDescription>
              Assign shopkeeper and category for <strong>{approvalDialog.request?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Consumer Details */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><strong>Name:</strong> {approvalDialog.request?.name}</div>
                <div><strong>Phone:</strong> {approvalDialog.request?.phone}</div>
                <div><strong>Aadhaar:</strong> {approvalDialog.request?.aadharNumber}</div>
                <div><strong>Address:</strong> {approvalDialog.request?.homeAddress}</div>
              </div>
            </div>

            {/* Shopkeeper Selection */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Building className="w-4 h-4" />
                Assign Shopkeeper * 
                {shopkeepersLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </label>
              <Select
                value={approvalDialog.selectedShopkeeper}
                onValueChange={(value) => setApprovalDialog(prev => ({ 
                  ...prev, 
                  selectedShopkeeper: value 
                }))}
                disabled={shopkeepersLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    shopkeepersLoading 
                      ? "Loading shopkeepers..." 
                      : allShopkeepers.length === 0 
                        ? "No shopkeepers available" 
                        : "Select a shopkeeper to assign"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {allShopkeepers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {shopkeepersLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading shopkeepers...
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">No shopkeepers available</p>
                          <p className="text-xs mt-1">
                            Shopkeepers need to be registered on blockchain first.
                          </p>
                          <p className="text-xs mt-1">
                            Go to Admin Dashboard → Register Shopkeepers
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    allShopkeepers.map((shopkeeper, index) => {
                      const address = shopkeeper.shopkeeperAddress || shopkeeper.address;
                      console.log('🏪 Rendering shopkeeper:', shopkeeper.name, address); // Debug log
                      return (
                        <SelectItem 
                          key={address || `shopkeeper-${index}`} 
                          value={address}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{shopkeeper.name}</span>
                            <span className="text-xs text-gray-500">
                              {shopkeeper.area} • {formatAddress(address)}
                            </span>
                            <span className="text-xs text-green-600">
                              ✓ Registered on blockchain
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600 mt-1">
                {allShopkeepers.length} registered shopkeepers available
                {shopkeepersLoading && " (Loading...)"}
                {allShopkeepers.length === 0 && !shopkeepersLoading && (
                  <span className="text-amber-600 ml-1">
                    - Register shopkeepers on blockchain first
                  </span>
                )}
              </p>
            </div>

            {/* Category Selection */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                Ration Category *
              </label>
              <Select
                value={approvalDialog.selectedCategory}
                onValueChange={(value) => setApprovalDialog(prev => ({ 
                  ...prev, 
                  selectedCategory: value 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BPL">BPL (Below Poverty Line)</SelectItem>
                  <SelectItem value="APL">APL (Above Poverty Line)</SelectItem>
                  <SelectItem value="AAY">AAY (Antyodaya Anna Yojana)</SelectItem>
                  <SelectItem value="PHH">PHH (Priority Household)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeApprovalDialog}
              disabled={processing[approvalDialog.request?._id]}
            >
              Cancel
            </Button>
            <Button
              onClick={approveConsumer}
              disabled={
                processing[approvalDialog.request?._id] || 
                !approvalDialog.selectedShopkeeper ||
                !approvalDialog.selectedCategory
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {processing[approvalDialog.request?._id] ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Approving...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Approve & Register</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
