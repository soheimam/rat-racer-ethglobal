# Redis Data Layer

Professional Redis module for managing all rat racing data using Vercel KV.

## Setup

### 1. Create Vercel KV Store

```bash
# In your Vercel dashboard:
# 1. Go to Storage tab
# 2. Create KV Database
# 3. Copy the environment variables
```

### 2. Add Environment Variables

Create `.env.local` in project root:

```env
KV_URL="your-kv-url-here"
KV_REST_API_URL="your-kv-rest-api-url-here"
KV_REST_API_TOKEN="your-kv-rest-api-token-here"
KV_REST_API_READ_ONLY_TOKEN="your-kv-rest-api-read-only-token-here"
```

### 3. For Local Development (Optional)

Install Vercel CLI and link project:

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
```

---

## Architecture

### Services

**RatsService** - Manage rat NFTs

- `createRat()` - Mint new rat
- `getRat()` - Get rat by ID
- `getRatsByOwner()` - Get wallet's rats
- `updateRatStats()` - Update after race
- `transferRat()` - Change ownership

**RacesService** - Manage races

- `createRace()` - Create new race
- `enterRace()` - Enter rat into race
- `startRace()` - Auto-starts when full (6 rats)
- `completeRace()` - Record results
- `getActiveRaces()` - Get waiting/running races
- `getCompletedRaces()` - Get past races

**WalletsService** - Manage wallets

- `getOrCreateWallet()` - Initialize wallet
- `getWalletWithRats()` - Get wallet + rats
- `getWalletWithHistory()` - Get wallet + race history
- `updateWalletStats()` - Update after race

---

## Data Models

### Rat

```typescript
{
  id: string;
  name: string;
  owner: string; // wallet address
  modelIndex: number; // 1-6
  stats: { stamina, agility, bloodline };
  speeds: number[]; // 5 segments
  wins: number;
  placed: number;
  losses: number;
  level: number;
}
```

### Race

```typescript
{
  id: string;
  status: "waiting" | "full" | "running" | "completed";
  maxParticipants: 6;
  participants: RaceEntry[];
  prizePool: string;
  winner?: { ratId, owner, prize };
  results?: { position, ratId, finishTime }[];
}
```

### Wallet

```typescript
{
  address: string;
  ratIds: string[];
  raceHistory: string[];
  totalWins: number;
  totalRaces: number;
}
```

---

## Usage Examples

### Mint a Rat

```typescript
import { RatsService } from "@/lib/redis";

const rat = await RatsService.createRat("0x123...", {
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

### Create a Race

```typescript
import { RacesService } from "@/lib/redis";

const race = await RacesService.createRace({
  title: "Downtown Dash",
  description: "Race through the neon streets",
  entryFee: "0.01",
});
```

### Enter a Race

```typescript
await RacesService.enterRace(raceId, ratId, walletAddress);
// Auto-starts when 6th rat enters
```

### Complete a Race

```typescript
const results = [
  { ratId: "rat_1", finishTime: 10.5 },
  { ratId: "rat_2", finishTime: 11.2 },
  // ... etc
];

await RacesService.completeRace(raceId, results);
// Updates rat stats, moves to completed races
```

---

## Redis Key Structure

```
rat:{id}                    - Individual rat data
wallet:{address}            - Wallet data
wallet:{address}:rats       - Set of rat IDs owned by wallet
race:{id}                   - Individual race data
races:active                - Sorted set of active race IDs
races:completed             - Sorted set of completed race IDs
```

---

## Features

✅ Auto-start races when full (6/6 rats)
✅ Automatic stat updates after races
✅ Prize pool calculation
✅ Race history tracking
✅ Wallet stats (total wins/races)
✅ Rat leveling system
✅ Random stat generation
✅ Owner verification
✅ Race result persistence

---

## Next Steps

1. Add to your Vercel project
2. Hook up to wallet connection
3. Create API routes for race management
4. Add entry fee payment logic (crypto)
5. Implement prize distribution
