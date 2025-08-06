import { ethers } from 'ethers';
import contractABI from '../../abis/DiamondMergedABI.json';

// Contract configuration - using environment variables
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x3329CA690f619bae73b9f36eb43839892D20045f';
const POLYGON_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-amoy.g.alchemy.com/v2/xMcrrdg5q8Pdtqa6itPOK';

// Function to merge all facet ABIs for Diamond proxy
function getMergedABI() {
  const mergedABI = [];
  if (contractABI.contracts) {
    Object.keys(contractABI.contracts).forEach(contractName => {
      const contractData = contractABI.contracts[contractName];
      if (contractData.abi && Array.isArray(contractData.abi)) {
        mergedABI.push(...contractData.abi);
      }
    });
  }
  return mergedABI;
}

// Get contract instance
export const getContract = (signer) => {
  try {
    if (!signer) {
      console.error("No signer provided to getContract");
      return null;
    }
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, getMergedABI(), signer);
    return contract;
  } catch (error) {
    console.error("Error creating contract instance:", error);
    return null;
  }
};

// Get read-only contract instance
export const getReadOnlyContract = () => {
  try {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, getMergedABI(), provider);
    return contract;
  } catch (error) {
    console.error("Error creating read-only contract instance:", error);
    return null;
  }
};

// Admin Contract Functions
export class AdminContractAPI {
  constructor(signer) {
    this.contract = getContract(signer);
    this.readOnlyContract = getReadOnlyContract();
  }

  // ========== USER REGISTRATION FUNCTIONS ==========
  
  async registerConsumer(aadhaar, name, mobile, category, assignedShopkeeper) {
    try {
      const tx = await this.contract.registerConsumer(
        aadhaar,
        name,
        mobile,
        category,
        assignedShopkeeper
      );
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error registering consumer:', error);
      return { success: false, error: error.message };
    }
  }

  async registerShopkeeper(address, name, area) {
    try {
      const tx = await this.contract.registerShopkeeper(address, name, area);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error registering shopkeeper:', error);
      return { success: false, error: error.message };
    }
  }

  async registerDeliveryAgent(address, name, mobile) {
    try {
      const tx = await this.contract.registerDeliveryAgent(address, name, mobile);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error registering delivery agent:', error);
      return { success: false, error: error.message };
    }
  }

  async bulkRegisterConsumers(aadhaars, names, mobiles, categories, assignedShopkeepers) {
    try {
      const tx = await this.contract.bulkRegisterConsumers(
        aadhaars,
        names,
        mobiles,
        categories,
        assignedShopkeepers
      );
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error bulk registering consumers:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== TOKEN MANAGEMENT FUNCTIONS ==========
  
  async generateTokenForConsumer(aadhaar) {
    try {
      const tx = await this.contract.generateTokenForConsumer(aadhaar);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error generating token for consumer:', error);
      return { success: false, error: error.message };
    }
  }

  async generateTokensForCategory(category) {
    try {
      const tx = await this.contract.generateTokensForCategory(category);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error generating tokens for category:', error);
      return { success: false, error: error.message };
    }
  }

  async bulkGenerateTokens(aadhaars) {
    try {
      const tx = await this.contract.bulkGenerateTokens(aadhaars);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error bulk generating tokens:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== USER MANAGEMENT FUNCTIONS ==========
  
  async deactivateConsumer(aadhaar) {
    try {
      const tx = await this.contract.deactivateConsumer(aadhaar);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error deactivating consumer:', error);
      return { success: false, error: error.message };
    }
  }

  async reactivateConsumer(aadhaar) {
    try {
      const tx = await this.contract.reactivateConsumer(aadhaar);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error reactivating consumer:', error);
      return { success: false, error: error.message };
    }
  }

  async deactivateShopkeeper(address) {
    try {
      const tx = await this.contract.deactivateShopkeeper(address);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error deactivating shopkeeper:', error);
      return { success: false, error: error.message };
    }
  }

  async reactivateShopkeeper(address) {
    try {
      const tx = await this.contract.reactivateShopkeeper(address);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error reactivating shopkeeper:', error);
      return { success: false, error: error.message };
    }
  }

  async deactivateDeliveryAgent(address) {
    try {
      const tx = await this.contract.deactivateDeliveryAgent(address);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error deactivating delivery agent:', error);
      return { success: false, error: error.message };
    }
  }

  async reactivateDeliveryAgent(address) {
    try {
      const tx = await this.contract.reactivateDeliveryAgent(address);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error reactivating delivery agent:', error);
      return { success: false, error: error.message };
    }
  }

  async assignDeliveryAgentToShopkeeper(agentAddress, shopkeeperAddress) {
    try {
      const tx = await this.contract.assignDeliveryAgentToShopkeeper(agentAddress, shopkeeperAddress);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error assigning delivery agent:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== SYSTEM MANAGEMENT FUNCTIONS ==========
  
  async pauseSystem() {
    try {
      const tx = await this.contract.pauseSystem();
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error pausing system:', error);
      return { success: false, error: error.message };
    }
  }

  async unpauseSystem() {
    try {
      const tx = await this.contract.unpauseSystem();
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error unpausing system:', error);
      return { success: false, error: error.message };
    }
  }

  async setRationPrice(priceInWei) {
    try {
      const tx = await this.contract.setRationPrice(priceInWei);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error setting ration price:', error);
      return { success: false, error: error.message };
    }
  }

  async setSubsidyPercentage(percentage) {
    try {
      const tx = await this.contract.setSubsidyPercentage(percentage);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error setting subsidy percentage:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== DATA FETCHING FUNCTIONS ==========
  
  async getTotalConsumers() {
    try {
      const result = await this.readOnlyContract.getTotalConsumers();
      return { success: true, data: Number(result) };
    } catch (error) {
      console.error('Error getting total consumers:', error);
      return { success: false, error: error.message };
    }
  }

  async getTotalShopkeepers() {
    try {
      const result = await this.readOnlyContract.getTotalShopkeepers();
      return { success: true, data: Number(result) };
    } catch (error) {
      console.error('Error getting total shopkeepers:', error);
      return { success: false, error: error.message };
    }
  }

  async getTotalDeliveryAgents() {
    try {
      const result = await this.readOnlyContract.getTotalDeliveryAgents();
      return { success: true, data: Number(result) };
    } catch (error) {
      console.error('Error getting total delivery agents:', error);
      return { success: false, error: error.message };
    }
  }

  async getConsumersByCategory(category) {
    try {
      const result = await this.readOnlyContract.getConsumersByCategory(category);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting consumers by category:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllShopkeepers() {
    try {
      // Use getShopkeeperDashboard() instead of getAllShopkeepers()
      const result = await this.readOnlyContract.getShopkeeperDashboard();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting shopkeeper dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllDeliveryAgents() {
    try {
      const result = await this.readOnlyContract.getAllDeliveryAgents();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting all delivery agents:', error);
      return { success: false, error: error.message };
    }
  }

  async getActiveDeliveries() {
    try {
      const result = await this.readOnlyContract.getActiveDeliveries();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting active deliveries:', error);
      return { success: false, error: error.message };
    }
  }

  async getSystemAnalytics() {
    try {
      const result = await this.readOnlyContract.getSystemAnalytics();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting system analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async getConsumerDetails(aadhaar) {
    try {
      const result = await this.readOnlyContract.getConsumerDetails(aadhaar);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting consumer details:', error);
      return { success: false, error: error.message };
    }
  }

  async getShopkeeperDetails(address) {
    try {
      const result = await this.readOnlyContract.getShopkeeperDetails(address);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting shopkeeper details:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeliveryAgentDetails(address) {
    try {
      const result = await this.readOnlyContract.getDeliveryAgentDetails(address);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting delivery agent details:', error);
      return { success: false, error: error.message };
    }
  }

  async getMonthlyTokens(aadhaar) {
    try {
      const result = await this.readOnlyContract.getMonthlyTokens(aadhaar);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting monthly tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async getTokensForConsumer(aadhaar) {
    try {
      const result = await this.readOnlyContract.getTokensForConsumer(aadhaar);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting tokens for consumer:', error);
      return { success: false, error: error.message };
    }
  }

  async isPaused() {
    try {
      const result = await this.readOnlyContract.isPaused();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error checking if system is paused:', error);
      return { success: false, error: error.message };
    }
  }

  async getRationPrice() {
    try {
      const result = await this.readOnlyContract.getRationPrice();
      return { success: true, data: ethers.formatEther(result) };
    } catch (error) {
      console.error('Error getting ration price:', error);
      return { success: false, error: error.message };
    }
  }

  async getSubsidyPercentage() {
    try {
      const result = await this.readOnlyContract.getSubsidyPercentage();
      return { success: true, data: Number(result) };
    } catch (error) {
      console.error('Error getting subsidy percentage:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== DELIVERY MANAGEMENT FUNCTIONS ==========

  async assignDeliveryAgent(orderId, agentAddress) {
    try {
      const tx = await this.contract.assignDeliveryAgent(orderId, agentAddress);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error assigning delivery agent to order:', error);
      return { success: false, error: error.message };
    }
  }

  async bulkMarkDeliveries(aadhaars, tokenIds) {
    try {
      const tx = await this.contract.bulkMarkDeliveries(aadhaars, tokenIds);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error bulk marking deliveries:', error);
      return { success: false, error: error.message };
    }
  }

  async cancelOrder(orderId, reason) {
    try {
      const tx = await this.contract.cancelOrder(orderId, reason);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error canceling order:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== ANALYTICS FUNCTIONS ==========

  async getPaymentAnalytics() {
    try {
      const result = await this.readOnlyContract.getPaymentAnalytics();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeliveryMetrics() {
    try {
      const result = await this.readOnlyContract.getDeliveryMetrics();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting delivery metrics:', error);
      return { success: false, error: error.message };
    }
  }

  async getAreaStats() {
    try {
      const result = await this.readOnlyContract.getAreaStats();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting area stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getCategoryStats() {
    try {
      const result = await this.readOnlyContract.getCategoryStats();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting category stats:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== EMERGENCY FUNCTIONS ==========

  async handleEmergencyCase(caseId, action) {
    try {
      const tx = await this.contract.handleEmergencyCase(caseId, action);
      await tx.wait();
      return {
        success: true,
        txHash: tx.hash,
        polygonScanUrl: `https://polygonscan.com/tx/${tx.hash}`
      };
    } catch (error) {
      console.error('Error handling emergency case:', error);
      return { success: false, error: error.message };
    }
  }

  async getEmergencyCases() {
    try {
      const result = await this.readOnlyContract.getEmergencyCases();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting emergency cases:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== HEALTH REPORT FUNCTIONS ==========

  async getSystemHealthReport() {
    try {
      const result = await this.readOnlyContract.getSystemHealthReport();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting system health report:', error);
      return { success: false, error: error.message };
    }
  }

  async getSystemStatus() {
    try {
      const result = await this.readOnlyContract.getSystemStatus();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error getting system status:', error);
      return { success: false, error: error.message };
    }
  }
}

// Helper functions
export const formatEthersError = (error) => {
  if (error.code === 'CALL_EXCEPTION') {
    return 'Contract call failed. Please check parameters and try again.';
  }
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return 'Transaction would fail. Please check the operation and try again.';
  }
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return 'Insufficient funds for gas fees.';
  }
  return error.message || 'Unknown blockchain error occurred.';
};

export const parseTransactionError = (error) => {
  console.error('Transaction Error:', error);
  
  if (error.reason) {
    return error.reason;
  }
  
  if (error.data && error.data.message) {
    return error.data.message;
  }
  
  return formatEthersError(error);
};

export { CONTRACT_ADDRESS };
