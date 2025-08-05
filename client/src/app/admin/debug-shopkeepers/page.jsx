"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle,
  Database,
  CheckCircle, 
  XCircle, 
  Building,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ShopkeeperDebugPage() {
  const { toast } = useToast();
  const [databaseShopkeepers, setDatabaseShopkeepers] = useState([]);
  const [blockchainShopkeepers, setBlockchainShopkeepers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllShopkeepers();
  }, []);

  const fetchAllShopkeepers = async () => {
    setLoading(true);
    
    try {
      // Fetch from database (via admin API)
      console.log('📊 Fetching from database...');
      const dbResponse = await fetch('/api/admin?endpoint=get-shopkeepers');
      const dbData = await dbResponse.json();
      
      if (dbData.success) {
        setDatabaseShopkeepers(dbData.data || []);
        console.log('✅ Database shopkeepers:', dbData.data?.length || 0);
      }

      // Fetch from blockchain
      console.log('⛓️ Fetching from blockchain...');
      const blockchainResponse = await fetch('/api/admin/shopkeepers');
      const blockchainData = await blockchainResponse.json();
      
      if (blockchainData.success) {
        setBlockchainShopkeepers(blockchainData.shopkeepers || []);
        console.log('✅ Blockchain shopkeepers:', blockchainData.shopkeepers?.length || 0);
      }

    } catch (error) {
      console.error('Error fetching shopkeepers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shopkeeper data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading shopkeeper data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopkeeper Debug Dashboard</h1>
        <p className="text-gray-600">Compare database vs blockchain shopkeeper data</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Database Shopkeepers</p>
                <p className="text-2xl font-bold text-blue-600">{databaseShopkeepers.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">From local database</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Blockchain Shopkeepers</p>
                <p className="text-2xl font-bold text-green-600">{blockchainShopkeepers.length}</p>
              </div>
              <Building className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Registered on blockchain</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Issue Status</p>
                <p className="text-2xl font-bold text-red-600">
                  {blockchainShopkeepers.length === 0 ? "ISSUE" : "OK"}
                </p>
              </div>
              {blockchainShopkeepers.length === 0 ? (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-600" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {blockchainShopkeepers.length === 0 ? "No blockchain shopkeepers" : "All good"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Problem Alert */}
      {blockchainShopkeepers.length === 0 && databaseShopkeepers.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              🚨 Problem Identified: "Invalid shopkeeper" Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-red-700">
              <p className="font-medium">Root Cause:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>You have <strong>{databaseShopkeepers.length} shopkeepers in database</strong></li>
                <li>But <strong>0 shopkeepers registered on blockchain</strong></li>
                <li>Consumer approval fails because smart contract checks blockchain registration</li>
                <li>Contract validation: <code>s.shopkeepers_[shopkeeper]</code> returns <code>false</code></li>
              </ul>
              
              <div className="mt-4 p-3 bg-red-100 rounded">
                <p className="font-medium text-red-800">Solution:</p>
                <p className="text-sm">Register shopkeepers on blockchain first, then they'll appear in consumer approval dropdown.</p>
                <div className="mt-2">
                  <a 
                    href="/admin/register-shopkeeper"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Go to Shopkeeper Registration
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Database Shopkeepers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Shopkeepers ({databaseShopkeepers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {databaseShopkeepers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No shopkeepers in database</p>
          ) : (
            <div className="space-y-3">
              {databaseShopkeepers.slice(0, 5).map((shopkeeper, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                  <div>
                    <p className="font-medium">{shopkeeper.name || 'Unnamed'}</p>
                    <p className="text-sm text-gray-600">
                      {shopkeeper.address || shopkeeper.shopkeeperAddress || 'No address'}
                    </p>
                    <p className="text-xs text-gray-500">{shopkeeper.area || 'No area'}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    Database Only
                  </Badge>
                </div>
              ))}
              {databaseShopkeepers.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ... and {databaseShopkeepers.length - 5} more
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blockchain Shopkeepers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Blockchain Shopkeepers ({blockchainShopkeepers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {blockchainShopkeepers.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
              <p className="text-red-600 font-medium">No shopkeepers registered on blockchain</p>
              <p className="text-sm text-gray-500 mt-2">
                This is why consumer approval fails with "Invalid shopkeeper" error
              </p>
              <div className="mt-4">
                <a href="/admin/register-shopkeeper">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Building className="w-4 h-4 mr-2" />
                    Register First Shopkeeper
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {blockchainShopkeepers.map((shopkeeper, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded">
                  <div>
                    <p className="font-medium">{shopkeeper.name}</p>
                    <p className="text-sm text-gray-600">{shopkeeper.address}</p>
                    <p className="text-xs text-gray-500">{shopkeeper.area}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Blockchain
                    </Badge>
                    {shopkeeper.isActive && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button onClick={fetchAllShopkeepers} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
        <a href="/admin/register-shopkeeper">
          <Button className="bg-green-600 hover:bg-green-700">
            <Building className="w-4 h-4 mr-2" />
            Register Shopkeeper
          </Button>
        </a>
        <a href="/admin/consumer-requests">
          <Button variant="outline">
            Consumer Requests
          </Button>
        </a>
      </div>
    </div>
  );
}
