// 'use client';
// import { useState, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { ExternalLink, CheckCircle, XCircle, Clock, RefreshCw, Copy, Trash2 } from "lucide-react";

// export default function TransactionMonitor() {
//   const [transactions, setTransactions] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     // Load transactions from localStorage on component mount
//     const savedTransactions = localStorage.getItem('admin_transactions');
//     if (savedTransactions) {
//       try {
//         setTransactions(JSON.parse(savedTransactions));
//       } catch (error) {
//         console.error('Error parsing saved transactions:', error);
//         localStorage.removeItem('admin_transactions');
//       }
//     }

//     // Listen for new transactions from other components
//     const handleAddTransaction = (event) => {
//       const txData = event.detail;
//       addTransaction(txData);
//     };

//     window.addEventListener('addTransaction', handleAddTransaction);
//     return () => window.removeEventListener('addTransaction', handleAddTransaction);
//   }, []);

//   const addTransaction = (txData) => {
//     const newTransaction = {
//       hash: txData.hash,
//       type: txData.type,
//       timestamp: Date.now(),
//       status: 'pending',
//       details: txData.details,
//       blockNumber: null,
//       gasUsed: null,
//       polygonScanUrl: txData.polygonScanUrl,
//       ...txData
//     };

//     setTransactions(prev => {
//       const updatedTransactions = [newTransaction, ...prev].slice(0, 50); // Keep only last 50
//       localStorage.setItem('admin_transactions', JSON.stringify(updatedTransactions));
//       return updatedTransactions;
//     });

//     // Start monitoring this transaction
//     monitorTransaction(txData.hash);
//   };

//   const monitorTransaction = async (txHash) => {
//     try {
//       // Wait a bit for transaction to be mined
//       await new Promise(resolve => setTimeout(resolve, 5000));
      
//       // Try to get transaction receipt from Polygon RPC
//       const response = await fetch('https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           jsonrpc: '2.0',
//           method: 'eth_getTransactionReceipt',
//           params: [txHash],
//           id: 1
//         })
//       });
      
//       const data = await response.json();
      
//       if (data.result) {
//         // Transaction successful
//         updateTransactionStatus(txHash, 'success', {
//           blockNumber: parseInt(data.result.blockNumber, 16),
//           gasUsed: parseInt(data.result.gasUsed, 16),
//           status: data.result.status === '0x1' ? 'success' : 'failed'
//         });
//       } else if (data.result === null) {
//         // Transaction not found yet, try again later
//         setTimeout(() => monitorTransaction(txHash), 10000);
//       }
//     } catch (error) {
//       console.error('Error monitoring transaction:', error);
//       updateTransactionStatus(txHash, 'unknown', null);
//     }
//   };

//   const updateTransactionStatus = (txHash, status, receiptData) => {
//     setTransactions(prev => {
//       const updated = prev.map(tx => 
//         tx.hash === txHash 
//           ? { 
//               ...tx, 
//               status: receiptData?.status || status,
//               blockNumber: receiptData?.blockNumber,
//               gasUsed: receiptData?.gasUsed,
//               lastChecked: Date.now()
//             }
//           : tx
//       );
//       localStorage.setItem('admin_transactions', JSON.stringify(updated));
//       return updated;
//     });
//   };

//   const refreshTransaction = async (txHash) => {
//     setLoading(true);
//     await monitorTransaction(txHash);
//     setLoading(false);
//   };

//   const copyToClipboard = (text) => {
//     navigator.clipboard.writeText(text);
//   };

//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'success':
//         return <CheckCircle className="h-4 w-4 text-green-600" />;
//       case 'failed':
//         return <XCircle className="h-4 w-4 text-red-600" />;
//       case 'pending':
//         return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
//       default:
//         return <Clock className="h-4 w-4 text-gray-600" />;
//     }
//   };

//   const getStatusBadge = (status) => {
//     const styles = {
//       success: 'bg-green-100 text-green-800',
//       failed: 'bg-red-100 text-red-800',
//       pending: 'bg-yellow-100 text-yellow-800',
//       unknown: 'bg-gray-100 text-gray-800'
//     };

//     return (
//       <Badge className={styles[status] || styles.unknown}>
//         {status.charAt(0).toUpperCase() + status.slice(1)}
//       </Badge>
//     );
//   };

//   const formatDate = (timestamp) => {
//     return new Date(timestamp).toLocaleString('en-IN', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit'
//     });
//   };

//   const clearTransactions = () => {
//     setTransactions([]);
//     localStorage.removeItem('admin_transactions');
//   };

//   const removeTransaction = (txHash) => {
//     setTransactions(prev => {
//       const updated = prev.filter(tx => tx.hash !== txHash);
//       localStorage.setItem('admin_transactions', JSON.stringify(updated));
//       return updated;
//     });
//   };

//   return (
//     <Card className="border-green-100">
//       <CardHeader>
//         <div className="flex justify-between items-center">
//           <CardTitle className="flex items-center gap-2">
//             <RefreshCw className="h-5 w-5" />
//             Transaction Monitor
//             {transactions.filter(tx => tx.status === 'pending').length > 0 && (
//               <Badge className="bg-yellow-100 text-yellow-800">
//                 {transactions.filter(tx => tx.status === 'pending').length} pending
//               </Badge>
//             )}
//           </CardTitle>
//           <div className="flex gap-2">
//             <button
//               onClick={clearTransactions}
//               className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
//             >
//               Clear All
//             </button>
//           </div>
//         </div>
//       </CardHeader>
//       <CardContent>
//         {transactions.length === 0 ? (
//           <div className="text-center py-8">
//             <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
//             <p className="text-gray-500">No transactions to monitor</p>
//             <p className="text-sm text-gray-400 mt-2">
//               Transactions will appear here when you perform blockchain operations
//             </p>
//           </div>
//         ) : (
//           <div className="space-y-4 max-h-96 overflow-y-auto">
//             {transactions.map((tx, index) => (
//               <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
//                 <div className="flex justify-between items-start mb-3">
//                   <div className="flex items-center gap-2">
//                     {getStatusIcon(tx.status)}
//                     <h3 className="font-semibold text-sm">{tx.type}</h3>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     {getStatusBadge(tx.status)}
//                     <button
//                       onClick={() => refreshTransaction(tx.hash)}
//                       disabled={loading}
//                       className="p-1 hover:bg-gray-200 rounded"
//                       title="Refresh status"
//                     >
//                       <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
//                     </button>
//                     <button
//                       onClick={() => removeTransaction(tx.hash)}
//                       className="p-1 hover:bg-gray-200 rounded"
//                       title="Remove"
//                     >
//                       <Trash2 className="h-3 w-3 text-red-500" />
//                     </button>
//                   </div>
//                 </div>

//                 <div className="space-y-2 text-sm">
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Transaction Hash:</span>
//                     <div className="flex items-center gap-2">
//                       <code className="bg-gray-100 px-2 py-1 rounded text-xs">
//                         {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
//                       </code>
//                       <button
//                         onClick={() => copyToClipboard(tx.hash)}
//                         className="p-1 hover:bg-gray-200 rounded"
//                         title="Copy hash"
//                       >
//                         <Copy className="h-3 w-3" />
//                       </button>
//                       <a
//                         href={tx.polygonScanUrl || `https://amoy.polygonscan.com/tx/${tx.hash}`}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="p-1 hover:bg-gray-200 rounded"
//                         title="View on PolygonScan"
//                       >
//                         <ExternalLink className="h-3 w-3" />
//                       </a>
//                     </div>
//                   </div>

//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Time:</span>
//                     <span className="text-xs">{formatDate(tx.timestamp)}</span>
//                   </div>

//                   {tx.details && (
//                     <div className="flex justify-between items-center">
//                       <span className="text-gray-600">Details:</span>
//                       <span className="text-xs">{tx.details}</span>
//                     </div>
//                   )}

//                   {tx.blockNumber && (
//                     <div className="flex justify-between items-center">
//                       <span className="text-gray-600">Block:</span>
//                       <span className="text-xs">#{tx.blockNumber}</span>
//                     </div>
//                   )}

//                   {tx.gasUsed && (
//                     <div className="flex justify-between items-center">
//                       <span className="text-gray-600">Gas Used:</span>
//                       <span className="text-xs">{tx.gasUsed.toLocaleString()}</span>
//                     </div>
//                   )}

//                   {tx.status === 'failed' && (
//                     <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
//                       <p className="text-red-700 text-xs">
//                         ❌ Transaction failed. Check PolygonScan for details.
//                       </p>
//                     </div>
//                   )}

//                   {tx.status === 'success' && (
//                     <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
//                       <p className="text-green-700 text-xs">
//                         ✅ Transaction completed successfully!
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

// // Hook for other components to add transactions
// export const useTransactionMonitor = () => {
//   const addTransaction = (txData) => {
//     const event = new CustomEvent('addTransaction', { detail: txData });
//     window.dispatchEvent(event);
//   };

//   return { addTransaction };
// };


'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle, XCircle, Clock, RefreshCw, Copy } from "lucide-react";

export default function TransactionMonitor() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load transactions from localStorage on component mount
    const savedTransactions = localStorage.getItem('admin_transactions');
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }

    // Listen for new transactions
    const handleAddTransaction = (event) => {
      const newTransaction = {
        hash: event.detail.hash,
        type: event.detail.type,
        timestamp: Date.now(),
        status: 'pending',
        details: event.detail.details,
        polygonScanUrl: event.detail.polygonScanUrl,
        blockNumber: null,
        gasUsed: null
      };

      setTransactions(prev => {
        const updated = [newTransaction, ...prev].slice(0, 50);
        localStorage.setItem('admin_transactions', JSON.stringify(updated));
        return updated;
      });

      // Start monitoring this transaction
      monitorTransaction(event.detail.hash);
    };

    window.addEventListener('addTransaction', handleAddTransaction);
    return () => window.removeEventListener('addTransaction', handleAddTransaction);
  }, []);

  const monitorTransaction = async (txHash) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Simulate transaction success for demo
      updateTransactionStatus(txHash, 'success', { blockNumber: '12345678', gasUsed: '150000' });
    } catch (error) {
      console.error('Error monitoring transaction:', error);
      updateTransactionStatus(txHash, 'unknown', null);
    }
  };

  const updateTransactionStatus = (txHash, status, receiptData) => {
    setTransactions(prev => {
      const updated = prev.map(tx => 
        tx.hash === txHash 
          ? { 
              ...tx, 
              status, 
              blockNumber: receiptData?.blockNumber,
              gasUsed: receiptData?.gasUsed,
              lastChecked: Date.now()
            }
          : tx
      );
      localStorage.setItem('admin_transactions', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshTransaction = async (txHash) => {
    setLoading(true);
    await monitorTransaction(txHash);
    setLoading(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      unknown: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={styles[status] || styles.unknown}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const clearTransactions = () => {
    setTransactions([]);
    localStorage.removeItem('admin_transactions');
  };

  return (
    <Card className="border-green-100">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Transaction Monitor
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={clearTransactions}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No transactions to monitor</p>
            <p className="text-sm text-gray-400 mt-2">
              Transactions will appear here when you perform blockchain operations
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {transactions.map((tx, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <h3 className="font-semibold text-sm">{tx.type}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(tx.status)}
                    <button
                      onClick={() => refreshTransaction(tx.hash)}
                      disabled={loading}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transaction Hash:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(tx.hash)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <a
                        href={tx.polygonScanUrl || `https://amoy.polygonscan.com/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Time:</span>
                    <span className="text-xs">{formatDate(tx.timestamp)}</span>
                  </div>

                  {tx.details && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Details:</span>
                      <span className="text-xs">{tx.details}</span>
                    </div>
                  )}

                  {tx.blockNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Block:</span>
                      <span className="text-xs">#{tx.blockNumber}</span>
                    </div>
                  )}

                  {tx.gasUsed && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gas Used:</span>
                      <span className="text-xs">{parseInt(tx.gasUsed).toLocaleString()}</span>
                    </div>
                  )}

                  {tx.status === 'failed' && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                      <p className="text-red-700 text-xs">
                        ❌ Transaction failed. Check PolygonScan for details.
                      </p>
                    </div>
                  )}

                  {tx.status === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                      <p className="text-green-700 text-xs">
                        ✅ Transaction completed successfully!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}