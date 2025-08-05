// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../interfaces/IDCVToken.sol";

contract DeliveryFacet {
    
    // ============ EVENTS ============
    event OrderCreated(uint256 indexed orderId, uint256 indexed aadhaar, address indexed shopkeeper);
    event DeliveryAssigned(uint256 indexed deliveryId, uint256 indexed orderId, address indexed agent);
    event DeliveryStatusUpdated(uint256 indexed deliveryId, LibAppStorage.DeliveryStatus status);
    event DeliveryCompleted(uint256 indexed deliveryId, uint256 timestamp);
    event DeliveryFailed(uint256 indexed deliveryId, string reason);
    event EmergencyDelivery(uint256 indexed orderId, string reason);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only admin");
        _;
    }
    
    modifier onlyShopkeeper() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[msg.sender], "Only shopkeeper");
        _;
    }
    
    modifier onlyDeliveryAgent() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[msg.sender], "Only delivery agent");
        _;
    }
    
    modifier validOrder(uint256 orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.orders[orderId].orderId != 0, "Order does not exist");
        _;
    }
    
    modifier validDelivery(uint256 deliveryId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveries[deliveryId].deliveryId != 0, "Delivery does not exist");
        _;
    }
    
    // ============ ORDER MANAGEMENT ============
    
    /**
     * @dev Create a new order for a consumer
     */
    function createOrder(
        uint256 aadhaar,
        uint256[] memory tokenIds,
        address shopkeeper,
        string memory deliveryAddress,
        string memory specialInstructions,
        bool isEmergency
    ) external onlyAdmin returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        require(tokenIds.length > 0, "No tokens provided");
        
        uint256 orderId = ++s.nextOrderId;
        
        // Calculate total amount from tokens
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            IDCVToken.RationTokenData memory tokenData = IDCVToken(s.dcvTokenAddress).getTokenData(tokenIds[i]);
            require(tokenData.aadhaar == aadhaar, "Token not owned by consumer");
            require(!tokenData.isClaimed, "Token already claimed");
            totalAmount += tokenData.rationAmount;
        }
        
        s.orders[orderId] = LibAppStorage.Order({
            orderId: orderId,
            aadhaar: aadhaar,
            tokenIds: tokenIds,
            shopkeeper: shopkeeper,
            assignedDeliveryAgent: address(0),
            status: LibAppStorage.OrderStatus.CREATED,
            createdTime: block.timestamp,
            scheduledDelivery: 0,
            completedTime: 0,
            deliveryAddress: deliveryAddress,
            specialInstructions: specialInstructions,
            totalAmount: totalAmount,
            isPaid: false,
            cancellationReason: ""
        });
        
        s.consumerOrders[aadhaar].push(orderId);
        s.shopkeeperOrders[shopkeeper].push(orderId);
        
        if (isEmergency) {
            s.emergencyOrders[orderId] = true;
            emit EmergencyDelivery(orderId, "Emergency order created");
        }
        
        s.systemAnalytics.totalOrders++;
        s.systemAnalytics.pendingOrders++;
        s.systemAnalytics.lastUpdated = block.timestamp;
        
        emit OrderCreated(orderId, aadhaar, shopkeeper);
        return orderId;
    }
    
    /**
     * @dev Assign delivery agent to an order
     */
    function assignDeliveryAgent(uint256 orderId, address agent) external onlyAdmin validOrder(orderId) returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveryAgents_[agent], "Invalid delivery agent");
        require(s.orders[orderId].status == LibAppStorage.OrderStatus.CREATED, "Order not in created state");
        
        uint256 deliveryId = ++s.nextDeliveryId;
        
        s.deliveries[deliveryId] = LibAppStorage.Delivery({
            deliveryId: deliveryId,
            orderId: orderId,
            deliveryAgent: agent,
            status: LibAppStorage.DeliveryStatus.ASSIGNED,
            assignedTime: block.timestamp,
            pickedUpTime: 0,
            deliveredTime: 0,
            estimatedDelivery: block.timestamp + s.maxDeliveryTime,
            currentLocation: "",
            proofOfDelivery: "",
            failureReason: "",
            requiresSignature: true,
            digitalSignature: ""
        });
        
        s.orders[orderId].assignedDeliveryAgent = agent;
        s.orders[orderId].status = LibAppStorage.OrderStatus.ASSIGNED;
        s.orders[orderId].scheduledDelivery = block.timestamp + s.maxDeliveryTime;
        
        s.agentDeliveries[agent].push(deliveryId);
        s.orderToDelivery[orderId] = deliveryId;
        
        s.systemAnalytics.activeDeliveries++;
        
        emit DeliveryAssigned(deliveryId, orderId, agent);
        return deliveryId;
    }
    
    /**
     * @dev Update delivery status (called by delivery agent)
     */
    function updateDeliveryStatus(
        uint256 deliveryId, 
        LibAppStorage.DeliveryStatus status,
        string memory location,
        string memory additionalInfo
    ) external onlyDeliveryAgent validDelivery(deliveryId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveries[deliveryId].deliveryAgent == msg.sender, "Not assigned to you");
        
        LibAppStorage.Delivery storage delivery = s.deliveries[deliveryId];
        LibAppStorage.Order storage order = s.orders[delivery.orderId];
        
        delivery.status = status;
        delivery.currentLocation = location;
        
        if (status == LibAppStorage.DeliveryStatus.PICKED_UP) {
            delivery.pickedUpTime = block.timestamp;
            order.status = LibAppStorage.OrderStatus.IN_TRANSIT;
        } else if (status == LibAppStorage.DeliveryStatus.DELIVERED) {
            delivery.deliveredTime = block.timestamp;
            order.status = LibAppStorage.OrderStatus.DELIVERED;
            
            // Update agent metrics
            s.agentMetrics[msg.sender].totalDeliveries++;
            s.agentMetrics[msg.sender].lastDeliveryTime = block.timestamp;
            
            // Calculate delivery time for metrics
            uint256 deliveryTime = block.timestamp - delivery.assignedTime;
            s.agentMetrics[msg.sender].averageDeliveryTime = 
                (s.agentMetrics[msg.sender].averageDeliveryTime + deliveryTime) / 2;
        } else if (status == LibAppStorage.DeliveryStatus.FAILED) {
            delivery.failureReason = additionalInfo;
            order.status = LibAppStorage.OrderStatus.DISPUTED;
            s.disputeReasons[delivery.orderId] = additionalInfo;
            
            s.agentMetrics[msg.sender].failedDeliveries++;
        }
        
        emit DeliveryStatusUpdated(deliveryId, status);
    }
    
    /**
     * @dev Complete delivery with proof
     */
    function completeDelivery(
        uint256 deliveryId,
        string memory proofOfDelivery,
        string memory digitalSignature
    ) external onlyDeliveryAgent validDelivery(deliveryId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveries[deliveryId].deliveryAgent == msg.sender, "Not assigned to you");
        require(s.deliveries[deliveryId].status == LibAppStorage.DeliveryStatus.DELIVERED, "Not delivered yet");
        
        LibAppStorage.Delivery storage delivery = s.deliveries[deliveryId];
        LibAppStorage.Order storage order = s.orders[delivery.orderId];
        
        delivery.proofOfDelivery = proofOfDelivery;
        delivery.digitalSignature = digitalSignature;
        delivery.status = LibAppStorage.DeliveryStatus.CONFIRMED;
        
        order.status = LibAppStorage.OrderStatus.COMPLETED;
        order.completedTime = block.timestamp;
        
        // Mark tokens as claimed
        for (uint256 i = 0; i < order.tokenIds.length; i++) {
            IDCVToken(s.dcvTokenAddress).markAsClaimed(order.tokenIds[i]);
        }
        
        // Update metrics
        s.agentMetrics[msg.sender].successfulDeliveries++;
        s.systemAnalytics.totalDeliveries++;
        if (s.systemAnalytics.activeDeliveries > 0) {
            s.systemAnalytics.activeDeliveries--;
        }
        if (s.systemAnalytics.pendingOrders > 0) {
            s.systemAnalytics.pendingOrders--;
        }
        
        // Calculate success rate
        uint256 totalDeliveries = s.agentMetrics[msg.sender].totalDeliveries;
        uint256 successful = s.agentMetrics[msg.sender].successfulDeliveries;
        if (totalDeliveries > 0) {
            s.systemAnalytics.successRate = (successful * 100) / totalDeliveries;
        }
        
        emit DeliveryCompleted(deliveryId, block.timestamp);
    }
    
    // ============ SHOPKEEPER FUNCTIONS ============
    
    /**
     * @dev Shopkeeper marks order as ready for pickup
     */
    function markOrderReady(uint256 orderId) external onlyShopkeeper validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.orders[orderId].shopkeeper == msg.sender, "Not your order");
        require(s.orders[orderId].status == LibAppStorage.OrderStatus.ASSIGNED, "Order not in assigned state");
        
        s.orders[orderId].status = LibAppStorage.OrderStatus.READY;
        
        // Notify delivery agent
        uint256 deliveryId = s.orderToDelivery[orderId];
        if (deliveryId != 0) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.EN_ROUTE;
        }
    }
    
    /**
     * @dev Shopkeeper confirms pickup by delivery agent
     */
    function confirmPickup(uint256 orderId) external onlyShopkeeper validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.orders[orderId].shopkeeper == msg.sender, "Not your order");
        require(s.orders[orderId].status == LibAppStorage.OrderStatus.READY, "Order not ready");
        
        s.orders[orderId].status = LibAppStorage.OrderStatus.PROCESSING;
        
        uint256 deliveryId = s.orderToDelivery[orderId];
        if (deliveryId != 0) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.PICKED_UP;
            s.deliveries[deliveryId].pickedUpTime = block.timestamp;
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getOrder(uint256 orderId) external view returns (LibAppStorage.Order memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.orders[orderId];
    }
    
    function getDelivery(uint256 deliveryId) external view returns (LibAppStorage.Delivery memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.deliveries[deliveryId];
    }
    
    function getConsumerOrders(uint256 aadhaar) external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.consumerOrders[aadhaar];
    }
    
    function getShopkeeperOrders(address shopkeeper) external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.shopkeeperOrders[shopkeeper];
    }
    
    function getAgentDeliveries(address agent) external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.agentDeliveries[agent];
    }
    
    function getActiveDeliveries() external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256[] memory activeDeliveries = new uint256[](s.systemAnalytics.activeDeliveries);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= s.nextDeliveryId; i++) {
            LibAppStorage.Delivery memory delivery = s.deliveries[i];
            if (delivery.status != LibAppStorage.DeliveryStatus.CONFIRMED && 
                delivery.status != LibAppStorage.DeliveryStatus.FAILED &&
                delivery.status != LibAppStorage.DeliveryStatus.CANCELLED) {
                activeDeliveries[count] = i;
                count++;
            }
        }
        
        return activeDeliveries;
    }
    
    function getDeliveryMetrics(address agent) external view returns (LibAppStorage.DeliveryMetrics memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.agentMetrics[agent];
    }
    
    function getSystemAnalytics() external view returns (LibAppStorage.SystemAnalytics memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.systemAnalytics;
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    function escalateToEmergency(uint256 orderId, string memory reason) external onlyAdmin validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        s.emergencyOrders[orderId] = true;
        s.disputeReasons[orderId] = reason;
        
        emit EmergencyDelivery(orderId, reason);
    }
    
    function cancelOrder(uint256 orderId, string memory reason) external onlyAdmin validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        s.orders[orderId].status = LibAppStorage.OrderStatus.CANCELLED;
        s.orders[orderId].cancellationReason = reason;
        
        uint256 deliveryId = s.orderToDelivery[orderId];
        if (deliveryId != 0) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.CANCELLED;
        }
        
        if (s.systemAnalytics.pendingOrders > 0) {
            s.systemAnalytics.pendingOrders--;
        }
        if (s.systemAnalytics.activeDeliveries > 0) {
            s.systemAnalytics.activeDeliveries--;
        }
    }
}
