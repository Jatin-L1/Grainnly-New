'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Check, X, Phone, IdCard, User, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Available PDS categories
const availableCategories = [
  { value: 'BPL', label: 'Below Poverty Line (BPL)' },
  { value: 'AAY', label: 'Antyodaya Anna Yojana (AAY)' },
  { value: 'APL', label: 'Above Poverty Line (APL)' },
  { value: 'PHH', label: 'Priority Household (PHH)' },
  { value: 'ANNAPURNA', label: 'Annapurna Yojana (ANNAPURNA)' }
];

export default function ConsumerRequestsPage() {
  const [signupRequests, setSignupRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopkeepers, setShopkeepers] = useState([]);
  const { toast } = useToast();

  // Approval dialog state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedShopkeeper, setSelectedShopkeeper] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch signup requests
  const fetchSignupRequests = async () => {
    try {
      const response = await fetch('/api/consumer-signup');
      if (response.ok) {
        const data = await response.json();
        setSignupRequests(data.requests || []);
      } else {
        throw new Error('Failed to fetch signup requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load consumer signup requests",
        variant: "destructive",
      });
    }
  };

  // Fetch shopkeepers for assignment
  const fetchShopkeepers = async () => {
    try {
      console.log("🏪 Fetching shopkeepers from blockchain via admin API...");
      const response = await fetch('/api/admin?endpoint=get-shopkeepers');
      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Admin API response:", data);
        
        if (data.success && Array.isArray(data.data)) {
          // Map the blockchain data to the expected format
          const mappedShopkeepers = data.data.map(shopkeeper => ({
            walletAddress: shopkeeper.shopkeeperAddress || shopkeeper.walletAddress,
            name: shopkeeper.name || 'Unknown Shop',
            area: shopkeeper.area || 'Unknown Area',
            shopName: shopkeeper.area || 'Unknown Area' // Use area as shop name
          }));
          setShopkeepers(mappedShopkeepers);
          console.log(`✅ Found ${mappedShopkeepers.length} shopkeepers from blockchain`);
        } else {
          console.log("⚠️ No shopkeepers in response, setting empty array");
          setShopkeepers([]);
        }
      } else {
        console.error("❌ Failed to fetch shopkeepers, status:", response.status);
        setShopkeepers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching shopkeepers:', error);
      setShopkeepers([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSignupRequests(), fetchShopkeepers()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Handle approval dialog
  const handleApprovalClick = (request) => {
    setSelectedRequest(request);
    setSelectedShopkeeper('');
    setSelectedCategory('');
    setDialogOpen(true);
  };

  // Handle registration on blockchain
  const handleRegisterConsumer = async () => {
    if (!selectedRequest || !selectedShopkeeper || !selectedCategory) {
      toast({
        title: "Error",
        description: "Please select both shopkeeper and category",
        variant: "destructive",
      });
      return;
    }

    setApprovalLoading(true);

    try {
      console.log('🚀 Starting consumer registration...');
      console.log('Request data:', selectedRequest);
      console.log('Selected shopkeeper:', selectedShopkeeper);
      console.log('Selected category:', selectedCategory);

      const registrationData = {
        aadhaar: selectedRequest.aadharNumber,
        name: selectedRequest.name,
        mobile: selectedRequest.phone,
        category: selectedCategory,
        shopkeeperAddress: selectedShopkeeper
      };

      console.log('📤 Sending registration data:', registrationData);

      const response = await fetch('/api/admin/register-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();
      console.log('📥 Registration response:', result);

      if (result.success) {
        // Show success with transaction details
        toast({
          title: "✅ Consumer Registered Successfully!",
          description: (
            <div className="space-y-2">
              <div>Consumer {selectedRequest.name} has been registered on blockchain</div>
              {result.confirmed ? (
                <div className="text-green-600">✅ Transaction confirmed</div>
              ) : (
                <div className="text-yellow-600">⏳ Transaction processing</div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <a 
                  href={result.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  View on PolygonScan <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ),
        });

        // Remove the request from the list and close dialog
        setSignupRequests(prev => prev.filter(req => req._id !== selectedRequest._id));
        setDialogOpen(false);
        setSelectedRequest(null);

      } else {
        // Show error details
        toast({
          title: "❌ Registration Failed",
          description: (
            <div className="space-y-2">
              <div>{result.error}</div>
              {result.txHash && (
                <div className="flex items-center gap-2 mt-2">
                  <a 
                    href={`https://amoy.polygonscan.com/tx/${result.txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Check transaction <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>
          ),
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ Registration error:', error);
      toast({
        title: "❌ Registration Error",
        description: error.message || "Failed to register consumer",
        variant: "destructive",
      });
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handle rejection
  const handleReject = async (requestId) => {
    try {
      const response = await fetch('/api/consumer-signup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: requestId }),
      });

      if (response.ok) {
        setSignupRequests(prev => prev.filter(req => req._id !== requestId));
        toast({
          title: "Request Rejected",
          description: "Consumer signup request has been rejected",
        });
      } else {
        throw new Error('Failed to reject request');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading consumer requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consumer Registration Requests</h1>
          <p className="text-gray-600">Review and approve consumer signup requests</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={fetchShopkeepers}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Shopkeepers ({shopkeepers.length})
          </Button>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {signupRequests.length} Pending
          </Badge>
        </div>
      </div>

      {signupRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
            <p className="text-gray-600 text-center">
              All consumer registration requests have been processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {signupRequests.map((request) => (
            <Card key={request._id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {request.name}
                </CardTitle>
                <div className="text-sm text-gray-500">
                  Submitted: {new Date(request.createdAt).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    <span className="font-medium">Aadhaar:</span>
                    <span className="font-mono">{request.aadharNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Mobile:</span>
                    <span>{request.phone}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <IdCard className="h-4 w-4" />
                    <span className="font-medium">Ration Card:</span>
                    <span className="font-mono">{request.rationCardId}</span>
                  </div>
                  <div className="col-span-2 text-sm">
                    <span className="font-medium">Address:</span>
                    <span className="ml-2 text-gray-700">{request.homeAddress}</span>
                  </div>
                </div>

                {request.email && (
                  <div className="text-sm">
                    <span className="font-medium">Email:</span> {request.email}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Dialog open={dialogOpen && selectedRequest?._id === request._id} onOpenChange={(open) => {
                    if (!open) {
                      setDialogOpen(false);
                      setSelectedRequest(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="flex-1" 
                        onClick={() => handleApprovalClick(request)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve & Register
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Register Consumer on Blockchain</DialogTitle>
                        <DialogDescription>
                          Complete the registration for <strong>{request.name}</strong> by selecting a shopkeeper and category.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6 py-4">
                        {/* Consumer Details */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <h4 className="font-medium text-gray-900">Consumer Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div><span className="font-medium">Name:</span> {request.name}</div>
                            <div><span className="font-medium">Aadhaar:</span> {request.aadharNumber}</div>
                            <div><span className="font-medium">Mobile:</span> {request.phone}</div>
                            <div><span className="font-medium">Ration Card:</span> {request.rationCardId}</div>
                            <div className="col-span-2"><span className="font-medium">Address:</span> {request.homeAddress}</div>
                            {request.email && <div className="col-span-2"><span className="font-medium">Email:</span> {request.email}</div>}
                          </div>
                        </div>

                        {/* Shopkeeper Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="shopkeeper">Assign Shopkeeper *</Label>
                          <Select value={selectedShopkeeper} onValueChange={setSelectedShopkeeper}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a shopkeeper" />
                            </SelectTrigger>
                            <SelectContent>
                              {shopkeepers.length === 0 ? (
                                <SelectItem value="no-shopkeepers" disabled>No shopkeepers available</SelectItem>
                              ) : (
                                shopkeepers.map((shopkeeper) => (
                                  <SelectItem key={shopkeeper.walletAddress} value={shopkeeper.walletAddress}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{shopkeeper.name}</span>
                                      <span className="text-xs text-gray-500">{shopkeeper.area} • {shopkeeper.walletAddress.slice(0, 6)}...{shopkeeper.walletAddress.slice(-4)}</span>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Category Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="category">Consumer Category *</Label>
                          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select consumer category" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCategories.map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Warning */}
                        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-yellow-800">Blockchain Registration</p>
                            <p className="text-yellow-700 mt-1">
                              This will register the consumer on the Polygon Amoy blockchain. 
                              Make sure the details are correct as this cannot be easily undone.
                            </p>
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setDialogOpen(false)}
                          disabled={approvalLoading}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleRegisterConsumer} 
                          disabled={!selectedShopkeeper || !selectedCategory || approvalLoading}
                          className="min-w-[120px]"
                        >
                          {approvalLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Registering...</span>
                            </div>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Register on Blockchain
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(request._id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
