# Token Addresses - Base Mainnet

## Approved Tokens for Racing

### RACE Token (Native Game Token)

```
Address: 0xea4eaca6e4197ecd092ba77b5da768f19287e06f
Name: Race Token
Symbol: RACE
Decimals: 18
Image: /images/race-token.png
```

### USDC (Native USDC on Base)

```
Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Name: USD Coin
Symbol: USDC
Decimals: 6
Image: /public/usdc.jpg
```

## Usage

### Frontend Token Selector

```typescript
export const APPROVED_TOKENS = [
  {
    address: "0xea4eaca6e4197ecd092ba77b5da768f19287e06f",
    name: "Race Token",
    symbol: "RACE",
    decimals: 18,
    image: "/images/race-token.png",
  },
  {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    image: "/usdc.jpg",
  },
] as const;
```

### Example: Create Race with USDC

```typescript
import { parseUnits } from "viem";

// User selects USDC and enters $10 entry fee
const entryFee = parseUnits("10", 6); // 6 decimals for USDC

// Create race
await raceManager.write.createRace([
  1, // trackId
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  entryFee,
]);
```

### Example: Create Race with RACE

```typescript
import { parseUnits } from "viem";

// User selects RACE and enters 1000 RACE entry fee
const entryFee = parseUnits("1000", 18); // 18 decimals for RACE

// Create race
await raceManager.write.createRace([
  1, // trackId
  "0xea4eaca6e4197ecd092ba77b5da768f19287e06f", // RACE
  entryFee,
]);
```

## Important Notes

- **USDC address ending in ...13** is the native USDC on Base (correct ✅)
- **USDC address ending in ...94** is NOT native USDC (wrong ❌)
- Always use `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` for USDC on Base
- RACE token has 18 decimals (like ETH)
- USDC has 6 decimals (standard for USD stablecoins)

## Verifying Token Approval

```bash
# Check if a token is approved
cast call 0x847af80afceda2ecfd95dd72c3f76d200fca433d \
  "isTokenApproved(address)(bool)" \
  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --rpc-url https://mainnet.base.org
```

Should return: `true`
