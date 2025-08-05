import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ConsumerSignupRequest from '@/models/ConsumerSignupRequest';

export async function PUT(request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { requestId, status, txHash, reason } = body;

    // Validate required fields
    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: approved, rejected, or pending' },
        { status: 400 }
      );
    }

    // Find and update the signup request
    const updateData = {
      status,
      processedAt: new Date()
    };

    if (status === 'approved' && txHash) {
      updateData.txHash = txHash;
    }

    if (status === 'rejected' && reason) {
      updateData.rejectionReason = reason;
    }

    const updatedRequest = await ConsumerSignupRequest.findByIdAndUpdate(
      requestId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedRequest) {
      return NextResponse.json(
        { error: 'Consumer signup request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `Consumer signup request ${status} successfully`,
      request: {
        id: updatedRequest._id,
        name: updatedRequest.name,
        status: updatedRequest.status,
        processedAt: updatedRequest.processedAt,
        txHash: updatedRequest.txHash
      }
    });

  } catch (error) {
    console.error('Error updating consumer signup request:', error);
    
    if (error.name === 'CastError') {
      return NextResponse.json(
        { error: 'Invalid request ID format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
