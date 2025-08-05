// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Only import what we need, no circular dependencies
library LibAppStorage {
    bytes32 constant APP_STORAGE_POSITION = keccak256("diamond.standard.app.storage");
    
    // Define structs directly here to avoid conflicts
    struct ConsumerStruct {
        uint256 aadhaar;
        string name;
        string mobile;
        string category;
        uint256 registrationTime;
        address assignedShopkeeper;
        uint256 totalTokensReceived;
        uint256 totalTokensClaimed;
        uint256 lastTokenIssuedTime;
        bool isActive;
    }
    
    struct ShopkeeperStruct {
        address shopkeeperAddress;
        string name;
        string area;
        uint256 registrationTime;
        uint256 totalConsumersAssigned;
        uint256 totalTokensIssued;
        uint256 totalDeliveries;
        bool isActive;
    }
    
    struct DeliveryAgentStruct {
        address agentAddress;
        string name;
        string mobile;
        uint256 registrationTime;
        address assignedShopkeeper;
        uint256 totalDeliveries;
        bool isActive;
    }
    
    struct ActivityLog {
        uint256 timestamp;
        address actor;
        string action;
        uint256 aadhaar;
        uint256 tokenId;
        string details;
    }
    
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

    struct ConsumerAuth {
        uint256 aadhaar;
        bytes32 pinHash;           // Keccak256 hash of 6-digit PIN
        uint256 lastLoginTime;     // Last successful login timestamp
        uint256 sessionExpiry;     // Session expiration time
        uint256 failedAttempts;    // Failed login attempts counter
        bool isLocked;            // Account lock status
        uint256 lockUntil;        // Lock expiration timestamp
        bytes32 sessionToken;     // Current session token
        bool pinSet;              // Whether PIN has been set
    }

    struct MobileAuth {
        string mobile;
        uint256 linkedAadhaar;
        bytes32 pinHash;
        uint256 lastLoginTime;
        uint256 sessionExpiry;
        uint256 failedAttempts;
        bool isLocked;
        uint256 lockUntil;
        bytes32 sessionToken;
    }

    struct PaymentRecord {
        uint256 paymentId;
        uint256 aadhaar;
        uint256 tokenId;
        address shopkeeper;
        uint256 amount;
        string upiTransactionId;
        string paymentMethod; // "UPI", "CASH", "CARD"
        uint256 timestamp;
        bool isVerified;
        string invoiceHash; // IPFS hash of invoice
    }

    struct Invoice {
        uint256 invoiceId;
        uint256 paymentId;
        uint256 aadhaar;
        string consumerName;
        address shopkeeper;
        string shopkeeperName;
        uint256 tokenId;
        string category;
        uint256 rationAmount;
        uint256 totalAmount;
        uint256 subsidyAmount;
        uint256 payableAmount;
        string upiTransactionId;
        uint256 timestamp;
        string status; // "PAID", "PENDING", "FAILED"
    }

    // ============ NEW DELIVERY MANAGEMENT STRUCTS ============
    enum DeliveryStatus { 
        ASSIGNED,           // Delivery assigned to agent
        EN_ROUTE,          // Agent is on the way
        ARRIVED,           // Agent has arrived at shop
        PICKED_UP,         // Items picked up from shop
        OUT_FOR_DELIVERY,  // Going to consumer location
        DELIVERED,         // Items delivered to consumer
        CONFIRMED,         // Delivery confirmed by all parties
        FAILED,            // Delivery failed
        CANCELLED          // Delivery cancelled
    }

    enum OrderStatus { 
        CREATED,           // Order created by admin
        ASSIGNED,          // Assigned to shopkeeper
        PROCESSING,        // Being prepared by shopkeeper
        READY,             // Ready for pickup
        IN_TRANSIT,        // With delivery agent
        DELIVERED,         // Delivered to consumer
        COMPLETED,         // Order completed successfully
        CANCELLED,         // Order cancelled
        DISPUTED           // Under dispute resolution
    }

    enum NotificationPriority { LOW, MEDIUM, HIGH, CRITICAL }

    enum NotificationType {
        DELIVERY_ASSIGNMENT,
        STATUS_UPDATE,
        EMERGENCY_ALERT,
        SYSTEM_NOTIFICATION,
        REMINDER,
        DISPUTE_ALERT
    }

    struct Order {
        uint256 orderId;
        uint256 aadhaar;
        uint256[] tokenIds;
        address shopkeeper;
        address assignedDeliveryAgent;
        OrderStatus status;
        uint256 createdTime;
        uint256 scheduledDelivery;
        uint256 completedTime;
        string deliveryAddress;
        string specialInstructions;
        uint256 totalAmount;
        bool isPaid;
        string cancellationReason;
    }

    struct Delivery {
        uint256 deliveryId;
        uint256 orderId;
        address deliveryAgent;
        DeliveryStatus status;
        uint256 assignedTime;
        uint256 pickedUpTime;
        uint256 deliveredTime;
        uint256 estimatedDelivery;
        string currentLocation;
        string proofOfDelivery; // IPFS hash
        string failureReason;
        bool requiresSignature;
        string digitalSignature;
    }

    struct Notification {
        uint256 notificationId;
        address recipient;
        NotificationType notificationType;
        NotificationPriority priority;
        string title;
        string message;
        string metadata; // JSON string for additional data
        uint256 timestamp;
        bool isRead;
        bool isArchived;
        uint256 expiryTime;
    }

    struct InventoryItem {
        string itemName;
        string category;
        uint256 quantityAvailable;
        uint256 quantityReserved;
        uint256 pricePerUnit;
        uint256 lastUpdated;
        bool isActive;
    }

    struct ShopInventory {
        address shopkeeper;
        mapping(string => InventoryItem) items;
        string[] itemNames;
        uint256 lastInventoryUpdate;
        uint256 totalValue;
    }

    struct DeliveryMetrics {
        address agent;
        uint256 totalDeliveries;
        uint256 successfulDeliveries;
        uint256 failedDeliveries;
        uint256 averageDeliveryTime;
        uint256 rating;
        uint256 totalRatings;
        uint256 lastDeliveryTime;
    }

    struct SystemAnalytics {
        uint256 totalOrders;
        uint256 totalDeliveries;
        uint256 successRate;
        uint256 averageDeliveryTime;
        uint256 activeDeliveries;
        uint256 pendingOrders;
        uint256 totalRevenue;
        uint256 lastUpdated;
    }

    struct AppStorage {
        // ============ OWNERSHIP & ACCESS CONTROL ============
        address owner;                      // Contract owner/admin address
        mapping(address => bool) admins;    // Additional admin addresses
        
        // ============ CORE CONTRACT REFERENCES ============
        address dcvTokenAddress;            // DCVToken contract address
        
        // ============ CONSUMER MANAGEMENT ============
        mapping(uint256 => ConsumerStruct) consumers;
        uint256[] allAadhaars;
        mapping(string => uint256) mobileToAadhaar;
        mapping(uint256 => address) aadhaarToWallet;
        mapping(address => uint256) walletToAadhaar;
        
        // ============ SHOPKEEPER MANAGEMENT ============
        mapping(address => ShopkeeperStruct) shopkeepers;
        address[] allShopkeepers;
        mapping(address => bool) shopkeepers_;              // Quick lookup
        
        // ============ DELIVERY AGENT MANAGEMENT ============
        mapping(address => DeliveryAgentStruct) deliveryAgents;
        address[] allDeliveryAgents;
        mapping(address => bool) deliveryAgents_;           // Quick lookup
        mapping(address => address) agentToShopkeeper;
        mapping(address => string) deliveryAgentOTPs;
        
        // ============ TOKEN & RATION MANAGEMENT ============
        mapping(uint256 => mapping(uint256 => mapping(uint256 => bool))) monthlyIssuance; // aadhaar -> month -> year -> issued
        mapping(string => uint256) rationAmounts;           // category -> amount
        mapping(uint256 => mapping(uint256 => bool)) deliveryLogs; // tokenId -> timestamp -> delivered
        
        // ============ SECURITY & AUTHENTICATION ============
        mapping(uint256 => ConsumerAuth) consumerAuth;      // Aadhaar -> Auth data
        mapping(string => MobileAuth) mobileAuth;           // Mobile -> Auth data
        mapping(bytes32 => uint256) sessionToAadhaar;       // Session token -> Aadhaar
        mapping(address => uint256) walletSessions;         // Wallet -> session expiry
        
        uint256 sessionDuration;        // Default: 1 hour (3600 seconds)
        uint256 maxFailedAttempts;      // Default: 3 attempts
        uint256 lockDuration;           // Default: 1 hour lock
        bool securityEnabled;           // Master security switch
        
        // ============ ACTIVITY LOGGING ============
        ActivityLog[] activityLogs;
        
        // ============ SYSTEM COUNTERS ============
        uint256 totalTokensIssued;
        uint256 totalTokensClaimed;
        uint256 totalTokensExpired;
        
        // ============ SYSTEM STATE ============
        bool paused;                    // Emergency pause state

        // ============ PAYMENT SYSTEM ============
        bool paymentSystemEnabled;                      // Master payment switch
        uint256 subsidyPercentage;                      // Global subsidy percentage
        mapping(string => uint256) rationPrices;        // category -> price per kg
        
        uint256 nextPaymentId;                          // Payment ID counter
        uint256 nextInvoiceId;                          // Invoice ID counter
        
        mapping(uint256 => PaymentRecord) payments;     // paymentId -> PaymentRecord
        mapping(uint256 => Invoice) invoices;           // invoiceId -> Invoice
        mapping(string => uint256) upiTransactionToPayment; // UPI txnId -> paymentId
        
        mapping(uint256 => uint256[]) tokenPayments;    // tokenId -> paymentIds[]
        mapping(uint256 => uint256[]) consumerPayments; // aadhaar -> paymentIds[]
        mapping(address => uint256[]) shopkeeperPayments; // shopkeeper -> paymentIds[]

        // ============ DELIVERY MANAGEMENT SYSTEM ============
        uint256 nextOrderId;                           // Order ID counter
        uint256 nextDeliveryId;                        // Delivery ID counter
        uint256 nextNotificationId;                    // Notification ID counter
        
        mapping(uint256 => Order) orders;              // orderId -> Order
        mapping(uint256 => Delivery) deliveries;       // deliveryId -> Delivery
        mapping(uint256 => Notification) notifications; // notificationId -> Notification
        
        mapping(uint256 => uint256[]) consumerOrders;   // aadhaar -> orderIds[]
        mapping(address => uint256[]) shopkeeperOrders; // shopkeeper -> orderIds[]
        mapping(address => uint256[]) agentDeliveries;  // agent -> deliveryIds[]
        mapping(uint256 => uint256) orderToDelivery;    // orderId -> deliveryId
        
        // ============ INVENTORY MANAGEMENT ============
        mapping(address => ShopInventory) shopInventories; // shopkeeper -> inventory
        mapping(string => uint256) globalInventory;     // itemName -> total available
        
        // ============ NOTIFICATION SYSTEM ============
        mapping(address => uint256[]) userNotifications; // user -> notificationIds[]
        mapping(NotificationType => bool) notificationEnabled; // notification type settings
        
        // ============ ANALYTICS & METRICS ============
        mapping(address => DeliveryMetrics) agentMetrics; // agent -> metrics
        SystemAnalytics systemAnalytics;
        
        // ============ EMERGENCY & DISPUTE SYSTEM ============
        mapping(uint256 => string) disputeReasons;     // orderId -> dispute reason
        mapping(uint256 => bool) emergencyOrders;      // orderId -> is emergency
        address[] emergencyContacts;                   // Emergency contact addresses
        
        // ============ LOCATION & ROUTING ============
        mapping(address => string) userLocations;      // user -> location coordinates
        mapping(uint256 => string[]) deliveryRoute;    // deliveryId -> route coordinates
        
        // ============ SYSTEM SETTINGS ============
        uint256 maxDeliveryTime;                       // Maximum delivery time in seconds
        uint256 emergencyResponseTime;                 // Emergency response time
        bool realTimeTrackingEnabled;                  // Real-time tracking feature
        bool gpsIntegrationEnabled;                    // GPS integration feature
    }
    
    function appStorage() internal pure returns (AppStorage storage s) {
        bytes32 position = APP_STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }
}