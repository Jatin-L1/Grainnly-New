'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, TrendingUp, RefreshCw, PieChart } from "lucide-react";

export default function CategoryWiseStatistics() {
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin?endpoint=category-stats');
      const data = await response.json();
      
      if (data.success) {
        setCategoryStats(data.data);
      } else {
        setError('Failed to load category statistics: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching category statistics:', error);
      setError('Failed to fetch category statistics from blockchain');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const totalConsumers = categoryStats.reduce((sum, cat) => sum + cat.consumers, 0);
  const totalRationAmount = categoryStats.reduce((sum, cat) => sum + cat.rationAmounts, 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading category statistics from blockchain...</p>
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
              <h1 className="text-3xl font-bold text-green-900">Category-wise Statistics</h1>
              <p className="text-muted-foreground">
                Distribution analytics by consumer categories (BPL/APL)
              </p>
            </div>
            <button
              onClick={fetchCategoryStats}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Categories</p>
                  <p className="text-2xl font-bold">{categoryStats.length}</p>
                </div>
                <PieChart className="h-8 w-8 text-green-600" />
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
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Ration Amount</p>
                  <p className="text-2xl font-bold">{totalRationAmount} kg</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {categoryStats.map((category, index) => {
            const percentage = totalConsumers > 0 ? 
              Math.round((category.consumers / totalConsumers) * 100) : 0;
            const avgRationPerConsumer = category.consumers > 0 ? 
              Math.round(category.rationAmounts / category.consumers) : 0;
            
            return (
              <Card key={index} className="border-green-100">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        category.category === 'BPL' ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                      <span>{category.category}</span>
                      <span className="text-sm text-gray-500">
                        ({category.category === 'BPL' ? 'Below Poverty Line' : 'Above Poverty Line'})
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-gray-700">{percentage}%</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600">Total Consumers</span>
                      </div>
                      <span className="font-semibold">{category.consumers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600">Total Ration Amount</span>
                      </div>
                      <span className="font-semibold">{category.rationAmounts} kg</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-gray-600">Avg. per Consumer</span>
                      </div>
                      <span className="font-semibold">{avgRationPerConsumer} kg</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Distribution Coverage</span>
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            category.category === 'BPL' ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Statistics Table */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Category-wise Distribution Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryStats.length === 0 ? (
              <div className="text-center py-8">
                <PieChart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No category statistics available</p>
                <p className="text-sm text-gray-400 mt-2">
                  Category statistics will appear here once consumers are registered
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-600">Category</th>
                      <th className="text-left p-4 font-medium text-gray-600">Total Consumers</th>
                      <th className="text-left p-4 font-medium text-gray-600">% of Total</th>
                      <th className="text-left p-4 font-medium text-gray-600">Ration Amount (kg)</th>
                      <th className="text-left p-4 font-medium text-gray-600">% of Total Ration</th>
                      <th className="text-left p-4 font-medium text-gray-600">Avg. per Consumer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryStats.map((category, index) => {
                      const consumerPercentage = totalConsumers > 0 ? 
                        Math.round((category.consumers / totalConsumers) * 100) : 0;
                      const rationPercentage = totalRationAmount > 0 ? 
                        Math.round((category.rationAmounts / totalRationAmount) * 100) : 0;
                      const avgRationPerConsumer = category.consumers > 0 ? 
                        Math.round(category.rationAmounts / category.consumers) : 0;
                      
                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${
                                category.category === 'BPL' ? 'bg-red-500' : 'bg-green-500'
                              }`}></div>
                              <span className="font-medium">{category.category}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{category.consumers}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{consumerPercentage}%</span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{category.rationAmounts} kg</span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{rationPercentage}%</span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{avgRationPerConsumer} kg</span>
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

        {/* Policy Insights */}
        {categoryStats.length > 0 && (
          <Card className="border-green-100 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Policy Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Distribution Equity</h3>
                  <div className="space-y-2">
                    {categoryStats.map((category, index) => {
                      const avgRation = category.consumers > 0 ? 
                        category.rationAmounts / category.consumers : 0;
                      return (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{category.category} Average:</span>
                          <span className="text-sm text-gray-600">{Math.round(avgRation)} kg/person</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">Coverage Analysis</h3>
                  <div className="space-y-2">
                    {categoryStats.map((category, index) => {
                      const percentage = totalConsumers > 0 ? 
                        (category.consumers / totalConsumers) * 100 : 0;
                      return (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{category.category} Coverage:</span>
                          <span className="text-sm text-gray-600">{Math.round(percentage)}% of total</span>
                        </div>
                      );
                    })}
                  </div>
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