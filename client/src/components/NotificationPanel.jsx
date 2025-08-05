import { useState, useEffect } from 'react';
import { Bell, Package, CheckCircle2, Clock, MapPin, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function NotificationPanel({ userAddress, userType }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [verificationData, setVerificationData] = useState({
    otp: '',
    location: { lat: '', lng: '' }
  });
  const [verifying, setVerifying] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Fetch notifications
  useEffect(() => {
    if (!userAddress) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `/api/notifications?recipientAddress=${userAddress}&recipientType=${userType}`
        );
        const data = await response.json();
        
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.filter(n => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userAddress, userType]);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVerificationData(prev => ({
          ...prev,
          location: {
            lat: position.coords.latitude.toString(),
            lng: position.coords.longitude.toString()
          }
        }));
      },
      (error) => {
        setLocationError('Unable to retrieve location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          updates: { read: true }
        })
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle verification
  const handleVerification = async () => {
    if (!selectedDispatch || !verificationData.otp) {
      alert('Please enter OTP');
      return;
    }

    if (!verificationData.location.lat || !verificationData.location.lng) {
      alert('Please provide location');
      return;
    }

    try {
      setVerifying(true);
      
      const response = await fetch('/api/verify-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatchId: selectedDispatch.data.dispatchId,
          otp: verificationData.otp,
          location: verificationData.location,
          verifierAddress: userAddress,
          verifierType: userType
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Verification completed successfully!');
        setShowVerificationDialog(false);
        setVerificationData({ otp: '', location: { lat: '', lng: '' } });
        
        // Mark notification as completed
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: selectedDispatch.id,
            updates: { status: 'completed', read: true }
          })
        });
        
        // Refresh notifications
        window.location.reload();
      } else {
        alert('Verification failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error during verification:', error);
      alert('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ration_incoming':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'delivery_assignment':
        return <MapPin className="h-5 w-5 text-green-600" />;
      case 'delivery_verified':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPanel(!showPanel)}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* Notification Panel */}
        {showPanel && (
          <Card className="absolute right-0 top-12 w-96 max-h-96 overflow-y-auto z-50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Notifications</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-lg ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.type === 'ration_incoming' && 'Ration Delivery Incoming'}
                          {notification.type === 'delivery_assignment' && 'New Delivery Assignment'}
                          {notification.type === 'delivery_verified' && 'Delivery Verified'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.timestamp)}
                          </span>
                          <div className="flex gap-2">
                            {!notification.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 px-2 text-xs"
                              >
                                Mark Read
                              </Button>
                            )}
                            {notification.type === 'ration_incoming' && 
                             notification.status !== 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDispatch(notification);
                                  setShowVerificationDialog(true);
                                  setShowPanel(false);
                                }}
                                className="h-6 px-2 text-xs"
                              >
                                Verify Delivery
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No notifications</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Ration Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDispatch && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium">Delivery Details:</p>
                <p className="text-xs text-gray-600 mt-1">
                  Dispatch ID: {selectedDispatch.data?.dispatchId}
                </p>
                <p className="text-xs text-gray-600">
                  Expected OTP: {selectedDispatch.data?.verificationOTP}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Verification OTP</Label>
              <Input
                id="otp"
                value={verificationData.otp}
                onChange={(e) => setVerificationData(prev => ({ 
                  ...prev, 
                  otp: e.target.value.replace(/\D/g, '').slice(0, 6)
                }))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label>Location Verification</Label>
              <div className="flex gap-2">
                <Input
                  value={verificationData.location.lat}
                  onChange={(e) => setVerificationData(prev => ({
                    ...prev,
                    location: { ...prev.location, lat: e.target.value }
                  }))}
                  placeholder="Latitude"
                />
                <Input
                  value={verificationData.location.lng}
                  onChange={(e) => setVerificationData(prev => ({
                    ...prev,
                    location: { ...prev.location, lng: e.target.value }
                  }))}
                  placeholder="Longitude"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                className="w-full"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Get Current Location
              </Button>
              {locationError && (
                <p className="text-sm text-red-600">{locationError}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowVerificationDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerification}
                disabled={verifying || !verificationData.otp || !verificationData.location.lat}
                className="flex-1"
              >
                {verifying ? 'Verifying...' : 'Verify Delivery'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
