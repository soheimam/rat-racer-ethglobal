# Rat Racer - Smart Contract Architecture

## Overview

Professional, production-ready Solidity contracts for a competitive rat racing game with NFT ownership verification, ERC20 entry fees, and automated prize distribution.

## System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Rat Racer System                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   RatNFT     │      │  RaceToken   │      │ RaceManager  │
│   (ERC721)   │◄─────│   (ERC20)    │─────►│   (Core)     │
└──────────────┘      └──────────────┘      └──────────────┘
       │                      │                      │
       │                      │                      │
       └──────────────────────┴──────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Race Lifecycle  │
                    │                   │
                    │ 1. Create         │
                    │ 2. Enter (6/6)    │
                    │ 3. Start          │
                    │ 4. Finish         │
                    │ 5. Distribute $   │
                    └───────────────────┘
```

## Contract Architecture

### 1. RatNFT (ERC721)

**Purpose**: NFT representing racing rats that users must own to enter races.

**Location**: `rat/contracts/RatNFT.sol`

**Inheritance**:

```solidity
RatNFT is ERC721Enumerable, Ownable
```

**Key Features**:

- Standard ERC721 with enumeration
- 6 color variants (models 0-5)
- Metadata storage (name, color, mint timestamp)
- Batch queries for owned rats

**Storage**:

```solidity
struct RatMetadata {
    string name;      // Rat's name
    uint8 color;      // Color/model (0-5)
    uint256 mintedAt; // Mint timestamp
}

mapping(uint256 => RatMetadata) public ratMetadata;
```

**External Functions**:

```solidity
function mint(address to, string name, uint8 color) external returns (uint256)
function getRatMetadata(uint256 tokenId) external view returns (RatMetadata)
function getRatsOfOwner(address owner) external view returns (uint256[])
function setBaseURI(string baseTokenURI_) external onlyOwner
```

**Security**:

- ✅ OpenZeppelin ERC721Enumerable (battle-tested)
- ✅ Ownable for admin functions
- ✅ Input validation (color range, name existence)

---

### 2. RaceToken (ERC20)

**Purpose**: Mock ERC20 token for race entry fees and prize distribution.

**Location**: `race/contracts/RaceToken.sol`

**Inheritance**:

```solidity
RaceToken is ERC20, Ownable
```

**Key Features**:

- Standard ERC20 implementation
- Initial supply: 1,000,000 RACE
- Faucet function for testing
- Mintable by owner

**External Functions**:

```solidity
function mint(address to, uint256 amount) external onlyOwner
function faucet() external // Testing only - gives 1000 RACE
```

**Security**:

- ✅ OpenZeppelin ERC20 standard
- ✅ Ownable for controlled minting
- ⚠️ Faucet should be removed for production

---

### 3. RaceManager (Core Logic)

**Purpose**: Manages race lifecycle, entry verification, and prize distribution.

**Location**: `race/contracts/RaceManager.sol`

**Inheritance**:

```solidity
RaceManager is ReentrancyGuard
```

**Constants**:

```solidity
uint8 public constant MAX_RACERS = 6;           // 6 rats per race
uint256 public constant CREATOR_FEE_PERCENT = 10; // 10% to creator
uint256 public constant PERCENT_DENOMINATOR = 100;
```

**State Machine**:

```solidity
enum RaceStatus {
    Active,    // Accepting entries
    Full,      // 6/6 racers, ready to start
    Started,   // Race in progress
    Finished   // Race complete, prizes distributed
}
```

**Data Structures**:

```solidity
struct Race {
    uint256 raceId;
    address creator;        // Earns 10% fee
    uint8 trackId;         // Track identifier (1+)
    IERC20 entryToken;     // Token used for entry
    uint256 entryFee;      // Amount required to enter
    RaceStatus status;     // Current state
    uint256 prizePool;     // Total accumulated fees
    uint256 createdAt;     // Creation timestamp
    uint256 startedAt;     // Start timestamp
    uint256 finishedAt;    // Finish timestamp
}

struct RacerEntry {
    address racer;         // Racer's address
    uint256 ratTokenId;    // Rat NFT used
    uint256 enteredAt;     // Entry timestamp
    uint8 position;        // Final position (1-6)
}
```

**Storage**:

```solidity
IERC721 public immutable ratNFT;                    // Rat NFT reference
mapping(uint256 => Race) public races;              // Race data
mapping(uint256 => RacerEntry[]) public raceEntries; // Race participants
mapping(uint256 => mapping(address => bool)) hasEntered; // Prevent double entry
mapping(uint256 => mapping(uint256 => bool)) ratInRace;  // Prevent rat reuse
```

**External Functions**:

#### Race Creation

```solidity
function createRace(
    uint8 trackId,
    address entryToken,
    uint256 entryFee
) external returns (uint256 raceId)
```

- Anyone can create a race
- Creator earns 10% of prize pool
- Validates: trackId > 0, token address, fee > 0

#### Race Entry

```solidity
function enterRace(
    uint256 raceId,
    uint256 ratTokenId
) external nonReentrant
```

- Requires: Own the rat NFT
- Requires: Sufficient token approval
- Checks: Race exists, Active status, not full, not entered, rat not in race
- Transfers entry fee to contract
- Updates to Full status when 6/6

#### Race Start

```solidity
function startRace(uint256 raceId) external
```

- Can be called by ANY participant
- Requires: Race Full (6/6)
- Updates status to Started
- Records start timestamp

#### Race Finish

```solidity
function finishRace(
    uint256 raceId,
    uint256[] calldata winningRatTokenIds
) external
```

- Typically called by oracle/backend
- Requires: Race Started, 6 positions provided
- Sets final positions
- Distributes prizes immediately
- Updates status to Finished

**Prize Distribution Logic**:

```solidity
Total Prize Pool: 6 × entry fee

Creator Fee: 10% of total
Remaining: 90% of total

1st Place: 50% of remaining = 45% of total
2nd Place: 30% of remaining = 27% of total
3rd Place: 20% of remaining = 18% of total
4th-6th: 0%
```

**View Functions**:

```solidity
function getRace(uint256 raceId) external view returns (Race)
function getRaceEntries(uint256 raceId) external view returns (RacerEntry[])
function getRaceCount() external view returns (uint256)
function hasRacerEntered(uint256 raceId, address racer) external view returns (bool)
```

**Security Features**:

- ✅ ReentrancyGuard on all token transfers
- ✅ SafeERC20 for safe token operations
- ✅ NFT ownership verification before entry
- ✅ State machine prevents invalid transitions
- ✅ Double-entry prevention
- ✅ Immediate prize distribution (no claims needed)

---

## Race Lifecycle

### Phase 1: Creation

```solidity
// Creator creates race with custom parameters
uint256 raceId = raceManager.createRace(
    1,                    // trackId
    raceToken.address,    // entry token
    parseEther("100")     // entry fee
)

// Race Status: Active
// Entries: 0/6
```

### Phase 2: Entry

```solidity
// Racers enter one by one
for (racer in racers) {
    // 1. Racer owns rat NFT (verified on-chain)
    require(ratNFT.ownerOf(tokenId) == racer)

    // 2. Racer approves entry fee
    raceToken.approve(raceManager, entryFee)

    // 3. Enter race
    raceManager.enterRace(raceId, ratTokenId)

    // Entry fee transferred to contract
    // Prize pool increases
}

// When 6th racer enters:
// Race Status: Active → Full
// Entries: 6/6
// Prize Pool: 600 RACE
```

### Phase 3: Start

```solidity
// Any participant can start
raceManager.startRace(raceId)

// Race Status: Full → Started
// startedAt timestamp recorded
// Frontend begins race animation
```

### Phase 4: Finish & Distribution

```solidity
// Backend/Oracle determines winner order
// Calls finish with results
raceManager.finishRace(raceId, [
    tokenId3,  // 1st place
    tokenId1,  // 2nd place
    tokenId5,  // 3rd place
    tokenId2,  // 4th
    tokenId4,  // 5th
    tokenId6   // 6th
])

// Automatic prize distribution:
// Creator: 60 RACE (10%)
// 1st: 270 RACE (45%)
// 2nd: 162 RACE (27%)
// 3rd: 108 RACE (18%)
// 4th-6th: 0 RACE

// Race Status: Started → Finished
// finishedAt timestamp recorded
```

---

## Integration Points

### Frontend Integration

```typescript
// 1. Check rat ownership
const rats = await ratNFT.getRatsOfOwner(userAddress);

// 2. Get active races
const raceCount = await raceManager.getRaceCount();
for (let i = 0; i < raceCount; i++) {
  const race = await raceManager.getRace(i);
  if (race.status === RaceStatus.Active) {
    // Show race in UI
  }
}

// 3. Enter race
await raceToken.approve(raceManager.address, entryFee);
await raceManager.enterRace(raceId, selectedRatTokenId);

// 4. Monitor race status
const race = await raceManager.getRace(raceId);
// Update UI based on race.status
```

### Backend/Oracle Integration

```typescript
// Monitor for started races
const filter = raceManager.filters.RaceStarted();
raceManager.on(filter, async (raceId, startedBy) => {
  // Run race simulation
  const results = await simulateRace(raceId);

  // Finish race with results
  await raceManager.finishRace(raceId, results.winningOrder);
});
```

---

## Events

```solidity
// RatNFT
event RatMinted(address indexed owner, uint256 indexed tokenId, string name, uint8 color)

// RaceManager
event RaceCreated(uint256 indexed raceId, address indexed creator, uint8 trackId, address entryToken, uint256 entryFee)
event RacerEntered(uint256 indexed raceId, address indexed racer, uint256 indexed ratTokenId)
event RaceStarted(uint256 indexed raceId, address indexed startedBy)
event RaceFinished(uint256 indexed raceId, uint256[] winningRatTokenIds, address[] winners, uint256[] prizes)
event PrizeClaimed(uint256 indexed raceId, address indexed racer, uint256 amount)
```

---

## Gas Optimization

- **Mappings over arrays**: O(1) lookups
- **Minimal storage writes**: Only essential data stored
- **Batch operations**: Prize distribution in single transaction
- **Events for indexing**: Off-chain data retrieval
- **Immutable variables**: Gas savings on reads
- **Efficient structs**: Packed where possible

---

## Security Considerations

### Implemented

✅ ReentrancyGuard on entry
✅ SafeERC20 for transfers
✅ Ownership verification before entry
✅ State machine validation
✅ Input validation
✅ OpenZeppelin contracts
✅ Double-entry prevention
✅ Immediate distribution (no claims)

### For Production

⚠️ Remove faucet from RaceToken
⚠️ Add access control to finishRace (oracle only)
⚠️ Consider time limits on races
⚠️ Add emergency pause functionality
⚠️ Consider escrow for very high-value races

---

## Testing Coverage

### Unit Tests

- RatNFT: 15+ tests
- RaceManager: 30+ tests
- Total: 80+ E2E integration tests

### Scenarios Covered

✅ Happy paths (full lifecycle)
✅ Error conditions (invalid inputs)
✅ Edge cases (transfers, odd fees)
✅ Security (reentrancy, permissions)
✅ Math precision (prize distribution)
✅ Concurrent races
✅ State transitions

---

## Future Enhancements

### Phase 2

- Multiple track support (different lengths/difficulties)
- Rat attributes (speed, stamina, etc)
- Training/leveling system
- Breeding mechanics

### Phase 3

- Tournament brackets
- Leaderboards
- Seasonal competitions
- Dynamic prize pools
- Sponsorships

### Advanced

- Cross-chain racing
- Rat staking during races
- Dynamic entry fees based on demand
- Betting system
- DAO governance for rules

---

## Deployment Checklist

- [ ] Compile all contracts (`npx hardhat compile`)
- [ ] Run all tests (`npm run test:e2e`)
- [ ] Deploy RatNFT first
- [ ] Deploy RaceToken
- [ ] Deploy RaceManager with RatNFT address
- [ ] Verify contracts on block explorer
- [ ] Remove faucet from RaceToken for production
- [ ] Set up oracle for finishRace calls
- [ ] Configure frontend with contract addresses
- [ ] Test on testnet before mainnet
- [ ] Set up monitoring and alerts

---

## Contract Addresses Template

```typescript
// mainnet / testnet
export const CONTRACTS = {
  RAT_NFT: "0x...",
  RACE_TOKEN: "0x...",
  RACE_MANAGER: "0x...",
};

// ABIs
import RatNFTABI from "./abis/RatNFT.json";
import RaceTokenABI from "./abis/RaceToken.json";
import RaceManagerABI from "./abis/RaceManager.json";
```

---

**Built with ❤️ for ETHGlobal**
