// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DCVToken.sol";

contract DeployDCVToken is Script {
    function run() external returns (address) {
        vm.startBroadcast();
        
        // ✅ FIXED: DCVToken now requires 3 parameters (name, symbol, uri)
        DCVToken dcvToken = new DCVToken(
            "Digital Card Voucher",
            "DCV", 
            "https://api.rationcard.gov.in/metadata/{id}.json"
        );
        
        vm.stopBroadcast();
        
        console.log("DCVToken deployed at:", address(dcvToken));
        console.log("Token Name:", dcvToken.name());
        console.log("Token Symbol:", dcvToken.symbol());
        console.log("Metadata URI:", dcvToken.uri(0));
        
        return address(dcvToken);
    }
}