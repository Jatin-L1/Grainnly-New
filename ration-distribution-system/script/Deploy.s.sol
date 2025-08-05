// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/contracts/RationDistribution.sol";

contract DeployRationDistribution is Script {
    // In your Deploy.s.sol
function run() external {
    string memory privateKeyStr = vm.envString("PRIVATE_KEY");
    bytes memory privateKeyBytes = vm.parseBytes(privateKeyStr);
    uint256 deployerPrivateKey = uint256(bytes32(privateKeyBytes));
    
    vm.startBroadcast(deployerPrivateKey);
    // Deploy the contract
    RationDistribution rationDistribution = new RationDistribution();
    console.log("Contract deployed at:", address(rationDistribution));
    vm.stopBroadcast();
}
}