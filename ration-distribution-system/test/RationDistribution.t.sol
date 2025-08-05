// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/contracts/RationDistribution.sol";

contract RationDistributionTest is Test {
    RationDistribution public rationDistribution;
    address owner = address(1);
    address user1 = address(2);
    address depot1 = address(3);
    address deliveryPerson1 = address(4);

    function setUp() public {
        vm.prank(owner);
        rationDistribution = new RationDistribution();
    }

    function testRegisterUser() public {
        vm.prank(owner);
        rationDistribution.registerUser(user1, "User 1", RationDistribution.UserCategory.BPL);
        
        (uint256 id, address walletAddress, , RationDistribution.UserCategory category, bool isRegistered, ) = rationDistribution.getUserDetails(1);
        
        assertEq(id, 1);
        assertEq(walletAddress, user1);
        assertEq(uint(category), uint(RationDistribution.UserCategory.BPL));
        assertTrue(isRegistered);
    }

    // Additional tests would go here
}