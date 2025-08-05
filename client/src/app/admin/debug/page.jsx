"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDataDebug() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkAllData = async () => {
    setLoading(true);
    try {
      // Check dashboard stats
      const dashResponse = await fetch('/api/admin?endpoint=dashboard');
      const dashData = await dashResponse.json();
      
      // Check consumers
      const consumerResponse = await fetch('/api/admin?endpoint=get-consumers');
      const consumerData = await consumerResponse.json();
      
      // Check shopkeepers
      const shopkeeperResponse = await fetch('/api/admin?endpoint=get-shopkeepers');
      const shopkeeperData = await shopkeeperResponse.json();
      
      // Check delivery agents
      const deliveryResponse = await fetch('/api/admin?endpoint=get-delivery-agents');
      const deliveryData = await deliveryResponse.json();

      setData({
        dashboard: dashData,
        consumers: consumerData,
        shopkeepers: shopkeeperData,
        deliveryAgents: deliveryData
      });
    } catch (error) {
      console.error('Error:', error);
      setData({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Data Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkAllData} disabled={loading}>
            {loading ? 'Checking...' : 'Check All Data'}
          </Button>
          
          {data && (
            <div className="mt-4">
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
