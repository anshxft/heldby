// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Heldby escrow (v2)
/// @notice A client locks USDC for a freelancer. The client releases it, the AI arbiter
///         settles a submitted or disputed deal, or the client is refunded after the deadline.
/// @dev The arbiter can only split a deal's funds between its client and freelancer —
///      it can never send them anywhere else. Everything the app shows is readable from
///      state (getDeal / dealsOf), so no log scanning is needed.
contract HeldbyEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Funded,
        Submitted,
        Disputed,
        Released,
        Refunded,
        Resolved
    }

    struct Deal {
        address client;
        address freelancer;
        uint96 amount; // USDC, 6 decimals
        uint40 deadline; // unix seconds; client may reclaim after this if nothing was submitted
        uint40 submittedAt; // when work was submitted; starts the client's review window
        uint16 freelancerBps; // the arbiter's split, once resolved
        Status status;
    }

    /// @dev Human-readable parts of a deal, kept apart so `deals(id)` stays a cheap fixed-size read.
    struct Notes {
        string terms; // the brief the work is judged against
        string deliverable; // link or text handed in by the freelancer
        address disputedBy;
        string disputeReason;
        string verdict; // the arbiter's explanation
    }

    uint16 public constant BPS = 10_000;
    /// @notice After a submission the client has this long to release or dispute before the arbiter may settle.
    uint256 public constant REVIEW_WINDOW = 24 hours;
    uint256 public constant MAX_TERMS = 1000;
    uint256 public constant MAX_TEXT = 500;

    IERC20 public immutable usdc;
    address public immutable arbiter;

    uint256 public dealCount;
    mapping(uint256 => Deal) public deals;
    mapping(uint256 => Notes) internal notes;
    mapping(address => uint256[]) internal dealIds;

    event DealCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount, uint256 deadline, string terms);
    event WorkSubmitted(uint256 indexed id, string deliverable);
    event Disputed(uint256 indexed id, address indexed by, string reason);
    event Released(uint256 indexed id, uint256 amount);
    event Refunded(uint256 indexed id, uint256 amount);
    event Resolved(uint256 indexed id, uint256 toFreelancer, uint256 toClient, string reason);

    error InvalidParams();
    error NotAllowed();
    error WrongStatus();
    error TooEarly();
    error TooLate();

    constructor(IERC20 usdc_, address arbiter_) {
        if (address(usdc_) == address(0) || arbiter_ == address(0)) revert InvalidParams();
        usdc = usdc_;
        arbiter = arbiter_;
    }

    // ---------------------------------------------------------------- reads

    /// @notice Everything about one deal in a single call.
    function getDeal(uint256 id) external view returns (Deal memory deal, Notes memory note) {
        return (deals[id], notes[id]);
    }

    /// @notice Ids of every deal where `account` is the client or the freelancer, oldest first.
    function dealsOf(address account) external view returns (uint256[] memory) {
        return dealIds[account];
    }

    // ---------------------------------------------------------------- writes

    /// @notice Create a deal and lock `amount` USDC in one step. Approve this contract first.
    /// @param terms the brief the work is judged against (text or a link)
    function createDeal(address freelancer, uint96 amount, uint40 deadline, string calldata terms)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (
            freelancer == address(0) || freelancer == msg.sender || amount == 0 || deadline <= block.timestamp
                || bytes(terms).length == 0 || bytes(terms).length > MAX_TERMS
        ) revert InvalidParams();
        id = ++dealCount;
        deals[id] = Deal(msg.sender, freelancer, amount, deadline, 0, 0, Status.Funded);
        notes[id].terms = terms;
        dealIds[msg.sender].push(id);
        dealIds[freelancer].push(id);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit DealCreated(id, msg.sender, freelancer, amount, deadline, terms);
    }

    /// @notice Freelancer hands in the work (a PR, file or link).
    function submitWork(uint256 id, string calldata deliverable) external {
        Deal storage d = deals[id];
        if (msg.sender != d.freelancer) revert NotAllowed();
        if (d.status != Status.Funded) revert WrongStatus();
        // late work can't block the client's refund
        if (block.timestamp > d.deadline) revert TooLate();
        if (bytes(deliverable).length == 0 || bytes(deliverable).length > MAX_TEXT) revert InvalidParams();
        d.status = Status.Submitted;
        d.submittedAt = uint40(block.timestamp);
        notes[id].deliverable = deliverable;
        emit WorkSubmitted(id, deliverable);
    }

    /// @notice Client is happy: pay the freelancer in full.
    function release(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        if (msg.sender != d.client) revert NotAllowed();
        if (d.status != Status.Funded && d.status != Status.Submitted && d.status != Status.Disputed) {
            revert WrongStatus();
        }
        d.status = Status.Released;
        usdc.safeTransfer(d.freelancer, d.amount);
        emit Released(id, d.amount);
    }

    /// @notice Refund the client: by the freelancer at any time, or by anyone once the
    ///         deadline has passed without a submission.
    function refund(uint256 id) external nonReentrant {
        Deal storage d = deals[id];
        if (d.status != Status.Funded) revert WrongStatus();
        if (msg.sender != d.freelancer && block.timestamp <= d.deadline) revert TooEarly();
        d.status = Status.Refunded;
        usdc.safeTransfer(d.client, d.amount);
        emit Refunded(id, d.amount);
    }

    /// @notice Either side flags a problem with submitted work; the arbiter may then decide at once.
    function dispute(uint256 id, string calldata reason) external {
        Deal storage d = deals[id];
        if (msg.sender != d.client && msg.sender != d.freelancer) revert NotAllowed();
        if (d.status != Status.Submitted) revert WrongStatus();
        if (bytes(reason).length > MAX_TEXT) revert InvalidParams();
        d.status = Status.Disputed;
        notes[id].disputedBy = msg.sender;
        notes[id].disputeReason = reason;
        emit Disputed(id, msg.sender, reason);
    }

    /// @notice Arbiter settles a disputed deal, or a submitted one the client left unreviewed for
    ///         REVIEW_WINDOW. 10_000 bps = all to the freelancer.
    function resolve(uint256 id, uint16 freelancerBps, string calldata reason) external nonReentrant {
        Deal storage d = deals[id];
        if (msg.sender != arbiter) revert NotAllowed();
        if (d.status == Status.Submitted) {
            if (block.timestamp < uint256(d.submittedAt) + REVIEW_WINDOW) revert TooEarly();
        } else if (d.status != Status.Disputed) {
            revert WrongStatus();
        }
        if (freelancerBps > BPS || bytes(reason).length > MAX_TEXT) revert InvalidParams();
        d.status = Status.Resolved;
        d.freelancerBps = freelancerBps;
        notes[id].verdict = reason;
        uint256 toFreelancer = uint256(d.amount) * freelancerBps / BPS;
        uint256 toClient = d.amount - toFreelancer;
        if (toFreelancer > 0) usdc.safeTransfer(d.freelancer, toFreelancer);
        if (toClient > 0) usdc.safeTransfer(d.client, toClient);
        emit Resolved(id, toFreelancer, toClient, reason);
    }
}
