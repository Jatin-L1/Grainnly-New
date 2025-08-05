import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DeliverySignupRequest from '@/models/DeliverySignupRequest';

export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { name, phone, address, vehicleType, licenseNumber, walletAddress } = body;

    // Validate required fields
    if (!name || !phone || !address || !vehicleType || !licenseNumber || !walletAddress) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum wallet address format' },
        { status: 400 }
      );
    }

    // Validate vehicle type
    const validVehicleTypes = ['bicycle', 'motorcycle', 'car', 'van', 'truck'];
    if (!validVehicleTypes.includes(vehicleType.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid vehicle type' },
        { status: 400 }
      );
    }

    // Check if delivery partner already exists
    const existingRequest = await DeliverySignupRequest.findOne({
      $or: [
        { phone },
        { licenseNumber },
        { walletAddress }
      ]
    });

    if (existingRequest) {
      let errorMessage = 'A signup request already exists with this ';
      if (existingRequest.phone === phone) errorMessage += 'phone number';
      else if (existingRequest.licenseNumber === licenseNumber) errorMessage += 'license number';
      else if (existingRequest.walletAddress === walletAddress) errorMessage += 'wallet address';
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      );
    }

    // Create new signup request
    const signupRequest = new DeliverySignupRequest({
      name,
      phone,
      address,
      vehicleType: vehicleType.toLowerCase(),
      licenseNumber,
      walletAddress
    });

    await signupRequest.save();

    return NextResponse.json(
      { 
        message: 'Signup request submitted successfully. Please wait for admin approval.',
        requestId: signupRequest._id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating delivery signup request:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A signup request with this information already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    const query = status === 'all' ? {} : { status };

    const requests = await DeliverySignupRequest.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DeliverySignupRequest.countDocuments(query);

    return NextResponse.json({
      requests,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching delivery signup requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}