// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";
import "../interfaces/IDCVToken.sol";

contract TokenOpsFacet {
    
    // Events
    event TokenGenerated(uint256 indexed tokenId, uint256 indexed aadhaar, uint256 rationAmount);
    event TokenClaimed(uint256 indexed tokenId, uint256 indexed aadhaar);
    event TokenExpired(uint256 indexed tokenId, uint256 indexed aadhaar);
    event DeliveryMarked(uint256 indexed tokenId, uint256 indexed aadhaar, address shopkeeper);
    event DeliveryConfirmed(uint256 indexed tokenId, address indexed deliveryAgent);
    event BulkTokensGenerated(uint256 count, string details);
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier whenNotPaused() {
        require(!LibAppStorage.appStorage().paused, "System paused");
        _;
    }
    
    modifier onlyShopkeeper() {
        require(LibAppStorage.appStorage().shopkeepers_[msg.sender], "Not a shopkeeper");
        _;
    }
    
    modifier onlyDeliveryAgent() {
        require(LibAppStorage.appStorage().deliveryAgents_[msg.sender], "Not a delivery agent");
        _;
    }
    
    modifier validAadhaar(uint256 aadhaar) {
        require(aadhaar >= 100000000000 && aadhaar <= 999999999999, "Invalid Aadhaar");
        _;
    }
    
    // ============ TOKEN ISSUANCE ============
    function generateMonthlyTokensForAll() external onlyOwner whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        uint256 currentMonth = _getCurrentMonth();
        uint256 currentYear = _getCurrentYear();
        uint256 tokensIssued = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            
            if (!s.consumers[aadhaar].isActive) continue;
            if (s.monthlyIssuance[aadhaar][currentMonth][currentYear]) continue;
            
            LibAppStorage.ConsumerStruct storage consumer = s.consumers[aadhaar];
            uint256 rationAmount = s.rationAmounts[consumer.category];
            
            uint256 tokenId = IDCVToken(s.dcvTokenAddress).mintTokenForAadhaar(
                aadhaar,
                consumer.assignedShopkeeper,
                rationAmount,
                consumer.category
            );
            
            s.monthlyIssuance[aadhaar][currentMonth][currentYear] = true;
            consumer.totalTokensReceived++;
            consumer.lastTokenIssuedTime = block.timestamp;
            s.shopkeepers[consumer.assignedShopkeeper].totalTokensIssued++;
            s.totalTokensIssued++;
            tokensIssued++;
            
            emit TokenGenerated(tokenId, aadhaar, rationAmount);
        }
        
        _logActivity("MONTHLY_TOKENS_GENERATED", 0, 0, string(abi.encodePacked("Generated ", _toString(tokensIssued), " monthly tokens")));
    }
    
    function generateTokenForConsumer(uint256 aadhaar) external onlyOwner whenNotPaused validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        require(s.consumers[aadhaar].isActive, "Consumer not active");
        
        LibAppStorage.ConsumerStruct storage consumer = s.consumers[aadhaar];
        uint256 rationAmount = s.rationAmounts[consumer.category];
        
        uint256 tokenId = IDCVToken(s.dcvTokenAddress).mintTokenForAadhaar(
            aadhaar,
            consumer.assignedShopkeeper,
            rationAmount,
            consumer.category
        );
        
        consumer.totalTokensReceived++;
        consumer.lastTokenIssuedTime = block.timestamp;
        s.shopkeepers[consumer.assignedShopkeeper].totalTokensIssued++;
        s.totalTokensIssued++;
        
        _logActivity("INDIVIDUAL_TOKEN_GENERATED", aadhaar, tokenId, "Token generated for individual consumer");
        emit TokenGenerated(tokenId, aadhaar, rationAmount);
    }
    
    function generateTokensForCategory(string memory category) external onlyOwner whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        require(s.rationAmounts[category] > 0, "Invalid category");
        
        uint256 currentMonth = _getCurrentMonth();
        uint256 currentYear = _getCurrentYear();
        uint256 tokensIssued = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            
            if (!s.consumers[aadhaar].isActive) continue;
            if (keccak256(bytes(s.consumers[aadhaar].category)) != keccak256(bytes(category))) continue;
            if (s.monthlyIssuance[aadhaar][currentMonth][currentYear]) continue;
            
            LibAppStorage.ConsumerStruct storage consumer = s.consumers[aadhaar];
            uint256 rationAmount = s.rationAmounts[consumer.category];
            
            uint256 tokenId = IDCVToken(s.dcvTokenAddress).mintTokenForAadhaar(
                aadhaar,
                consumer.assignedShopkeeper,
                rationAmount,
                consumer.category
            );
            
            s.monthlyIssuance[aadhaar][currentMonth][currentYear] = true;
            consumer.totalTokensReceived++;
            consumer.lastTokenIssuedTime = block.timestamp;
            s.shopkeepers[consumer.assignedShopkeeper].totalTokensIssued++;
            s.totalTokensIssued++;
            tokensIssued++;
            
            emit TokenGenerated(tokenId, aadhaar, rationAmount);
        }
        
        _logActivity("CATEGORY_TOKENS_GENERATED", 0, 0, string(abi.encodePacked("Generated ", _toString(tokensIssued), " tokens for category ", category)));
    }
    
    function generateTokensForShopkeeper(address shopkeeper) external onlyOwner whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        uint256 currentMonth = _getCurrentMonth();
        uint256 currentYear = _getCurrentYear();
        uint256 tokensIssued = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            
            if (!s.consumers[aadhaar].isActive) continue;
            if (s.consumers[aadhaar].assignedShopkeeper != shopkeeper) continue;
            if (s.monthlyIssuance[aadhaar][currentMonth][currentYear]) continue;
            
            LibAppStorage.ConsumerStruct storage consumer = s.consumers[aadhaar];
            uint256 rationAmount = s.rationAmounts[consumer.category];
            
            uint256 tokenId = IDCVToken(s.dcvTokenAddress).mintTokenForAadhaar(
                aadhaar,
                consumer.assignedShopkeeper,
                rationAmount,
                consumer.category
            );
            
            s.monthlyIssuance[aadhaar][currentMonth][currentYear] = true;
            consumer.totalTokensReceived++;
            consumer.lastTokenIssuedTime = block.timestamp;
            s.shopkeepers[consumer.assignedShopkeeper].totalTokensIssued++;
            s.totalTokensIssued++;
            tokensIssued++;
            
            emit TokenGenerated(tokenId, aadhaar, rationAmount);
        }
        
        _logActivity("SHOPKEEPER_TOKENS_GENERATED", 0, 0, string(abi.encodePacked("Generated ", _toString(tokensIssued), " tokens for shopkeeper")));
    }
    
    function bulkGenerateTokens(uint256[] memory aadhaars) external onlyOwner whenNotPaused {
        require(aadhaars.length > 0 && aadhaars.length <= 100, "Invalid bulk size");
        
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        uint256 tokensIssued = 0;
        
        for (uint256 i = 0; i < aadhaars.length; i++) {
            uint256 aadhaar = aadhaars[i];
            
            if (aadhaar == 0) continue;
            if (s.consumers[aadhaar].aadhaar == 0) continue;
            if (!s.consumers[aadhaar].isActive) continue;
            
            LibAppStorage.ConsumerStruct storage consumer = s.consumers[aadhaar];
            uint256 rationAmount = s.rationAmounts[consumer.category];
            
            uint256 tokenId = IDCVToken(s.dcvTokenAddress).mintTokenForAadhaar(
                aadhaar,
                consumer.assignedShopkeeper,
                rationAmount,
                consumer.category
            );
            
            consumer.totalTokensReceived++;
            consumer.lastTokenIssuedTime = block.timestamp;
            s.shopkeepers[consumer.assignedShopkeeper].totalTokensIssued++;
            s.totalTokensIssued++;
            tokensIssued++;
            
            emit TokenGenerated(tokenId, aadhaar, rationAmount);
        }
        
        _logActivity("BULK_TOKENS_GENERATED", 0, 0, string(abi.encodePacked("Bulk generated ", _toString(tokensIssued), " tokens")));
        emit BulkTokensGenerated(tokensIssued, "Bulk generation completed");
    }
    
    // ============ TOKEN DELIVERY & CLAIMING ============
    function markRationDeliveredByAadhaar(uint256 aadhaar, uint256 tokenId) external onlyShopkeeper whenNotPaused validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        require(dcvToken.tokenExists(tokenId), "Token does not exist");
        require(!dcvToken.isTokenExpired(tokenId), "Token has expired");
        
        IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        require(tokenData.aadhaar == aadhaar, "Aadhaar mismatch");
        require(tokenData.assignedShopkeeper == msg.sender, "Not assigned shopkeeper");
        require(!tokenData.isClaimed, "Token already claimed");
        require(!s.deliveryLogs[tokenId][aadhaar], "Already marked as delivered");
        
        s.deliveryLogs[tokenId][aadhaar] = true;
        s.shopkeepers[msg.sender].totalDeliveries++;
        
        _logActivity("DELIVERY_MARKED", aadhaar, tokenId, "Delivery marked by shopkeeper");
        emit DeliveryMarked(tokenId, aadhaar, msg.sender);
    }
    
    function confirmDeliveryByAgent(uint256 tokenId) external onlyDeliveryAgent whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        require(dcvToken.tokenExists(tokenId), "Token does not exist");
        
        IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        require(s.agentToShopkeeper[msg.sender] == tokenData.assignedShopkeeper, "Not assigned to this shopkeeper");
        require(s.deliveryLogs[tokenId][tokenData.aadhaar], "Delivery not marked by shopkeeper");
        require(!tokenData.isClaimed, "Token already claimed");
        
        s.deliveryAgents[msg.sender].totalDeliveries++;
        
        _logActivity("DELIVERY_CONFIRMED", tokenData.aadhaar, tokenId, "Delivery confirmed by agent");
        emit DeliveryConfirmed(tokenId, msg.sender);
    }
    
    function claimRationByConsumer(uint256 aadhaar, uint256 tokenId) external whenNotPaused validAadhaar(aadhaar) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        require(dcvToken.tokenExists(tokenId), "Token does not exist");
        require(!dcvToken.isTokenExpired(tokenId), "Token has expired");
        
        IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        require(tokenData.aadhaar == aadhaar, "Aadhaar mismatch");
        require(!tokenData.isClaimed, "Token already claimed");
        require(s.deliveryLogs[tokenId][aadhaar], "Delivery not confirmed");
        
        dcvToken.markAsClaimed(tokenId);
        s.consumers[aadhaar].totalTokensClaimed++;
        s.totalTokensClaimed++;
        
        _logActivity("RATION_CLAIMED", aadhaar, tokenId, "Ration claimed by consumer");
        emit TokenClaimed(tokenId, aadhaar);
    }
    
    function claimRationByWallet(uint256 tokenId) external whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        uint256 aadhaar = s.walletToAadhaar[msg.sender];
        require(aadhaar != 0, "Wallet not linked to any Aadhaar");
        require(s.consumers[aadhaar].aadhaar != 0, "Consumer not found");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        require(dcvToken.tokenExists(tokenId), "Token does not exist");
        require(!dcvToken.isTokenExpired(tokenId), "Token has expired");
        
        IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        require(tokenData.aadhaar == aadhaar, "Token not belonging to this wallet");
        require(!tokenData.isClaimed, "Token already claimed");
        require(s.deliveryLogs[tokenId][aadhaar], "Delivery not confirmed");
        
        dcvToken.markAsClaimed(tokenId);
        s.consumers[aadhaar].totalTokensClaimed++;
        s.totalTokensClaimed++;
        
        _logActivity("RATION_CLAIMED_BY_WALLET", aadhaar, tokenId, "Ration claimed by wallet");
        emit TokenClaimed(tokenId, aadhaar);
    }
    
    // ============ TOKEN EXPIRY MANAGEMENT ============
    function expireOldTokens() external whenNotPaused {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        uint256[] memory allTokens = dcvToken.getAllTokens();
        uint256 expiredCount = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            uint256 tokenId = allTokens[i];
            
            if (!dcvToken.tokenExists(tokenId)) continue;
            
            IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
            if (tokenData.isClaimed || tokenData.isExpired) continue;
            
            if (block.timestamp > tokenData.expiryTime) {
                dcvToken.markAsExpired(tokenId);
                s.totalTokensExpired++;
                expiredCount++;
                
                emit TokenExpired(tokenId, tokenData.aadhaar);
            }
        }
        
        _logActivity("TOKENS_EXPIRED", 0, 0, string(abi.encodePacked("Expired ", _toString(expiredCount), " tokens")));
    }
    
    // ============ SHOPKEEPER SPECIFIC TOKEN FUNCTIONS ============
    
    // Get all tokens assigned to a shopkeeper
    function getTokensForShopkeeper(address shopkeeper) external view returns (uint256[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        // Count tokens for this shopkeeper
        uint256 count = 0;
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].assignedShopkeeper == shopkeeper) {
                uint256[] memory tokens = IDCVToken(s.dcvTokenAddress).getTokensByAadhaar(aadhaar);
                count += tokens.length;
            }
        }
        
        // Populate array
        uint256[] memory shopkeeperTokens = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < s.allAadhaars.length; i++) {
            uint256 aadhaar = s.allAadhaars[i];
            if (s.consumers[aadhaar].assignedShopkeeper == shopkeeper) {
                uint256[] memory tokens = IDCVToken(s.dcvTokenAddress).getTokensByAadhaar(aadhaar);
                
                for (uint256 j = 0; j < tokens.length; j++) {
                    shopkeeperTokens[index] = tokens[j];
                    index++;
                }
            }
        }
        
        return shopkeeperTokens;
    }
    
    // Check if shopkeeper can mark delivery for a token
    function canShopkeeperMarkDelivery(address shopkeeper, uint256 tokenId) external view returns (bool, string memory reason) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        if (!s.shopkeepers_[shopkeeper]) {
            return (false, "Not a registered shopkeeper");
        }
        
        if (s.dcvTokenAddress == address(0)) {
            return (false, "DCVToken not set");
        }
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        
        if (!dcvToken.tokenExists(tokenId)) {
            return (false, "Token does not exist");
        }
        
        if (dcvToken.isTokenExpired(tokenId)) {
            return (false, "Token has expired");
        }
        
        IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        
        if (tokenData.assignedShopkeeper != shopkeeper) {
            return (false, "Not assigned to this shopkeeper");
        }
        
        if (tokenData.isClaimed) {
            return (false, "Token already claimed");
        }
        
        if (s.deliveryLogs[tokenId][tokenData.aadhaar]) {
            return (false, "Delivery already marked");
        }
        
        return (true, "Can mark delivery");
    }
    
    // Bulk mark deliveries for multiple tokens (for shopkeeper efficiency)
    function bulkMarkDeliveries(uint256[] memory aadhaars, uint256[] memory tokenIds) external onlyShopkeeper whenNotPaused {
        require(aadhaars.length == tokenIds.length, "Array length mismatch");
        require(aadhaars.length > 0 && aadhaars.length <= 50, "Invalid batch size");
        
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.dcvTokenAddress != address(0), "DCVToken not set");
        
        IDCVToken dcvToken = IDCVToken(s.dcvTokenAddress);
        uint256 successCount = 0;
        
        for (uint256 i = 0; i < aadhaars.length; i++) {
            uint256 aadhaar = aadhaars[i];
            uint256 tokenId = tokenIds[i];
            
            // Skip invalid entries
            if (aadhaar < 100000000000 || aadhaar > 999999999999) continue;
            if (!dcvToken.tokenExists(tokenId)) continue;
            if (dcvToken.isTokenExpired(tokenId)) continue;
            
            IDCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
            if (tokenData.aadhaar != aadhaar) continue;
            if (tokenData.assignedShopkeeper != msg.sender) continue;
            if (tokenData.isClaimed) continue;
            if (s.deliveryLogs[tokenId][aadhaar]) continue;
            
            // Mark delivery
            s.deliveryLogs[tokenId][aadhaar] = true;
            successCount++;
            
            emit DeliveryMarked(tokenId, aadhaar, msg.sender);
        }
        
        s.shopkeepers[msg.sender].totalDeliveries += successCount;
        
        _logActivity("BULK_DELIVERY_MARKED", 0, 0, string(abi.encodePacked("Bulk marked ", _toString(successCount), " deliveries")));
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Set ration amount for a category
     */
    function setRationAmount(string memory category, uint256 amount) external onlyOwner {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(bytes(category).length > 0, "Invalid category");
        require(amount > 0, "Amount must be greater than 0");
        
        s.rationAmounts[category] = amount;
        _logActivity("RATION_AMOUNT_SET", 0, 0, string(abi.encodePacked("Set ", category, " ration amount to ", _toString(amount))));
    }
    
    /**
     * @dev Get ration amount for a category
     */
    function getRationAmount(string memory category) external view returns (uint256) {
        return LibAppStorage.appStorage().rationAmounts[category];
    }

    // ============ UTILITY FUNCTIONS ============
    function _getCurrentMonth() internal view returns (uint256) {
        return ((block.timestamp - 1704067200) / (30 days) % 12) + 1;
    }
    
    function _getCurrentYear() internal view returns (uint256) {
        return 2024 + ((block.timestamp - 1704067200) / (30 days) / 12);
    }
    
    function _logActivity(string memory action, uint256 aadhaar, uint256 tokenId, string memory details) internal {
        LibAppStorage.appStorage().activityLogs.push(LibAppStorage.ActivityLog({
            timestamp: block.timestamp,
            actor: msg.sender,
            action: action,
            aadhaar: aadhaar,
            tokenId: tokenId,
            details: details
        }));
    }
    
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}