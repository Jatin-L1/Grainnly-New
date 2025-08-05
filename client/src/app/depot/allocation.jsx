import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMetaMask } from '@/components/MetaMaskProvider';
import DepotLayout from '../../components/DepotLayout';
import { getContract } from '../../utils/contract';
import { ethers } from 'ethers';

export default function DepotAllocations() {
  const { connected, provider } = useMetaMask();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [depotAddress, setDepotAddress] = useState('');
  const [depotId, setDepotId] = useState(null);
  const [depotName, setDepotName] = useState('');
  const [error, setError] = useState('');
  
  const [users, setUsers] = useState([]);
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');
  const [rationAmount, setRationAmount] = useState('0.01');
  const [allocating, setAllocating] = useState(false);
  
  // Add isMounted state to prevent hydration errors
  const [isMounted, setIsMounted] = useState(false);
  
  // Mark component as mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !connected) return;
    
    if (!connected) {
      router.push('/');
      return;
    }

    const fetchDepotInfo = async () => {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const address = accounts[0];
        setDepotAddress(address);
        
        // Create ethers provider from MetaMask provider
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);
        
        // Fetch depot ID based on wallet address
        const depotCount = await contract.depotCount();
        let foundDepot = false;
        let foundDepotId = null;
        
        for (let i = 1; i <= Number(depotCount); i++) {
          const depot = await contract.getDepotDetails(i);
          
          if (depot.walletAddress.toLowerCase() === address.toLowerCase()) {
            setDepotId(depot.id.toString());
            setDepotName(depot.name);
            foundDepot = true;
            foundDepotId = depot.id.toString();
            break;
          }
        }
        
        if (!foundDepot) {
          console.error('Connected wallet is not registered as a depot');
          setError('Your wallet is not registered as a depot. Please contact admin.');
          setLoading(false);
          return;
        }
        
        // Fetch users assigned to this depot
        const userCount = await contract.userCount();
        const depotUsers = [];
        
        for (let i = 1; i <= Number(userCount); i++) {
          try {
            const user = await contract.getUserDetails(i);
            
            if (user.assignedDepotId.toString() === foundDepotId) {
              depotUsers.push({
                id: user.id.toString(),
                name: user.name,
                category: user.category === 0 ? "APL" : "BPL",
                address: user.walletAddress
              });
            }
          } catch (err) {
            console.error(`Error fetching user ${i}:`, err);
          }
        }
        
        setUsers(depotUsers);
        
        // Since deliveryPersonCount is not available, we'll use mock data for now
        console.log("⚠️ Delivery person assignment system not yet implemented");
        const depotDeliveryPersons = [
          {
            id: "1",
            name: "Mock Delivery Agent 1",
            address: "0x1234567890123456789012345678901234567890",
            isActive: true
          },
          {
            id: "2", 
            name: "Mock Delivery Agent 2",
            address: "0x0987654321098765432109876543210987654321",
            isActive: true
          }
        ];
        
        setDeliveryPersons(depotDeliveryPersons);
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching depot info:', error);
        setError('Failed to load your data: ' + (error.message || error.toString()));
        setLoading(false);
      }
    };
  
    fetchDepotInfo();
  }, [isMounted, connected, provider, router]);

  const handleAllocateRation = async (e) => {
    e.preventDefault();
    
    if (!isMounted) return; // Safety check for client-side only code

    if (!selectedUser || !selectedDeliveryPerson || !rationAmount) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setAllocating(true);
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Convert ETH amount to wei
      const amountInWei = ethers.parseEther(rationAmount);
      
      // Call the allocateRation function from the smart contract
      const tx = await contract.allocateRation(
        selectedUser,
        selectedDeliveryPerson,
        amountInWei
      );
      
      await tx.wait();
      
      alert('Ration allocated successfully!');
      router.push('/depot');
    } catch (error) {
      console.error('Error allocating ration:', error);
      alert('Failed to allocate ration: ' + (error.message || error.toString()));
    } finally {
      setAllocating(false);
    }
  };

  // If not mounted yet, return minimal UI that matches server-rendered version
  if (!isMounted) {
    return (
      <DepotLayout>
        <Head>
          <title>Allocate Rations | Grainlyyy</title>
        </Head>
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <div className="mr-4 text-gray-600 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">Allocate New Rations</h1>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-8">
            <p className="text-blue-800">
              <strong>Connected as:</strong> Loading...
            </p>
          </div>
          
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      </DepotLayout>
    );
  }

  return (
    <DepotLayout>
      <Head>
        <title>Allocate Rations | Grainlyyy</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => router.back()}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">Allocate New Rations</h1>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-8">
          <p className="text-blue-800">
            <strong>Connected as:</strong> {depotAddress ? `${depotAddress.slice(0, 6)}...${depotAddress.slice(-4)}` : 'Not connected'}
          </p>
          {depotName && (
            <p className="text-blue-800 mt-1">
              <strong>Depot Name:</strong> {depotName}
            </p>
          )}
          {depotId && (
            <p className="text-blue-800 mt-1">
              <strong>Depot ID:</strong> {depotId}
            </p>
          )}
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading...</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Allocate Ration to Beneficiary</h2>
            
            {users.length === 0 && (
              <div className="bg-yellow-50 p-4 rounded mb-6">
                <p className="text-yellow-800">No beneficiaries are assigned to this depot yet. Please contact the admin to assign beneficiaries.</p>
              </div>
            )}
            
            {deliveryPersons.length === 0 && (
              <div className="bg-yellow-50 p-4 rounded mb-6">
                <p className="text-yellow-800">No delivery persons are assigned to this depot yet. Please contact the admin to assign delivery persons.</p>
              </div>
            )}
            
            <form onSubmit={handleAllocateRation}>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div>
                  <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Beneficiary
                  </label>
                  <select
                    id="user"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                    disabled={users.length === 0}
                  >
                    <option value="">Select a beneficiary</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} (ID: {user.id}, {user.category})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="deliveryPerson" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Delivery Person
                  </label>
                  <select
                    id="deliveryPerson"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    value={selectedDeliveryPerson}
                    onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                    required
                    disabled={deliveryPersons.length === 0}
                  >
                    <option value="">Select a delivery person</option>
                    {deliveryPersons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} (ID: {person.id}, {person.isActive ? 'Active' : 'Inactive'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Ration Amount (ETH)
                  </label>
                  <input
                    type="number"
                    id="amount"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
                    value={rationAmount}
                    onChange={(e) => setRationAmount(e.target.value)}
                    min="0.001"
                    step="0.001"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This represents the ration value in ETH that will be transferred to the delivery person upon successful delivery.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={allocating || users.length === 0 || deliveryPersons.length === 0}
                  >
                    {allocating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Allocating Ration...
                      </>
                    ) : (
                      'Allocate Ration'
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium mb-4">Important Information</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                <li>Allocating a ration will create a new delivery record in the system.</li>
                <li>The selected delivery person will be notified of the new delivery assignment.</li>
                <li>The delivery person will need to collect the ration package from the depot.</li>
                <li>The beneficiary will need to verify receipt using OTP verification.</li>
                <li>Funds will only be released to the delivery person after successful verification.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </DepotLayout>
  );
}