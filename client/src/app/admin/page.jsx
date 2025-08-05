'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import TransactionMonitor from '@/components/TransactionMonitor';
import { motion } from "framer-motion";
import { 
  ArrowUpRight, CheckCircle2, Clock, Package, 
  Truck, Users, Wallet, Building, UserCheck,
  AlertTriangle, TrendingUp, MapPin, Calendar,
  Zap, Activity, Database, RefreshCw, DollarSign,
  CreditCard, Settings, Pause, Play, Shield,
  FileText, BarChart3, PieChart, Download,
  Bell, X, Check, Eye, UserX, UserPlus,
  Navigation, Star, Award, Target, Gauge,
  Link2, Copy, ExternalLink
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminDashboard() {
  const router = useRouter();
  
  // Backend Connection States - No MetaMask needed
  const [isConnected, setIsConnected] = useState(false);
  const [adminWalletAddress] = useState('0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa'); // From env
  
  // Core Dashboard States
  const [dashboardData, setDashboardData] = useState({
    totalConsumers: 0,
    totalShopkeepers: 0,
    totalDeliveryAgents: 0,
    activeDeliveries: 0,
    tokensDistributed: 0,
    systemStatus: 'Active',
    rationPrice: 0,
    subsidyPercentage: 0,
    currentMonth: 0,
    currentYear: 0
  });
  
  const [systemAnalytics, setSystemAnalytics] = useState(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState(null);
  const [areaStats, setAreaStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState(null);
  
  // User Management States
  const [allConsumers, setAllConsumers] = useState([]);
  const [consumersByCategory, setConsumersByCategory] = useState({
    BPL: [],
    APL: [],
    AAY: [],
    PHH: []
  });
  const [allShopkeepers, setAllShopkeepers] = useState([]);
  const [allDeliveryAgents, setAllDeliveryAgents] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [emergencyCases, setEmergencyCases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Loading States for Actions
  const [actionLoading, setActionLoading] = useState({
    generateMonthlyTokens: false,
    generateCategoryTokens: false,
    expireOldTokens: false,
    pauseSystem: false,
    unpauseSystem: false,
    settingPrice: false,
    settingSubsidy: false,
    bulkGenerateTokens: false,
    assigningAgent: false,
    updatingSystem: false
  });
  
  // Form States
  const [priceSettings, setPriceSettings] = useState({
    rationPrice: '',
    subsidyPercentage: ''
  });
  
  const [assignAgentForm, setAssignAgentForm] = useState({
    deliveryAgent: '',
    shopkeeper: '',
    showDialog: false
  });
  
  const [bulkTokenForm, setBulkTokenForm] = useState({
    aadhaars: '',
    showDialog: false
  });

  // New form states for additional features
  const [emergencyForm, setEmergencyForm] = useState({
    orderId: '',
    reason: '',
    showDialog: false
  });

  const [notificationForm, setNotificationForm] = useState({
    role: '',
    message: '',
    priority: 'normal',
    showDialog: false
  });

  // ========== BACKEND API INITIALIZATION ==========
  
  useEffect(() => {
    initializeBackendConnection();
  }, []);

  const initializeBackendConnection = async () => {
    try {
      setLoading(true);
      
      // Test backend connection
      const response = await fetch('/api/admin?endpoint=test-connection');
      const data = await response.json();
      
      if (data.success) {
        setIsConnected(true);
        setSuccess('✅ Backend wallet connected successfully!');
        console.log('Backend connection established:', data.data);
        
        // Fetch all dashboard data
        await fetchAllDashboardData();
      } else {
        setError('❌ Failed to connect to backend wallet: ' + data.error);
      }
    } catch (error) {
      console.error('Backend connection error:', error);
      setError('❌ Backend connection failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== DATA FETCHING FUNCTIONS ==========
  
  const fetchAllDashboardData = async () => {
    try {
      setRefreshing(true);
      setError('');
      
      // Fetch all data in parallel
      const promises = [
        fetchDashboardStats(),
        fetchPaymentAnalytics(), 
        fetchSystemSettings(),
        fetchUsers(),
        fetchActiveDeliveries(),
        fetchAreaStats(),
        fetchCategoryStats(),
        fetchEmergencyCases(),
        fetchNotifications()
      ];
      
      await Promise.allSettled(promises);
      setSuccess('✅ Dashboard data refreshed successfully!');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('❌ Failed to fetch dashboard data: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(prev => ({
          ...prev,
          totalConsumers: data.data.totalConsumers || 0,
          totalShopkeepers: data.data.totalShopkeepers || 0,
          totalDeliveryAgents: data.data.totalDeliveryAgents || 0,
          totalTokensIssued: data.data.totalTokensIssued || 0,
          totalTokensClaimed: data.data.totalTokensClaimed || 0,
          pendingTokens: data.data.pendingTokens || 0,
          currentMonth: data.data.currentMonth || new Date().getMonth() + 1,
          currentYear: data.data.currentYear || new Date().getFullYear()
        }));
        
        if (data.warning) {
          console.warn('Dashboard warning:', data.warning);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchPaymentAnalytics = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=payment-analytics');
      const data = await response.json();
      
      if (data.success) {
        setPaymentAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=system-settings');
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(prev => ({
          ...prev,
          rationPrice: data.data.rationPrice || 0,
          subsidyPercentage: data.data.subsidyPercentage || 0,
          systemStatus: data.data.isPaused ? 'Paused' : 'Active'
        }));
        
        setPriceSettings({
          rationPrice: data.data.rationPrice?.toString() || '',
          subsidyPercentage: data.data.subsidyPercentage?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch consumers
      const consumersResponse = await fetch('/api/admin?endpoint=get-consumers&limit=100');
      if (consumersResponse.ok) {
        const consumersData = await consumersResponse.json();
        if (consumersData.success) {
          setAllConsumers(consumersData.data);
          
          // Group by category
          const grouped = {
            BPL: consumersData.data.filter(c => c.category === 'BPL' || c.category === 0),
            APL: consumersData.data.filter(c => c.category === 'APL' || c.category === 1),
            AAY: consumersData.data.filter(c => c.category === 'AAY'),
            PHH: consumersData.data.filter(c => c.category === 'PHH')
          };
          setConsumersByCategory(grouped);
        }
      }

      // Fetch shopkeepers
      const shopkeepersResponse = await fetch('/api/admin?endpoint=get-shopkeepers');
      if (shopkeepersResponse.ok) {
        const shopkeepersData = await shopkeepersResponse.json();
        if (shopkeepersData.success) {
          setAllShopkeepers(shopkeepersData.data);
        }
      }

      // Fetch delivery agents
      const agentsResponse = await fetch('/api/admin?endpoint=get-delivery-agents');
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        if (agentsData.success) {
          setAllDeliveryAgents(agentsData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchActiveDeliveries = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-active-deliveries');
      const data = await response.json();
      
      if (data.success) {
        setActiveDeliveries(data.data);
      }
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  };

  const fetchAreaStats = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=area-stats');
      const data = await response.json();
      
      if (data.success) {
        setAreaStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching area stats:', error);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=category-stats');
      const data = await response.json();
      
      if (data.success) {
        setCategoryStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching category stats:', error);
    }
  };

  const fetchEmergencyCases = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=emergency-cases');
      const data = await response.json();
      
      if (data.success) {
        setEmergencyCases(data.data);
      }
    } catch (error) {
      console.error('Error fetching emergency cases:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin?endpoint=get-notifications');
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // ========== TOKEN MANAGEMENT FUNCTIONS ==========
  
  const generateMonthlyTokensForAll = async () => {
    try {
      setActionLoading(prev => ({ ...prev, generateMonthlyTokens: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=generate-monthly-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Monthly tokens generation started! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Monthly Token Generation',
          details: 'Generated monthly tokens for all consumers',
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
        
        // Refresh data after some time
        setTimeout(() => fetchAllDashboardData(), 30000);
      } else {
        setError('❌ Failed to generate monthly tokens: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error generating monthly tokens: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, generateMonthlyTokens: false }));
    }
  };

  const generateCategoryTokens = async (category) => {
    try {
      setActionLoading(prev => ({ ...prev, generateCategoryTokens: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=generate-category-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Tokens generation started for ${category} category! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Category Token Generation',
          details: `Generated tokens for ${category} category`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
      } else {
        setError('❌ Failed to generate category tokens: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error generating category tokens: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, generateCategoryTokens: false }));
    }
  };

  const bulkGenerateTokens = async () => {
    try {
      setActionLoading(prev => ({ ...prev, bulkGenerateTokens: true }));
      setError('');
      
      // Parse comma-separated Aadhaar numbers
      const aadhaars = bulkTokenForm.aadhaars.split(',').map(a => a.trim()).filter(a => a);
      
      if (aadhaars.length === 0) {
        setError('❌ Please enter at least one Aadhaar number');
        return;
      }
      
      const response = await fetch('/api/admin?endpoint=bulk-generate-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaars })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Bulk token generation started for ${aadhaars.length} consumers! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        setBulkTokenForm({ aadhaars: '', showDialog: false });
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Bulk Token Generation',
          details: `Generated tokens for ${aadhaars.length} consumers`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
      } else {
        setError('❌ Failed to bulk generate tokens: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error bulk generating tokens: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, bulkGenerateTokens: false }));
    }
  };

  const expireOldTokens = async () => {
    try {
      setActionLoading(prev => ({ ...prev, expireOldTokens: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=expire-old-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Old tokens expiration started! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Expire Old Tokens',
          details: 'Expired old/unused tokens',
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
      } else {
        setError('❌ Failed to expire old tokens: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error expiring old tokens: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, expireOldTokens: false }));
    }
  };

  // ========== SYSTEM MANAGEMENT FUNCTIONS ==========
  
  const pauseSystem = async () => {
    try {
      setActionLoading(prev => ({ ...prev, pauseSystem: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=pause-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ System paused successfully! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Pause System',
          details: 'System paused for maintenance',
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
        
        // Update system status
        setDashboardData(prev => ({ ...prev, systemStatus: 'Paused' }));
      } else {
        setError('❌ Failed to pause system: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error pausing system: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, pauseSystem: false }));
    }
  };

  const unpauseSystem = async () => {
    try {
      setActionLoading(prev => ({ ...prev, unpauseSystem: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=unpause-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ System resumed successfully! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Unpause System',
          details: 'System resumed operations',
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
        
        // Update system status
        setDashboardData(prev => ({ ...prev, systemStatus: 'Active' }));
      } else {
        setError('❌ Failed to resume system: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error resuming system: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, unpauseSystem: false }));
    }
  };

  const setRationPrice = async () => {
    try {
      setActionLoading(prev => ({ ...prev, settingPrice: true }));
      setError('');
      
      if (!priceSettings.rationPrice || isNaN(priceSettings.rationPrice)) {
        setError('❌ Please enter a valid ration price');
        return;
      }
      
      const response = await fetch('/api/admin?endpoint=set-ration-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: priceSettings.rationPrice })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Ration price updated to ₹${priceSettings.rationPrice}! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Set Ration Price',
          details: `Updated ration price to ₹${priceSettings.rationPrice}`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
      } else {
        setError('❌ Failed to set ration price: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error setting ration price: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, settingPrice: false }));
    }
  };

  const setSubsidyPercentage = async () => {
    try {
      setActionLoading(prev => ({ ...prev, settingSubsidy: true }));
      setError('');
      
      if (!priceSettings.subsidyPercentage || isNaN(priceSettings.subsidyPercentage)) {
        setError('❌ Please enter a valid subsidy percentage');
        return;
      }
      
      const response = await fetch('/api/admin?endpoint=set-subsidy-percentage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: priceSettings.subsidyPercentage })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Subsidy percentage updated to ${priceSettings.subsidyPercentage}%! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Set Subsidy Percentage',
          details: `Updated subsidy to ${priceSettings.subsidyPercentage}%`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
      } else {
        setError('❌ Failed to set subsidy percentage: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error setting subsidy percentage: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, settingSubsidy: false }));
    }
  };

  // ========== DELIVERY MANAGEMENT FUNCTIONS ==========
  
  const assignDeliveryAgentToShopkeeper = async () => {
    try {
      setActionLoading(prev => ({ ...prev, assigningAgent: true }));
      setError('');
      
      if (!assignAgentForm.deliveryAgent || !assignAgentForm.shopkeeper) {
        setError('❌ Please select both delivery agent and shopkeeper');
        return;
      }
      
      const response = await fetch('/api/admin?endpoint=assign-delivery-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryAgentAddress: assignAgentForm.deliveryAgent,
          shopkeeperAddress: assignAgentForm.shopkeeper
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Delivery agent assigned successfully! 
          <a href="${data.polygonScanUrl}" target="_blank" class="underline">View on PolygonScan ↗</a>`);
        
        setAssignAgentForm({ deliveryAgent: '', shopkeeper: '', showDialog: false });
        
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Assign Delivery Agent',
          details: `Assigned delivery agent to shopkeeper`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
        
        // Refresh data
        setTimeout(() => fetchUsers(), 10000);
      } else {
        setError('❌ Failed to assign delivery agent: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error assigning delivery agent: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, assigningAgent: false }));
    }
  };

  // ========== UTILITY FUNCTIONS ==========
  
  const addTransactionToMonitor = (txData) => {
    const event = new CustomEvent('addTransaction', { detail: txData });
    window.dispatchEvent(event);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('✅ Copied to clipboard!');
    } catch (error) {
      setError('❌ Failed to copy to clipboard');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // ========== ADDITIONAL ADMIN FUNCTIONS ==========
  
  const generateTokenForConsumer = async (aadhaar) => {
    try {
      setActionLoading(prev => ({ ...prev, updatingSystem: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=generate-token-consumer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ Token generated successfully for consumer ${aadhaar}!`);
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Generate Token',
          details: `Generated token for consumer ${aadhaar}`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
      } else {
        setError('❌ Failed to generate token: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error generating token: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, updatingSystem: false }));
    }
  };

  const deactivateUser = async (userType, identifier) => {
    try {
      setActionLoading(prev => ({ ...prev, updatingSystem: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=deactivate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, identifier })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ ${userType} deactivated successfully!`);
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Deactivate User',
          details: `Deactivated ${userType}`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
        
        // Refresh users
        fetchUsers();
      } else {
        setError('❌ Failed to deactivate user: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error deactivating user: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, updatingSystem: false }));
    }
  };

  const reactivateUser = async (userType, identifier) => {
    try {
      setActionLoading(prev => ({ ...prev, updatingSystem: true }));
      setError('');
      
      const response = await fetch('/api/admin?endpoint=reactivate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, identifier })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ ${userType} reactivated successfully!`);
        addTransactionToMonitor({
          hash: data.txHash,
          type: 'Reactivate User',
          details: `Reactivated ${userType}`,
          status: 'pending',
          polygonScanUrl: data.polygonScanUrl
        });
        
        // Refresh users
        fetchUsers();
      } else {
        setError('❌ Failed to reactivate user: ' + data.error);
      }
    } catch (error) {
      setError('❌ Error reactivating user: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, updatingSystem: false }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Connecting to backend wallet...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                PDS Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Indian Public Distribution System - Blockchain Powered
              </p>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Backend Connected' : 'Backend Disconnected'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Wallet className="h-4 w-4 mr-1 text-gray-500" />
                  <span className="text-sm text-gray-600 font-mono">
                    {formatAddress(adminWalletAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(adminWalletAddress)}
                    className="ml-1 h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => fetchAllDashboardData()}
                disabled={refreshing}
                variant="outline"
              >
                {refreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <a
                href={`https://amoy.polygonscan.com/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Contract
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-7xl">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <div className="text-red-700" dangerouslySetInnerHTML={{ __html: error }} />
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 max-w-7xl">
            <div className="flex">
              <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
              <div className="text-green-700" dangerouslySetInnerHTML={{ __html: success }} />
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tokens">Token Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="deliveries">Delivery Management</TabsTrigger>
            <TabsTrigger value="payments">Payment Analytics</TabsTrigger>
            <TabsTrigger value="settings">System Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Consumers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.totalConsumers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Registered beneficiaries
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Shopkeepers</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.totalShopkeepers.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Active distribution points
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Delivery Agents</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.totalDeliveryAgents.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Active delivery personnel
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Badge 
                        variant={dashboardData.systemStatus === 'Active' ? 'default' : 'destructive'}
                        className="text-sm"
                      >
                        {dashboardData.systemStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current operational status
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Button
                    onClick={generateMonthlyTokensForAll}
                    disabled={actionLoading.generateMonthlyTokens}
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    {actionLoading.generateMonthlyTokens ? (
                      <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                    ) : (
                      <Package className="h-5 w-5 mb-2" />
                    )}
                    Generate Monthly Tokens
                  </Button>

                  <Button
                    onClick={() => setAssignAgentForm({ ...assignAgentForm, showDialog: true })}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Link2 className="h-5 w-5 mb-2" />
                    Assign Delivery Agent
                  </Button>

                  <Button
                    onClick={() => router.push('/admin/consumer-requests')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <UserPlus className="h-5 w-5 mb-2" />
                    Consumer Requests
                  </Button>

                  <Button
                    onClick={expireOldTokens}
                    disabled={actionLoading.expireOldTokens}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    {actionLoading.expireOldTokens ? (
                      <RefreshCw className="h-5 w-5 animate-spin mb-2" />
                    ) : (
                      <Clock className="h-5 w-5 mb-2" />
                    )}
                    Expire Old Tokens
                  </Button>

                  <Button
                    onClick={() => setActiveTab('settings')}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Settings className="h-5 w-5 mb-2" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Consumer Categories</CardTitle>
                  <CardDescription>Distribution by ration card type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(consumersByCategory).map(([category, consumers]) => (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-3 bg-blue-500" />
                          <span className="font-medium">{category}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">{consumers.length}</span>
                          <Button
                            onClick={() => generateCategoryTokens(category)}
                            disabled={actionLoading.generateCategoryTokens}
                            size="sm"
                            variant="outline"
                          >
                            {actionLoading.generateCategoryTokens ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              'Generate Tokens'
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Deliveries</CardTitle>
                  <CardDescription>Current delivery operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{activeDeliveries.length}</div>
                  <p className="text-sm text-gray-600 mb-4">Deliveries in progress</p>
                  <Button
                    onClick={() => setActiveTab('deliveries')}
                    variant="outline"
                    size="sm"
                  >
                    View All Deliveries
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Token Management Tab */}
          <TabsContent value="tokens" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Token Generation */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Token Generation</CardTitle>
                  <CardDescription>Generate tokens for all eligible consumers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={generateMonthlyTokensForAll}
                    disabled={actionLoading.generateMonthlyTokens}
                    className="w-full"
                  >
                    {actionLoading.generateMonthlyTokens ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Package className="h-4 w-4 mr-2" />
                    )}
                    Generate Monthly Tokens
                  </Button>
                  <p className="text-xs text-gray-600">
                    This will generate tokens for all consumers who haven't received tokens this month
                  </p>
                </CardContent>
              </Card>

              {/* Category-wise Generation */}
              <Card>
                <CardHeader>
                  <CardTitle>Category-wise Generation</CardTitle>
                  <CardDescription>Generate tokens by ration card category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {['BPL', 'APL', 'AAY', 'PHH'].map((category) => (
                    <Button
                      key={category}
                      onClick={() => generateCategoryTokens(category)}
                      disabled={actionLoading.generateCategoryTokens}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      {actionLoading.generateCategoryTokens ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      {category} Category ({consumersByCategory[category]?.length || 0})
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Bulk Operations */}
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Operations</CardTitle>
                  <CardDescription>Advanced token management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={() => setBulkTokenForm({ ...bulkTokenForm, showDialog: true })}
                    variant="outline"
                    className="w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Bulk Generate Tokens
                  </Button>
                  
                  <Button
                    onClick={expireOldTokens}
                    disabled={actionLoading.expireOldTokens}
                    variant="outline"
                    className="w-full"
                  >
                    {actionLoading.expireOldTokens ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Expire Old Tokens
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Consumers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Consumers</span>
                    <Badge>{allConsumers.length}</Badge>
                  </CardTitle>
                  <CardDescription>Registered beneficiaries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(consumersByCategory).map(([category, consumers]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span>{category}:</span>
                        <span className="font-medium">{consumers.length}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => router.push('/admin/consumers')}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Consumers
                  </Button>
                </CardContent>
              </Card>

              {/* Shopkeepers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Shopkeepers</span>
                    <Badge>{allShopkeepers.length}</Badge>
                  </CardTitle>
                  <CardDescription>Distribution points</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-green-600">
                        {allShopkeepers.filter(s => s.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inactive:</span>
                      <span className="font-medium text-red-600">
                        {allShopkeepers.filter(s => !s.isActive).length}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/admin/shopkeepers')}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Building className="h-4 w-4 mr-2" />
                    Manage Shopkeepers
                  </Button>
                </CardContent>
              </Card>

              {/* Delivery Agents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Delivery Agents</span>
                    <Badge>{allDeliveryAgents.length}</Badge>
                  </CardTitle>
                  <CardDescription>Delivery personnel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium text-green-600">
                        {allDeliveryAgents.filter(a => a.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inactive:</span>
                      <span className="font-medium text-red-600">
                        {allDeliveryAgents.filter(a => !a.isActive).length}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/admin/delivery-agents')}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Manage Agents
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Delivery Management Tab */}
          <TabsContent value="deliveries" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assign Delivery Agent */}
              <Card>
                <CardHeader>
                  <CardTitle>Assign Delivery Agent</CardTitle>
                  <CardDescription>Assign delivery agents to shopkeepers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setAssignAgentForm({ ...assignAgentForm, showDialog: true })}
                    className="w-full"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Assign Agent to Shopkeeper
                  </Button>
                </CardContent>
              </Card>

              {/* Active Deliveries */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Deliveries</CardTitle>
                  <CardDescription>Monitor ongoing deliveries</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-4">{activeDeliveries.length}</div>
                  <p className="text-sm text-gray-600 mb-4">Deliveries in progress</p>
                  <Button
                    onClick={() => router.push('/admin/deliveries')}
                    variant="outline"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View All Deliveries
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Analytics Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {paymentAnalytics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Total Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{paymentAnalytics.totalPayments || 0}</div>
                      <p className="text-sm text-gray-600">Completed transactions</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Total Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatCurrency(paymentAnalytics.totalAmount || 0)}
                      </div>
                      <p className="text-sm text-gray-600">Total processed</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{paymentAnalytics.pendingPayments || 0}</div>
                      <p className="text-sm text-gray-600">Awaiting processing</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>Access detailed payment analytics and management</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => router.push('/admin/payments')}
                  className="w-full"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Payment Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Price Settings</CardTitle>
                  <CardDescription>Configure ration pricing and subsidies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Ration Price (₹ per kg)</label>
                    <Input
                      type="number"
                      value={priceSettings.rationPrice}
                      onChange={(e) => setPriceSettings(prev => ({ ...prev, rationPrice: e.target.value }))}
                      placeholder="Enter price"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Subsidy Percentage (%)</label>
                    <Input
                      type="number"
                      value={priceSettings.subsidyPercentage}
                      onChange={(e) => setPriceSettings(prev => ({ ...prev, subsidyPercentage: e.target.value }))}
                      placeholder="Enter percentage"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={setRationPrice}
                      disabled={actionLoading.settingPrice}
                      className="flex-1"
                    >
                      {actionLoading.settingPrice ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <DollarSign className="h-4 w-4 mr-2" />
                      )}
                      Set Price
                    </Button>
                    
                    <Button
                      onClick={setSubsidyPercentage}
                      disabled={actionLoading.settingSubsidy}
                      className="flex-1"
                    >
                      {actionLoading.settingSubsidy ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Gauge className="h-4 w-4 mr-2" />
                      )}
                      Set Subsidy
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Control */}
              <Card>
                <CardHeader>
                  <CardTitle>System Control</CardTitle>
                  <CardDescription>Emergency system controls</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">System Status</h4>
                      <p className="text-sm text-gray-600">Current operational status</p>
                    </div>
                    <Badge 
                      variant={dashboardData.systemStatus === 'Active' ? 'default' : 'destructive'}
                    >
                      {dashboardData.systemStatus}
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={pauseSystem}
                      disabled={actionLoading.pauseSystem || dashboardData.systemStatus === 'Paused'}
                      variant="destructive"
                      className="flex-1"
                    >
                      {actionLoading.pauseSystem ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Pause className="h-4 w-4 mr-2" />
                      )}
                      Pause System
                    </Button>
                    
                    <Button
                      onClick={unpauseSystem}
                      disabled={actionLoading.unpauseSystem || dashboardData.systemStatus === 'Active'}
                      className="flex-1"
                    >
                      {actionLoading.unpauseSystem ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Resume System
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Blockchain and contract details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Contract Address:</span>
                    <div className="flex items-center mt-1">
                      <span className="font-mono text-xs">
                        {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS)}
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">Admin Wallet:</span>
                    <div className="flex items-center mt-1">
                      <span className="font-mono text-xs">{adminWalletAddress}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(adminWalletAddress)}
                        className="ml-2 h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium">Network:</span>
                    <p className="text-xs mt-1">Polygon Amoy Testnet</p>
                  </div>
                  
                  <div>
                    <span className="font-medium">Connection Status:</span>
                    <div className="flex items-center mt-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-xs">{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        
        {/* Assign Delivery Agent Dialog */}
        <Dialog open={assignAgentForm.showDialog} onOpenChange={(open) => 
          setAssignAgentForm({ ...assignAgentForm, showDialog: open })
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Delivery Agent to Shopkeeper</DialogTitle>
              <DialogDescription>
                Select a delivery agent and shopkeeper to create an assignment
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Delivery Agent</label>
                <Select
                  value={assignAgentForm.deliveryAgent}
                  onValueChange={(value) => setAssignAgentForm(prev => ({ ...prev, deliveryAgent: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select delivery agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDeliveryAgents.map((agent, index) => (
                      <SelectItem 
                        key={agent.agentAddress || agent.address || `agent-${index}`} 
                        value={agent.agentAddress || agent.address}
                      >
                        {agent.name} ({formatAddress(agent.agentAddress || agent.address)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Shopkeeper</label>
                <Select
                  value={assignAgentForm.shopkeeper}
                  onValueChange={(value) => setAssignAgentForm(prev => ({ ...prev, shopkeeper: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shopkeeper" />
                  </SelectTrigger>
                  <SelectContent>
                    {allShopkeepers.map((shopkeeper, index) => (
                      <SelectItem 
                        key={shopkeeper.address || shopkeeper.shopkeeperAddress || `shopkeeper-${index}`} 
                        value={shopkeeper.address || shopkeeper.shopkeeperAddress}
                      >
                        {shopkeeper.name} ({formatAddress(shopkeeper.address || shopkeeper.shopkeeperAddress)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignAgentForm({ deliveryAgent: '', shopkeeper: '', showDialog: false })}
              >
                Cancel
              </Button>
              <Button
                onClick={assignDeliveryAgentToShopkeeper}
                disabled={actionLoading.assigningAgent}
              >
                {actionLoading.assigningAgent ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Assign Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Token Generation Dialog */}
        <Dialog open={bulkTokenForm.showDialog} onOpenChange={(open) => 
          setBulkTokenForm({ ...bulkTokenForm, showDialog: open })
        }>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Generate Tokens</DialogTitle>
              <DialogDescription>
                Enter Aadhaar numbers separated by commas to generate tokens in bulk
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Aadhaar Numbers</label>
                <textarea
                  className="w-full h-32 p-3 border rounded-md resize-none"
                  value={bulkTokenForm.aadhaars}
                  onChange={(e) => setBulkTokenForm(prev => ({ ...prev, aadhaars: e.target.value }))}
                  placeholder="Enter Aadhaar numbers separated by commas (e.g., 123456789012, 234567890123, 345678901234)"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {bulkTokenForm.aadhaars.split(',').filter(a => a.trim()).length} Aadhaar numbers
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkTokenForm({ aadhaars: '', showDialog: false })}
              >
                Cancel
              </Button>
              <Button
                onClick={bulkGenerateTokens}
                disabled={actionLoading.bulkGenerateTokens}
              >
                {actionLoading.bulkGenerateTokens ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Package className="h-4 w-4 mr-2" />
                )}
                Generate Tokens
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Monitor */}
        <TransactionMonitor />
      </div>
    </AdminLayout>
  );
}
