import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;

export async function POST(req) {
  try {
    const { agentAddress, name, mobile, assignedShopkeeper } = await req.json();

    if (!agentAddress || !name || !mobile || !assignedShopkeeper) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, DiamondMergedABI, wallet);

    // If your facet expects assignedShopkeeper as a parameter, include it:
    const tx = await contract.registerDeliveryAgent(agentAddress, name, mobile, assignedShopkeeper);
    await tx.wait();

    return NextResponse.json({ success: true, txHash: tx.hash });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}