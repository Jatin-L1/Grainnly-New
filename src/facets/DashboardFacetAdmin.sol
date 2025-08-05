// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";

/**
 * @title Dashboard Admin Facet
 * @dev Admin dashboard and management functions
 */
contract DashboardFacetAdmin {
    
    function getAdminDashboard() external view returns (LibAppStorage.DashboardData memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 activeConsumers = 0;
        uint256 activeShopkeepers = 0;
        uint256 activeAgents = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            if (s.consumers[s.allAadhaars[i]].isActive) {
                activeConsumers++;
            }
        }
        
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            if (s.shopkeepers[s.allShopkeepers[i]].isActive) {
                activeShopkeepers++;
            }
        }
        
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            if (s.deliveryAgents[s.allDeliveryAgents[i]].isActive) {
                activeAgents++;
            }
        }
        
        return LibAppStorage.DashboardData({
            totalConsumers: s.allAadhaars.length,
            totalShopkeepers: s.allShopkeepers.length,
            totalDeliveryAgents: s.allDeliveryAgents.length,
            totalTokensIssued: s.totalTokensIssued,
            totalTokensClaimed: s.totalTokensClaimed,
            totalTokensExpired: s.totalTokensExpired,
            pendingTokens: s.totalTokensIssued >= (s.totalTokensClaimed + s.totalTokensExpired) 
                ? s.totalTokensIssued - s.totalTokensClaimed - s.totalTokensExpired 
                : 0,
            currentMonth: getCurrentMonth(),
            currentYear: getCurrentYear(),
            lastUpdateTime: block.timestamp
        });
    }
    
    function getShopkeeperDashboard(address shopkeeper) external view returns (
        address shopkeeperAddress,
        uint256 assignedConsumers,
        uint256 activeConsumers,
        uint256 monthlyTokensIssued,
        uint256 totalTokensIssued,
        uint256 totalDeliveries,
        bool isActive,
        uint256 registrationTime
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        assignedConsumers = 0;
        activeConsumers = 0;
        monthlyTokensIssued = 0;
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].assignedShopkeeper == shopkeeper) {
                assignedConsumers++;
                if (s.consumers[aadhaar].isActive) {
                    activeConsumers++;
                }
                if (s.monthlyIssuance[aadhaar][currentMonth][currentYear]) {
                    monthlyTokensIssued++;
                }
            }
        }
        
        shopkeeperAddress = shopkeeper;
        totalTokensIssued = s.shopkeepers[shopkeeper].totalTokensIssued;
        totalDeliveries = s.shopkeepers[shopkeeper].totalDeliveries;
        isActive = s.shopkeepers[shopkeeper].isActive;
        registrationTime = s.shopkeepers[shopkeeper].registrationTime;
    }
    
    function getDeliveryAgentDashboard(address agent) external view returns (
        address agentAddress,
        string memory agentName,
        string memory mobile,
        uint256 registrationTime,
        address assignedShopkeeper,
        uint256 totalDeliveries,
        bool isActive
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents[agent].agentAddress != address(0), "Invalid agent");
        
        agentAddress = agent;
        agentName = s.deliveryAgents[agent].name;
        mobile = s.deliveryAgents[agent].mobile;
        registrationTime = s.deliveryAgents[agent].registrationTime;
        assignedShopkeeper = s.deliveryAgents[agent].assignedShopkeeper;
        totalDeliveries = s.deliveryAgents[agent].totalDeliveries;
        isActive = s.deliveryAgents[agent].isActive;
    }
    
    function getActivityLogsForAI(uint256 limit) external view returns (LibAppStorage.ActivityLog[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 totalLogs = s.activityLogs.length;
        uint256 returnCount = limit > totalLogs ? totalLogs : limit;
        
        LibAppStorage.ActivityLog[] memory logs = new LibAppStorage.ActivityLog[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            if (totalLogs > i) {
                uint256 logIndex = totalLogs - i - 1; // Get most recent first
                logs[i] = s.activityLogs[logIndex];
            }
        }
        
        return logs;
    }
    
    function getRecentActivityLogs(uint256 hoursBack) external view returns (LibAppStorage.ActivityLog[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 timeThreshold = block.timestamp - (hoursBack * 3600);
        
        uint256 count = 0;
        for (uint256 i = 0; i < s.activityLogs.length; i++) {
            if (s.activityLogs[i].timestamp >= timeThreshold) {
                count++;
            }
        }
        
        LibAppStorage.ActivityLog[] memory recentLogs = new LibAppStorage.ActivityLog[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.activityLogs.length; i++) {
            if (s.activityLogs[i].timestamp >= timeThreshold) {
                recentLogs[index] = s.activityLogs[i];
                index++;
            }
        }
        
        return recentLogs;
    }
    
    function getActivityLogsByActor(address actor, uint256 limit) external view returns (LibAppStorage.ActivityLog[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 count = 0;
        for (uint256 i = 0; i < s.activityLogs.length && count < limit; i++) {
            if (s.activityLogs[i].actor == actor) {
                count++;
            }
        }
        
        LibAppStorage.ActivityLog[] memory actorLogs = new LibAppStorage.ActivityLog[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.activityLogs.length && index < count; i++) {
            if (s.activityLogs[i].actor == actor) {
                actorLogs[index] = s.activityLogs[i];
                index++;
            }
        }
        
        return actorLogs;
    }
    
    // ============ UTILITY FUNCTIONS ============
    function getCurrentMonth() public view returns (uint256) {
        return ((block.timestamp - 1704067200) / (30 days) % 12) + 1;
    }
    
    function getCurrentYear() public view returns (uint256) {
        return 2024 + ((block.timestamp - 1704067200) / (30 days) / 12);
    }
    
    function _calculateShopkeeperRating(address shopkeeper) internal view returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        if (s.shopkeepers[shopkeeper].totalTokensIssued == 0) return 50; // Default rating
        
        uint256 efficiency = (s.shopkeepers[shopkeeper].totalTokensIssued * 100) / 
                           (s.shopkeepers[shopkeeper].totalTokensIssued + 1); // Simplified
        
        return efficiency > 100 ? 100 : efficiency;
    }
}
