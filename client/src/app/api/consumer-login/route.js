import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ConsumerSignupRequest from '@/models/ConsumerSignupRequest';

export async function POST(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { identifier, identifierType, pin } = body;

    // Validate required fields
    if (!identifier || !identifierType || !pin) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Build query based on identifier type
    let query;
    if (identifierType === 'aadhar') {
      // Validate Aadhar number format (12 digits)
      if (!/^\d{12}$/.test(identifier)) {
        return NextResponse.json(
          { error: 'Aadhar number must be exactly 12 digits' },
          { status: 400 }
        );
      }
      query = { aadharNumber: identifier, status: 'approved' };
    } else if (identifierType === 'ration') {
      query = { rationCardId: identifier, status: 'approved' };
    } else {
      return NextResponse.json(
        { error: 'Invalid identifier type' },
        { status: 400 }
      );
    }

    // Find the approved consumer
    const consumer = await ConsumerSignupRequest.findOne(query);

    if (!consumer) {
      return NextResponse.json(
        { error: 'No approved account found with this information' },
        { status: 404 }
      );
    }

    // Verify PIN
    const isPinValid = await consumer.comparePin(pin);
    if (!isPinValid) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Return consumer information (without PIN)
    return NextResponse.json(
      { 
        message: 'Login successful',
        consumer: {
          id: consumer._id,
          name: consumer.name,
          phone: consumer.phone,
          homeAddress: consumer.homeAddress,
          rationCardId: consumer.rationCardId,
          aadharNumber: consumer.aadharNumber,
          status: consumer.status
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error during consumer login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}