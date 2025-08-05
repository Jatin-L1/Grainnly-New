"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useMetaMask } from "@/components/MetaMaskProvider"

export function MetaMaskConnect({ onConnect }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const { connected, account, connect } = useMetaMask()

  useEffect(() => {
    // Check if MetaMask is installed
    const checkMetaMaskInstalled = () => {
      const { ethereum } = window
      setIsMetaMaskInstalled(!!ethereum && !!ethereum.isMetaMask)
    }

    checkMetaMaskInstalled()
  }, [])

  // When account changes, notify the parent component
  useEffect(() => {
    if (account && connected) {
      onConnect(account)
    }
  }, [account, connected, onConnect])

  const connectWallet = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Use the connect function from MetaMaskProvider
      const address = await connect()
      
      if (!address) {
        setError("Failed to connect. Please try again.")
      }
    } catch (err) {
      console.error("Error connecting to MetaMask:", err)
      setError(err.message || "Failed to connect to MetaMask. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className="space-y-4">
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
        >
          {error}
        </motion.div>
      )}

      {!isMetaMaskInstalled && !connected && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-md text-sm">
          MetaMask is not installed. Please{" "}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            install MetaMask
          </a>{" "}
          to continue.
        </div>
      )}

      {!connected ? (
        <Button
          onClick={connectWallet}
          disabled={isLoading || !isMetaMaskInstalled}
          className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z"
                  fill="#E2761B"
                  stroke="#E2761B"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.04184 1L15.0487 10.809L12.7336 4.99098L2.04184 1Z"
                  fill="#E4761B"
                  stroke="#E4761B"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* SVG paths shortened for brevity */}
              </svg>
              Connect with MetaMask
            </>
          )}
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z"
                fill="#E2761B"
                stroke="#E2761B"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* SVG paths shortened for brevity */}
            </svg>
            <span className="font-medium">Connected: {formatAddress(account)}</span>
          </div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </motion.div>
      )}
    </div>
  )
}