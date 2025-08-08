"use client";

import { useState } from 'react';

export default function SyncConsumerPage() {
  const [aadhaar, setAadhaar] = useState('345678901234');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin?endpoint=sync-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aadhaar }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Sync Consumer from Blockchain</h1>
      
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Aadhaar Number
          </label>
          <input
            type="text"
            value={aadhaar}
            onChange={(e) => setAadhaar(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter 12-digit Aadhaar number"
          />
        </div>

        <button
          onClick={handleSync}
          disabled={loading || !aadhaar}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync Consumer'}
        </button>

        {result && (
          <div className={`mt-4 p-4 rounded-md ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {result.success ? (
              <div>
                <h3 className="font-semibold text-green-800">✅ Success!</h3>
                <p className="text-green-700">{result.message}</p>
                {result.instructions && (
                  <p className="text-sm text-green-600 mt-2">
                    {result.instructions}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h3 className="font-semibold text-red-800">❌ Error</h3>
                <p className="text-red-700">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-md">
        <h2 className="font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Enter the Aadhaar number that exists on blockchain but can't login</li>
          <li>Click "Sync Consumer" to create the database record</li>
          <li>Consumer can then login with Aadhaar and PIN: <code className="bg-gray-200 px-1">123456</code></li>
          <li>Advise consumer to change their PIN after first login</li>
        </ol>
      </div>
    </div>
  );
}
