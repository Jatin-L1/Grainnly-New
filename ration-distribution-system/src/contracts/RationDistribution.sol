//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RationDistribution
 * @dev Manages ration distribution using blockchain for transparency and security
 */
contract RationDistribution {
    address public owner;
    
    enum UserCategory { APL, BPL }
    enum DeliveryStatus { PENDING, IN_TRANSIT, DELIVERED }
    
    struct User {
        uint256 id;
        address walletAddress;
        string name;
        UserCategory category;
        bool isRegistered;
        uint256 assignedDepotId;
    }
    
    struct Depot {
        uint256 id;
        address walletAddress;
        string name;
        string location;
        bool isActive;
    }
    
    struct DeliveryPerson {
        uint256 id;
        address walletAddress;
        string name;
        bool isActive;
        uint256[] assignedDepotIds;
    }
    
    struct RationDelivery {
        uint256 id;
        uint256 userId;
        uint256 depotId;
        uint256 deliveryPersonId;
        uint256 amount;
        uint256 otp;
        DeliveryStatus status;
        uint256 createdAt;
        uint256 deliveredAt;
    }
    
    mapping(uint256 => User) public users;
    mapping(address => uint256) public userAddressToId;
    mapping(uint256 => Depot) public depots;
    mapping(address => uint256) public depotAddressToId;
    mapping(uint256 => DeliveryPerson) public deliveryPersons;
    mapping(address => uint256) public deliveryPersonAddressToId;
    mapping(uint256 => RationDelivery) public rationDeliveries;
    
    uint256 public userCount;
    uint256 public depotCount;
    uint256 public deliveryPersonCount;
    uint256 public rationDeliveryCount;
    
    // Events
    event UserRegistered(uint256 indexed userId, address walletAddress, UserCategory category);
    event DepotRegistered(uint256 indexed depotId, address walletAddress, string location);
    event DeliveryPersonRegistered(uint256 indexed deliveryPersonId, address walletAddress);
    event DepotAssigned(uint256 indexed userId, uint256 depotId);
    event DeliveryPersonAssigned(uint256 indexed deliveryPersonId, uint256 depotId);
    event RationAllocated(uint256 indexed deliveryId, uint256 userId, uint256 depotId, uint256 deliveryPersonId, uint256 amount);
    event OTPGenerated(uint256 indexed deliveryId, uint256 otp);
    event OTPVerified(uint256 indexed deliveryId);
    event LocationVerified(uint256 indexed deliveryId);
    event DeliveryCompleted(uint256 indexed deliveryId, uint256 timestamp);
    event PaymentSent(uint256 indexed deliveryId, address to, uint256 amount);
    event DeliveryStateReset(uint256 indexed deliveryId, uint256 timestamp);
    event DebugLog(string message, uint256 value);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyDepot(uint256 depotId) {
        require(depotId > 0, "Invalid depot ID");
        require(depotAddressToId[msg.sender] == depotId, "Only authorized depot can call this function");
        _;
    }
    
    modifier onlyDeliveryPerson(uint256 deliveryPersonId) {
        require(deliveryPersonId > 0, "Invalid delivery person ID");
        require(deliveryPersonAddressToId[msg.sender] == deliveryPersonId, "Only authorized delivery person can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Register a new user in the system
     * @param _walletAddress User's wallet address
     * @param _name User's name
     * @param _category User category (APL/BPL)
     * @return userId ID of the newly registered user
     */
    function registerUser(
        address _walletAddress,
        string memory _name, 
        UserCategory _category
    ) public onlyOwner returns (uint256 userId) {
        require(_walletAddress != address(0), "Invalid address");
        require(userAddressToId[_walletAddress] == 0, "User already registered");
        
        userCount++;
        users[userCount] = User({
            id: userCount,
            walletAddress: _walletAddress,
            name: _name,
            category: _category,
            isRegistered: true,
            assignedDepotId: 0
        });
        
        userAddressToId[_walletAddress] = userCount;
        
        emit UserRegistered(userCount, _walletAddress, _category);
        return userCount;
    }
    
    /**
     * @dev Register a new depot in the system
     * @param _walletAddress Depot's wallet address
     * @param _name Depot's name
     * @param _location Depot's location
     * @return depotId ID of the newly registered depot
     */
    function registerDepot(
        address _walletAddress,
        string memory _name,
        string memory _location
    ) public onlyOwner returns (uint256 depotId) {
        require(_walletAddress != address(0), "Invalid address");
        require(depotAddressToId[_walletAddress] == 0, "Depot already registered");
        
        depotCount++;
        depots[depotCount] = Depot({
            id: depotCount,
            walletAddress: _walletAddress,
            name: _name,
            location: _location,
            isActive: true
        });
        
        depotAddressToId[_walletAddress] = depotCount;
        
        emit DepotRegistered(depotCount, _walletAddress, _location);
        return depotCount;
    }
    
    /**
     * @dev Register a new delivery person in the system
     * @param _walletAddress Delivery person's wallet address
     * @param _name Delivery person's name
     * @return deliveryPersonId ID of the newly registered delivery person
     */
    function registerDeliveryPerson(
        address _walletAddress,
        string memory _name
    ) public onlyOwner returns (uint256 deliveryPersonId) {
        require(_walletAddress != address(0), "Invalid address");
        require(deliveryPersonAddressToId[_walletAddress] == 0, "Delivery person already registered");
        
        deliveryPersonCount++;
        deliveryPersons[deliveryPersonCount] = DeliveryPerson({
            id: deliveryPersonCount,
            walletAddress: _walletAddress,
            name: _name,
            isActive: true,
            assignedDepotIds: new uint256[](0)
        });
        
        deliveryPersonAddressToId[_walletAddress] = deliveryPersonCount;
        
        emit DeliveryPersonRegistered(deliveryPersonCount, _walletAddress);
        return deliveryPersonCount;
    }
    
    /**
     * @dev Assign a depot to a user
     * @param _userId User ID
     * @param _depotId Depot ID
     */
    function assignDepot(uint256 _userId, uint256 _depotId) public onlyOwner {
        require(_userId > 0 && _userId <= userCount, "User does not exist");
        require(_depotId > 0 && _depotId <= depotCount, "Depot does not exist");
        require(users[_userId].isRegistered, "User is not registered");
        require(depots[_depotId].isActive, "Depot is not active");
        
        users[_userId].assignedDepotId = _depotId;
        
        emit DepotAssigned(_userId, _depotId);
    }
    
    /**
     * @dev Assign a delivery person to a depot
     * @param _deliveryPersonId Delivery person ID
     * @param _depotId Depot ID
     */
    function assignDeliveryPersonToDepot(uint256 _deliveryPersonId, uint256 _depotId) public onlyOwner {
        require(_deliveryPersonId > 0 && _deliveryPersonId <= deliveryPersonCount, "Delivery person does not exist");
        require(_depotId > 0 && _depotId <= depotCount, "Depot does not exist");
        require(deliveryPersons[_deliveryPersonId].isActive, "Delivery person is not active");
        require(depots[_depotId].isActive, "Depot is not active");
        
        // Check if the depot is already assigned to avoid duplicates
        bool alreadyAssigned = false;
        for (uint i = 0; i < deliveryPersons[_deliveryPersonId].assignedDepotIds.length; i++) {
            if (deliveryPersons[_deliveryPersonId].assignedDepotIds[i] == _depotId) {
                alreadyAssigned = true;
                break;
            }
        }
        
        if (!alreadyAssigned) {
            deliveryPersons[_deliveryPersonId].assignedDepotIds.push(_depotId);
            emit DeliveryPersonAssigned(_deliveryPersonId, _depotId);
        }
    }
    
   /**
 * @dev Allocate ration for a user
 * @param _userId User ID
 * @param _deliveryPersonId Delivery person ID
 * @param _amount Amount of ration
 * @return deliveryId ID of the newly created delivery
 */
function allocateRation(
    uint256 _userId, 
    uint256 _deliveryPersonId, 
    uint256 _amount
) public returns (uint256 deliveryId) {
    require(_userId > 0 && _userId <= userCount, "User does not exist");
    require(_deliveryPersonId > 0 && _deliveryPersonId <= deliveryPersonCount, "Delivery person does not exist");
    require(users[_userId].isRegistered, "User is not registered");
    require(users[_userId].assignedDepotId != 0, "User not assigned to any depot");
    require(deliveryPersons[_deliveryPersonId].isActive, "Delivery person is not active");
    require(_amount > 0, "Amount must be greater than 0");
    
    // Get user's assigned depot ID
    uint256 depotId = users[_userId].assignedDepotId;
    
    // Check caller authorization - must be owner or the depot assigned to this user
    bool isOwner = (msg.sender == owner);
    bool isDepot = (depotAddressToId[msg.sender] == depotId);
    require(isOwner || isDepot, "Only owner or assigned depot can allocate rations");
    
    // Check if delivery person is assigned to the depot
    bool isAssigned = false;
    for (uint i = 0; i < deliveryPersons[_deliveryPersonId].assignedDepotIds.length; i++) {
        if (deliveryPersons[_deliveryPersonId].assignedDepotIds[i] == depotId) {
            isAssigned = true;
            break;
        }
    }
    require(isAssigned, "Delivery person not assigned to user's depot");
    
    rationDeliveryCount++;
    rationDeliveries[rationDeliveryCount] = RationDelivery({
        id: rationDeliveryCount,
        userId: _userId,
        depotId: depotId,
        deliveryPersonId: _deliveryPersonId,
        amount: _amount,
        otp: 0,
        status: DeliveryStatus.PENDING,
        createdAt: block.timestamp,
        deliveredAt: 0
    });
    
    emit RationAllocated(rationDeliveryCount, _userId, depotId, _deliveryPersonId, _amount);
    return rationDeliveryCount;
}
    
    /**
     * @dev Generate OTP for a delivery
     * @param _deliveryId Delivery ID
     * @return otp Generated OTP
     */
    function generateOTP(uint256 _deliveryId) public returns (uint256 otp) {
        require(_deliveryId > 0 && _deliveryId <= rationDeliveryCount, "Invalid delivery ID");
        
        RationDelivery storage delivery = rationDeliveries[_deliveryId];
        uint256 depotId = delivery.depotId;
        require(depotId > 0, "Invalid depot ID for delivery");
        
        // Get depot ID from caller address
        uint256 callerDepotId = depotAddressToId[msg.sender];
        
        // Debug logs for troubleshooting
        emit DebugLog("Caller Address", uint256(uint160(msg.sender)));
        emit DebugLog("Expected Depot ID", depotId);
        emit DebugLog("Mapped Depot ID from Caller", callerDepotId);
        
        // Check if caller is authorized depot
        require(callerDepotId == depotId, "Only authorized depot can call this function");
        require(delivery.status == DeliveryStatus.PENDING, "Delivery not in pending state");
        
        // Generate a pseudo-random 6-digit OTP
        // Use block variables and delivery ID for entropy
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, 
            _deliveryId,
            msg.sender
        ))) % 1000000;
        
        // Ensure OTP is 6 digits (between 100000 and 999999)
        if (randomNumber < 100000) {
            randomNumber += 100000;
        }
        
        delivery.otp = randomNumber;
        delivery.status = DeliveryStatus.IN_TRANSIT;
        
        emit OTPGenerated(_deliveryId, randomNumber);
        return randomNumber;
    }
    
    /**
     * @dev Verify OTP for a delivery
     * @param _deliveryId Delivery ID
     * @param _otp OTP entered by delivery person
     * @return success Boolean indicating whether verification was successful
     */
    function verifyOTP(uint256 _deliveryId, uint256 _otp) public returns (bool success) {
        require(_deliveryId > 0 && _deliveryId <= rationDeliveryCount, "Invalid delivery ID");
        
        RationDelivery storage delivery = rationDeliveries[_deliveryId];
        uint256 deliveryPersonId = delivery.deliveryPersonId;
        require(deliveryPersonId > 0, "Invalid delivery person ID for delivery");
        
        // Get delivery person ID from caller address
        uint256 callerDeliveryPersonId = deliveryPersonAddressToId[msg.sender];
        
        // Debug logs for troubleshooting
        emit DebugLog("Caller Address", uint256(uint160(msg.sender)));
        emit DebugLog("Expected Delivery Person ID", deliveryPersonId);
        emit DebugLog("Mapped ID from Caller", callerDeliveryPersonId);
        
        require(callerDeliveryPersonId == deliveryPersonId, "Only authorized delivery person can call this function");
        require(delivery.status == DeliveryStatus.IN_TRANSIT, "Delivery not in transit");
        require(delivery.otp == _otp, "Invalid OTP");
        
        emit OTPVerified(_deliveryId);
        return true;
    }
    
    /**
     * @dev Verify location for a delivery
     * @param _deliveryId Delivery ID
     * @param _latitude Location latitude (expressed as int256 for precision)
     * @param _longitude Location longitude (expressed as int256 for precision)
     * @return success Boolean indicating whether verification was successful
     */
    function verifyLocation(uint256 _deliveryId, int256 _latitude, int256 _longitude) public returns (bool success) {
        require(_deliveryId > 0 && _deliveryId <= rationDeliveryCount, "Invalid delivery ID");
        
        RationDelivery storage delivery = rationDeliveries[_deliveryId];
        uint256 depotId = delivery.depotId;
        require(depotId > 0, "Invalid depot ID for delivery");
        
        // Check if caller is authorized depot
        require(depotAddressToId[msg.sender] == depotId, "Only authorized depot can call this function");
        require(delivery.status == DeliveryStatus.IN_TRANSIT, "Delivery not in transit");
        
        // In a real implementation, you'd compare with depot's coordinates and ensure they're within a threshold
        // For simplicity, we're just emitting an event here
        
        emit LocationVerified(_deliveryId);
        return true;
    }
    
    /**
     * @dev Reset a delivery to pending state
     * @param _deliveryId Delivery ID to reset
     * @return success Boolean indicating whether reset was successful
     */
    function resetDeliveryState(uint256 _deliveryId) public returns (bool success) {
        require(_deliveryId > 0 && _deliveryId <= rationDeliveryCount, "Invalid delivery ID");
        
        RationDelivery storage delivery = rationDeliveries[_deliveryId];
        uint256 depotId = delivery.depotId;
        require(depotId > 0, "Invalid depot ID for delivery");
        
        // Allow only the depot associated with this delivery to reset it
        require(depotAddressToId[msg.sender] == depotId, "Only depot can reset");
        
        // Cannot reset a delivery that's already been completed and paid for
        require(delivery.status != DeliveryStatus.DELIVERED, "Cannot reset a completed delivery");
        
        // Reset delivery to pending state
        delivery.status = DeliveryStatus.PENDING;
        delivery.otp = 0;
        delivery.deliveredAt = 0;
        
        emit DeliveryStateReset(_deliveryId, block.timestamp);
        return true;
    }
    
    /**
     * @dev Complete a delivery and transfer payment
     * @param _deliveryId Delivery ID
     * @return success Boolean indicating whether completion was successful
     */
    function completeDelivery(uint256 _deliveryId) public payable returns (bool success) {
        require(_deliveryId > 0 && _deliveryId <= rationDeliveryCount, "Invalid delivery ID");
        
        RationDelivery storage delivery = rationDeliveries[_deliveryId];
        uint256 depotId = delivery.depotId;
        require(depotId > 0, "Invalid depot ID for delivery");
        
        require(depotAddressToId[msg.sender] == depotId, "Only depot can complete delivery");
        require(delivery.status == DeliveryStatus.IN_TRANSIT, "Delivery not in transit");
        require(msg.value >= delivery.amount, "Insufficient payment amount");
        
        delivery.status = DeliveryStatus.DELIVERED;
        delivery.deliveredAt = block.timestamp;
        
        // Transfer payment to delivery person
        address payable deliveryPersonAddress = payable(deliveryPersons[delivery.deliveryPersonId].walletAddress);
        (bool sent, ) = deliveryPersonAddress.call{value: delivery.amount}("");
        require(sent, "Failed to send payment");
        
        // Refund excess payment if any
        if (msg.value > delivery.amount) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - delivery.amount}("");
            require(refunded, "Failed to refund excess payment");
        }
        
        emit DeliveryCompleted(_deliveryId, block.timestamp);
        emit PaymentSent(_deliveryId, deliveryPersonAddress, delivery.amount);
        return true;
    }
    
    /**
     * @dev Get user details by ID
     * @param _userId User ID
     */
    function getUserDetails(uint256 _userId) public view returns (
        uint256 id,
        address walletAddress,
        string memory name,
        UserCategory category,
        bool isRegistered,
        uint256 assignedDepotId
    ) {
        require(_userId > 0 && _userId <= userCount, "User does not exist");
        User memory user = users[_userId];
        return (
            user.id,
            user.walletAddress,
            user.name,
            user.category,
            user.isRegistered,
            user.assignedDepotId
        );
    }
    
    /**
     * @dev Get user ID from wallet address
     * @param _walletAddress User wallet address
     * @return userId ID of the user
     */
    function getUserIdByAddress(address _walletAddress) public view returns (uint256 userId) {
        userId = userAddressToId[_walletAddress];
        require(userId > 0, "User not found");
        return userId;
    }
    
    /**
     * @dev Get depot details by ID
     * @param _depotId Depot ID
     */
    function getDepotDetails(uint256 _depotId) public view returns (
        uint256 id,
        address walletAddress,
        string memory name,
        string memory location,
        bool isActive
    ) {
        require(_depotId > 0 && _depotId <= depotCount, "Depot does not exist");
        Depot memory depot = depots[_depotId];
        return (
            depot.id,
            depot.walletAddress,
            depot.name,
            depot.location,
            depot.isActive
        );
    }
    
    /**
     * @dev Get depot ID from wallet address
     * @param _walletAddress Depot wallet address
     * @return depotId ID of the depot
     */
    function getDepotIdByAddress(address _walletAddress) public view returns (uint256 depotId) {
        depotId = depotAddressToId[_walletAddress];
        require(depotId > 0, "Depot not found");
        return depotId;
    }
    
    /**
     * @dev Get delivery person details by ID
     * @param _deliveryPersonId Delivery person ID
     */
    function getDeliveryPersonDetails(uint256 _deliveryPersonId) public view returns (
        uint256 id,
        address walletAddress,
        string memory name,
        bool isActive,
        uint256[] memory assignedDepotIds
    ) {
        require(_deliveryPersonId > 0 && _deliveryPersonId <= deliveryPersonCount, "Delivery person does not exist");
        DeliveryPerson memory deliveryPerson = deliveryPersons[_deliveryPersonId];
        return (
            deliveryPerson.id,
            deliveryPerson.walletAddress,
            deliveryPerson.name,
            deliveryPerson.isActive,
            deliveryPerson.assignedDepotIds
        );
    }
    
    /**
     * @dev Get delivery person ID from wallet address
     * @param _walletAddress Delivery person wallet address
     * @return deliveryPersonId ID of the delivery person
     */
    function getDeliveryPersonIdByAddress(address _walletAddress) public view returns (uint256 deliveryPersonId) {
        deliveryPersonId = deliveryPersonAddressToId[_walletAddress];
        require(deliveryPersonId > 0, "Delivery person not found");
        return deliveryPersonId;
    }
    
    /**
     * @dev Get delivery details by ID
     * @param _deliveryId Delivery ID
     */
    function getDeliveryDetails(uint256 _deliveryId) public view returns (
        uint256 id,
        uint256 userId,
        uint256 depotId,
        uint256 deliveryPersonId,
        uint256 amount,
        uint256 otp,
        DeliveryStatus status,
        uint256 createdAt,
        uint256 deliveredAt
    ) {
        require(_deliveryId > 0 && _deliveryId <= rationDeliveryCount, "Delivery does not exist");
        RationDelivery memory delivery = rationDeliveries[_deliveryId];
        return (
            delivery.id,
            delivery.userId,
            delivery.depotId,
            delivery.deliveryPersonId,
            delivery.amount,
            delivery.otp,
            delivery.status,
            delivery.createdAt,
            delivery.deliveredAt
        );
    }
    
    /**
     * @dev Get all deliveries for a specific user
     * @param _userId User ID
     * @return deliveryIds Array of delivery IDs associated with the user
     */
    function getUserDeliveries(uint256 _userId) public view returns (uint256[] memory deliveryIds) {
        require(_userId > 0 && _userId <= userCount, "User does not exist");
        
        // First count how many deliveries the user has
        uint256 count = 0;
        for (uint256 i = 1; i <= rationDeliveryCount; i++) {
            if (rationDeliveries[i].userId == _userId) {
                count++;
            }
        }
        
        // Now populate the array
        deliveryIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= rationDeliveryCount; i++) {
            if (rationDeliveries[i].userId == _userId) {
                deliveryIds[index] = i;
                index++;
            }
        }
        
        return deliveryIds;
    }
    
    /**
     * @dev Get all deliveries for a specific depot
     * @param _depotId Depot ID
     * @return deliveryIds Array of delivery IDs associated with the depot
     */
    function getDepotDeliveries(uint256 _depotId) public view returns (uint256[] memory deliveryIds) {
        require(_depotId > 0 && _depotId <= depotCount, "Depot does not exist");
        
        // First count how many deliveries the depot has
        uint256 count = 0;
        for (uint256 i = 1; i <= rationDeliveryCount; i++) {
            if (rationDeliveries[i].depotId == _depotId) {
                count++;
            }
        }
        
        // Now populate the array
        deliveryIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= rationDeliveryCount; i++) {
            if (rationDeliveries[i].depotId == _depotId) {
                deliveryIds[index] = i;
                index++;
            }
        }
        
        return deliveryIds;
    }
    
    /**
     * @dev Get all deliveries for a specific delivery person
     * @param _deliveryPersonId Delivery person ID
     * @return deliveryIds Array of delivery IDs associated with the delivery person
     */
    function getDeliveryPersonDeliveries(uint256 _deliveryPersonId) public view returns (uint256[] memory deliveryIds) {
        require(_deliveryPersonId > 0 && _deliveryPersonId <= deliveryPersonCount, "Delivery person does not exist");
        
        // First count how many deliveries the delivery person has
        uint256 count = 0;
        for (uint256 i = 1; i <= rationDeliveryCount; i++) {
            if (rationDeliveries[i].deliveryPersonId == _deliveryPersonId) {
                count++;
            }
        }
        
        // Now populate the array
        deliveryIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= rationDeliveryCount; i++) {
            if (rationDeliveries[i].deliveryPersonId == _deliveryPersonId) {
                deliveryIds[index] = i;
                index++;
            }
        }
        
        return deliveryIds;
    }
    
    /**
     * @dev Check if the caller is authorized as a depot for a specific delivery
     * @param _deliveryId Delivery ID
     * @return isAuthorized Boolean indicating whether the caller is authorized
     */
    function isCallerAuthorizedDepot(uint256 _deliveryId) public view returns (bool isAuthorized) {
        if (_deliveryId == 0 || _deliveryId > rationDeliveryCount) {
            return false;
        }
        
        uint256 depotId = rationDeliveries[_deliveryId].depotId;
        return depotAddressToId[msg.sender] == depotId;
    }
    
    /**
     * @dev Check if the caller is authorized as a delivery person for a specific delivery
     * @param _deliveryId Delivery ID
     * @return isAuthorized Boolean indicating whether the caller is authorized
     */
    function isCallerAuthorizedDeliveryPerson(uint256 _deliveryId) public view returns (bool isAuthorized) {
        if (_deliveryId == 0 || _deliveryId > rationDeliveryCount) {
            return false;
        }
        
        uint256 deliveryPersonId = rationDeliveries[_deliveryId].deliveryPersonId;
        return deliveryPersonAddressToId[msg.sender] == deliveryPersonId;
    }
}