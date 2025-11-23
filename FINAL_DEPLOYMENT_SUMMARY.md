# 🎉 Final Deployment Summary

## ✅ All Contracts Deployed Successfully!

### 📋 Contract Addresses (Base Mainnet)

```bash
# Copy these to your .env file:
NEXT_PUBLIC_RACE_TOKEN_ADDRESS="0xea4eaca6e4197ecd092ba77b5da768f19287e06f"
NEXT_PUBLIC_RAT_NFT_ADDRESS="0x38f66760ada4c01bc5a4a7370882f0aee7090674"
NEXT_PUBLIC_RACE_MANAGER_ADDRESS="0x58d4a6d4420488bb098b066edbf50ff9445ef0f7"
```

---

## 🐀 RatNFT - Minting Configuration

**Address:** `0x38f66760ada4c01bc5a4a7370882f0aee7090674`

All 3 rats require **1000 RACE tokens** to mint:

| Rat   | Name     | Color | Price     |
| ----- | -------- | ----- | --------- |
| **0** | GHOST    | White | 1000 RACE |
| **1** | MUDSLIDE | Brown | 1000 RACE |
| **2** | NEON     | Pink  | 1000 RACE |

### Minting Flow:

1. User approves RACE token spending on RatNFT contract
2. User calls `mint(address, imageIndex)`
3. Contract automatically deducts 1000 RACE
4. Webhook generates metadata and uploads to Vercel Blob

---

## 🏁 RaceManager - Token Configuration

**Address:** `0x58d4a6d4420488bb098b066edbf50ff9445ef0f7`

Approved tokens for race entry fees:

| Token     | Address                                      | Decimals |
| --------- | -------------------------------------------- | -------- |
| **RACE**  | `0xea4eaca6e4197ecd092ba77b5da768f19287e06f` | 18       |
| **USDC**  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6        |
| **MCADE** | `0xc48823ec67720a04a9dfd8c7d109b2c3d6622094` | 18       |

### Race Creation:

Users can create races with any of the approved tokens and set their own entry fees.

---

## 🎫 RaceToken (No Changes)

**Address:** `0xea4eaca6e4197ecd092ba77b5da768f19287e06f`

- **Status:** ✅ Already deployed on Uniswap
- **Supply:** 1 billion RACE tokens
- **Treasury:** All tokens held by `0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830`

---

## 📝 What Changed

### 🆕 New Features:

1. **Rat Minting Payment System**

   - Each rat variant can be configured with its own ERC20 token & price
   - Rats 0, 1, 2 configured for 1000 RACE each
   - Owner can add more rats with different pricing (e.g., premium rats for 5000 RACE, budget rats for 100 USDC)

2. **Multi-Token Race Support**
   - Races can use RACE, USDC, or MCADE for entry fees
   - Race creators choose which token and entry fee amount
   - Admin can add/remove approved tokens anytime

### 🔄 Redeployed:

- ✅ **RatNFT** - New version with payment functionality
- ✅ **RaceManager** - Points to new RatNFT, has all 3 tokens approved

### ✓ Not Redeployed:

- ✅ **RaceToken** - Still on Uniswap, unchanged

---

## 🛠️ Frontend Updates Needed

Update your `.env.local` or `.env`:

```bash
NEXT_PUBLIC_RACE_TOKEN_ADDRESS="0xea4eaca6e4197ecd092ba77b5da768f19287e06f"
NEXT_PUBLIC_RAT_NFT_ADDRESS="0x38f66760ada4c01bc5a4a7370882f0aee7090674"
NEXT_PUBLIC_RACE_MANAGER_ADDRESS="0x58d4a6d4420488bb098b066edbf50ff9445ef0f7"
```

### Shop Page:

The shop page will automatically:

- Read rat configuration (token + price) from contract
- Display RACE balance when connected
- Handle approvals and minting with RACE token

### Testing Checklist:

- [ ] Connect wallet on shop page
- [ ] See RACE balance displayed
- [ ] See "1000 RACE" price for all 3 rats
- [ ] Approve RACE spending
- [ ] Mint a rat (1000 RACE deducted)
- [ ] Verify rat appears in wallet
- [ ] Verify metadata generated correctly

---

## 🔗 Contract Links

### BaseScan:

- [RaceToken](https://basescan.org/address/0xea4eaca6e4197ecd092ba77b5da768f19287e06f)
- [RatNFT](https://basescan.org/address/0x38f66760ada4c01bc5a4a7370882f0aee7090674)
- [RaceManager](https://basescan.org/address/0x58d4a6d4420488bb098b066edbf50ff9445ef0f7)

### Uniswap:

- [RACE/ETH Pool](https://app.uniswap.org/) (search for `0xea4eaca6e4197ecd092ba77b5da768f19287e06f`)

---

## 🎮 System Architecture

```
User Flow - Minting:
1. User visits /shop
2. Selects rat (0, 1, or 2)
3. Sees price: 1000 RACE
4. Approves RACE token
5. Clicks "Mint Rat"
6. Contract deducts 1000 RACE
7. Webhook generates metadata
8. User receives NFT

User Flow - Racing:
1. User visits /races
2. Creates race or enters existing
3. Can use RACE, USDC, or MCADE for entry
4. Race fills up (6 racers)
5. Race starts automatically
6. Results determined
7. Prizes distributed (creator gets 10%, top 3 split 90%)
```

---

## 🚀 Ready to Go!

All contracts are deployed, configured, and ready for use. The shop page just needs the updated env vars to display RACE balance and allow minting!
