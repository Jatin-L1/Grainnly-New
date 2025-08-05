// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Interfaces for Ration Distribution System
 * @dev Defines all structs and interfaces used across the system
 * @author Blockchain Developer
 */

// ============ STRUCTS ============

/**
 * @dev Represents a consumer in the ration system
 */
struct ConsumerStruct {
    uint256 aadhaar;           // Unique 12-digit Aadhaar number
    string name;               // Consumer's full name
    string mobile;             // Mobile number for OTP/notifications
    string category;           // Ration category (BPL, AAY, APL)
    uint256 registrationTime;  // Block timestamp of registration
    address assignedShopkeeper; // Shopkeeper assigned to this consumer
    bool isActive;             // Whether consumer is active
    uint256 totalTokensReceived;    // Total tokens received
    uint256 totalTokensClaimed;     // Total tokens claimed
    uint256 lastTokenIssuedTime;    // Timestamp of last token issuance
}

/**
 * @dev Represents a shopkeeper in the ration system
 */
struct ShopkeeperStruct {
    address shopkeeperAddress; // Ethereum address of shopkeeper
    string name;               // Shopkeeper's name
    string area;               // Area of operation
    uint256 registrationTime;  // Block timestamp of registration
    bool isActive;             // Whether shopkeeper is active
    uint256 totalConsumersAssigned;    // Number of consumers assigned
    uint256 totalTokensIssued;         // Total tokens issued by this shopkeeper
    uint256 totalDeliveries;           // Total deliveries made by this shopkeeper
}

/**
 * @dev Represents a delivery agent
 */
struct DeliveryAgentStruct {
    address agentAddress;      // Ethereum address of delivery agent
    string name;               // Agent's name
    string mobile;             // Mobile number
    uint256 registrationTime;  // Block timestamp of registration
    address assignedShopkeeper; // Assigned shopkeeper address
    uint256 totalDeliveries;   // Total deliveries made
    bool isActive;             // Whether agent is active
}

/**
 * @dev Activity log for AI analytics and monitoring
 */
struct ActivityLog {
    uint256 timestamp;
    address actor;
    string action;
    uint256 aadhaar;
    uint256 tokenId;
    string details;
}

/**
 * @dev Data structure for ration tokens
 */
struct RationTokenData {
    uint256 tokenId;
    uint256 aadhaar;
    address assignedShopkeeper;
    uint256 rationAmount;
    uint256 issuedTime;
    uint256 expiryTime;
    uint256 claimTime;
    bool isClaimed;
    bool isExpired;
    string category;
}


/**
 * @dev Dashboard data for system overview
 */
struct DashboardData {
    uint256 totalConsumers;
    uint256 totalShopkeepers;
    uint256 totalDeliveryAgents;
    uint256 totalTokensIssued;
    uint256 totalTokensClaimed;
    uint256 totalTokensExpired;
    uint256 pendingTokens;
    uint256 currentMonth;
    uint256 currentYear;
    uint256 lastUpdateTime;
}

/**
 * @dev Consumer-specific dashboard data
 */
struct ConsumerDashboard {
    uint256 aadhaar;
    string name;
    string category;
    string assignedShopkeeperName;
    uint256 totalTokensReceived;
    uint256 totalTokensClaimed;
    uint256 activeTokensCount;
    bool hasCurrentMonthToken;
    uint256 monthlyRationAmount;
    uint256 lastTokenIssuedTime;
    bool isActive;
}

/**
 * @dev Token status enumeration
 */
enum TokenStatus {
    PENDING,    // Token issued but not claimed
    CLAIMED,    // Token claimed by consumer
    EXPIRED     // Token expired before being claimed
}

// ============ INTERFACES ============

/**
 * @title IRationSystem
 * @dev Interface for the main ration distribution system
 */
interface IRationSystem {
    // ============ EVENTS ============
    
    event ConsumerRegistered(uint256 indexed aadhaar, string name, address indexed assignedShopkeeper);
    event ShopkeeperRegistered(address indexed shopkeeper, string name, string area);
    event DeliveryAgentRegistered(address indexed agent, string name);
    event TokensIssued(uint256 indexed aadhaar, uint256 indexed tokenId, uint256 amount);
    event TokenClaimed(uint256 indexed tokenId, uint256 indexed aadhaar, address indexed claimedBy);
    event TokenExpired(uint256 indexed tokenId, uint256 indexed aadhaar);
    event DeliveryConfirmed(uint256 indexed tokenId, address indexed deliveryAgent);
    event WalletLinked(uint256 indexed aadhaar, address indexed wallet);
    event DeliveryAgentAssigned(address indexed agent, address indexed shopkeeper);
    
    // ============ REGISTRATION FUNCTIONS ============
    
    function registerConsumer(
        uint256 aadhaar,
        string memory name,
        string memory mobile,
        address shopkeeper,
        uint256 rationCategory,
        string memory area
    ) external;
    
    function registerShopkeeper(
        address shopkeeper,
        string memory name,
        string memory area
    ) external;
    
    function registerDeliveryAgent(
        address agent,
        string memory name
    ) external;
    
    // ============ TOKEN MANAGEMENT ============
    
    function generateMonthlyTokensForAll() external;
    function expireOldTokens() external;
    function markRationDeliveredByAadhaar(uint256 aadhaar, uint256 tokenId) external;
    function confirmDeliveryByAgent(uint256 tokenId) external;
    
    // ============ DASHBOARD & ANALYTICS ============
    
    function getDashboardData() external view returns (DashboardData memory);
    function getConsumerDashboard(uint256 aadhaar) external view returns (ConsumerDashboard memory);
    function getActivityLogsForAI() external view returns (ActivityLog[] memory);
}

/**
 * @title IDCVToken
 * @dev Interface for Digital Ration Card Voucher tokens (ERC1155-based)
 */
interface IDCVToken {
    // ============ EVENTS ============
    
    event TokenMinted(uint256 indexed tokenId, uint256 indexed aadhaar, uint256 rationAmount);
    event TokenClaimed(uint256 indexed tokenId, uint256 indexed aadhaar);
    event TokenExpired(uint256 indexed tokenId, uint256 indexed aadhaar);
    
    // ============ TOKEN MANAGEMENT ============
    
    function mintTokenForAadhaar(uint256 aadhaar, address shopkeeper, uint256 rationAmount, string memory category) external returns (uint256);
    
    function markAsClaimed(uint256 tokenId) external;
    function markAsExpired(uint256 tokenId) external;
    
    // ============ VIEW FUNCTIONS ============
    
    function getTokenData(uint256 tokenId) external view returns (RationTokenData memory);
    function getTokenStatus(uint256 tokenId) external view returns (TokenStatus);
    function getTokensByAadhaar(uint256 aadhaar) external view returns (uint256[] memory);
    function getUnclaimedTokensByAadhaar(uint256 aadhaar) external view returns (uint256[] memory);
    function isTokenExpired(uint256 tokenId) external view returns (bool);
    function tokenExists(uint256 tokenId) external view returns (bool);
    function getExpiredTokens() external view returns (uint256[] memory);
    function getTokensExpiringSoon(uint256 daysAhead) external view returns (uint256[] memory);
}