import { adminWallet } from '../../../lib/adminWallet';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  // Verify admin session
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method, functionName, params } = req.body;
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize wallet if not already done
    if (!adminWallet.wallet) {
      adminWallet.initialize();
    }

    // Execute blockchain transaction
    const result = await adminWallet.executeContractMethod(functionName, ...params);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Admin blockchain operation failed:', error);
    res.status(500).json({ error: error.message });
  }
}