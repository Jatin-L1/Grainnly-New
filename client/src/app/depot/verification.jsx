import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMetaMask } from '@/components/MetaMaskProvider';
import DepotLayout from '../../components/DepotLayout';
import { getContract } from '../../utils/contract';
import { ethers } from 'ethers';

export default function DepotVerifications() {
  const { connected, provider } = useMetaMask();
  const router = useRouter();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [depotId, setDepotId] = useState(null);
  const [depotName, setDepotName] = useState('');
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [inProgressDeliveries, setInProgressDeliveries] = useState([]);
  const [error, setError] = useState('');
  
  // OTP verification state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  // Location verification state
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  
  // Transaction record state
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  
  // Add this to prevent hydration errors
  const [isMounted, setIsMounted] = useState(false);

  // Mark component as mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only run geolocation code on client after mount
  useEffect(() => {
    if (!isMounted || !connected) return;
    
    // Get current location for verification
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }, [isMounted, connected]);

  // Only load data after mounted and connected
  useEffect(() => {
    if (!isMounted || !connected) return;
    
    if (!connected) {
      router.push('/');
      return;
    }

    const fetchDepotData = async () => {
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        const address = accounts[0];
        
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        const contract = getContract(signer);
        
        // Find depot ID from wallet address
        const depotCount = await contract.depotCount();
        let foundDepot = false;
        
        for (let i = 1; i <= Number(depotCount); i++) {
          const depot = await contract.getDepotDetails(i);
          
          if (depot.walletAddress.toLowerCase() === address.toLowerCase()) {
            setDepotId(depot.id.toString());
            setDepotName(depot.name);
            foundDepot = true;
            
            // Fetch deliveries for this depot
            await fetchDeliveries(contract, depot.id.toString());
            break;
          }
        }
        
        if (!foundDepot) {
          setError('This wallet is not registered as a depot. Please contact admin.');
          setLoading(false);
        }
        
        // Load transaction history from local storage only after mounting
        if (isMounted) {
          try {
            const savedHistory = localStorage.getItem('Grainlyyy-verification-history');
            if (savedHistory) {
              setTransactionHistory(JSON.parse(savedHistory));
            }
          } catch (err) {
            console.error('Error loading transaction history:', err);
          }
        }
        
      } catch (error) {
        console.error('Error fetching depot data:', error);
        setError('Failed to load depot data: ' + (error.message || error.toString()));
        setLoading(false);
      }
    };
    
    fetchDepotData();
  }, [isMounted, connected, provider, router]);
  
  // Helper function to format dates consistently between server and client
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };
  
  const fetchDeliveries = async (contract, depotId) => {
    try {
      const deliveryCount = await contract.rationDeliveryCount();
      const pendingDeliveriesData = [];
      const inProgressDeliveriesData = [];
      
      for (let i = 1; i <= Number(deliveryCount); i++) {
        try {
          const delivery = await contract.getDeliveryDetails(i);
          
          // Only include deliveries for this depot
          if (delivery.depotId.toString() === depotId) {
            // Fetch additional data
            const user = await contract.getUserDetails(delivery.userId);
            
            // Since getDeliveryPersonDetails is not available, use mock data
            const deliveryPerson = {
              name: `Delivery Agent ${delivery.deliveryPersonId}`,
              walletAddress: `0x${'0'.repeat(38)}${delivery.deliveryPersonId.toString().padStart(2, '0')}`
            };
            
            const createdAtTimestamp = Number(delivery.createdAt) * 1000;
            const deliveryData = {
              id: delivery.id.toString(),
              userId: delivery.userId.toString(),
              userName: user.name,
              userCategory: user.category.toString(),
              deliveryPersonId: delivery.deliveryPersonId.toString(),
              deliveryPersonName: deliveryPerson.name,
              deliveryPersonWallet: deliveryPerson.walletAddress,
              amount: ethers.formatEther(delivery.amount),
              status: Number(delivery.status),
              createdAt: formatDate(createdAtTimestamp), // Use consistent date format
              hasOtp: delivery.hasOtp,
              otpVerified: delivery.otpVerified,
              locationVerified: delivery.locationVerified
            };
            
            // Sort based on verification status
            if (deliveryData.status === 0) {
              // Pending deliveries - need OTP generation/verification
              pendingDeliveriesData.push(deliveryData);
            } else if (deliveryData.status === 1) {
              // In progress - need location verification and completion
              inProgressDeliveriesData.push(deliveryData);
            }
          }
        } catch (err) {
          console.error(`Error fetching delivery ${i}:`, err);
        }
      }
      
      setPendingDeliveries(pendingDeliveriesData);
      setInProgressDeliveries(inProgressDeliveriesData);
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setError('Failed to load deliveries: ' + (error.message || error.toString()));
      setLoading(false);
    }
  };

  const handleGenerateOTP = async (deliveryId) => {
    if (!isMounted) return; // Safety check
    
    try {
      setLoading(true);
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      const tx = await contract.generateOTP(deliveryId);
      await tx.wait();
      
      // Record transaction
      addToTransactionHistory({
        type: 'Generate OTP',
        deliveryId,
        timestamp: Date.now(),
        hash: tx.hash
      });
      
      alert('OTP generated successfully and sent to the delivery person!');
      
      // Refresh data
      if (depotId) {
        await fetchDeliveries(contract, depotId);
      }
      
    } catch (error) {
      console.error('Error generating OTP:', error);
      alert('Failed to generate OTP: ' + (error.message || error.toString()));
      setLoading(false);
    }
  };
  
  const openOtpModal = (delivery) => {
    if (!isMounted) return; // Safety check
    setSelectedDelivery(delivery);
    setOtpValue('');
    setOtpError('');
    setOtpModalOpen(true);
  };
  
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!isMounted) return; // Safety check
    
    if (!otpValue) {
      setOtpError('Please enter the OTP');
      return;
    }
    
    try {
      setVerifyingOtp(true);
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      const tx = await contract.verifyOTP(selectedDelivery.id, otpValue);
      await tx.wait();
      
      // Record transaction
      addToTransactionHistory({
        type: 'Verify OTP',
        deliveryId: selectedDelivery.id,
        otp: otpValue,
        timestamp: Date.now(),
        hash: tx.hash
      });
      
      setOtpModalOpen(false);
      alert('OTP verified successfully! The delivery is now in progress.');
      
      // Refresh data
      if (depotId) {
        await fetchDeliveries(contract, depotId);
      }
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError('OTP verification failed: ' + (error.message || error.toString()));
    } finally {
      setVerifyingOtp(false);
    }
  };
  
  const openLocationModal = (delivery) => {
    if (!isMounted) return; // Safety check
    setSelectedDelivery(delivery);
    setLocationError('');
    setLocationModalOpen(true);
  };
  
  const handleVerifyLocation = async () => {
    if (!isMounted) return; // Safety check
    
    if (!userLocation) {
      setLocationError('Cannot access your location. Please allow location access and try again.');
      return;
    }
    
    try {
      setVerifyingLocation(true);
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Convert location to integers as expected by contract (multiplied by 1,000,000)
      const latInt = Math.round(userLocation.latitude * 1000000);
      const longInt = Math.round(userLocation.longitude * 1000000);
      
      const tx = await contract.verifyLocation(selectedDelivery.id, latInt, longInt);
      await tx.wait();
      
      // Record transaction
      addToTransactionHistory({
        type: 'Verify Location',
        deliveryId: selectedDelivery.id,
        location: `${userLocation.latitude}, ${userLocation.longitude}`,
        timestamp: Date.now(),
        hash: tx.hash
      });
      
      setLocationModalOpen(false);
      alert('Location verified successfully!');
      
      // Refresh data
      if (depotId) {
        await fetchDeliveries(contract, depotId);
      }
      
    } catch (error) {
      console.error('Error verifying location:', error);
      setLocationError('Location verification failed: ' + (error.message || error.toString()));
    } finally {
      setVerifyingLocation(false);
    }
  };
  
  const handleCompleteDelivery = async (deliveryId, amount) => {
    if (!isMounted) return; // Safety check
    
    try {
      setLoading(true);
      
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const contract = getContract(signer);
      
      // Convert ETH amount to wei
      const amountInWei = ethers.parseEther(amount);
      
      const tx = await contract.completeDelivery(deliveryId, { value: amountInWei });
      await tx.wait();
      
      // Record transaction
      addToTransactionHistory({
        type: 'Complete Delivery',
        deliveryId,
        amount,
        timestamp: Date.now(),
        hash: tx.hash
      });
      
      alert('Delivery completed successfully! Payment sent to delivery person.');
      
      // Refresh data
      if (depotId) {
        await fetchDeliveries(contract, depotId);
      }
      
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to complete delivery: ' + (error.message || error.toString()));
      setLoading(false);
    }
  };
  
  const addToTransactionHistory = (transaction) => {
    if (!isMounted) return; // Safety check
    
    const updatedHistory = [transaction, ...transactionHistory];
    setTransactionHistory(updatedHistory);
    
    // Save to local storage - only on client side
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('Grainlyyy-verification-history', JSON.stringify(updatedHistory));
      }
    } catch (err) {
      console.error('Error saving transaction history:', err);
    }
  };
  
  const viewTransactionDetails = (transaction) => {
    if (!isMounted) return; // Safety check
    setViewTransaction(transaction);
    setTransactionModalOpen(true);
  };

  // If not mounted yet, return minimal UI that matches the server-rendered version
  if (!isMounted) {
    return (
      <DepotLayout>
        <Head>
          <title>Delivery Verifications | Grainlyyy</title>
        </Head>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center mb-8">
            <div className="mr-4 text-gray-600 hover:text-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">Delivery Verifications</h1>
          </div>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading verification data...</p>
          </div>
        </div>
      </DepotLayout>
    );
  }

  return (
    <DepotLayout>
      <Head>
        <title>Delivery Verifications | Grainlyyy</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => router.push('/depot')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold">Delivery Verifications</h1>
        </div>
        
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2">Loading verification data...</p>
          </div>
        ) : (
          <>
            {/* Depot Information */}
            <div className="bg-blue-50 p-4 rounded-lg mb-8">
              <h2 className="text-lg font-medium text-blue-800 mb-2">Depot Information</h2>
              <p className="text-blue-800">
                <strong>Depot ID:</strong> {depotId}
              </p>
              <p className="text-blue-800 mt-1">
                <strong>Name:</strong> {depotName}
              </p>
              {userLocation && (
                <p className="text-blue-800 mt-1">
                  <strong>Current Location:</strong> {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                </p>
              )}
            </div>
            
            {/* Pending Deliveries Section */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4">Pending OTP Verification</h2>
              
              {pendingDeliveries.length === 0 ? (
                <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
                  <p className="text-gray-500">No pending deliveries require OTP verification.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Beneficiary
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delivery Person
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          OTP Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {delivery.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.userName} (ID: {delivery.userId})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.deliveryPersonName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.amount} ETH
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.createdAt}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.hasOtp ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                OTP Generated
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                No OTP
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!delivery.hasOtp ? (
                              <button
                                onClick={() => handleGenerateOTP(delivery.id)}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Generate OTP
                              </button>
                            ) : (
                              <button
                                onClick={() => openOtpModal(delivery)}
                                className="text-green-600 hover:text-green-900 mr-4"
                              >
                                Verify OTP
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* In Progress Deliveries Section */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-4">In Progress Deliveries</h2>
              
              {inProgressDeliveries.length === 0 ? (
                <div className="bg-gray-50 p-6 text-center rounded-lg border border-gray-200">
                  <p className="text-gray-500">No deliveries are currently in progress.</p>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Beneficiary
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delivery Person
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {inProgressDeliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {delivery.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.userName} (ID: {delivery.userId})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.deliveryPersonName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.amount} ETH
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.locationVerified ? (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Location Verified
                              </span>
                            ) : (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Awaiting Location
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!delivery.locationVerified ? (
                              <button
                                onClick={() => openLocationModal(delivery)}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Verify Location
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCompleteDelivery(delivery.id, delivery.amount)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Complete & Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Transaction History */}
            {transactionHistory.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
                <div className="bg-white shadow overflow-hidden rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delivery ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactionHistory.slice(0, 10).map((transaction, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {transaction.deliveryId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => viewTransactionDetails(transaction)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* OTP Verification Modal */}
      {otpModalOpen && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Verify OTP for Delivery #{selectedDelivery.id}</h3>
            
            {otpError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {otpError}
              </div>
            )}
            
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP Provided by Delivery Person
                </label>
                <input
                  type="text"
                  id="otp"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </div>
              
              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(false)}
                  className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Location Verification Modal */}
      {locationModalOpen && selectedDelivery && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Verify Location for Delivery #{selectedDelivery.id}</h3>
            
            {locationError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {locationError}
              </div>
            )}
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                This will verify that you are at the correct location for this delivery.
              </p>
              
              {userLocation ? (
                <div className="bg-gray-100 p-3 rounded">
                  <p className="text-sm font-medium">Your current location:</p>
                  <p className="text-sm">{userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}</p>
                </div>
              ) : (
                <div className="bg-yellow-100 p-3 rounded">
                  <p className="text-sm text-yellow-800">Unable to access your location. Please allow location access in your browser.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-5">
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyLocation}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={verifyingLocation || !userLocation}
              >
                {verifyingLocation ? 'Verifying...' : 'Verify Location'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction Details Modal */}
      {transactionModalOpen && viewTransaction && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction Details</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Transaction Type</p>
                <p className="mt-1">{viewTransaction.type}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Date & Time</p>
                <p className="mt-1">{formatDate(viewTransaction.timestamp)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery ID</p>
                <p className="mt-1">{viewTransaction.deliveryId}</p>
              </div>
              
              {viewTransaction.otp && (
                <div>
                  <p className="text-sm font-medium text-gray-500">OTP Used</p>
                  <p className="mt-1">{viewTransaction.otp}</p>
                </div>
              )}
              
              {viewTransaction.location && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="mt-1">{viewTransaction.location}</p>
                </div>
              )}
              
              {viewTransaction.amount && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="mt-1">{viewTransaction.amount} ETH</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Transaction Hash</p>
                <p className="mt-1 text-sm text-blue-600 break-all">
                  <a href={`https://sepolia.etherscan.io/tx/${viewTransaction.hash}`} target="_blank" rel="noopener noreferrer">
                    {viewTransaction.hash}
                  </a>
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setTransactionModalOpen(false)}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DepotLayout>
  );
}