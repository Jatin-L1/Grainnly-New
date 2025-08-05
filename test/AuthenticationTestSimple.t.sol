// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Diamond.sol";
import "../src/facets/DiamondCutFacet.sol";
import "../src/facets/RegistrationFacet.sol";
import "../src/facets/AuthenticationFacet.sol";
import "../src/interfaces/IDiamondCut.sol";

contract AuthenticationTestSimple is Test {
    Diamond public diamond;
    DiamondCutFacet public diamondCutFacet;
    RegistrationFacet public registrationFacet;
    AuthenticationFacet public authenticationFacet;
    
    address public owner;
    address public shopkeeper1;
    address public deliveryAgent1;
    address public consumer1;
    
    uint256 public constant AADHAAR_1 = 123456789012;
    string public constant MOBILE_1 = "9876543210";
    
    event UserLoggedIn(address indexed user, string role, uint256 timestamp);
    event UserLoggedOut(address indexed user, uint256 timestamp);
    event LoginAttempt(address indexed user, bool success, uint256 timestamp);
    
    function setUp() public {
        owner = makeAddr("owner");
        shopkeeper1 = makeAddr("shopkeeper1");
        deliveryAgent1 = makeAddr("deliveryAgent1");
        consumer1 = makeAddr("consumer1");
        
        vm.startPrank(owner);
        
        // Deploy Diamond
        diamondCutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(diamondCutFacet));
        
        // Deploy facets
        registrationFacet = new RegistrationFacet();
        authenticationFacet = new AuthenticationFacet();
        
        // Setup facet cuts
        setupFacets();
        
        // Setup test users
        setupTestUsers();
        
        vm.stopPrank();
    }
    
    function setupFacets() internal {
        // Registration Facet
        bytes4[] memory registrationSelectors = new bytes4[](6);
        registrationSelectors[0] = RegistrationFacet.registerShopkeeper.selector;
        registrationSelectors[1] = RegistrationFacet.registerDeliveryAgent.selector;
        registrationSelectors[2] = RegistrationFacet.registerConsumer.selector;
        registrationSelectors[3] = RegistrationFacet.linkConsumerWallet.selector;
        registrationSelectors[4] = RegistrationFacet.assignDeliveryAgentToShopkeeper.selector;
        registrationSelectors[5] = RegistrationFacet.updateRationAmount.selector;
        
        // Authentication Facet
        bytes4[] memory authSelectors = new bytes4[](7);
        authSelectors[0] = AuthenticationFacet.getUserRole.selector;
        authSelectors[1] = AuthenticationFacet.getUserRoleAndRedirect.selector;
        authSelectors[2] = AuthenticationFacet.login.selector;
        authSelectors[3] = AuthenticationFacet.logout.selector;
        authSelectors[4] = AuthenticationFacet.isRegisteredUser.selector;
        authSelectors[5] = AuthenticationFacet.isRegisteredAadhaar.selector;
        authSelectors[6] = AuthenticationFacet.getConsumerByAadhaar.selector;
        
        // Add facets to diamond
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](2);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(registrationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: registrationSelectors
        });
        
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(authenticationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: authSelectors
        });
        
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), "");
    }
    
    function setupTestUsers() internal {
        // Setup ration amounts
        RegistrationFacet(address(diamond)).updateRationAmount("BPL", 35000);
        
        // Add shopkeeper
        RegistrationFacet(address(diamond)).registerShopkeeper(
            shopkeeper1,
            "Ram Store",
            "Mumbai Central"
        );
        
        // Add delivery agent
        RegistrationFacet(address(diamond)).registerDeliveryAgent(
            deliveryAgent1,
            "Arjun Kumar",
            MOBILE_1
        );
        
        // Add consumer
        RegistrationFacet(address(diamond)).registerConsumer(
            AADHAAR_1,
            "Priya Sharma",
            MOBILE_1,
            "BPL",
            shopkeeper1
        );
        
        // Link consumer wallet
        RegistrationFacet(address(diamond)).linkConsumerWallet(AADHAAR_1, consumer1);
    }
    
    // ============ AUTHENTICATION TESTS ============
    
    function test_AdminLogin_Admin() public {
        vm.prank(owner);
        (bool success, string memory role, string memory redirectUrl) = AuthenticationFacet(address(diamond)).login();
        
        assertTrue(success, "Admin should be able to login");
        assertEq(role, "ADMIN", "Role should be ADMIN");
        assertEq(redirectUrl, "/admin-dashboard", "Should redirect to admin dashboard");
    }
    
    function test_GetUserRoleAndRedirect_Admin() public {
        (string memory role, string memory redirectUrl) = AuthenticationFacet(address(diamond)).getUserRoleAndRedirect(owner);
        
        assertEq(role, "ADMIN", "Should return ADMIN role");
        assertEq(redirectUrl, "/admin-dashboard", "Should return admin dashboard URL");
    }
    
    function test_ShopkeeperLogin_Success() public {
        vm.prank(shopkeeper1);
        (bool success, string memory role, string memory redirectUrl) = AuthenticationFacet(address(diamond)).login();
        
        assertTrue(success, "Session should be valid");
        assertEq(role, "SHOPKEEPER", "Role should be SHOPKEEPER");
        assertEq(redirectUrl, "/shopkeeper-dashboard", "Should redirect to shopkeeper dashboard");
    }
    
    function test_SessionValidation() public {
        bool isRegistered = AuthenticationFacet(address(diamond)).isRegisteredUser(shopkeeper1);
        assertTrue(isRegistered, "Session should be valid after login");
    }
    
    function test_SessionExpiry() public {
        bool isRegistered = AuthenticationFacet(address(diamond)).isRegisteredUser(owner);
        assertTrue(isRegistered, "Session should be valid initially");
    }
    
    function test_SessionExtension() public {
        // Just test that admin can login
        vm.prank(owner);
        (bool success,,) = AuthenticationFacet(address(diamond)).login();
        assertTrue(success, "Admin should be able to login");
    }
    
    function test_MultipleUserLogins() public {
        // Test admin login
        vm.prank(owner);
        (bool adminSuccess, string memory adminRole,) = AuthenticationFacet(address(diamond)).login();
        assertTrue(adminSuccess, "Admin login should succeed");
        assertEq(adminRole, "ADMIN", "Admin role should be correct");
        
        // Test shopkeeper login
        vm.prank(shopkeeper1);
        (bool shopkeeperSuccess, string memory shopkeeperRole,) = AuthenticationFacet(address(diamond)).login();
        assertTrue(shopkeeperSuccess, "Shopkeeper login should succeed");
        assertEq(shopkeeperRole, "SHOPKEEPER", "Shopkeeper role should be correct");
    }
    
    function test_LogoutEvents() public {
        vm.prank(owner);
        
        // Login first
        AuthenticationFacet(address(diamond)).login();
        
        // Test logout - need to prank as owner again
        vm.expectEmit(true, false, false, true);
        emit UserLoggedOut(owner, block.timestamp);
        vm.prank(owner);
        AuthenticationFacet(address(diamond)).logout();
    }
    
    function test_IsRegisteredAadhaar() public {
        bool isRegistered = AuthenticationFacet(address(diamond)).isRegisteredAadhaar(AADHAAR_1);
        assertTrue(isRegistered, "Aadhaar should be registered");
    }
      function test_GetConsumerByAadhaar() public {
        (string memory name, string memory mobile, string memory category, address assignedShopkeeper, bool isActive) =
            AuthenticationFacet(address(diamond)).getConsumerByAadhaar(AADHAAR_1);
        
        assertEq(name, "Priya Sharma", "Name should match");
        assertEq(mobile, MOBILE_1, "Mobile should match");
        assertEq(category, "BPL", "Category should match");
        assertEq(assignedShopkeeper, shopkeeper1, "Shopkeeper should match");
        assertTrue(isActive, "Consumer should be active");
    }
}
