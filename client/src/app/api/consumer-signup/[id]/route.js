import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ConsumerSignupRequest from '@/models/ConsumerSignupRequest';

export async function PATCH(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { action, adminNote, adminId } = body;

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const signupRequest = await ConsumerSignupRequest.findById(id);
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    if (signupRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      );
    }

    // Update the request
    signupRequest.status = action === 'approve' ? 'approved' : 'rejected';
    signupRequest.adminNote = adminNote || '';
    signupRequest.reviewedAt = new Date();
    signupRequest.reviewedBy = adminId || 'admin';

    await signupRequest.save();

    return NextResponse.json({
      message: `Signup request ${action}d successfully`,
      request: signupRequest
    });

  } catch (error) {
    console.error('Error updating consumer signup request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    await dbConnect();
    
    const { id } = params;
    const signupRequest = await ConsumerSignupRequest.findById(id);
    
    if (!signupRequest) {
      return NextResponse.json(
        { error: 'Signup request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ request: signupRequest });

  } catch (error) {
    console.error('Error fetching consumer signup request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}