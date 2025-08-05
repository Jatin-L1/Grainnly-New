"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const initProvider = async () => {
      try {
        if (typeof window !== "undefined" && window.ethereum) {
          const ethProvider = window.ethereum;
          
          // Request account access
          const accounts = await ethProvider.request({ method: "eth_requestAccounts" });
          const address = accounts[0];
          setAccount(address);
          
          // Create ethers provider
          const provider = new ethers.BrowserProvider(ethProvider);
          setProvider(provider);
          setIsConnected(true);

          // Handle account changes
          window.ethereum.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
              setAccount(accounts[0]);
            } else {
              setIsConnected(false);
              setAccount(null);
            }
          });

          // Handle chain changes
          window.ethereum.on("chainChanged", () => {
            window.location.reload();
          });
        } 
      } catch (error) {
        console.error("Error initializing provider:", error);
        setError("Failed to connect wallet. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    initProvider();

    return () => {
      // Clean up listeners
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
        window.ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  const connect = async () => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Create ethers provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);
      } else {
        setError("MetaMask is not installed");
      }
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      setError(error.message || "Failed to connect to wallet");
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAccount(null);
    setProvider(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isConnected,
        provider,
        account,
        userId,
        setUserId,
        error,
        loading,
        connect,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}