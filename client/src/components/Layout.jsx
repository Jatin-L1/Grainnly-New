'use client';
import Link from 'next/link';
import { useMetaMask } from '@/components/MetaMaskProvider';
import { useState, useEffect } from 'react';

export default function Layout({ children }) {
  const { connected, connecting, provider, account, connect } = useMetaMask();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-600 text-white shadow">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">🔗 Grainlyyy</Link>
          
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="hover:text-indigo-200">Home</Link>
              <Link href="/admin" className="hover:text-indigo-200">Admin</Link>
              <Link href="/dealer" className="hover:text-indigo-200">Dealer</Link>
              <Link href="/public" className="hover:text-indigo-200">Public</Link>
              <Link href="/depot" className="hover:text-indigo-200">Depot</Link>
            </nav>
            
            {connected ? (
              <div className="px-3 py-1 bg-indigo-700 rounded-lg text-sm">
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connected'}
              </div>
            ) : (
              <button 
                onClick={handleConnect}
                className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100"
              >
                {provider ? 'Connect Wallet' : 'Install MetaMask'}
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <footer className="bg-gray-100 text-gray-600">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <p>&copy; 2025 Grainlyyy. All rights reserved.</p>
            <p className="mt-2 text-sm">Making Public Distribution Transparent and Verifiable</p>
          </div>
        </div>
      </footer>
    </div>
  );
}