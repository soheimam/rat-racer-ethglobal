# Rat Racer - Complete System Architecture

## System Overview

Rat Racer is a fully on-chain NFT racing game with off-chain metadata generation and advanced game mechanics. The system uses MongoDB Atlas for data persistence, Vercel Blob Storage for NFT metadata, and sophisticated algorithms for race simulation.

---

## Tech Stack

### Smart Contracts (Solidity)
- **RatNFT.sol**: ERC721 NFT contract (minimal on-chain storage)
- **RaceManager.sol**: Race creation, entry, settlement
- **RaceToken.sol**: Mock ERC20 for entry fees
- **Network**: Base (ChainID 8453)

### Backend (TypeScript/Next.js)
- **Framework**: Next.js 14 (App Router)
- **Runtime**: Node.js / Vercel Edge
- **Language**: TypeScript

### Data Layer
- **Database**: MongoDB Atlas
- **Blob Storage**: Vercel Blob Storage (NFT metadata)
- **Collections**: `rats`, `races`, `wallets`

### Infrastructure
- **Deployment**: Vercel
- **Webhooks**: Alchemy/QuickNode (blockchain events)
- **Logging**: Structured JSON logs (professional, no emojis)

---

## Architecture Flow

### 1. Rat Minting Flow

```
User → Calls mint() → RatNFT Contract
                         ↓
                    Emits RatMinted(owner, tokenId)
                         ↓
                    Webhook catches event
                         ↓
                    POST /api/rat-mint
                         ↓
         ┌───────────────┴───────────────┐
         ↓                               ↓
    Generate Random Stats          Create metadata.json
    - Stamina (50-100)             {
    - Agility (50-100)               "name": "Rat #42",
    - Speed (50-100)                 "attributes": [...],
    - Bloodline (rarity-based)       "properties": {...}
    - Gender (male/female)         }
    - Model index (1-6)                    ↓
         ↓                         Upload to Vercel Blob
    Store in MongoDB              https://[blob]/rats/metadata/42.json
         ↓                                 ↓
    Link to wallet               Contract.tokenURI(42) returns URL
```

**Key Points**:
- **All stats generated off-chain** (gas savings)
- **Metadata is immutable** once uploaded
- **OpenSea compatible** (standard NFT metadata format)
- **MongoDB stores copy** for fast app queries

---

### 2. Race Creation & Entry Flow

```
User → Creates Race → RaceManager.createRace()
                        ↓
                   Stores race on-chain
                   - Entry fee
                   - Prize pool
                   - Max 6 participants
                        ↓
User → Enters Race → RaceManager.enterRace()
                        ↓
                   Validates:
                   - Owns rat NFT
                   - Has entry fee (ERC20)
                   - Race not full
                        ↓
                   Transfers entry fee to contract
                   Adds to participants list
                        ↓
                   When 6/6 participants
                        ↓
Any participant → Calls startRace()
```

**Key Points**:
- **10% creator fee** taken from prize pool
- **Entry fees in ERC20** (RaceToken or custom)
- **Rat ownership verified** on-chain
- **Race can only start when full** (6/6)

---

### 3. Race Simulation Flow (THE MAGIC)

```
startRace() called → Emits RaceStarted(raceId)
                           ↓
                    Webhook catches event
                           ↓
                    POST /api/race-started
                           ↓
         ┌─────────────────┴─────────────────┐
         ↓                                   ↓
    Fetch all 6 rats' stats          Analyze race composition
    from contract/MongoDB             - Bloodline distribution
         ↓                            - Average stats
    Build simulation context          - Time of day
         ↓                                   ↓
    ┌────────────────────────────────────────┐
    │  ADVANCED RACE SIMULATION ENGINE       │
    │                                        │
    │  For each rat, for 5 segments:        │
    │  1. Calculate base speed               │
    │  2. Apply bloodline perk               │
    │  3. Apply variance (agility-based)     │
    │  4. Apply fatigue (stamina-based)      │
    │  5. Apply time-of-day modifier         │
    │  6. Apply counter-matchup modifiers    │
    │  7. Calculate segment time             │
    │                                        │
    │  Sort by total time → Determine winner │
    └────────────────────────────────────────┘
                           ↓
         Store COMPLETE results in MongoDB
         - Positions (1st-6th)
         - Segment speeds per rat
         - Finish times
         - Analysis (insights, modifiers)
                           ↓
         Schedule finishRace() call (60s delay)
                           ↓
         Return results to frontend
```

**Key Points**:
- **Deterministic but complex** - not simple RNG
- **Multiple factors**: stats, bloodline, time, composition
- **Results pre-calculated** before user sees race
- **60-second animation** allows frontend to display race

---

### 4. Race Settlement Flow

```
After 60s → Backend calls finishRace()
                      ↓
         RaceManager.finishRace(raceId, positions[])
                      ↓
         Validates caller = BACKEND_ROLE
                      ↓
         Updates race status to FINISHED
                      ↓
         Automatically distributes prizes:
         - 1st place: 45% of pool
         - 2nd place: 27% of pool
         - 3rd place: 18% of pool
         - 4th-6th: 0%
                      ↓
         Emits RaceFinished(raceId, winners[], prizes[])
                      ↓
         Webhook catches event
                      ↓
         POST /api/race-finished
                      ↓
    ┌──────────────────┴──────────────────┐
    ↓                                     ↓
Update MongoDB                    Update rat stats in MongoDB
- Mark race as settled            - Increment wins/placed/losses
- Store on-chain tx hash          - Recalculate level
- Verify results match                    ↓
                              Update wallet stats
                              - Total wins
                              - Total races
```

**Key Points**:
- **Automatic prize distribution** in smart contract
- **Backend oracle role** for security
- **MongoDB stays in sync** with on-chain state
- **Immutable results** once settled

---

## Smart Contract Architecture

### RatNFT.sol (Simplified)
```solidity
contract RatNFT is ERC721Enumerable {
    // Minimal on-chain storage
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    
    function mint(address to) external returns (uint256);
    function setBaseURI(string memory baseURI) external onlyOwner;
    function tokenURI(uint256 tokenId) external view returns (string);
    
    // Emits: RatMinted(address indexed to, uint256 indexed tokenId)
}
```

**Changes from previous version**:
- ❌ Removed on-chain stats storage
- ❌ Removed metadata structs
- ✅ Simple ownership tracking only
- ✅ Points to Vercel Blob Storage for metadata

---

### RaceManager.sol
```solidity
contract RaceManager is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    struct Race {
        uint256 raceId;
        address creator;
        address entryToken;
        uint256 entryFee;
        RaceStatus status;
        uint256 prizePool;
        // ... more fields
    }
    
    function createRace(...) external returns (uint256);
    function enterRace(uint256 raceId, uint256 ratTokenId) external;
    function startRace(uint256 raceId) external;
    function finishRace(uint256 raceId, uint256[] calldata positions) 
        external onlyRole(BACKEND_ROLE);
    
    // Events:
    // RaceCreated, RaceEntered, RaceStarted, RaceFinished
}
```

**Key Features**:
- ✅ BACKEND_ROLE for oracle settlement
- ✅ Automatic prize distribution
- ✅ 10% creator fee
- ✅ Race cancellation/refunds

---

## MongoDB Schema

### rats Collection
```javascript
{
  _id: ObjectId,
  id: String (unique),           // "rat_1234567890_abc123"
  name: String,                  // "Rat #42"
  owner: String,                 // "0x742d35Cc..."
  modelIndex: Number,            // 1-6
  textureType: String,           // "baseColor"
  imageUrl: String,              // Full image URL
  stats: {
    stamina: Number,             // 50-100
    agility: Number,             // 50-100
    speed: Number,               // 50-100 (removed, now in metadata)
    bloodline: String            // "Speed Demon"
  },
  speeds: [Number],              // [0.85, 0.9, 0.88, 0.92, 0.87]
  gender: String,                // "male" | "female"
  dob: String,                   // ISO date
  wins: Number,                  // 5
  placed: Number,                // 12 (2nd/3rd place finishes)
  losses: Number,                // 8
  level: Number,                 // Calculated: floor(wins/10) + floor(placed/20) + 1
  metadataUrl: String,           // Vercel Blob URL
  rarityScore: Number,           // Calculated rarity
  createdAt: String              // ISO date
}
```

### races Collection
```javascript
{
  _id: ObjectId,
  id: String (unique),           // Contract race ID
  title: String,
  description: String,
  status: String,                // "waiting" | "full" | "running" | "completed"
  entryFee: String,              // Wei amount
  prizePool: String,             // Wei amount
  maxParticipants: Number,       // 6
  participants: [RaceEntry],
  startedAt: String,
  completedAt: String,
  
  // Simulation results (added by /api/race-started)
  simulationResults: {
    positions: [String],         // ["3", "1", "5", "2", "4", "6"]
    segmentSpeeds: {
      "1": [Number],             // Per-segment speeds
      // ... all 6 rats
    },
    finishTimes: {
      "1": Number,               // Total time in seconds
      // ... all 6 rats
    },
    winners: {
      first: { tokenId, owner, name, time },
      second: { ... },
      third: { ... }
    },
    analysis: {                  // NEW: Game theory analysis
      bloodlineDistribution: {},
      avgStats: {},
      timeOfDayModifier: String,
      competitiveInsights: [String]
    }
  },
  
  // Settlement data (added by /api/race-finished)
  settled: Boolean,
  settlementTx: String,
  settlementBlock: String,
  onChainWinners: [String],
  onChainPrizes: [String],
  
  transactionHash: String,
  blockNumber: String,
  calculatedAt: String,
  createdAt: String
}
```

---

## Environment Variables

### Required for Deployment

```bash
# MongoDB
MONGO_CONNECTION=mongodb+srv://...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...

# Smart Contracts
NEXT_PUBLIC_RAT_NFT_ADDRESS=0x...
NEXT_PUBLIC_RACE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_RACE_TOKEN_ADDRESS=0x...

# Blockchain
RPC_ENDPOINT=https://mainnet.base.org
PRIVATE_KEY=0x...              # Deployer wallet
ORACLE_PRIVATE_KEY=0x...       # Backend oracle wallet (for finishRace)

# Blob Storage Base URI
BLOB_STORAGE_BASE_URI=https://[your-storage].public.blob.vercel-storage.com/rats/metadata/

# Optional
LOG_LEVEL=info                 # debug | info | warn | error
NODE_ENV=production
```

---

## API Routes

### POST /api/rat-mint
- **Trigger**: RatMinted event
- **Purpose**: Generate metadata, upload to Blob, store in MongoDB
- **Response**: `{ success, ratId, tokenId, metadata }`

### POST /api/race-started
- **Trigger**: RaceStarted event
- **Purpose**: Run simulation, store results, schedule settlement
- **Response**: `{ success, raceId, winners, analysis }`

### POST /api/race-finished
- **Trigger**: RaceFinished event
- **Purpose**: Confirm settlement, update stats
- **Response**: `{ success, raceId, prizes }`

---

## Game Mechanics Summary

### Bloodlines (6 types)
1. **Speed Demon** (5%): Explosive start, weak late game
2. **Underground Elite** (10%): Late game beast
3. **Street Runner** (20%): Adaptive all-rounder
4. **City Slicker** (25%): Rush hour specialist
5. **Alley Cat** (25%): Consistent performer
6. **Sewer Dweller** (15%): Chaotic wildcard

### Time-of-Day Modifiers
- Dead of Night: Stamina bonus
- Morning Rush: City Slicker +12%
- Midday Heat: Extra fatigue
- Evening Rush: City Slicker +12%, agility matters more
- Night Racing: Underground Elite +8%

### Counter-Matchup System
- Each bloodline has +3-5% speed against certain opponents
- Each bloodline has -3-5% speed against counters
- Stacks if multiple opponents of same bloodline

### Strategic Depth
- Race composition analysis
- Opponent scouting
- Time-based strategy
- Stat optimization per bloodline
- Meta-game evolution

---

## Deployment Steps

### 1. Deploy Smart Contracts
```bash
cd contracts/rat
npx hardhat ignition deploy ./ignition/modules/RatNFT.ts --network base

cd ../race
npx hardhat ignition deploy ./ignition/modules/RaceContracts.ts --network base
```

### 2. Set Base URI
```bash
# After deployment, set NEXT_PUBLIC_RAT_NFT_ADDRESS and BLOB_STORAGE_BASE_URI
npx hardhat run scripts/set-base-uri.ts --network base
```

### 3. Deploy Backend
```bash
# Set all environment variables in Vercel
vercel --prod
```

### 4. Configure Webhooks
- Alchemy/QuickNode dashboard
- Add webhooks for: RatMinted, RaceStarted, RaceFinished
- Point to: https://your-app.vercel.app/api/*

### 5. Grant Oracle Role
```bash
# Grant BACKEND_ROLE to oracle wallet
npx hardhat run scripts/grant-backend-role.ts --network base
```

---

## Security Considerations

### Smart Contracts
- ✅ Access control (onlyOwner, BACKEND_ROLE)
- ✅ Reentrancy guards on prize distribution
- ✅ Input validation (max participants, valid positions)
- ✅ Race state machine (can't start twice, can't finish before start)

### Backend
- ✅ Webhook signature validation (future)
- ✅ Event validation (chain ID, contract address)
- ✅ Sensitive data redaction in logs
- ✅ Error handling with structured logging

### Oracle
- ✅ Dedicated wallet for settlement
- ✅ Role-based access control
- ✅ Results verification (match pre-calculated)
- ✅ Transaction retry logic

---

## Monitoring & Logging

### Structured JSON Logs
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "info",
  "message": "[SIMULATION] Race simulation complete",
  "service": "rat-racer-api",
  "environment": "production",
  "data": {
    "raceId": "123",
    "winner": "Speed Demon Rat",
    "analysis": { ... }
  }
}
```

### Log Levels
- **debug**: Detailed simulation steps, per-rat calculations
- **info**: API requests, race results, settlements
- **warn**: Invalid payloads, missing data, mismatches
- **error**: Failed transactions, exceptions, system errors

### Monitoring Points
- API route latency
- MongoDB query performance
- Blob storage upload success rate
- Oracle transaction success rate
- Race simulation completion time

---

## Future Enhancements

### Planned Features
- [ ] Multiple track types (different modifiers)
- [ ] Weather conditions
- [ ] Rat breeding/genetics system
- [ ] Tournament mode with ELO
- [ ] Racing leagues with restrictions
- [ ] Betting/predictions market
- [ ] Rat training/leveling
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Social features (guilds, friends)

### Scaling Considerations
- MongoDB connection pooling
- CDN for blob storage
- Read replicas for analytics
- Event queue for webhooks (if volume increases)
- Caching layer (Redis) for frequently accessed races

---

## Testing

### Contract Tests
```bash
cd contracts/rat
npx hardhat test

cd ../race
npx hardhat test
```

### Integration Tests
```bash
# Test full flow locally
npm run test:integration
```

### Load Testing
```bash
# Simulate multiple concurrent races
npm run test:load
```

---

## Support & Documentation

- **Game Mechanics**: `/GAME_MECHANICS.md`
- **MongoDB Setup**: `/MONGODB_SETUP.md`
- **API Docs**: `/MONGODB_API_DOCS.md`
- **Contract Docs**: `/contracts/README.md`
- **Deployment Guide**: `/contracts/DEPLOYMENT_GUIDE.md`

---

**System Status**: Production Ready ✓

**Zero Redis dependencies** | **MongoDB Atlas** | **Professional logging** | **Advanced game theory** | **Vercel Blob metadata**

