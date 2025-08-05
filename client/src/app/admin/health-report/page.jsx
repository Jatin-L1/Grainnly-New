'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, RefreshCw, TrendingUp, TrendingDown, 
  Users, UserCheck, AlertTriangle, CheckCircle, 
  Package, Clock, Database, Shield 
} from "lucide-react";

export default function SystemHealthReport() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHealthReport();
  }, []);

  const fetchHealthReport = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin?endpoint=system-health-report');
      const data = await response.json();
      
      if (data.success) {
        setHealthData(data.data);
      } else {
        setError('Failed to load system health report: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching system health report:', error);
      setError('Failed to fetch system health report from blockchain');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getHealthStatus = (score) => {
    if (score >= 90) return { status: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 75) return { status: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { status: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 40) return { status: 'Poor', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { status: 'Critical', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const calculatePercentage = (value, total) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading system health report from blockchain...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const healthStatus = healthData ? getHealthStatus(healthData.systemEfficiencyScore) : null;

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-900">System Health Report</h1>
              <p className="text-muted-foreground">
                Comprehensive health analytics of the blockchain-based PDS system
              </p>
            </div>
            <button
              onClick={fetchHealthReport}
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

        {/* Overall Health Score */}
        {healthData && (
          <Card className="border-green-100 mb-6">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className={`rounded-full p-4 ${healthStatus.bg}`}>
                    <Activity className={`h-12 w-12 ${healthStatus.color}`} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-bold text-gray-800">{healthData.systemEfficiencyScore}%</h2>
                    <p className="text-lg text-gray-600">System Efficiency Score</p>
                  </div>
                </div>
                <Badge className={`${healthStatus.bg} ${healthStatus.color} text-lg px-4 py-2`}>
                  System Status: {healthStatus.status}
                </Badge>
                <p className="text-sm text-gray-500 mt-2">
                  Based on consumer activity, token distribution, and system utilization metrics
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {healthData && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="border-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Registered</p>
                      <p className="text-2xl font-bold">{healthData.totalRegisteredConsumers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-blue-100 text-blue-800 text-xs">
                      Base Population
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Consumers</p>
                      <p className="text-2xl font-bold text-green-600">{healthData.activeConsumers}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      {calculatePercentage(healthData.activeConsumers, healthData.totalRegisteredConsumers)}% Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Current Month Tokens</p>
                      <p className="text-2xl font-bold text-purple-600">{healthData.consumersWithCurrentMonthToken}</p>
                    </div>
                    <Package className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      {calculatePercentage(healthData.consumersWithCurrentMonthToken, healthData.totalRegisteredConsumers)}% Coverage
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Without Tokens</p>
                      <p className="text-2xl font-bold text-red-600">{healthData.consumersWithoutCurrentMonthToken}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="mt-2">
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      Needs Attention
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Infrastructure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Infrastructure Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Shopkeepers</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{healthData.totalShopkeepers}</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Delivery Agents</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{healthData.totalDeliveryAgents}</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Consumer per Shopkeeper Ratio</span>
                      <span className="font-medium">
                        {healthData.totalShopkeepers > 0 
                          ? Math.round(healthData.totalRegisteredConsumers / healthData.totalShopkeepers)
                          : 0}:1
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Infrastructure Score</span>
                      <Badge className={
                        healthData.totalShopkeepers > 0 && healthData.totalDeliveryAgents > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {healthData.totalShopkeepers > 0 && healthData.totalDeliveryAgents > 0 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Distribution Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Active Consumer Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {calculatePercentage(healthData.activeConsumers, healthData.totalRegisteredConsumers)}%
                        </span>
                        {healthData.activeConsumers / healthData.totalRegisteredConsumers > 0.8 ? 
                          <TrendingUp className="h-4 w-4 text-green-500" /> :
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        }
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Token Coverage Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {calculatePercentage(healthData.consumersWithCurrentMonthToken, healthData.totalRegisteredConsumers)}%
                        </span>
                        {healthData.consumersWithCurrentMonthToken / healthData.totalRegisteredConsumers > 0.9 ? 
                          <TrendingUp className="h-4 w-4 text-green-500" /> :
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        }
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Inactive Consumer Rate</span>
                      <span className="font-medium text-red-600">
                        {calculatePercentage(healthData.inactiveConsumers, healthData.totalRegisteredConsumers)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Distribution Status</span>
                      <Badge className={
                        healthData.consumersWithoutCurrentMonthToken === 0
                          ? 'bg-green-100 text-green-800'
                          : healthData.consumersWithoutCurrentMonthToken < healthData.totalRegisteredConsumers * 0.1
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }>
                        {healthData.consumersWithoutCurrentMonthToken === 0 ? 'Complete' :
                         healthData.consumersWithoutCurrentMonthToken < healthData.totalRegisteredConsumers * 0.1 ? 'Good' : 'Needs Attention'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Analysis */}
            <Card className="border-green-100 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Analysis & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">Strengths</h3>
                    <div className="space-y-2">
                      {healthData.activeConsumers / healthData.totalRegisteredConsumers > 0.8 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700">High consumer activity rate</span>
                        </div>
                      )}
                      {healthData.consumersWithCurrentMonthToken / healthData.totalRegisteredConsumers > 0.9 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700">Excellent token distribution coverage</span>
                        </div>
                      )}
                      {healthData.systemEfficiencyScore > 80 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700">High overall system efficiency</span>
                        </div>
                      )}
                      {healthData.totalShopkeepers > 0 && healthData.totalDeliveryAgents > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-700">Good infrastructure setup</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">Areas for Improvement</h3>
                    <div className="space-y-2">
                      {healthData.inactiveConsumers > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-700">
                            {healthData.inactiveConsumers} inactive consumers need attention
                          </span>
                        </div>
                      )}
                      {healthData.consumersWithoutCurrentMonthToken > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700">
                            {healthData.consumersWithoutCurrentMonthToken} consumers without current month tokens
                          </span>
                        </div>
                      )}
                      {healthData.totalShopkeepers === 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700">No shopkeepers registered</span>
                        </div>
                      )}
                      {healthData.totalDeliveryAgents === 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-700">No delivery agents registered</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Bars */}
            <Card className="border-green-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Metrics Visualization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Consumer Activity Rate</span>
                      <span>{calculatePercentage(healthData.activeConsumers, healthData.totalRegisteredConsumers)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${calculatePercentage(healthData.activeConsumers, healthData.totalRegisteredConsumers)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Token Distribution Coverage</span>
                      <span>{calculatePercentage(healthData.consumersWithCurrentMonthToken, healthData.totalRegisteredConsumers)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${calculatePercentage(healthData.consumersWithCurrentMonthToken, healthData.totalRegisteredConsumers)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>System Efficiency Score</span>
                      <span>{healthData.systemEfficiencyScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          healthData.systemEfficiencyScore >= 80 ? 'bg-green-500' :
                          healthData.systemEfficiencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${healthData.systemEfficiencyScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Health data computed from real-time blockchain analytics • Last updated: {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    </AdminLayout>
  );
}