# Base Mainnet Deployment Summary

## Deployed Contracts

| Contract    | Address                                      | Verified                                                                                |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| RatNFT      | `0x456ff59525a02cc4917a93701E12F6D7da79552E` | ✅ [View](https://basescan.org/address/0x456ff59525a02cc4917a93701E12F6D7da79552E#code) |
| RaceToken   | `0x909cd2621513aD132ff33007EbaE88D727C5c0d4` | ✅ [View](https://basescan.org/address/0x909cd2621513aD132ff33007EbaE88D727C5c0d4#code) |
| RaceManager | `0xDA24fF53296c1E5E81fc86b9Fb7deb82e9701E65` | ✅ [View](https://basescan.org/address/0xDA24fF53296c1E5E81fc86b9Fb7deb82e9701E65#code) |

## Contract Updates (imageIndex flexibility)

✅ **Removed hardcoded `imageIndex <= 2` restriction** - contracts now support unlimited image variations via `uint8` (0-255)
✅ **All 21 tests passing** - comprehensive test coverage maintained
✅ **Minimal on-chain data** - only tokenId and imageIndex stored on-chain, all metadata in Blob Storage

## Key Features

- **Flexible Image System**: imageIndex accepts any uint8 value (0-255), allowing unlimited future expansion
- **Dynamic Metadata**: All rat stats/attributes generated off-chain and stored in Vercel Blob Storage
- **Admin Functions**: `ownerMint()` and `ownerEnterRace()` for testing with multiple wallets
- **Prize Distribution**: Automatic 50/30/20 split with 10% creator fee
- **Global Rat Locking**: Prevents rats from entering multiple races simultaneously

## Next Steps

1. Update `.env` with new contract addresses
2. Transfer RACE tokens to test wallets
3. Configure webhooks for contract events:
   - `RatMinted` → `/api/rat-mint`
   - `RaceStarted` → `/api/race-started`
   - `RaceFinished` → `/api/race-finished`
4. Update frontend to use new contract addresses

## Test Wallets

- Wallet 1: `0x584cb34c3d52bf59219e4e836feaf63d4f90c830`
- Wallet 2: `0xa41f6558A517e6aC35DeA5A453273Aa4F31CDAcD`

RaceToken deployed with 10,000 tokens minted to deployer (Wallet 1).
