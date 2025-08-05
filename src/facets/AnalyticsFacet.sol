// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract AnalyticsFacet {
    
    // ============ EVENTS ============
    event AnalyticsUpdated(string metricType, uint256 value, uint256 timestamp);
    event PerformanceAlert(address indexed user, string alertType, uint256 value);
    event SystemHealthCheck(uint256 totalUsers, uint256 activeDeliveries, uint256 successRate);
    
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
    
    // ============ SYSTEM ANALYTICS ============
    
    /**
     * @dev Get comprehensive system analytics
     */
    function getSystemAnalytics() external view returns (LibAppStorage.SystemAnalytics memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.systemAnalytics;
    }
    
    /**
     * @dev Update system analytics (called internally by other facets)
     */
    function updateSystemAnalytics() external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Calculate real-time metrics - prevent underflow
        uint256 totalOrders = s.nextOrderId > 0 ? s.nextOrderId - 1 : 0;
        uint256 totalDeliveries = s.nextDeliveryId > 0 ? s.nextDeliveryId - 1 : 0;
        uint256 activeDeliveries = 0;
        uint256 successfulDeliveries = 0;
        uint256 totalDeliveryTime = 0;
        uint256 completedDeliveries = 0;
        
        // Count active deliveries and calculate success metrics
        for (uint256 i = 1; i < s.nextDeliveryId; i++) {
            LibAppStorage.Delivery memory delivery = s.deliveries[i];
            if (delivery.deliveryId != 0) {
                if (delivery.status == LibAppStorage.DeliveryStatus.CONFIRMED) {
                    successfulDeliveries++;
                    if (delivery.deliveredTime > delivery.assignedTime) {
                        totalDeliveryTime += (delivery.deliveredTime - delivery.assignedTime);
                        completedDeliveries++;
                    }
                } else if (
                    delivery.status != LibAppStorage.DeliveryStatus.FAILED &&
                    delivery.status != LibAppStorage.DeliveryStatus.CANCELLED
                ) {
                    activeDeliveries++;
                }
            }
        }
        
        // Calculate average delivery time
        uint256 averageDeliveryTime = 0;
        if (completedDeliveries > 0) {
            averageDeliveryTime = totalDeliveryTime / completedDeliveries;
        }
        
        // Calculate success rate
        uint256 successRate = 0;
        if (totalDeliveries > 0) {
            successRate = (successfulDeliveries * 100) / totalDeliveries;
        }
        
        // Count pending orders
        uint256 pendingOrders = 0;
        for (uint256 i = 1; i <= s.nextOrderId; i++) {
            LibAppStorage.Order memory order = s.orders[i];
            if (order.orderId != 0 && 
                order.status != LibAppStorage.OrderStatus.COMPLETED &&
                order.status != LibAppStorage.OrderStatus.CANCELLED) {
                pendingOrders++;
            }
        }
        
        // Update analytics
        s.systemAnalytics = LibAppStorage.SystemAnalytics({
            totalOrders: totalOrders,
            totalDeliveries: totalDeliveries,
            successRate: successRate,
            averageDeliveryTime: averageDeliveryTime,
            activeDeliveries: activeDeliveries,
            pendingOrders: pendingOrders,
            totalRevenue: s.systemAnalytics.totalRevenue, // Keep existing revenue
            lastUpdated: block.timestamp
        });
        
        emit AnalyticsUpdated("system_update", totalOrders, block.timestamp);
        emit SystemHealthCheck(
            s.allAadhaars.length + s.allShopkeepers.length + s.allDeliveryAgents.length,
            activeDeliveries,
            successRate
        );
    }
    
    /**
     * @dev Get delivery performance metrics for a specific agent
     */
    function getAgentPerformanceMetrics(address agent) external view returns (
        LibAppStorage.DeliveryMetrics memory metrics,
        uint256 rank,
        string memory performanceGrade
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        metrics = s.agentMetrics[agent];
        
        // Calculate rank among all agents
        rank = 1;
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address otherAgent = s.allDeliveryAgents[i];
            if (otherAgent != agent) {
                LibAppStorage.DeliveryMetrics memory otherMetrics = s.agentMetrics[otherAgent];
                if (otherMetrics.successfulDeliveries > metrics.successfulDeliveries) {
                    rank++;
                }
            }
        }
        
        // Calculate performance grade
        performanceGrade = _calculatePerformanceGrade(metrics);
        
        return (metrics, rank, performanceGrade);
    }
    
    /**
     * @dev Get shopkeeper performance metrics
     */
    function getShopkeeperPerformanceMetrics(address shopkeeper) external view returns (
        uint256 totalOrders,
        uint256 completedOrders,
        uint256 averageProcessingTime,
        uint256 customerSatisfactionScore,
        string memory performanceGrade
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256[] memory orders = s.shopkeeperOrders[shopkeeper];
        totalOrders = orders.length;
        completedOrders = 0;
        uint256 totalProcessingTime = 0;
        
        for (uint256 i = 0; i < orders.length; i++) {
            LibAppStorage.Order memory order = s.orders[orders[i]];
            if (order.status == LibAppStorage.OrderStatus.COMPLETED) {
                completedOrders++;
                if (order.completedTime > order.createdTime) {
                    totalProcessingTime += (order.completedTime - order.createdTime);
                }
            }
        }
        
        averageProcessingTime = completedOrders > 0 ? totalProcessingTime / completedOrders : 0;
        
        // Calculate satisfaction score (simplified - based on completion rate)
        customerSatisfactionScore = totalOrders > 0 ? (completedOrders * 100) / totalOrders : 0;
        
        // Performance grade based on completion rate
        if (customerSatisfactionScore >= 95) {
            performanceGrade = "A+";
        } else if (customerSatisfactionScore >= 90) {
            performanceGrade = "A";
        } else if (customerSatisfactionScore >= 80) {
            performanceGrade = "B";
        } else if (customerSatisfactionScore >= 70) {
            performanceGrade = "C";
        } else {
            performanceGrade = "D";
        }
        
        return (totalOrders, completedOrders, averageProcessingTime, customerSatisfactionScore, performanceGrade);
    }
    
    /**
     * @dev Get system-wide performance dashboard data
     */
    function getPerformanceDashboard() external view returns (
        uint256 totalActiveUsers,
        uint256 dailyOrders,
        uint256 weeklyOrders,
        uint256 monthlyOrders,
        uint256 systemUptimePercentage,
        uint256 averageResponseTime,
        string memory systemHealth
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        totalActiveUsers = s.allAadhaars.length + s.allShopkeepers.length + s.allDeliveryAgents.length;
        
        // Calculate time-based order counts
        uint256 currentTime = block.timestamp;
        uint256 dayAgo = currentTime - 86400; // 24 hours
        uint256 weekAgo = currentTime - 604800; // 7 days
        uint256 monthAgo = currentTime - 2629746; // 30.44 days
        
        dailyOrders = _getOrdersInTimeRange(dayAgo, currentTime);
        weeklyOrders = _getOrdersInTimeRange(weekAgo, currentTime);
        monthlyOrders = _getOrdersInTimeRange(monthAgo, currentTime);
        
        // System health metrics
        systemUptimePercentage = 99; // Simplified - would integrate with monitoring service
        averageResponseTime = s.systemAnalytics.averageDeliveryTime;
        
        // Determine system health
        if (s.systemAnalytics.successRate >= 95 && s.systemAnalytics.activeDeliveries <= s.systemAnalytics.totalOrders * 10 / 100) {
            systemHealth = "Excellent";
        } else if (s.systemAnalytics.successRate >= 85) {
            systemHealth = "Good";
        } else if (s.systemAnalytics.successRate >= 70) {
            systemHealth = "Fair";
        } else {
            systemHealth = "Poor";
        }
        
        return (
            totalActiveUsers,
            dailyOrders,
            weeklyOrders,
            monthlyOrders,
            systemUptimePercentage,
            averageResponseTime,
            systemHealth
        );
    }
    
    /**
     * @dev Get top performing delivery agents
     */
    function getTopPerformingAgents(uint256 limit) external view returns (
        address[] memory agents,
        uint256[] memory successfulDeliveries,
        uint256[] memory ratings
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 agentCount = s.allDeliveryAgents.length;
        if (limit > agentCount) limit = agentCount;
        
        // Create arrays for sorting
        address[] memory allAgents = new address[](agentCount);
        uint256[] memory allDeliveries = new uint256[](agentCount);
        
        for (uint256 i = 0; i < agentCount; i++) {
            allAgents[i] = s.allDeliveryAgents[i];
            allDeliveries[i] = s.agentMetrics[s.allDeliveryAgents[i]].successfulDeliveries;
        }
        
        // Simple bubble sort (for small datasets)
        for (uint256 i = 0; i < agentCount - 1; i++) {
            for (uint256 j = 0; j < agentCount - i - 1; j++) {
                if (allDeliveries[j] < allDeliveries[j + 1]) {
                    // Swap deliveries
                    uint256 tempDeliveries = allDeliveries[j];
                    allDeliveries[j] = allDeliveries[j + 1];
                    allDeliveries[j + 1] = tempDeliveries;
                    
                    // Swap agents
                    address tempAgent = allAgents[j];
                    allAgents[j] = allAgents[j + 1];
                    allAgents[j + 1] = tempAgent;
                }
            }
        }
        
        // Return top performers
        agents = new address[](limit);
        successfulDeliveries = new uint256[](limit);
        ratings = new uint256[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            agents[i] = allAgents[i];
            successfulDeliveries[i] = allDeliveries[i];
            ratings[i] = s.agentMetrics[allAgents[i]].rating;
        }
        
        return (agents, successfulDeliveries, ratings);
    }
    
    /**
     * @dev Generate performance alerts for underperforming users
     */
    function generatePerformanceAlerts() external onlyAdmin returns (uint256 alertCount) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        alertCount = 0;
        
        // Check delivery agents
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address agent = s.allDeliveryAgents[i];
            LibAppStorage.DeliveryMetrics memory metrics = s.agentMetrics[agent];
            
            // Alert if success rate below 80% and has at least 5 deliveries
            if (metrics.totalDeliveries >= 5) {
                uint256 successRate = (metrics.successfulDeliveries * 100) / metrics.totalDeliveries;
                if (successRate < 80) {
                    emit PerformanceAlert(agent, "Low Success Rate", successRate);
                    alertCount++;
                }
            }
            
            // Alert if average delivery time exceeds threshold (4 hours = 14400 seconds)
            if (metrics.averageDeliveryTime > 14400) {
                emit PerformanceAlert(agent, "Slow Delivery", metrics.averageDeliveryTime);
                alertCount++;
            }
        }
        
        // Check shopkeepers
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            address shopkeeper = s.allShopkeepers[i];
            uint256[] memory orders = s.shopkeeperOrders[shopkeeper];
            
            if (orders.length >= 5) {
                uint256 completedOrders = 0;
                for (uint256 j = 0; j < orders.length; j++) {
                    if (s.orders[orders[j]].status == LibAppStorage.OrderStatus.COMPLETED) {
                        completedOrders++;
                    }
                }
                
                uint256 completionRate = (completedOrders * 100) / orders.length;
                if (completionRate < 85) {
                    emit PerformanceAlert(shopkeeper, "Low Completion Rate", completionRate);
                    alertCount++;
                }
            }
        }
        
        return alertCount;
    }
    
    /**
     * @dev Get detailed analytics for a specific time period
     */
    function getTimeBasedAnalytics(uint256 startTime, uint256 endTime) external view returns (
        uint256 ordersCreated,
        uint256 deliveriesCompleted,
        uint256 averageDeliveryTime,
        uint256 totalRevenue,
        uint256 uniqueCustomers
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        ordersCreated = 0;
        deliveriesCompleted = 0;
        totalRevenue = 0;
        uint256 totalDeliveryTime = 0;
        
        // Use dynamic array to track unique customers
        uint256[] memory uniqueAadhaarsArray = new uint256[](1000); // Max 1000 unique customers in time range
        uniqueCustomers = 0;
        
        // Analyze orders in time range
        for (uint256 i = 1; i <= s.nextOrderId; i++) {
            LibAppStorage.Order memory order = s.orders[i];
            if (order.createdTime >= startTime && order.createdTime <= endTime) {
                ordersCreated++;
                totalRevenue += order.totalAmount;
                
                // Count unique customers
                bool isUnique = true;
                for (uint256 j = 0; j < uniqueCustomers; j++) {
                    if (uniqueAadhaarsArray[j] == order.aadhaar) {
                        isUnique = false;
                        break;
                    }
                }
                if (isUnique && uniqueCustomers < 1000) {
                    uniqueAadhaarsArray[uniqueCustomers] = order.aadhaar;
                    uniqueCustomers++;
                }
                
                // Check if delivery was completed in time range
                uint256 deliveryId = s.orderToDelivery[order.orderId];
                if (deliveryId != 0) {
                    LibAppStorage.Delivery memory delivery = s.deliveries[deliveryId];
                    if (delivery.deliveredTime >= startTime && delivery.deliveredTime <= endTime &&
                        delivery.status == LibAppStorage.DeliveryStatus.CONFIRMED) {
                        deliveriesCompleted++;
                        totalDeliveryTime += (delivery.deliveredTime - delivery.assignedTime);
                    }
                }
            }
        }
        
        averageDeliveryTime = deliveriesCompleted > 0 ? totalDeliveryTime / deliveriesCompleted : 0;
        
        return (ordersCreated, deliveriesCompleted, averageDeliveryTime, totalRevenue, uniqueCustomers);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _calculatePerformanceGrade(LibAppStorage.DeliveryMetrics memory metrics) 
        internal pure returns (string memory) {
        if (metrics.totalDeliveries == 0) return "N/A";
        
        uint256 successRate = (metrics.successfulDeliveries * 100) / metrics.totalDeliveries;
        
        if (successRate >= 95 && metrics.averageDeliveryTime <= 7200) { // 2 hours
            return "A+";
        } else if (successRate >= 90 && metrics.averageDeliveryTime <= 10800) { // 3 hours
            return "A";
        } else if (successRate >= 85 && metrics.averageDeliveryTime <= 14400) { // 4 hours
            return "B";
        } else if (successRate >= 75) {
            return "C";
        } else {
            return "D";
        }
    }
    
    function _getOrdersInTimeRange(uint256 startTime, uint256 endTime) internal view returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 count = 0;
        for (uint256 i = 1; i <= s.nextOrderId; i++) {
            LibAppStorage.Order memory order = s.orders[i];
            if (order.createdTime >= startTime && order.createdTime <= endTime) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Export analytics data (returns JSON-like string for frontend)
     */
    function exportAnalyticsData() external view onlyAdmin returns (string memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        return string(abi.encodePacked(
            '{"systemAnalytics":{"totalOrders":', _uint2str(s.systemAnalytics.totalOrders),
            ',"totalDeliveries":', _uint2str(s.systemAnalytics.totalDeliveries),
            ',"successRate":', _uint2str(s.systemAnalytics.successRate),
            ',"activeDeliveries":', _uint2str(s.systemAnalytics.activeDeliveries),
            ',"pendingOrders":', _uint2str(s.systemAnalytics.pendingOrders),
            ',"lastUpdated":', _uint2str(s.systemAnalytics.lastUpdated), '}}'
        ));
    }
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
