"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function AdminTestDataPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState({});

  const registerTestConsumer = async () => {
    setLoading(prev => ({ ...prev, consumer: true }));
    try {
      const response = await fetch('/api/admin/register-consumer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aadhaar: '123456780012',
          name: 'Test Consumer',
          mobile: '+911234567890',
          category: 'BPL',
          shopkeeperAddress: '0x0000000000000000000000000000000000000000'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Test consumer registered on blockchain",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, consumer: false }));
    }
  };

  const registerTestShopkeeper = async () => {
    setLoading(prev => ({ ...prev, shopkeeper: true }));
    try {
      const response = await fetch('/api/admin?endpoint=register-shopkeeper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: '0x742d35cc6669c4532939f88d9a5c7e4c1d8e8b5c',
          name: 'Test Ration Shop',
          area: 'Test Area'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Test shopkeeper registered on blockchain",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, shopkeeper: false }));
    }
  };

  const createTestDeliveryRequest = async () => {
    setLoading(prev => ({ ...prev, delivery: true }));
    try {
      const response = await fetch('/api/delivery-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Delivery Agent',
          phone: '+919876543210',
          walletAddress: '0x1234567890123456789012345678901234567890',
          vehicleType: 'bike',
          vehicleNumber: 'TN01AB1234',
          drivingLicense: 'DL123456789',
          aadhar: '987654321098'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Test delivery agent signup request created",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, delivery: false }));
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Register Test Data</h1>
      <p className="text-gray-600">
        Since you haven't registered anyone yet, use these buttons to create test data for testing the system.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Consumer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Aadhaar:</strong> 123456780012</p>
              <p><strong>Name:</strong> Test Consumer</p>
              <p><strong>Category:</strong> BPL</p>
            </div>
            <Button 
              onClick={registerTestConsumer}
              disabled={loading.consumer}
              className="w-full"
            >
              {loading.consumer ? 'Registering...' : 'Register Test Consumer'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Shopkeeper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Address:</strong> 0x742d35cc6669c4532939f88d9a5c7e4c1d8e8b5c</p>
              <p><strong>Name:</strong> Test Ration Shop</p>
              <p><strong>Area:</strong> Test Area</p>
            </div>
            <Button 
              onClick={registerTestShopkeeper}
              disabled={loading.shopkeeper}
              className="w-full"
            >
              {loading.shopkeeper ? 'Registering...' : 'Register Test Shopkeeper'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Delivery Agent</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Wallet:</strong> 0x1234567890123456789012345678901234567890</p>
              <p><strong>Name:</strong> Test Delivery Agent</p>
              <p><strong>Vehicle:</strong> TN01AB1234</p>
            </div>
            <Button 
              onClick={createTestDeliveryRequest}
              disabled={loading.delivery}
              className="w-full"
            >
              {loading.delivery ? 'Creating...' : 'Create Delivery Signup Request'}
            </Button>
            <p className="text-xs text-gray-500">
              Note: This creates a signup request. You'll need to approve it in the delivery requests page.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Register the test consumer and shopkeeper using the buttons above</li>
            <li>Create a delivery agent signup request</li>
            <li>Go to <code>/admin/deliveries</code> to approve the delivery agent</li>
            <li>Return to the main admin dashboard</li>
            <li>Use "Assign Delivery Agent" to assign the agent to the shopkeeper</li>
            <li>Use "Generate Monthly Tokens" to create tokens for the consumer</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
