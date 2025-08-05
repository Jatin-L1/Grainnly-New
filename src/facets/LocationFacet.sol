// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract LocationFacet {
    
    // ============ EVENTS ============
    event LocationUpdated(address indexed user, string newLocation, uint256 timestamp);
    event RouteOptimized(uint256 indexed deliveryId, string[] waypoints, uint256 estimatedTime);
    event GeofenceEntered(address indexed agent, uint256 indexed deliveryId, string location);
    event GeofenceExited(address indexed agent, uint256 indexed deliveryId, string location);
    event LocationTrackingEnabled(address indexed user, bool enabled);
    event EmergencyLocationAlert(address indexed user, string location, string reason);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only admin");
        _;
    }
    
    modifier onlyDeliveryAgent() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.deliveryAgents_[msg.sender], "Only delivery agent");
        _;
    }
    
    modifier onlyAuthorized() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(
            msg.sender == LibDiamond.contractOwner() || 
            s.admins[msg.sender] || 
            s.shopkeepers_[msg.sender] || 
            s.deliveryAgents_[msg.sender], 
            "Not authorized"
        );
        _;
    }
    
    modifier gpsEnabled() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.gpsIntegrationEnabled, "GPS integration disabled");
        _;
    }
    
    // ============ LOCATION MANAGEMENT ============
    
    /**
     * @dev Update user location
     */
    function updateLocation(string memory coordinates) external onlyAuthorized gpsEnabled {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(bytes(coordinates).length > 0, "Coordinates cannot be empty");
        require(_isValidCoordinates(coordinates), "Invalid coordinate format");
        
        s.userLocations[msg.sender] = coordinates;
        
        // If delivery agent, update current delivery location
        if (s.deliveryAgents_[msg.sender]) {
            _updateActiveDeliveryLocation(msg.sender, coordinates);
        }
        
        emit LocationUpdated(msg.sender, coordinates, block.timestamp);
    }
    
    /**
     * @dev Set delivery route with waypoints
     */
    function setDeliveryRoute(
        uint256 deliveryId,
        string[] memory waypoints,
        uint256 estimatedTime
    ) external onlyAdmin gpsEnabled {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveries[deliveryId].deliveryId != 0, "Delivery not found");
        require(waypoints.length >= 2, "Route must have at least 2 waypoints");
        
        s.deliveryRoute[deliveryId] = waypoints;
        s.deliveries[deliveryId].estimatedDelivery = block.timestamp + estimatedTime;
        
        emit RouteOptimized(deliveryId, waypoints, estimatedTime);
    }
    
    /**
     * @dev Auto-generate optimized route for delivery
     */
    function generateOptimizedRoute(uint256 deliveryId) external onlyAdmin gpsEnabled returns (string[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveries[deliveryId].deliveryId != 0, "Delivery not found");
        
        LibAppStorage.Delivery memory delivery = s.deliveries[deliveryId];
        LibAppStorage.Order memory order = s.orders[delivery.orderId];
        
        // Get shopkeeper location
        string memory shopLocation = s.userLocations[order.shopkeeper];
        require(bytes(shopLocation).length > 0, "Shopkeeper location not set");
        
        // Create optimized route
        string[] memory waypoints = new string[](3);
        waypoints[0] = s.userLocations[delivery.deliveryAgent]; // Agent current location
        waypoints[1] = shopLocation; // Pickup location
        waypoints[2] = order.deliveryAddress; // Delivery location
        
        // Store route
        s.deliveryRoute[deliveryId] = waypoints;
        
        // Calculate estimated time (simplified - 30 minutes per waypoint)
        uint256 estimatedTime = waypoints.length * 1800; // 30 minutes per waypoint
        s.deliveries[deliveryId].estimatedDelivery = block.timestamp + estimatedTime;
        
        emit RouteOptimized(deliveryId, waypoints, estimatedTime);
        
        return waypoints;
    }
    
    /**
     * @dev Update delivery agent's current location during delivery
     */
    function updateDeliveryLocation(
        uint256 deliveryId,
        string memory currentLocation
    ) external onlyDeliveryAgent gpsEnabled {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.deliveries[deliveryId].deliveryAgent == msg.sender, "Not assigned to you");
        require(bytes(currentLocation).length > 0, "Location cannot be empty");
        require(_isValidCoordinates(currentLocation), "Invalid coordinate format");
        
        s.deliveries[deliveryId].currentLocation = currentLocation;
        s.userLocations[msg.sender] = currentLocation;
        
        // Check if agent entered/exited geofences
        _checkGeofences(deliveryId, msg.sender, currentLocation);
        
        emit LocationUpdated(msg.sender, currentLocation, block.timestamp);
    }
    
    /**
     * @dev Set up geofences for important locations
     */
    function setupGeofence(
        address user,
        string memory location,
        uint256 radius,
        string memory description
    ) external onlyAdmin gpsEnabled {
        // Simplified geofence setup - in production this would integrate with mapping services
        // Store geofence data in a separate mapping if needed
        emit LocationTrackingEnabled(user, true);
    }
    
    /**
     * @dev Track delivery progress along route
     */
    function trackDeliveryProgress(uint256 deliveryId) external view gpsEnabled returns (
        string memory currentLocation,
        string[] memory routeWaypoints,
        uint256 nextWaypointIndex,
        uint256 estimatedTimeToDestination,
        uint256 progressPercentage
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Delivery memory delivery = s.deliveries[deliveryId];
        currentLocation = delivery.currentLocation;
        routeWaypoints = s.deliveryRoute[deliveryId];
        
        // Simplified progress calculation
        if (routeWaypoints.length > 0) {
            if (delivery.status == LibAppStorage.DeliveryStatus.ASSIGNED || 
                delivery.status == LibAppStorage.DeliveryStatus.EN_ROUTE) {
                nextWaypointIndex = 1; // Going to pickup
                progressPercentage = 25;
            } else if (delivery.status == LibAppStorage.DeliveryStatus.PICKED_UP ||
                       delivery.status == LibAppStorage.DeliveryStatus.OUT_FOR_DELIVERY) {
                nextWaypointIndex = 2; // Going to delivery
                progressPercentage = 75;
            } else {
                nextWaypointIndex = routeWaypoints.length; // Completed
                progressPercentage = 100;
            }
        }
        
        // Calculate estimated time (simplified)
        if (delivery.estimatedDelivery > block.timestamp) {
            estimatedTimeToDestination = delivery.estimatedDelivery - block.timestamp;
        } else {
            estimatedTimeToDestination = 0;
        }
        
        return (currentLocation, routeWaypoints, nextWaypointIndex, estimatedTimeToDestination, progressPercentage);
    }
    
    /**
     * @dev Get nearby delivery agents for emergency reassignment
     */
    function getNearbyDeliveryAgents(
        string memory location,
        uint256 radiusKm
    ) external view gpsEnabled returns (
        address[] memory agents,
        string[] memory locations,
        uint256[] memory distances
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 nearbyCount = 0;
        
        // Count nearby agents (simplified distance calculation)
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address agent = s.allDeliveryAgents[i];
            string memory agentLocation = s.userLocations[agent];
            
            if (bytes(agentLocation).length > 0 && 
                _isWithinRadius(location, agentLocation, radiusKm)) {
                nearbyCount++;
            }
        }
        
        agents = new address[](nearbyCount);
        locations = new string[](nearbyCount);
        distances = new uint256[](nearbyCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            address agent = s.allDeliveryAgents[i];
            string memory agentLocation = s.userLocations[agent];
            
            if (bytes(agentLocation).length > 0 && 
                _isWithinRadius(location, agentLocation, radiusKm)) {
                agents[index] = agent;
                locations[index] = agentLocation;
                distances[index] = _calculateDistance(location, agentLocation);
                index++;
            }
        }
        
        return (agents, locations, distances);
    }
    
    /**
     * @dev Emergency location alert
     */
    function sendEmergencyLocationAlert(
        address user,
        string memory reason
    ) external onlyAdmin gpsEnabled {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        string memory userLocation = s.userLocations[user];
        require(bytes(userLocation).length > 0, "User location not available");
        
        emit EmergencyLocationAlert(user, userLocation, reason);
        
        // Find nearby agents for emergency response
        (address[] memory nearbyAgents,,) = this.getNearbyDeliveryAgents(userLocation, 5); // 5km radius
        
        // Notify nearby agents (would integrate with NotificationFacet)
        for (uint256 i = 0; i < nearbyAgents.length; i++) {
            // Send emergency notification to nearby agents
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get user's current location
     */
    function getUserLocation(address user) external view returns (string memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.userLocations[user];
    }
    
    /**
     * @dev Get delivery route
     */
    function getDeliveryRoute(uint256 deliveryId) external view returns (string[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.deliveryRoute[deliveryId];
    }
    
    /**
     * @dev Get all active delivery locations
     */
    function getActiveDeliveryLocations() external view gpsEnabled returns (
        uint256[] memory deliveryIds,
        address[] memory agents,
        string[] memory locations,
        LibAppStorage.DeliveryStatus[] memory statuses
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 activeCount = 0;
        
        // Count active deliveries
        for (uint256 i = 1; i <= s.nextDeliveryId; i++) {
            LibAppStorage.Delivery memory delivery = s.deliveries[i];
            if (delivery.deliveryId != 0 && 
                delivery.status != LibAppStorage.DeliveryStatus.CONFIRMED &&
                delivery.status != LibAppStorage.DeliveryStatus.FAILED &&
                delivery.status != LibAppStorage.DeliveryStatus.CANCELLED &&
                bytes(delivery.currentLocation).length > 0) {
                activeCount++;
            }
        }
        
        deliveryIds = new uint256[](activeCount);
        agents = new address[](activeCount);
        locations = new string[](activeCount);
        statuses = new LibAppStorage.DeliveryStatus[](activeCount);
        
        uint256 index = 0;
        for (uint256 i = 1; i <= s.nextDeliveryId; i++) {
            LibAppStorage.Delivery memory delivery = s.deliveries[i];
            if (delivery.deliveryId != 0 && 
                delivery.status != LibAppStorage.DeliveryStatus.CONFIRMED &&
                delivery.status != LibAppStorage.DeliveryStatus.FAILED &&
                delivery.status != LibAppStorage.DeliveryStatus.CANCELLED &&
                bytes(delivery.currentLocation).length > 0) {
                
                deliveryIds[index] = delivery.deliveryId;
                agents[index] = delivery.deliveryAgent;
                locations[index] = delivery.currentLocation;
                statuses[index] = delivery.status;
                index++;
            }
        }
        
        return (deliveryIds, agents, locations, statuses);
    }
    
    /**
     * @dev Calculate ETA for delivery
     */
    function calculateDeliveryETA(uint256 deliveryId) external view gpsEnabled returns (
        uint256 estimatedTimeMinutes,
        string memory etaDescription
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Delivery memory delivery = s.deliveries[deliveryId];
        require(delivery.deliveryId != 0, "Delivery not found");
        
        if (delivery.estimatedDelivery > block.timestamp) {
            estimatedTimeMinutes = (delivery.estimatedDelivery - block.timestamp) / 60;
            
            if (estimatedTimeMinutes <= 15) {
                etaDescription = "Arriving soon (within 15 minutes)";
            } else if (estimatedTimeMinutes <= 30) {
                etaDescription = "Arriving within 30 minutes";
            } else if (estimatedTimeMinutes <= 60) {
                etaDescription = "Arriving within 1 hour";
            } else {
                etaDescription = "Arriving in more than 1 hour";
            }
        } else {
            estimatedTimeMinutes = 0;
            etaDescription = "Delivery overdue";
        }
        
        return (estimatedTimeMinutes, etaDescription);
    }
    
    /**
     * @dev Get location history for a delivery
     */
    function getDeliveryLocationHistory(uint256 deliveryId) external view returns (
        string[] memory locationHistory,
        uint256[] memory timestamps
    ) {
        // Simplified - in production this would maintain a history log
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        string[] memory route = s.deliveryRoute[deliveryId];
        locationHistory = new string[](route.length);
        timestamps = new uint256[](route.length);
        
        for (uint256 i = 0; i < route.length; i++) {
            locationHistory[i] = route[i];
            timestamps[i] = block.timestamp - (route.length - i) * 1800; // Estimated times
        }
        
        return (locationHistory, timestamps);
    }
    
    // ============ SYSTEM CONFIGURATION ============
    
    /**
     * @dev Enable/disable GPS integration
     */
    function setGPSIntegration(bool enabled) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.gpsIntegrationEnabled = enabled;
    }
    
    /**
     * @dev Enable/disable real-time tracking
     */
    function setRealTimeTracking(bool enabled) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        s.realTimeTrackingEnabled = enabled;
    }
    
    /**
     * @dev Get system location settings
     */
    function getLocationSettings() external view returns (
        bool gpsIntegrationEnabled,
        bool realTimeEnabled,
        uint256 totalUsersWithLocation,
        uint256 activeDeliveries
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        gpsIntegrationEnabled = s.gpsIntegrationEnabled;
        realTimeEnabled = s.realTimeTrackingEnabled;
        activeDeliveries = s.systemAnalytics.activeDeliveries;
        
        // Count users with location set
        totalUsersWithLocation = 0;
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            if (bytes(s.userLocations[s.allShopkeepers[i]]).length > 0) {
                totalUsersWithLocation++;
            }
        }
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            if (bytes(s.userLocations[s.allDeliveryAgents[i]]).length > 0) {
                totalUsersWithLocation++;
            }
        }
        
        return (gpsIntegrationEnabled, realTimeEnabled, totalUsersWithLocation, activeDeliveries);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _isValidCoordinates(string memory coordinates) internal pure returns (bool) {
        bytes memory coordBytes = bytes(coordinates);
        
        // Basic validation - check if coordinates contain comma (lat,lng format)
        bool hasComma = false;
        for (uint256 i = 0; i < coordBytes.length; i++) {
            if (coordBytes[i] == ",") {
                hasComma = true;
                break;
            }
        }
        
        return hasComma && coordBytes.length > 5; // Minimum valid coordinate length
    }
    
    function _updateActiveDeliveryLocation(address agent, string memory location) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Find active delivery for this agent
        uint256[] memory agentDeliveries = s.agentDeliveries[agent];
        for (uint256 i = 0; i < agentDeliveries.length; i++) {
            LibAppStorage.Delivery storage delivery = s.deliveries[agentDeliveries[i]];
            if (delivery.status != LibAppStorage.DeliveryStatus.CONFIRMED &&
                delivery.status != LibAppStorage.DeliveryStatus.FAILED &&
                delivery.status != LibAppStorage.DeliveryStatus.CANCELLED) {
                delivery.currentLocation = location;
                break;
            }
        }
    }
    
    function _checkGeofences(uint256 deliveryId, address agent, string memory location) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order memory order = s.orders[s.deliveries[deliveryId].orderId];
        
        // Check if agent is near shopkeeper location
        string memory shopLocation = s.userLocations[order.shopkeeper];
        if (bytes(shopLocation).length > 0 && _isWithinRadius(location, shopLocation, 1)) { // 1km radius
            emit GeofenceEntered(agent, deliveryId, "shopkeeper_location");
        }
        
        // Check if agent is near delivery location
        if (_isWithinRadius(location, order.deliveryAddress, 1)) { // 1km radius
            emit GeofenceEntered(agent, deliveryId, "delivery_location");
        }
    }
    
    function _isWithinRadius(
        string memory location1,
        string memory location2,
        uint256 radiusKm
    ) internal pure returns (bool) {
        // Simplified distance check - in production this would use proper geospatial calculations
        // For now, just check if coordinates are similar (basic string comparison)
        return keccak256(abi.encodePacked(location1)) == keccak256(abi.encodePacked(location2));
    }
    
    function _calculateDistance(
        string memory location1,
        string memory location2
    ) internal pure returns (uint256) {
        // Simplified distance calculation - returns distance in meters
        // In production, this would use Haversine formula for accurate distance
        if (keccak256(abi.encodePacked(location1)) == keccak256(abi.encodePacked(location2))) {
            return 0;
        }
        return 1000; // Default 1km for demonstration
    }
}
