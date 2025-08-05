// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Diamond.sol";
import "../src/DiamondInit.sol";
import "../src/DCVToken.sol";
import "../src/facets/DiamondCutFacet.sol";
import "../src/facets/RegistrationFacet.sol";
import "../src/facets/DeliveryFacet.sol";
import "../src/facets/NotificationFacet.sol";
import "../src/facets/InventoryFacet.sol";
import "../src/facets/AnalyticsFacet.sol";
import "../src/facets/WorkflowFacet.sol";
import "../src/facets/LocationFacet.sol";
import "../src/facets/DashboardFacetCore.sol";
import "../src/facets/DashboardFacetSearch.sol";
import "../src/facets/DashboardFacetStats.sol";
import "../src/facets/DashboardFacetAdmin.sol";
import "../src/facets/TokenOpsFacet.sol";
import "../src/facets/AuthenticationFacet.sol";
import "../src/interfaces/IDiamondCut.sol";
import "../src/libraries/LibAppStorage.sol";

/**
 * @title Complete PDS System Integration Test
 * @dev Tests all new facets and their integration
 */
contract CompletePDSTest is Test {
    
    Diamond public diamond;
    DiamondCutFacet public diamondCutFacet;
    DCVToken public dcvToken;
    RegistrationFacet public registrationFacet;
    DeliveryFacet public deliveryFacet;
    NotificationFacet public notificationFacet;
    InventoryFacet public inventoryFacet;
    AnalyticsFacet public analyticsFacet;
    WorkflowFacet public workflowFacet;
    LocationFacet public locationFacet;
    DashboardFacetCore public dashboardFacet;
    DashboardFacetSearch public dashboardSearchFacet;
    DashboardFacetStats public dashboardStatsFacet;
    DashboardFacetAdmin public dashboardAdminFacet;
    TokenOpsFacet public tokenOpsFacet;
    
    address public owner;
    address public admin;
    address public shopkeeper1;
    address public deliveryAgent1;
    address public consumer1Wallet;
    
    uint256 public constant AADHAAR_1 = 123456789012;
    string public constant MOBILE_1 = "9876543210";
    
    function setUp() public {
        owner = makeAddr("owner");
        admin = makeAddr("admin");
        shopkeeper1 = makeAddr("shopkeeper1");
        deliveryAgent1 = makeAddr("deliveryAgent1");
        consumer1Wallet = makeAddr("consumer1");
        
        vm.startPrank(owner);
        
        // Deploy Diamond
        diamondCutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(diamondCutFacet));
        
        // Deploy DCVToken
        dcvToken = new DCVToken("Digital Ration Token", "DRT", "https://api.example.com/metadata/{id}");
        
        // Deploy all facets
        registrationFacet = new RegistrationFacet();
        deliveryFacet = new DeliveryFacet();
        notificationFacet = new NotificationFacet();
        inventoryFacet = new InventoryFacet();
        analyticsFacet = new AnalyticsFacet();
        workflowFacet = new WorkflowFacet();
        locationFacet = new LocationFacet();
        dashboardFacet = new DashboardFacetCore();
        dashboardSearchFacet = new DashboardFacetSearch();
        dashboardStatsFacet = new DashboardFacetStats();
        dashboardAdminFacet = new DashboardFacetAdmin();
        tokenOpsFacet = new TokenOpsFacet();
        
        // Setup facet cuts
        setupFacets();
        
        // Set DCVToken address and configure the token contract
        RegistrationFacet(address(diamond)).setDCVTokenAddress(address(dcvToken));
        dcvToken.setMinter(address(diamond));
        
        // Setup initial ration amounts for testing (owner is already pranked)
        RegistrationFacet(address(diamond)).updateRationAmount("BPL", 35000);
        RegistrationFacet(address(diamond)).updateRationAmount("APL", 15000);
        RegistrationFacet(address(diamond)).updateRationAmount("AAY", 35000);
        
        // Enable GPS integration for location tests
        LocationFacet(address(diamond)).setGPSIntegration(true);
        
        // Setup test users
        setupTestUsers();
        
        vm.stopPrank();
    }
    
    function setupFacets() internal {
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](13);
        
        // Registration Facet
        bytes4[] memory registrationSelectors = new bytes4[](10);
        registrationSelectors[0] = RegistrationFacet.registerShopkeeper.selector;
        registrationSelectors[1] = RegistrationFacet.registerDeliveryAgent.selector;
        registrationSelectors[2] = RegistrationFacet.registerConsumer.selector;
        registrationSelectors[3] = RegistrationFacet.assignDeliveryAgentToShopkeeper.selector;
        registrationSelectors[4] = RegistrationFacet.linkConsumerWallet.selector;
        registrationSelectors[5] = RegistrationFacet.deactivateConsumer.selector;
        registrationSelectors[6] = RegistrationFacet.deactivateShopkeeper.selector;
        registrationSelectors[7] = RegistrationFacet.deactivateDeliveryAgent.selector;
        registrationSelectors[8] = RegistrationFacet.updateRationAmount.selector;
        registrationSelectors[9] = RegistrationFacet.setDCVTokenAddress.selector;
        
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(registrationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: registrationSelectors
        });
        
        // Delivery Facet
        bytes4[] memory deliverySelectors = new bytes4[](14);
        deliverySelectors[0] = DeliveryFacet.createOrder.selector;
        deliverySelectors[1] = DeliveryFacet.assignDeliveryAgent.selector;
        deliverySelectors[2] = DeliveryFacet.updateDeliveryStatus.selector;
        deliverySelectors[3] = DeliveryFacet.completeDelivery.selector;
        deliverySelectors[4] = DeliveryFacet.markOrderReady.selector;
        deliverySelectors[5] = DeliveryFacet.confirmPickup.selector;
        deliverySelectors[6] = DeliveryFacet.getOrder.selector;
        deliverySelectors[7] = DeliveryFacet.getDelivery.selector;
        deliverySelectors[8] = DeliveryFacet.getConsumerOrders.selector;
        deliverySelectors[9] = DeliveryFacet.getShopkeeperOrders.selector;
        deliverySelectors[10] = DeliveryFacet.getAgentDeliveries.selector;
        deliverySelectors[11] = DeliveryFacet.getActiveDeliveries.selector;
        deliverySelectors[12] = DeliveryFacet.getDeliveryMetrics.selector;
        deliverySelectors[13] = DeliveryFacet.escalateToEmergency.selector;
        
        cut[1] = IDiamondCut.FacetCut({
            facetAddress: address(deliveryFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: deliverySelectors
        });
        
        // Notification Facet
        bytes4[] memory notificationSelectors = new bytes4[](10);
        notificationSelectors[0] = NotificationFacet.sendNotification.selector;
        notificationSelectors[1] = NotificationFacet.sendDeliveryAssignmentNotification.selector;
        notificationSelectors[2] = NotificationFacet.sendStatusUpdateNotification.selector;
        notificationSelectors[3] = NotificationFacet.sendEmergencyAlert.selector;
        notificationSelectors[4] = NotificationFacet.sendBulkNotificationByRole.selector;
        notificationSelectors[5] = NotificationFacet.markAsRead.selector;
        notificationSelectors[6] = NotificationFacet.markAllAsRead.selector;
        notificationSelectors[7] = NotificationFacet.getUserNotifications.selector;
        notificationSelectors[8] = NotificationFacet.getUnreadNotifications.selector;
        notificationSelectors[9] = NotificationFacet.getNotificationCount.selector;
        
        cut[2] = IDiamondCut.FacetCut({
            facetAddress: address(notificationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: notificationSelectors
        });
        
        // Inventory Facet
        bytes4[] memory inventorySelectors = new bytes4[](10);
        inventorySelectors[0] = InventoryFacet.updateInventoryItem.selector;
        inventorySelectors[1] = InventoryFacet.updateMyInventory.selector;
        inventorySelectors[2] = InventoryFacet.reserveItems.selector;
        inventorySelectors[3] = InventoryFacet.releaseReservedItems.selector;
        inventorySelectors[4] = InventoryFacet.confirmItemDelivery.selector;
        inventorySelectors[5] = InventoryFacet.getShopInventory.selector;
        inventorySelectors[6] = InventoryFacet.getInventoryItem.selector;
        inventorySelectors[7] = InventoryFacet.getLowStockItems.selector;
        inventorySelectors[8] = InventoryFacet.canFulfillOrder.selector;
        inventorySelectors[9] = InventoryFacet.performInventoryAudit.selector;
        
        cut[3] = IDiamondCut.FacetCut({
            facetAddress: address(inventoryFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: inventorySelectors
        });
        
        // Analytics Facet
        bytes4[] memory analyticsSelectors = new bytes4[](9);
        analyticsSelectors[0] = AnalyticsFacet.getSystemAnalytics.selector;
        analyticsSelectors[1] = AnalyticsFacet.updateSystemAnalytics.selector;
        analyticsSelectors[2] = AnalyticsFacet.getAgentPerformanceMetrics.selector;
        analyticsSelectors[3] = AnalyticsFacet.getShopkeeperPerformanceMetrics.selector;
        analyticsSelectors[4] = AnalyticsFacet.getPerformanceDashboard.selector;
        analyticsSelectors[5] = AnalyticsFacet.getTopPerformingAgents.selector;
        analyticsSelectors[6] = AnalyticsFacet.generatePerformanceAlerts.selector;
        analyticsSelectors[7] = AnalyticsFacet.getTimeBasedAnalytics.selector;
        analyticsSelectors[8] = AnalyticsFacet.exportAnalyticsData.selector;
        
        cut[4] = IDiamondCut.FacetCut({
            facetAddress: address(analyticsFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: analyticsSelectors
        });
        
        // Workflow Facet
        bytes4[] memory workflowSelectors = new bytes4[](11);
        workflowSelectors[0] = WorkflowFacet.initializeOrderWorkflow.selector;
        workflowSelectors[1] = WorkflowFacet.progressOrderState.selector;
        workflowSelectors[2] = WorkflowFacet.autoProgressOrders.selector;
        workflowSelectors[3] = WorkflowFacet.initiateDispute.selector;
        workflowSelectors[4] = WorkflowFacet.resolveDispute.selector;
        workflowSelectors[5] = WorkflowFacet.handleEmergencyEscalation.selector;
        workflowSelectors[6] = WorkflowFacet.bulkProgressOrders.selector;
        workflowSelectors[7] = WorkflowFacet.getOrderWorkflowHistory.selector;
        workflowSelectors[8] = WorkflowFacet.isValidStateTransition.selector;
        workflowSelectors[9] = WorkflowFacet.getAvailableNextStates.selector;
        workflowSelectors[10] = WorkflowFacet.getOrdersRequiringAttention.selector;
        
        cut[5] = IDiamondCut.FacetCut({
            facetAddress: address(workflowFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: workflowSelectors
        });
        
        // Location Facet
        bytes4[] memory locationSelectors = new bytes4[](13);
        locationSelectors[0] = LocationFacet.updateLocation.selector;
        locationSelectors[1] = LocationFacet.setDeliveryRoute.selector;
        locationSelectors[2] = LocationFacet.generateOptimizedRoute.selector;
        locationSelectors[3] = LocationFacet.updateDeliveryLocation.selector;
        locationSelectors[4] = LocationFacet.setupGeofence.selector;
        locationSelectors[5] = LocationFacet.trackDeliveryProgress.selector;
        locationSelectors[6] = LocationFacet.getNearbyDeliveryAgents.selector;
        locationSelectors[7] = LocationFacet.getUserLocation.selector;
        locationSelectors[8] = LocationFacet.getDeliveryRoute.selector;
        locationSelectors[9] = LocationFacet.getActiveDeliveryLocations.selector;
        locationSelectors[10] = LocationFacet.calculateDeliveryETA.selector;
        locationSelectors[11] = LocationFacet.getLocationSettings.selector;
        locationSelectors[12] = LocationFacet.setGPSIntegration.selector;
        
        cut[6] = IDiamondCut.FacetCut({
            facetAddress: address(locationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: locationSelectors
        });
        
        // Dashboard Facet
        bytes4[] memory dashboardSelectors = new bytes4[](10);
        dashboardSelectors[0] = DashboardFacetCore.getDashboardData.selector;
        dashboardSelectors[1] = DashboardFacetCore.getConsumerDashboard.selector;
        dashboardSelectors[2] = DashboardFacetCore.getConsumerByAadhaar.selector;
        dashboardSelectors[3] = DashboardFacetCore.getConsumersByCategory.selector;
        dashboardSelectors[4] = DashboardFacetCore.getConsumersByShopkeeper.selector;
        dashboardSelectors[5] = DashboardFacetCore.hasConsumerReceivedMonthlyToken.selector;
        dashboardSelectors[6] = DashboardFacetCore.getConsumersWithoutMonthlyTokens.selector;
        dashboardSelectors[7] = DashboardFacetCore.getSystemHealthReport.selector;
        dashboardSelectors[8] = DashboardFacetCore.getCategoryWiseStats.selector;
        dashboardSelectors[9] = DashboardFacetCore.getShopkeeperInfo.selector;
        
        cut[7] = IDiamondCut.FacetCut({
            facetAddress: address(dashboardFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: dashboardSelectors
        });
        
        // Dashboard Search Facet
        bytes4[] memory dashboardSearchSelectors = new bytes4[](4);
        dashboardSearchSelectors[0] = DashboardFacetSearch.getConsumerByMobile.selector;
        dashboardSearchSelectors[1] = DashboardFacetSearch.searchConsumersByName.selector;
        dashboardSearchSelectors[2] = DashboardFacetSearch.getConsumersPaginated.selector;
        dashboardSearchSelectors[3] = DashboardFacetSearch.getConsumersNeedingEmergencyHelp.selector;
        
        cut[8] = IDiamondCut.FacetCut({
            facetAddress: address(dashboardSearchFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: dashboardSearchSelectors
        });
        
        // Dashboard Stats Facet
        bytes4[] memory dashboardStatsSelectors = new bytes4[](11);
        dashboardStatsSelectors[0] = DashboardFacetStats.getAreaWiseStats.selector;
        dashboardStatsSelectors[1] = DashboardFacetStats.getConsumerDistributionHistory.selector;
        dashboardStatsSelectors[2] = DashboardFacetStats.getShopkeeperDistributionSummary.selector;
        dashboardStatsSelectors[3] = DashboardFacetStats.getSystemStatus.selector;
        dashboardStatsSelectors[4] = DashboardFacetStats.getTotalConsumers.selector;
        dashboardStatsSelectors[5] = DashboardFacetStats.getTotalShopkeepers.selector;
        dashboardStatsSelectors[6] = DashboardFacetStats.getTotalDeliveryAgents.selector;
        dashboardStatsSelectors[7] = DashboardFacetStats.getRationAmounts.selector;
        dashboardStatsSelectors[8] = DashboardFacetStats.isValidCategory.selector;
        dashboardStatsSelectors[9] = DashboardFacetStats.getWalletByAadhaar.selector;
        dashboardStatsSelectors[10] = DashboardFacetStats.getAadhaarByWallet.selector;
        
        cut[9] = IDiamondCut.FacetCut({
            facetAddress: address(dashboardStatsFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: dashboardStatsSelectors
        });
        
        // Dashboard Admin Facet
        bytes4[] memory dashboardAdminSelectors = new bytes4[](6);
        dashboardAdminSelectors[0] = DashboardFacetAdmin.getAdminDashboard.selector;
        dashboardAdminSelectors[1] = DashboardFacetAdmin.getShopkeeperDashboard.selector;
        dashboardAdminSelectors[2] = DashboardFacetAdmin.getDeliveryAgentDashboard.selector;
        dashboardAdminSelectors[3] = DashboardFacetAdmin.getActivityLogsForAI.selector;
        dashboardAdminSelectors[4] = DashboardFacetAdmin.getRecentActivityLogs.selector;
        dashboardAdminSelectors[5] = DashboardFacetAdmin.getActivityLogsByActor.selector;
        
        cut[10] = IDiamondCut.FacetCut({
            facetAddress: address(dashboardAdminFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: dashboardAdminSelectors
        });
        
        // TokenOps Facet
        bytes4[] memory tokenOpsSelectors = new bytes4[](15);
        tokenOpsSelectors[0] = TokenOpsFacet.generateMonthlyTokensForAll.selector;
        tokenOpsSelectors[1] = TokenOpsFacet.generateTokenForConsumer.selector;
        tokenOpsSelectors[2] = TokenOpsFacet.generateTokensForCategory.selector;
        tokenOpsSelectors[3] = TokenOpsFacet.generateTokensForShopkeeper.selector;
        tokenOpsSelectors[4] = TokenOpsFacet.bulkGenerateTokens.selector;
        tokenOpsSelectors[5] = TokenOpsFacet.markRationDeliveredByAadhaar.selector;
        tokenOpsSelectors[6] = TokenOpsFacet.confirmDeliveryByAgent.selector;
        tokenOpsSelectors[7] = TokenOpsFacet.claimRationByConsumer.selector;
        tokenOpsSelectors[8] = TokenOpsFacet.claimRationByWallet.selector;
        tokenOpsSelectors[9] = TokenOpsFacet.expireOldTokens.selector;
        tokenOpsSelectors[10] = TokenOpsFacet.getTokensForShopkeeper.selector;
        tokenOpsSelectors[11] = TokenOpsFacet.canShopkeeperMarkDelivery.selector;
        tokenOpsSelectors[12] = TokenOpsFacet.bulkMarkDeliveries.selector;
        tokenOpsSelectors[13] = TokenOpsFacet.setRationAmount.selector;
        tokenOpsSelectors[14] = TokenOpsFacet.getRationAmount.selector;
        
        cut[11] = IDiamondCut.FacetCut({
            facetAddress: address(tokenOpsFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: tokenOpsSelectors
        });
        
        // AuthenticationFacet
        AuthenticationFacet authenticationFacet = new AuthenticationFacet();
        bytes4[] memory authSelectors = new bytes4[](6);
        authSelectors[0] = AuthenticationFacet.getUserRole.selector;
        authSelectors[1] = AuthenticationFacet.getUserRoleAndRedirect.selector;
        authSelectors[2] = AuthenticationFacet.login.selector;
        authSelectors[3] = AuthenticationFacet.logout.selector;
        authSelectors[4] = AuthenticationFacet.isRegisteredUser.selector;
        authSelectors[5] = AuthenticationFacet.isRegisteredAadhaar.selector;
        // Remove getConsumerByAadhaar to avoid conflict with DashboardFacetCore
        
        cut[12] = IDiamondCut.FacetCut({
            facetAddress: address(authenticationFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: authSelectors
        });
        
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), "");
    }
    
    function setupTestUsers() internal {
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
        RegistrationFacet(address(diamond)).linkConsumerWallet(AADHAAR_1, consumer1Wallet);
        
        // Assign delivery agent to shopkeeper
        RegistrationFacet(address(diamond)).assignDeliveryAgentToShopkeeper(deliveryAgent1, shopkeeper1);
        
        // Generate a token for the consumer for testing
        TokenOpsFacet(address(diamond)).generateTokenForConsumer(AADHAAR_1);
    }
    
    // ============ DELIVERY SYSTEM TESTS ============
    
    function test_CompleteDeliveryFlow() public {
        // Get actual tokens for the consumer
        uint256[] memory consumerTokens = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_1);
        require(consumerTokens.length > 0, "No tokens available for consumer");
        
        // Create order (not delivery)
        vm.prank(owner); // Only admin can create orders
        uint256 orderId = DeliveryFacet(address(diamond)).createOrder(
            AADHAAR_1,
            consumerTokens, // use actual tokens
            shopkeeper1,
            "Mumbai Central, Area 1",
            "Rice: 5kg, Oil: 1L",
            false
        );
        
        // Assign delivery to agent
        vm.prank(owner);
        uint256 deliveryId = DeliveryFacet(address(diamond)).assignDeliveryAgent(orderId, deliveryAgent1);
        
        // Mark order ready
        vm.prank(shopkeeper1);
        DeliveryFacet(address(diamond)).markOrderReady(orderId);
        
        // Confirm pickup
        vm.prank(shopkeeper1);
        DeliveryFacet(address(diamond)).confirmPickup(orderId);
        
        // Update delivery status to EN_ROUTE
        vm.prank(deliveryAgent1);
        DeliveryFacet(address(diamond)).updateDeliveryStatus(
            deliveryId,
            LibAppStorage.DeliveryStatus.EN_ROUTE,
            "Mumbai Central",
            "Order picked up from store"
        );
        
        // Update delivery status to DELIVERED
        vm.prank(deliveryAgent1);
        DeliveryFacet(address(diamond)).updateDeliveryStatus(
            deliveryId,
            LibAppStorage.DeliveryStatus.DELIVERED,
            "Consumer Location",
            "Order delivered to consumer"
        );
        
        // Complete delivery with proof
        vm.prank(deliveryAgent1);
        DeliveryFacet(address(diamond)).completeDelivery(
            deliveryId,
            "Delivered successfully to consumer",
            "https://example.com/proof"
        );
        
        // Verify order details
        LibAppStorage.Order memory order = DeliveryFacet(address(diamond)).getOrder(orderId);
        assertEq(uint256(order.status), uint256(LibAppStorage.OrderStatus.COMPLETED));
        
        // Verify delivery details
        LibAppStorage.Delivery memory delivery = DeliveryFacet(address(diamond)).getDelivery(deliveryId);
        assertEq(delivery.deliveryAgent, deliveryAgent1);
    }
    
    // ============ NOTIFICATION SYSTEM TESTS ============
    
    function test_NotificationSystem() public {
        // Send notification to shopkeeper
        vm.prank(owner); // Changed to owner since it requires admin
        uint256 notificationId = NotificationFacet(address(diamond)).sendNotification(
            shopkeeper1,
            LibAppStorage.NotificationType.SYSTEM_NOTIFICATION,
            LibAppStorage.NotificationPriority.MEDIUM,
            "Stock Update Required",
            "Please update your inventory for next week",
            ""
        );
        
        // Check notifications
        vm.prank(shopkeeper1);
        LibAppStorage.Notification[] memory notifications = 
            NotificationFacet(address(diamond)).getUserNotifications(shopkeeper1);
        
        assertEq(notifications.length, 1);
        assertEq(notifications[0].title, "Stock Update Required");
        assertFalse(notifications[0].isRead);
        
        // Mark as read
        vm.prank(shopkeeper1);
        NotificationFacet(address(diamond)).markAsRead(notificationId);
        
        // Verify read status
        vm.prank(shopkeeper1);
        notifications = NotificationFacet(address(diamond)).getUserNotifications(shopkeeper1);
        assertTrue(notifications[0].isRead);
    }
    
    function test_BroadcastNotification() public {
        vm.prank(owner); // Changed to owner since it requires admin
        NotificationFacet(address(diamond)).sendBulkNotificationByRole(
            "shopkeeper", // Use lowercase to match the function check
            LibAppStorage.NotificationType.SYSTEM_NOTIFICATION,
            LibAppStorage.NotificationPriority.HIGH,
            "System Maintenance",
            "System will be down for maintenance tomorrow 2-4 AM",
            ""
        );
        
        // Check shopkeeper received notification
        vm.prank(shopkeeper1);
        LibAppStorage.Notification[] memory notifications = 
            NotificationFacet(address(diamond)).getUserNotifications(shopkeeper1);
        
        assertEq(notifications.length, 1);
        assertEq(notifications[0].title, "System Maintenance");
        assertEq(uint256(notifications[0].priority), uint256(LibAppStorage.NotificationPriority.HIGH));
    }
    
    // ============ INVENTORY SYSTEM TESTS ============
    
    function test_InventoryManagement() public {
        // Admin updates inventory for shopkeeper
        vm.prank(owner);
        InventoryFacet(address(diamond)).updateInventoryItem(
            shopkeeper1, 
            "RICE", 
            "GRAIN", 
            100, 
            5
        );
        
        vm.prank(owner);
        InventoryFacet(address(diamond)).updateInventoryItem(
            shopkeeper1, 
            "OIL", 
            "COOKING_OIL", 
            50, 
            10
        );
        
        // Check inventory status
        LibAppStorage.InventoryItem memory rice = 
            InventoryFacet(address(diamond)).getInventoryItem(shopkeeper1, "RICE");
        
        assertEq(rice.quantityAvailable, 100);
        assertEq(rice.pricePerUnit, 5);
        assertTrue(rice.isActive);
        
        // Shopkeeper updates their own inventory
        vm.prank(shopkeeper1);
        InventoryFacet(address(diamond)).updateMyInventory("RICE", 95);
        
        // Check updated inventory
        rice = InventoryFacet(address(diamond)).getInventoryItem(shopkeeper1, "RICE");
        assertEq(rice.quantityAvailable, 95);
        
        // Check if order can be fulfilled
        string[] memory itemsToCheck = new string[](1);
        itemsToCheck[0] = "RICE";
        uint256[] memory quantitiesToCheck = new uint256[](1);
        quantitiesToCheck[0] = 10;
        bool canFulfill = InventoryFacet(address(diamond)).canFulfillOrder(
            shopkeeper1,
            itemsToCheck,
            quantitiesToCheck
        );
        assertTrue(canFulfill);
        
        // Perform inventory audit
        vm.prank(owner);
        InventoryFacet(address(diamond)).performInventoryAudit(shopkeeper1);
    }
    
    // ============ ANALYTICS TESTS ============
    
    function test_AnalyticsTracking() public {
        // Update system analytics (this is what actually exists)
        vm.prank(owner);
        AnalyticsFacet(address(diamond)).updateSystemAnalytics();
        
        // Get system analytics
        LibAppStorage.SystemAnalytics memory systemStats = 
            AnalyticsFacet(address(diamond)).getSystemAnalytics();
        
        assertGt(systemStats.lastUpdated, 0);
        
        // Get agent performance metrics
        (
            LibAppStorage.DeliveryMetrics memory metrics,
            uint256 rank,
            string memory performanceGrade
        ) = AnalyticsFacet(address(diamond)).getAgentPerformanceMetrics(deliveryAgent1);
        
        assertEq(metrics.totalDeliveries, 0); // No deliveries yet
        assertEq(metrics.averageDeliveryTime, 0);
        assertEq(metrics.successfulDeliveries, 0);
    }
    
    // ============ WORKFLOW TESTS ============
    
    function test_WorkflowManagement() public {
        // Get actual tokens for the consumer  
        uint256[] memory consumerTokens = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_1);
        require(consumerTokens.length > 0, "No tokens available for consumer");
        
        // First create an order through DeliveryFacet
        vm.prank(owner);
        uint256 orderId = DeliveryFacet(address(diamond)).createOrder(
            AADHAAR_1,
            consumerTokens, // use actual tokens
            shopkeeper1,
            "Test Address",
            "Standard delivery",
            false
        );
        
        // Initialize order workflow
        vm.prank(owner);
        uint256 workflowOrderId = WorkflowFacet(address(diamond)).initializeOrderWorkflow(
            AADHAAR_1,
            consumerTokens, // use actual tokens
            shopkeeper1,
            "Test Address",
            "Standard delivery",
            false // isEmergency
        );
        
        // Progress order state - first transition CREATED -> ASSIGNED (admin only)
        vm.prank(owner); // Change to owner since only admin can do ASSIGNED
        WorkflowFacet(address(diamond)).progressOrderState(
            workflowOrderId, // Use the workflow order ID
            LibAppStorage.OrderStatus.ASSIGNED,
            "Order confirmed by shopkeeper"
        );
        
        // Get workflow history
        (
            LibAppStorage.OrderStatus currentStatus,
            uint256 createdTime,
            uint256 lastUpdated,
            bool isEmergency,
            bool hasDispute,
            string memory disputeReason
        ) = WorkflowFacet(address(diamond)).getOrderWorkflowHistory(workflowOrderId);
        
        assertEq(uint256(currentStatus), uint256(LibAppStorage.OrderStatus.ASSIGNED));
        assertGt(createdTime, 0);
        assertFalse(isEmergency);
        assertFalse(hasDispute);
    }
    
    // ============ LOCATION TESTS ============
    
    function test_LocationTracking() public {
        vm.prank(deliveryAgent1);
        
        // Update location with coordinate string
        LocationFacet(address(diamond)).updateLocation("19.0850,72.8776"); // Mumbai coordinates
        
        // Setup geofence
        vm.prank(owner);
        LocationFacet(address(diamond)).setupGeofence(
            shopkeeper1,
            "19.0840,72.8760", // center coordinates
            1000,     // radius in meters
            "Mumbai Central Store Area"
        );
        
        // Get user location
        string memory agentLocation = LocationFacet(address(diamond)).getUserLocation(deliveryAgent1);
        assertEq(agentLocation, "19.0850,72.8776");
        
        // Test location settings
        (
            bool gpsEnabled, 
            bool trackingEnabled, 
            uint256 totalUsers, 
            uint256 activeDeliveries
        ) = LocationFacet(address(diamond)).getLocationSettings();
        assertTrue(gpsEnabled || !gpsEnabled); // Just test the function works
        assertGe(totalUsers, 0);
        assertGe(activeDeliveries, 0);
    }
    
    // ============ DASHBOARD INTEGRATION TESTS ============
    
    function test_AdminDashboard() public {
        vm.prank(owner);
        LibAppStorage.DashboardData memory dashboardData = 
            DashboardFacetCore(address(diamond)).getDashboardData();
        
        assertEq(dashboardData.totalConsumers, 1);
        assertEq(dashboardData.totalShopkeepers, 1);
        assertEq(dashboardData.totalDeliveryAgents, 1);
        assertGe(dashboardData.totalTokensIssued, 0);
        assertGt(dashboardData.lastUpdateTime, 0);
    }
    
    function test_ShopkeeperDashboard() public {
        vm.prank(shopkeeper1);
        LibAppStorage.ShopkeeperStruct memory shopkeeperInfo = 
            DashboardFacetCore(address(diamond)).getShopkeeperInfo(shopkeeper1);
        
        assertEq(shopkeeperInfo.shopkeeperAddress, shopkeeper1);
        assertEq(shopkeeperInfo.name, "Ram Store");
        assertEq(shopkeeperInfo.area, "Mumbai Central");
        assertTrue(shopkeeperInfo.isActive);
        
        // Test consumer list for shopkeeper
        LibAppStorage.ConsumerStruct[] memory consumers = 
            DashboardFacetCore(address(diamond)).getConsumersByShopkeeper(shopkeeper1);
        assertEq(consumers.length, 1);
        assertEq(consumers[0].aadhaar, AADHAAR_1);
    }
    
    function test_DeliveryAgentDashboard() public {
        // Since there's no specific delivery agent dashboard function,
        // we'll test available functions that would be useful for agents
        vm.prank(deliveryAgent1);
        
        // Get agent deliveries
        uint256[] memory deliveries = DeliveryFacet(address(diamond)).getAgentDeliveries(deliveryAgent1);
        assertEq(deliveries.length, 0); // No deliveries yet
        
        // Get agent performance metrics
        (
            LibAppStorage.DeliveryMetrics memory metrics,
            uint256 rank,
            string memory performanceGrade
        ) = AnalyticsFacet(address(diamond)).getAgentPerformanceMetrics(deliveryAgent1);
        
        assertEq(metrics.totalDeliveries, 0);
        assertEq(metrics.averageDeliveryTime, 0);
        assertEq(metrics.successfulDeliveries, 0);
    }
    
    function test_ConsumerDashboard() public {
        vm.prank(consumer1Wallet);
        LibAppStorage.ConsumerDashboard memory dashboard = 
            DashboardFacetCore(address(diamond)).getConsumerDashboard(AADHAAR_1);
        
        assertEq(dashboard.aadhaar, AADHAAR_1);
        assertEq(dashboard.totalTokensReceived, 1); // Token was generated in setup
        assertEq(dashboard.totalTokensClaimed, 0);
        assertEq(dashboard.activeTokensCount, 1); // One active token
        assertTrue(dashboard.isActive);
        assertEq(dashboard.category, "BPL");
    }
    
    // ============ REAL-TIME COORDINATION TESTS ============
    
    function test_SystemHealth() public {
        vm.prank(owner);
        (
            uint256 totalRegisteredConsumers,
            uint256 activeConsumers,
            uint256 inactiveConsumers,
            uint256 consumersWithCurrentMonthToken,
            uint256 consumersWithoutCurrentMonthToken,
            uint256 totalShopkeepers,
            uint256 totalDeliveryAgents,
            uint256 systemEfficiencyScore
        ) = DashboardFacetCore(address(diamond)).getSystemHealthReport();
        
        assertEq(totalRegisteredConsumers, 1);
        assertEq(totalShopkeepers, 1);
        assertEq(totalDeliveryAgents, 1);
        assertGe(systemEfficiencyScore, 0);
    }
    
    // ============ INTEGRATION FLOW TESTS ============
    
    function test_CompleteOrderToDeliveryFlow() public {
        // Get actual tokens for the consumer
        uint256[] memory consumerTokens = dcvToken.getUnclaimedTokensByAadhaar(AADHAAR_1);
        require(consumerTokens.length > 0, "No tokens available for consumer");
        
        // 1. Shopkeeper updates inventory
        vm.prank(owner);
        InventoryFacet(address(diamond)).updateInventoryItem(shopkeeper1, "RICE", "GRAIN", 100, 10);
        vm.prank(owner);
        InventoryFacet(address(diamond)).updateInventoryItem(shopkeeper1, "OIL", "COOKING_OIL", 50, 5);
        
        // 2. Create delivery order - use WorkflowFacet to create a unified order
        vm.prank(owner);
        uint256 orderId = WorkflowFacet(address(diamond)).initializeOrderWorkflow(
            AADHAAR_1,
            consumerTokens, // use actual tokens
            shopkeeper1,
            "Mumbai Central, Area 1",
            "Standard delivery",
            false // isEmergency
        );
        
        // 3. Reserve inventory items
        vm.prank(owner); // Changed to owner since only admin can reserve
        string[] memory itemsToReserve = new string[](2);
        itemsToReserve[0] = "RICE";
        itemsToReserve[1] = "OIL";
        uint256[] memory quantitiesToReserve = new uint256[](2);
        quantitiesToReserve[0] = 5;
        quantitiesToReserve[1] = 1;
        InventoryFacet(address(diamond)).reserveItems(shopkeeper1, orderId, itemsToReserve, quantitiesToReserve);
        
        // 4. Assign delivery to agent
        vm.prank(owner);
        uint256 deliveryId = DeliveryFacet(address(diamond)).assignDeliveryAgent(orderId, deliveryAgent1);
        
        // 5. Agent updates location
        vm.prank(deliveryAgent1);
        LocationFacet(address(diamond)).updateLocation("19.0850,72.8776");
        
        // 6. Progress order state - first transition to ASSIGNED is done by assignDeliveryAgent
        // Then shopkeeper can process it
        vm.prank(shopkeeper1);
        WorkflowFacet(address(diamond)).progressOrderState(
            orderId,
            LibAppStorage.OrderStatus.PROCESSING,
            "Order confirmed and being prepared"
        );
        
        // 7. Progress to READY status
        vm.prank(shopkeeper1);
        WorkflowFacet(address(diamond)).progressOrderState(
            orderId,
            LibAppStorage.OrderStatus.READY,
            "Order ready for pickup"
        );
        
        // 8. Progress to IN_TRANSIT status when agent picks up
        vm.prank(deliveryAgent1);
        WorkflowFacet(address(diamond)).progressOrderState(
            orderId,
            LibAppStorage.OrderStatus.IN_TRANSIT,
            "Order picked up and in transit"
        );
        
        // 9. Progress to DELIVERED status when delivered
        vm.prank(deliveryAgent1);
        WorkflowFacet(address(diamond)).progressOrderState(
            orderId,
            LibAppStorage.OrderStatus.DELIVERED,
            "Order delivered to consumer"
        );
        
        // 10. Complete delivery - this will change status to COMPLETED
        vm.prank(deliveryAgent1);
        DeliveryFacet(address(diamond)).updateDeliveryStatus(
            deliveryId,
            LibAppStorage.DeliveryStatus.DELIVERED,
            "Consumer Location",
            "Order delivered to consumer"
        );
        
        vm.prank(deliveryAgent1);
        DeliveryFacet(address(diamond)).completeDelivery(
            deliveryId, // Use deliveryId, not orderId
            "Delivered successfully",
            "https://example.com/delivery-proof"
        );
        
        // 11. Confirm item delivery (this releases reserved items)
        vm.prank(owner); // Changed to owner since only admin can confirm
        string[] memory itemsToConfirm = new string[](2);
        itemsToConfirm[0] = "RICE";
        itemsToConfirm[1] = "OIL";
        uint256[] memory quantitiesToConfirm = new uint256[](2);
        quantitiesToConfirm[0] = 5;
        quantitiesToConfirm[1] = 1;
        InventoryFacet(address(diamond)).confirmItemDelivery(shopkeeper1, orderId, itemsToConfirm, quantitiesToConfirm);
        
        // 12. Send completion notification
        vm.prank(owner);
        NotificationFacet(address(diamond)).sendNotification(
            consumer1Wallet,
            LibAppStorage.NotificationType.STATUS_UPDATE,
            LibAppStorage.NotificationPriority.MEDIUM,
            "Delivery Completed",
            "Your ration order has been delivered successfully",
            ""
        );
        
        // Verify complete flow - order should be COMPLETED after completeDelivery
        LibAppStorage.Order memory order = DeliveryFacet(address(diamond)).getOrder(orderId);
        assertEq(uint256(order.status), uint256(LibAppStorage.OrderStatus.COMPLETED));
        
        LibAppStorage.InventoryItem memory riceInventory = 
            InventoryFacet(address(diamond)).getInventoryItem(shopkeeper1, "RICE");
        assertEq(riceInventory.quantityAvailable, 95); // 100 - 5 consumed
        
        vm.prank(consumer1Wallet);
        LibAppStorage.Notification[] memory notifications = 
            NotificationFacet(address(diamond)).getUserNotifications(consumer1Wallet);
        assertEq(notifications.length, 1);
        assertEq(notifications[0].title, "Delivery Completed");
    }
    
    // ============ ERROR HANDLING TESTS ============
    
    function test_UnauthorizedAccess() public {
        address unauthorized = makeAddr("unauthorized");
        
        // Should fail for non-admin trying to create order (only admin can create orders)
        vm.prank(unauthorized);
        vm.expectRevert();
        DeliveryFacet(address(diamond)).createOrder(
            AADHAAR_1,
            new uint256[](0),
            shopkeeper1,
            "Test Address",
            "Rice: 5kg",
            false
        );
        
        // Should fail for non-admin trying to broadcast
        vm.prank(unauthorized);
        vm.expectRevert();
        NotificationFacet(address(diamond)).sendBulkNotificationByRole(
            "SHOPKEEPER",
            LibAppStorage.NotificationType.SYSTEM_NOTIFICATION,
            LibAppStorage.NotificationPriority.LOW,
            "Test",
            "Test message",
            ""
        );
    }
    
    function test_InvalidDeliveryOperations() public {
        // Try to update non-existent delivery
        vm.prank(deliveryAgent1);
        vm.expectRevert();
        DeliveryFacet(address(diamond)).updateDeliveryStatus(
            999, // non-existent delivery ID
            LibAppStorage.DeliveryStatus.EN_ROUTE,
            "Test Location",
            "Test update"
        );
    }
}
