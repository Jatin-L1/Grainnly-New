// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDCVToken - Shared interface for DCVToken
 * @dev Single source of truth for DCVToken interface
 */
interface IDCVToken {
    // EXACT struct matching DCVToken.sol
    struct RationTokenData {
        uint256 tokenId;
        uint256 aadhaar;
        address assignedShopkeeper;
        uint256 rationAmount;
        uint256 issuedTime;
        uint256 expiryTime;
        uint256 claimTime;
        bool isClaimed;
        bool isExpired;
        string category;
    }
    
    enum TokenStatus { PENDING, CLAIMED, EXPIRED }
    
    // All function signatures
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function setMinter(address _rationSystemContract) external;
    function mintTokenForAadhaar(uint256 aadhaar, address shopkeeper, uint256 amount, string memory category) external returns (uint256);
    function markAsClaimed(uint256 tokenId) external;
    function markAsExpired(uint256 tokenId) external;
    function tokenExists(uint256 tokenId) external view returns (bool);
    function isTokenExpired(uint256 tokenId) external view returns (bool);
    function isTokenClaimed(uint256 tokenId) external view returns (bool);
    function getTokenData(uint256 tokenId) external view returns (RationTokenData memory);
    function getTokenStatus(uint256 tokenId) external view returns (TokenStatus);
    function getTokensByAadhaar(uint256 aadhaar) external view returns (uint256[] memory);
    function getUnclaimedTokensByAadhaar(uint256 aadhaar) external view returns (uint256[] memory);
    function getAllTokens() external view returns (uint256[] memory);
    function getExpiredTokens() external view returns (uint256[] memory);
    function getTokensExpiringSoon() external view returns (uint256[] memory);
    function totalSupply() external view returns (uint256);
}