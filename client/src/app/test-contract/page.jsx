'use client';

import { useState } from "react";
import { ethers } from "ethers";
import DiamondMergedABI from "../../../abis/DiamondMergedABI.json";

const DIAMOND_PROXY_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

export default function TestContract() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testContract = async () => {
    try {
      setLoading(true);
      setResult("");
      
      console.log("🔗 Contract address:", DIAMOND_PROXY_ADDRESS);
      console.log("🌐 RPC URL:", RPC_URL);
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      // Test a simple function first
      console.log("🧪 Testing getTotalConsumers...");
      const totalConsumers = await contract.getTotalConsumers();
      console.log("✅ Total consumers:", totalConsumers.toString());
      
      // Test another function
      console.log("🧪 Testing getCurrentMonth...");
      const currentMonth = await contract.getCurrentMonth();
      console.log("✅ Current month:", currentMonth.toString());
      
      // Test the system status
      console.log("🧪 Testing getSystemStatus...");
      const systemStatus = await contract.getSystemStatus();
      console.log("✅ System status:", systemStatus);
      
      setResult(`✅ Contract connection successful!
Total Consumers: ${totalConsumers.toString()}
Current Month: ${currentMonth.toString()}
System Status: ${JSON.stringify(systemStatus)}`);
      
    } catch (err) {
      console.error("❌ Contract test failed:", err);
      setResult(`❌ Error: ${err.reason || err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const testSpecificConsumer = async () => {
    try {
      setLoading(true);
      setResult("");
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(DIAMOND_PROXY_ADDRESS, DiamondMergedABI, provider);
      
      // Test with a sample Aadhaar (you can change this)
      const testAadhaar = BigInt("123456789012");
      
      console.log("🧪 Testing getConsumerByAadhaar with:", testAadhaar.toString());
      const consumer = await contract.getConsumerByAadhaar(testAadhaar);
      console.log("✅ Consumer data:", consumer);
      
      setResult(`✅ Consumer query successful!
Aadhaar: ${testAadhaar.toString()}
Consumer data: ${JSON.stringify(consumer, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value, 2)}`);
      
    } catch (err) {
      console.error("❌ Consumer test failed:", err);
      setResult(`❌ Error: ${err.reason || err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-green-900 mb-6">Contract Test Page</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testContract}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow transition"
        >
          {loading ? "Testing..." : "Test Basic Contract Functions"}
        </button>
        
        <button
          onClick={testSpecificConsumer}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow transition ml-4"
        >
          {loading ? "Testing..." : "Test Consumer Functions"}
        </button>
      </div>
      
      {result && (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">{result}</pre>
        </div>
      )}
      
      <div className="mt-6 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">Environment Variables:</h3>
        <p>Contract Address: {DIAMOND_PROXY_ADDRESS || "Not set"}</p>
        <p>RPC URL: {RPC_URL || "Not set"}</p>
      </div>
    </div>
  );
}
