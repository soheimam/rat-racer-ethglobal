# Final Contract Deployment - Base Mainnet

## Contract Addresses

### RaceToken (ERC20)

- **Address**: `0xb5D7712b80cf17ADFFbd3338d31f3A2C2a1f2Bb0`
- **Verified**: ✅ [View on Basescan](https://basescan.org/address/0xb5D7712b80cf17ADFFbd3338d31f3A2C2a1f2Bb0#code)
- **Features**:
  - 10,000 RACE tokens minted to deployer
  - Anyone can mint tokens (for testing)
  - ERC20 standard compliant

### RatNFT (ERC721)

- **Address**: `0xE572c5216d748a744e9F4288058D9b6144812684`
- **Verified**: ✅ [View on Basescan](https://basescan.org/address/0xE572c5216d748a744e9F4288058D9b6144812684#code)
- **Features**:
  - Charges **100 RACE tokens** per mint (dynamic, changeable by owner)
  - Transfers RACE tokens from user to contract on mint
  - Metadata stored in Vercel Blob Storage
  - Owner functions:
    - `setMintPrice(uint256)` - Change mint price
    - `withdrawRaceTokens(address, uint256)` - Withdraw collected fees
    - `ownerMint(address, uint8)` - Free mint for testing
  - Public functions:
    - `getMintPrice()` - Returns current mint price
    - `mint(address, uint8)` - Mint a rat (charges RACE tokens)

### RaceManager

- **Address**: `0xd48fA1fddccD9c8Ba8f083CB0C752c109b15612b`
- **Verified**: ✅ [View on Basescan](https://basescan.org/address/0xd48fA1fddccD9c8Ba8f083CB0C752c109b15612b#code)
- **Features**:
  - Race creation and management
  - Entry fee system (ERC20 tokens)
  - 6 racers max per race
  - Prize pool distribution
  - Owner functions for testing

## Environment Variables

Update your `.env.local` with:

```env
NEXT_PUBLIC_RACE_TOKEN_ADDRESS=0xb5D7712b80cf17ADFFbd3338d31f3A2C2a1f2Bb0
NEXT_PUBLIC_RAT_NFT_ADDRESS=0xE572c5216d748a744e9F4288058D9b6144812684
NEXT_PUBLIC_RACE_MANAGER_ADDRESS=0xd48fA1fddccD9c8Ba8f083CB0C752c109b15612b
```

## Testing Steps

1. **Get RACE tokens**:

   ```javascript
   // Call mint on RaceToken contract
   await raceToken.mint(yourAddress, parseUnits("1000", 18));
   ```

2. **Mint a Rat**:

   - User must have 100+ RACE tokens
   - User approves RatNFT contract to spend 100 RACE
   - User calls `mint(address, imageIndex)` on RatNFT
   - 100 RACE transferred to contract, NFT minted

3. **Change Mint Price** (owner only):

   ```javascript
   await ratNFT.setMintPrice(parseUnits("150", 18)); // Change to 150 RACE
   ```

4. **Withdraw Fees** (owner only):
   ```javascript
   await ratNFT.withdrawRaceTokens(yourAddress, amount);
   ```

## Deployment Details

- **Network**: Base Mainnet (Chain ID: 8453)
- **Deployment Date**: $(date)
- **Deployer**: Your wallet address
- **Initial Mint Price**: 100 RACE tokens (100 \* 10^18 wei)

## Key Features

✅ **Dynamic Pricing**: Mint price stored on-chain, changeable by owner  
✅ **Frontend Integration**: Frontend reads price dynamically from contract  
✅ **Token Payment**: Automatic RACE token transfer during minting  
✅ **Fee Collection**: Owner can withdraw collected RACE tokens  
✅ **Verified Contracts**: All contracts verified on Basescan  
✅ **Testing Functions**: Owner functions for minting rats and entering races without fees
