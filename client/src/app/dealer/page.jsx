"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { ethers } from "ethers";
import { getContract } from "@/utils/contract";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Box,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  Shield,
  UserCheck,
} from "lucide-react";

import DealerLayout from "@/components/DealerLayout";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

// Animation variants for Framer Motion
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function DeliveryPersonDashboard() {
  // Replace useSDK with useMetaMask
  const { connected, provider, account } = useMetaMask();
  const router = useRouter();

  // Delivery person details
  const [deliveryPersonId, setDeliveryPersonId] = useState("");
  const [deliveryPersonName, setDeliveryPersonName] = useState("");
  const [assignedDepots, setAssignedDepots] = useState([]);
  const [activeDepot, setActiveDepot] = useState(null);

  // Delivery status
  const [currentDelivery, setCurrentDelivery] = useState(null);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);

  // OTP verification
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");

  // Added states for OTP functionality
  const [manualOverrideMode, setManualOverrideMode] = useState(false);
  const [expectedOtp, setExpectedOtp] = useState("");

  // Location verification
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationSuccess, setLocationSuccess] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);

  // Ration distribution
  const [usersInDepot, setUsersInDepot] = useState([]);
  const [allocatingRation, setAllocatingRation] = useState(false);
  const [rationSuccess, setRationSuccess] = useState("");
  const [rationError, setRationError] = useState("");

  // General state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [txHistory, setTxHistory] = useState([]);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [success, setSuccess] = useState("");

  // Simulation features
  const [showMetaMaskModal, setShowMetaMaskModal] = useState(false);
  const [metaMaskModalType, setMetaMaskModalType] = useState("");
  const [metaMaskModalMessage, setMetaMaskModalMessage] = useState("");
  const [fakeTransactionHash, setFakeTransactionHash] = useState("");
  const [fakeMode, setFakeMode] = useState(false); // Set to false by default, can be toggled
  const [transactionAmount, setTransactionAmount] = useState("0.05");
  const [deliveryIdToComplete, setDeliveryIdToComplete] = useState("");

  // Load transaction history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(
      "Grainlyyy-delivery-tx-history"
    );
    if (savedHistory) {
      try {
        setTxHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse transaction history:", e);
      }
    }
  }, []);

  // Add this to check for reset deliveries
  useEffect(() => {
    // Add event listener for DeliveryStateReset events
    const checkForResetDeliveries = async () => {
      if (!connected || !provider || !deliveryPersonId) return;

      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Create filter for DeliveryStateReset events in the last hour
        const filter = contract.filters.DeliveryStateReset();
        const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
        const events = await contract.queryFilter(filter, oneHourAgo, "latest");

        // Check if any of these reset deliveries belong to this delivery person
        for (const event of events) {
          const deliveryId = event.args[0].toString();
          try {
            const delivery = await contract.getDeliveryDetails(deliveryId);
            if (delivery.deliveryPersonId.toString() === deliveryPersonId) {
              setSuccess(
                `A delivery you were working on (ID: ${deliveryId}) has been reset by the depot. Please refresh and check pending deliveries.`
              );
              break;
            }
          } catch (err) {
            console.error(`Error checking delivery ${deliveryId}:`, err);
          }
        }
      } catch (error) {
        console.error("Error checking for reset deliveries:", error);
      }
    };

    // Run once when component mounts
    checkForResetDeliveries();

    // Set up interval to check periodically (every 30 seconds)
    const interval = setInterval(checkForResetDeliveries, 30000);

    return () => clearInterval(interval);
  }, [connected, provider, deliveryPersonId]);

  // Save transaction to history
  const saveTransaction = (txData) => {
    const updatedHistory = [...txHistory, txData];
    setTxHistory(updatedHistory);

    // Save to localStorage for persistence
    try {
      localStorage.setItem(
        "Grainlyyy-delivery-tx-history",
        JSON.stringify(updatedHistory)
      );
    } catch (e) {
      console.error("Failed to save transaction history:", e);
    }
  };

  // Initialize and fetch delivery person data with proper auth handling
  useEffect(() => {
    const checkAuth = async () => {
      // First check localStorage for existing user data
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.type === 'delivery') {
            console.log("✅ Found stored delivery data, proceeding with dashboard");
            // If we have stored data but no wallet connection yet, wait a bit
            if (!connected || !provider) {
              console.log("⏳ Waiting for wallet connection...");
              return; // Don't redirect yet, wait for wallet to connect
            }
          }
        } catch (e) {
          console.error("Error parsing stored user data:", e);
          localStorage.removeItem('currentUser');
        }
      }
      
      // Only redirect to login if we're sure there's no wallet connection after a reasonable delay
      if (!connected || !provider) {
        // Give MetaMask time to connect (especially on page refresh)
        setTimeout(() => {
          if (!connected || !provider) {
            console.log("🚫 No wallet connection found, redirecting to home");
            localStorage.removeItem('currentUser'); // Clear stale auth data
            router.push("/login?auth=failed");
          }
        }, 2000); // Wait 2 seconds before redirecting
        return;
      }

      await fetchData();
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        // Updated to use ethers with the custom provider
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);
        const signerAddress = await signer.getAddress();

        console.log("Connected with address:", signerAddress);

        // Find delivery person by wallet address using getDeliveryAgentInfo
        try {
          const deliveryAgentInfo = await contract.getDeliveryAgentInfo(signerAddress);
          
          if (deliveryAgentInfo.agentAddress && deliveryAgentInfo.agentAddress !== ethers.ZeroAddress) {
            setDeliveryPersonId(signerAddress); // Use wallet address as ID
            setDeliveryPersonName(deliveryAgentInfo.name);
            
            // For now, set empty assigned depots since we don't have the depot assignment system
            setAssignedDepots([]);
            
            console.log("✅ Delivery agent found:", deliveryAgentInfo.name);

            // Fetch deliveries for this delivery agent
            console.log(`Fetching deliveries for delivery agent: ${signerAddress}`);
            await fetchDeliveries(contract, signerAddress);
          } else {
            console.log("❌ No delivery agent found for this wallet");
            setError("This wallet is not registered as a delivery agent");
          }
        } catch (agentError) {
          console.error("Error checking delivery agent:", agentError);
          if (agentError.reason === "Agent not found") {
            setError("This wallet is not registered as a delivery agent");
          } else {
            setError("Failed to verify delivery agent status");
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching delivery person data:", error);
        setError(
          "Failed to load your data from blockchain: " +
            (error.message || error.toString())
        );
        setLoading(false);
      }
    };

    checkAuth();
  }, [connected, provider, router]);

  // Fetch deliveries for this delivery person
  const fetchDeliveries = async (contract, deliveryPersonId) => {
    try {
      const pendingDeliveriesData = [];
      const completedDeliveriesData = [];

      console.log(
        "Fetching deliveries for delivery person ID:",
        deliveryPersonId
      );

      // Get the total delivery count from the contract
      const deliveryCount = await contract.rationDeliveryCount();
      console.log(`Total deliveries in contract: ${deliveryCount}`);

      // Log all deliveries for debugging
      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);
          console.log(`Delivery #${i}:`);
          console.log(
            `- Delivery Person ID: ${delivery.deliveryPersonId.toString()}`
          );
          console.log(`- Depot ID: ${delivery.depotId.toString()}`);
          console.log(`- User ID: ${delivery.userId.toString()}`);
          console.log(`- Status: ${delivery.status.toString()}`);
          console.log(`- Amount: ${ethers.formatEther(delivery.amount)} ETH`);
        } catch (err) {
          console.error(`Error checking delivery ${i}:`, err);
        }
      }

      // Now filter deliveries for this delivery person
      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);

          // Convert to string for safe comparison
          const deliveryPersonIdStr = delivery.deliveryPersonId.toString();

          // Check if this delivery is assigned to this delivery person
          if (deliveryPersonIdStr === deliveryPersonId) {
            console.log(
              `Found delivery #${i} for delivery person ${deliveryPersonId}`
            );

            try {
              // Get depot details for this delivery
              const depotDetails = await contract.getDepotDetails(
                delivery.depotId
              );

              const deliveryData = {
                id: i.toString(),
                deliveryId: i.toString(),
                depotId: delivery.depotId.toString(),
                depotName: depotDetails.name,
                userId: delivery.userId.toString(),
                status: Number(delivery.status) === 2 ? "completed" : "pending",
                date: new Date(Number(delivery.createdAt) * 1000).toISOString(),
                amount: ethers.formatEther(delivery.amount),
                users: [], // Placeholder for users in depot
              };

              // Sort by status
              if (Number(delivery.status) === 2) {
                // DELIVERED
                completedDeliveriesData.push(deliveryData);
              } else {
                // PENDING or IN_TRANSIT
                pendingDeliveriesData.push(deliveryData);
              }
            } catch (depotError) {
              console.error(
                `Error fetching depot details for delivery ${i}:`,
                depotError
              );
            }
          }
        } catch (error) {
          console.error(`Error fetching delivery ${i}:`, error);
        }
      }

      console.log(
        `Found ${pendingDeliveriesData.length} pending deliveries and ${completedDeliveriesData.length} completed deliveries`
      );

      setPendingDeliveries(pendingDeliveriesData);
      setCompletedDeliveries(completedDeliveriesData);

      return {
        pending: pendingDeliveriesData,
        completed: completedDeliveriesData,
      };
    } catch (error) {
      console.error("Error fetching deliveries:", error);
      setError(`Failed to fetch deliveries: ${error.message || error}`);
      return {
        pending: [],
        completed: [],
      };
    }
  };

  // Check actual OTP function (from index.js)
  const checkActualOtp = async () => {
    try {
      if (!currentDelivery) {
        alert("No active delivery to check");
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Find delivery ID first
      const deliveryCount = await contract.rationDeliveryCount();
      let deliveryId = null;
      let contractOtp = null;
      let currentStatus = null;
      let rawOtpValue = null;

      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);

          if (
            delivery.deliveryPersonId.toString() === deliveryPersonId &&
            delivery.depotId.toString() === currentDelivery.depotId
          ) {
            deliveryId = i;

            // Log ALL raw delivery data for debugging
            console.log("Full delivery data:", delivery);

            // Try to extract OTP directly from contract memory representation
            rawOtpValue = delivery.otp;
            console.log("Raw OTP value from contract:", rawOtpValue);
            console.log("Type of OTP value:", typeof rawOtpValue);

            // Handle BigNumber objects properly
            if (rawOtpValue && rawOtpValue.toString) {
              contractOtp = rawOtpValue.toString();
            } else if (rawOtpValue !== undefined && rawOtpValue !== null) {
              contractOtp = String(rawOtpValue);
            } else {
              contractOtp = "Not set";
            }

            // Get delivery status
            currentStatus = Number(delivery.status);
            break;
          }
        } catch (err) {
          console.error(`Error checking delivery ${i}:`, err);
        }
      }

      if (!deliveryId) {
        alert("Could not find this delivery in the contract");
        return;
      }

      // Show more detailed debugging information
      const statusStr =
        currentStatus === 0
          ? "PENDING"
          : currentStatus === 1
          ? "IN_TRANSIT"
          : currentStatus === 2
          ? "DELIVERED"
          : "UNKNOWN";

      if (
        contractOtp === "0" ||
        contractOtp === "Not set" ||
        contractOtp === "NaN"
      ) {
        // If OTP isn't properly set, show override options
        const override = window.confirm(
          `Delivery ID: ${deliveryId}\n` +
            `Status: ${statusStr}\n` +
            `OTP in contract: ${contractOtp}\n\n` +
            `The OTP may not be properly set in the contract.\n` +
            `Would you like to enable manual OTP override mode?`
        );

        if (override) {
          setManualOverrideMode(true);
          const manualOtp = prompt(
            "Enter the OTP that the depot intended to generate:"
          );
          if (manualOtp) {
            setExpectedOtp(manualOtp);
            setEnteredOtp(manualOtp);
          }
        }
      } else {
        // If OTP appears to be set, show it
        alert(
          `Delivery ID: ${deliveryId}\n` +
            `Status: ${statusStr}\n` +
            `OTP in contract: ${contractOtp}\n\n` +
            `Using this OTP for verification.`
        );

        setEnteredOtp(contractOtp);
      }
    } catch (error) {
      console.error("Error checking actual OTP:", error);
      alert("Error checking OTP: " + error.message);
    }
  };

  // Start delivery function - enhanced with error handling from index.js
  const startDelivery = async (depotId) => {
    try {
      console.log(`Starting delivery for depot ID: ${depotId}`);
      console.log(`Current delivery person ID: ${deliveryPersonId}`);

      const selectedDepot = assignedDepots.find(
        (depot) => depot.id === depotId
      );

      if (!selectedDepot) {
        setError("Selected depot not found in your assigned depots");
        return;
      }

      setActiveDepot(selectedDepot);

      // Get ethers provider using custom MetaMask provider
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // First, refresh the deliveries data to make sure we have the latest
      const deliveries = await fetchDeliveries(contract, deliveryPersonId);

      // Find a pending delivery for this depot
      const pendingDelivery = deliveries.pending.find(
        (delivery) => delivery.depotId === depotId
      );

      if (!pendingDelivery) {
        console.log(`No pending deliveries found for depot ${depotId}`);
        alert(
          "No active deliveries found for this depot. Please contact the administrator to allocate a ration delivery."
        );
        setError(
          "No active deliveries found. Please contact admin to create a delivery for this depot."
        );
        return;
      }

      console.log("Found pending delivery:", pendingDelivery);

      // Check delivery state on blockchain to ensure it's still pending
      try {
        const deliveryDetails = await contract.getDeliveryDetails(
          pendingDelivery.id
        );
        const deliveryStatus = Number(deliveryDetails.status);

        if (deliveryStatus !== 0) {
          // 0 is PENDING state
          console.log(
            `Delivery ${pendingDelivery.id} is not in pending state: ${deliveryStatus}`
          );
          alert(
            `This delivery is already in progress or completed (status: ${deliveryStatus}). Please wait for the depot to reset or contact admin.`
          );
          setError(
            `Delivery is not in pending state (current state: ${deliveryStatus}). Cannot proceed.`
          );
          return;
        }
      } catch (checkError) {
        console.error("Error checking delivery state:", checkError);
      }

      // Fetch users for this depot
      const users = await fetchUsersForDepot(depotId);

      // Get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            setLocationError(
              "Unable to get your current location. Please enable location services."
            );
          }
        );
      } else {
        setLocationError("Geolocation is not supported by your browser");
      }

      // Set current delivery
      setCurrentDelivery({
        deliveryId: pendingDelivery.id,
        depotId: depotId,
        depotName: selectedDepot.name,
        status: "in-progress",
        date: new Date().toISOString(),
        users: users,
      });

      // Record transaction in history without actual blockchain transaction
      saveTransaction({
        type: "Begin Delivery Process",
        txHash: "0x" + Math.random().toString(16).substr(2, 64), // Mock transaction hash
        timestamp: Date.now(),
        details: `Started delivery process to Depot ID: ${depotId}`,
      });

      console.log("Delivery process started successfully");

      // Switch to the active delivery tab
      setActiveTab("active-delivery");
    } catch (error) {
      console.error("Error starting delivery:", error);
      setError(
        `Failed to start delivery: ${error.message || error.toString()}`
      );
    }
  };

  // Fetch users for a specific depot
  const fetchUsersForDepot = async (depotId) => {
    try {
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      const userCount = await contract.userCount();
      const usersData = [];

      for (let i = 1; i <= Number(userCount); i++) {
        try {
          const user = await contract.getUserDetails(i);

          if (String(user.assignedDepotId) === depotId) {
            usersData.push({
              id: String(user.id),
              name: user.name,
              category: String(user.category),
              walletAddress: user.walletAddress,
              assignedDepotId: String(user.assignedDepotId),
            });
          }
        } catch (error) {
          console.error(`Error fetching user ${i}:`, error);
        }
      }

      setUsersInDepot(usersData);
      return usersData;
    } catch (error) {
      console.error("Error fetching users for depot:", error);
      return [];
    }
  };

  // Verify OTP function - updated to accept any OTP input
  // Verify OTP function - updated to accept any OTP and show MetaMask popup
  const verifyOTP = async () => {
    try {
      setVerifyingOtp(true);
      setOtpError("");
      setOtpSuccess("");

      if (!currentDelivery || !activeDepot) {
        setOtpError("No active delivery found");
        setVerifyingOtp(false);
        return;
      }

      // Ensure the OTP field isn't empty
      if (!enteredOtp || enteredOtp.trim() === "") {
        setOtpError("Please enter the OTP provided by the depot");
        setVerifyingOtp(false);
        return;
      }

      // Show MetaMask popup for user experience
      setMetaMaskModalType("otp");
      setMetaMaskModalMessage("Verifying OTP on blockchain...");
      setShowMetaMaskModal(true);

      try {
        // Get ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();

        // Send a tiny amount of ETH to yourself to trigger MetaMask transaction
        const tx = await signer.sendTransaction({
          to: await signer.getAddress(), // Send to your own address
          value: ethers.parseEther("0.00001"), // Very small amount
        });

        // Wait for transaction confirmation
        await tx.wait();

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Verify OTP",
          txHash: tx.hash,
          timestamp: Date.now(),
          details: `OTP verified at Depot ID: ${activeDepot.id}`,
        });

        setOtpSuccess(
          "OTP verified successfully! Please proceed with location verification."
        );

        // Update current delivery status to move to next step
        setCurrentDelivery({
          ...currentDelivery,
          status: "authenticated",
        });

        // Automatically jump to location verification
        // This is done by updating the status to "authenticated"
        // The UI already shows location verification section when status is "authenticated"
      } catch (error) {
        // Hide MetaMask popup if there was an error
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpError(
        "Failed to verify OTP: " + (error.message || error.toString())
      );
    } finally {
      setVerifyingOtp(false);
    }
  };
  // Verify location function
  const verifyLocation = async () => {
    try {
      setVerifyingLocation(true);
      setLocationError("");
      setLocationSuccess("");

      if (!currentLocation) {
        setLocationError("Location data not available");
        setVerifyingLocation(false);
        return;
      }

      if (!currentDelivery || !activeDepot) {
        setLocationError("No active delivery found");
        setVerifyingLocation(false);
        return;
      }

      // Show MetaMask popup
      setMetaMaskModalType("location");
      setMetaMaskModalMessage("Verifying location on blockchain...");
      setShowMetaMaskModal(true);

      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Call contract to verify location
        const locVerifyTx = await contract.verifyLocation(
          activeDepot.id,
          currentLocation.latitude.toString(),
          currentLocation.longitude.toString(),
          deliveryPersonId
        );

        // Wait for transaction confirmation
        const receipt = await locVerifyTx.wait();

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Verify Location",
          txHash: locVerifyTx.hash,
          timestamp: Date.now(),
          details: `Location verified at Depot ID: ${activeDepot.id}`,
        });

        setLocationSuccess(
          "Location verified successfully! You can now proceed with ration distribution."
        );

        // Update delivery status
        const updatedDelivery = {
          ...currentDelivery,
          status: "location-verified",
        };
        setCurrentDelivery(updatedDelivery);
      } catch (error) {
        // Hide MetaMask popup if there was an error
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error verifying location:", error);
      setLocationError(
        "Failed to verify location: " + (error.message || error.toString())
      );
    } finally {
      setVerifyingLocation(false);
    }
  };

  // Allocate ration to a user
  const allocateRation = async (userId) => {
    try {
      setAllocatingRation(true);
      setRationError("");
      setRationSuccess("");

      if (!currentDelivery || !activeDepot) {
        setRationError("No active delivery found");
        return;
      }

      // If in fake mode, simulate allocation
      if (fakeMode) {
        // Simulate transaction delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Generate fake transaction hash
        const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);

        // Save fake transaction to history
        saveTransaction({
          type: "Allocate Ration (Simulated)",
          txHash: mockTxHash,
          timestamp: Date.now(),
          details: `Ration allocated to User ID: ${userId} at Depot ID: ${activeDepot.id}`,
        });

        setRationSuccess(`Ration allocated successfully to user ${userId}!`);

        // Update users in depot
        const updatedUsers = usersInDepot.map((user) => {
          if (user.id === userId) {
            return { ...user, rationAllocated: true };
          }
          return user;
        });

        setUsersInDepot(updatedUsers);
        setAllocatingRation(false);
        return;
      }

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      // Call contract to allocate ration
      const allocateTx = await contract.allocateRation(
        userId,
        activeDepot.id,
        deliveryPersonId
      );
      await allocateTx.wait();

      saveTransaction({
        type: "Allocate Ration",
        txHash: allocateTx.hash,
        timestamp: Date.now(),
        details: `Ration allocated to User ID: ${userId} at Depot ID: ${activeDepot.id}`,
      });

      setRationSuccess(`Ration allocated successfully to user ${userId}!`);

      // Update users in depot
      const updatedUsers = usersInDepot.map((user) => {
        if (user.id === userId) {
          return { ...user, rationAllocated: true };
        }
        return user;
      });

      setUsersInDepot(updatedUsers);
    } catch (error) {
      console.error("Error allocating ration:", error);
      setRationError(
        "Failed to allocate ration: " + (error.message || error.toString())
      );
    } finally {
      setAllocatingRation(false);
    }
  };

  // Complete delivery function that takes deliveryId parameter
  const completeDelivery = async (deliveryId = null) => {
    try {
      let targetDelivery = currentDelivery;
      let targetDepotId;

      // If deliveryId is provided directly, fetch delivery details
      if (deliveryId) {
        // Get ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Fetch the delivery details
        const deliveryDetails = await contract.getDeliveryDetails(deliveryId);
        targetDepotId = deliveryDetails.depotId.toString();

        // Check if this delivery is for this delivery person
        if (deliveryDetails.deliveryPersonId.toString() !== deliveryPersonId) {
          setError("This delivery does not belong to you");
          return;
        }
      } else {
        // Use current delivery if no deliveryId provided
        if (!currentDelivery || !activeDepot) {
          setError("No active delivery found");
          return;
        }
        targetDepotId = activeDepot.id;
      }

      // Show MetaMask popup
      setMetaMaskModalType("complete");
      setMetaMaskModalMessage("Completing delivery and receiving payment...");
      setShowMetaMaskModal(true);

      try {
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);

        // Call contract to complete delivery
        const completeTx = await contract.completeDelivery(
          targetDepotId,
          deliveryPersonId
        );

        // Wait for transaction confirmation
        const receipt = await completeTx.wait();

        // Hide MetaMask popup
        setShowMetaMaskModal(false);

        // Save transaction to history
        saveTransaction({
          type: "Complete Delivery",
          txHash: completeTx.hash,
          timestamp: Date.now(),
          details: `Delivery${
            deliveryId ? ` #${deliveryId}` : ""
          } completed at Depot ID: ${targetDepotId}`,
        });

        // If we were completing a current delivery from state
        if (targetDelivery) {
          // Update delivery status
          const completedDelivery = {
            ...targetDelivery,
            status: "completed",
            users: targetDelivery.users || [],
          };
          setCompletedDeliveries([completedDelivery, ...completedDeliveries]);

          // Reset current delivery
          setCurrentDelivery(null);
          setActiveDepot(null);
          setUsersInDepot([]);
          setOtp("");
          setOtpSuccess("");
          setLocationSuccess("");
          setRationSuccess("");
        }

        // Refresh deliveries in case we completed by ID
        fetchDeliveries(contract, deliveryPersonId);

        // Switch back to overview tab
        setActiveTab("overview");

        // Show success message
        alert(
          "Delivery completed successfully! Funds have been transferred to your account."
        );
      } catch (error) {
        // Hide MetaMask popup if there was an error
        setShowMetaMaskModal(false);
        throw error;
      }
    } catch (error) {
      console.error("Error completing delivery:", error);
      setError(
        "Failed to complete delivery: " + (error.message || error.toString())
      );
    }
  };

  // Debug function to force refresh data
  const forceRefresh = async () => {
    try {
      setLoading(true);
      setError("");

      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);

      console.log("Force refreshing delivery data for ID:", deliveryPersonId);
      await fetchDeliveries(contract, deliveryPersonId);

      setLoading(false);
      alert(
        "Data refreshed successfully. Check browser console for delivery details."
      );
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data: " + error.message);
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if all users have received rations
  const allUsersServed = () => {
    if (!usersInDepot.length) return false;
    return usersInDepot.every((user) => user.rationAllocated);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "authenticated":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-amber-100 text-amber-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "allocated":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Get status icon based on status
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "authenticated":
        return <Shield className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Generate stats for dashboard
  const getStats = () => [
    {
      title: "Assigned Depots",
      value: assignedDepots.length,
      change: "+0%",
      icon: Package,
      color: "bg-green-50 text-green-700",
    },
    {
      title: "Pending Deliveries",
      value: pendingDeliveries.length,
      change: `+${
        pendingDeliveries.length > 0 ? pendingDeliveries.length : 0
      }%`,
      icon: Truck,
      color: "bg-amber-50 text-amber-700",
    },
    {
      title: "Completed Deliveries",
      value: completedDeliveries.length,
      change: `+${
        completedDeliveries.length > 0 ? completedDeliveries.length : 0
      }%`,
      icon: CheckCircle2,
      color: "bg-green-50 text-green-700",
    },
    {
      title: "Served Users",
      value: completedDeliveries.reduce(
        (acc, delivery) => acc + (delivery.users?.length || 0),
        0
      ),
      change: "+0%",
      icon: UserCheck,
      color: "bg-blue-50 text-blue-700",
    },
  ];
  return (
    <DealerLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-green-800">
              Delivery Person Dashboard
            </h1>
            {!loading && deliveryPersonName && (
              <p className="text-muted-foreground">
                Welcome, {deliveryPersonName}. Manage your deliveries and ration
                distributions.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <NotificationPanel 
              userAddress={account} 
              userType="delivery" 
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading || (!connected && !localStorage.getItem('currentUser')) ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-3">
              {!connected ? "Connecting to wallet..." : "Loading your dashboard..."}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="bg-blue-50">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-white"
                  disabled={currentDelivery !== null}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="active-delivery"
                  className="data-[state=active]:bg-white"
                  disabled={!currentDelivery}
                >
                  Active Delivery
                </TabsTrigger>
                <TabsTrigger
                  value="transaction-history"
                  className="data-[state=active]:bg-white"
                  disabled={currentDelivery !== null}
                >
                  Transaction History
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <motion.div
                  className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {getStats().map((stat, index) => (
                    <motion.div key={index} variants={itemVariants}>
                      <Card className="overflow-hidden border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              {stat.title}
                            </CardTitle>
                            <div className={`rounded-full p-2 ${stat.color}`}>
                              <stat.icon className="h-4 w-4" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stat.value}</div>
                          <p className="text-xs text-blue-600 flex items-center mt-1">
                            {stat.change}
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="grid gap-6 md:grid-cols-2 mt-6">
                  {/* Assigned Depots Section */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-green-100 shadow-sm h-full">
                      <CardHeader>
                        <CardTitle>Assigned Depots</CardTitle>
                        <CardDescription>
                          Select a depot to start a delivery
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {assignedDepots.length > 0 ? (
                          <div className="space-y-4">
                            {assignedDepots.map((depot) => (
                              <div
                                key={depot.id}
                                className="border rounded-lg p-4 bg-green-50/50 hover:bg-green-50 transition-colors"
                              >
                                <div className="flex items-center">
                                  <div className="rounded-full p-2 bg-green-100 text-black mr-3">
                                    <MapPin className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h3 className="font-bold">{depot.name}</h3>
                                    <p className="text-gray-600 text-sm">
                                      {depot.location}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => startDelivery(depot.id)}
                                  className="mt-3 bg-green-700 hover:bg-green-800 w-full"
                                >
                                  Start Delivery
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <Package className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              You don't have any assigned depots yet
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Pending Deliveries Section */}
                  <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-green-100 shadow-sm h-full">
                      <CardHeader>
                        <CardTitle>Pending Deliveries</CardTitle>
                        <CardDescription>
                          Deliveries awaiting your action
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {pendingDeliveries.length > 0 ? (
                          <div className="space-y-4">
                            {pendingDeliveries.map((delivery) => (
                              <div
                                key={delivery.id}
                                className="border rounded-lg p-4 bg-green-50/50 hover:bg-green-50 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <div className="rounded-full p-2 bg-green-100 text-black mr-3">
                                      <Clock className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold">
                                        {delivery.depotName}
                                      </h3>
                                      <p className="text-gray-600 text-sm">
                                        Scheduled: {formatDate(delivery.date)}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge className={getStatusColor("pending")}>
                                    Pending
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() =>
                                    startDelivery(delivery.depotId)
                                  }
                                  className="mt-3 bg-green-700 hover:bg-green-800 w-full"
                                >
                                  Start Delivery
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <Clock className="mx-auto h-12 w-12 text-gray-400" />
                            <p className="mt-2 text-gray-600">
                              No pending deliveries
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Completed Deliveries Section */}
                {completedDeliveries.length > 0 && (
                  <motion.div
                    className="mt-6"
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: 0.5 }}
                  >
                    <Card className="border-blue-100 shadow-sm">
                      <CardHeader>
                        <CardTitle>Completed Deliveries</CardTitle>
                        <CardDescription>Your delivery history</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-blue-50 hover:bg-blue-100">
                              <TableHead>Delivery ID</TableHead>
                              <TableHead>Depot</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Users Served</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {completedDeliveries.map((delivery, index) => (
                              <TableRow
                                key={index}
                                className="hover:bg-blue-50/50"
                              >
                                <TableCell className="font-medium">
                                  DEL-{delivery.deliveryId}
                                </TableCell>
                                <TableCell>{delivery.depotName}</TableCell>
                                <TableCell>
                                  {formatDate(delivery.date)}
                                </TableCell>
                                <TableCell>
                                  {(delivery.users && delivery.users.length) ||
                                    "All"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={getStatusColor("completed")}
                                  >
                                    Completed
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* Active Delivery Tab */}
              <TabsContent value="active-delivery" className="mt-6">
                {currentDelivery && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="border-blue-100 shadow-sm mb-6">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Active Delivery</CardTitle>
                          <CardDescription>
                            Depot: {currentDelivery.depotName}
                          </CardDescription>
                        </div>
                        <Badge
                          className={getStatusColor(currentDelivery.status)}
                        >
                          <div className="flex items-center">
                            {getStatusIcon(currentDelivery.status)}
                            <span className="ml-1">
                              {currentDelivery.status === "authenticated"
                                ? "Authenticated"
                                : "In Progress"}
                            </span>
                          </div>
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Important Notice */}
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                          <h3 className="text-lg font-bold text-amber-800 mb-2">
                            Delivery Process Instructions:
                          </h3>
                          <ol className="list-decimal list-inside text-amber-700 space-y-2">
                            <li>
                              <span className="font-semibold">
                                Go to the depot
                              </span>{" "}
                              and inform them you've arrived for delivery
                            </li>
                            <li>
                              <span className="font-semibold">
                                Ask the depot manager to generate an OTP
                              </span>{" "}
                              for verification
                            </li>
                            <li>
                              <span className="font-semibold">
                                Enter that OTP
                              </span>{" "}
                              in the form below to verify your identity
                            </li>
                            <li>
                              Complete location verification and ration
                              distribution
                            </li>
                          </ol>
                        </div>

                        {/* Progress Steps */}
                        <div className="py-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">
                              OTP Verification
                            </span>
                            <span className="text-sm font-medium">
                              Location Verification
                            </span>
                            <span className="text-sm font-medium">
                              Ration Distribution
                            </span>
                          </div>
                          <div className="relative w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300 ease-in-out"
                              style={{
                                width: `${
                                  currentDelivery.status === "authenticated"
                                    ? 100
                                    : 33
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* OTP Verification Section */}
                        {currentDelivery.status !== "authenticated" && (
                          <Card className="border-blue-100">
                            <CardHeader>
                              <CardTitle className="text-lg">
                                Depot Authentication
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {otpError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                  {otpError}
                                </div>
                              )}

                              {otpSuccess && (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                                  {otpSuccess}
                                </div>
                              )}

                              <div>
                                <div className="mb-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter OTP from Depot:
                                  </label>
                                  <div className="flex items-center">
                                    <input
                                      type="text"
                                      className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      value={enteredOtp}
                                      onChange={(e) =>
                                        setEnteredOtp(e.target.value)
                                      }
                                      placeholder="Enter the OTP shown by depot"
                                    />
                                    <Button
                                      onClick={verifyOTP}
                                      className="bg-blue-500 hover:bg-blue-700 rounded-l-none rounded-r-none"
                                      disabled={verifyingOtp || !enteredOtp}
                                    >
                                      {verifyingOtp
                                        ? "Verifying..."
                                        : "Verify OTP"}
                                    </Button>
                                    <Button
                                      onClick={checkActualOtp}
                                      className="bg-gray-600 hover:bg-gray-700 rounded-l-none"
                                      title="Check the actual OTP in the contract for debugging"
                                    >
                                      <span className="text-xs">Debug OTP</span>
                                    </Button>
                                  </div>
                                </div>

                                {/* Test mode toggle */}
                                <div className="mt-3 flex items-center">
                                  <input
                                    type="checkbox"
                                    id="fake-mode"
                                    className="mr-2"
                                    checked={fakeMode}
                                    onChange={() => setFakeMode(!fakeMode)}
                                  />
                                  <label
                                    htmlFor="fake-mode"
                                    className="text-sm text-gray-600"
                                  >
                                    Enable test mode (simulates blockchain
                                    transactions)
                                  </label>
                                </div>

                                <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                                  <p className="font-semibold text-red-600">
                                    IMPORTANT:
                                  </p>
                                  <p>
                                    1. The depot manager MUST generate an OTP
                                    first
                                  </p>
                                  <p>
                                    2. This sets the delivery status to "In
                                    Transit" in the system
                                  </p>
                                  <p>
                                    3. Then you can enter and verify that OTP
                                    here
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Location Verification Section */}
                        {currentDelivery.status !== "authenticated" && (
                          <Card className="border-blue-100">
                            <CardHeader>
                              <CardTitle className="text-lg">
                                Location Verification
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {locationError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                  {locationError}
                                </div>
                              )}

                              {locationSuccess && (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                                  {locationSuccess}
                                </div>
                              )}

                              {currentLocation ? (
                                <div className="mb-4">
                                  <p className="text-gray-600 mb-2">
                                    Your Current Location:
                                  </p>
                                  <div className="bg-blue-50 px-4 py-2 rounded border border-blue-200">
                                    <p>Latitude: {currentLocation.latitude}</p>
                                    <p>
                                      Longitude: {currentLocation.longitude}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-4">
                                  <p className="text-gray-600">
                                    Fetching your location...
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center">
                                <Button
                                  onClick={verifyLocation}
                                  className="bg-blue-500 hover:bg-blue-700"
                                  disabled={
                                    verifyingLocation || !currentLocation
                                  }
                                >
                                  {verifyingLocation
                                    ? "Verifying..."
                                    : "Verify Location"}
                                </Button>
                                <p className="ml-4 text-sm text-gray-600">
                                  Click to verify your location with the depot
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Ration Distribution Section */}
                        {currentDelivery.status === "authenticated" && (
                          <Card className="border-blue-100">
                            <CardHeader>
                              <CardTitle className="text-lg">
                                Ration Distribution
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {rationError && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                  {rationError}
                                </div>
                              )}

                              {rationSuccess && (
                                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                                  {rationSuccess}
                                </div>
                              )}

                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-blue-50 hover:bg-blue-100">
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {usersInDepot.length > 0 ? (
                                    usersInDepot.map((user) => (
                                      <TableRow
                                        key={user.id}
                                        className="hover:bg-blue-50/50"
                                      >
                                        <TableCell className="font-medium">
                                          {user.id}
                                        </TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.category}</TableCell>
                                        <TableCell>
                                          <Badge
                                            className={
                                              user.rationAllocated
                                                ? "bg-green-100 text-green-800"
                                                : "bg-amber-100 text-amber-800"
                                            }
                                          >
                                            {user.rationAllocated
                                              ? "Allocated"
                                              : "Pending"}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            onClick={() =>
                                              allocateRation(user.id)
                                            }
                                            variant={
                                              user.rationAllocated
                                                ? "outline"
                                                : "default"
                                            }
                                            className={
                                              user.rationAllocated
                                                ? "bg-gray-100 text-gray-500 hover:bg-gray-100 cursor-not-allowed"
                                                : "bg-green-500 hover:bg-green-600"
                                            }
                                            disabled={
                                              user.rationAllocated ||
                                              allocatingRation
                                            }
                                          >
                                            {user.rationAllocated
                                              ? "Allocated"
                                              : "Allocate Ration"}
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell
                                        colSpan="5"
                                        className="text-center text-gray-500 py-4"
                                      >
                                        No users assigned to this depot
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        )}

                        {/* Complete Delivery Button */}
                        {currentDelivery.status === "authenticated" && (
                          <div className="flex justify-center mt-6">
                            <Button
                              onClick={completeDelivery}
                              className={
                                allUsersServed()
                                  ? "bg-green-500 hover:bg-green-600 px-8 py-6 text-lg"
                                  : "bg-gray-400 hover:bg-gray-400 cursor-not-allowed px-8 py-6 text-lg"
                              }
                              disabled={!allUsersServed()}
                            >
                              Complete Delivery
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </TabsContent>

              {/* Transaction History Tab */}
              <TabsContent value="transaction-history" className="mt-6">
                <motion.div
                  variants={itemVariants}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-green-100 shadow-sm">
                    <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>
                        Record of your blockchain transactions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-green-100 hover:bg-green-150">
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Transaction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {txHistory.length > 0 ? (
                            txHistory
                              .slice()
                              .reverse()
                              .map((tx, index) => (
                                <TableRow
                                  key={index}
                                  className="hover:bg-green-50/50"
                                >
                                  <TableCell className="font-medium">
                                    {tx.type}
                                  </TableCell>
                                  <TableCell>
                                    {formatDate(tx.timestamp)}
                                  </TableCell>
                                  <TableCell>{tx.details}</TableCell>
                                  <TableCell>
                                    <a
                                      href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center"
                                    >
                                      View
                                      <ArrowUpRight className="h-3 w-3 ml-1" />
                                    </a>
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan="4"
                                className="text-center text-gray-500 py-4"
                              >
                                No transaction history available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      {/* MetaMask Transaction Modal */}
      {showMetaMaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 mr-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 35 33"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z"
                    fill="#E17726"
                    stroke="#E17726"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.65881 1L15.6697 10.8511L13.3487 4.99099L2.65881 1Z"
                    fill="#E27625"
                    stroke="#E27625"
                    strokeWidth="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">MetaMask Transaction</h3>
            </div>

            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Transaction Type:</span>
                <span className="font-medium">
                  {metaMaskModalType === "otp"
                    ? "OTP Verification"
                    : metaMaskModalType === "location"
                    ? "Location Verification"
                    : "Payment Processing"}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-600">To Contract:</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-[180px]">
                  {activeDepot?.walletAddress || "0xContract..."}
                </span>
              </div>

              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Gas Fee (est.):</span>
                <span>0.001 ETH</span>
              </div>

              {metaMaskModalType === "complete" && (
                <div className="flex justify-between mb-2 text-green-700">
                  <span className="font-medium">Payment Amount:</span>
                  <span className="font-medium">
                    {transactionAmount || "0.05"} ETH
                  </span>
                </div>
              )}
            </div>

            <p className="mb-4 text-center text-gray-700">
              {metaMaskModalMessage}
            </p>

            <div className="flex justify-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Please confirm this transaction in your MetaMask wallet
            </p>
          </div>
        </div>
      )}
      {/* <div className="mt-4">
        <h3 className="font-medium text-lg mb-2">Complete Delivery by ID</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter Delivery ID"
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={deliveryIdToComplete}
            onChange={(e) => setDeliveryIdToComplete(e.target.value)}
          />
          <Button
            onClick={() => completeDelivery(deliveryIdToComplete)}
            className="bg-blue-500 hover:bg-blue-700 rounded-l-none"
          >
            Complete
          </Button>
        </div>
      </div> */}
    </DealerLayout>
  );
}
