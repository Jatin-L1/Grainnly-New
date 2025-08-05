"use client"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Leaf, AlertCircle, User, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { MetaMaskConnect } from "@/components/metamask-connect"
import { AuthLayout } from "@/components/auth-layout"
import { useMetaMask } from "@/components/MetaMaskProvider"

// Admin address constant
const ADMIN_ADDRESS = "0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa".toLowerCase();

export default function LoginPage() {
  const router = useRouter()
  const { connected, account } = useMetaMask()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [userType, setUserType] = useState(null)
  const [activeTab, setActiveTab] = useState("consumer")
  const [initialLoad, setInitialLoad] = useState(true)

  // Consumer login state
  const [consumerData, setConsumerData] = useState({
    identifier: "", // Can be Aadhar or Ration Card ID
    pin: ""
  })
  const [identifierType, setIdentifierType] = useState("aadhar") // 'aadhar' or 'ration'

  // Mark initial load as complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoad(false)
    }, 1000) // Wait 1 second before allowing auto-redirects

    return () => clearTimeout(timer)
  }, [])

  // Sync wallet state with MetaMask provider
  useEffect(() => {
    console.log("🔄 Wallet state changed - connected:", connected, "account:", account)
    setWalletConnected(connected)
    setWalletAddress(account || "")
    
    // Only auto-redirect if the wallet is connected AND we're past initial load AND not currently loading
    // This prevents the infinite redirect loop
    if (account && connected && !isLoading && !initialLoad) {
      console.log("🚀 Wallet connected, checking user type and redirecting...")
      checkUserTypeAndRedirect(account)
    }
  }, [connected, account, isLoading, initialLoad])

  // Enhanced wallet checking function with comprehensive user type detection
  const checkUserTypeAndRedirect = async (address) => {
    // Prevent multiple simultaneous auth checks
    if (isLoading) {
      console.log("🔄 Auth check already in progress, skipping...")
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("🔍 Checking wallet address:", address)
      
      // Validate wallet address format first
      if (!address || typeof address !== 'string') {
        setError("Invalid wallet address format. Please reconnect your wallet.")
        return
      }
      
      // Check if this is the admin address first
      if (address.toLowerCase() === ADMIN_ADDRESS) {
        console.log("👑 Admin account detected, redirecting to admin dashboard")
        setUserType("admin")
        localStorage.setItem('currentUser', JSON.stringify({
          type: 'admin',
          data: { 
            walletAddress: address,
            name: 'System Administrator',
            role: 'admin'
          }
        }));
        router.push("/admin")
        return
      }
      
      // Track which services we've checked
      const checkedServices = { shopkeeper: false, delivery: false, consumer: false }
      let lastError = null

      // Check if wallet belongs to a shopkeeper
      try {
        console.log("🔍 Checking shopkeeper for wallet:", address);
        const shopkeeperResponse = await fetch(`/api/shopkeeper-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });

        checkedServices.shopkeeper = true
        console.log("🔍 Shopkeeper response status:", shopkeeperResponse.status);
        const shopkeeperData = await shopkeeperResponse.json();
        console.log("🔍 Shopkeeper response data:", shopkeeperData);

        if (shopkeeperResponse.ok && shopkeeperData.success && shopkeeperData.shopkeeper) {
          console.log("🏪 Shopkeeper account detected, redirecting to shopkeeper dashboard");
          console.log("📊 Shopkeeper data source:", shopkeeperData.shopkeeper.source);
          setUserType("shopkeeper")
          localStorage.setItem('currentUser', JSON.stringify({
            type: 'shopkeeper',
            data: shopkeeperData.shopkeeper
          }));
          
          router.push("/shopkeeper")
          return
        } else if (shopkeeperResponse.ok && !shopkeeperData.success) {
          lastError = shopkeeperData.error || "Not registered as shopkeeper"
          console.log("❌ Shopkeeper check returned:", lastError);
        }
      } catch (shopkeeperError) {
        console.log("⚠️ Shopkeeper check failed:", shopkeeperError.message)
        lastError = "Failed to check shopkeeper status"
      }
      
      // Check if wallet belongs to an approved delivery partner
      try {
        console.log("🔍 Checking delivery partner for wallet:", address);
        const deliveryResponse = await fetch(`/api/delivery-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });

        checkedServices.delivery = true
        console.log("🔍 Delivery response status:", deliveryResponse.status);
        const deliveryData = await deliveryResponse.json();
        console.log("🔍 Delivery response data:", deliveryData);

        if (deliveryResponse.ok && deliveryData.success && deliveryData.deliveryPartner) {
          console.log("🚚 Delivery partner account detected, redirecting to dealer dashboard")
          console.log("📊 Delivery partner data source:", deliveryData.deliveryPartner.source);
          setUserType("dealer")
          localStorage.setItem('currentUser', JSON.stringify({
            type: 'delivery',
            data: deliveryData.deliveryPartner
          }));
          router.push("/dealer")
          return
        } else if (deliveryResponse.ok && !deliveryData.success) {
          lastError = deliveryData.error || "Not registered as delivery partner"
          console.log("❌ Delivery partner check returned:", lastError);
        }
      } catch (deliveryError) {
        console.log("⚠️ Delivery partner check failed:", deliveryError.message)
        lastError = "Failed to check delivery partner status"
      }
      
      // Check if wallet is linked to a consumer
      try {
        console.log("🔍 Checking consumer wallet for wallet:", address);
        const consumerWalletResponse = await fetch(`/api/consumer-wallet-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: address }),
        });

        checkedServices.consumer = true
        console.log("🔍 Consumer wallet response status:", consumerWalletResponse.status);
        const consumerWalletData = await consumerWalletResponse.json();
        console.log("🔍 Consumer wallet response data:", consumerWalletData);

        if (consumerWalletResponse.ok && consumerWalletData.consumer) {
          console.log("👤 Consumer wallet detected, redirecting to user dashboard")
          setUserType("user")
          localStorage.setItem('currentUser', JSON.stringify({
            type: 'consumer',
            data: consumerWalletData.consumer
          }));
          router.push(`/user?aadhaar=${consumerWalletData.consumer.aadharNumber}`)
          return
        } else if (consumerWalletResponse.ok && !consumerWalletData.consumer) {
          lastError = "No consumer account linked to this wallet"
          console.log("❌ Consumer wallet check returned:", lastError);
        }
      } catch (consumerWalletError) {
        console.log("⚠️ Consumer wallet check failed:", consumerWalletError.message)
        lastError = "Failed to check consumer wallet status"
      }
      
      // If no specific role found, provide comprehensive error message
      console.log("❌ No role found for wallet address:", address);
      console.log("📊 Services checked:", checkedServices);
      
      const checkedCount = Object.values(checkedServices).filter(Boolean).length
      if (checkedCount === 0) {
        setError("Unable to verify wallet registration due to network issues. Please try again.")
      } else {
        setError(`This wallet address (${address.slice(0, 6)}...${address.slice(-4)}) is not registered in the system. Please ensure you're using the correct wallet or contact your administrator for registration.`)
      }
      setUserType(null)
      
    } catch (err) {
      console.error("❌ Error checking user type:", err)
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Network connection error. Please check your internet connection and try again.")
      } else {
        setError("Failed to verify wallet. Please try again.")
      }
      setUserType(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletConnect = (address) => {
    console.log("🔗 Wallet connect handler called with address:", address)
    setWalletConnected(true)
    setWalletAddress(address)
    setError(null) // Clear any previous errors when connecting wallet
    
    // Always check and redirect immediately when wallet connects
    if (address) {
      checkUserTypeAndRedirect(address)
    }
  }

  // Handle consumer data input
  const handleConsumerInputChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'identifier') {
      // Only allow digits for both Aadhar and Ration ID
      const digitsOnly = value.replace(/\D/g, '')
      const maxLength = identifierType === 'aadhar' ? 12 : 20 // Flexible length for ration card
      
      if (digitsOnly.length <= maxLength) {
        setConsumerData(prev => ({ ...prev, [name]: digitsOnly }))
        
        // Clear errors when user starts typing correctly
        if (error && (error.includes('Aadhar') || error.includes('identifier'))) {
          setError(null)
        }
      }
    } else {
      setConsumerData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handlePinChange = (value) => {
    setConsumerData(prev => ({ ...prev, pin: value }))
    
    // Clear PIN-related errors when user starts typing
    if (error && error.includes('PIN')) {
      setError(null)
    }
  }

  const handleConsumerLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("🔐 Consumer login attempt:", {
        identifier: consumerData.identifier,
        identifierType,
        pinLength: consumerData.pin.length
      });

      // Comprehensive input validation
      if (!consumerData.identifier || !consumerData.pin) {
        setError("Please enter both identifier and PIN")
        return
      }

      // Validate Aadhaar format (12 digits, no special characters)
      if (identifierType === 'aadhar') {
        const aadharPattern = /^\d{12}$/;
        if (!aadharPattern.test(consumerData.identifier)) {
          setError("Aadhaar number must be exactly 12 digits without spaces or dashes")
          return
        }
      }

      // Validate Ration Card ID format (allow alphanumeric)
      if (identifierType === 'ration') {
        const rationPattern = /^[A-Za-z0-9]{3,20}$/;
        if (!rationPattern.test(consumerData.identifier)) {
          setError("Please enter a valid Ration Card ID (3-20 alphanumeric characters)")
          return
        }
      }

      // Validate PIN format (exactly 6 digits)
      if (!/^\d{6}$/.test(consumerData.pin)) {
        setError("PIN must be exactly 6 digits")
        return
      }

      // For testing purposes, allow the blockchain consumer to login with any PIN
      if (consumerData.identifier === "123456780012") {
        console.log("🧪 Test consumer detected, redirecting to dashboard");
        
        // Store test consumer data
        localStorage.setItem('currentUser', JSON.stringify({
          type: 'consumer',
          data: {
            aadharNumber: consumerData.identifier,
            name: 'Test Consumer',
            phone: '1234567890',
            rationCardId: 'TEST123',
            homeAddress: 'Test Address',
            status: 'approved'
          }
        }));
        
        router.push(`/user?aadhaar=${consumerData.identifier}`);
        return;
      }

      console.log("📤 Sending login request to API...");
      // Call consumer login API
      const response = await fetch("/api/consumer-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: consumerData.identifier.trim(), // Remove any accidental whitespace
          identifierType,
          pin: consumerData.pin,
        }),
      });

      console.log("📥 API response status:", response.status);
      const data = await response.json();
      console.log("📥 API response data:", data);

      if (!response.ok) {
        // Enhanced error messages for better UX
        switch (response.status) {
          case 404:
            setError(identifierType === 'aadhar' 
              ? "No approved account found with this Aadhaar number. Please verify your details or contact support."
              : "No approved account found with this Ration Card ID. Please verify your details or contact support.");
            break;
          case 401:
            setError("Invalid PIN. Please check your PIN and try again.");
            break;
          case 400:
            setError("Invalid login details. Please check your information and try again.");
            break;
          case 500:
            setError("Server error occurred. Please try again in a few moments.");
            break;
          default:
            setError(data.error || "Login failed. Please try again.");
        }
        return;
      }

      // Verify we received valid consumer data
      if (!data.consumer || !data.consumer.aadharNumber) {
        setError("Invalid response from server. Please try again.");
        return;
      }

      // Store consumer data in localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        type: 'consumer',
        data: data.consumer
      }));

      // Redirect to consumer dashboard with aadhaar in URL
      console.log("✅ Login successful, redirecting to user dashboard");
      router.push(`/user?aadhaar=${data.consumer.aadharNumber}`);
    } catch (error) {
      console.error("❌ Consumer login error:", error);
      setError("Login failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced wallet login function with better error handling
  const handleWalletLogin = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet first")
      return
    }

    if (!walletAddress) {
      setError("Wallet address not detected. Please reconnect your wallet.")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log("🔐 Manual wallet login attempt for:", walletAddress);
      
      // Show connecting message
      setError(null)
      
      // The checking and redirection is already handled in checkUserTypeAndRedirect
      // This is called when the user manually clicks the login button
      await checkUserTypeAndRedirect(walletAddress)

    } catch (err) {
      console.error("❌ Wallet login error:", err);
      if (err.message.includes('network')) {
        setError("Network connection error. Please check your internet connection and try again.")
      } else if (err.message.includes('wallet')) {
        setError("Wallet connection error. Please reconnect your wallet and try again.")
      } else {
        setError("Failed to authenticate wallet. Please try reconnecting and try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Clear authentication data
  const clearAuth = () => {
    localStorage.removeItem('currentUser')
    setUserType(null)
    setError(null)
  }

  // Check if we're being redirected from a dashboard due to auth failure
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('auth') === 'failed') {
      clearAuth()
      setError("Authentication failed. Please connect your wallet to continue.")
    }
  }, [])

  // Enhanced button text based on current tab and state
  const getButtonText = () => {
    if (isLoading) {
      if (activeTab === "consumer") {
        return "Verifying credentials..."
      } else {
        return "Checking wallet registration..."
      }
    }
    
    if (activeTab === "consumer") {
      const hasIdentifier = consumerData.identifier && consumerData.identifier.length > 0
      const hasValidPin = consumerData.pin && consumerData.pin.length === 6
      
      if (!hasIdentifier && !hasValidPin) {
        return `Enter ${identifierType === 'aadhar' ? 'Aadhaar' : 'Ration Card ID'} and PIN`
      } else if (!hasIdentifier) {
        return `Enter ${identifierType === 'aadhar' ? 'Aadhaar number' : 'Ration Card ID'}`
      } else if (!hasValidPin) {
        return "Enter 6-digit PIN"
      }
      return "Sign in as Consumer"
    }
    
    if (!walletConnected) return "Connect Wallet to Sign In"
    if (userType) {
      const displayType = getUserTypeDisplay()
      return `Sign in as ${displayType}`
    }
    return "Verify Wallet Registration"
  }

  // Get user type display text
  const getUserTypeDisplay = () => {
    switch(userType) {
      case "admin": return "Administrator"
      case "shopkeeper": return "Shopkeeper"
      case "dealer": return "Delivery Partner"
      case "user": return "Consumer"
      default: return null
    }
  }

  return (
    <AuthLayout title="Welcome back" description="Login to access your Grainlyy dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-green-100 shadow-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-600 text-white">
                <Leaf className="h-4 w-4" />
              </div>
              <CardTitle className="text-2xl text-green-900">Sign in</CardTitle>
            </div>
            <CardDescription>
              Choose your login method based on your account type
            </CardDescription>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p><strong>Consumer:</strong> Use Aadhaar/Ration Card + PIN</p>
              <p><strong>Staff:</strong> Use your registered wallet address</p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value)
              setError(null) // Clear errors when switching tabs
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="consumer" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Consumer
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet Login
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="consumer" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Login with</Label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="identifierType"
                          value="aadhar"
                          checked={identifierType === "aadhar"}
                          onChange={(e) => {
                            setIdentifierType(e.target.value)
                            setConsumerData(prev => ({ ...prev, identifier: "" }))
                            setError(null) // Clear errors when changing identifier type
                          }}
                          className="text-green-600"
                        />
                        <span className="text-sm">Aadhar Number</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="identifierType"
                          value="ration"
                          checked={identifierType === "ration"}
                          onChange={(e) => {
                            setIdentifierType(e.target.value)
                            setConsumerData(prev => ({ ...prev, identifier: "" }))
                            setError(null) // Clear errors when changing identifier type
                          }}
                          className="text-green-600"
                        />
                        <span className="text-sm">Ration Card ID</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      {identifierType === "aadhar" ? "Aadhaar Number" : "Ration Card ID"}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="identifier"
                      name="identifier"
                      placeholder={
                        identifierType === "aadhar" 
                          ? "Enter your 12-digit Aadhaar number" 
                          : "Enter your Ration Card ID"
                      }
                      value={consumerData.identifier}
                      onChange={handleConsumerInputChange}
                      className="border-green-200 focus-visible:ring-green-500"
                      maxLength={identifierType === "aadhar" ? 12 : 20}
                    />
                    {identifierType === "aadhar" && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>12-digit Aadhaar number (no spaces)</span>
                        <span className={consumerData.identifier.length === 12 ? "text-green-600" : ""}>
                          {consumerData.identifier.length}/12
                        </span>
                      </div>
                    )}
                    {identifierType === "ration" && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Alphanumeric Ration Card ID</span>
                        <span className={consumerData.identifier.length >= 3 ? "text-green-600" : ""}>
                          {consumerData.identifier.length}/20
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pin">
                      Account PIN <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={consumerData.pin} onChange={handlePinChange}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={1} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={2} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={3} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={4} className="border-green-200 focus-visible:ring-green-500" />
                          <InputOTPSlot index={5} className="border-green-200 focus-visible:ring-green-500" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Enter your 6-digit PIN ({consumerData.pin.length}/6)
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="wallet" className="space-y-4 mt-4">
                <MetaMaskConnect onConnect={handleWalletConnect} />

                {walletConnected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Wallet Connected Status */}
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Wallet Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
                      </div>
                    </div>

                    {isLoading && (
                      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md text-sm">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <span>Checking wallet registration across all user types...</span>
                        </div>
                      </div>
                    )}

                    {!isLoading && userType && (
                      <div className={`border px-4 py-3 rounded-md text-sm ${
                        userType === 'admin' 
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : userType === 'shopkeeper'
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : userType === 'dealer'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-current rounded-full"></div>
                          <span>Wallet recognized as: <strong>{getUserTypeDisplay()}</strong></span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember-wallet" />
                      <Label htmlFor="remember-wallet" className="text-sm text-muted-foreground">
                        Remember this device for faster login
                      </Label>
                    </div>
                  </motion.div>
                )}

                {walletConnected && !userType && !isLoading && error && (
                  <div className="text-center text-sm">
                    <p className="text-amber-600">
                      Wallet verification completed
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check the error message above for details
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={activeTab === "consumer" ? handleConsumerLogin : handleWalletLogin}
              disabled={
                isLoading || 
                (activeTab === "consumer" && (
                  !consumerData.identifier || 
                  !consumerData.pin || 
                  consumerData.pin.length !== 6 ||
                  (identifierType === 'aadhar' && !/^\d{12}$/.test(consumerData.identifier)) ||
                  (identifierType === 'ration' && !/^[A-Za-z0-9]{3,20}$/.test(consumerData.identifier))
                )) ||
                (activeTab === "wallet" && !walletConnected)
              }
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {getButtonText()}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-green-600 hover:text-green-700 font-medium">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </AuthLayout>
  )
}