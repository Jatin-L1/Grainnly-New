'use client';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMetaMask } from '@/components/MetaMaskProvider';

export default function Login() {
  const { connected, provider, connect, disconnect } = useMetaMask();
  const [connecting, setConnecting] = useState(false);
  const [userType, setUserType] = useState(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await connect();
    } catch (error) {
      console.error('Error connecting to MetaMask', error);
    } finally {
      setConnecting(false);
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>Grainlyyy - Public Distribution Tracker</title>
        <meta name="description" content="Blockchain-based ration delivery tracking system" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          🔗 Grainlyyy
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl">
          A blockchain-based system designed to make the government's ration delivery system 
          transparent, tamper-proof, and publicly verifiable.
        </p>

        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-semibold mb-6">Select Your Role</h2>
          
          {!connected ? (
            <button 
              onClick={handleConnect}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <>
              <div className="space-y-4">
                <Link href="/admin" className="block w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Government/Admin Dashboard
                </Link>
                <Link href="/dealer" className="block w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Dealer Dashboard
                </Link>
                <Link href="/public" className="block w-full py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                  Public/NGO Dashboard
                </Link>
                <Link href="/depot" className="block w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  Depot Dashboard
                </Link>
              </div>
              
              {/* Sign Out Button */}
              <button 
                onClick={handleDisconnect}
                className="w-full py-3 mt-8 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="mt-10 py-4 border-t text-center text-gray-500">
        <p>Grainlyyy - Making Public Distribution Transparent</p>
      </footer>
    </div>
  )
}