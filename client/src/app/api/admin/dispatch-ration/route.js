import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      shopkeeperAddress, 
      deliveryAgentAddress, 
      rationDetails,
      estimatedDeliveryTime,
      adminAddress
    } = body;

    console.log("🚛 Processing ration dispatch:", {
      shopkeeperAddress,
      deliveryAgentAddress,
      rationDetails,
      estimatedDeliveryTime
    });

    // Generate a unique dispatch ID
    const dispatchId = `DISPATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate OTP for verification
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Create dispatch record
    const dispatch = {
      id: dispatchId,
      shopkeeperAddress: shopkeeperAddress.toLowerCase(),
      deliveryAgentAddress: deliveryAgentAddress.toLowerCase(),
      adminAddress: adminAddress.toLowerCase(),
      rationDetails,
      estimatedDeliveryTime,
      verificationOTP,
      status: 'dispatched',
      timestamp: Date.now(),
      deliveryStartTime: null,
      deliveryCompleteTime: null,
      otpVerified: false,
      locationVerified: false
    };

    // Store dispatch (in production, use database)
    // For now, we'll use localStorage simulation on server
    
    // Create notifications for shopkeeper
    const shopkeeperNotification = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ration_incoming',
        recipientAddress: shopkeeperAddress,
        recipientType: 'shopkeeper',
        data: {
          dispatchId,
          rationDetails,
          deliveryAgentAddress,
          estimatedDeliveryTime,
          verificationOTP
        },
        message: `Ration delivery incoming! Delivery agent will arrive at approximately ${new Date(estimatedDeliveryTime).toLocaleString()}. Verification OTP: ${verificationOTP}`
      })
    });

    // Create notifications for delivery agent
    const deliveryNotification = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'delivery_assignment',
        recipientAddress: deliveryAgentAddress,
        recipientType: 'delivery',
        data: {
          dispatchId,
          shopkeeperAddress,
          rationDetails,
          estimatedDeliveryTime
        },
        message: `New delivery assignment! Please deliver rations to shopkeeper at ${shopkeeperAddress.slice(0, 6)}...${shopkeeperAddress.slice(-4)} by ${new Date(estimatedDeliveryTime).toLocaleString()}`
      })
    });

    console.log("✅ Ration dispatch created successfully:", dispatchId);

    return NextResponse.json({
      success: true,
      dispatch,
      message: "Ration dispatch created and notifications sent"
    });

  } catch (error) {
    console.error("❌ Error creating ration dispatch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create ration dispatch" },
      { status: 500 }
    );
  }
}

// Get dispatch details
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dispatchId = searchParams.get('dispatchId');
    const userAddress = searchParams.get('userAddress')?.toLowerCase();

    console.log("🔍 Fetching dispatch details:", { dispatchId, userAddress });

    // In production, fetch from database
    // For now, return mock data or stored data
    
    return NextResponse.json({
      success: true,
      dispatch: {
        id: dispatchId,
        status: 'dispatched',
        // ... other dispatch details
      }
    });

  } catch (error) {
    console.error("❌ Error fetching dispatch:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dispatch" },
      { status: 500 }
    );
  }
}
