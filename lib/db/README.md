# MongoDB Data Layer

Professional MongoDB module for managing all rat racing data.

## Setup

### Environment Variables

Already set in `.env.local`:
```env
MONGO_CONNECTION=mongodb+srv://flynn_db_user:ki4deBxAqTgBvMM8@rat-db.5gartb5.mongodb.net/?appName=rat-db
MONGO_USERNAME=flynn_db_user
MONGO_PASSWORD=ki4deBxAqTgBvMM8
```

### Database Structure

**Database:** `rat-racer`

**Collections:**
- `rats` - Rat NFTs
- `races` - Race events
- `wallets` - User wallets

**Indexes:**
- `rats.id` (unique)
- `rats.owner`
- `races.id` (unique)
- `races.status`
- `races.createdAt`
- `wallets.address` (unique)

---

## Services

### RatsService
- `createRat(owner, ratData)` - Mint new rat
- `getRat(ratId)` - Get rat by ID
- `getRatsByOwner(owner)` - Get wallet's rats
- `updateRatStats(ratId, update)` - Update after race
- `transferRat(ratId, newOwner)` - Change ownership
- `generateRandomStats()` - Random stats for minting

### RacesService
- `createRace(data)` - Create new race
- `enterRace(raceId, ratId, owner)` - Enter rat (auto-starts at 6/6)
- `startRace(raceId)` - Manually start race
- `completeRace(raceId, results)` - Record results
- `getActiveRaces()` - Get waiting/running races
- `getCompletedRaces(limit)` - Get past races
- `getRacesByWallet(wallet)` - Get wallet's races

### WalletsService
- `getOrCreateWallet(address)` - Initialize wallet
- `getWallet(address)` - Get wallet
- `getWalletWithRats(address)` - Get wallet + rats
- `getWalletWithHistory(address)` - Get wallet + race history
- `updateWalletStats(address, won)` - Update after race
- `addRaceToHistory(address, raceId)` - Track race

---

## Usage Examples

### Mint a Rat
```typescript
import { RatsService } from '@/lib/db';

const rat = await RatsService.createRat(walletAddress, {
  name: "Lightning Whiskers",
  modelIndex: 1,
  textureType: "baseColor",
  imageUrl: "/images/white.png",
  ...RatsService.generateRandomStats(),
  gender: "male",
  dob: new Date().toISOString(),
  wins: 0,
  placed: 0,
  losses: 0,
  level: 1,
});
```

### Get User's Rats
```typescript
const rats = await RatsService.getRatsByOwner(walletAddress);
```

### Create & Enter Race
```typescript
const race = await RacesService.createRace({
  title: "Downtown Dash",
  description: "Neon street racing",
  entryFee: "0.01",
});

await RacesService.enterRace(race.id, ratId, walletAddress);
// Auto-starts when 6th rat enters!
```

### View Races
```typescript
const active = await RacesService.getActiveRaces();
const completed = await RacesService.getCompletedRaces(20);
```

### Seed Test Data
```typescript
import { seedDatabase } from '@/lib/db/seed';

await seedDatabase();
// Creates wallets, rats, and races for testing
```

---

## Features

✅ Auto-start races when full (6/6 rats)
✅ Automatic stat updates after races
✅ Prize pool calculation
✅ Race history tracking
✅ Wallet stats (wins/races)
✅ Rat leveling system
✅ Random stat generation
✅ Ownership verification
✅ MongoDB indexes for performance
✅ Singleton connection pattern

---

## Migration from Redis

All functionality from Redis/Vercel KV has been ported:
- ✅ Same API surface
- ✅ Same data models
- ✅ Same business logic
- ✅ Better querying with MongoDB
- ✅ Better for complex aggregations

Changes:
- Uses `_id` for MongoDB IDs
- Uses `id` for application IDs (same as before)
- Direct MongoDB queries instead of Redis commands
- Proper indexes for performance

