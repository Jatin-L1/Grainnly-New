// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract NotificationFacet {
    
    // ============ EVENTS ============
    event NotificationSent(uint256 indexed notificationId, address indexed recipient, LibAppStorage.NotificationType notificationType);
    event NotificationRead(uint256 indexed notificationId, address indexed recipient);
    event BulkNotificationSent(LibAppStorage.NotificationType notificationType, uint256 recipientCount);
    event EmergencyAlert(string message, uint256 timestamp);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only admin");
        _;
    }
    
    modifier onlyRegisteredUser() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(
            s.shopkeepers_[msg.sender] || 
            s.deliveryAgents_[msg.sender] || 
            msg.sender == LibDiamond.contractOwner() || 
            s.admins[msg.sender] ||
            s.walletToAadhaar[msg.sender] != 0, 
            "Not a registered user"
        );
        _;
    }
    
    // ============ NOTIFICATION MANAGEMENT ============
    
    /**
     * @dev Send notification to a specific user (external interface)
     */
    function sendNotification(
        address recipient,
        LibAppStorage.NotificationType notificationType,
        LibAppStorage.NotificationPriority priority,
        string memory title,
        string memory message,
        string memory metadata
    ) external onlyAdmin returns (uint256) {
        return _sendNotification(recipient, notificationType, priority, title, message, metadata);
    }

    /**
     * @dev Internal function to send notification
     */
    function _sendNotification(
        address recipient,
        LibAppStorage.NotificationType notificationType,
        LibAppStorage.NotificationPriority priority,
        string memory title,
        string memory message,
        string memory metadata
    ) internal returns (uint256) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(recipient != address(0), "Invalid recipient");
        
        uint256 notificationId = ++s.nextNotificationId;
        uint256 expiryTime = block.timestamp + 30 days; // Default 30 days expiry
        
        if (priority == LibAppStorage.NotificationPriority.CRITICAL) {
            expiryTime = block.timestamp + 90 days; // Critical notifications last longer
        }
        
        s.notifications[notificationId] = LibAppStorage.Notification({
            notificationId: notificationId,
            recipient: recipient,
            notificationType: notificationType,
            priority: priority,
            title: title,
            message: message,
            metadata: metadata,
            timestamp: block.timestamp,
            isRead: false,
            isArchived: false,
            expiryTime: expiryTime
        });
        
        s.userNotifications[recipient].push(notificationId);
        
        emit NotificationSent(notificationId, recipient, notificationType);
        return notificationId;
    }
    
    /**
     * @dev Send delivery assignment notification
     */
    function sendDeliveryAssignmentNotification(
        address deliveryAgent,
        address shopkeeper,
        uint256 orderId,
        uint256 deliveryId,
        string memory deliveryAddress
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Notify delivery agent
        string memory agentMessage = string(abi.encodePacked(
            "New delivery assigned! Order #", 
            _uint2str(orderId),
            " - Pickup from shopkeeper and deliver to: ",
            deliveryAddress
        ));
        
        string memory agentMetadata = string(abi.encodePacked(
            '{"orderId":', _uint2str(orderId), 
            ',"deliveryId":', _uint2str(deliveryId),
            ',"shopkeeper":"', _addressToString(shopkeeper), '"}'
        ));
        
        _sendNotification(
            deliveryAgent,
            LibAppStorage.NotificationType.DELIVERY_ASSIGNMENT,
            LibAppStorage.NotificationPriority.HIGH,
            "New Delivery Assignment",
            agentMessage,
            agentMetadata
        );
        
        // Notify shopkeeper
        string memory shopMessage = string(abi.encodePacked(
            "Delivery agent assigned for Order #", 
            _uint2str(orderId),
            ". Please prepare the order for pickup."
        ));
        
        _sendNotification(
            shopkeeper,
            LibAppStorage.NotificationType.DELIVERY_ASSIGNMENT,
            LibAppStorage.NotificationPriority.MEDIUM,
            "Delivery Agent Assigned",
            shopMessage,
            agentMetadata
        );
    }
    
    /**
     * @dev Send status update notifications
     */
    function sendStatusUpdateNotification(
        uint256 orderId,
        LibAppStorage.DeliveryStatus status,
        string memory additionalInfo
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.Order memory order = s.orders[orderId];
        require(order.orderId != 0, "Order not found");
        
        address consumer = s.aadhaarToWallet[order.aadhaar];
        string memory statusMessage = _getStatusMessage(status, additionalInfo);
        
        string memory metadata = string(abi.encodePacked(
            '{"orderId":', _uint2str(orderId),
            ',"status":"', _getStatusString(status), '"}'
        ));
        
        // Notify consumer
        if (consumer != address(0)) {
            _sendNotification(
                consumer,
                LibAppStorage.NotificationType.STATUS_UPDATE,
                LibAppStorage.NotificationPriority.MEDIUM,
                "Delivery Status Update",
                statusMessage,
                metadata
            );
        }
        
        // Notify shopkeeper for relevant status updates
        if (status == LibAppStorage.DeliveryStatus.EN_ROUTE || 
            status == LibAppStorage.DeliveryStatus.ARRIVED) {
            _sendNotification(
                order.shopkeeper,
                LibAppStorage.NotificationType.STATUS_UPDATE,
                LibAppStorage.NotificationPriority.MEDIUM,
                "Delivery Status Update",
                statusMessage,
                metadata
            );
        }
    }
    
    /**
     * @dev Send emergency alert to all users
     */
    function sendEmergencyAlert(
        string memory alertMessage,
        string memory additionalInfo
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 recipientCount = 0;
        
        // Send to all shopkeepers
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            _sendNotification(
                s.allShopkeepers[i],
                LibAppStorage.NotificationType.EMERGENCY_ALERT,
                LibAppStorage.NotificationPriority.CRITICAL,
                "EMERGENCY ALERT",
                alertMessage,
                additionalInfo
            );
            recipientCount++;
        }
        
        // Send to all delivery agents
        for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
            _sendNotification(
                s.allDeliveryAgents[i],
                LibAppStorage.NotificationType.EMERGENCY_ALERT,
                LibAppStorage.NotificationPriority.CRITICAL,
                "EMERGENCY ALERT",
                alertMessage,
                additionalInfo
            );
            recipientCount++;
        }
        
        emit BulkNotificationSent(LibAppStorage.NotificationType.EMERGENCY_ALERT, recipientCount);
        emit EmergencyAlert(alertMessage, block.timestamp);
    }
    
    /**
     * @dev Send bulk notifications to users by role
     */
    function sendBulkNotificationByRole(
        string memory role, // "shopkeeper", "delivery", "consumer"
        LibAppStorage.NotificationType notificationType,
        LibAppStorage.NotificationPriority priority,
        string memory title,
        string memory message,
        string memory metadata
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 recipientCount = 0;
        
        if (keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("shopkeeper"))) {
            for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
                _sendNotification(s.allShopkeepers[i], notificationType, priority, title, message, metadata);
                recipientCount++;
            }
        } else if (keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("delivery"))) {
            for (uint256 i = 0; i < s.allDeliveryAgents.length; i++) {
                _sendNotification(s.allDeliveryAgents[i], notificationType, priority, title, message, metadata);
                recipientCount++;
            }
        } else if (keccak256(abi.encodePacked(role)) == keccak256(abi.encodePacked("consumer"))) {
            for (uint256 i = 0; i < s.allAadhaars.length; i++) {
                address consumerWallet = s.aadhaarToWallet[s.allAadhaars[i]];
                if (consumerWallet != address(0)) {
                    _sendNotification(consumerWallet, notificationType, priority, title, message, metadata);
                    recipientCount++;
                }
            }
        }
        
        emit BulkNotificationSent(notificationType, recipientCount);
    }
    
    // ============ USER NOTIFICATION FUNCTIONS ============
    
    /**
     * @dev Mark notification as read
     */
    function markAsRead(uint256 notificationId) external onlyRegisteredUser {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.notifications[notificationId].recipient == msg.sender, "Not your notification");
        require(!s.notifications[notificationId].isRead, "Already read");
        
        s.notifications[notificationId].isRead = true;
        
        emit NotificationRead(notificationId, msg.sender);
    }
    
    /**
     * @dev Archive notification
     */
    function archiveNotification(uint256 notificationId) external onlyRegisteredUser {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.notifications[notificationId].recipient == msg.sender, "Not your notification");
        
        s.notifications[notificationId].isArchived = true;
    }
    
    /**
     * @dev Mark all notifications as read for a user
     */
    function markAllAsRead() external onlyRegisteredUser {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256[] memory userNotifs = s.userNotifications[msg.sender];
        for (uint256 i = 0; i < userNotifs.length; i++) {
            if (!s.notifications[userNotifs[i]].isRead) {
                s.notifications[userNotifs[i]].isRead = true;
            }
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get all notifications for a user
     */
    function getUserNotifications(address user) external view returns (LibAppStorage.Notification[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256[] memory notificationIds = s.userNotifications[user];
        LibAppStorage.Notification[] memory notifications = new LibAppStorage.Notification[](notificationIds.length);
        
        for (uint256 i = 0; i < notificationIds.length; i++) {
            notifications[i] = s.notifications[notificationIds[i]];
        }
        
        return notifications;
    }
    
    /**
     * @dev Get unread notifications for a user
     */
    function getUnreadNotifications(address user) external view returns (LibAppStorage.Notification[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256[] memory notificationIds = s.userNotifications[user];
        uint256 unreadCount = 0;
        
        // Count unread notifications
        for (uint256 i = 0; i < notificationIds.length; i++) {
            if (!s.notifications[notificationIds[i]].isRead && !s.notifications[notificationIds[i]].isArchived) {
                unreadCount++;
            }
        }
        
        LibAppStorage.Notification[] memory unreadNotifications = new LibAppStorage.Notification[](unreadCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < notificationIds.length; i++) {
            if (!s.notifications[notificationIds[i]].isRead && !s.notifications[notificationIds[i]].isArchived) {
                unreadNotifications[index] = s.notifications[notificationIds[i]];
                index++;
            }
        }
        
        return unreadNotifications;
    }
    
    /**
     * @dev Get notification count for a user
     */
    function getNotificationCount(address user) external view returns (uint256 total, uint256 unread) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256[] memory notificationIds = s.userNotifications[user];
        total = notificationIds.length;
        unread = 0;
        
        for (uint256 i = 0; i < notificationIds.length; i++) {
            if (!s.notifications[notificationIds[i]].isRead && !s.notifications[notificationIds[i]].isArchived) {
                unread++;
            }
        }
    }
    
    /**
     * @dev Get notifications by priority
     */
    function getNotificationsByPriority(
        address user, 
        LibAppStorage.NotificationPriority priority
    ) external view returns (LibAppStorage.Notification[] memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256[] memory notificationIds = s.userNotifications[user];
        uint256 count = 0;
        
        // Count notifications with specified priority
        for (uint256 i = 0; i < notificationIds.length; i++) {
            if (s.notifications[notificationIds[i]].priority == priority) {
                count++;
            }
        }
        
        LibAppStorage.Notification[] memory filteredNotifications = new LibAppStorage.Notification[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < notificationIds.length; i++) {
            if (s.notifications[notificationIds[i]].priority == priority) {
                filteredNotifications[index] = s.notifications[notificationIds[i]];
                index++;
            }
        }
        
        return filteredNotifications;
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _getStatusMessage(LibAppStorage.DeliveryStatus status, string memory additionalInfo) 
        internal pure returns (string memory) {
        if (status == LibAppStorage.DeliveryStatus.ASSIGNED) {
            return "Your order has been assigned to a delivery agent.";
        } else if (status == LibAppStorage.DeliveryStatus.EN_ROUTE) {
            return "Delivery agent is on the way to pick up your order.";
        } else if (status == LibAppStorage.DeliveryStatus.ARRIVED) {
            return "Delivery agent has arrived at the shop.";
        } else if (status == LibAppStorage.DeliveryStatus.PICKED_UP) {
            return "Your order has been picked up and is on the way!";
        } else if (status == LibAppStorage.DeliveryStatus.OUT_FOR_DELIVERY) {
            return "Your order is out for delivery.";
        } else if (status == LibAppStorage.DeliveryStatus.DELIVERED) {
            return "Your order has been delivered successfully!";
        } else if (status == LibAppStorage.DeliveryStatus.CONFIRMED) {
            return "Delivery confirmed. Thank you!";
        } else if (status == LibAppStorage.DeliveryStatus.FAILED) {
            return string(abi.encodePacked("Delivery failed: ", additionalInfo));
        } else {
            return "Order status updated.";
        }
    }
    
    function _getStatusString(LibAppStorage.DeliveryStatus status) internal pure returns (string memory) {
        if (status == LibAppStorage.DeliveryStatus.ASSIGNED) return "ASSIGNED";
        if (status == LibAppStorage.DeliveryStatus.EN_ROUTE) return "EN_ROUTE";
        if (status == LibAppStorage.DeliveryStatus.ARRIVED) return "ARRIVED";
        if (status == LibAppStorage.DeliveryStatus.PICKED_UP) return "PICKED_UP";
        if (status == LibAppStorage.DeliveryStatus.OUT_FOR_DELIVERY) return "OUT_FOR_DELIVERY";
        if (status == LibAppStorage.DeliveryStatus.DELIVERED) return "DELIVERED";
        if (status == LibAppStorage.DeliveryStatus.CONFIRMED) return "CONFIRMED";
        if (status == LibAppStorage.DeliveryStatus.FAILED) return "FAILED";
        if (status == LibAppStorage.DeliveryStatus.CANCELLED) return "CANCELLED";
        return "UNKNOWN";
    }
    
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
