import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ConsumerSignupRequest from '@/models/ConsumerSignupRequest';

export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { name, phone, homeAddress, rationCardId, aadharNumber, pin } = body;

    // Validate required fields
    if (!name || !phone || !homeAddress || !rationCardId || !aadharNumber || !pin) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      );
    }

    // Validate Aadhar number format (12 digits)
    if (!/^\d{12}$/.test(aadharNumber)) {
      return NextResponse.json(
        { error: 'Aadhar number must be exactly 12 digits' },
        { status: 400 }
      );
    }

    // Check if consumer already exists with detailed error messages
    const existingRequests = await ConsumerSignupRequest.find({
      $or: [
        { phone },
        { rationCardId },
        { aadharNumber }
      ]
    });

    if (existingRequests.length > 0) {
      const conflicts = [];
      existingRequests.forEach(req => {
        if (req.phone === phone) conflicts.push('phone number');
        if (req.rationCardId === rationCardId) conflicts.push('ration card ID');
        if (req.aadharNumber === aadharNumber) conflicts.push('Aadhar number');
      });
      
      return NextResponse.json(
        { error: `A signup request with this ${[...new Set(conflicts)].join(', ')} already exists` },
        { status: 409 }
      );
    }

    // Create new signup request (PIN will be hashed automatically via pre-save middleware)
    const signupRequest = new ConsumerSignupRequest({
      name,
      phone,
      homeAddress,
      rationCardId,
      aadharNumber,
      pin
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
    console.error('Error creating consumer signup request:', error);
    
    if (error.code === 11000) {
      // Handle specific duplicate key errors
      let field = 'information';
      if (error.keyPattern?.phone) field = 'phone number';
      else if (error.keyPattern?.rationCardId) field = 'ration card ID';
      else if (error.keyPattern?.aadharNumber) field = 'Aadhar number';
      
      return NextResponse.json(
        { error: `A signup request with this ${field} already exists` },
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

    const requests = await ConsumerSignupRequest.find(query)
      .select('-pin') // Exclude PIN from response for security
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ConsumerSignupRequest.countDocuments(query);

    return NextResponse.json({
      requests,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching consumer signup requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}