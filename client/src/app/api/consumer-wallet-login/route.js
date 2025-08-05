import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ConsumerSignupRequest from "@/models/ConsumerSignupRequest";

export async function POST(request) {
  try {
    const { walletAddress } = await request.json();

    console.log("🔍 Consumer wallet login API called with wallet:", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if the wallet address belongs to an approved consumer
    const consumer = await ConsumerSignupRequest.findOne({
      walletAddress: walletAddress.toLowerCase(),
      status: "approved"
    });

    console.log("🔍 Consumer found:", consumer ? "Yes" : "No");

    if (consumer) {
      return NextResponse.json({
        success: true,
        consumer: {
          id: consumer._id,
          name: consumer.name,
          walletAddress: consumer.walletAddress,
          phoneNumber: consumer.phoneNumber,
          aadharNumber: consumer.aadharNumber,
          familyMembers: consumer.familyMembers,
          address: consumer.address
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        consumer: null
      });
    }

  } catch (error) {
    console.error("Consumer wallet login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
