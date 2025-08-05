'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building, Users, UserCheck, RefreshCw, TrendingUp } from "lucide-react";

export default function AreaWiseStatistics() {
  const [areaStats, setAreaStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAreaStats();
  }, []);

  const fetchAreaStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin?endpoint=area-stats');
      const data = await response.json();
      
      if (data.success) {
        setAreaStats(data.data);
      } else {
        setError('Failed to load area statistics: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching area statistics:', error);
      setError('Failed to fetch area statistics from blockchain');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalShopkeepers = areaStats.reduce((sum, area) => sum + area.shopkeepers, 0);
  const totalConsumers = areaStats.reduce((sum, area) => sum + area.consumers, 0);
  const totalActiveConsumers = areaStats.reduce((sum, area) => sum + area.activeConsumers, 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading area statistics from blockchain...</p>
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
              <h1 className="text-3xl font-bold text-green-900">Area-wise Statistics</h1>
              <p className="text-muted-foreground">
                Distribution analytics by geographical areas
              </p>
            </div>
            <button
              onClick={fetchAreaStats}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Areas</p>
                  <p className="text-2xl font-bold">{areaStats.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shopkeepers</p>
                  <p className="text-2xl font-bold">{totalShopkeepers}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Consumers</p>
                  <p className="text-2xl font-bold">{totalConsumers}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Consumers</p>
                  <p className="text-2xl font-bold">{totalActiveConsumers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Area Statistics Table */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Area-wise Distribution Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaStats.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No area statistics available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Area statistics will appear here once shopkeepers and consumers are registered
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-600">Area</th>
                      <th className="text-left p-4 font-medium text-gray-600">Shopkeepers</th>
                      <th className="text-left p-4 font-medium text-gray-600">Total Consumers</th>
                      <th className="text-left p-4 font-medium text-gray-600">Active Consumers</th>
                      <th className="text-left p-4 font-medium text-gray-600">Activity Rate</th>
                      <th className="text-left p-4 font-medium text-gray-600">Consumers per Shop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaStats.map((area, index) => {
                      const activityRate = area.consumers > 0 ? 
                        Math.round((area.activeConsumers / area.consumers) * 100) : 0;
                      const consumersPerShop = area.shopkeepers > 0 ? 
                        Math.round(area.consumers / area.shopkeepers) : 0;
                      
                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="font-medium">{area.area}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">{area.shopkeepers}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">{area.consumers}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1">
                              <UserCheck className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{area.activeConsumers}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                activityRate >= 80 ? 'bg-green-500' :
                                activityRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className={`font-medium ${
                                activityRate >= 80 ? 'text-green-600' :
                                activityRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {activityRate}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{consumersPerShop}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Insights */}
        {areaStats.length > 0 && (
          <Card className="border-green-100 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Best Performing Area</h3>
                  <p className="text-sm text-green-600">
                    {areaStats.reduce((best, area) => {
                      const currentRate = area.consumers > 0 ? (area.activeConsumers / area.consumers) : 0;
                      const bestRate = best.consumers > 0 ? (best.activeConsumers / best.consumers) : 0;
                      return currentRate > bestRate ? area : best;
                    }, areaStats[0])?.area || 'N/A'}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Largest Coverage</h3>
                  <p className="text-sm text-blue-600">
                    {areaStats.reduce((largest, area) => 
                      area.consumers > largest.consumers ? area : largest, areaStats[0]
                    )?.area || 'N/A'}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">Average Activity Rate</h3>
                  <p className="text-sm text-purple-600">
                    {totalConsumers > 0 ? Math.round((totalActiveConsumers / totalConsumers) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Data fetched directly from blockchain • Last updated: {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </AdminLayout>
  );
}