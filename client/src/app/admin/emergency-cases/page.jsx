// 'use client';
// import { useState, useEffect } from 'react';
// import AdminLayout from '@/components/AdminLayout';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Input } from "@/components/ui/input";
// import { AlertTriangle, Search, RefreshCw, Phone, User, Calendar, Package, Zap } from "lucide-react";

// export default function EmergencyCases() {
//   const [emergencyCases, setEmergencyCases] = useState([]);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');

//   useEffect(() => {
//     fetchEmergencyCases();
//   }, []);

//   const fetchEmergencyCases = async () => {
//     try {
//       setRefreshing(true);
//       const response = await fetch('/api/admin?endpoint=emergency-cases');
//       const data = await response.json();
      
//       if (data.success) {
//         setEmergencyCases(data.data);
//       } else {
//         setError('Failed to load emergency cases: ' + data.error);
//       }
//     } catch (error) {
//       console.error('Error fetching emergency cases:', error);
//       setError('Failed to fetch emergency cases from blockchain');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const generateTokenForConsumer = async (aadhaar) => {
//     try {
//       setLoading(true);
      
//       const response = await fetch('/api/admin?endpoint=generate-token-consumer', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ aadhaar }),
//       });

//       const data = await response.json();
      
//       if (data.success) {
//         // Add transaction to monitor
//         const event = new CustomEvent('addTransaction', { 
//           detail: {
//             hash: data.txHash,
//             type: 'Emergency Token Generation',
//             details: `Token for Aadhaar: ${aadhaar}`,
//             polygonScanUrl: data.polygonScanUrl
//           }
//         });
//         window.dispatchEvent(event);

//         setSuccess(`✅ Emergency token generated for Aadhaar ${aadhaar}! View on <a href="${data.polygonScanUrl}" target="_blank" class="underline">PolygonScan ↗</a>`);
        
//         // Refresh emergency cases after some time
//         setTimeout(() => {
//           fetchEmergencyCases();
//         }, 15000);
//       } else {
//         setError(`❌ Failed to generate token: ${data.error}`);
//       }
//     } catch (error) {
//       console.error('Error generating token:', error);
//       setError('Failed to generate emergency token');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filteredCases = emergencyCases.filter(consumer => 
//     consumer.aadhaar.toString().includes(searchTerm) ||
//     consumer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     consumer.mobile.includes(searchTerm)
//   );

//   const formatDate = (timestamp) => {
//     return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   if (loading && emergencyCases.length === 0) {
//     return (
//       <AdminLayout>
//         <div className="container mx-auto p-6">
//           <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
//             <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
//             <p>Loading emergency cases from blockchain...</p>
//           </div>
//         </div>
//       </AdminLayout>
//     );
//   }

//   return (
//     <AdminLayout>
//       <div className="container mx-auto p-6">
//         <div className="flex flex-col gap-2 mb-6">
//           <div className="flex justify-between items-center">
//             <div>
//               <h1 className="text-3xl font-bold text-green-900">Emergency Cases</h1>
//               <p className="text-muted-foreground">
//                 Consumers needing immediate assistance and emergency token generation
//               </p>
//             </div>
//             <button
//               onClick={fetchEmergencyCases}
//               disabled={refreshing}
//               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
//             >
//               <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
//               Refresh
//             </button>
//           </div>
//         </div>

//         {/* Error/Success Messages */}
//         {error && (
//           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//             <div dangerouslySetInnerHTML={{ __html: error }} />
//             <button 
//               onClick={() => setError('')}
//               className="float-right text-red-700 hover:text-red-900"
//             >
//               ×
//             </button>
//           </div>
//         )}

//         {success && (
//           <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
//             <div dangerouslySetInnerHTML={{ __html: success }} />
//             <button 
//               onClick={() => setSuccess('')}
//               className="float-right text-green-700 hover:text-green-900"
//             >
//               ×
//             </button>
//           </div>
//         )}

//         {/* Alert Banner */}
//         <Card className="border-red-200 bg-red-50 mb-6">
//           <CardContent className="p-6">
//             <div className="flex items-center gap-3">
//               <AlertTriangle className="h-6 w-6 text-red-600" />
//               <div>
//                 <h3 className="font-semibold text-red-800">Emergency Alert System</h3>
//                 <p className="text-sm text-red-700">
//                   This page shows consumers who need immediate assistance. These cases require urgent action.
//                 </p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Summary Stats */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
//           <Card className="border-red-100">
//             <CardContent className="p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Total Emergency Cases</p>
//                   <p className="text-2xl font-bold text-red-600">{emergencyCases.length}</p>
//                 </div>
//                 <AlertTriangle className="h-8 w-8 text-red-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card className="border-orange-100">
//             <CardContent className="p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Critical Cases</p>
//                   <p className="text-2xl font-bold text-orange-600">
//                     {emergencyCases.filter(c => !c.hasCurrentMonthToken).length}
//                   </p>
//                 </div>
//                 <Package className="h-8 w-8 text-orange-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card className="border-yellow-100">
//             <CardContent className="p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">BPL Category</p>
//                   <p className="text-2xl font-bold text-yellow-600">
//                     {emergencyCases.filter(c => c.category === 'BPL').length}
//                   </p>
//                 </div>
//                 <User className="h-8 w-8 text-yellow-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card className="border-purple-100">
//             <CardContent className="p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Long Overdue</p>
//                   <p className="text-2xl font-bold text-purple-600">
//                     {emergencyCases.filter(c => 
//                       Date.now() - (c.lastTokenIssuedTime * 1000) > (60 * 24 * 60 * 60 * 1000)
//                     ).length}
//                   </p>
//                 </div>
//                 <Calendar className="h-8 w-8 text-purple-600" />
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Search */}
//         <Card className="border-green-100 mb-6">
//           <CardContent className="p-6">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//               <Input
//                 placeholder="Search by Aadhaar number, name, or mobile..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         {/* Emergency Cases List */}
//         <Card className="border-green-100">
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <AlertTriangle className="h-5 w-5 text-red-600" />
//               Emergency Cases Requiring Immediate Action ({filteredCases.length})
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             {filteredCases.length === 0 ? (
//               <div className="text-center py-8">
//                 {emergencyCases.length === 0 ? (
//                   <>
//                     <AlertTriangle className="mx-auto h-12 w-12 text-green-400 mb-4" />
//                     <p className="text-green-600 font-medium">No Emergency Cases! 🎉</p>
//                     <p className="text-sm text-gray-500 mt-2">
//                       All consumers are up to date with their tokens
//                     </p>
//                   </>
//                 ) : (
//                   <>
//                     <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
//                     <p className="text-gray-500">No emergency cases match your search</p>
//                     <p className="text-sm text-gray-400 mt-2">
//                       Try adjusting your search criteria
//                     </p>
//                   </>
//                 )}
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 {filteredCases.map((consumer, index) => {
//                   const daysSinceLastToken = Math.floor(
//                     (Date.now() - (consumer.lastTokenIssuedTime * 1000)) / (24 * 60 * 60 * 1000)
//                   );
//                   const urgencyLevel = daysSinceLastToken > 60 ? 'critical' : 
//                                      daysSinceLastToken > 30 ? 'high' : 'medium';
                  
//                   return (
//                     <div key={index} className={`border rounded-lg p-6 ${
//                       urgencyLevel === 'critical' ? 'border-red-300 bg-red-50' :
//                       urgencyLevel === 'high' ? 'border-orange-300 bg-orange-50' :
//                       'border-yellow-300 bg-yellow-50'
//                     }`}>
//                       <div className="flex justify-between items-start mb-4">
//                         <div className="flex-1">
//                           <div className="flex items-center gap-3 mb-2">
//                             <h3 className="font-semibold text-lg">{consumer.name}</h3>
//                             <Badge className={
//                               urgencyLevel === 'critical' ? 'bg-red-100 text-red-800' :
//                               urgencyLevel === 'high' ? 'bg-orange-100 text-orange-800' :
//                               'bg-yellow-100 text-yellow-800'
//                             }>
//                               {urgencyLevel.toUpperCase()} PRIORITY
//                             </Badge>
//                             <Badge className={consumer.category === 'BPL' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
//                               {consumer.category}
//                             </Badge>
//                           </div>
                          
//                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
//                             <div className="flex items-center gap-2">
//                               <User className="h-4 w-4 text-gray-500" />
//                               <span className="text-gray-600">Aadhaar:</span>
//                               <code className="bg-white px-2 py-1 rounded">{consumer.aadhaar}</code>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <Phone className="h-4 w-4 text-gray-500" />
//                               <span className="text-gray-600">Mobile:</span>
//                               <span className="font-medium">{consumer.mobile}</span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <Calendar className="h-4 w-4 text-gray-500" />
//                               <span className="text-gray-600">Last Token:</span>
//                               <span className="font-medium">
//                                 {consumer.lastTokenIssuedTime ? formatDate(consumer.lastTokenIssuedTime) : 'Never'}
//                               </span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <Package className="h-4 w-4 text-gray-500" />
//                               <span className="text-gray-600">Days Overdue:</span>
//                               <span className={`font-medium ${
//                                 daysSinceLastToken > 60 ? 'text-red-600' :
//                                 daysSinceLastToken > 30 ? 'text-orange-600' : 'text-yellow-600'
//                               }`}>
//                                 {daysSinceLastToken} days
//                               </span>
//                             </div>
//                           </div>
//                         </div>
                        
//                         <button
//                           onClick={() => generateTokenForConsumer(consumer.aadhaar)}
//                           disabled={loading}
//                           className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2 ml-4"
//                         >
//                           <Zap className="h-4 w-4" />
//                           {loading ? 'Generating...' : 'Generate Emergency Token'}
//                         </button>
//                       </div>
                      
//                       {/* Additional Details */}
//                       <div className="mt-4 pt-4 border-t border-gray-200">
//                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
//                           <div>
//                             <span className="text-gray-600">Total Tokens Received:</span>
//                             <span className="font-medium ml-2">{consumer.totalTokensReceived}</span>
//                           </div>
//                           <div>
//                             <span className="text-gray-600">Total Tokens Claimed:</span>
//                             <span className="font-medium ml-2">{consumer.totalTokensClaimed}</span>
//                           </div>
//                           <div>
//                             <span className="text-gray-600">Registration Date:</span>
//                             <span className="font-medium ml-2">
//                               {formatDate(consumer.registrationTime)}
//                             </span>
//                           </div>
//                         </div>
                        
//                         {consumer.assignedShopkeeper !== '0x0000000000000000000000000000000000000000' && (
//                           <div className="mt-2">
//                             <span className="text-gray-600">Assigned Shopkeeper:</span>
//                             <code className="bg-white px-2 py-1 rounded ml-2 text-xs">
//                               {consumer.assignedShopkeeper.slice(0, 10)}...{consumer.assignedShopkeeper.slice(-8)}
//                             </code>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Emergency Actions */}
//         {emergencyCases.length > 0 && (
//           <Card className="border-green-100 mt-6">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Zap className="h-5 w-5" />
//                 Emergency Actions
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
//                   <h3 className="font-semibold text-red-800 mb-2">Immediate Actions Required</h3>
//                   <ul className="text-sm text-red-700 space-y-1">
//                     <li>• Generate emergency tokens for critical cases (60+ days overdue)</li>
//                     <li>• Contact consumers via phone to verify current status</li>
//                     <li>• Coordinate with assigned shopkeepers for immediate distribution</li>
//                   </ul>
//                 </div>
//                 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                   <h3 className="font-semibold text-blue-800 mb-2">Follow-up Actions</h3>
//                   <ul className="text-sm text-blue-700 space-y-1">
//                     <li>• Monitor token generation status on blockchain</li>
//                     <li>• Verify successful distribution and consumption</li>
//                     <li>• Update consumer records and contact information</li>
//                   </ul>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Footer Info */}
//         <div className="mt-6 text-center text-sm text-gray-500">
//           <p>Emergency data fetched directly from blockchain • Last updated: {new Date().toLocaleString('en-IN')}</p>
//         </div>
//       </div>
//     </AdminLayout>
//   );
// }



'use client';
import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Search, RefreshCw, Phone, User, Calendar, FileText, Play, Volume2 } from "lucide-react";

export default function EmergencyCases() {
  const [emergencyReports, setEmergencyReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchEmergencyReports();
  }, []);

  const fetchEmergencyReports = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('https://grainllyvoiceagent.onrender.com/api/reports');
      const data = await response.json();
      
      if (data.success) {
        setEmergencyReports(data.reports);
      } else {
        setError('Failed to load emergency reports: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching emergency reports:', error);
      setError('Failed to fetch emergency reports from voice agent API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const takeAction = async (reportId) => {
    try {
      setLoading(true);
      
      // Update the report as action taken
      const updatedReports = emergencyReports.map(report => 
        report._id === reportId 
          ? { ...report, actionTaken: true, adminNotes: 'Action taken by admin' }
          : report
      );
      setEmergencyReports(updatedReports);
      
      setSuccess(`✅ Action marked as taken for report ID: ${reportId}`);
      
    } catch (error) {
      console.error('Error taking action:', error);
      setError('Failed to mark action as taken');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = emergencyReports.filter(report => 
    report.aadhaar.toString().includes(searchTerm) ||
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.mobile.includes(searchTerm) ||
    (report.fraudSummary && report.fraudSummary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCallStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'no-answer':
        return 'bg-red-100 text-red-800';
      case 'initiated':
        return 'bg-blue-100 text-blue-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const playRecording = (url) => {
    if (url) {
      const audio = new Audio(url);
      audio.play().catch(err => {
        setError('Failed to play recording: ' + err.message);
      });
    }
  };

  if (loading && emergencyReports.length === 0) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-center p-12 mt-6 bg-white rounded-lg shadow-sm border border-green-100">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
            <p>Loading emergency reports from voice agent...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Group reports by unique consumers
  const uniqueConsumers = emergencyReports.reduce((acc, report) => {
    const key = report.aadhaar;
    if (!acc[key]) {
      acc[key] = {
        aadhaar: report.aadhaar,
        name: report.name,
        mobile: report.mobile,
        reports: []
      };
    }
    acc[key].reports.push(report);
    return acc;
  }, {});

  const consumerList = Object.values(uniqueConsumers);

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-green-900">Emergency Cases</h1>
              <p className="text-muted-foreground">
                Voice complaints and emergency reports from consumers
              </p>
            </div>
            <button
              onClick={fetchEmergencyReports}
              disabled={refreshing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <div dangerouslySetInnerHTML={{ __html: error }} />
            <button 
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            <div dangerouslySetInnerHTML={{ __html: success }} />
            <button 
              onClick={() => setSuccess('')}
              className="float-right text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Alert Banner */}
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Voice Complaint System</h3>
                <p className="text-sm text-red-700">
                  This page shows voice complaints received through the emergency hotline. Review and take action on fraud reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="border-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-red-600">{emergencyReports.length}</p>
                </div>
                <FileText className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Calls</p>
                  <p className="text-2xl font-bold text-green-600">
                    {emergencyReports.filter(r => r.callStatus === 'completed').length}
                  </p>
                </div>
                <Phone className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {emergencyReports.filter(r => r.fraudSeverity === 'high').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Consumers</p>
                  <p className="text-2xl font-bold text-blue-600">{consumerList.length}</p>
                </div>
                <User className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-green-100 mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by Aadhaar number, name, mobile, or complaint summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Reports List */}
        <Card className="border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Emergency Reports ({filteredReports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-8">
                {emergencyReports.length === 0 ? (
                  <>
                    <FileText className="mx-auto h-12 w-12 text-green-400 mb-4" />
                    <p className="text-green-600 font-medium">No Emergency Reports! 🎉</p>
                    <p className="text-sm text-gray-500 mt-2">
                      No voice complaints have been received
                    </p>
                  </>
                ) : (
                  <>
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No reports match your search</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Try adjusting your search criteria
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report, index) => (
                  <div key={report._id} className={`border rounded-lg p-6 ${
                    report.fraudSeverity === 'high' ? 'border-red-300 bg-red-50' :
                    report.fraudSeverity === 'medium' ? 'border-orange-300 bg-orange-50' :
                    'border-yellow-300 bg-yellow-50'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{report.name}</h3>
                          <Badge className={getSeverityColor(report.fraudSeverity)}>
                            {report.fraudSeverity?.toUpperCase() || 'UNKNOWN'} SEVERITY
                          </Badge>
                          <Badge className={getCallStatusColor(report.callStatus)}>
                            {report.callStatus?.toUpperCase()}
                          </Badge>
                          {report.language && (
                            <Badge className="bg-gray-100 text-gray-800">
                              {report.language}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Aadhaar:</span>
                            <code className="bg-white px-2 py-1 rounded">{report.aadhaar}</code>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Mobile:</span>
                            <span className="font-medium">{report.mobile}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Reported:</span>
                            <span className="font-medium">{formatDate(report.createdAt)}</span>
                          </div>
                        </div>

                        {report.completedAt && (
                          <div className="mt-2 text-sm">
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-medium ml-2">{formatDate(report.completedAt)}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {report.playableRecordingUrl && (
                          <button
                            onClick={() => playRecording(report.playableRecordingUrl)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
                            title="Play recording"
                          >
                            <Play className="h-4 w-4" />
                            Play
                          </button>
                        )}
                        
                        {!report.actionTaken && (
                          <button
                            onClick={() => takeAction(report._id)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                          >
                            {loading ? 'Processing...' : 'Take Action'}
                          </button>
                        )}
                        
                        {report.actionTaken && (
                          <Badge className="bg-green-100 text-green-800">
                            Action Taken
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Transcript */}
                    {report.transcript && (
                      <div className="mt-4 p-3 bg-white rounded-md border">
                        <p className="text-sm font-medium text-gray-600 mb-1">Transcript:</p>
                        <p className="text-sm text-gray-900 italic">"{report.transcript}"</p>
                      </div>
                    )}

                    {/* Fraud Summary */}
                    {report.fraudSummary && (
                      <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
                        <p className="text-sm font-medium text-red-800 mb-1">Fraud Analysis:</p>
                        <p className="text-sm text-red-700">{report.fraudSummary}</p>
                      </div>
                    )}

                    {/* Admin Notes */}
                    {report.adminNotes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                        <p className="text-sm font-medium text-blue-800 mb-1">Admin Notes:</p>
                        <p className="text-sm text-blue-700">{report.adminNotes}</p>
                      </div>
                    )}

                    {/* Call Details */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Call SID:</span>
                          <code className="bg-white px-2 py-1 rounded ml-2 text-xs">{report.callSid}</code>
                        </div>
                        {report.recordingUrl && (
                          <div>
                            <span className="text-gray-600">Recording Available:</span>
                            <Badge className="bg-green-100 text-green-800 ml-2">Yes</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Emergency data fetched from Voice Agent API • Last updated: {new Date().toLocaleString('en-IN')}</p>
          <p className="mt-1">API Endpoint: https://grainllyvoiceagent.onrender.com/api/reports</p>
        </div>
      </div>
    </AdminLayout>
  );
}