# Deployment Checklist - Rat Racer

## Pre-Deployment Setup

### 1. Environment Variables Required

```bash
# MongoDB Atlas
MONGO_CONNECTION=mongodb+srv://...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...
BLOB_STORAGE_BASE_URI=https://[storage-id].public.blob.vercel-storage.com/rats/metadata/

# Smart Contracts (set after deployment)
NEXT_PUBLIC_RAT_NFT_ADDRESS=0x...
NEXT_PUBLIC_RACE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_RACE_TOKEN_ADDRESS=0x...

# Blockchain
RPC_ENDPOINT=https://mainnet.base.org
PRIVATE_KEY=0x...              # Deployer (needs ETH)
ORACLE_PRIVATE_KEY=0x...       # Backend oracle

# Optional
LOG_LEVEL=info
NODE_ENV=production
```

---

## Deployment Steps

### Phase 1: Smart Contracts

- [ ] **1.1** Fund deployer wallet with Base ETH
- [ ] **1.2** Deploy RatNFT contract
  ```bash
  cd contracts/rat
  npx hardhat ignition deploy ./ignition/modules/RatNFT.ts --network base
  ```
- [ ] **1.3** Save deployed address → `NEXT_PUBLIC_RAT_NFT_ADDRESS`
- [ ] **1.4** Deploy RaceManager + RaceToken contracts
  ```bash
  cd ../race
  npx hardhat ignition deploy ./ignition/modules/RaceContracts.ts --network base
  ```
- [ ] **1.5** Save addresses → `NEXT_PUBLIC_RACE_MANAGER_ADDRESS`, `NEXT_PUBLIC_RACE_TOKEN_ADDRESS`

### Phase 2: Vercel Blob Storage

- [ ] **2.1** Create Vercel Blob Storage (in Vercel dashboard)
- [ ] **2.2** Generate read/write token
- [ ] **2.3** Copy token → `BLOB_READ_WRITE_TOKEN`
- [ ] **2.4** Get storage URL → `BLOB_STORAGE_BASE_URI`
  - Format: `https://[storage-id].public.blob.vercel-storage.com/rats/metadata/`
- [ ] **2.5** Set baseURI on RatNFT contract
  ```bash
  cd contracts/rat
  npx hardhat run scripts/set-base-uri.ts --network base
  ```

### Phase 3: MongoDB Atlas

- [ ] **3.1** Create MongoDB Atlas cluster (free tier works)
- [ ] **3.2** Create database: `rat-racer`
- [ ] **3.3** Create collections: `rats`, `races`, `wallets`
- [ ] **3.4** Whitelist IP: `0.0.0.0/0` (for Vercel)
- [ ] **3.5** Copy connection string → `MONGO_CONNECTION`
- [ ] **3.6** Test connection locally

### Phase 4: Backend Deployment

- [ ] **4.1** Set all environment variables in Vercel
- [ ] **4.2** Deploy to Vercel
  ```bash
  vercel --prod
  ```
- [ ] **4.3** Verify deployment: `https://your-app.vercel.app`
- [ ] **4.4** Test health endpoint (if you create one)

### Phase 5: Oracle Setup

- [ ] **5.1** Create dedicated oracle wallet
- [ ] **5.2** Fund with small ETH amount (for finishRace gas)
- [ ] **5.3** Save private key → `ORACLE_PRIVATE_KEY`
- [ ] **5.4** Grant BACKEND_ROLE to oracle wallet
  ```bash
  cd contracts/race
  npx hardhat run scripts/grant-backend-role.ts --network base
  ```

### Phase 6: Webhook Configuration

#### Alchemy Webhook Setup
- [ ] **6.1** Go to Alchemy dashboard → Notify → Create Webhook
- [ ] **6.2** Select "Address Activity"
- [ ] **6.3** Add RatNFT address
- [ ] **6.4** Filter events: `RatMinted`
- [ ] **6.5** Webhook URL: `https://your-app.vercel.app/api/rat-mint`
- [ ] **6.6** Test webhook

- [ ] **6.7** Create webhook for RaceManager address
- [ ] **6.8** Filter events: `RaceStarted`, `RaceFinished`
- [ ] **6.9** Webhook URLs:
  - RaceStarted → `/api/race-started`
  - RaceFinished → `/api/race-finished`
- [ ] **6.10** Test webhooks

### Phase 7: Testing

- [ ] **7.1** Test mint flow
  ```bash
  cd contracts/rat
  npx hardhat run scripts/mint-test.ts --network base
  ```
- [ ] **7.2** Check Vercel logs for `/api/rat-mint` call
- [ ] **7.3** Verify metadata uploaded to Blob Storage
- [ ] **7.4** Verify rat stored in MongoDB
- [ ] **7.5** Check tokenURI returns correct URL

- [ ] **7.6** Test race creation
- [ ] **7.7** Test race entry (6 participants)
- [ ] **7.8** Test race start
- [ ] **7.9** Check `/api/race-started` logs
- [ ] **7.10** Verify simulation results in MongoDB
- [ ] **7.11** Wait 60s, verify `/api/race-finished` called
- [ ] **7.12** Check prize distribution on-chain
- [ ] **7.13** Verify rat stats updated in MongoDB

### Phase 8: Frontend Integration

- [ ] **8.1** Update contract addresses in frontend
- [ ] **8.2** Test wallet connection
- [ ] **8.3** Test mint UI
- [ ] **8.4** Test race browsing
- [ ] **8.5** Test race entry
- [ ] **8.6** Test race viewing
- [ ] **8.7** Test race results display
- [ ] **8.8** Test rat profile pages
- [ ] **8.9** Test leaderboards

---

## Post-Deployment

### Monitoring

- [ ] Set up log monitoring (Vercel dashboard)
- [ ] Set up error alerting
- [ ] Monitor MongoDB usage
- [ ] Monitor Blob Storage usage
- [ ] Track gas costs
- [ ] Monitor webhook reliability

### Documentation

- [ ] Update README with deployed addresses
- [ ] Create user guide
- [ ] Document known issues
- [ ] Create admin guide
- [ ] Document emergency procedures

### Security

- [ ] Rotate private keys if needed
- [ ] Review access controls
- [ ] Enable 2FA on all services
- [ ] Set up backup procedures
- [ ] Document recovery process

---

## Emergency Contacts

- **Deployer Wallet**: [Address]
- **Oracle Wallet**: [Address]
- **Contract Owner**: [Address]
- **Vercel Project**: [URL]
- **MongoDB Cluster**: [URL]
- **Alchemy Project**: [URL]

---

## Common Issues & Solutions

### "Metadata not found"
- Check BLOB_STORAGE_BASE_URI is set correctly
- Verify blob token has write permissions
- Check /api/rat-mint logs for upload errors

### "Race not starting"
- Verify all 6 participants entered
- Check RaceStarted event was emitted
- Verify webhook is configured
- Check /api/race-started logs

### "Race not settling"
- Check oracle wallet has ETH for gas
- Verify BACKEND_ROLE granted
- Check /api/race-started scheduled the call
- Check finishRace transaction on BaseScan

### "Stats not updating"
- Check /api/race-finished webhook fired
- Verify MongoDB connection
- Check MongoDB write permissions

---

## Rollback Procedure

### If deployment fails:

1. **Smart Contracts**: Cannot rollback, deploy new version if needed
2. **Backend**: Revert Vercel deployment
3. **MongoDB**: Restore from backup
4. **Blob Storage**: Metadata is immutable (safe)

---

## Performance Benchmarks

### Expected Metrics
- Mint transaction: ~0.01 ETH gas
- Race entry: ~0.005 ETH gas
- Race settlement: ~0.02 ETH gas
- Simulation time: <3 seconds
- Metadata upload: <1 second
- MongoDB query: <100ms

---

## Success Criteria

- [ ] Users can mint rats
- [ ] Metadata appears on OpenSea
- [ ] Users can create races
- [ ] Users can enter races
- [ ] Races start when full
- [ ] Race simulation runs
- [ ] Prizes distribute correctly
- [ ] Stats update in real-time
- [ ] All webhooks functioning
- [ ] No errors in logs

---

**Deployment Status**: Ready for production ✓

Last updated: [Date]
Deployed by: [Name]

