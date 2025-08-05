"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, Wallet } from "lucide-react";
import { ethers } from "ethers";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthLayout } from "@/components/auth-layout";

export function DeliverySignup() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    vehicleType: "",
    licenseNumber: "",
    address: "",
    walletAddress: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Function to connect wallet and get address
  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install MetaMask to continue.");
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        const walletAddress = accounts[0];
        
        // Validate the address format
        if (ethers.isAddress(walletAddress)) {
          setFormData((prev) => ({ ...prev, walletAddress }));
        } else {
          setError("Invalid wallet address format.");
        }
      } else {
        setError("No wallet accounts found. Please make sure MetaMask is unlocked.");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        setError("Wallet connection was rejected. Please approve the connection to continue.");
      } else {
        setError("Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Function to validate delivery rider data against mock data
  const validateDeliveryData = async () => {
    try {
      const response = await fetch("/mockdata-delivery.json");
      const mockData = await response.json();

      // Find a record that matches name, license number, and vehicle type
      const matchingRecord = mockData.find(
        (record) =>
          record.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
          record.licenseNumber === formData.licenseNumber &&
          record.vehicleType.toLowerCase() === formData.vehicleType.toLowerCase()
      );

      if (!matchingRecord) {
        setError(
          "Name, License Number, and Vehicle Type do not match our records. Please verify your details."
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error validating delivery rider data:", error);
      setError("Unable to verify your details. Please try again.");
      return false;
    }
  };

  const validateForm = async () => {
    if (!formData.name || !formData.phone) {
      setError("Please fill in all required fields");
      return false;
    }

    if (
      !formData.vehicleType ||
      !formData.licenseNumber ||
      !formData.address
    ) {
      setError("Please fill in all delivery partner details");
      return false;
    }

    if (!formData.walletAddress) {
      setError("Please connect your wallet to continue");
      return false;
    }

    // Validate wallet address format
    if (!ethers.isAddress(formData.walletAddress)) {
      setError("Invalid wallet address format");
      return false;
    }

    // Additional validation for delivery rider data against mock data
    const isValidDeliveryRider = await validateDeliveryData();
    if (!isValidDeliveryRider) {
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setIsLoading(true);
      setError(null);

      // Send delivery rider signup request to admin for approval
      const response = await fetch("/api/delivery-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          vehicleType: formData.vehicleType,
          licenseNumber: formData.licenseNumber,
          address: formData.address,
          walletAddress: formData.walletAddress,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to submit signup request");
        return;
      }

      // Show success message and redirect
      alert(
        "Signup request submitted successfully! Please wait for admin approval. You will be notified via phone."
      );
      router.push("/signup-pending");
    } catch (err) {
      console.error("Signup error:", err);
      setError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create a Delivery Partner account"
      description="Sign up to access the Grainlyy platform"
    >
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
                <Truck className="h-4 w-4" />
              </div>
              <CardTitle className="text-2xl text-green-900">
                Delivery Partner Sign Up
              </CardTitle>
            </div>
            <CardDescription>
              Create a new delivery partner account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter your address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
              
              {/* Wallet Address Section */}
              <div className="space-y-2">
                <Label htmlFor="walletAddress">
                  Wallet Address <span className="text-red-500">*</span>
                </Label>
                <div className="space-y-2">
                  {formData.walletAddress ? (
                    <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <Wallet className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-mono text-green-700 flex-1 truncate">
                        {formData.walletAddress}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={connectWallet}
                        disabled={isConnecting}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isConnecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          Connect Wallet
                        </>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Connect your MetaMask wallet to register for blockchain transactions
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">
                  Vehicle Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    handleSelectChange("vehicleType", value)
                  }
                  value={formData.vehicleType}
                >
                  <SelectTrigger className="border-green-200 focus-visible:ring-green-500">
                    <SelectValue placeholder="Select your vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bicycle">Bicycle</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenseNumber">
                  License Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  placeholder="Enter your license number"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                By signing up, you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-green-600 hover:text-green-700 font-medium"
                >
                  Privacy Policy
                </Link>
              </div>
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleSignup}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Creating account..." : "Create Delivery Partner Account"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </AuthLayout>
  );
}