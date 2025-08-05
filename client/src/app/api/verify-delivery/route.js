import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      dispatchId, 
      otp, 
      location, 
      verifierAddress, 
      verifierType 
    } = body;

    console.log("🔐 Processing verification:", {
      dispatchId,
      otp: otp ? "***" + otp.slice(-3) : null,
      location,
      verifierAddress,
      verifierType
    });

    // Validate inputs
    if (!dispatchId || !verifierAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production, fetch dispatch from database
    // For now, we'll simulate verification logic
    
    let verification = {
      dispatchId,
      verifierAddress: verifierAddress.toLowerCase(),
      verifierType,
      timestamp: Date.now(),
      otpVerified: false,
      locationVerified: false,
      errors: []
    };

    // OTP Verification (if provided)
    if (otp) {
      // In production, compare with stored OTP
      // For demo, accept any 6-digit OTP
      if (/^\d{6}$/.test(otp)) {
        verification.otpVerified = true;
        verification.verifiedOTP = otp;
        console.log("✅ OTP verified successfully");
      } else {
        verification.errors.push("Invalid OTP format");
        console.log("❌ OTP verification failed");
      }
    }

    // Location Verification (if provided)
    if (location && location.lat && location.lng) {
      // Basic location validation
      const lat = parseFloat(location.lat);
      const lng = parseFloat(location.lng);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        verification.locationVerified = true;
        verification.verifiedLocation = { lat, lng };
        verification.locationTimestamp = Date.now();
        console.log("✅ Location verified successfully");
      } else {
        verification.errors.push("Invalid location coordinates");
        console.log("❌ Location verification failed");
      }
    }

    // Update dispatch status if both verifications are complete
    if (verification.otpVerified && verification.locationVerified) {
      verification.status = 'verified';
      verification.completedAt = Date.now();
      
      // Update notifications
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'delivery_verified',
          recipientAddress: verifierAddress,
          recipientType: verifierType,
          data: {
            dispatchId,
            verificationTimestamp: verification.timestamp
          },
          message: `Delivery verification completed successfully for dispatch ${dispatchId}`
        })
      });
      
      console.log("✅ Full verification completed");
    } else {
      verification.status = 'partial';
      console.log("⏳ Partial verification completed");
    }

    return NextResponse.json({
      success: true,
      verification,
      message: verification.errors.length > 0 
        ? `Verification completed with ${verification.errors.length} errors`
        : "Verification successful"
    });

  } catch (error) {
    console.error("❌ Error processing verification:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process verification" },
      { status: 500 }
    );
  }
}

// Get verification status
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dispatchId = searchParams.get('dispatchId');
    const verifierAddress = searchParams.get('verifierAddress')?.toLowerCase();

    console.log("🔍 Fetching verification status:", { dispatchId, verifierAddress });

    // In production, fetch from database
    // For now, return mock verification status
    
    return NextResponse.json({
      success: true,
      verification: {
        dispatchId,
        verifierAddress,
        otpVerified: false,
        locationVerified: false,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error("❌ Error fetching verification status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch verification status" },
      { status: 500 }
    );
  }
}
