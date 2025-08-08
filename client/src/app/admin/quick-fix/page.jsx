"use client";

import { useState } from 'react';

export default function QuickSyncPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Direct sync for Amit Kumar from mockdata
  const syncAmitKumar = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin?endpoint=sync-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aadhaar: '345678901234' }),
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

  // Manual sync function that doesn't rely on blockchain
  const manualSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin?endpoint=manual-sync-consumer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          aadhaar: '345678901234',
          name: 'Amit Kumar',
          phone: '8699000919',
          category: 'BPL',
          village: 'Village Sundarpur'
        }),
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
      <h1 className="text-2xl font-bold mb-6">Quick Fix for Amit Kumar Login</h1>
      
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <div className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
            <h3 className="font-semibold text-yellow-800">Issue:</h3>
            <p className="text-yellow-700 text-sm">
              Aadhaar 345678901234 (Amit Kumar) can't login because it exists on blockchain but not in database.
            </p>
          </div>

          <button
            onClick={syncAmitKumar}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Syncing...' : 'Try Blockchain Sync'}
          </button>

          <div className="text-center text-gray-500">OR</div>

          <button
            onClick={manualSync}
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Manual Database Entry (Recommended)'}
          </button>

          {result && (
            <div className={`mt-4 p-4 rounded-md ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <div>
                  <h3 className="font-semibold text-green-800">✅ Success!</h3>
                  <p className="text-green-700">{result.message}</p>
                  <div className="mt-2 p-2 bg-green-100 rounded text-sm">
                    <strong>Login Credentials:</strong><br/>
                    Aadhaar: 345678901234<br/>
                    PIN: 123456
                  </div>
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
      </div>

      <div className="mt-6 bg-gray-50 p-4 rounded-md text-sm">
        <h3 className="font-semibold mb-2">What's happening:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Blockchain Sync:</strong> Tries to fetch data from blockchain and create database record</li>
          <li><strong>Manual Entry:</strong> Creates database record directly from known mockdata</li>
          <li>Both will allow Amit Kumar to login with PIN: 123456</li>
        </ul>
      </div>
    </div>
  );
}
