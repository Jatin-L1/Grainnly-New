// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract WorkflowFacet {
    
    // ============ EVENTS ============
    event WorkflowStateChanged(uint256 indexed orderId, LibAppStorage.OrderStatus fromStatus, LibAppStorage.OrderStatus toStatus);
    event WorkflowRuleApplied(uint256 indexed orderId, string ruleName, string result);
    event AutomationTriggered(uint256 indexed orderId, string automationType, uint256 timestamp);
    event DisputeInitiated(uint256 indexed orderId, string reason, address initiator);
    event DisputeResolved(uint256 indexed orderId, string resolution, address resolver);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only admin");
        _;
    }
    
    modifier onlyAuthorized() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(
            msg.sender == LibDiamond.contractOwner() || 
            s.admins[msg.sender] || 
            s.shopkeepers_[msg.sender] || 
            s.deliveryAgents_[msg.sender], 
            "Not authorized"
        );
        _;
    }
    
    modifier validOrder(uint256 orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.orders[orderId].orderId != 0, "Order does not exist");
        _;
    }
    
    // ============ WORKFLOW STATE MANAGEMENT ============
    
    /**
     * @dev Initialize a complete order workflow
     */
    function initializeOrderWorkflow(
        uint256 aadhaar,
        uint256[] memory tokenIds,
        address shopkeeper,
        string memory deliveryAddress,
        string memory specialInstructions,
        bool isEmergency
    ) external onlyAdmin returns (uint256 orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Validate inputs
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        require(tokenIds.length > 0, "No tokens provided");
        
        // Create order through DeliveryFacet (assuming it's available)
        orderId = ++s.nextOrderId;
        
        // Initialize workflow state
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
            totalAmount: 0, // Will be calculated
            isPaid: false,
            cancellationReason: ""
        });
        
        // Apply initial workflow rules
        _applyWorkflowRules(orderId);
        
        // Set up emergency handling if needed
        if (isEmergency) {
            s.emergencyOrders[orderId] = true;
            _handleEmergencyWorkflow(orderId);
        }
        
        emit WorkflowStateChanged(orderId, LibAppStorage.OrderStatus.CREATED, LibAppStorage.OrderStatus.CREATED);
        emit WorkflowRuleApplied(orderId, "order_initialization", "completed");
        
        return orderId;
    }
    
    /**
     * @dev Progress order to next valid state
     */
    function progressOrderState(
        uint256 orderId,
        LibAppStorage.OrderStatus newStatus,
        string memory reason
    ) external onlyAuthorized validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order storage order = s.orders[orderId];
        LibAppStorage.OrderStatus currentStatus = order.status;
        
        // Validate state transition
        require(_isValidStateTransition(currentStatus, newStatus), "Invalid state transition");
        
        // Check authorization for this transition
        require(_isAuthorizedForTransition(orderId, msg.sender, newStatus), "Not authorized for this transition");
        
        // Apply pre-transition rules
        _applyPreTransitionRules(orderId, currentStatus, newStatus);
        
        // Update state
        order.status = newStatus;
        
        // Apply post-transition rules
        _applyPostTransitionRules(orderId, currentStatus, newStatus, reason);
        
        emit WorkflowStateChanged(orderId, currentStatus, newStatus);
        emit WorkflowRuleApplied(orderId, "state_transition", "completed");
    }
    
    /**
     * @dev Auto-progress orders based on time and conditions
     */
    function autoProgressOrders() external onlyAdmin returns (uint256 processedCount) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        processedCount = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 1; i <= s.nextOrderId; i++) {
            LibAppStorage.Order storage order = s.orders[i];
            if (order.orderId == 0) continue;
            
            bool progressed = false;
            
            // Auto-assign if created more than 1 hour ago
            if (order.status == LibAppStorage.OrderStatus.CREATED && 
                currentTime > order.createdTime + 3600) {
                
                address availableAgent = _findAvailableDeliveryAgent(order.shopkeeper);
                if (availableAgent != address(0)) {
                    order.assignedDeliveryAgent = availableAgent;
                    order.status = LibAppStorage.OrderStatus.ASSIGNED;
                    progressed = true;
                    
                    emit AutomationTriggered(i, "auto_assignment", currentTime);
                }
            }
            
            // Auto-escalate if assigned more than 2 hours ago without progress
            else if (order.status == LibAppStorage.OrderStatus.ASSIGNED && 
                     currentTime > order.createdTime + 7200) {
                
                if (s.emergencyOrders[i] == false) {
                    s.emergencyOrders[i] = true;
                    emit AutomationTriggered(i, "auto_escalation", currentTime);
                    progressed = true;
                }
            }
            
            // Auto-cancel if no progress for 24 hours
            else if (order.status == LibAppStorage.OrderStatus.CREATED && 
                     currentTime > order.createdTime + 86400) {
                
                order.status = LibAppStorage.OrderStatus.CANCELLED;
                order.cancellationReason = "Auto-cancelled due to no progress for 24 hours";
                progressed = true;
                
                emit AutomationTriggered(i, "auto_cancellation", currentTime);
            }
            
            if (progressed) {
                processedCount++;
                _applyWorkflowRules(i);
            }
        }
        
        return processedCount;
    }
    
    /**
     * @dev Handle dispute initiation and resolution workflow
     */
    function initiateDispute(
        uint256 orderId,
        string memory reason,
        string memory evidence
    ) external onlyAuthorized validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order storage order = s.orders[orderId];
        require(
            order.status == LibAppStorage.OrderStatus.DELIVERED || 
            order.status == LibAppStorage.OrderStatus.IN_TRANSIT,
            "Order not in disputable state"
        );
        
        // Change order status to disputed
        LibAppStorage.OrderStatus oldStatus = order.status;
        order.status = LibAppStorage.OrderStatus.DISPUTED;
        
        // Store dispute information
        s.disputeReasons[orderId] = string(abi.encodePacked(reason, " | Evidence: ", evidence));
        
        // Handle delivery status if applicable
        uint256 deliveryId = s.orderToDelivery[orderId];
        if (deliveryId != 0) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.FAILED;
            s.deliveries[deliveryId].failureReason = reason;
        }
        
        emit DisputeInitiated(orderId, reason, msg.sender);
        emit WorkflowStateChanged(orderId, oldStatus, LibAppStorage.OrderStatus.DISPUTED);
        
        // Auto-escalate high-priority disputes
        if (s.emergencyOrders[orderId]) {
            _escalateDispute(orderId, "Emergency order dispute");
        }
    }
    
    /**
     * @dev Resolve dispute and determine next steps
     */
    function resolveDispute(
        uint256 orderId,
        string memory resolution,
        LibAppStorage.OrderStatus finalStatus
    ) external onlyAdmin validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order storage order = s.orders[orderId];
        require(order.status == LibAppStorage.OrderStatus.DISPUTED, "Order not in dispute");
        
        // Validate final status
        require(
            finalStatus == LibAppStorage.OrderStatus.COMPLETED ||
            finalStatus == LibAppStorage.OrderStatus.CANCELLED ||
            finalStatus == LibAppStorage.OrderStatus.ASSIGNED, // For re-assignment
            "Invalid final status for dispute resolution"
        );
        
        // Update order status
        order.status = finalStatus;
        
        // Handle re-assignment if needed
        if (finalStatus == LibAppStorage.OrderStatus.ASSIGNED) {
            address newAgent = _findAvailableDeliveryAgent(order.shopkeeper);
            if (newAgent != address(0)) {
                order.assignedDeliveryAgent = newAgent;
                // Create new delivery entry
                _createNewDeliveryForReassignment(orderId);
            }
        }
        
        // Clear dispute data
        delete s.disputeReasons[orderId];
        
        emit DisputeResolved(orderId, resolution, msg.sender);
        emit WorkflowStateChanged(orderId, LibAppStorage.OrderStatus.DISPUTED, finalStatus);
    }
    
    /**
     * @dev Emergency workflow handler
     */
    function handleEmergencyEscalation(uint256 orderId) external onlyAdmin validOrder(orderId) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        s.emergencyOrders[orderId] = true;
        _handleEmergencyWorkflow(orderId);
        
        emit AutomationTriggered(orderId, "emergency_escalation", block.timestamp);
    }
    
    /**
     * @dev Bulk workflow operations
     */
    function bulkProgressOrders(
        uint256[] memory orderIds,
        LibAppStorage.OrderStatus newStatus,
        string memory reason
    ) external onlyAdmin returns (uint256 successCount) {
        successCount = 0;
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            try this.progressOrderState(orderIds[i], newStatus, reason) {
                successCount++;
            } catch {
                // Continue with next order if one fails
                continue;
            }
        }
        
        return successCount;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get order workflow history
     */
    function getOrderWorkflowHistory(uint256 orderId) external view returns (
        LibAppStorage.OrderStatus currentStatus,
        uint256 createdTime,
        uint256 lastUpdated,
        bool isEmergency,
        bool hasDispute,
        string memory disputeReason
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order memory order = s.orders[orderId];
        
        return (
            order.status,
            order.createdTime,
            order.completedTime > 0 ? order.completedTime : block.timestamp,
            s.emergencyOrders[orderId],
            bytes(s.disputeReasons[orderId]).length > 0,
            s.disputeReasons[orderId]
        );
    }
    
    /**
     * @dev Check if state transition is valid
     */
    function isValidStateTransition(
        LibAppStorage.OrderStatus from,
        LibAppStorage.OrderStatus to
    ) external pure returns (bool) {
        return _isValidStateTransition(from, to);
    }
    
    /**
     * @dev Get available next states for an order
     */
    function getAvailableNextStates(uint256 orderId) external view returns (LibAppStorage.OrderStatus[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.OrderStatus currentStatus = s.orders[orderId].status;
        LibAppStorage.OrderStatus[] memory allStates = new LibAppStorage.OrderStatus[](9);
        allStates[0] = LibAppStorage.OrderStatus.CREATED;
        allStates[1] = LibAppStorage.OrderStatus.ASSIGNED;
        allStates[2] = LibAppStorage.OrderStatus.PROCESSING;
        allStates[3] = LibAppStorage.OrderStatus.READY;
        allStates[4] = LibAppStorage.OrderStatus.IN_TRANSIT;
        allStates[5] = LibAppStorage.OrderStatus.DELIVERED;
        allStates[6] = LibAppStorage.OrderStatus.COMPLETED;
        allStates[7] = LibAppStorage.OrderStatus.CANCELLED;
        allStates[8] = LibAppStorage.OrderStatus.DISPUTED;
        
        uint256 validCount = 0;
        for (uint256 i = 0; i < allStates.length; i++) {
            if (_isValidStateTransition(currentStatus, allStates[i])) {
                validCount++;
            }
        }
        
        LibAppStorage.OrderStatus[] memory validStates = new LibAppStorage.OrderStatus[](validCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allStates.length; i++) {
            if (_isValidStateTransition(currentStatus, allStates[i])) {
                validStates[index] = allStates[i];
                index++;
            }
        }
        
        return validStates;
    }
    
    /**
     * @dev Get orders requiring attention (stuck in workflow)
     */
    function getOrdersRequiringAttention() external view returns (
        uint256[] memory orderIds,
        string[] memory reasons
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 currentTime = block.timestamp;
        uint256 count = 0;
        
        // Count orders requiring attention
        for (uint256 i = 1; i <= s.nextOrderId; i++) {
            LibAppStorage.Order memory order = s.orders[i];
            if (order.orderId == 0) continue;
            
            if (_requiresAttention(order, currentTime)) {
                count++;
            }
        }
        
        orderIds = new uint256[](count);
        reasons = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= s.nextOrderId; i++) {
            LibAppStorage.Order memory order = s.orders[i];
            if (order.orderId == 0) continue;
            
            if (_requiresAttention(order, currentTime)) {
                orderIds[index] = order.orderId;
                reasons[index] = _getAttentionReason(order, currentTime);
                index++;
            }
        }
        
        return (orderIds, reasons);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _isValidStateTransition(
        LibAppStorage.OrderStatus from,
        LibAppStorage.OrderStatus to
    ) internal pure returns (bool) {
        if (from == to) return false; // No self-transitions
        
        // Define valid transitions
        if (from == LibAppStorage.OrderStatus.CREATED) {
            return to == LibAppStorage.OrderStatus.ASSIGNED || 
                   to == LibAppStorage.OrderStatus.CANCELLED;
        }
        
        if (from == LibAppStorage.OrderStatus.ASSIGNED) {
            return to == LibAppStorage.OrderStatus.PROCESSING || 
                   to == LibAppStorage.OrderStatus.CANCELLED ||
                   to == LibAppStorage.OrderStatus.DISPUTED;
        }
        
        if (from == LibAppStorage.OrderStatus.PROCESSING) {
            return to == LibAppStorage.OrderStatus.READY || 
                   to == LibAppStorage.OrderStatus.CANCELLED ||
                   to == LibAppStorage.OrderStatus.DISPUTED;
        }
        
        if (from == LibAppStorage.OrderStatus.READY) {
            return to == LibAppStorage.OrderStatus.IN_TRANSIT || 
                   to == LibAppStorage.OrderStatus.CANCELLED ||
                   to == LibAppStorage.OrderStatus.DISPUTED;
        }
        
        if (from == LibAppStorage.OrderStatus.IN_TRANSIT) {
            return to == LibAppStorage.OrderStatus.DELIVERED || 
                   to == LibAppStorage.OrderStatus.CANCELLED ||
                   to == LibAppStorage.OrderStatus.DISPUTED;
        }
        
        if (from == LibAppStorage.OrderStatus.DELIVERED) {
            return to == LibAppStorage.OrderStatus.COMPLETED ||
                   to == LibAppStorage.OrderStatus.DISPUTED;
        }
        
        if (from == LibAppStorage.OrderStatus.DISPUTED) {
            return to == LibAppStorage.OrderStatus.COMPLETED ||
                   to == LibAppStorage.OrderStatus.CANCELLED ||
                   to == LibAppStorage.OrderStatus.ASSIGNED; // For re-assignment
        }
        
        return false;
    }
    
    function _isAuthorizedForTransition(
        uint256 orderId,
        address user,
        LibAppStorage.OrderStatus newStatus
    ) internal view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Admin can do anything
        if (user == LibDiamond.contractOwner() || s.admins[user]) {
            return true;
        }
        
        LibAppStorage.Order memory order = s.orders[orderId];
        
        // Shopkeeper authorizations
        if (s.shopkeepers_[user] && user == order.shopkeeper) {
            return newStatus == LibAppStorage.OrderStatus.PROCESSING ||
                   newStatus == LibAppStorage.OrderStatus.READY ||
                   newStatus == LibAppStorage.OrderStatus.CANCELLED;
        }
        
        // Delivery agent authorizations
        if (s.deliveryAgents_[user] && user == order.assignedDeliveryAgent) {
            return newStatus == LibAppStorage.OrderStatus.IN_TRANSIT ||
                   newStatus == LibAppStorage.OrderStatus.DELIVERED;
        }
        
        return false;
    }
    
    function _applyWorkflowRules(uint256 orderId) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order memory order = s.orders[orderId];
        
        // Rule: Auto-assign if no agent assigned within 1 hour
        if (order.status == LibAppStorage.OrderStatus.CREATED && 
            order.assignedDeliveryAgent == address(0) &&
            block.timestamp > order.createdTime + 3600) {
            
            address agent = _findAvailableDeliveryAgent(order.shopkeeper);
            if (agent != address(0)) {
                s.orders[orderId].assignedDeliveryAgent = agent;
                s.orders[orderId].status = LibAppStorage.OrderStatus.ASSIGNED;
            }
        }
    }
    
    function _applyPreTransitionRules(
        uint256 orderId,
        LibAppStorage.OrderStatus currentStatus,
        LibAppStorage.OrderStatus newStatus
    ) internal {
        // Pre-transition validations and preparations
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        if (newStatus == LibAppStorage.OrderStatus.IN_TRANSIT) {
            // Ensure delivery agent is assigned
            require(s.orders[orderId].assignedDeliveryAgent != address(0), "No delivery agent assigned");
        }
        
        if (newStatus == LibAppStorage.OrderStatus.COMPLETED) {
            // Ensure payment is processed
            require(s.orders[orderId].isPaid, "Payment not completed");
        }
    }
    
    function _applyPostTransitionRules(
        uint256 orderId,
        LibAppStorage.OrderStatus oldStatus,
        LibAppStorage.OrderStatus newStatus,
        string memory reason
    ) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        if (newStatus == LibAppStorage.OrderStatus.COMPLETED) {
            s.orders[orderId].completedTime = block.timestamp;
            
            // Update metrics
            s.systemAnalytics.pendingOrders--;
            s.systemAnalytics.lastUpdated = block.timestamp;
        }
        
        if (newStatus == LibAppStorage.OrderStatus.CANCELLED) {
            s.orders[orderId].cancellationReason = reason;
            
            // Release reserved items
            // This would call InventoryFacet functions
        }
        
        // Update delivery status if applicable
        uint256 deliveryId = s.orderToDelivery[orderId];
        if (deliveryId != 0) {
            _updateDeliveryStatusFromOrder(deliveryId, newStatus);
        }
    }
    
    function _handleEmergencyWorkflow(uint256 orderId) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Priority assignment to best performing agent
        address bestAgent = _findBestPerformingAgent(s.orders[orderId].shopkeeper);
        if (bestAgent != address(0)) {
            s.orders[orderId].assignedDeliveryAgent = bestAgent;
            if (s.orders[orderId].status == LibAppStorage.OrderStatus.CREATED) {
                s.orders[orderId].status = LibAppStorage.OrderStatus.ASSIGNED;
            }
        }
        
        // Reduce maximum delivery time
        s.orders[orderId].scheduledDelivery = block.timestamp + (s.maxDeliveryTime / 2);
    }
    
    function _findAvailableDeliveryAgent(address shopkeeper) internal view returns (address) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Find agent assigned to this shopkeeper with lowest current workload
        address bestAgent = address(0);
        uint256 lowestWorkload = type(uint256).max;
        
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address agent = s.allDeliveryAgents[i];
            if (s.agentToShopkeeper[agent] == shopkeeper) {
                uint256 workload = s.agentDeliveries[agent].length;
                if (workload < lowestWorkload) {
                    lowestWorkload = workload;
                    bestAgent = agent;
                }
            }
        }
        
        return bestAgent;
    }
    
    function _findBestPerformingAgent(address shopkeeper) internal view returns (address) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        address bestAgent = address(0);
        uint256 bestSuccessRate = 0;
        
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address agent = s.allDeliveryAgents[i];
            if (s.agentToShopkeeper[agent] == shopkeeper) {
                LibAppStorage.DeliveryMetrics memory metrics = s.agentMetrics[agent];
                if (metrics.totalDeliveries > 0) {
                    uint256 successRate = (metrics.successfulDeliveries * 100) / metrics.totalDeliveries;
                    if (successRate > bestSuccessRate) {
                        bestSuccessRate = successRate;
                        bestAgent = agent;
                    }
                }
            }
        }
        
        return bestAgent != address(0) ? bestAgent : _findAvailableDeliveryAgent(shopkeeper);
    }
    
    function _escalateDispute(uint256 orderId, string memory reason) internal {
        // Additional escalation logic for critical disputes
        emit AutomationTriggered(orderId, "dispute_escalation", block.timestamp);
    }
    
    function _createNewDeliveryForReassignment(uint256 orderId) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 newDeliveryId = ++s.nextDeliveryId;
        LibAppStorage.Order memory order = s.orders[orderId];
        
        s.deliveries[newDeliveryId] = LibAppStorage.Delivery({
            deliveryId: newDeliveryId,
            orderId: orderId,
            deliveryAgent: order.assignedDeliveryAgent,
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
        
        s.orderToDelivery[orderId] = newDeliveryId;
        s.agentDeliveries[order.assignedDeliveryAgent].push(newDeliveryId);
    }
    
    function _updateDeliveryStatusFromOrder(uint256 deliveryId, LibAppStorage.OrderStatus orderStatus) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        if (orderStatus == LibAppStorage.OrderStatus.IN_TRANSIT) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.OUT_FOR_DELIVERY;
        } else if (orderStatus == LibAppStorage.OrderStatus.DELIVERED) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.DELIVERED;
        } else if (orderStatus == LibAppStorage.OrderStatus.COMPLETED) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.CONFIRMED;
        } else if (orderStatus == LibAppStorage.OrderStatus.CANCELLED) {
            s.deliveries[deliveryId].status = LibAppStorage.DeliveryStatus.CANCELLED;
        }
    }
    
    function _requiresAttention(LibAppStorage.Order memory order, uint256 currentTime) internal pure returns (bool) {
        uint256 timeElapsed = currentTime - order.createdTime;
        
        if (order.status == LibAppStorage.OrderStatus.CREATED && timeElapsed > 7200) { // 2 hours
            return true;
        }
        
        if (order.status == LibAppStorage.OrderStatus.ASSIGNED && timeElapsed > 14400) { // 4 hours
            return true;
        }
        
        if (order.status == LibAppStorage.OrderStatus.DISPUTED) {
            return true;
        }
        
        return false;
    }
    
    function _getAttentionReason(LibAppStorage.Order memory order, uint256 currentTime) internal pure returns (string memory) {
        uint256 timeElapsed = currentTime - order.createdTime;
        
        if (order.status == LibAppStorage.OrderStatus.CREATED && timeElapsed > 7200) {
            return "Order pending assignment for over 2 hours";
        }
        
        if (order.status == LibAppStorage.OrderStatus.ASSIGNED && timeElapsed > 14400) {
            return "Order assigned but no progress for over 4 hours";
        }
        
        if (order.status == LibAppStorage.OrderStatus.DISPUTED) {
            return "Order under dispute resolution";
        }
        
        return "Unknown attention reason";
    }
}
