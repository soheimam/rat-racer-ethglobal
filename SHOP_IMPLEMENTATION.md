# Shop Minting Implementation

## Overview

Complete shop implementation for minting rats with RACE tokens, elegant UX, and automatic metadata fetching.

## Features

### 1. Rat Selection UI (`/shop`)

- 3 rat options: White, Brown, Pink
- Beautiful card layout with images
- Cost: 100 RACE tokens per mint
- Connect wallet prompt if not connected

### 2. Smart Minting Flow

```typescript
1. Check RACE token allowance
2. Auto-approve if needed (first time only)
3. Mint rat with selected imageIndex (0/1/2)
4. Wait for transaction confirmation
5. Poll API for rat metadata
6. Display success modal with full rat stats
```

### 3. Transaction Handling

- **Approval Step**: Checks allowance, approves if < 100 RACE
- **Mint Step**: Calls `mint(address, imageIndex)` on RatNFT contract
- **Confirmation**: Waits for transaction receipt
- **Event Parsing**: Extracts tokenId from RatMinted event

### 4. Success Modal

Displays:

- Rat name and Token ID
- Bloodline (e.g., "Speed Demon", "Street Runner")
- Rarity score (calculated from stats)
- Stamina and Agility stats
- 5-segment speed distribution
- Actions: Close or "View My Rats"

### 5. Polling Mechanism

- Polls `/api/rats/[tokenId]` every 2 seconds
- Max 20 attempts (40 seconds total)
- Waits for webhook to process mint and generate metadata
- Graceful fallback if polling times out

## Files Created

### Frontend

- **`app/shop/page.tsx`** - Main shop UI with minting logic
- **`lib/contracts/mint-rat.ts`** - Minting logic with viem
- **`components/ui/card.tsx`** - Card component for UI

### Backend

- **`app/api/rats/[tokenId]/route.ts`** - Fetches rat by tokenId
- **`lib/db/rats.ts`** - Added `getRatByTokenId()` method

### Config

- **`lib/wagmi-config.ts`** - Wagmi configuration export

## Contract Integration

### RatNFT Contract

```solidity
function mint(address to, uint8 imageIndex) external returns (uint256)
```

### RaceToken Contract

```solidity
function approve(address spender, uint256 amount) external returns (bool)
function allowance(address owner, address spender) external view returns (uint256)
```

## Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_RAT_NFT_ADDRESS=0x456ff59525a02cc4917a93701E12F6D7da79552E
NEXT_PUBLIC_RACE_TOKEN_ADDRESS=0x909cd2621513aD132ff33007EbaE88D727C5c0d4
NEXT_PUBLIC_RACE_MANAGER_ADDRESS=0xDA24fF53296c1E5E81fc86b9Fb7deb82e9701E65
```

## User Flow

1. **Visit Shop**: User navigates to `/shop`
2. **Select Rat**: Chooses white, brown, or pink rat
3. **Click Mint**: Button shows "Mint for 100 RACE"
4. **Approve Tokens**: If first time, approves RACE token spending
5. **Confirm Mint**: Confirms transaction in wallet
6. **Wait**: System shows toast notifications for each step
7. **Success Modal**: Beautiful modal with rat stats appears
8. **View Rats**: Links to "My Rats" page

## Error Handling

- **Wallet Not Connected**: Shows toast to connect wallet
- **Insufficient RACE**: Transaction will revert with error
- **Transaction Failed**: Shows error toast with message
- **Polling Timeout**: Shows fallback message to check "My Rats" later

## Testing

### Prerequisites

- Wallet connected to Base Mainnet
- At least 100 RACE tokens
- Sufficient ETH for gas (~$0.50-1.00)

### Test Flow

1. Connect wallet
2. Get RACE tokens (contract owner can mint)
3. Visit `/shop`
4. Select any rat image
5. Click mint and approve
6. Wait for success modal
7. Verify rat appears in "My Rats"

## Technical Details

### imageIndex Mapping

- `0` = White Rat (`/images/white.png`)
- `1` = Brown Rat (`/images/brown.png`)
- `2` = Pink Rat (`/images/pink.png`)

### Rarity Score Calculation

```typescript
rarityScore = (bloodlineScore + statScore + speedScore) / 3

bloodlineScore: 100 (Speed Demon) to 25 (Sewer Dweller)
statScore: (stamina + agility) / 2
speedScore: average of 5 segment speeds
```

### Polling Strategy

- Interval: 2 seconds
- Max attempts: 20 (40 seconds total)
- Endpoint: `GET /api/rats/[tokenId]`
- Returns: Rat metadata from MongoDB

## Future Enhancements

1. **Show Transaction Link**: Link to Basescan after mint
2. **Bulk Minting**: Allow minting multiple rats at once
3. **Preview Stats**: Show estimated stat ranges before minting
4. **Mint History**: Show recent mints in the shop
5. **Discount System**: Special events with reduced RACE cost
