# Quick Start - Rat Racer Contracts

Get up and running with the Rat Racer smart contracts in 5 minutes.

## TL;DR

```bash
cd contracts
./run-all-tests.sh
```

This single command will:

- Install all dependencies
- Compile all contracts
- Run 80+ comprehensive tests
- Show you a complete coverage report

## What You Get

### 3 Production-Ready Contracts

1. **RatNFT.sol** - ERC721 NFT for racing rats

   - 6 color variants
   - Metadata storage
   - Enumeration support

2. **RaceToken.sol** - ERC20 token for entry fees

   - Mock token with faucet
   - Standard ERC20 functionality
   - 1M initial supply

3. **RaceManager.sol** - Core racing logic
   - Race creation and management
   - Entry fee processing
   - Prize distribution (10% creator, 45/27/18% top 3)
   - Full state machine

### 100% Test Coverage

- **RatNFT**: 15+ tests
- **RaceManager**: 30+ tests
- **E2E Integration**: 80+ tests covering ALL interactions

## Manual Setup

### Install Dependencies

```bash
# Rat contracts
cd contracts/rat
npm install

# Race contracts
cd ../race
npm install
```

### Compile

```bash
# Rat contracts
cd contracts/rat
npx hardhat compile

# Race contracts
cd ../race
npx hardhat compile
```

### Run Tests

#### All Tests

```bash
cd contracts/race
npm test
```

#### Just E2E (Recommended)

```bash
cd contracts/race
npm run test:e2e
```

#### With Coverage

```bash
cd contracts/race
npm run test:coverage
```

## Contract Addresses (After Deploy)

You'll need to:

1. Deploy RatNFT first
2. Use RatNFT address when deploying RaceManager
3. Deploy RaceToken with RaceManager

### Deploy Locally

```bash
# Terminal 1: Start local node
cd contracts/race
npx hardhat node

# Terminal 2: Deploy RatNFT
cd contracts/rat
npx hardhat ignition deploy ignition/modules/RatNFT.ts --network localhost

# Note the RatNFT address, then deploy Race contracts
cd ../race
npx hardhat ignition deploy ignition/modules/RaceContracts.ts \
  --parameters '{"RaceContractsModule":{"ratNFTAddress":"0x..."}}' \
  --network localhost
```

## Using the Contracts

### 1. Mint a Rat

```typescript
import { ratNFT } from "./contracts";

await ratNFT.mint(
  userAddress,
  "Lightning McRat", // name
  2 // color (0-5)
);
```

### 2. Create a Race

```typescript
import { raceManager, raceToken } from "./contracts";

const raceId = await raceManager.createRace(
  1, // trackId
  raceToken.address,
  ethers.parseEther("100") // entry fee
);
```

### 3. Enter a Race

```typescript
// Approve tokens
await raceToken.approve(raceManager.address, ethers.parseEther("100"));

// Enter with your rat
await raceManager.enterRace(raceId, ratTokenId);
```

### 4. Start Race (Any Participant)

```typescript
// Once 6/6 racers have entered
await raceManager.startRace(raceId);
```

### 5. Finish Race (Backend/Oracle)

```typescript
// Provide finishing order (rat token IDs)
await raceManager.finishRace(raceId, [
  tokenId1,
  tokenId2,
  tokenId3,
  tokenId4,
  tokenId5,
  tokenId6,
]);
```

## Prize Distribution

For a race with **100 RACE** entry fee and **6 racers** (600 total):

| Position | Amount | Calculation                  |
| -------- | ------ | ---------------------------- |
| Creator  | 60     | 10% of total                 |
| 1st      | 270    | 50% of remaining (45% total) |
| 2nd      | 162    | 30% of remaining (27% total) |
| 3rd      | 108    | 20% of remaining (18% total) |
| 4th-6th  | 0      | No prize                     |

## What The Tests Cover

✅ **Contract Deployment** - All 3 contracts
✅ **ERC20 Functions** - Mint, transfer, approve, faucet
✅ **ERC721 Functions** - Mint, transfer, enumerate, metadata
✅ **Race Creation** - Valid/invalid params, multiple races
✅ **Race Entry** - Ownership checks, payment, state updates
✅ **Race Start** - Participant validation, state transitions
✅ **Race Finish** - Prize calc, distribution, final state
✅ **Edge Cases** - Reentrancy, ownership transfers, odd fees
✅ **Security** - Access control, SafeERC20, ReentrancyGuard
✅ **Math** - 100% prize distribution, precision

## Expected Test Output

```
  End-to-End: Full Race System Integration
    System Deployment & Configuration
      ✔ Should deploy all contracts with correct configuration (XXXms)
      ✔ Should have correct initial token supply
    RaceToken (ERC20) Full Coverage
      ✔ Should allow minting by owner
      ✔ Should allow faucet claims
      ...
    [80+ more tests]

  80 passing (XXs)
```

## Common Issues

### "Cannot find module @openzeppelin/contracts"

```bash
cd contracts/rat && npm install
cd ../race && npm install
```

### "Contract not found"

```bash
npx hardhat compile
```

### "Insufficient funds"

In tests, we use faucet:

```typescript
await raceToken.faucet(); // Gives 1000 RACE tokens
```

## Next Steps

1. ✅ Run tests to ensure everything works
2. Deploy to local Hardhat network
3. Deploy to testnet (Sepolia, etc)
4. Integrate with your frontend
5. Set up backend oracle for `finishRace()`

## File Structure

```
contracts/
├── rat/
│   ├── contracts/
│   │   └── RatNFT.sol ⭐
│   ├── test/
│   │   └── RatNFT.ts
│   └── ignition/modules/RatNFT.ts
├── race/
│   ├── contracts/
│   │   ├── RaceToken.sol ⭐
│   │   └── RaceManager.sol ⭐
│   ├── test/
│   │   ├── RaceManager.ts
│   │   └── E2E.test.ts ⭐⭐
│   └── ignition/modules/RaceContracts.ts
├── README.md
├── QUICKSTART.md (you are here)
├── TEST_GUIDE.md
└── run-all-tests.sh
```

## Questions?

Check out:

- `README.md` - Detailed architecture
- `TEST_GUIDE.md` - Complete test documentation
- Contract comments - Every function is documented

## Pro Tips

1. Use `npm run test:e2e` - Fastest way to verify everything
2. The E2E test simulates real user flows - read it for integration examples
3. All contracts use OpenZeppelin for security - battle-tested code
4. ReentrancyGuard protects all entry fee functions
5. SafeERC20 prevents token transfer issues

---

**Ready to race? Run those tests! 🐀⚡**
