// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract RegistrationFacet {
    
    event ConsumerRegistered(uint256 indexed aadhaar, string name, address indexed shopkeeper);
    event ShopkeeperRegistered(address indexed shopkeeper, string name, string area);
    event DeliveryAgentRegistered(address indexed agent, string name, string mobile);
    event DeliveryAgentAssigned(address indexed agent, address indexed shopkeeper);  // ✅ ADD THIS
    event ConsumerWalletLinked(uint256 indexed aadhaar, address indexed wallet);
    event WalletLinked(uint256 indexed aadhaar, address indexed wallet);  // ✅ ADD THIS
    event ConsumerDeactivated(uint256 indexed aadhaar);
    event ConsumerReactivated(uint256 indexed aadhaar);
    event ShopkeeperDeactivated(address indexed shopkeeper);
    event ShopkeeperReactivated(address indexed shopkeeper);
    event DeliveryAgentDeactivated(address indexed agent);
    event DeliveryAgentReactivated(address indexed agent);
    event DCVTokenAddressSet(address indexed tokenAddress);
    event SystemPaused();
    event SystemUnpaused();
// ...existing code...
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier whenNotPaused() {
        require(!LibAppStorage.appStorage().paused, "System paused");
        _;
    }
    
    modifier validAadhaar(uint256 aadhaar) {
        require(aadhaar >= 100000000000 && aadhaar <= 999999999999, "Invalid Aadhaar");
        _;
    }
    
    // ============ SYSTEM SETUP ============
    function setDCVTokenAddress(address tokenAddress) external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(tokenAddress != address(0), "Invalid token address");
        s.dcvTokenAddress = tokenAddress;
        emit DCVTokenAddressSet(tokenAddress);
    }


        function getDCVTokenAddress() external view returns (address) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.dcvTokenAddress;
    }
    
    // ============ SHOPKEEPER REGISTRATION ============
    function registerShopkeeper(address shopkeeper, string memory name, string memory area) external onlyOwner whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(shopkeeper != address(0), "Invalid address");
        require(bytes(name).length > 0, "Name required");
        require(bytes(area).length > 0, "Area required");
        require(s.shopkeepers[shopkeeper].shopkeeperAddress == address(0), "Already registered");
        
        s.shopkeepers_[shopkeeper] = true;
        s.shopkeepers[shopkeeper] = LibAppStorage.ShopkeeperStruct({
            shopkeeperAddress: shopkeeper,
            name: name,
            area: area,
            registrationTime: block.timestamp,
            totalConsumersAssigned: 0,
            totalTokensIssued: 0,
            totalDeliveries: 0,
            isActive: true
        });
        
        s.allShopkeepers.push(shopkeeper);
        _logActivity("SHOPKEEPER_REGISTERED", 0, 0, string(abi.encodePacked("Shopkeeper ", name, " in ", area)));
        
        emit ShopkeeperRegistered(shopkeeper, name, area);
    }
    
    // ============ DELIVERY AGENT REGISTRATION ============
    function registerDeliveryAgent(address agent, string memory name, string memory mobile) external onlyOwner whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(agent != address(0), "Invalid address");
        require(bytes(name).length > 0, "Name required");
        require(bytes(mobile).length > 0, "Mobile required");
        require(s.deliveryAgents[agent].agentAddress == address(0), "Already registered");
        
        s.deliveryAgents_[agent] = true;
        s.deliveryAgents[agent] = LibAppStorage.DeliveryAgentStruct({
            agentAddress: agent,
            name: name,
            mobile: mobile,
            registrationTime: block.timestamp,
            assignedShopkeeper: address(0),
            totalDeliveries: 0,
            isActive: true
        });
        
        s.allDeliveryAgents.push(agent);
        _logActivity("DELIVERY_AGENT_REGISTERED", 0, 0, string(abi.encodePacked("Agent ", name)));
        
        emit DeliveryAgentRegistered(agent, name, mobile);
    }
    
    // ============ CONSUMER REGISTRATION ============
    function registerConsumer(
        uint256 aadhaar,
        string memory name,
        string memory mobile,
        string memory category,
        address assignedShopkeeper
    ) external onlyOwner whenNotPaused validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(bytes(name).length > 0, "Name required");
        require(bytes(mobile).length > 0, "Mobile required");
        require(s.rationAmounts[category] > 0, "Invalid category");
        require(s.shopkeepers_[assignedShopkeeper], "Invalid shopkeeper");
        require(s.consumers[aadhaar].aadhaar == 0, "Already registered");
        require(s.mobileToAadhaar[mobile] == 0, "Mobile already used");
        
        s.consumers[aadhaar] = LibAppStorage.ConsumerStruct({
            aadhaar: aadhaar,
            name: name,
            mobile: mobile,
            category: category,
            registrationTime: block.timestamp,
            assignedShopkeeper: assignedShopkeeper,
            totalTokensReceived: 0,
            totalTokensClaimed: 0,
            lastTokenIssuedTime: 0,
            isActive: true
        });
        
        s.allAadhaars.push(aadhaar);
        s.mobileToAadhaar[mobile] = aadhaar;
        s.shopkeepers[assignedShopkeeper].totalConsumersAssigned++;
        
        _logActivity("CONSUMER_REGISTERED", aadhaar, 0, string(abi.encodePacked("Consumer ", name, " category ", category)));
        
        emit ConsumerRegistered(aadhaar, name, assignedShopkeeper);
    }
    
    // ============ BULK CONSUMER REGISTRATION ============ 
    function bulkRegisterConsumers(
        uint256[] memory aadhaars,
        string[] memory names,
        string[] memory mobiles,
        string[] memory categories,
        address[] memory assignedShopkeepers
    ) external onlyOwner whenNotPaused {
        require(aadhaars.length == names.length, "Length mismatch");
        require(aadhaars.length == mobiles.length, "Length mismatch");
        require(aadhaars.length == categories.length, "Length mismatch");
        require(aadhaars.length == assignedShopkeepers.length, "Length mismatch");
        require(aadhaars.length > 0, "Empty arrays");
        
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < aadhaars.length; i++) {
            uint256 aadhaar = aadhaars[i];
            string memory name = names[i];
            string memory mobile = mobiles[i];
            string memory category = categories[i];
            address shopkeeper = assignedShopkeepers[i];
            
            // Skip invalid entries
            if (aadhaar < 100000000000 || aadhaar > 999999999999) continue;
            if (bytes(name).length == 0) continue;
            if (bytes(mobile).length == 0) continue;
            if (s.rationAmounts[category] == 0) continue;
            if (!s.shopkeepers_[shopkeeper]) continue;
            if (s.consumers[aadhaar].aadhaar != 0) continue;
            if (s.mobileToAadhaar[mobile] != 0) continue;
            
            // Register consumer
            s.consumers[aadhaar] = LibAppStorage.ConsumerStruct({
                aadhaar: aadhaar,
                name: name,
                mobile: mobile,
                category: category,
                registrationTime: block.timestamp,
                assignedShopkeeper: shopkeeper,
                totalTokensReceived: 0,
                totalTokensClaimed: 0,
                lastTokenIssuedTime: 0,
                isActive: true
            });
            
            s.allAadhaars.push(aadhaar);
            s.mobileToAadhaar[mobile] = aadhaar;
            s.shopkeepers[shopkeeper].totalConsumersAssigned++;
            
            emit ConsumerRegistered(aadhaar, name, shopkeeper);
            successCount++;
        }
        
        _logActivity("BULK_REGISTRATION_COMPLETE", 0, 0, string(abi.encodePacked("Registered ", _toString(successCount), " consumers")));
    }
    
    // ============ ASSIGNMENT FUNCTIONS ============
    function assignDeliveryAgentToShopkeeper(address deliveryAgent, address shopkeeper) external onlyOwner whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveryAgents_[deliveryAgent], "Invalid agent");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        require(s.deliveryAgents[deliveryAgent].isActive, "Agent not active");
        
        s.deliveryAgents[deliveryAgent].assignedShopkeeper = shopkeeper;
        s.agentToShopkeeper[deliveryAgent] = shopkeeper;
        
        _logActivity("AGENT_ASSIGNED", 0, 0, "Agent assigned to shopkeeper");
        
        emit DeliveryAgentAssigned(deliveryAgent, shopkeeper);
    }
    
    function linkConsumerWallet(uint256 aadhaar, address wallet) external onlyOwner whenNotPaused validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        require(wallet != address(0), "Invalid wallet");
        
        s.aadhaarToWallet[aadhaar] = wallet;
        s.walletToAadhaar[wallet] = aadhaar;
        
        _logActivity("WALLET_LINKED", aadhaar, 0, "Wallet linked");
        
        emit WalletLinked(aadhaar, wallet);
    }
    
    // ============ ADMIN FUNCTIONS ============
    function updateRationAmount(string memory category, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        LibAppStorage.appStorage().rationAmounts[category] = amount;
        _logActivity("RATION_UPDATED", 0, 0, string(abi.encodePacked("Category ", category, " = ", _toString(amount), "g")));
    }
    
    function updateDCVTokenAddress(address newDCVTokenAddress) external onlyOwner {
        require(newDCVTokenAddress != address(0), "Invalid address");
        
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.dcvTokenAddress = newDCVTokenAddress;
        
        _logActivity("DCV_TOKEN_UPDATED", 0, 0, "DCVToken address updated");
    }
    
    function deactivateConsumer(uint256 aadhaar) external onlyOwner validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        
        s.consumers[aadhaar].isActive = false;
        _logActivity("CONSUMER_DEACTIVATED", aadhaar, 0, "Consumer deactivated");
    }
    
    function reactivateConsumer(uint256 aadhaar) external onlyOwner validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        
        s.consumers[aadhaar].isActive = true;
        _logActivity("CONSUMER_REACTIVATED", aadhaar, 0, "Consumer reactivated");
    }
        
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    /**
     * @dev Deactivate a shopkeeper
     * @param shopkeeper Address of the shopkeeper to deactivate
     */
    function deactivateShopkeeper(address shopkeeper) external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Shopkeeper not found");
        
        s.shopkeepers[shopkeeper].isActive = false;
        
        emit ShopkeeperDeactivated(shopkeeper);
        _logActivity("SHOPKEEPER_DEACTIVATED", 0, 0, "Shopkeeper deactivated");
    }

    /**
     * @dev Reactivate a shopkeeper
     * @param shopkeeper Address of the shopkeeper to reactivate
     */
    function reactivateShopkeeper(address shopkeeper) external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Shopkeeper not found");
        
        s.shopkeepers[shopkeeper].isActive = true;
        
        emit ShopkeeperReactivated(shopkeeper);
        _logActivity("SHOPKEEPER_REACTIVATED", 0, 0, "Shopkeeper reactivated");
    }

    /**
     * @dev Deactivate a delivery agent
     * @param agent Address of the delivery agent to deactivate
     */
    function deactivateDeliveryAgent(address agent) external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[agent], "Delivery agent not found");
        
        s.deliveryAgents[agent].isActive = false;
        
        emit DeliveryAgentDeactivated(agent);
        _logActivity("AGENT_DEACTIVATED", 0, 0, "Delivery agent deactivated");
    }

    /**
     * @dev Reactivate a delivery agent
     * @param agent Address of the delivery agent to reactivate
     */
    function reactivateDeliveryAgent(address agent) external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[agent], "Delivery agent not found");
        
        s.deliveryAgents[agent].isActive = true;
        
        emit DeliveryAgentReactivated(agent);
        _logActivity("AGENT_REACTIVATED", 0, 0, "Delivery agent reactivated");
    }

    /**
     * @dev Pause the system
     */
    function pause() external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.paused = true;
        emit SystemPaused();
        _logActivity("SYSTEM_PAUSED", 0, 0, "System paused by admin");
    }

    /**
     * @dev Unpause the system
     */
    function unpause() external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.paused = false;
        emit SystemUnpaused();
        _logActivity("SYSTEM_UNPAUSED", 0, 0, "System unpaused by admin");
    }

    // ============ INTERNAL HELPER FUNCTION ============
    function _logActivity(string memory action, uint256 aadhaar, uint256 tokenId, string memory details) internal {
        LibAppStorage.appStorage().activityLogs.push(LibAppStorage.ActivityLog({
            timestamp: block.timestamp,
            actor: msg.sender,
            action: action,
            aadhaar: aadhaar,
            tokenId: tokenId,
            details: details
        }));
    }

    // ... rest of your existing functions ...
}
