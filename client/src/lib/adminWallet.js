import { ethers } from 'ethers';

// Environment variables for configuration
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const ADMIN_ADDRESS = "0x37470c74Cc2Cb55AB1CC23b16a05F2DC657E25aa";

// ABI for the registration contract methods we need
const CONTRACT_ABI = [
  "function registerConsumer(uint256 aadhaar, string name, string mobile, string category, address shopkeeperAddress) external returns (bool)"
];

export const adminWallet = {
  provider: null,
  wallet: null,
  contract: null,

  initialize() {
    // Validate environment variables
    if (!ADMIN_PRIVATE_KEY) {
      throw new Error('Admin private key not configured in environment variables');
    }
    
    if (!RPC_URL) {
      throw new Error('RPC URL not configured in environment variables');
    }
    
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured in environment variables');
    }
    
    console.log('Initializing admin wallet with contract address:', CONTRACT_ADDRESS);
    
    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, this.provider);
    
    if (this.wallet.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
      console.warn('Warning: Admin wallet address does not match expected admin address');
    }
    
    // Initialize contract with explicit address check
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x" || CONTRACT_ADDRESS === "") {
      throw new Error('Invalid contract address: ' + CONTRACT_ADDRESS);
    }
    
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
    
    if (!this.contract) {
      throw new Error('Failed to initialize contract instance');
    }
    
    console.log('Admin wallet initialized successfully');
    return this;
  },

  async registerConsumer(aadhaar, name, mobile, category, shopkeeperAddress = "0x0000000000000000000000000000000000000000") {
    try {
      // Make sure we're initialized
      if (!this.contract) {
        console.log('Contract not initialized, initializing now...');
        this.initialize();
      }
      
      if (!this.contract) {
        throw new Error('Contract initialization failed');
      }
      
      // Convert Aadhaar to BigInt for blockchain (updated for ethers v6)
      const aadhaarBN = BigInt(aadhaar);
      
      console.log('Registering consumer on blockchain:', {
        aadhaar: aadhaarBN.toString(),
        name,
        mobile,
        category,
        shopkeeperAddress
      });
      
      const tx = await this.contract.registerConsumer(
        aadhaarBN,
        name,
        mobile || "", // Use empty string if mobile is null/undefined
        category || "GENERAL", // Default category if not specified
        shopkeeperAddress
      );
      
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      const explorerUrl = `${process.env.NEXT_PUBLIC_POLYGONSCAN_BASE_URL || "https://mumbai.polygonscan.com/tx/"}${receipt.hash}`;
      
      return { 
        success: true, 
        txHash: receipt.hash,
        explorerUrl
      };
    } catch (error) {
      console.error('Error registering consumer on blockchain:', error);
      return { success: false, error: error.message };
    }
  }
};