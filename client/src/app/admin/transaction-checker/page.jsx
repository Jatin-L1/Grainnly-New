import { useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';

export default function TransactionChecker() {
  const [txHash, setTxHash] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkTransaction = async () => {
    if (!txHash) {
      alert('Please enter a transaction hash');
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/check-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txHash }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-900">Transaction Status Checker</h1>
          <p className="text-muted-foreground">
            Check the status of blockchain transactions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              onClick={checkTransaction}
              disabled={checking || !txHash}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-2"
            >
              {checking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  Checking...
                </>
              ) : (
                <>
                  🔍 Check Transaction
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="mt-6 p-4 border rounded-lg">
              <h3 className="text-lg font-semibold mb-3">
                {result.success ? '✅ Result' : '❌ Error'}
              </h3>

              {result.success ? (
                <div className="space-y-2">
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      result.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      result.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {result.status}
                    </span>
                  </p>
                  <p><strong>Message:</strong> {result.message}</p>
                  {result.blockNumber && <p><strong>Block Number:</strong> {result.blockNumber}</p>}
                  {result.gasUsed && <p><strong>Gas Used:</strong> {Number(result.gasUsed).toLocaleString()}</p>}
                  {result.effectiveGasPrice && (
                    <p><strong>Gas Price:</strong> {(Number(result.effectiveGasPrice) / 1e9).toFixed(2)} Gwei</p>
                  )}
                  {result.explorerUrl && (
                    <p>
                      <a 
                        href={result.explorerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        📊 View on PolygonScan
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p><strong>Error:</strong> {result.error}</p>
                  {result.message && <p><strong>Details:</strong> {result.message}</p>}
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded">
                <strong>Raw Response:</strong>
                <pre className="text-xs mt-1 overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 Usage Instructions</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Enter a transaction hash from a recent consumer registration</li>
            <li>• Click "Check Transaction" to see the current status</li>
            <li>• Status can be: <strong>confirmed</strong>, <strong>failed</strong>, or <strong>pending</strong></li>
            <li>• Use this tool to verify if transactions that timed out actually completed</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
