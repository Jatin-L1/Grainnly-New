// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../libraries/LibAppStorage.sol";
import "../libraries/LibDiamond.sol";

contract InventoryFacet {
    
    // ============ EVENTS ============
    event InventoryUpdated(address indexed shopkeeper, string itemName, uint256 newQuantity);
    event ItemReserved(address indexed shopkeeper, string itemName, uint256 quantity, uint256 orderId);
    event ItemReleased(address indexed shopkeeper, string itemName, uint256 quantity, uint256 orderId);
    event LowStockAlert(address indexed shopkeeper, string itemName, uint256 currentStock);
    event InventoryAudit(address indexed shopkeeper, uint256 totalValue, uint256 timestamp);
    
    // ============ MODIFIERS ============
    modifier onlyAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only admin");
        _;
    }
    
    modifier onlyShopkeeper() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[msg.sender], "Only shopkeeper");
        _;
    }
    
    modifier onlyShopkeeperOrAdmin() {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        require(s.shopkeepers_[msg.sender] || msg.sender == LibDiamond.contractOwner() || s.admins[msg.sender], "Only shopkeeper or admin");
        _;
    }
    
    // ============ INVENTORY MANAGEMENT ============
    
    /**
     * @dev Add or update inventory item for a shopkeeper
     */
    function updateInventoryItem(
        address shopkeeper,
        string memory itemName,
        string memory category,
        uint256 quantity,
        uint256 pricePerUnit
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        require(bytes(itemName).length > 0, "Item name required");
        require(quantity > 0, "Quantity must be positive");
        require(pricePerUnit > 0, "Price must be positive");
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        
        // Check if item exists
        bool itemExists = false;
        for (uint256 i = 0; i < inventory.itemNames.length; i++) {
            if (keccak256(abi.encodePacked(inventory.itemNames[i])) == keccak256(abi.encodePacked(itemName))) {
                itemExists = true;
                break;
            }
        }
        
        // Add to item names array if new item
        if (!itemExists) {
            inventory.itemNames.push(itemName);
        }
        
        // Update item details
        inventory.items[itemName] = LibAppStorage.InventoryItem({
            itemName: itemName,
            category: category,
            quantityAvailable: quantity,
            quantityReserved: inventory.items[itemName].quantityReserved, // Keep existing reservations
            pricePerUnit: pricePerUnit,
            lastUpdated: block.timestamp,
            isActive: true
        });
        
        inventory.lastInventoryUpdate = block.timestamp;
        inventory.shopkeeper = shopkeeper;
        
        // Update total value
        _updateInventoryValue(shopkeeper);
        
        // Update global inventory
        s.globalInventory[itemName] += quantity;
        
        emit InventoryUpdated(shopkeeper, itemName, quantity);
        
        // Check for low stock alert (less than 10% of original quantity)
        if (quantity < 100) { // Threshold for low stock
            emit LowStockAlert(shopkeeper, itemName, quantity);
        }
    }
    
    /**
     * @dev Reserve items for an order
     */
    function reserveItems(
        address shopkeeper,
        uint256 orderId,
        string[] memory itemNames,
        uint256[] memory quantities
    ) external onlyAdmin returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(itemNames.length == quantities.length, "Arrays length mismatch");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        
        // Check availability first
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem storage item = inventory.items[itemNames[i]];
            require(item.isActive, "Item not active");
            require(
                item.quantityAvailable >= quantities[i], 
                string(abi.encodePacked("Insufficient stock for ", itemNames[i]))
            );
        }
        
        // Reserve items
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem storage item = inventory.items[itemNames[i]];
            item.quantityAvailable -= quantities[i];
            item.quantityReserved += quantities[i];
            item.lastUpdated = block.timestamp;
            
            emit ItemReserved(shopkeeper, itemNames[i], quantities[i], orderId);
        }
        
        inventory.lastInventoryUpdate = block.timestamp;
        _updateInventoryValue(shopkeeper);
        
        return true;
    }
    
    /**
     * @dev Release reserved items (in case of order cancellation)
     */
    function releaseReservedItems(
        address shopkeeper,
        uint256 orderId,
        string[] memory itemNames,
        uint256[] memory quantities
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(itemNames.length == quantities.length, "Arrays length mismatch");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem storage item = inventory.items[itemNames[i]];
            require(item.quantityReserved >= quantities[i], "Cannot release more than reserved");
            
            item.quantityAvailable += quantities[i];
            item.quantityReserved -= quantities[i];
            item.lastUpdated = block.timestamp;
            
            emit ItemReleased(shopkeeper, itemNames[i], quantities[i], orderId);
        }
        
        inventory.lastInventoryUpdate = block.timestamp;
        _updateInventoryValue(shopkeeper);
    }
    
    /**
     * @dev Confirm delivery and remove items from inventory
     */
    function confirmItemDelivery(
        address shopkeeper,
        uint256 orderId,
        string[] memory itemNames,
        uint256[] memory quantities
    ) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(itemNames.length == quantities.length, "Arrays length mismatch");
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem storage item = inventory.items[itemNames[i]];
            require(item.quantityReserved >= quantities[i], "Cannot confirm more than reserved");
            
            item.quantityReserved -= quantities[i];
            item.lastUpdated = block.timestamp;
            
            // Update global inventory
            if (s.globalInventory[itemNames[i]] >= quantities[i]) {
                s.globalInventory[itemNames[i]] -= quantities[i];
            }
        }
        
        inventory.lastInventoryUpdate = block.timestamp;
        _updateInventoryValue(shopkeeper);
    }
    
    /**
     * @dev Shopkeeper updates their own inventory
     */
    function updateMyInventory(
        string memory itemName,
        uint256 newQuantity
    ) external onlyShopkeeper {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[msg.sender];
        LibAppStorage.InventoryItem storage item = inventory.items[itemName];
        
        require(item.isActive, "Item not found or inactive");
        
        uint256 oldQuantity = item.quantityAvailable;
        item.quantityAvailable = newQuantity;
        item.lastUpdated = block.timestamp;
        
        inventory.lastInventoryUpdate = block.timestamp;
        _updateInventoryValue(msg.sender);
        
        // Update global inventory
        if (newQuantity > oldQuantity) {
            s.globalInventory[itemName] += (newQuantity - oldQuantity);
        } else if (oldQuantity > newQuantity) {
            uint256 reduction = oldQuantity - newQuantity;
            if (s.globalInventory[itemName] >= reduction) {
                s.globalInventory[itemName] -= reduction;
            }
        }
        
        emit InventoryUpdated(msg.sender, itemName, newQuantity);
        
        // Low stock alert
        if (newQuantity < 100) {
            emit LowStockAlert(msg.sender, itemName, newQuantity);
        }
    }
    
    /**
     * @dev Deactivate an inventory item
     */
    function deactivateItem(address shopkeeper, string memory itemName) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        inventory.items[itemName].isActive = false;
        inventory.items[itemName].lastUpdated = block.timestamp;
        inventory.lastInventoryUpdate = block.timestamp;
        
        _updateInventoryValue(shopkeeper);
    }
    
    // ============ INVENTORY AUDIT FUNCTIONS ============
    
    /**
     * @dev Perform inventory audit for a shopkeeper
     */
    function performInventoryAudit(address shopkeeper) external onlyAdmin {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        require(s.shopkeepers_[shopkeeper], "Invalid shopkeeper");
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        _updateInventoryValue(shopkeeper);
        
        emit InventoryAudit(shopkeeper, inventory.totalValue, block.timestamp);
    }
    
    /**
     * @dev Get inventory checklist for order preparation
     */
    function getOrderChecklist(
        address shopkeeper,
        uint256 orderId,
        string[] memory itemNames,
        uint256[] memory quantities
    ) external view returns (
        string[] memory availableItems,
        string[] memory unavailableItems,
        uint256[] memory availableQuantities,
        bool canFulfill
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        
        uint256 availableCount = 0;
        uint256 unavailableCount = 0;
        
        // Count available and unavailable items
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem memory item = inventory.items[itemNames[i]];
            if (item.isActive && item.quantityAvailable >= quantities[i]) {
                availableCount++;
            } else {
                unavailableCount++;
            }
        }
        
        availableItems = new string[](availableCount);
        unavailableItems = new string[](unavailableCount);
        availableQuantities = new uint256[](availableCount);
        
        uint256 availableIndex = 0;
        uint256 unavailableIndex = 0;
        
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem memory item = inventory.items[itemNames[i]];
            if (item.isActive && item.quantityAvailable >= quantities[i]) {
                availableItems[availableIndex] = itemNames[i];
                availableQuantities[availableIndex] = item.quantityAvailable;
                availableIndex++;
            } else {
                unavailableItems[unavailableIndex] = itemNames[i];
                unavailableIndex++;
            }
        }
        
        canFulfill = (unavailableCount == 0);
        
        return (availableItems, unavailableItems, availableQuantities, canFulfill);
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Get complete inventory for a shopkeeper
     */
    function getShopInventory(address shopkeeper) external view returns (
        string[] memory itemNames,
        LibAppStorage.InventoryItem[] memory items,
        uint256 totalValue,
        uint256 lastUpdated
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        itemNames = inventory.itemNames;
        
        items = new LibAppStorage.InventoryItem[](itemNames.length);
        for (uint256 i = 0; i < itemNames.length; i++) {
            items[i] = inventory.items[itemNames[i]];
        }
        
        return (itemNames, items, inventory.totalValue, inventory.lastInventoryUpdate);
    }
    
    /**
     * @dev Get specific inventory item
     */
    function getInventoryItem(address shopkeeper, string memory itemName) 
        external view returns (LibAppStorage.InventoryItem memory) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        return s.shopInventories[shopkeeper].items[itemName];
    }
    
    /**
     * @dev Get low stock items across all shops
     */
    function getLowStockItems(uint256 threshold) external view returns (
        address[] memory shopkeepers,
        string[] memory itemNames,
        uint256[] memory quantities
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        uint256 lowStockCount = 0;
        
        // Count low stock items
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            address shopkeeper = s.allShopkeepers[i];
            LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
            
            for (uint256 j = 0; j < inventory.itemNames.length; j++) {
                LibAppStorage.InventoryItem memory item = inventory.items[inventory.itemNames[j]];
                if (item.isActive && item.quantityAvailable <= threshold) {
                    lowStockCount++;
                }
            }
        }
        
        shopkeepers = new address[](lowStockCount);
        itemNames = new string[](lowStockCount);
        quantities = new uint256[](lowStockCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            address shopkeeper = s.allShopkeepers[i];
            LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
            
            for (uint256 j = 0; j < inventory.itemNames.length; j++) {
                LibAppStorage.InventoryItem memory item = inventory.items[inventory.itemNames[j]];
                if (item.isActive && item.quantityAvailable <= threshold) {
                    shopkeepers[index] = shopkeeper;
                    itemNames[index] = inventory.itemNames[j];
                    quantities[index] = item.quantityAvailable;
                    index++;
                }
            }
        }
        
        return (shopkeepers, itemNames, quantities);
    }
    
    /**
     * @dev Get global inventory summary
     */
    function getGlobalInventorySummary() external view returns (
        string[] memory itemNames,
        uint256[] memory totalQuantities,
        uint256 totalShopsWithItems
    ) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // This is a simplified version - in production, you might want to optimize this
        // by maintaining a separate mapping for global item names
        uint256 uniqueItemCount = 0;
        
        // Count unique items (simplified approach)
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            address shopkeeper = s.allShopkeepers[i];
            LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
            uniqueItemCount += inventory.itemNames.length;
        }
        
        itemNames = new string[](uniqueItemCount);
        totalQuantities = new uint256[](uniqueItemCount);
        
        uint256 index = 0;
        for (uint256 i = 0; i < s.allShopkeepers.length; i++) {
            address shopkeeper = s.allShopkeepers[i];
            LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
            
            for (uint256 j = 0; j < inventory.itemNames.length; j++) {
                if (inventory.items[inventory.itemNames[j]].isActive) {
                    itemNames[index] = inventory.itemNames[j];
                    totalQuantities[index] = s.globalInventory[inventory.itemNames[j]];
                    index++;
                }
            }
        }
        
        totalShopsWithItems = s.allShopkeepers.length;
        
        return (itemNames, totalQuantities, totalShopsWithItems);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    /**
     * @dev Update total inventory value for a shopkeeper
     */
    function _updateInventoryValue(address shopkeeper) internal {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        uint256 totalValue = 0;
        
        for (uint256 i = 0; i < inventory.itemNames.length; i++) {
            LibAppStorage.InventoryItem memory item = inventory.items[inventory.itemNames[i]];
            if (item.isActive) {
                totalValue += (item.quantityAvailable + item.quantityReserved) * item.pricePerUnit;
            }
        }
        
        inventory.totalValue = totalValue;
    }
    
    /**
     * @dev Check if shopkeeper can fulfill an order
     */
    function canFulfillOrder(
        address shopkeeper,
        string[] memory itemNames,
        uint256[] memory quantities
    ) external view returns (bool) {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        LibAppStorage.ShopInventory storage inventory = s.shopInventories[shopkeeper];
        
        for (uint256 i = 0; i < itemNames.length; i++) {
            LibAppStorage.InventoryItem memory item = inventory.items[itemNames[i]];
            if (!item.isActive || item.quantityAvailable < quantities[i]) {
                return false;
            }
        }
        
        return true;
    }
}
