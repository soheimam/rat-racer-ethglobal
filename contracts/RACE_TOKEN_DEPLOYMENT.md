# RACE Token Deployment Guide

## Token Details

- **Name**: Race Token
- **Symbol**: RACE
- **Decimals**: 18
- **Total Supply**: 1,000,000,000 RACE (1 billion)
- **Treasury**: `0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830`

## Deployment

```bash
cd contracts/race

# Deploy to Base mainnet
npx hardhat run scripts/deploy-race-token.ts --network base
```

## Post-Deployment Steps

### 1. Create Uniswap Liquidity Pool

#### Option A: Uniswap V2 (Simpler)

1. Go to https://app.uniswap.org/pools
2. Connect wallet with treasury address
3. Click "New Position" → "V2"
4. Select RACE token (paste contract address)
5. Select ETH
6. Enter amounts (e.g., 500M RACE + 1 ETH for initial price)
7. Approve and Add Liquidity

**Initial Price Calculation:**

- If you add 500M RACE + 1 ETH:
- Initial price = 1 ETH / 500M RACE = 0.000000002 ETH per RACE
- Or: 1 RACE = $0.000005 (if ETH = $2,500)

#### Option B: Uniswap V3 (More Efficient)

1. Go to https://app.uniswap.org/pools
2. Connect wallet with treasury address
3. Click "New Position" → "V3"
4. Select RACE/WETH pair
5. Choose fee tier (0.3% recommended for new tokens)
6. Set price range (e.g., Min: $0.000001, Max: $0.00001)
7. Enter amounts
8. Approve and Add Liquidity

### 2. Approve RACE Token in RaceManager

```bash
# Set environment variables
export RACE_TOKEN_ADDRESS="0x..."  # From deployment
export RACE_MANAGER_ADDRESS="0x..." # Your deployed RaceManager

# Approve token
TOKEN_ADDRESS=$RACE_TOKEN_ADDRESS \
RACE_MANAGER_ADDRESS=$RACE_MANAGER_ADDRESS \
npx hardhat run scripts/manage-approved-tokens.ts --network base
```

### 3. Verify Contract on BaseScan

```bash
npx hardhat verify --network base <RACE_TOKEN_ADDRESS>
```

## Token Distribution Strategy

### Initial Allocation (1B RACE)

**Option 1: Conservative Launch**

- 50M (5%) → Uniswap Liquidity Pool (with 1-2 ETH)
- 200M (20%) → Race Rewards Pool (for winners)
- 250M (25%) → Marketing/Airdrops (attract users)
- 500M (50%) → Treasury Reserve (future development)

**Option 2: High Liquidity Launch**

- 200M (20%) → Uniswap Liquidity Pool (with 5-10 ETH)
- 300M (30%) → Race Rewards Pool
- 200M (20%) → Marketing/Airdrops
- 300M (30%) → Treasury Reserve

**Option 3: Minimal LP, Max Rewards**

- 20M (2%) → Uniswap Liquidity Pool (with 0.5 ETH)
- 500M (50%) → Race Rewards Pool (huge prizes!)
- 300M (30%) → Marketing/Airdrops
- 180M (18%) → Treasury Reserve

### Recommended: Start with Option 1

This provides:

- Decent initial liquidity
- Large reward pool to attract racers
- Flexibility for marketing
- Strong treasury for longevity

## Managing Liquidity

### Adding More Liquidity Later

If RACE price increases and you want to add more:

```bash
# 1. Go to Uniswap
# 2. Find your existing pool position
# 3. Click "Add Liquidity"
# 4. Add proportional amounts to maintain price
```

### Monitoring Pool Health

Check these metrics regularly:

- **Total Value Locked (TVL)**: Target $10k+ for decent trading
- **Volume/TVL Ratio**: Healthy = 50-100% daily
- **Price Impact**: <5% for $100 trades is good
- **Liquidity Depth**: How much you can buy/sell before 1% slippage

## Setting Entry Fees

Once RACE is deployed and liquid:

### Example Race Entry Fees

**Low Stakes Races:**

- Entry: 1,000 RACE (~$5 at $0.000005/RACE)
- Prize Pool: 6,000 RACE (6 racers × 1,000)
- 1st Place: 2,700 RACE (50%)
- 2nd Place: 1,620 RACE (30%)
- 3rd Place: 1,080 RACE (20%)
- Creator: 600 RACE (10%)

**Medium Stakes Races:**

- Entry: 10,000 RACE (~$50)
- Prize Pool: 60,000 RACE
- 1st: 27,000 RACE
- 2nd: 16,200 RACE
- 3rd: 10,800 RACE
- Creator: 6,000 RACE

**High Stakes Races:**

- Entry: 100,000 RACE (~$500)
- Prize Pool: 600,000 RACE
- 1st: 270,000 RACE (~$1,350)
- 2nd: 162,000 RACE (~$810)
- 3rd: 108,000 RACE (~$540)
- Creator: 60,000 RACE

## Security Checklist

Before deploying to mainnet:

- [ ] Deployer has enough ETH for gas (~0.005 ETH)
- [ ] Treasury address is correct (`0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830`)
- [ ] Contract compiled successfully
- [ ] Tests pass (run `npx hardhat test`)
- [ ] Hardhat network is set to `base` in command
- [ ] PRIVATE_KEY in .env is correct
- [ ] You have access to treasury wallet for LP creation

## Post-Launch Monitoring

### Day 1

- [ ] Verify contract on BaseScan
- [ ] Create Uniswap LP
- [ ] Add RACE to RaceManager approved tokens
- [ ] Create first test race with RACE entry fee
- [ ] Monitor first few races

### Week 1

- [ ] Track LP health and volume
- [ ] Monitor race participation
- [ ] Adjust entry fees based on token price
- [ ] Consider small airdrop campaign

### Month 1

- [ ] Review tokenomics effectiveness
- [ ] Analyze race data and player behavior
- [ ] Plan marketing initiatives
- [ ] Consider adding more liquidity if needed

## Troubleshooting

### "Insufficient Liquidity" Errors

**Problem**: Users can't buy RACE for race entry

**Solution**:

1. Add more ETH to LP (increases depth)
2. Or: Lower race entry fees
3. Or: Accept alternative tokens (USDC, ETH)

### Token Price Crashes

**Problem**: RACE dumps 50%+ after launch

**Causes**:

- Not enough initial liquidity
- No buying pressure (races not attractive)
- Bots/snipers dumping

**Prevention**:

- Start with conservative LP (Option 1 above)
- Make prizes attractive (high ROI for winners)
- Don't announce token contract until LP is ready
- Consider anti-sniper measures (require rat NFT ownership)

### Can't Add RACE to RaceManager

**Problem**: `addApprovedToken` fails

**Solution**:

- Ensure you're admin of RaceManager
- Check RACE token address is correct
- Verify transaction has enough gas

## Example Commands

```bash
# Full deployment flow
cd contracts/race

# 1. Deploy RACE token
npx hardhat run scripts/deploy-race-token.ts --network base

# 2. Copy address from output
export RACE_TOKEN_ADDRESS="0x..."

# 3. Verify on BaseScan
npx hardhat verify --network base $RACE_TOKEN_ADDRESS

# 4. Create Uniswap LP (do this manually on Uniswap UI)

# 5. Approve in RaceManager
export RACE_MANAGER_ADDRESS="0x..."
TOKEN_ADDRESS=$RACE_TOKEN_ADDRESS \
RACE_MANAGER_ADDRESS=$RACE_MANAGER_ADDRESS \
npx hardhat run scripts/manage-approved-tokens.ts --network base

# 6. Verify it's approved
RACE_MANAGER_ADDRESS=$RACE_MANAGER_ADDRESS \
npx hardhat run scripts/list-approved-tokens.ts --network base
```

## Support

If deployment fails:

1. Check gas price isn't too high
2. Verify PRIVATE_KEY in .env
3. Ensure deployer has ETH balance
4. Check Base RPC is responding
5. Try again with higher gas limit

Good luck! 🎮🐀💨
