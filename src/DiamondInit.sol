// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./libraries/LibAppStorage.sol";

contract DiamondInit {
    
    function init() external {
        LibAppStorage.AppStorage storage s = LibAppStorage.appStorage();
        
        // Set the owner (msg.sender should be the diamond owner)
        s.owner = tx.origin; // tx.origin is the original caller who deployed the diamond
        
        // Initialize ration amounts only
        s.rationAmounts["BPL"] = 35000;  // 35kg
        s.rationAmounts["AAY"] = 35000;  // 35kg  
        s.rationAmounts["APL"] = 15000;  // 15kg
        
        // System is not paused initially
        s.paused = false;
        
        // Log system initialization
        s.activityLogs.push(LibAppStorage.ActivityLog({
            timestamp: block.timestamp,
            actor: msg.sender,
            action: "SYSTEM_INITIALIZED",
            aadhaar: 0,
            tokenId: 0,
            details: "Diamond Ration System initialized"
        }));
    }
}