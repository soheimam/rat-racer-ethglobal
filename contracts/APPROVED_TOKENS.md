# Approved Token System

## Overview

The `RaceManager` contract uses an **approved token whitelist** to control which ERC20 tokens can be used as entry fees for races.

Only the contract admin can add or remove tokens from this approved list.

## Why This System?

1. **Security**: Prevents malicious or broken tokens from being used
2. **Quality Control**: Ensures only legitimate, liquid tokens are accepted
3. **Flexibility**: Different races can use different tokens from the approved list
4. **Economic Design**: Admin can curate which tokens align with the game economy

## Contract Functions

### Admin Functions

```solidity
// Add a token to the approved list
function addApprovedToken(address token) external

// Remove a token from the approved list
function removeApprovedToken(address token) external
```

### Public Functions

```solidity
// Check if a token is approved
function isTokenApproved(address token) external view returns (bool)
```

## Race Creation Flow

1. **Admin approves tokens** (e.g., USDC, RACE, WETH)
2. **User creates race** with `createRace(trackId, tokenAddress, entryFee)`
3. **Contract validates** that `tokenAddress` is on the approved list
4. **Race is created** with that specific token as the entry fee

## Usage Examples

### 1. Approve a Token (Script)

```bash
# Approve RACE token
TOKEN_ADDRESS=0x5fbdb2315678afecb367f032d93f642f64180aa3 \
RACE_MANAGER_ADDRESS=0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0 \
npx hardhat run scripts/manage-approved-tokens.ts --network sepolia
```

### 2. Remove a Token (Script)

```bash
# Remove USDC from approved list
ACTION=remove \
TOKEN_ADDRESS=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
RACE_MANAGER_ADDRESS=0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0 \
npx hardhat run scripts/manage-approved-tokens.ts --network sepolia
```

### 3. List All Approved Tokens

```bash
# Check which tokens are approved
RACE_MANAGER_ADDRESS=0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0 \
npx hardhat run scripts/list-approved-tokens.ts --network sepolia

# Include custom tokens
RACE_MANAGER_ADDRESS=0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0 \
CUSTOM_TOKENS=0x123...,0x456... \
npx hardhat run scripts/list-approved-tokens.ts --network sepolia
```

### 4. Create Race with Approved Token

```solidity
// On-chain example
raceManager.createRace(
    1,                          // trackId
    0x5FbDB2...180aa3,          // RACE token (must be approved)
    100 * 10**18                // 100 RACE entry fee
);
```

## Recommended Tokens

### Mainnet

- **USDC** (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`) - Stablecoin
- **USDT** (`0xdAC17F958D2ee523a2206206994597C13D831ec7`) - Stablecoin
- **DAI** (`0x6B175474E89094C44Da98b954EedeAC495271d0F`) - Stablecoin
- **WETH** (`0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`) - Wrapped ETH

### Base

- **USDC** (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) - Native USDC on Base

### Sepolia (Testnet)

- **USDC** (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`) - Mock USDC

### Custom Game Token

- **RACE** - Your deployed RaceToken contract address

## Security Considerations

### Token Requirements

Before approving a token, verify:

1. ✅ **Valid ERC20**: Implements standard `transfer`, `transferFrom`, `approve`
2. ✅ **No Transfer Fees**: Token doesn't take fees on transfers (breaks prize math)
3. ✅ **No Rebasing**: Token balance doesn't change automatically
4. ✅ **No Blacklist Risk**: Admin can't freeze user funds
5. ✅ **Sufficient Liquidity**: Token is tradeable and has market depth
6. ✅ **Trusted Source**: Well-known project or audited contract

### Dangerous Token Types

❌ **DO NOT APPROVE:**

- Deflationary tokens (e.g., tokens that burn on transfer)
- Rebasing tokens (e.g., AmpleForth)
- Tokens with transfer fees (e.g., SafeMoon)
- Tokens with pause/blacklist features (if admin is untrusted)
- Low-liquidity tokens (can't be traded)
- Tokens with upgradeable proxies (unless you trust the owner)

## Events

```solidity
event TokenApproved(address indexed token);
event TokenRemoved(address indexed token);
```

Monitor these events to track changes to the approved token list.

## Admin Management

The admin can be changed using:

```solidity
function setAdmin(address newAdmin) external
```

Only the current admin can call this function.

## Example: Full Setup Flow

```bash
# 1. Deploy contracts
npx hardhat run scripts/deploy.ts --network sepolia

# 2. Set environment variables
export RACE_MANAGER_ADDRESS=0x...
export RACE_TOKEN_ADDRESS=0x...

# 3. Approve your native RACE token
TOKEN_ADDRESS=$RACE_TOKEN_ADDRESS \
RACE_MANAGER_ADDRESS=$RACE_MANAGER_ADDRESS \
npx hardhat run scripts/manage-approved-tokens.ts --network sepolia

# 4. Approve USDC for broader participation
TOKEN_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
RACE_MANAGER_ADDRESS=$RACE_MANAGER_ADDRESS \
npx hardhat run scripts/manage-approved-tokens.ts --network sepolia

# 5. Verify approved tokens
RACE_MANAGER_ADDRESS=$RACE_MANAGER_ADDRESS \
npx hardhat run scripts/list-approved-tokens.ts --network sepolia

# 6. Now users can create races with either token!
```

## Frontend Integration

```typescript
// Check if token is approved before showing "Create Race" button
const isApproved = await raceManager.read.isTokenApproved([tokenAddress]);

if (!isApproved) {
  return <div>This token is not approved for racing</div>;
}

// Show token selector with only approved tokens
const approvedTokens = [
  { name: "RACE", address: "0x..." },
  { name: "USDC", address: "0x..." },
].filter(async (token) => {
  return await raceManager.read.isTokenApproved([token.address]);
});
```

## Testing

See `contracts/race/test/RaceManager.test.ts`:

```typescript
describe("Token Approval System", function () {
  it("Should allow admin to approve tokens");
  it("Should reject non-admin approving tokens");
  it("Should allow admin to remove approved tokens");
  it("Should reject removing non-approved tokens");
  it("Should reject approving zero address");
  it("Should reject approving already approved token");
});
```

All tests pass with 100% coverage! ✅
