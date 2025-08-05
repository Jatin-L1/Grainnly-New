// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../interfaces/IDCVToken.sol";

/**
 * @title Core Dashboard Facet
 * @dev Essential dashboard functions only
 */
contract DashboardFacetCore {
    
    modifier validAadhaar(uint256 aadhaar) {
        require(aadhaar >= 100000000000 && aadhaar <= 999999999999, "Invalid Aadhaar");
        _;
    }
    
    // ============ MAIN DASHBOARD FUNCTIONS ============
    function getDashboardData() external view returns (LibAppStorage.DashboardData memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
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
    
    function getConsumerDashboard(uint256 aadhaar) external view validAadhaar(aadhaar) returns (LibAppStorage.ConsumerDashboard memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        
        LibAppStorage.ConsumerStruct memory consumer = s.consumers[aadhaar];
        uint256[] memory activeTokens = new uint256[](0);
        if (s.dcvTokenAddress != address(0)) {
            activeTokens = IDCVToken(s.dcvTokenAddress).getUnclaimedTokensByAadhaar(aadhaar);
        }
        
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        
        return LibAppStorage.ConsumerDashboard({
            aadhaar: aadhaar,
            name: consumer.name,
            category: consumer.category,
            assignedShopkeeperName: consumer.assignedShopkeeper != address(0) 
                ? s.shopkeepers[consumer.assignedShopkeeper].name 
                : "Not Assigned",
            totalTokensReceived: consumer.totalTokensReceived,
            totalTokensClaimed: consumer.totalTokensClaimed,
            activeTokensCount: activeTokens.length,
            hasCurrentMonthToken: s.monthlyIssuance[aadhaar][currentMonth][currentYear],
            monthlyRationAmount: s.rationAmounts[consumer.category],
            lastTokenIssuedTime: consumer.lastTokenIssuedTime,
            isActive: consumer.isActive
        });
    }
    
    // ============ CONSUMER FUNCTIONS ============
    function getConsumerByAadhaar(uint256 aadhaar) external view validAadhaar(aadhaar) returns (LibAppStorage.ConsumerStruct memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        return s.consumers[aadhaar];
    }
    
    function getConsumersByCategory(string memory category) external view returns (LibAppStorage.ConsumerStruct[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 count = 0;
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            if (keccak256(bytes(s.consumers[s.allAadhaars[i]].category)) == keccak256(bytes(category))) {
                count++;
            }
        }
        
        LibAppStorage.ConsumerStruct[] memory consumers = new LibAppStorage.ConsumerStruct[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (keccak256(bytes(s.consumers[aadhaar].category)) == keccak256(bytes(category))) {
                consumers[index] = s.consumers[aadhaar];
                index++;
            }
        }
        
        return consumers;
    }
    
    function getConsumersByShopkeeper(address shopkeeper) external view returns (LibAppStorage.ConsumerStruct[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        uint256 count = 0;
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            if (s.consumers[s.allAadhaars[i]].assignedShopkeeper == shopkeeper) {
                count++;
            }
        }
        
        LibAppStorage.ConsumerStruct[] memory consumers = new LibAppStorage.ConsumerStruct[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].assignedShopkeeper == shopkeeper) {
                consumers[index] = s.consumers[aadhaar];
                index++;
            }
        }
        
        return consumers;
    }
    
    function hasConsumerReceivedMonthlyToken(uint256 aadhaar) external view validAadhaar(aadhaar) returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        return s.monthlyIssuance[aadhaar][currentMonth][currentYear];
    }
    
    function getConsumersWithoutMonthlyTokens() external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        
        uint256 count = 0;
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].isActive && !s.monthlyIssuance[aadhaar][currentMonth][currentYear]) {
                count++;
            }
        }
        
        uint256[] memory pendingAadhaars = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].isActive && !s.monthlyIssuance[aadhaar][currentMonth][currentYear]) {
                pendingAadhaars[index] = aadhaar;
                index++;
            }
        }
        
        return pendingAadhaars;
    }
    
    function getSystemHealthReport() external view returns (
        uint256 totalRegisteredConsumers,
        uint256 activeConsumers,
        uint256 inactiveConsumers,
        uint256 consumersWithCurrentMonthToken,
        uint256 consumersWithoutCurrentMonthToken,
        uint256 totalShopkeepers,
        uint256 totalDeliveryAgents,
        uint256 systemEfficiencyScore
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        totalRegisteredConsumers = s.allAadhaars.length;
        activeConsumers = 0;
        inactiveConsumers = 0;
        consumersWithCurrentMonthToken = 0;
        consumersWithoutCurrentMonthToken = 0;
        
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].isActive) {
                activeConsumers++;
                if (s.monthlyIssuance[aadhaar][currentMonth][currentYear]) {
                    consumersWithCurrentMonthToken++;
                } else {
                    consumersWithoutCurrentMonthToken++;
                }
            } else {
                inactiveConsumers++;
            }
        }
        
        totalShopkeepers = s.allShopkeepers.length;
        totalDeliveryAgents = s.allDeliveryAgents.length;
        
        if (activeConsumers > 0) {
            systemEfficiencyScore = (consumersWithCurrentMonthToken * 100) / activeConsumers;
        } else {
            systemEfficiencyScore = 0;
        }
    }
    
    function getCategoryWiseStats() external view returns (string[] memory categories, uint256[] memory consumerCounts, uint256[] memory rationAmounts) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        categories = new string[](3);
        consumerCounts = new uint256[](3);
        rationAmounts = new uint256[](3);
        
        categories[0] = "BPL";
        categories[1] = "AAY"; 
        categories[2] = "APL";
        
        rationAmounts[0] = s.rationAmounts["BPL"];
        rationAmounts[1] = s.rationAmounts["AAY"];
        rationAmounts[2] = s.rationAmounts["APL"];
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            string memory category = s.consumers[s.allAadhaars[i]].category;
            
            if (keccak256(bytes(category)) == keccak256(bytes("BPL"))) {
                consumerCounts[0]++;
            } else if (keccak256(bytes(category)) == keccak256(bytes("AAY"))) {
                consumerCounts[1]++;
            } else if (keccak256(bytes(category)) == keccak256(bytes("APL"))) {
                consumerCounts[2]++;
            }
        }
    }
    
    function getShopkeeperInfo(address shopkeeper) external view returns (LibAppStorage.ShopkeeperStruct memory) {
        return LibAppStorage.appStorage().shopkeepers[shopkeeper];
    }
    
    function getDeliveryAgentInfo(address agent) external view returns (LibAppStorage.DeliveryAgentStruct memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents[agent].agentAddress != address(0), "Agent not found");
        return s.deliveryAgents[agent];
    }
    
    // ============ SYSTEM UTILS ============
    function getCurrentMonth() public view returns (uint256) {
        // Prevent underflow in test environment
        if (block.timestamp < 1704067200) {
            return 1; // Default to January for test environment
        }
        return ((block.timestamp - 1704067200) / (30 days) % 12) + 1;
    }
    
    function getCurrentYear() public view returns (uint256) {
        // Prevent underflow in test environment
        if (block.timestamp < 1704067200) {
            return 2025; // Default to 2025 for test environment
        }
        return 2024 + ((block.timestamp - 1704067200) / (30 days) / 12);
    }
}
