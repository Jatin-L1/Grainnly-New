'use client';
import { useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x3329CA690f619bae73b9f36eb43839892D20045f";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// Test ABI with new functions
const TEST_ABI = [
  "function getAllShopkeepers() view returns (address[])",
  "function getAllDeliveryAgents() view returns (address[])", 
  "function getAreaWiseStats() view returns (string[] areas, uint256[] consumerCounts, uint256[] activeShopkeepers, uint256[] tokenDistributed)",
  "function getConsumersNeedingEmergencyHelp() view returns (uint256[])",
  "function getConsumersPaginated(uint256 offset, uint256 limit) view returns (tuple(uint256 aadhaar, string name, string mobile, string category, uint256 registrationTime, address assignedShopkeeper, uint256 totalTokensReceived, uint256 totalTokensClaimed, uint256 lastTokenIssuedTime, bool isActive)[] consumerList, uint256 total)",
  "function getTotalShopkeepers() view returns (uint256)",
  "function getTotalDeliveryAgents() view returns (uint256)",
  "function getTotalConsumers() view returns (uint256)",
  "function getCategoryWiseStats() view returns (string[] categories, uint256[] consumerCounts, uint256[] rationAmounts)"
];

export default function FunctionTest() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testFunction = async (functionName, args = []) => {
    try {
      setLoading(true);
      console.log(`🧪 Testing ${functionName}...`);
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, TEST_ABI, provider);
      
      const result = await contract[functionName](...args);
      console.log(`✅ ${functionName} result:`, result);
      
      setResults(prev => ({
        ...prev,
        [functionName]: {
          success: true,
          data: result.toString(),
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      
    } catch (error) {
      console.error(`❌ ${functionName} failed:`, error);
      setResults(prev => ({
        ...prev,
        [functionName]: {
          success: false,
          error: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testAllFunctions = async () => {
    const functions = [
      'getTotalShopkeepers',
      'getTotalDeliveryAgents', 
      'getTotalConsumers',
      'getAllShopkeepers',
      'getAllDeliveryAgents',
      'getCategoryWiseStats',
      'getAreaWiseStats',
      'getConsumersNeedingEmergencyHelp',
      ['getConsumersPaginated', [0, 10]]
    ];

    for (const func of functions) {
      if (Array.isArray(func)) {
        await testFunction(func[0], func[1]);
      } else {
        await testFunction(func);
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Diamond Contract Function Test
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-2">Contract Address: <code className="bg-gray-100 px-2 py-1 rounded">{CONTRACT_ADDRESS}</code></p>
            <p className="text-gray-600">Testing all newly deployed functions...</p>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={testAllFunctions}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? '🔄 Testing...' : '🚀 Test All Functions'}
            </button>
            
            <button
              onClick={() => setResults({})}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              🗑️ Clear Results
            </button>
          </div>

          <div className="space-y-4">
            {Object.entries(results).map(([functionName, result]) => (
              <div key={functionName} className={`p-4 rounded-lg border-l-4 ${
                result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {result.success ? '✅' : '❌'} {functionName}()
                  </h3>
                  <span className="text-sm text-gray-500">{result.timestamp}</span>
                </div>
                
                {result.success ? (
                  <div className="text-sm">
                    <p className="text-green-700 font-medium">Success!</p>
                    <pre className="mt-2 bg-green-100 p-3 rounded text-xs overflow-x-auto">
                      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-red-700 font-medium">Error:</p>
                    <p className="mt-1 text-red-600">{result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {Object.keys(results).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No tests run yet</p>
              <p className="text-sm">Click "Test All Functions" to begin testing your deployed contract</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
