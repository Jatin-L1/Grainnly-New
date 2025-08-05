// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract DCVToken is ERC1155, Ownable, IERC1155Receiver {
    using Strings for uint256;
    
    // ============ STRUCTS ============
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
    
    // ============ CONSTANTS ============
    uint256 public constant TOKEN_VALIDITY_DAYS = 25;
    uint256 public constant SECONDS_IN_DAY = 86400;
    
    // ============ STATE VARIABLES ============
    string private _name;
    string private _symbol;
    uint256 private _tokenIdCounter;
    address public rationSystemContract;
    mapping(uint256 => RationTokenData) private _tokenData;
    mapping(uint256 => uint256[]) private _aadhaarTokens;
    
    // ============ EVENTS ============
    event TokenMinted(uint256 indexed tokenId, uint256 indexed aadhaar, uint256 rationAmount, uint256 expiryTime);
    event TokenClaimed(uint256 indexed tokenId, uint256 indexed aadhaar, uint256 claimedTime);
    event TokenExpired(uint256 indexed tokenId, uint256 indexed aadhaar);
    event RationSystemContractSet(address indexed oldContract, address indexed newContract);
    
    // ============ MODIFIERS ============
    modifier onlyRationSystem() {
        require(msg.sender == rationSystemContract, "DCVToken: Only RationSystem can call this");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    constructor(string memory tokenName, string memory tokenSymbol, string memory uri) ERC1155(uri) Ownable(msg.sender) {
        _name = tokenName;
        _symbol = tokenSymbol;
        _tokenIdCounter = 1;
    }
    
    // ============ VIEW FUNCTIONS ============
    function name() external view returns (string memory) {
        return _name;
    }
    
    function symbol() external view returns (string memory) {
        return _symbol;
    }
    
    // ============ ADMIN FUNCTIONS ============
    function setMinter(address _rationSystemContract) external onlyOwner {
        require(_rationSystemContract != address(0), "DCVToken: Invalid contract address");
        address oldContract = rationSystemContract;
        rationSystemContract = _rationSystemContract;
        emit RationSystemContractSet(oldContract, _rationSystemContract);
    }
    
    // ============ TOKEN MINTING ============
    function mintTokenForAadhaar(
        uint256 aadhaar,
        address shopkeeper,
        uint256 rationAmount,
        string memory category
    ) external onlyRationSystem returns (uint256) {
        require(aadhaar > 0, "DCVToken: Invalid Aadhaar");
        require(shopkeeper != address(0), "DCVToken: Invalid shopkeeper address");
        require(rationAmount > 0, "DCVToken: Ration amount must be positive");
        require(bytes(category).length > 0, "DCVToken: Category cannot be empty");
        
        uint256 tokenId = _tokenIdCounter++;
        uint256 currentTime = block.timestamp;
        uint256 expiryTime = currentTime + (TOKEN_VALIDITY_DAYS * SECONDS_IN_DAY);
        
        _tokenData[tokenId] = RationTokenData({
            tokenId: tokenId,
            aadhaar: aadhaar,
            assignedShopkeeper: shopkeeper,
            rationAmount: rationAmount,
            issuedTime: currentTime,
            expiryTime: expiryTime,
            claimTime: 0,
            isClaimed: false,
            isExpired: false,
            category: category
        });
        
        _aadhaarTokens[aadhaar].push(tokenId);
        _mint(address(this), tokenId, 1, "");
        
        emit TokenMinted(tokenId, aadhaar, rationAmount, expiryTime);
        return tokenId;
    }
    
    // ============ TOKEN LIFECYCLE MANAGEMENT ============
    function markAsClaimed(uint256 tokenId) external onlyRationSystem {
        require(tokenExists(tokenId), "DCVToken: Token does not exist");
        require(!_tokenData[tokenId].isClaimed, "DCVToken: Token already claimed");
        require(!isTokenExpired(tokenId), "DCVToken: Token has expired");
        
        _tokenData[tokenId].isClaimed = true;
        _tokenData[tokenId].claimTime = block.timestamp;
        
        _burnToken(tokenId);
        emit TokenClaimed(tokenId, _tokenData[tokenId].aadhaar, block.timestamp);
    }
    
    function markAsExpired(uint256 tokenId) external onlyRationSystem {
        require(tokenExists(tokenId), "DCVToken: Token does not exist");
        require(!_tokenData[tokenId].isClaimed, "DCVToken: Cannot expire claimed token");
        
        _tokenData[tokenId].isExpired = true;
        _burnToken(tokenId);
        
        emit TokenExpired(tokenId, _tokenData[tokenId].aadhaar);
    }
    
    function _burnToken(uint256 tokenId) internal {
        _burn(address(this), tokenId, 1);
    }
    
    // ============ VIEW FUNCTIONS ============
    function tokenExists(uint256 tokenId) public view returns (bool) {
        return _tokenData[tokenId].tokenId != 0;
    }
    
    function isTokenExpired(uint256 tokenId) public view returns (bool) {
        require(tokenExists(tokenId), "DCVToken: Token does not exist");
        return block.timestamp > _tokenData[tokenId].expiryTime;
    }
    
    function isTokenClaimed(uint256 tokenId) public view returns (bool) {
        require(tokenExists(tokenId), "DCVToken: Token does not exist");
        return _tokenData[tokenId].isClaimed;
    }
    
    function getTokenData(uint256 tokenId) external view returns (RationTokenData memory) {
        require(tokenExists(tokenId), "DCVToken: Token does not exist");
        return _tokenData[tokenId];
    }
    
    function getTokenStatus(uint256 tokenId) external view returns (TokenStatus) {
        require(tokenExists(tokenId), "DCVToken: Token does not exist");
        
        RationTokenData memory data = _tokenData[tokenId];
        
        if (data.isClaimed) {
            return TokenStatus.CLAIMED;
        } else if (data.isExpired || block.timestamp > data.expiryTime) {
            return TokenStatus.EXPIRED;
        } else {
            return TokenStatus.PENDING;
        }
    }
    
    function getTokensByAadhaar(uint256 aadhaar) external view returns (uint256[] memory) {
        return _aadhaarTokens[aadhaar];
    }
    
    function getUnclaimedTokensByAadhaar(uint256 aadhaar) external view returns (uint256[] memory) {
        uint256[] memory allTokens = _aadhaarTokens[aadhaar];
        uint256 unclaimedCount = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            uint256 tokenId = allTokens[i];
            RationTokenData memory data = _tokenData[tokenId];
            
            if (!data.isClaimed && !data.isExpired && block.timestamp <= data.expiryTime) {
                unclaimedCount++;
            }
        }
        
        uint256[] memory unclaimedTokens = new uint256[](unclaimedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allTokens.length; i++) {
            uint256 tokenId = allTokens[i];
            RationTokenData memory data = _tokenData[tokenId];
            
            if (!data.isClaimed && !data.isExpired && block.timestamp <= data.expiryTime) {
                unclaimedTokens[index] = tokenId;
                index++;
            }
        }
        
        return unclaimedTokens;
    }
    
    function getAllTokens() external view returns (uint256[] memory) {
        uint256[] memory allTokens = new uint256[](_tokenIdCounter - 1);
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            allTokens[i - 1] = i;
        }
        return allTokens;
    }
    
    function getExpiredTokens() external view returns (uint256[] memory) {
        uint256 expiredCount = 0;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            if (tokenExists(i)) {
                RationTokenData memory data = _tokenData[i];
                if (data.isExpired || (!data.isClaimed && currentTime > data.expiryTime)) {
                    expiredCount++;
                }
            }
        }
        
        uint256[] memory expiredTokens = new uint256[](expiredCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            if (tokenExists(i)) {
                RationTokenData memory data = _tokenData[i];
                if (data.isExpired || (!data.isClaimed && currentTime > data.expiryTime)) {
                    expiredTokens[index] = i;
                    index++;
                }
            }
        }
        
        return expiredTokens;
    }
    
    function getTokensExpiringSoon() external view returns (uint256[] memory) {
        uint256 expiringCount = 0;
        uint256 currentTime = block.timestamp;
        uint256 futureThreshold = currentTime + (3 * SECONDS_IN_DAY); // 3 days from now
        
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            if (tokenExists(i)) {
                RationTokenData memory data = _tokenData[i];
                if (!data.isClaimed && !data.isExpired && 
                    data.expiryTime > currentTime && data.expiryTime <= futureThreshold) {
                    expiringCount++;
                }
            }
        }
        
        uint256[] memory expiringTokens = new uint256[](expiringCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i < _tokenIdCounter; i++) {
            if (tokenExists(i)) {
                RationTokenData memory data = _tokenData[i];
                if (!data.isClaimed && !data.isExpired && 
                    data.expiryTime > currentTime && data.expiryTime <= futureThreshold) {
                    expiringTokens[index] = i;
                    index++;
                }
            }
        }
        
        return expiringTokens;
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    // ============ NON-TRANSFERABLE ENFORCEMENT ============
    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public pure override {
        revert("DCVToken: Tokens are non-transferable");
    }
    
    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory) public pure override {
        revert("DCVToken: Tokens are non-transferable");
    }
    
    function setApprovalForAll(address, bool) public pure override {
        revert("DCVToken: Approvals not allowed for non-transferable tokens");
    }
    
    // ============ ERC1155 RECEIVER IMPLEMENTATION ============
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }


    
}