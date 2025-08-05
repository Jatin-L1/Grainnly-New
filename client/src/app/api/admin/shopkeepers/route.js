import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import DiamondMergedABI from '../../../../../abis/DiamondMergedABI.json';

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const DIAMOND_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(DIAMOND_ADDRESS, DiamondMergedABI, provider);

    const shopkeeperAddresses = await contract.getAllShopkeepers();

    const shopkeepers = await Promise.all(
      shopkeeperAddresses.map(async (address) => {
        try {
          const info = await contract.getShopkeeperInfo(address);
          // Support both object and array return values
          let shopkeeperObj;
          if (Array.isArray(info)) {
            // Tuple/array: [address, name, area, registrationTime, totalConsumersAssigned, totalTokensIssued, totalDeliveries, isActive]
            shopkeeperObj = {
              address: info[0] || address,
              name: info[1] || 'Unnamed Shopkeeper',
              area: info[2] || 'Unknown Area',
              registrationTime: Number(info[3] || 0),
              totalConsumersAssigned: Number(info[4] || 0),
              totalTokensIssued: Number(info[5] || 0),
              totalDeliveries: Number(info[6] || 0),
              isActive: info[7] !== undefined ? info[7] : true,
            };
          } else {
            // Object with named fields
            shopkeeperObj = {
              address: info.shopkeeperAddress || address,
              name: info.name || 'Unnamed Shopkeeper',
              area: info.area || 'Unknown Area',
              registrationTime: Number(info.registrationTime || 0),
              totalConsumersAssigned: Number(info.totalConsumersAssigned || 0),
              totalTokensIssued: Number(info.totalTokensIssued || 0),
              totalDeliveries: Number(info.totalDeliveries || 0),
              isActive: info.isActive !== undefined ? info.isActive : true,
            };
          }
          return shopkeeperObj;
        } catch (err) {
          return {
            address,
            name: `Shopkeeper ${address.slice(0, 8)}...`,
            area: 'Unknown Area',
            totalConsumersAssigned: 0,
            totalTokensIssued: 0,
            totalDeliveries: 0,
            registrationTime: 0,
            isActive: false,
          };
        }
      })
    );

    // Debug: log all shopkeepers
    console.log("Shopkeepers from contract:", shopkeepers);

    // Only include active shopkeepers with valid addresses
    let resultShopkeepers = shopkeepers.filter(
      s => s.address && s.address !== '0x0000000000000000000000000000000000000000' && s.isActive
    );

    return NextResponse.json({
      success: true,
      shopkeepers: resultShopkeepers,
      totalCount: resultShopkeepers.length
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      shopkeepers: [],
      totalCount: 0,
      mock: true
    }, { status: 200 });
  }
}