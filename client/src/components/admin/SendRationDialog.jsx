import { useState, useEffect } from 'react';
import { Truck, Package, Calendar, MapPin, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function SendRationDialog({ adminAddress }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [formData, setFormData] = useState({
    shopkeeperAddress: '',
    deliveryAgentAddress: '',
    rationType: '',
    quantity: '',
    estimatedDeliveryTime: '',
    notes: ''
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Fetch shopkeepers and delivery agents
    setShopkeepers([
      { address: '0x1234...5678', name: 'Shopkeeper A', area: 'Area 1' },
      { address: '0x2345...6789', name: 'Shopkeeper B', area: 'Area 2' },
      { address: '0x3456...7890', name: 'Shopkeeper C', area: 'Area 3' }
    ]);

    setDeliveryAgents([
      { address: '0x4567...8901', name: 'Agent X', vehicleType: 'Bike' },
      { address: '0x5678...9012', name: 'Agent Y', vehicleType: 'Van' },
      { address: '0x6789...0123', name: 'Agent Z', vehicleType: 'Truck' }
    ]);
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.shopkeeperAddress || !formData.deliveryAgentAddress || 
        !formData.rationType || !formData.quantity || !formData.estimatedDeliveryTime) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);

      const rationDetails = {
        type: formData.rationType,
        quantity: parseFloat(formData.quantity),
        unit: 'kg',
        notes: formData.notes
      };

      const response = await fetch('/api/admin/dispatch-ration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopkeeperAddress: formData.shopkeeperAddress,
          deliveryAgentAddress: formData.deliveryAgentAddress,
          rationDetails,
          estimatedDeliveryTime: new Date(formData.estimatedDeliveryTime).getTime(),
          adminAddress
        })
      });

      const result = await response.json();

      if (result.success) {
        alert('Ration dispatch created successfully! Notifications sent to shopkeeper and delivery agent.');
        
        // Emit event for admin dashboard to listen to
        const event = new CustomEvent('rationDispatchUpdate', {
          detail: {
            dispatchId: result.dispatch.id,
            success: true,
            dispatch: result.dispatch
          }
        });
        window.dispatchEvent(event);
        
        setOpen(false);
        setFormData({
          shopkeeperAddress: '',
          deliveryAgentAddress: '',
          rationType: '',
          quantity: '',
          estimatedDeliveryTime: '',
          notes: ''
        });
      } else {
        alert('Failed to create dispatch: ' + result.error);
        
        // Emit error event
        const event = new CustomEvent('rationDispatchUpdate', {
          detail: {
            success: false,
            error: result.error
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error sending ration:', error);
      alert('Failed to send ration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get current date-time for min attribute
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Send className="h-4 w-4 mr-2" />
          Send Ration
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Dispatch Ration to Shopkeeper
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shopkeeper Selection */}
          <div className="space-y-2">
            <Label htmlFor="shopkeeper">Shopkeeper *</Label>
            <Select 
              value={formData.shopkeeperAddress} 
              onValueChange={(value) => handleInputChange('shopkeeperAddress', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shopkeeper" />
              </SelectTrigger>
              <SelectContent>
                {shopkeepers.map((shopkeeper) => (
                  <SelectItem key={shopkeeper.address} value={shopkeeper.address}>
                    {shopkeeper.name} - {shopkeeper.area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Agent Selection */}
          <div className="space-y-2">
            <Label htmlFor="deliveryAgent">Delivery Agent *</Label>
            <Select 
              value={formData.deliveryAgentAddress} 
              onValueChange={(value) => handleInputChange('deliveryAgentAddress', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select delivery agent" />
              </SelectTrigger>
              <SelectContent>
                {deliveryAgents.map((agent) => (
                  <SelectItem key={agent.address} value={agent.address}>
                    {agent.name} - {agent.vehicleType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ration Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rationType">Ration Type *</Label>
              <Select 
                value={formData.rationType} 
                onValueChange={(value) => handleInputChange('rationType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rice">Rice</SelectItem>
                  <SelectItem value="wheat">Wheat</SelectItem>
                  <SelectItem value="sugar">Sugar</SelectItem>
                  <SelectItem value="oil">Oil</SelectItem>
                  <SelectItem value="mixed">Mixed Ration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (kg) *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="0.1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
          </div>

          {/* Estimated Delivery Time */}
          <div className="space-y-2">
            <Label htmlFor="deliveryTime">Estimated Delivery Time *</Label>
            <Input
              id="deliveryTime"
              type="datetime-local"
              min={getCurrentDateTime()}
              value={formData.estimatedDeliveryTime}
              onChange={(e) => handleInputChange('estimatedDeliveryTime', e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Dispatch Ration
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">What happens next:</p>
              <ul className="mt-1 list-disc list-inside text-xs space-y-1">
                <li>Shopkeeper will receive notification with OTP</li>
                <li>Delivery agent will get assignment details</li>
                <li>Both parties can verify delivery with OTP and location</li>
                <li>Blockchain record will be updated upon completion</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
