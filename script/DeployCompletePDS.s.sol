// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Diamond.sol";
import "../src/DiamondInit.sol";
import "../src/DCVToken.sol";
import "../src/interfaces/IDiamondCut.sol";
import "../src/interfaces/IDCVToken.sol";
import "../src/facets/DiamondCutFacet.sol";
import "../src/facets/DiamondLoupeFacet.sol";
import "../src/facets/RegistrationFacet.sol";
import "../src/facets/TokenOpsFacet.sol";
import "../src/facets/PaymentFacet.sol";
import "../src/facets/DashboardFacetCore.sol";
import "../src/facets/DashboardFacetSearch.sol";
import "../src/facets/DashboardFacetStats.sol";
import "../src/facets/DashboardFacetAdmin.sol";
import "../src/facets/DeliveryFacet.sol";
import "../src/facets/NotificationFacet.sol";
import "../src/facets/InventoryFacet.sol";
import "../src/facets/AnalyticsFacet.sol";
import "../src/facets/WorkflowFacet.sol";
import "../src/facets/LocationFacet.sol";
import "../src/facets/AuthenticationFacet.sol";
import "../src/libraries/LibDiamond.sol";

contract DeployCompletePDS is Script {
    
    struct DeploymentResult {
        address diamond;
        address dcvToken;
        address diamondInit;
        address[] facets;
        string[] facetNames;
        bytes4[][] selectors;
    }
    
    function run() external returns (DeploymentResult memory result) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Indian PDS System...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy DiamondInit
        DiamondInit diamondInit = new DiamondInit();
        result.diamondInit = address(diamondInit);
        console.log("DiamondInit deployed at:", address(diamondInit));
        
        // 2. Deploy DCVToken with required parameters
        DCVToken dcvToken = new DCVToken(
            "Digital Card Voucher",
            "DCV", 
            "https://api.rationcard.gov.in/metadata/{id}.json"
        );
        result.dcvToken = address(dcvToken);
        console.log("DCVToken deployed at:", address(dcvToken));
        
        // 3. Deploy all facets
        (address[] memory facets, string[] memory facetNames, bytes4[][] memory selectors) = deployAllFacets();
        result.facets = facets;
        result.facetNames = facetNames;
        result.selectors = selectors;
        
        // 4. Deploy Diamond with DiamondCutFacet
        Diamond diamond = new Diamond(deployer, facets[0]); // facets[0] is DiamondCutFacet
        result.diamond = address(diamond);
        console.log("Diamond deployed at:", address(diamond));
        
        // 5. Add all other facets to diamond
        IDiamondCut.FacetCut[] memory additionalCuts = new IDiamondCut.FacetCut[](facets.length - 1);
        for (uint256 i = 1; i < facets.length; i++) {
            additionalCuts[i-1] = IDiamondCut.FacetCut({
                facetAddress: facets[i],
                action: IDiamondCut.FacetCutAction.Add,
                functionSelectors: selectors[i]
            });
        }
        
        // Prepare initialization call
        bytes memory initCalldata = abi.encodeWithSelector(
            DiamondInit.init.selector,
            address(dcvToken)
        );
        
        // Add facets to diamond
        IDiamondCut(address(diamond)).diamondCut(additionalCuts, address(diamondInit), initCalldata);
        console.log("All facets added to Diamond");
        
        // 6. Set Diamond as minter for DCVToken
        dcvToken.setMinter(address(diamond));
        console.log("Diamond set as DCVToken minter");
        
        // 7. Initialize system settings
        initializeSystemSettings(address(diamond));
        
        vm.stopBroadcast();
        
        // 8. Log deployment summary
        logDeploymentSummary(result);
        
        return result;
    }
    
    function deployAllFacets() internal returns (
        address[] memory facets,
        string[] memory facetNames,
        bytes4[][] memory selectors
    ) {
        facets = new address[](16);
        facetNames = new string[](16);
        selectors = new bytes4[][](16);
        
        // DiamondCutFacet
        DiamondCutFacet diamondCutFacet = new DiamondCutFacet();
        facets[0] = address(diamondCutFacet);
        facetNames[0] = "DiamondCutFacet";
        selectors[0] = getDiamondCutSelectors();
        console.log("DiamondCutFacet deployed at:", address(diamondCutFacet));
        
        // DiamondLoupeFacet
        DiamondLoupeFacet diamondLoupeFacet = new DiamondLoupeFacet();
        facets[1] = address(diamondLoupeFacet);
        facetNames[1] = "DiamondLoupeFacet";
        selectors[1] = getDiamondLoupeSelectors();
        console.log("DiamondLoupeFacet deployed at:", address(diamondLoupeFacet));
        
        // RegistrationFacet
        RegistrationFacet registrationFacet = new RegistrationFacet();
        facets[2] = address(registrationFacet);
        facetNames[2] = "RegistrationFacet";
        selectors[2] = getRegistrationSelectors();
        console.log("RegistrationFacet deployed at:", address(registrationFacet));
        
        // TokenOpsFacet
        TokenOpsFacet tokenOpsFacet = new TokenOpsFacet();
        facets[3] = address(tokenOpsFacet);
        facetNames[3] = "TokenOpsFacet";
        selectors[3] = getTokenOpsSelectors();
        console.log("TokenOpsFacet deployed at:", address(tokenOpsFacet));
        
        // PaymentFacet
        PaymentFacet paymentFacet = new PaymentFacet();
        facets[4] = address(paymentFacet);
        facetNames[4] = "PaymentFacet";
        selectors[4] = getPaymentSelectors();
        console.log("PaymentFacet deployed at:", address(paymentFacet));
        
        // DashboardFacetCore
        DashboardFacetCore dashboardFacet = new DashboardFacetCore();
        facets[5] = address(dashboardFacet);
        facetNames[5] = "DashboardFacetCore";
        selectors[5] = getDashboardCoreSelectors();
        console.log("DashboardFacetCore deployed at:", address(dashboardFacet));
        
        // DashboardFacetSearch
        DashboardFacetSearch dashboardSearchFacet = new DashboardFacetSearch();
        facets[6] = address(dashboardSearchFacet);
        facetNames[6] = "DashboardFacetSearch";
        selectors[6] = getDashboardSearchSelectors();
        console.log("DashboardFacetSearch deployed at:", address(dashboardSearchFacet));
        
        // DashboardFacetStats
        DashboardFacetStats dashboardStatsFacet = new DashboardFacetStats();
        facets[7] = address(dashboardStatsFacet);
        facetNames[7] = "DashboardFacetStats";
        selectors[7] = getDashboardStatsSelectors();
        console.log("DashboardFacetStats deployed at:", address(dashboardStatsFacet));
        
        // DashboardFacetAdmin
        DashboardFacetAdmin dashboardAdminFacet = new DashboardFacetAdmin();
        facets[8] = address(dashboardAdminFacet);
        facetNames[8] = "DashboardFacetAdmin";
        selectors[8] = getDashboardAdminSelectors();
        console.log("DashboardFacetAdmin deployed at:", address(dashboardAdminFacet));
        
        // DeliveryFacet
        DeliveryFacet deliveryFacet = new DeliveryFacet();
        facets[9] = address(deliveryFacet);
        facetNames[9] = "DeliveryFacet";
        selectors[9] = getDeliverySelectors();
        console.log("DeliveryFacet deployed at:", address(deliveryFacet));
        
        // NotificationFacet
        NotificationFacet notificationFacet = new NotificationFacet();
        facets[10] = address(notificationFacet);
        facetNames[10] = "NotificationFacet";
        selectors[10] = getNotificationSelectors();
        console.log("NotificationFacet deployed at:", address(notificationFacet));
        
        // InventoryFacet
        InventoryFacet inventoryFacet = new InventoryFacet();
        facets[11] = address(inventoryFacet);
        facetNames[11] = "InventoryFacet";
        selectors[11] = getInventorySelectors();
        console.log("InventoryFacet deployed at:", address(inventoryFacet));
        
        // AnalyticsFacet
        AnalyticsFacet analyticsFacet = new AnalyticsFacet();
        facets[12] = address(analyticsFacet);
        facetNames[12] = "AnalyticsFacet";
        selectors[12] = getAnalyticsSelectors();
        console.log("AnalyticsFacet deployed at:", address(analyticsFacet));
        
        // WorkflowFacet
        WorkflowFacet workflowFacet = new WorkflowFacet();
        facets[13] = address(workflowFacet);
        facetNames[13] = "WorkflowFacet";
        selectors[13] = getWorkflowSelectors();
        console.log("WorkflowFacet deployed at:", address(workflowFacet));
        
        // LocationFacet
        LocationFacet locationFacet = new LocationFacet();
        facets[14] = address(locationFacet);
        facetNames[14] = "LocationFacet";
        selectors[14] = getLocationSelectors();
        console.log("LocationFacet deployed at:", address(locationFacet));
        
        // AuthenticationFacet
        AuthenticationFacet authenticationFacet = new AuthenticationFacet();
        facets[15] = address(authenticationFacet);
        facetNames[15] = "AuthenticationFacet";
        selectors[15] = getAuthenticationSelectors();
        console.log("AuthenticationFacet deployed at:", address(authenticationFacet));
        
        return (facets, facetNames, selectors);
    }
    
    function initializeSystemSettings(address diamond) internal {
        console.log("Initializing system settings...");
        
        // Set initial ration amounts
        TokenOpsFacet(diamond).setRationAmount("BPL", 35000); // 35kg in grams
        TokenOpsFacet(diamond).setRationAmount("AAY", 35000); // 35kg in grams  
        TokenOpsFacet(diamond).setRationAmount("APL", 15000); // 15kg in grams
        
        // Enable payment system
        PaymentFacet(diamond).enablePaymentSystem();
        PaymentFacet(diamond).setSubsidyPercentage(50); // 50% subsidy
        
        // Set ration prices (per kg in wei - simplified for demo)
        PaymentFacet(diamond).setRationPrice("BPL", 2 ether); // 2 tokens per kg
        PaymentFacet(diamond).setRationPrice("AAY", 1 ether); // 1 token per kg
        PaymentFacet(diamond).setRationPrice("APL", 5 ether); // 5 tokens per kg
        
        // Enable GPS and tracking
        LocationFacet(diamond).setGPSIntegration(true);
        
        console.log("System settings initialized successfully");
    }
    
    function logDeploymentSummary(DeploymentResult memory result) internal view {
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Diamond Address:", result.diamond);
        console.log("DCVToken Address:", result.dcvToken);
        console.log("DiamondInit Address:", result.diamondInit);
        console.log("\nFacets Deployed:");
        
        for (uint256 i = 0; i < result.facets.length; i++) {
            console.log(string(abi.encodePacked(
                result.facetNames[i], ": ", 
                vm.toString(result.facets[i])
            )));
        }
        
        console.log("\n=== NEXT STEPS ===");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Register initial users (admins, shopkeepers, delivery agents)");
        console.log("3. Set up inventory for shopkeepers");
        console.log("4. Configure notification settings");
        console.log("5. Test the complete workflow");
        
        console.log("\n=== IMPORTANT ADDRESSES ===");
        console.log("Save these addresses for frontend integration:");
        console.log("DIAMOND_ADDRESS=", result.diamond);
        console.log("DCV_TOKEN_ADDRESS=", result.dcvToken);
    }
    
    // Function selectors for each facet
    function getDiamondCutSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DiamondCutFacet.diamondCut.selector;
        return selectors;
    }
    
    function getDiamondLoupeSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = DiamondLoupeFacet.facets.selector;
        selectors[1] = DiamondLoupeFacet.facetFunctionSelectors.selector;
        selectors[2] = DiamondLoupeFacet.facetAddresses.selector;
        selectors[3] = DiamondLoupeFacet.facetAddress.selector;
        return selectors;
    }
    
    function getRegistrationSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](16);
        selectors[0] = RegistrationFacet.setDCVTokenAddress.selector;
        selectors[1] = RegistrationFacet.getDCVTokenAddress.selector;
        selectors[2] = RegistrationFacet.registerConsumer.selector;
        selectors[3] = RegistrationFacet.registerShopkeeper.selector;
        selectors[4] = RegistrationFacet.registerDeliveryAgent.selector;
        selectors[5] = RegistrationFacet.bulkRegisterConsumers.selector;
        selectors[6] = RegistrationFacet.assignDeliveryAgentToShopkeeper.selector;
        selectors[7] = RegistrationFacet.linkConsumerWallet.selector;
        selectors[8] = RegistrationFacet.updateRationAmount.selector;
        selectors[9] = RegistrationFacet.updateDCVTokenAddress.selector;
        selectors[10] = RegistrationFacet.deactivateConsumer.selector;
        selectors[11] = RegistrationFacet.reactivateConsumer.selector;
        selectors[12] = RegistrationFacet.deactivateShopkeeper.selector;
        selectors[13] = RegistrationFacet.reactivateShopkeeper.selector;
        selectors[14] = RegistrationFacet.deactivateDeliveryAgent.selector;
        selectors[15] = RegistrationFacet.reactivateDeliveryAgent.selector;
        return selectors;
    }
    
    function getTokenOpsSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](15);
        selectors[0] = TokenOpsFacet.generateMonthlyTokensForAll.selector;
        selectors[1] = TokenOpsFacet.generateTokenForConsumer.selector;
        selectors[2] = TokenOpsFacet.generateTokensForCategory.selector;
        selectors[3] = TokenOpsFacet.generateTokensForShopkeeper.selector;
        selectors[4] = TokenOpsFacet.bulkGenerateTokens.selector;
        selectors[5] = TokenOpsFacet.markRationDeliveredByAadhaar.selector;
        selectors[6] = TokenOpsFacet.confirmDeliveryByAgent.selector;
        selectors[7] = TokenOpsFacet.claimRationByConsumer.selector;
        selectors[8] = TokenOpsFacet.claimRationByWallet.selector;
        selectors[9] = TokenOpsFacet.expireOldTokens.selector;
        selectors[10] = TokenOpsFacet.getTokensForShopkeeper.selector;
        selectors[11] = TokenOpsFacet.canShopkeeperMarkDelivery.selector;
        selectors[12] = TokenOpsFacet.bulkMarkDeliveries.selector;
        selectors[13] = TokenOpsFacet.setRationAmount.selector;
        selectors[14] = TokenOpsFacet.getRationAmount.selector;
        return selectors;
    }
    
    function getPaymentSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = PaymentFacet.enablePaymentSystem.selector;
        selectors[1] = PaymentFacet.disablePaymentSystem.selector;
        selectors[2] = PaymentFacet.setRationPrice.selector;
        selectors[3] = PaymentFacet.setSubsidyPercentage.selector;
        selectors[4] = PaymentFacet.getRationPrice.selector;
        selectors[5] = PaymentFacet.getSubsidyPercentage.selector;
        selectors[6] = PaymentFacet.calculatePaymentAmount.selector;
        selectors[7] = PaymentFacet.initiatePayment.selector;
        selectors[8] = PaymentFacet.completePayment.selector;
        selectors[9] = PaymentFacet.failPayment.selector;
        selectors[10] = PaymentFacet.getPaymentRecord.selector;
        selectors[11] = PaymentFacet.getInvoice.selector;
        return selectors;
    }
    
    function getDashboardCoreSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = DashboardFacetCore.getDashboardData.selector;
        selectors[1] = DashboardFacetCore.getConsumerDashboard.selector;
        selectors[2] = DashboardFacetCore.getConsumerByAadhaar.selector;
        selectors[3] = DashboardFacetCore.getConsumersByCategory.selector;
        selectors[4] = DashboardFacetCore.getConsumersByShopkeeper.selector;
        selectors[5] = DashboardFacetCore.hasConsumerReceivedMonthlyToken.selector;
        selectors[6] = DashboardFacetCore.getConsumersWithoutMonthlyTokens.selector;
        selectors[7] = DashboardFacetCore.getSystemHealthReport.selector;
        selectors[8] = DashboardFacetCore.getCategoryWiseStats.selector;
        selectors[9] = DashboardFacetCore.getShopkeeperInfo.selector;
        return selectors;
    }
    
    function getDashboardSearchSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = DashboardFacetSearch.getConsumerByMobile.selector;
        selectors[1] = DashboardFacetSearch.searchConsumersByName.selector;
        selectors[2] = DashboardFacetSearch.getConsumersPaginated.selector;
        selectors[3] = DashboardFacetSearch.getConsumersNeedingEmergencyHelp.selector;
        return selectors;
    }
    
    function getDashboardStatsSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](11);
        selectors[0] = DashboardFacetStats.getAreaWiseStats.selector;
        selectors[1] = DashboardFacetStats.getConsumerDistributionHistory.selector;
        selectors[2] = DashboardFacetStats.getShopkeeperDistributionSummary.selector;
        selectors[3] = DashboardFacetStats.getSystemStatus.selector;
        selectors[4] = DashboardFacetStats.getTotalConsumers.selector;
        selectors[5] = DashboardFacetStats.getTotalShopkeepers.selector;
        selectors[6] = DashboardFacetStats.getTotalDeliveryAgents.selector;
        selectors[7] = DashboardFacetStats.getRationAmounts.selector;
        selectors[8] = DashboardFacetStats.isValidCategory.selector;
        selectors[9] = DashboardFacetStats.getWalletByAadhaar.selector;
        selectors[10] = DashboardFacetStats.getAadhaarByWallet.selector;
        return selectors;
    }
    
    function getDashboardAdminSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = DashboardFacetAdmin.getAdminDashboard.selector;
        selectors[1] = DashboardFacetAdmin.getShopkeeperDashboard.selector;
        selectors[2] = DashboardFacetAdmin.getDeliveryAgentDashboard.selector;
        selectors[3] = DashboardFacetAdmin.getActivityLogsForAI.selector;
        selectors[4] = DashboardFacetAdmin.getRecentActivityLogs.selector;
        selectors[5] = DashboardFacetAdmin.getActivityLogsByActor.selector;
        return selectors;
    }
    
    function getDeliverySelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](14);
        selectors[0] = DeliveryFacet.createOrder.selector;
        selectors[1] = DeliveryFacet.assignDeliveryAgent.selector;
        selectors[2] = DeliveryFacet.updateDeliveryStatus.selector;
        selectors[3] = DeliveryFacet.completeDelivery.selector;
        selectors[4] = DeliveryFacet.markOrderReady.selector;
        selectors[5] = DeliveryFacet.confirmPickup.selector;
        selectors[6] = DeliveryFacet.getOrder.selector;
        selectors[7] = DeliveryFacet.getDelivery.selector;
        selectors[8] = DeliveryFacet.getConsumerOrders.selector;
        selectors[9] = DeliveryFacet.getShopkeeperOrders.selector;
        selectors[10] = DeliveryFacet.getAgentDeliveries.selector;
        selectors[11] = DeliveryFacet.getActiveDeliveries.selector;
        selectors[12] = DeliveryFacet.getDeliveryMetrics.selector;
        selectors[13] = DeliveryFacet.escalateToEmergency.selector;
        return selectors;
    }
    
    function getNotificationSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = NotificationFacet.sendNotification.selector;
        selectors[1] = NotificationFacet.sendDeliveryAssignmentNotification.selector;
        selectors[2] = NotificationFacet.sendStatusUpdateNotification.selector;
        selectors[3] = NotificationFacet.sendEmergencyAlert.selector;
        selectors[4] = NotificationFacet.markAsRead.selector;
        selectors[5] = NotificationFacet.getUserNotifications.selector;
        selectors[6] = NotificationFacet.getUnreadNotifications.selector;
        selectors[7] = NotificationFacet.getNotificationCount.selector;
        selectors[8] = NotificationFacet.markAllAsRead.selector;
        selectors[9] = NotificationFacet.sendBulkNotificationByRole.selector;
        return selectors;
    }
    
    function getInventorySelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = InventoryFacet.updateInventoryItem.selector;
        selectors[1] = InventoryFacet.reserveItems.selector;
        selectors[2] = InventoryFacet.releaseReservedItems.selector;
        selectors[3] = InventoryFacet.confirmItemDelivery.selector;
        selectors[4] = InventoryFacet.updateMyInventory.selector;
        selectors[5] = InventoryFacet.getShopInventory.selector;
        selectors[6] = InventoryFacet.getInventoryItem.selector;
        selectors[7] = InventoryFacet.getLowStockItems.selector;
        selectors[8] = InventoryFacet.canFulfillOrder.selector;
        selectors[9] = InventoryFacet.performInventoryAudit.selector;
        return selectors;
    }
    
    function getAnalyticsSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = AnalyticsFacet.getSystemAnalytics.selector;
        selectors[1] = AnalyticsFacet.updateSystemAnalytics.selector;
        selectors[2] = AnalyticsFacet.getAgentPerformanceMetrics.selector;
        selectors[3] = AnalyticsFacet.getShopkeeperPerformanceMetrics.selector;
        selectors[4] = AnalyticsFacet.getPerformanceDashboard.selector;
        selectors[5] = AnalyticsFacet.getTopPerformingAgents.selector;
        selectors[6] = AnalyticsFacet.generatePerformanceAlerts.selector;
        selectors[7] = AnalyticsFacet.getTimeBasedAnalytics.selector;
        selectors[8] = AnalyticsFacet.exportAnalyticsData.selector;
        return selectors;
    }
    
    function getWorkflowSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](11);
        selectors[0] = WorkflowFacet.initializeOrderWorkflow.selector;
        selectors[1] = WorkflowFacet.progressOrderState.selector;
        selectors[2] = WorkflowFacet.autoProgressOrders.selector;
        selectors[3] = WorkflowFacet.initiateDispute.selector;
        selectors[4] = WorkflowFacet.resolveDispute.selector;
        selectors[5] = WorkflowFacet.handleEmergencyEscalation.selector;
        selectors[6] = WorkflowFacet.bulkProgressOrders.selector;
        selectors[7] = WorkflowFacet.getOrderWorkflowHistory.selector;
        selectors[8] = WorkflowFacet.isValidStateTransition.selector;
        selectors[9] = WorkflowFacet.getAvailableNextStates.selector;
        selectors[10] = WorkflowFacet.getOrdersRequiringAttention.selector;
        return selectors;
    }
    
    function getLocationSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](13);
        selectors[0] = LocationFacet.updateLocation.selector;
        selectors[1] = LocationFacet.setDeliveryRoute.selector;
        selectors[2] = LocationFacet.generateOptimizedRoute.selector;
        selectors[3] = LocationFacet.updateDeliveryLocation.selector;
        selectors[4] = LocationFacet.setupGeofence.selector;
        selectors[5] = LocationFacet.trackDeliveryProgress.selector;
        selectors[6] = LocationFacet.getNearbyDeliveryAgents.selector;
        selectors[7] = LocationFacet.getUserLocation.selector;
        selectors[8] = LocationFacet.getDeliveryRoute.selector;
        selectors[9] = LocationFacet.getActiveDeliveryLocations.selector;
        selectors[10] = LocationFacet.calculateDeliveryETA.selector;
        selectors[11] = LocationFacet.getLocationSettings.selector;
        selectors[12] = LocationFacet.setGPSIntegration.selector;
        return selectors;
    }
    
    function getAuthenticationSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = AuthenticationFacet.getUserRole.selector;
        selectors[1] = AuthenticationFacet.getUserRoleAndRedirect.selector;
        selectors[2] = AuthenticationFacet.login.selector;
        selectors[3] = AuthenticationFacet.logout.selector;
        selectors[4] = AuthenticationFacet.isRegisteredUser.selector;
        selectors[5] = AuthenticationFacet.isRegisteredAadhaar.selector;
        // Note: getConsumerByAadhaar is only in DashboardFacetCore to avoid conflicts
        return selectors;
    }
}
