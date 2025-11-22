# 🚀 Production Deployment Guide - Base Mainnet

Complete guide for deploying Rat Racer contracts to Base mainnet with backend oracle integration.

## Prerequisites

✅ Base mainnet wallet with ETH for gas (0.01+ ETH)  
✅ Separate wallet for oracle/backend (Vercel function)  
✅ Private keys for both wallets  
✅ Base RPC endpoint  
✅ (Optional) BaseScan API key for verification  

---

## Step 1: Environment Setup

### 1.1 Create `.env` file in `/contracts` directory

```bash
cd contracts
cp .env.example .env
```

### 1.2 Fill in your values

```bash
# Deployer wallet (will own contracts)
PRIVATE_KEY=0x1234... # Your deployer private key

# Base Mainnet RPC
RPC_ENDPOINT=https://mainnet.base.org

# Oracle wallet (backend Vercel function)
ORACLE_ADDRESS=0xABC... # Backend wallet address (NOT private key)

# Optional: for contract verification
BASESCAN_API_KEY=your_api_key
```

⚠️ **SECURITY**: Never commit `.env` to git!

---

## Step 2: Install Dependencies

```bash
# Install race contract dependencies
cd contracts/race
npm install

# Install API dependencies
cd ../../api
npm install
```

---

## Step 3: Test Locally First

### 3.1 Run all tests

```bash
cd contracts
./run-all-tests.sh
```

Expected output: **80+ tests passing**

### 3.2 Test on local network

```bash
# Terminal 1: Start local node
cd contracts/race
npx hardhat node

# Terminal 2: Deploy locally
npx hardhat run scripts/deploy-production.ts --network localhost
```

---

## Step 4: Deploy to Base Mainnet

### 4.1 Deploy contracts

```bash
cd contracts/race
npx hardhat run scripts/deploy-production.ts --network base
```

This will deploy:
1. ✅ RatNFTV2 (with stats & history tracking)
2. ✅ RaceToken (ERC20 for entry fees)
3. ✅ RaceManagerV2 (with oracle access control)

### 4.2 Save contract addresses

The script will output:
```
RAT_NFT_ADDRESS="0x..."
RACE_TOKEN_ADDRESS="0x..."
RACE_MANAGER_ADDRESS="0x..."
ORACLE_ADDRESS="0x..."
```

**IMPORTANT**: Save these addresses!

### 4.3 Update `.env` with deployed addresses

Add to your `.env`:
```bash
RAT_NFT_ADDRESS=0x...
RACE_TOKEN_ADDRESS=0x...
RACE_MANAGER_ADDRESS=0x...
```

---

## Step 5: Verify Contracts on BaseScan

### 5.1 Verify RatNFT

```bash
npx hardhat verify --network base <RAT_NFT_ADDRESS> \
  "Rat Racer" \
  "RAT" \
  "https://api.ratracer.xyz/rats/"
```

### 5.2 Verify RaceToken

```bash
npx hardhat verify --network base <RACE_TOKEN_ADDRESS>
```

### 5.3 Verify RaceManager

```bash
npx hardhat verify --network base <RACE_MANAGER_ADDRESS> \
  <RAT_NFT_ADDRESS> \
  <ORACLE_ADDRESS>
```

---

## Step 6: Setup Vercel Oracle Backend

### 6.1 Create Vercel environment variables

In your Vercel project settings, add:

```
ORACLE_PRIVATE_KEY=0x... # Backend wallet PRIVATE KEY
RACE_MANAGER_ADDRESS=0x... # From deployment
RAT_NFT_ADDRESS=0x... # From deployment
RPC_ENDPOINT=https://mainnet.base.org
```

### 6.2 Deploy API to Vercel

```bash
cd /path/to/rat-racer-ethglobal
vercel --prod
```

### 6.3 Test oracle endpoint

```bash
curl -X POST https://your-app.vercel.app/api/finish-race \
  -H "Content-Type: application/json" \
  -d '{"raceId": 0}'
```

---

## Step 7: Frontend Integration

### 7.1 Update frontend with contract addresses

Create `/lib/contracts.ts`:

```typescript
import { parseAbi } from 'viem';

export const CONTRACTS = {
  RAT_NFT: '0x...' as `0x${string}`,
  RACE_TOKEN: '0x...' as `0x${string}`,
  RACE_MANAGER: '0x...' as `0x${string}`,
};

export const RAT_NFT_ABI = parseAbi([
  'function mint(address to, string name, uint8 color, uint8 stamina, uint8 agility, uint8 speed, string bloodline, string gender) external returns (uint256)',
  'function mintSimple(address to, string name, uint8 color) external returns (uint256)',
  'function getRatMetadata(uint256 tokenId) external view returns (tuple(string name, uint8 color, uint256 mintedAt, uint8 stamina, uint8 agility, uint8 speed, string bloodline, string gender))',
  'function getRatStats(uint256 tokenId) external view returns (tuple(uint16 wins, uint16 placed, uint16 losses, uint16 totalRaces))',
  'function getRatsOfOwner(address owner) external view returns (uint256[])',
]);

export const RACE_MANAGER_ABI = parseAbi([
  'function createRace(uint8 trackId, address entryToken, uint256 entryFee, string title, string description) external returns (uint256)',
  'function enterRace(uint256 raceId, uint256 ratTokenId) external',
  'function exitRace(uint256 raceId) external',
  'function startRace(uint256 raceId) external',
  'function getRace(uint256 raceId) external view returns (tuple(uint256 raceId, address creator, uint8 trackId, address entryToken, uint256 entryFee, uint8 status, uint256 prizePool, uint256 createdAt, uint256 startedAt, uint256 finishedAt, string title, string description))',
  'function getRaceEntries(uint256 raceId) external view returns (tuple(address racer, uint256 ratTokenId, uint256 enteredAt, uint8 position)[])',
]);

export const RACE_TOKEN_ABI = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function faucet() external', // Remove in production
]);
```

### 7.2 Example: Mint a rat

```typescript
import { useWriteContract } from 'wagmi';
import { CONTRACTS, RAT_NFT_ABI } from '@/lib/contracts';

const { writeContract } = useWriteContract();

await writeContract({
  address: CONTRACTS.RAT_NFT,
  abi: RAT_NFT_ABI,
  functionName: 'mintSimple',
  args: [userAddress, "Lightning", 0],
});
```

### 7.3 Example: Create and enter race

```typescript
// 1. Create race
await writeContract({
  address: CONTRACTS.RACE_MANAGER,
  abi: RACE_MANAGER_ABI,
  functionName: 'createRace',
  args: [
    1, // trackId
    CONTRACTS.RACE_TOKEN,
    parseEther("100"), // entry fee
    "Street Championship",
    "The ultimate showdown"
  ],
});

// 2. Approve tokens
await writeContract({
  address: CONTRACTS.RACE_TOKEN,
  abi: RACE_TOKEN_ABI,
  functionName: 'approve',
  args: [CONTRACTS.RACE_MANAGER, parseEther("100")],
});

// 3. Enter race
await writeContract({
  address: CONTRACTS.RACE_MANAGER,
  abi: RACE_MANAGER_ABI,
  functionName: 'enterRace',
  args: [raceId, ratTokenId],
});

// 4. Start race (when full)
await writeContract({
  address: CONTRACTS.RACE_MANAGER,
  abi: RACE_MANAGER_ABI,
  functionName: 'startRace',
  args: [raceId],
});

// 5. Call backend to finish race
await fetch('/api/finish-race', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ raceId }),
});
```

---

## Step 8: Post-Deployment Checklist

### Security
- [ ] Oracle wallet has ETH for gas
- [ ] Oracle private key stored in Vercel secrets (not .env file)
- [ ] Deployer wallet still has ownership of contracts
- [ ] Contract addresses saved in multiple places
- [ ] BaseScan verification complete

### Functionality
- [ ] Can mint rats with stats
- [ ] Can create races with title/description
- [ ] Can enter races with token approval
- [ ] Can start full races
- [ ] Backend can finish races (test with one race)
- [ ] Prizes distributed correctly
- [ ] Rats can race again after completion

### Frontend
- [ ] Contract addresses updated
- [ ] ABIs updated
- [ ] Can connect wallet
- [ ] Can mint rats
- [ ] Can view owned rats with stats
- [ ] Can create/enter/start races
- [ ] Race results displayed correctly

---

## Troubleshooting

### "Only oracle can call"
**Problem**: Trying to call `finishRace()` from non-oracle address.  
**Solution**: Ensure Vercel function uses `ORACLE_PRIVATE_KEY` wallet.

### "Race not ready to start"
**Problem**: Race not full (< 6 racers).  
**Solution**: Wait for 6/6 racers or test with 6 accounts.

### "Rat already in this race"
**Problem**: Same rat can't enter same race twice.  
**Solution**: Use different rat or wait for race to finish.

### "Insufficient approval"
**Problem**: User didn't approve entry fee tokens.  
**Solution**: Call `raceToken.approve()` before `enterRace()`.

### "Transaction reverted"
**Problem**: Various reasons - check revert message.  
**Solution**: Read error message, check contract state, verify parameters.

---

## Gas Costs (Base Mainnet Estimates)

| Operation | Gas Estimate | Cost @ 0.1 gwei |
|-----------|--------------|-----------------|
| Deploy RatNFT | ~2,500,000 | ~$0.05 |
| Deploy RaceToken | ~1,500,000 | ~$0.03 |
| Deploy RaceManager | ~3,000,000 | ~$0.06 |
| Mint Rat (simple) | ~150,000 | ~$0.003 |
| Create Race | ~200,000 | ~$0.004 |
| Enter Race | ~120,000 | ~$0.0024 |
| Start Race | ~50,000 | ~$0.001 |
| Finish Race | ~250,000 | ~$0.005 |

**Total deployment**: ~$0.15  
**Per race lifecycle**: ~$0.02  

Base is CHEAP! 🎉

---

## Monitoring & Maintenance

### Watch for events

```typescript
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(),
});

// Watch for races starting
client.watchContractEvent({
  address: CONTRACTS.RACE_MANAGER,
  abi: RACE_MANAGER_ABI,
  eventName: 'RaceStarted',
  onLogs: (logs) => {
    logs.forEach(log => {
      const { raceId } = log.args;
      // Trigger backend to finish race
      fetch('/api/finish-race', {
        method: 'POST',
        body: JSON.stringify({ raceId: raceId.toString() }),
      });
    });
  },
});
```

### Dashboard recommendations

Monitor:
- Total rats minted
- Total races created
- Total prizes distributed
- Active races count
- Oracle wallet balance (for gas)

---

## Emergency Procedures

### Update Oracle Address

```typescript
// Only contract owner can do this
await writeContract({
  address: CONTRACTS.RACE_MANAGER,
  abi: RACE_MANAGER_ABI,
  functionName: 'setOracle',
  args: [newOracleAddress],
});
```

### Cancel Expired Races

```typescript
// Anyone can call this after 7 days
await writeContract({
  address: CONTRACTS.RACE_MANAGER,
  abi: RACE_MANAGER_ABI,
  functionName: 'cancelExpiredRace',
  args: [raceId],
});
```

---

## Success! 🎉

Your contracts are now live on Base mainnet!

**Next steps**:
1. Test with small amounts first
2. Announce to community
3. Monitor for issues
4. Iterate and improve

---

**Questions?** Check `/contracts/CRITICAL_ANALYSIS.md` for details on all fixes and security measures.

