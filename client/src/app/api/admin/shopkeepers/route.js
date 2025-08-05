import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function GET() {
  try {
    // Redirect to main admin API for consistency
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin?endpoint=get-shopkeepers`);
    const data = await response.json();
    
    if (data.success) {
      return NextResponse.json({
        success: true,
        shopkeepers: data.data,
        totalCount: data.data.length
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.error,
        shopkeepers: [],
        totalCount: 0
      }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      shopkeepers: [],
      totalCount: 0
    }, { status: 200 });
  }
}