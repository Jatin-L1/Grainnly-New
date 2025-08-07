import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

export async function POST(request) {
  try {
    const { txHash } = await request.json();
    
    if (!txHash) {
      return NextResponse.json(
        { success: false, error: 'Transaction hash is required' },
        { status: 400 }
      );
    }

    if (!RPC_URL) {
      return NextResponse.json(
        { success: false, error: 'RPC URL not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Checking transaction status:', txHash);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      // Transaction not found or still pending
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Transaction is still pending or not found',
        explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`
      });
    }

    const success = receipt.status === 1;
    
    return NextResponse.json({
      success: true,
      status: success ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      explorerUrl: `https://amoy.polygonscan.com/tx/${txHash}`,
      message: success ? 'Transaction confirmed successfully' : 'Transaction failed'
    });

  } catch (error) {
    console.error('❌ Error checking transaction:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        message: 'Error checking transaction status'
      },
      { status: 500 }
    );
  }
}
