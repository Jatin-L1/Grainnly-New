// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/DCVToken.sol";
// ❌ REMOVE THIS: import "../src/Interfaces.sol";

contract DCVTokenTest is Test {
    DCVToken public dcvToken;
    address public rationSystem;
    address public owner;
    address public user1;
    address public user2;
    
    uint256 constant AADHAAR_1 = 123456789012;
    uint256 constant AADHAAR_2 = 987654321098;
    address constant SHOPKEEPER_1 = address(0x1);
    uint256 constant RATION_AMOUNT = 35000; // 35kg in grams
    string constant CATEGORY = "BPL";
    
    function setUp() public {
        owner = address(this);
        user1 = address(0x1001);
        user2 = address(0x1002);
        rationSystem = address(0x2001);
        
        dcvToken = new DCVToken(
            "Digital Card Voucher", 
            "DCV", 
            "https://api.rationcard.gov.in/metadata/{id}.json"
        );
        
        dcvToken.setMinter(rationSystem);
    }
    
    function testInitialState() public view {
        assertEq(dcvToken.owner(), owner);
        assertEq(dcvToken.rationSystemContract(), rationSystem);
        assertEq(dcvToken.totalSupply(), 0);
    }
    
    function testMintTokenForAadhaar() public {
        vm.prank(rationSystem);
        uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        assertTrue(dcvToken.tokenExists(tokenId));
        assertEq(dcvToken.totalSupply(), 1);
        
        // ✅ Use DCVToken's internal struct type
        DCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        assertEq(tokenData.aadhaar, AADHAAR_1);
        assertEq(tokenData.assignedShopkeeper, SHOPKEEPER_1);
        assertEq(tokenData.rationAmount, RATION_AMOUNT);
        assertEq(tokenData.category, CATEGORY);
        assertGt(tokenData.expiryTime, block.timestamp);
        
        uint256[] memory tokens = dcvToken.getTokensByAadhaar(AADHAAR_1);
        assertEq(tokens.length, 1);
        assertEq(tokens[0], tokenId);
    }
    
    function testOnlyRationSystemCanMint() public {
        vm.expectRevert("DCVToken: Only RationSystem can call this");
        dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
    }
    
    function testTokenExpiry() public {
        vm.prank(rationSystem);
        uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        assertFalse(dcvToken.isTokenExpired(tokenId));
        
        // Fast forward time by 26 days (1 day more than validity)
        vm.warp(block.timestamp + 26 days);
        
        assertTrue(dcvToken.isTokenExpired(tokenId));
    }
    
    function testMarkAsClaimed() public {
        vm.prank(rationSystem);
        uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        // ✅ Use DCVToken's internal enum type
        DCVToken.TokenStatus status = dcvToken.getTokenStatus(tokenId);
        assertEq(uint256(status), uint256(DCVToken.TokenStatus.PENDING));
        
        // Check token data directly for claim status
        DCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        assertFalse(tokenData.isClaimed);
        assertFalse(tokenData.isExpired);
        
        vm.prank(rationSystem);
        dcvToken.markAsClaimed(tokenId);
        
        // After claiming, status should be CLAIMED
        status = dcvToken.getTokenStatus(tokenId);
        assertEq(uint256(status), uint256(DCVToken.TokenStatus.CLAIMED));
        
        uint256[] memory unclaimed = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_1);
        assertEq(unclaimed.length, 0);
    }
    
    function testMarkAsExpired() public {
        vm.prank(rationSystem);
        uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        vm.prank(rationSystem);
        dcvToken.markAsExpired(tokenId);
        
        // ✅ Use DCVToken's internal enum type
        DCVToken.TokenStatus status = dcvToken.getTokenStatus(tokenId);
        assertEq(uint256(status), uint256(DCVToken.TokenStatus.EXPIRED));
    }
    
    function testNonTransferable() public {
        vm.prank(rationSystem);
        uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        // Try to transfer - should revert
        vm.expectRevert("DCVToken: Tokens are non-transferable");
        dcvToken.safeTransferFrom(address(dcvToken), user1, tokenId, 1, "");
        
        // Try to set approval - should revert
        vm.expectRevert("DCVToken: Approvals not allowed for non-transferable tokens");
        dcvToken.setApprovalForAll(user1, true);
    }
    
    function testGetExpiredTokens() public {
        vm.prank(rationSystem);
        dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        vm.prank(rationSystem);
        dcvToken.mintTokenForAadhaar(AADHAAR_2, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
        
        // Fast forward time to expire tokens
        vm.warp(block.timestamp + 26 days);
        
        uint256[] memory expiredTokens = dcvToken.getExpiredTokens();
        assertEq(expiredTokens.length, 2);
    }
    
function testGetTokensExpiringSoon() public {
    // Mint a token
    vm.prank(rationSystem);
    uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
    
    // ✅ FIX: Your DCVToken uses 3-day threshold for "expiring soon"
    // Token validity is 25 days, but "expiring soon" only shows tokens expiring within 3 days
    
    // Right after minting (25 days validity), token is NOT expiring soon (not within 3 days)
    uint256[] memory expiringSoon = dcvToken.getTokensExpiringSoon();
    assertEq(expiringSoon.length, 0, "Newly minted token should not be expiring soon");
    
    // Fast forward to make token expire within 3 days
    // If validity is 25 days, go to day 23 (2 days left = expiring soon)
    vm.warp(block.timestamp + 23 days);
    
    expiringSoon = dcvToken.getTokensExpiringSoon();
    assertEq(expiringSoon.length, 1, "Token should now be expiring soon (within 3 days)");
    assertEq(expiringSoon[0], tokenId, "Should return the correct token ID");
    
    // Fast forward past expiry (beyond 25 days)
    vm.warp(block.timestamp + 5 days); // Total 28 days, past 25-day validity
    
    // Expired tokens are not "expiring soon" - they're already expired
    expiringSoon = dcvToken.getTokensExpiringSoon();
    assertEq(expiringSoon.length, 0, "Expired tokens should not be in expiring soon list");
    
    // Verify token is actually expired
    assertTrue(dcvToken.isTokenExpired(tokenId), "Token should be expired");
}
    
function testBatchOperations() public {
    vm.prank(rationSystem);
    uint256 tokenId1 = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
    
    vm.prank(rationSystem);
    uint256 tokenId2 = dcvToken.mintTokenForAadhaar(AADHAAR_2, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
    
    // ✅ Fix: Use individual getTokenStatus calls instead of batch
    DCVToken.TokenStatus status1 = dcvToken.getTokenStatus(tokenId1);
    DCVToken.TokenStatus status2 = dcvToken.getTokenStatus(tokenId2);
    
    assertEq(uint256(status1), uint256(DCVToken.TokenStatus.PENDING));
    assertEq(uint256(status2), uint256(DCVToken.TokenStatus.PENDING));
    
    // Test other batch-like operations that should exist
    uint256[] memory tokens1 = dcvToken.getTokensByAadhaar(AADHAAR_1);
    uint256[] memory tokens2 = dcvToken.getTokensByAadhaar(AADHAAR_2);
    
    assertEq(tokens1.length, 1);
    assertEq(tokens2.length, 1);
    assertEq(tokens1[0], tokenId1);
    assertEq(tokens2[0], tokenId2);
    
    // Test unclaimed tokens batch operation
    uint256[] memory unclaimed1 = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_1);
    uint256[] memory unclaimed2 = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_2);
    
    assertEq(unclaimed1.length, 1);
    assertEq(unclaimed2.length, 1);
    assertEq(unclaimed1[0], tokenId1);
    assertEq(unclaimed2[0], tokenId2);
}
    
    // Additional test for the new category feature
    function testTokenCategory() public {
        vm.prank(rationSystem);
        uint256 tokenId = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, "AAY");
        
        DCVToken.RationTokenData memory tokenData = dcvToken.getTokenData(tokenId);
        assertEq(tokenData.category, "AAY");
    }
    
    // Test for invalid category
    function testInvalidCategory() public {
        vm.prank(rationSystem);
        vm.expectRevert("DCVToken: Category cannot be empty");
        dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, "");
    }

    function testMultipleTokenOperations() public {
    // Mint multiple tokens
    vm.prank(rationSystem);
    uint256 tokenId1 = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, CATEGORY);
    
    vm.prank(rationSystem);
    uint256 tokenId2 = dcvToken.mintTokenForAadhaar(AADHAAR_2, SHOPKEEPER_1, RATION_AMOUNT, "AAY");
    
    vm.prank(rationSystem);
    uint256 tokenId3 = dcvToken.mintTokenForAadhaar(AADHAAR_1, SHOPKEEPER_1, RATION_AMOUNT, "APL");
    
    // Test total supply after multiple mints
    assertEq(dcvToken.totalSupply(), 3);
    
    // Test individual statuses
    assertEq(uint256(dcvToken.getTokenStatus(tokenId1)), uint256(DCVToken.TokenStatus.PENDING));
    assertEq(uint256(dcvToken.getTokenStatus(tokenId2)), uint256(DCVToken.TokenStatus.PENDING));
    assertEq(uint256(dcvToken.getTokenStatus(tokenId3)), uint256(DCVToken.TokenStatus.PENDING));
    
    // Test tokens by Aadhaar (AADHAAR_1 should have 2 tokens)
    uint256[] memory aadhaar1Tokens = dcvToken.getTokensByAadhaar(AADHAAR_1);
    assertEq(aadhaar1Tokens.length, 2);
    
    // Test tokens by Aadhaar (AADHAAR_2 should have 1 token)
    uint256[] memory aadhaar2Tokens = dcvToken.getTokensByAadhaar(AADHAAR_2);
    assertEq(aadhaar2Tokens.length, 1);
    
    // Test claiming multiple tokens
    vm.prank(rationSystem);
    dcvToken.markAsClaimed(tokenId1);
    
    vm.prank(rationSystem);
    dcvToken.markAsClaimed(tokenId2);
    
    // Check unclaimed tokens
    uint256[] memory unclaimed1 = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_1);
    uint256[] memory unclaimed2 = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_2);
    
    assertEq(unclaimed1.length, 1); // Only tokenId3 should be unclaimed
    assertEq(unclaimed2.length, 0); // tokenId2 was claimed
    assertEq(unclaimed1[0], tokenId3);
    
    // Test expired tokens functionality
    vm.warp(block.timestamp + 26 days);
    uint256[] memory expiredTokens = dcvToken.getExpiredTokens();
    assertEq(expiredTokens.length, 1); // Only unclaimed token should be expired
}
}