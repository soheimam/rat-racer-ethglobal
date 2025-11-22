# Rat Racer Smart Contracts

Professional Solidity contracts for the Rat Racer racing game, featuring NFT ownership verification and race management with entry fees.

## Architecture

The system consists of three main contracts:

### 1. RatNFT (ERC721)

Located in: `rat/contracts/RatNFT.sol`

- **Purpose**: NFT representing racing rats
- **Features**:
  - ERC721 standard compliance with enumeration
  - Rat metadata (name, color/model, mint timestamp)
  - Query functions for owned rats
  - 6 different rat colors/models (0-5)

### 2. RaceToken (ERC20)

Located in: `race/contracts/RaceToken.sol`

- **Purpose**: Mock ERC20 token for race entry fees
- **Features**:
  - Standard ERC20 implementation
  - Faucet function for testing
  - Initial supply of 1M tokens

### 3. RaceManager

Located in: `race/contracts/RaceManager.sol`

- **Purpose**: Core race management and prize distribution
- **Features**:
  - Race creation with custom entry fees and tokens
  - NFT ownership verification for entry
  - 10% creator fee on all races
  - Prize distribution: 50% / 30% / 20% for top 3
  - Track ID system (currently using track 1)
  - Full reentrancy protection

## Race Flow

### 1. Create Race

```solidity
createRace(uint8 trackId, address entryToken, uint256 entryFee)
```

- Anyone can create a race
- Creator specifies track, entry token, and fee
- Race starts in `Active` status

### 2. Enter Race

```solidity
enterRace(uint256 raceId, uint256 ratTokenId)
```

- Requires NFT ownership (must own the rat)
- Requires ERC20 approval for entry fee
- Race must be `Active` and not full
- Maximum 6 racers per race
- Once full, status changes to `Full`

### 3. Start Race

```solidity
startRace(uint256 raceId)
```

- Can only be called by race participants
- Race must be `Full` (6/6 racers)
- Changes status to `Started`

### 4. Finish Race

```solidity
finishRace(uint256 raceId, uint256[] winningRatTokenIds)
```

- Typically called by oracle/backend
- Distributes prizes automatically:
  - Creator: 10% of total prize pool
  - 1st place: 50% of remaining (45% of total)
  - 2nd place: 30% of remaining (27% of total)
  - 3rd place: 20% of remaining (18% of total)
  - 4th-6th: 0

## Setup & Deployment

### Install Dependencies

```bash
# Rat NFT contracts
cd contracts/rat
npm install

# Race contracts
cd ../race
npm install
```

### Compile Contracts

```bash
# Rat NFT
cd contracts/rat
npx hardhat compile

# Race contracts
cd ../race
npx hardhat compile
```

### Run Tests

```bash
# Test Rat NFT
cd contracts/rat
npx hardhat test

# Test Race Manager
cd ../race
npx hardhat test
```

### Deploy

**Step 1: Deploy RatNFT**

```bash
cd contracts/rat
npx hardhat ignition deploy ignition/modules/RatNFT.ts --network <network>
```

**Step 2: Deploy Race Contracts**

```bash
cd ../race
npx hardhat ignition deploy ignition/modules/RaceContracts.ts \
  --parameters '{"RaceContractsModule":{"ratNFTAddress":"<RAT_NFT_ADDRESS>"}}' \
  --network <network>
```

## Integration Example

```typescript
// 1. Mint a rat
await ratNFT.mint(userAddress, "Speedy", 2);

// 2. Create a race
const raceId = await raceManager.createRace(
  1, // trackId
  raceToken.address,
  ethers.parseEther("100") // 100 RACE tokens
);

// 3. Approve and enter race
await raceToken.approve(raceManager.address, entryFee);
await raceManager.enterRace(raceId, ratTokenId);

// 4. Start when full
await raceManager.startRace(raceId);

// 5. Finish and distribute prizes
await raceManager.finishRace(raceId, [
  tokenId1,
  tokenId2,
  tokenId3,
  tokenId4,
  tokenId5,
  tokenId6,
]);
```

## Security Features

- ✅ ReentrancyGuard on all entry fee transfers
- ✅ SafeERC20 for token interactions
- ✅ NFT ownership verification
- ✅ Race state machine prevents invalid transitions
- ✅ Double-entry prevention
- ✅ OpenZeppelin battle-tested contracts

## Prize Distribution Example

For a race with 100 RACE token entry fee and 6 racers (600 total):

- **Creator**: 60 RACE (10%)
- **1st Place**: 270 RACE (45%)
- **2nd Place**: 162 RACE (27%)
- **3rd Place**: 108 RACE (18%)
- **4th-6th**: 0 RACE

## Gas Optimization

- Uses mappings for O(1) lookups
- Minimal storage writes
- Batch operations where possible
- Events for off-chain indexing

## Future Enhancements

- Multiple track support (currently track 1)
- ERC721 staking during races
- Tournament brackets
- Time-based races
- Dynamic prize distribution
