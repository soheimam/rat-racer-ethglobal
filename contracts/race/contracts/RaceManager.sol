// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RaceManager
 * @notice Manages rat racing competitions with entry fees and prizes
 * @dev Race creators earn 10% of total entry fees, remaining 90% distributed to winners
 */
contract RaceManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint8 public constant MAX_RACERS = 6;
    uint256 public constant CREATOR_FEE_PERCENT = 10; // 10%
    uint256 public constant PERCENT_DENOMINATOR = 100;

    // Rat NFT contract
    IERC721 public immutable ratNFT;

    // Race states
    enum RaceStatus {
        Active, // Accepting entries
        Full, // All spots filled, can be started
        Started, // Race in progress
        Finished, // Race completed
        Cancelled // Race cancelled, refunds issued
    }

    // Race structure
    struct Race {
        uint256 raceId;
        address creator;
        uint8 trackId;
        IERC20 entryToken;
        uint256 entryFee;
        RaceStatus status;
        uint256 prizePool;
        uint256 createdAt;
        uint256 startedAt;
        uint256 finishedAt;
    }

    // Racer entry
    struct RacerEntry {
        address racer;
        uint256 ratTokenId;
        uint256 enteredAt;
        uint8 position; // Final position (1-6), 0 if not finished
    }

    // Storage
    uint256 private _nextRaceId;
    mapping(uint256 => Race) public races;
    mapping(uint256 => RacerEntry[]) public raceEntries;
    mapping(uint256 => mapping(address => bool)) public hasEntered; // raceId => racer => entered
    mapping(uint256 => mapping(uint256 => bool)) public ratInRace; // raceId => ratTokenId => inRace
    mapping(uint256 => bool) public ratIsRacing; // ratTokenId => is currently in an active race

    // Admin address
    address public admin;

    // Events
    event RaceCreated(
        uint256 indexed raceId,
        address indexed creator,
        uint8 trackId,
        address entryToken,
        uint256 entryFee
    );
    event RacerEntered(
        uint256 indexed raceId,
        address indexed racer,
        uint256 indexed ratTokenId
    );
    event RaceStarted(uint256 indexed raceId, address indexed startedBy);
    event RaceFinished(
        uint256 indexed raceId,
        uint256[] winningRatTokenIds,
        address[] winners,
        uint256[] prizes
    );
    event RaceCancelled(uint256 indexed raceId, address indexed cancelledBy);
    event PrizeClaimed(
        uint256 indexed raceId,
        address indexed racer,
        uint256 amount
    );

    constructor(address ratNFT_) {
        require(ratNFT_ != address(0), "Invalid rat NFT address");
        ratNFT = IERC721(ratNFT_);
        admin = msg.sender;
    }

    /**
     * @notice Set admin address
     * @param newAdmin New admin address
     */
    function setAdmin(address newAdmin) external {
        require(msg.sender == admin, "Only admin");
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }

    /**
     * @notice Create a new race
     * @param trackId Track ID for the race
     * @param entryToken ERC20 token for entry fee
     * @param entryFee Amount of tokens required to enter
     */
    function createRace(
        uint8 trackId,
        address entryToken,
        uint256 entryFee
    ) external returns (uint256) {
        require(trackId > 0, "Invalid track ID");
        require(entryToken != address(0), "Invalid token address");
        require(entryFee > 0, "Entry fee must be > 0");

        uint256 raceId = _nextRaceId++;

        races[raceId] = Race({
            raceId: raceId,
            creator: msg.sender,
            trackId: trackId,
            entryToken: IERC20(entryToken),
            entryFee: entryFee,
            status: RaceStatus.Active,
            prizePool: 0,
            createdAt: block.timestamp,
            startedAt: 0,
            finishedAt: 0
        });

        emit RaceCreated(raceId, msg.sender, trackId, entryToken, entryFee);

        return raceId;
    }

    /**
     * @notice Enter a race with a rat NFT
     * @param raceId Race to enter
     * @param ratTokenId Rat NFT token ID
     */
    function enterRace(
        uint256 raceId,
        uint256 ratTokenId
    ) external nonReentrant {
        Race storage race = races[raceId];

        require(race.createdAt > 0, "Race does not exist");
        require(race.status == RaceStatus.Active, "Race not accepting entries");
        require(raceEntries[raceId].length < MAX_RACERS, "Race is full");
        require(!hasEntered[raceId][msg.sender], "Already entered this race");
        require(!ratInRace[raceId][ratTokenId], "Rat already in this race");
        require(!ratIsRacing[ratTokenId], "Rat already in active race");
        require(
            ratNFT.ownerOf(ratTokenId) == msg.sender,
            "Must own the rat NFT"
        );

        // Transfer entry fee
        race.entryToken.safeTransferFrom(
            msg.sender,
            address(this),
            race.entryFee
        );

        // Add entry
        raceEntries[raceId].push(
            RacerEntry({
                racer: msg.sender,
                ratTokenId: ratTokenId,
                enteredAt: block.timestamp,
                position: 0
            })
        );

        hasEntered[raceId][msg.sender] = true;
        ratInRace[raceId][ratTokenId] = true;
        ratIsRacing[ratTokenId] = true;
        race.prizePool += race.entryFee;

        // Update status if full
        if (raceEntries[raceId].length == MAX_RACERS) {
            race.status = RaceStatus.Full;
        }

        emit RacerEntered(raceId, msg.sender, ratTokenId);
    }

    /**
     * @notice Owner can enter any rat into a race for testing (bypasses entry fee)
     * @param raceId Race to enter
     * @param racer Address of the racer
     * @param ratTokenId Rat NFT token ID
     */
    function ownerEnterRace(
        uint256 raceId,
        address racer,
        uint256 ratTokenId
    ) external nonReentrant {
        require(msg.sender == admin, "Only admin");

        Race storage race = races[raceId];

        require(race.createdAt > 0, "Race does not exist");
        require(race.status == RaceStatus.Active, "Race not accepting entries");
        require(raceEntries[raceId].length < MAX_RACERS, "Race is full");
        require(!hasEntered[raceId][racer], "Already entered this race");
        require(!ratInRace[raceId][ratTokenId], "Rat already in this race");
        require(!ratIsRacing[ratTokenId], "Rat already in active race");
        require(
            ratNFT.ownerOf(ratTokenId) == racer,
            "Racer must own the rat NFT"
        );

        // Add entry (no entry fee charged)
        raceEntries[raceId].push(
            RacerEntry({
                racer: racer,
                ratTokenId: ratTokenId,
                enteredAt: block.timestamp,
                position: 0
            })
        );

        hasEntered[raceId][racer] = true;
        ratInRace[raceId][ratTokenId] = true;
        ratIsRacing[ratTokenId] = true;
        // Note: prizePool not increased since no entry fee paid

        // Update status if full
        if (raceEntries[raceId].length == MAX_RACERS) {
            race.status = RaceStatus.Full;
        }

        emit RacerEntered(raceId, racer, ratTokenId);
    }

    /**
     * @notice Cancel a race and refund all entrants (only race creator)
     * @param raceId Race to cancel
     */
    function cancelRace(uint256 raceId) external nonReentrant {
        Race storage race = races[raceId];

        require(race.createdAt > 0, "Race does not exist");
        require(msg.sender == race.creator, "Only creator can cancel");
        require(
            race.status == RaceStatus.Active || race.status == RaceStatus.Full,
            "Race cannot be cancelled"
        );

        race.status = RaceStatus.Cancelled;

        // Refund all entrants
        RacerEntry[] storage entries = raceEntries[raceId];
        for (uint256 i = 0; i < entries.length; i++) {
            race.entryToken.safeTransfer(entries[i].racer, race.entryFee);
            hasEntered[raceId][entries[i].racer] = false;
            ratInRace[raceId][entries[i].ratTokenId] = false;
            ratIsRacing[entries[i].ratTokenId] = false;
        }

        race.prizePool = 0;

        emit RaceCancelled(raceId, msg.sender);
    }

    /**
     * @notice Start a race (can be called by any participant when race is full)
     * @param raceId Race to start
     */
    function startRace(uint256 raceId) external {
        Race storage race = races[raceId];

        require(race.status == RaceStatus.Full, "Race not ready to start");
        require(hasEntered[raceId][msg.sender], "Must be a participant");

        race.status = RaceStatus.Started;
        race.startedAt = block.timestamp;

        emit RaceStarted(raceId, msg.sender);
    }

    /**
     * @notice Finish a race and distribute prizes
     * @param raceId Race to finish
     * @param winningRatTokenIds Array of rat token IDs in finishing order (1st, 2nd, 3rd, etc.)
     * @dev Can be called by anyone with the race results - trustless since results are verifiable
     */
    function finishRace(
        uint256 raceId,
        uint256[] calldata winningRatTokenIds
    ) external nonReentrant {
        Race storage race = races[raceId];

        require(race.status == RaceStatus.Started, "Race not started");
        require(
            winningRatTokenIds.length == MAX_RACERS,
            "Must provide all positions"
        );

        // Verify all rats are valid entries
        RacerEntry[] storage entries = raceEntries[raceId];
        for (uint256 i = 0; i < winningRatTokenIds.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < entries.length; j++) {
                if (entries[j].ratTokenId == winningRatTokenIds[i]) {
                    require(entries[j].position == 0, "Position already set");
                    entries[j].position = uint8(i + 1);
                    found = true;
                    break;
                }
            }
            require(found, "Invalid rat token ID");
        }

        race.status = RaceStatus.Finished;
        race.finishedAt = block.timestamp;

        // Calculate and distribute prizes
        _distributePrizes(raceId);

        // Release rats from race
        for (uint256 i = 0; i < entries.length; i++) {
            ratIsRacing[entries[i].ratTokenId] = false;
        }

        // Emit event
        address[] memory winners = new address[](MAX_RACERS);
        uint256[] memory prizes = new uint256[](MAX_RACERS);
        for (uint256 i = 0; i < MAX_RACERS; i++) {
            for (uint256 j = 0; j < entries.length; j++) {
                if (entries[j].ratTokenId == winningRatTokenIds[i]) {
                    winners[i] = entries[j].racer;
                    prizes[i] = _calculatePrize(raceId, uint8(i + 1));
                    break;
                }
            }
        }

        emit RaceFinished(raceId, winningRatTokenIds, winners, prizes);
    }

    /**
     * @notice Distribute prizes after race completion
     * @param raceId Race ID
     */
    function _distributePrizes(uint256 raceId) private {
        Race storage race = races[raceId];

        // Creator fee (10%)
        uint256 creatorFee = (race.prizePool * CREATOR_FEE_PERCENT) /
            PERCENT_DENOMINATOR;
        race.entryToken.safeTransfer(race.creator, creatorFee);

        // Remaining prize pool (90%)
        uint256 remainingPool = race.prizePool - creatorFee;

        // Prize distribution: 50% / 30% / 20% for top 3, others get 0
        uint256[] memory prizeShares = new uint256[](MAX_RACERS);
        prizeShares[0] = 50; // 1st place
        prizeShares[1] = 30; // 2nd place
        prizeShares[2] = 20; // 3rd place
        // 4th-6th get 0

        RacerEntry[] storage entries = raceEntries[raceId];
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].position > 0 && entries[i].position <= 3) {
                uint256 prize = (remainingPool *
                    prizeShares[entries[i].position - 1]) / 100;
                if (prize > 0) {
                    race.entryToken.safeTransfer(entries[i].racer, prize);
                    emit PrizeClaimed(raceId, entries[i].racer, prize);
                }
            }
        }
    }

    /**
     * @notice Calculate prize for a position
     * @param raceId Race ID
     * @param position Position (1-6)
     */
    function _calculatePrize(
        uint256 raceId,
        uint8 position
    ) private view returns (uint256) {
        Race storage race = races[raceId];
        uint256 remainingPool = (race.prizePool *
            (PERCENT_DENOMINATOR - CREATOR_FEE_PERCENT)) / PERCENT_DENOMINATOR;

        if (position == 1) return (remainingPool * 50) / 100;
        if (position == 2) return (remainingPool * 30) / 100;
        if (position == 3) return (remainingPool * 20) / 100;
        return 0;
    }

    /**
     * @notice Get race details
     * @param raceId Race ID
     */
    function getRace(uint256 raceId) external view returns (Race memory) {
        return races[raceId];
    }

    /**
     * @notice Get race entries
     * @param raceId Race ID
     */
    function getRaceEntries(
        uint256 raceId
    ) external view returns (RacerEntry[] memory) {
        return raceEntries[raceId];
    }

    /**
     * @notice Get current race count
     */
    function getRaceCount() external view returns (uint256) {
        return _nextRaceId;
    }

    /**
     * @notice Check if address has entered a race
     * @param raceId Race ID
     * @param racer Racer address
     */
    function hasRacerEntered(
        uint256 raceId,
        address racer
    ) external view returns (bool) {
        return hasEntered[raceId][racer];
    }

    /**
     * @notice Check if rat is currently racing
     * @param ratTokenId Rat token ID
     */
    function isRatRacing(uint256 ratTokenId) external view returns (bool) {
        return ratIsRacing[ratTokenId];
    }
}
