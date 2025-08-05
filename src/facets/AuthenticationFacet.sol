// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract AuthenticationFacet {
    
    // ============ EVENTS ============
    event UserLoggedIn(address indexed user, string role, uint256 timestamp);
    event UserLoggedOut(address indexed user, uint256 timestamp);
    event LoginAttempt(address indexed user, bool success, uint256 timestamp);
    
    // ============ MODIFIERS ============
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    // ============ SIMPLE AUTHENTICATION FUNCTIONS ============
    
    /**
     * @dev Get user role - simple check without sessions
     */
    function getUserRole(address user) external view returns (string memory) {
        return _getUserRoleString(user);
    }
    
    /**
     * @dev Get user role and redirect URL - simplified
     */
    function getUserRoleAndRedirect(address user) external view returns (string memory role, string memory redirectUrl) {
        role = _getUserRoleString(user);
        
        if (keccak256(bytes(role)) == keccak256(bytes("ADMIN"))) {
            redirectUrl = "/admin-dashboard";
        } else if (keccak256(bytes(role)) == keccak256(bytes("SHOPKEEPER"))) {
            redirectUrl = "/shopkeeper-dashboard";
        } else if (keccak256(bytes(role)) == keccak256(bytes("DELIVERY_AGENT"))) {
            redirectUrl = "/delivery-dashboard";
        } else if (keccak256(bytes(role)) == keccak256(bytes("CONSUMER"))) {
            redirectUrl = "/consumer-dashboard";
        } else {
            redirectUrl = "/login";
        }
    }
    
    /**
     * @dev Simple login - just emit event and return role
     */
    function login() external returns (bool success, string memory role, string memory redirectUrl) {
        role = _getUserRoleString(msg.sender);
        
        if (keccak256(bytes(role)) == keccak256(bytes("UNKNOWN"))) {
            emit LoginAttempt(msg.sender, false, block.timestamp);
            return (false, role, "/login");
        }
        
        // Generate redirect URL based on role
        if (keccak256(bytes(role)) == keccak256(bytes("ADMIN"))) {
            redirectUrl = "/admin-dashboard";
        } else if (keccak256(bytes(role)) == keccak256(bytes("SHOPKEEPER"))) {
            redirectUrl = "/shopkeeper-dashboard";
        } else if (keccak256(bytes(role)) == keccak256(bytes("DELIVERY_AGENT"))) {
            redirectUrl = "/delivery-dashboard";
        } else if (keccak256(bytes(role)) == keccak256(bytes("CONSUMER"))) {
            redirectUrl = "/consumer-dashboard";
        }
        
        emit UserLoggedIn(msg.sender, role, block.timestamp);
        emit LoginAttempt(msg.sender, true, block.timestamp);
        
        return (true, role, redirectUrl);
    }
    
    /**
     * @dev Simple logout - just emit event
     */
    function logout() external {
        emit UserLoggedOut(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Check if user is registered (has any role)
     */
    function isRegisteredUser(address user) external view returns (bool) {
        string memory role = _getUserRoleString(user);
        return keccak256(bytes(role)) != keccak256(bytes("UNKNOWN"));
    }
    
    /**
     * @dev Check if Aadhaar is registered
     */
    function isRegisteredAadhaar(uint256 aadhaar) external view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.consumers[aadhaar].isActive;
    }
    
    /**
     * @dev Get consumer info by Aadhaar (for frontend login)
     */
    function getConsumerByAadhaar(uint256 aadhaar) external view returns (
        string memory name,
        string memory mobile,
        string memory category,
        address assignedShopkeeper,
        bool isActive
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        LibAppStorage.ConsumerStruct memory consumer = s.consumers[aadhaar];
        
        return (
            consumer.name,
            consumer.mobile,
            consumer.category,
            consumer.assignedShopkeeper,
            consumer.isActive
        );
    }
    
    /**
     * @dev Get all registered users by role
     */
    function getAllUsersByRole() external view returns (
        address[] memory admins,
        address[] memory shopkeepers,
        address[] memory deliveryAgents,
        uint256[] memory consumerAadhaars
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Count users first
        uint256 shopkeeperCount = s.allShopkeepers.length;
        uint256 deliveryAgentCount = s.allDeliveryAgents.length;
        uint256 consumerCount = s.allAadhaars.length;
        
        // Create arrays
        shopkeepers = new address[](shopkeeperCount);
        deliveryAgents = new address[](deliveryAgentCount);
        consumerAadhaars = new uint256[](consumerCount);
        admins = new address[](1); // Just the contract owner for now
        
        // Populate arrays
        admins[0] = LibDiamond.contractOwner();
        
        // Copy shopkeepers
        for (uint256 i = 0; i < shopkeeperCount; i++) {
            shopkeepers[i] = s.allShopkeepers[i];
        }
        
        // Copy delivery agents
        for (uint256 i = 0; i < deliveryAgentCount; i++) {
            deliveryAgents[i] = s.allDeliveryAgents[i];
        }
        
        // Copy consumer Aadhaar numbers
        for (uint256 i = 0; i < consumerCount; i++) {
            consumerAadhaars[i] = s.allAadhaars[i];
        }
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Determine user role based on registration status
     */
    function _getUserRoleString(address user) internal view returns (string memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Check if admin (owner or registered admin)
        if (user == LibDiamond.contractOwner() || s.admins[user]) {
            return "ADMIN";
        }
        
        // Check if shopkeeper
        if (s.shopkeepers_[user]) {
            return "SHOPKEEPER";
        }
        
        // Check if delivery agent
        if (s.deliveryAgents_[user]) {
            return "DELIVERY_AGENT";
        }
        
        // Check if consumer by checking walletToAadhaar mapping
        if (s.walletToAadhaar[user] != 0) {
            return "CONSUMER";
        }
        
        return "UNKNOWN";
    }
}
