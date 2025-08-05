"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Leaf, Store, HeartHandshake } from "lucide-react";

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
import { MetaMaskConnect } from "@/components/metamask-connect";
import { AuthLayout } from "@/components/auth-layout";
import { useMetaMask } from "@/components/MetaMaskProvider";
import { ConsumerSignup } from "@/components/ConsumerSignup";
import { DeliverySignup } from "@/components/DeliverySignup";

export default function SignupPage() {
  const router = useRouter();
  const params = useParams();
  const userType = params.type || "consumer";

  // If it's a consumer, render the separate component
  if (userType === "consumer") {
    return <ConsumerSignup />;
  }

  // If it's a delivery partner, render the separate component
  if (userType === "delivery") {
    return <DeliverySignup />;
  }

  const { connected, account } = useMetaMask();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  // Form data for vendor and NGO user types only
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    storeName: "", // For vendor
    storeAddress: "", // For vendor
    licenseNumber: "", // For vendor
    ngoId: "", // For NGO
    registrationNumber: "", // For NGO
  });

  // Sync wallet state with MetaMask provider
  useEffect(() => {
    setWalletConnected(connected);
    setWalletAddress(account || "");
  }, [connected, account]);

  // Get user type title for display
  const getUserTypeTitle = () => {
    switch (userType) {
      case "vendor":
        return "Vendor";
      case "ngo":
        return "NGO";
      default:
        return "User";
    }
  };

  // Get user type icon
  const getUserTypeIcon = () => {
    switch (userType) {
      case "vendor":
        return <Store className="h-4 w-4" />;
      case "ngo":
        return <HeartHandshake className="h-4 w-4" />;
      default:
        return <Leaf className="h-4 w-4" />;
    }
  };

  const handleWalletConnect = (address) => {
    setWalletConnected(true);
    setWalletAddress(address);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validate based on user type
  const validateForm = async () => {
    // Check wallet connection
    if (!walletConnected) {
      setError("Please connect your wallet first");
      return false;
    }

    if (!formData.name || !formData.email || !formData.phone) {
      setError("Please fill in all required fields");
      return false;
    }

    // Validate specific user type fields
    switch (userType) {
      case "vendor":
        if (
          !formData.storeName ||
          !formData.storeAddress ||
          !formData.licenseNumber
        ) {
          setError("Please fill in all vendor details");
          return false;
        }
        break;
      case "ngo":
        if (!formData.ngoId || !formData.registrationNumber) {
          setError("Please fill in all NGO details");
          return false;
        }
        break;
    }

    return true;
  };

  const handleSignup = async () => {
    const isValid = await validateForm();
    if (!isValid) return;

    try {
      setIsLoading(true);
      setError(null);

      // Handle non-consumer user types with wallet connection
      const signupData = {
        ...formData,
        userType,
        walletAddress,
      };

      console.log("Signing up user:", signupData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Redirect to dashboard after successful signup
      router.push(`/user`);
    } catch (err) {
      console.error("Signup error:", err);
      setError("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render additional fields based on user type
  const renderUserTypeFields = () => {
    switch (userType) {
      case "vendor":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="storeName">
                Store Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="storeName"
                name="storeName"
                placeholder="Enter your store name"
                value={formData.storeName}
                onChange={handleInputChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">
                Store Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="storeAddress"
                name="storeAddress"
                placeholder="Enter your store address"
                value={formData.storeAddress}
                onChange={handleInputChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">
                Business License Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="licenseNumber"
                name="licenseNumber"
                placeholder="Enter your business license number"
                value={formData.licenseNumber}
                onChange={handleInputChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </>
        );

      case "ngo":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="ngoId">
                NGO ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ngoId"
                name="ngoId"
                placeholder="Enter your NGO ID"
                value={formData.ngoId}
                onChange={handleInputChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">
                Registration Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="registrationNumber"
                name="registrationNumber"
                placeholder="Enter your registration number"
                value={formData.registrationNumber}
                onChange={handleInputChange}
                required
                className="border-green-200 focus-visible:ring-green-500"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title={`Create a ${getUserTypeTitle()} account`}
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
                {getUserTypeIcon()}
              </div>
              <CardTitle className="text-2xl text-green-900">
                {getUserTypeTitle()} Sign Up
              </CardTitle>
            </div>
            <CardDescription>
              Create a new {getUserTypeTitle().toLowerCase()} account with MetaMask
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

            <MetaMaskConnect onConnect={handleWalletConnect} />

            {walletConnected && (
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
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
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

                {/* User type specific fields */}
                {renderUserTypeFields()}

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
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              onClick={handleSignup}
              disabled={!walletConnected || isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading
                ? "Creating account..."
                : `Create ${getUserTypeTitle()} Account`}
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