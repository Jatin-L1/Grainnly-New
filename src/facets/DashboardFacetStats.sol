// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";

/**
 * @title Dashboard Statistics Facet
 * @dev Statistics, analytics and reporting functions
 */
contract DashboardFacetStats {
    
    function getAreaWiseStats() external view returns (
        string[] memory areas,
        uint256[] memory consumerCounts,
        uint256[] memory activeShopkeepers,
        uint256[] memory tokenDistributed
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Get unique areas
        string[] memory tempAreas = new string[](s.allShopkeepers.length);
        uint256 areaCount = 0;
        
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            string memory area = s.shopkeepers[s.allShopkeepers[i]].area;
            bool found = false;
            for (uint256 j = 0; j < areaCount; j++) {
                if (keccak256(bytes(tempAreas[j])) == keccak256(bytes(area))) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                tempAreas[areaCount] = area;
                areaCount++;
            }
        }
        
        areas = new string[](areaCount);
        consumerCounts = new uint256[](areaCount);
        activeShopkeepers = new uint256[](areaCount);
        tokenDistributed = new uint256[](areaCount);
        
        for (uint256 i = 0; i < areaCount; i++) {
            areas[i] = tempAreas[i];
            
            // Count consumers and shopkeepers in this area
            for (uint256 j = 0; j < s.allShopkeepers.length; j++) {
                if (keccak256(bytes(s.shopkeepers[s.allShopkeepers[j]].area)) == keccak256(bytes(areas[i]))) {
                    if (s.shopkeepers[s.allShopkeepers[j]].isActive) {
                        activeShopkeepers[i]++;
                    }
                    
                    // Count consumers assigned to this shopkeeper
                    for (uint256 k = 0; k < s.allAadhaars.length; k++) {
                        if (s.consumers[s.allAadhaars[k]].assignedShopkeeper == s.allShopkeepers[j]) {
                            consumerCounts[i]++;
                            tokenDistributed[i] += s.consumers[s.allAadhaars[k]].totalTokensReceived;
                        }
                    }
                }
            }
        }
    }
    
    function getConsumerDistributionHistory(uint256 aadhaar, uint256 months) external view returns (
        uint256[] memory monthsArray,
        uint256[] memory yearsArray,
        bool[] memory received,
        uint256[] memory tokenCounts
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        
        monthsArray = new uint256[](months);
        yearsArray = new uint256[](months);
        received = new bool[](months);
        tokenCounts = new uint256[](months);
        
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        
        for (uint256 i = 0; i < months; i++) {
            if (currentMonth > i) {
                monthsArray[i] = currentMonth - i;
                yearsArray[i] = currentYear;
            } else {
                monthsArray[i] = 12 + currentMonth - i;
                yearsArray[i] = currentYear - 1;
            }
            
            received[i] = s.monthlyIssuance[aadhaar][monthsArray[i]][yearsArray[i]];
            // For now, assume 1 token per month (could be enhanced)
            tokenCounts[i] = received[i] ? 1 : 0;
        }
    }
    
    function getShopkeeperDistributionSummary(address shopkeeper, uint256 month, uint256 year) external view returns (
        uint256 assignedConsumers,
        uint256 tokensIssued,
        uint256 tokensClaimed,
        uint256 pendingTokens
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].assignedShopkeeper == shopkeeper) {
                assignedConsumers++;
                if (s.monthlyIssuance[aadhaar][month][year]) {
                    tokensIssued++;
                }
                tokensClaimed += s.consumers[aadhaar].totalTokensClaimed;
            }
        }
        
        pendingTokens = tokensIssued - tokensClaimed;
    }
    
    function getSystemStatus() external view returns (
        bool systemPaused,
        uint256 totalTokensIssued,
        uint256 totalTokensClaimed,
        uint256 totalTokensExpired
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return (
            s.paused,
            s.totalTokensIssued,
            s.totalTokensClaimed,
            s.totalTokensExpired
        );
    }
    
    function getTotalConsumers() external view returns (uint256) {
        return LibAppStorage.appStorage().allAadhaars.length;
    }
    
    function getTotalShopkeepers() external view returns (uint256) {
        return LibAppStorage.appStorage().allShopkeepers.length;
    }
    
    function getTotalDeliveryAgents() external view returns (uint256) {
        return LibAppStorage.appStorage().allDeliveryAgents.length;
    }
    
    function getRationAmounts() external view returns (string[] memory categories, uint256[] memory amounts) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        categories = new string[](3);
        amounts = new uint256[](3);
        
        categories[0] = "BPL";
        categories[1] = "AAY";
        categories[2] = "APL";
        
        amounts[0] = s.rationAmounts["BPL"];
        amounts[1] = s.rationAmounts["AAY"];
        amounts[2] = s.rationAmounts["APL"];
    }
    
    function isValidCategory(string memory category) external view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.rationAmounts[category] > 0;
    }
    
    function getWalletByAadhaar(uint256 aadhaar) external view returns (address) {
        return LibAppStorage.appStorage().aadhaarToWallet[aadhaar];
    }
    
    function getAadhaarByWallet(address wallet) external view returns (uint256) {
        return LibAppStorage.appStorage().walletToAadhaar[wallet];
    }
    
    // ============ UTILITY FUNCTIONS ============
    function getCurrentMonth() public view returns (uint256) {
        return ((block.timestamp - 1704067200) / (30 days) % 12) + 1;
    }
    
    function getCurrentYear() public view returns (uint256) {
        return 2024 + ((block.timestamp - 1704067200) / (30 days) / 12);
    }
}
