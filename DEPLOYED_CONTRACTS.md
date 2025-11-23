# Deployed Contracts - Base Mainnet (FINAL)

## 📋 Contract Addresses

```
RaceToken:   0xea4eaca6e4197ecd092ba77b5da768f19287e06f
RatNFT:      0x1b69409a885acddc68a9873da2dc32d42f29604f
RaceManager: 0x847af80afceda2ecfd95dd72c3f76d200fca433d
```

## 🎫 RaceToken (ERC20)

**Address:** `0xea4eaca6e4197ecd092ba77b5da768f19287e06f`

- **Name:** Race Token
- **Symbol:** RACE
- **Decimals:** 18
- **Total Supply:** 1,000,000,000 RACE (1 billion)
- **Treasury:** `0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830` (has all tokens)
- **Status:** ✅ On Uniswap, approved in RaceManager

[View on BaseScan](https://basescan.org/address/0xea4eaca6e4197ecd092ba77b5da768f19287e06f)

## 🐀 RatNFT (ERC721)

**Address:** `0x1b69409a885acddc68a9873da2dc32d42f29604f`

- **Name:** Rat Racer
- **Symbol:** RAT
- **Type:** ERC721Enumerable
- **Owner:** `0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830`

### Approved Image Variants

Users can mint rats with these image variants:

- **Index 0** - Brown rat
- **Index 1** - Pink rat
- **Index 2** - White rat

More variants can be added by the owner using:

```bash
IMAGE_INDEX=3 npx hardhat run scripts/manage-image-variants.ts --network base
```

### Minting

```solidity
// Mint with approved imageIndex
ratNFT.mint(to, imageIndex)
```

**Event Emitted:**

```solidity
event RatMinted(address indexed to, uint256 indexed tokenId, uint256 imageIndex)
```

The webhook listens for this event and generates metadata off-chain.

[View on BaseScan](https://basescan.org/address/0x1b69409a885acddc68a9873da2dc32d42f29604f)

## 🏁 RaceManager

**Address:** `0x847af80afceda2ecfd95dd72c3f76d200fca433d`

- **RatNFT:** `0x1b69409a885acddc68a9873da2dc32d42f29604f`
- **Admin:** `0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830`
- **Max Racers:** 6 per race
- **Creator Fee:** 10% of prize pool

### Approved Tokens

Users can create races with these tokens:

| Token    | Address                                      | Details                          |
| -------- | -------------------------------------------- | -------------------------------- |
| **RACE** | `0xea4eaca6e4197ecd092ba77b5da768f19287e06f` | Native game token (18 decimals)  |
| **USDC** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Native USDC on Base (6 decimals) |

### Creating a Race

```solidity
// Create race with RACE tokens
raceManager.createRace(
    1,                                              // trackId
    0xea4eaca6e4197ecd092ba77b5da768f19287e06f,    // RACE token
    1000 * 10**18                                   // 1000 RACE entry fee
)

// Create race with USDC
raceManager.createRace(
    2,                                              // trackId
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,    // Native USDC on Base
    10 * 10**6                                      // $10 USDC entry fee
)
```

### Prize Distribution

- **Creator:** 10% of total entry fees
- **1st Place:** 50% of remaining pool (45% of total)
- **2nd Place:** 30% of remaining pool (27% of total)
- **3rd Place:** 20% of remaining pool (18% of total)
- **4th-6th:** No prize

### Example Prize Breakdown

If 6 racers enter with 1000 RACE each:

- **Total Pool:** 6000 RACE
- **Creator:** 600 RACE (10%)
- **Remaining:** 5400 RACE
- **1st Place:** 2700 RACE (50% of 5400)
- **2nd Place:** 1620 RACE (30% of 5400)
- **3rd Place:** 1080 RACE (20% of 5400)

[View on BaseScan](https://basescan.org/address/0x847af80afceda2ecfd95dd72c3f76d200fca433d)

## 🔗 Environment Variables

Add these to your `.env`:

```bash
# Contract Addresses (FINAL - DO NOT CHANGE)
RACE_TOKEN_ADDRESS="0xea4eaca6e4197ecd092ba77b5da768f19287e06f"
RAT_NFT_ADDRESS="0x1b69409a885acddc68a9873da2dc32d42f29604f"
RACE_MANAGER_ADDRESS="0x847af80afceda2ecfd95dd72c3f76d200fca433d"

# Admin/Treasury
ADMIN_ADDRESS="0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830"

# Metadata Storage
BLOB_BASE_URL="https://your-blob-storage.vercel-storage.com/rats/metadata/"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Network
NEXT_PUBLIC_RPC_ENDPOINT="https://mainnet.base.org"
```

## 🎮 Game Flow

1. **User mints rat**
   - Selects imageIndex (0-2 initially)
   - Contract validates imageIndex is approved
   - RatNFT emits `RatMinted` event
   - Webhook generates metadata
2. **User creates race**
   - Selects track, token (RACE or USDC), and entry fee
   - Contract validates token is approved
   - Race opens for entries
3. **Users enter race**
   - Approve token spending
   - Enter with their rat NFT
   - Race fills up (6/6)
4. **Race starts**
   - Any participant can call `startRace()`
   - Backend simulates race
5. **Race finishes**
   - Anyone can call `finishRace()` with results
   - Prizes automatically distributed
   - Rats released for next race

## 🛠️ Admin Functions

### Add Approved Token (RaceManager)

```bash
cd contracts/race

TOKEN_ADDRESS=0x... \
RACE_MANAGER_ADDRESS=0x847af80afceda2ecfd95dd72c3f76d200fca433d \
npx hardhat run scripts/manage-approved-tokens.ts --network base
```

### Add Approved Image Variant (RatNFT)

```bash
cd contracts/rat

IMAGE_INDEX=3 \
RAT_NFT_ADDRESS=0x1b69409a885acddc68a9873da2dc32d42f29604f \
npx hardhat run scripts/manage-image-variants.ts --network base
```

### List Approved Tokens

```bash
RACE_MANAGER_ADDRESS=0x847af80afceda2ecfd95dd72c3f76d200fca433d \
npx hardhat run scripts/list-approved-tokens.ts --network base
```

### List Approved Image Variants

```bash
RAT_NFT_ADDRESS=0x1b69409a885acddc68a9873da2dc32d42f29604f \
npx hardhat run scripts/list-image-variants.ts --network base
```

### Set RatNFT Base URI

```bash
cd contracts/rat

RAT_NFT_ADDRESS=0x1b69409a885acddc68a9873da2dc32d42f29604f \
BLOB_BASE_URL=$BLOB_BASE_URL \
npx hardhat run scripts/set-base-uri.ts --network base
```

## 📱 Frontend Integration

### Example: Mint a Rat

```typescript
import { RatNFT_ABI } from "./abis/RatNFT";

// User selects approved imageIndex: 0 (brown), 1 (pink), or 2 (white)
const imageIndex = 0;

const hash = await walletClient.writeContract({
  address: "0x1b69409a885acddc68a9873da2dc32d42f29604f",
  abi: RatNFT_ABI,
  functionName: "mint",
  args: [userAddress, imageIndex],
});
```

### Example: Create a Race

```typescript
import { RaceManager_ABI } from "./abis/RaceManager";
import { parseUnits } from "viem";

// Create race with USDC, $10 entry fee
const hash = await walletClient.writeContract({
  address: "0x847af80afceda2ecfd95dd72c3f76d200fca433d",
  abi: RaceManager_ABI,
  functionName: "createRace",
  args: [
    1, // trackId
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native USDC on Base
    parseUnits("10", 6), // $10 USDC
  ],
});
```

## ✅ Features

✅ **RaceToken** - 1B supply on Uniswap  
✅ **Multi-token races** - RACE and USDC approved  
✅ **Expandable rat variants** - Start with 3, add more anytime  
✅ **Color selection** - Users choose their rat's appearance  
✅ **Prize distribution** - Automatic 50/30/20 split  
✅ **Race cancellation** - Full refunds available  
✅ **Global rat locking** - No double-entry exploits  
✅ **ReentrancyGuard** - Protected against attacks  
✅ **Fully deployed** - Ready for mainnet use

## 🔒 Security Notes

- All contracts are deployed and immutable
- Admin can only:
  - Add/remove approved tokens in RaceManager
  - Add/remove approved image variants in RatNFT
  - Set base URI in RatNFT
  - Owner mint rats in RatNFT (for testing/airdrops)
- Race creators can cancel their races (full refunds)
- finishRace() can be called by anyone (no oracle needed)
- ReentrancyGuard on all entry/finish functions
- Global rat locking prevents double-entry

## 📊 Current State

✅ RaceToken deployed with 1B supply in treasury  
✅ RaceToken on Uniswap (liquidity pool active)  
✅ RatNFT deployed with expandable variants (0-2 approved)  
✅ RaceManager deployed with multi-token support  
✅ RACE token approved for races  
✅ USDC token approved for races  
✅ Ready for mainnet use

## 🎨 Adding New Rat Variants

When you want to add a new rat design (e.g., black rat, spotted rat):

1. **Create the image** and add to `/public/images/`
2. **Update metadata generator** to handle new imageIndex
3. **Approve on-chain:**
   ```bash
   IMAGE_INDEX=3 npx hardhat run scripts/manage-image-variants.ts --network base
   ```
4. **Update frontend** to show new option

No contract redeployment needed! 🎉
