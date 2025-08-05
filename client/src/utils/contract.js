import { ethers } from 'ethers';
import contractABI from '../../abis/DiamondMergedABI.json';

export const getContract = (signer) => {
  // Use the Diamond Proxy contract address from environment variables
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3329CA690f619bae73b9f36eb43839892D20045f';
  
  
  try {
    if (!signer) {
      console.error("No signer provided to getContract");
      return null;
    }
    
    console.log("Creating contract with:", { 
      address: contractAddress, 
      signerAddress: signer.address || "Unknown" 
    });
    
    // Create contract instance with error handling
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Debug contract instance
    if (!contract) {
      console.error("Contract creation failed");
      return null;
    }
    
    return contract;
  } catch (error) {
    console.error("Error creating contract instance:", error);
    return null;
  }
};