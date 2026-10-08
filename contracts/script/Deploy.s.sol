// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {HeldbyEscrow} from "../src/HeldbyEscrow.sol";

/// Deploys HeldbyEscrow. USDC is the same predeploy on Arc mainnet and testnet.
///   ARBITER=0x... forge script script/Deploy.s.sol --rpc-url arc_testnet --account deployer --broadcast
contract Deploy is Script {
    IERC20 constant ARC_USDC = IERC20(0x3600000000000000000000000000000000000000);

    function run() external returns (HeldbyEscrow escrow) {
        address arbiter = vm.envAddress("ARBITER");
        vm.startBroadcast();
        escrow = new HeldbyEscrow(ARC_USDC, arbiter);
        vm.stopBroadcast();
        console.log("HeldbyEscrow:", address(escrow));
        console.log("Arbiter:", arbiter);
    }
}
