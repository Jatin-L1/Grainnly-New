'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PublicLayout from '../../components/PublicLayout';
import { ethers } from 'ethers';

export default function PublicDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inTransit: 0,
    pending: 0
  });

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/deliveries`);
        const data = await response.json();
        
        setDeliveries(data);
        
        // Calculate stats
        setStats({
          total: data.length,
          completed: data.filter(d => d.status === 'DELIVERED').length,
          inTransit: data.filter(d => d.status === 'IN_TRANSIT').length,
          pending: data.filter(d => d.status === 'PENDING').length
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

  return (
    <PublicLayout>
      <Head>
        <title>Public Dashboard | Grainlyyy</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Public Delivery Tracking</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-blue-100 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-blue-800">Total Deliveries</h3>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          
          <div className="bg-green-100 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-green-800">Completed</h3>
            <p className="text-3xl font-bold">{stats.completed}</p>
          </div>
          
          <div className="bg-yellow-100 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-yellow-800">In Transit</h3>
            <p className="text-3xl font-bold">{stats.inTransit}</p>
          </div>
          
          <div className="bg-red-100 p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-red-800">Pending</h3>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <h2 className="bg-gray-50 px-6 py-4 text-xl font-semibold">Recent Deliveries</h2>
          
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-6 text-center">No deliveries found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{delivery.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.userId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{delivery.depotId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                            delivery.status === 'IN_TRANSIT' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {delivery.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(delivery.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleDateString() : 'Not delivered'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Submit Complaint or Feedback</h2>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            // Submit complaint logic
            alert('Complaint submitted successfully!');
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="deliveryId">
                Delivery ID (Optional)
              </label>
              <input
                type="number"
                id="deliveryId"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter delivery ID if applicable"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="4"
                placeholder="Enter your complaint or feedback"
                required
              ></textarea>
            </div>
            
            <div className="flex items-center justify-end">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}