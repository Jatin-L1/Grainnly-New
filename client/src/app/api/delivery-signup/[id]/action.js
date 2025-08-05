import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';
import { ethers } from "ethers";
import RegistrationFaucetABI from '@/abis/RegistrationFaucet.json';

const REGISTRATION_FAUCET_ADDRESS = "0xBd5F4cD4df0e9e77904a717ea2139779DA538d17";
const PRIVATE_KEY = process.env.BACKEND_WALLET_PRIVATE_KEY; // Set in .env
const RPC_URL = process.env.RPC_URL; // Set in .env

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await req.json();
    const { action, adminNote, adminId, name, phone, walletAddress, shopkeeperAddress } = body;

    const request = await DeliverySignupRequest.findById(id);
    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Register on blockchain using backend wallet
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const contract = new ethers.Contract(
        REGISTRATION_FAUCET_ADDRESS,
        RegistrationFaucetABI,
        wallet
      );

      // Register agent
      const tx1 = await contract.registerDeliveryAgent(walletAddress, name, phone);
      await tx1.wait();

      // Assign shopkeeper
      const tx2 = await contract.assignDeliveryAgentToShopkeeper(walletAddress, shopkeeperAddress);
      await tx2.wait();

      // Update DB
      request.status = "approved";
      request.adminNote = adminNote;
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();

      return NextResponse.json({ message: "Approved and registered on blockchain." });
    } else if (action === "reject") {
      // Just update DB
      request.status = "rejected";
      request.adminNote = adminNote;
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();
      await request.save();

      return NextResponse.json({ message: "Rejected." });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}