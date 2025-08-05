"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  Store, 
  MapPin, 
  User,
  Loader2,
  AlertCircle,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RegisterShopkeeper() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    address: '',
    name: '',
    area: ''
  });
  const [registering, setRegistering] = useState(false);
  const [txHash, setTxHash] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.address || !formData.name || !formData.area) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setRegistering(true);
    setTxHash('');

    try {
      console.log('🏪 Registering shopkeeper on blockchain:', formData);
      
      const response = await fetch('/api/admin/register-shopkeeper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTxHash(data.txHash);
        toast({
          title: "Success!",
          description: `Shopkeeper ${formData.name} registered successfully on blockchain`,
        });
        
        // Reset form
        setFormData({
          address: '',
          name: '',
          area: ''
        });
      } else {
        throw new Error(data.error || 'Registration failed');
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register shopkeeper",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Transaction hash copied to clipboard",
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Register Shopkeeper</h1>
        <p className="text-gray-600">Register a shopkeeper on the blockchain for PDS system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Shopkeeper Registration Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Shopkeeper Wallet Address *
              </label>
              <Input
                type="text"
                placeholder="0x..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The Ethereum wallet address of the shopkeeper
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Store className="inline w-4 h-4 mr-1" />
                Shopkeeper Name *
              </label>
              <Input
                type="text"
                placeholder="Rajesh General Store"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Area/Location *
              </label>
              <Input
                type="text"
                placeholder="Sector 15, Noida"
                value={formData.area}
                onChange={(e) => setFormData({...formData, area: e.target.value})}
                className="w-full"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={registering}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {registering ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering on Blockchain...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Register Shopkeeper
                </>
              )}
            </Button>
          </form>

          {txHash && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">Registration Successful!</h3>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Shopkeeper has been registered on the blockchain. Transaction:
              </p>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <code className="text-xs text-gray-600 flex-1 break-all">
                  {txHash}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(txHash)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <div className="mt-3">
                <a
                  href={`https://amoy.polygonscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on Polygon Amoy Explorer →
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-800">Important Notes</h3>
            </div>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Only registered shopkeepers can be assigned to consumers</li>
              <li>The wallet address must be unique and not already registered</li>
              <li>Shopkeepers need to be active on blockchain for consumer approval</li>
              <li>Once registered, shopkeepers can accept consumer assignments</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
