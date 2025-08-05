// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";

/**
 * @title Dashboard Search Facet
 * @dev Search and filtering functions for the dashboard
 */
contract DashboardFacetSearch {
    
    modifier validAadhaar(uint256 aadhaar) {
        require(aadhaar >= 100000000000 && aadhaar <= 999999999999, "Invalid Aadhaar");
        _;
    }
    
    function getConsumerByMobile(string memory mobile) external view returns (LibAppStorage.ConsumerStruct memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 aadhaar = s.mobileToAadhaar[mobile];
        if (aadhaar != 0) {
            return s.consumers[aadhaar];
        }
        return LibAppStorage.ConsumerStruct(0, "", "", "", 0, address(0), 0, 0, 0, false);
    }
    
    function searchConsumersByName(string memory nameQuery) external view returns (LibAppStorage.ConsumerStruct[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 matchCount = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            string memory consumerName = s.consumers[aadhaar].name;
            if (_contains(consumerName, nameQuery)) {
                matchCount++;
            }
        }
        
        LibAppStorage.ConsumerStruct[] memory results = new LibAppStorage.ConsumerStruct[](matchCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            string memory consumerName = s.consumers[aadhaar].name;
            if (_contains(consumerName, nameQuery)) {
                results[resultIndex] = s.consumers[aadhaar];
                resultIndex++;
            }
        }
        
        return results;
    }
    
    function getConsumersPaginated(uint256 startIndex, uint256 pageSize) external view returns (LibAppStorage.ConsumerStruct[] memory consumers, uint256 totalCount) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        totalCount = s.allAadhaars.length;
        
        if (startIndex >= totalCount) {
            return (new LibAppStorage.ConsumerStruct[](0), totalCount);
        }
        
        uint256 endIndex = startIndex + pageSize;
        if (endIndex > totalCount) {
            endIndex = totalCount;
        }
        
        uint256 resultCount = endIndex - startIndex;
        consumers = new LibAppStorage.ConsumerStruct[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            consumers[i] = s.consumers[s.allAadhaars[startIndex + i]];
        }
        
        return (consumers, totalCount);
    }
    
    function getConsumersNeedingEmergencyHelp() external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        uint256 currentMonth = getCurrentMonth();
        uint256 currentYear = getCurrentYear();
        uint256 emergencyThreshold = 2; // months without tokens
        
        uint256 count = 0;
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].isActive) {
                bool needsHelp = true;
                for (uint256 j = 0; j < emergencyThreshold; j++) {
                    uint256 checkMonth = currentMonth > j ? currentMonth - j : 12 + currentMonth - j;
                    uint256 checkYear = currentMonth > j ? currentYear : currentYear - 1;
                    if (s.monthlyIssuance[aadhaar][checkMonth][checkYear]) {
                        needsHelp = false;
                        break;
                    }
                }
                if (needsHelp) count++;
            }
        }
        
        uint256[] memory emergencyAadhaars = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].isActive) {
                bool needsHelp = true;
                for (uint256 j = 0; j < emergencyThreshold; j++) {
                    uint256 checkMonth = currentMonth > j ? currentMonth - j : 12 + currentMonth - j;
                    uint256 checkYear = currentMonth > j ? currentYear : currentYear - 1;
                    if (s.monthlyIssuance[aadhaar][checkMonth][checkYear]) {
                        needsHelp = false;
                        break;
                    }
                }
                if (needsHelp) {
                    emergencyAadhaars[index] = aadhaar;
                    index++;
                }
            }
        }
        
        return emergencyAadhaars;
    }
    
    // ============ UTILITY FUNCTIONS ============
    function getCurrentMonth() public view returns (uint256) {
        return ((block.timestamp - 1704067200) / (30 days) % 12) + 1;
    }
    
    function getCurrentYear() public view returns (uint256) {
        return 2024 + ((block.timestamp - 1704067200) / (30 days) / 12);
    }
    
    function _contains(string memory str, string memory substr) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);
        
        if (substrBytes.length > strBytes.length) return false;
        if (substrBytes.length == 0) return true;
        
        for (uint256 i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < substrBytes.length; j++) {
                if (_toLower(strBytes[i + j]) != _toLower(substrBytes[j])) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
    
    function _toLower(bytes1 char) internal pure returns (bytes1) {
        if (char >= 0x41 && char <= 0x5A) {
            return bytes1(uint8(char) + 32);
        }
        return char;
    }
}
