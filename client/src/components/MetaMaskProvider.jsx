'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const MetaMaskContext = createContext(null);

export function MetaMaskProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  
  useEffect(() => {
    // Check if window is defined (browser environment)
    if (typeof window === 'undefined') return;
    
    // Check if ethereum is available (MetaMask is installed)
    const ethereum = window.ethereum;
    if (!ethereum) {
      console.warn('MetaMask not installed');
      return;
    }

    setProvider(ethereum);
    
    // Initial connection check
    const checkConnection = async () => {
      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        const chain = await ethereum.request({ method: 'eth_chainId' });
        
        console.log("MetaMask check: accounts=", accounts, "chainId=", chain);
        setConnected(accounts.length > 0);
        setAccount(accounts[0] || null);
        setChainId(chain);
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };
    
    checkConnection();
    
    // Setup event listeners
    ethereum.on('accountsChanged', (accounts) => {
      console.log("MetaMask accounts changed:", accounts);
      setConnected(accounts.length > 0);
      setAccount(accounts[0] || null);
    });
    
    ethereum.on('chainChanged', (chainId) => {
      console.log("MetaMask chain changed:", chainId);
      setChainId(chainId);
    });
    
    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', () => {});
        ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);
  
  const connect = async () => {
    console.log("Connect function called");
    if (!provider) {
      console.error("No provider available");
      return null;
    }
    
    try {
      console.log("Requesting accounts...");
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      console.log("Accounts received:", accounts);
      
      setConnected(accounts.length > 0);
      setAccount(accounts[0]);
      return accounts[0];
    } catch (error) {
      console.error('User rejected connection', error);
      return null;
    }
  };
  
  const disconnect = () => {
    // We can't force MetaMask to disconnect, but we can reset our app state
    setConnected(false);
    setAccount(null);
    
    // Log the disconnection
    console.log("User disconnected from application");
    
    // LocalStorage cleanup if you're storing any wallet-related data
    localStorage.removeItem('Grainlyyy-connected-account');
    
    return true;
  };
  
  console.log("MetaMask Provider state:", { connected, account: account?.slice(0,6) });
  
  return (
    <MetaMaskContext.Provider value={{
      connected,
      provider,
      account,
      chainId,
      connect,
      disconnect
    }}>
      {children}
    </MetaMaskContext.Provider>
  );
}

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (!context) {
    throw new Error('useMetaMask must be used within MetaMaskProvider');
  }
  return context;
}