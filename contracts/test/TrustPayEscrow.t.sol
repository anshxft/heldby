// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {TrustPayEscrow} from "../src/TrustPayEscrow.sol";

contract MockUSDC is ERC20("USD Coin", "USDC") {
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TrustPayEscrowTest is Test {
    MockUSDC usdc;
    TrustPayEscrow escrow;

    address client = makeAddr("client");
    address freelancer = makeAddr("freelancer");
    address arbiter = makeAddr("arbiter");
    address stranger = makeAddr("stranger");

    uint96 constant AMOUNT = 250e6; // 250 USDC
    uint40 deadline;

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new TrustPayEscrow(usdc, arbiter);
        deadline = uint40(block.timestamp + 7 days);
        usdc.mint(client, 1_000e6);
        vm.prank(client);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function _create() internal returns (uint256) {
        vm.prank(client);
        return escrow.createDeal(freelancer, AMOUNT, deadline, "3 logo variants, SVG + PNG");
    }

    function _submit(uint256 id) internal {
        vm.prank(freelancer);
        escrow.submitWork(id, "github.com/rahul/logo-kit/pull/7");
    }

    function _status(uint256 id) internal view returns (TrustPayEscrow.Status s) {
        (,,,, s) = escrow.deals(id);
    }

    // --- create ---

    function test_createLocksFunds() public {
        uint256 id = _create();
        assertEq(id, 1);
        assertEq(usdc.balanceOf(address(escrow)), AMOUNT);
        assertEq(usdc.balanceOf(client), 1_000e6 - AMOUNT);
        assertEq(uint8(_status(id)), uint8(TrustPayEscrow.Status.Funded));
    }

    function test_createRejectsBadParams() public {
        vm.startPrank(client);
        vm.expectRevert(TrustPayEscrow.InvalidParams.selector);
        escrow.createDeal(address(0), AMOUNT, deadline, "");
        vm.expectRevert(TrustPayEscrow.InvalidParams.selector);
        escrow.createDeal(client, AMOUNT, deadline, "");
        vm.expectRevert(TrustPayEscrow.InvalidParams.selector);
        escrow.createDeal(freelancer, 0, deadline, "");
        vm.expectRevert(TrustPayEscrow.InvalidParams.selector);
        escrow.createDeal(freelancer, AMOUNT, uint40(block.timestamp), "");
        vm.stopPrank();
    }

    // --- happy path ---

    function test_clientReleasePaysFreelancer() public {
        uint256 id = _create();
        _submit(id);
        vm.prank(client);
        escrow.release(id);
        assertEq(usdc.balanceOf(freelancer), AMOUNT);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_cannotReleaseTwice() public {
        uint256 id = _create();
        vm.startPrank(client);
        escrow.release(id);
        vm.expectRevert(TrustPayEscrow.WrongStatus.selector);
        escrow.release(id);
        vm.stopPrank();
    }

    function test_onlyClientCanRelease() public {
        uint256 id = _create();
        vm.prank(freelancer);
        vm.expectRevert(TrustPayEscrow.NotAllowed.selector);
        escrow.release(id);
    }

    // --- submit ---

    function test_onlyFreelancerCanSubmit() public {
        uint256 id = _create();
        vm.prank(stranger);
        vm.expectRevert(TrustPayEscrow.NotAllowed.selector);
        escrow.submitWork(id, "x");
    }

    function test_cannotSubmitAfterDeadline() public {
        uint256 id = _create();
        vm.warp(deadline + 1);
        vm.prank(freelancer);
        vm.expectRevert(TrustPayEscrow.TooLate.selector);
        escrow.submitWork(id, "x");
    }

    // --- refunds ---

    function test_refundBlockedBeforeDeadline() public {
        uint256 id = _create();
        vm.prank(client);
        vm.expectRevert(TrustPayEscrow.TooEarly.selector);
        escrow.refund(id);
    }

    function test_anyoneCanRefundAfterDeadline() public {
        uint256 id = _create();
        vm.warp(deadline + 1);
        vm.prank(stranger);
        escrow.refund(id);
        assertEq(usdc.balanceOf(client), 1_000e6);
    }

    function test_freelancerCanRefundAnytime() public {
        uint256 id = _create();
        vm.prank(freelancer);
        escrow.refund(id);
        assertEq(usdc.balanceOf(client), 1_000e6);
    }

    function test_noRefundAfterSubmission() public {
        uint256 id = _create();
        _submit(id);
        vm.warp(deadline + 1);
        vm.expectRevert(TrustPayEscrow.WrongStatus.selector);
        escrow.refund(id);
    }

    // --- disputes & arbiter ---

    function test_disputeThenSplit70_30() public {
        uint256 id = _create();
        _submit(id);
        vm.prank(client);
        escrow.dispute(id, "only 2 variants delivered");
        vm.prank(arbiter);
        escrow.resolve(id, 7_000, "2 of 3 variants delivered");
        assertEq(usdc.balanceOf(freelancer), 175e6);
        assertEq(usdc.balanceOf(client), 1_000e6 - 175e6); // paid 250, got 75 back
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }

    function test_arbiterApprovesSubmittedWork() public {
        uint256 id = _create();
        _submit(id);
        vm.prank(arbiter);
        escrow.resolve(id, 10_000, "all requirements met");
        assertEq(usdc.balanceOf(freelancer), AMOUNT);
    }

    function test_arbiterCannotActBeforeSubmission() public {
        uint256 id = _create();
        vm.prank(arbiter);
        vm.expectRevert(TrustPayEscrow.WrongStatus.selector);
        escrow.resolve(id, 10_000, "");
    }

    function test_onlyArbiterResolves() public {
        uint256 id = _create();
        _submit(id);
        vm.prank(freelancer);
        vm.expectRevert(TrustPayEscrow.NotAllowed.selector);
        escrow.resolve(id, 10_000, "");
    }

    function test_resolveRejectsBpsOver100Percent() public {
        uint256 id = _create();
        _submit(id);
        vm.prank(arbiter);
        vm.expectRevert(TrustPayEscrow.InvalidParams.selector);
        escrow.resolve(id, 10_001, "");
    }

    function test_strangerCannotDispute() public {
        uint256 id = _create();
        _submit(id);
        vm.prank(stranger);
        vm.expectRevert(TrustPayEscrow.NotAllowed.selector);
        escrow.dispute(id, "");
    }

    /// Whatever the split, every cent goes to client or freelancer — nothing stuck, nothing extra.
    function testFuzz_resolveConservesFunds(uint96 amount, uint16 bps) public {
        amount = uint96(bound(amount, 1, 1_000e6));
        bps = uint16(bound(bps, 0, 10_000));
        vm.prank(client);
        uint256 id = escrow.createDeal(freelancer, amount, deadline, "");
        _submit(id);
        vm.prank(arbiter);
        escrow.resolve(id, bps, "");
        assertEq(usdc.balanceOf(freelancer) + usdc.balanceOf(client), 1_000e6);
        assertEq(usdc.balanceOf(address(escrow)), 0);
    }
}
