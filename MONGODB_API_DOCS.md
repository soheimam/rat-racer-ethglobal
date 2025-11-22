# MongoDB API Implementation - Complete Guide

## Overview

All API routes use **MongoDB Atlas** for data storage with professional structured JSON logging. Zero Redis dependencies.

---

## Professional Logger

Location: `/lib/logger.ts`

### Features
- Structured JSON logging (production-ready)
- Multiple log levels (debug, info, warn, error)
- Request tracking with unique IDs
- Automatic sensitive data redaction
- Color-coded console output (development), JSON (production)
- Child loggers with persistent context
- Specialized logging methods (webhooks, API, DB, contracts)

### Usage

```typescript
import { logger } from '@/lib/logger';

// Basic logging
logger.info('User logged in', { userId: '123', method: 'oauth' });
logger.error('Payment failed', error, { orderId: '456' });

// Log webhook payload (full payload included)
logger.logWebhookPayload('RatMinted', payload);

// Log API route
const requestId = logger.logApiEntry('rat-mint', request);
logger.logApiExit('rat-mint', requestId, true, 1234);

// Log database operations
logger.logDbOperation('INSERT', 'rats', { ratId: '123' });

// Log contract calls
logger.logContractCall('RatNFT', 'mint', [owner, name], result);

// Child logger with context
const log = logger.child({ requestId: '123', route: '/api/mint' });
log.info('Processing...'); // Includes requestId automatically
```

### Environment Variables

```bash
# Optional: Set minimum log level
LOG_LEVEL=debug   # debug, info, warn, error (default: debug in dev, info in prod)
```

### Output Examples

**Development (Pretty)**:
```
[14:23:45] INFO User logged in
  Data: {
    "userId": "123",
    "method": "oauth"
  }

[14:23:50] ERROR Payment failed
  Error: Insufficient funds
  Stack: Error: Insufficient funds at ...
```

**Production (JSON)**:
```json
{"timestamp":"2024-01-01T14:23:45.123Z","level":"info","message":"User logged in","service":"rat-racer-api","environment":"production","data":{"userId":"123","method":"oauth"}}
```

---

## API Routes (MongoDB-Adapted)

### 1. `/api/rat-mint` - Store Minted Rats

**Triggered by**: `RatMinted` event from RatNFTV2

**Webhook Payload**:
```json
{
  "event": {
    "name": "RatMinted",
    "args": {
      "owner": "0x...",
      "tokenId": "42",
      "name": "Lightning",
      "color": "2",
      "stamina": "85",
      "agility": "92",
      "bloodline": "Speed Demon"
    }
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": "12345"
  },
  "network": {
    "chainId": 8453
  }
}
```

**Processing**:
1. Logs full webhook payload
2. Validates event type and chain ID
3. Fetches complete metadata from contract
4. Generates random speeds for simulation
5. Stores in MongoDB `rats` collection
6. Ensures wallet exists in `wallets` collection

**MongoDB Document**:
```javascript
// Collection: rats
{
  _id: ObjectId("..."),
  id: "rat_1234567890_abc123",
  name: "Lightning",
  owner: "0x742d35Cc...",
  modelIndex: 3,
  textureType: "baseColor",
  imageUrl: "/images/white.png",
  stats: {
    stamina: 85,
    agility: 92,
    bloodline: "Speed Demon"
  },
  speeds: [0.850, 0.895, 0.880, 0.920, 0.870],
  gender: "male",
  dob: "2024-01-01T00:00:00.000Z",
  wins: 0,
  placed: 0,
  losses: 0,
  level: 1,
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "ratId": "rat_1234567890_abc123",
  "tokenId": "42",
  "owner": "0x742d35Cc...",
  "message": "Rat minted and stored successfully",
  "stats": {
    "stamina": 85,
    "agility": 92,
    "bloodline": "Speed Demon"
  }
}
```

---

### 2. `/api/race-started` - Calculate Race ⭐

**Triggered by**: `RaceStarted` event from RaceManagerV2

**THE MAGIC HAPPENS HERE!**

**Webhook Payload**:
```json
{
  "event": {
    "name": "RaceStarted",
    "args": {
      "raceId": "123",
      "startedBy": "0x..."
    }
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": "12345"
  },
  "network": {
    "chainId": 8453
  }
}
```

**Processing**:
1. Logs full webhook payload
2. Fetches race data from contract
3. Fetches all 6 rats' stats from contract
4. **Runs deterministic simulation**:
   - Calculates base speed from stats
   - Applies bloodline multipliers (1.02x - 1.15x)
   - Generates per-segment speeds with variance
   - Applies fatigue factor (stamina matters!)
   - Calculates finish times
   - Sorts to determine positions
5. Stores complete results in MongoDB
6. Schedules `finishRace()` contract call (60s later)

**Simulation Algorithm**:
```typescript
For each rat:
  baseSpeed = (stamina×0.3 + agility×0.4 + speed×0.3) / 100
  baseSpeed *= bloodlineMultiplier
  
  For each of 5 segments:
    variance = ±10% based on stamina
    fatigue = increases in later segments if low stamina
    segmentSpeed = baseSpeed × randomFactor × fatigueFactor
  
  totalTime = sum(segmentLength / segmentSpeed)

Sort by totalTime → Final positions
```

**MongoDB Document**:
```javascript
// Collection: races
{
  _id: ObjectId("..."),
  id: "123",
  title: "Street Championship",
  description: "Ultimate showdown",
  status: "running",
  entryFee: "100000000000000000", // 0.1 ETH in wei
  prizePool: "600000000000000000",
  maxParticipants: 6,
  participants: [...],
  startedAt: "2024-01-01T12:00:00.000Z",
  // PRE-CALCULATED RESULTS
  simulationResults: {
    positions: ["3", "1", "5", "2", "4", "6"], // Token IDs
    segmentSpeeds: {
      "1": [0.850, 0.900, 0.880, 0.920, 0.870],
      "2": [0.820, 0.850, 0.830, 0.860, 0.840],
      // ... all 6 rats
    },
    finishTimes: {
      "1": 45.2,
      "2": 47.8,
      // ... all 6 rats
    },
    winners: {
      first: { tokenId: "3", owner: "0x...", name: "Turbo" },
      second: { tokenId: "1", owner: "0x...", name: "Lightning" },
      third: { tokenId: "5", owner: "0x...", name: "Nitro" }
    }
  },
  transactionHash: "0x...",
  blockNumber: "12345",
  calculatedAt: "2024-01-01T12:00:00.000Z",
  createdAt: "2024-01-01T11:00:00.000Z"
}
```

**Response**:
```json
{
  "success": true,
  "raceId": "123",
  "message": "Race simulation complete and stored",
  "winners": {
    "first": { "tokenId": "3", "owner": "0x...", "name": "Turbo" },
    "second": { "tokenId": "1", "owner": "0x...", "name": "Lightning" },
    "third": { "tokenId": "5", "owner": "0x...", "name": "Nitro" }
  },
  "positions": ["3", "1", "5", "2", "4", "6"],
  "finishScheduledIn": 60000
}
```

---

### 3. `/api/race-finished` - Confirm Settlement

**Triggered by**: `RaceFinished` event from RaceManagerV2

**Webhook Payload**:
```json
{
  "event": {
    "name": "RaceFinished",
    "args": {
      "raceId": "123",
      "winningRatTokenIds": ["3", "1", "5", "2", "4", "6"],
      "winners": ["0x...", "0x...", "0x...", "0x...", "0x...", "0x..."],
      "prizes": ["270000000000000000", "162000000000000000", "108000000000000000", "0", "0", "0"]
    }
  },
  "transaction": {
    "hash": "0x...",
    "blockNumber": "12346"
  },
  "network": {
    "chainId": 8453
  }
}
```

**Processing**:
1. Logs full webhook payload
2. Fetches race from MongoDB
3. Verifies on-chain results match calculation
4. Updates race as settled
5. Updates all 6 rats' win/loss stats
6. Updates winner's wallet stats

**MongoDB Updates**:
```javascript
// races collection
{
  id: "123",
  status: "completed",
  settled: true,
  settlementTx: "0x...",
  settlementBlock: "12346",
  onChainWinners: ["3", "1", "5", "2", "4", "6"],
  onChainPrizes: ["270000000000000000", ...],
  completedAt: "2024-01-01T12:01:00.000Z"
}

// rats collection (winner)
{
  id: "rat_..._3",
  wins: 1,  // +1
  level: 1,
  // ...
}

// rats collection (2nd/3rd)
{
  id: "rat_..._1",
  placed: 1,  // +1
  // ...
}

// rats collection (4th-6th)
{
  id: "rat_..._2",
  losses: 1,  // +1
  // ...
}
```

**Response**:
```json
{
  "success": true,
  "raceId": "123",
  "settled": true,
  "message": "Race settlement confirmed and stats updated",
  "prizes": [
    { "position": 1, "winner": "0x...", "ratTokenId": "3", "prize": "270000000000000000" },
    { "position": 2, "winner": "0x...", "ratTokenId": "1", "prize": "162000000000000000" },
    { "position": 3, "winner": "0x...", "ratTokenId": "5", "prize": "108000000000000000" },
    { "position": 4, "winner": "0x...", "ratTokenId": "2", "prize": "0" },
    { "position": 5, "winner": "0x...", "ratTokenId": "4", "prize": "0" },
    { "position": 6, "winner": "0x...", "ratTokenId": "6", "prize": "0" }
  ]
}
```

---

## Log Output Examples

### rat-mint Route
```
[14:30:00] INFO [rat-mint] API request received
  Data: {
    "method": "POST",
    "requestId": "req_1234567890_abc123"
  }

[14:30:00] INFO [RatMinted] Received webhook payload
  Data: {
    "webhook": "RatMinted",
    "payloadKeys": ["event", "transaction", "network"],
    "fullPayload": { ... } // FULL PAYLOAD LOGGED
  }

[14:30:01] INFO Extracted event data
  Data: {
    "owner": "0x742d35Cc...",
    "tokenId": "42",
    "name": "Lightning",
    "stats": { "stamina": "85", "agility": "92", "bloodline": "Speed Demon" }
  }

[14:30:02] INFO Successfully stored rat in MongoDB
  Data: {
    "ratId": "rat_1234567890_abc123",
    "owner": "0x742d35Cc...",
    "name": "Lightning"
  }

[14:30:02] INFO [rat-mint] API request completed
  Data: {
    "requestId": "req_1234567890_abc123",
    "success": true,
    "durationMs": 1234
  }
```

### race-started Route
```
[15:00:00] INFO [race-started] API request received

[15:00:00] INFO [RaceStarted] Received webhook payload
  Data: { "fullPayload": { ... } }

[15:00:00] INFO [RACE] Processing race start event
  Data: {
    "raceId": "123",
    "startedBy": "0x..."
  }

[15:00:01] INFO All rats metadata fetched
  Data: {
    "rats": [
      { "name": "Turbo", "stamina": 95, "agility": 88, ... },
      ...
    ]
  }

[15:00:01] INFO [SIMULATION] Starting race simulation

[15:00:01] DEBUG [simulation] Turbo
  Data: {
    "baseSpeed": "0.920",
    "stamina": 95,
    "bloodline": "Speed Demon"
  }

[15:00:02] INFO [SIMULATION] Race simulation complete
  Data: {
    "winner": "Turbo",
    "second": "Lightning",
    "third": "Nitro"
  }

[15:00:02] INFO [SCHEDULER] Scheduling finishRace() contract call
  Data: {
    "delayMs": 60000,
    "scheduledFor": "2024-01-01T15:01:02.000Z"
  }
```

---

## MongoDB Collections

### `rats`
```javascript
{
  _id: ObjectId,
  id: String (unique),        // "rat_1234567890_abc123"
  name: String,               // "Lightning"
  owner: String,              // "0x742d35Cc..."
  modelIndex: Number,         // 1-6
  textureType: String,        // "baseColor"
  imageUrl: String,           // "/images/white.png"
  stats: {
    stamina: Number,          // 50-100
    agility: Number,          // 50-100
    bloodline: String         // "Speed Demon"
  },
  speeds: [Number],           // [0.85, 0.9, 0.88, 0.92, 0.87]
  gender: String,             // "male" | "female"
  dob: String,                // ISO date
  wins: Number,               // 0
  placed: Number,             // 0
  losses: Number,             // 0
  level: Number,              // 1
  createdAt: String           // ISO date
}
```

### `races`
```javascript
{
  _id: ObjectId,
  id: String (unique),        // Contract race ID
  title: String,              // "Street Championship"
  description: String,
  status: String,             // "waiting" | "full" | "running" | "completed"
  entryFee: String,           // Wei amount
  prizePool: String,          // Wei amount
  maxParticipants: Number,    // 6
  participants: [
    {
      ratId: String,
      owner: String,
      enteredAt: String
    }
  ],
  startedAt: String,
  completedAt: String,
  simulationResults: {        // Added by /api/race-started
    positions: [String],
    segmentSpeeds: {},
    finishTimes: {},
    winners: {}
  },
  transactionHash: String,
  blockNumber: String,
  calculatedAt: String,
  settled: Boolean,
  settlementTx: String,
  createdAt: String
}
```

### `wallets`
```javascript
{
  _id: ObjectId,
  address: String (unique),   // "0x742d35Cc..."
  ratIds: [String],           // ["rat_...", ...]
  raceHistory: [String],      // ["race_123", ...]
  totalWins: Number,          // 5
  totalRaces: Number,         // 20
  createdAt: String           // ISO date
}
```

---

## Deployment Checklist

- [x] Logger module created (no emojis, professional)
- [x] All API routes adapted for MongoDB Atlas
- [x] Full payload logging enabled
- [x] Error handling with structured logging
- [x] MongoDB services fully integrated
- [x] Zero Redis dependencies
- [ ] Test webhook payloads
- [ ] Deploy to Vercel
- [ ] Configure Alchemy/QuickNode webhooks
- [ ] Monitor logs in production

---

## Testing Locally

```bash
# Test rat-mint
curl -X POST http://localhost:3000/api/rat-mint \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "name": "RatMinted",
      "args": {
        "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "tokenId": "42",
        "name": "Test Rat",
        "color": "0",
        "stamina": "85",
        "agility": "90",
        "bloodline": "Speed Demon"
      }
    },
    "transaction": { "hash": "0x123", "blockNumber": "12345" },
    "network": { "chainId": 8453 }
  }'

# Check logs - should see full payload and structured logging
```

---

**Complete MongoDB Atlas + Professional Logging Implementation Ready**

