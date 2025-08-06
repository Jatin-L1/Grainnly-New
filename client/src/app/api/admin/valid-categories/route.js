import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

// Function to merge all facet ABIs for Diamond proxy
function getMergedABI() {
  const mergedABI = [];
  if (DiamondMergedABI.contracts) {
    Object.keys(DiamondMergedABI.contracts).forEach(contractName => {
      const contractData = DiamondMergedABI.contracts[contractName];
      if (contractData.abi && Array.isArray(contractData.abi)) {
        mergedABI.push(...contractData.abi);
      }
    });
  }
  return mergedABI;
}

export async function GET() {
  try {
    // Get categories from the blockchain using the Diamond Proxy and merged ABI
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, getMergedABI(), provider);

    // Call the getCategoryWiseStats function to get all categories
    const [categories, counts, amounts] = await contract.getCategoryWiseStats();

    return NextResponse.json({
      success: true,
      categories: categories,
      counts: counts.map(c => Number(c)),
      amounts: amounts.map(a => Number(a))
    });
  } catch (error) {
    console.error('Error fetching valid categories:', error);
    // Fallback to default categories if blockchain call fails
    return NextResponse.json({
      success: false,
      categories: ['AAY', 'BPL', 'APL', 'PHH'],
      error: error.message
    });
  }
}