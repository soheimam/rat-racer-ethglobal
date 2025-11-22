# Redis Data Layer Setup

## ✅ What's Been Created

A professional Redis module for managing all race data:

```
lib/redis/
├── types.ts       - TypeScript types for Rat, Race, Wallet
├── client.ts      - Redis client wrapper
├── rats.ts        - RatsService (mint, get, update, transfer)
├── races.ts       - RacesService (create, enter, start, complete)
├── wallets.ts     - WalletsService (get, stats, history)
├── seed.ts        - Test data seeding (dev only)
├── index.ts       - Exports
└── README.md      - Full documentation
```

---

## 🚀 Quick Setup

### 1. Create Vercel KV Store

**Option A: Via Vercel Dashboard**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to "Storage" tab
4. Click "Create Database" → "KV"
5. Copy the environment variables

**Option B: Via Vercel CLI**

```bash
vercel link
vercel env pull .env.local
```

### 2. Add Environment Variables

Create `.env.local`:

```env
KV_URL="your-kv-url"
KV_REST_API_URL="your-rest-api-url"
KV_REST_API_TOKEN="your-token"
KV_REST_API_READ_ONLY_TOKEN="your-read-token"
```

### 3. Install Package (Already Done)

```bash
npm install @vercel/kv
```

---

## 📊 Data Flow

### User Flow

```
1. User mints/owns rats → RatsService.createRat()
2. User enters race → RacesService.enterRace()
3. Race fills (6/6) → Auto-starts
4. Race completes → RacesService.completeRace()
   ├── Updates rat stats (wins/losses)
   ├── Sets winner
   └── Moves to completed races
5. User views history → WalletsService.getWalletWithHistory()
```

### Race Lifecycle

```
waiting → full → running → completed
  ↓        ↓       ↓          ↓
 [1-5]    [6]   [racing]   [results]
```

---

## 🎮 Usage Examples

### Example 1: Mint a Rat

```typescript
import { RatsService } from "@/lib/redis";

const rat = await RatsService.createRat(walletAddress, {
  name: "Lightning Whiskers",
  modelIndex: 1,
  textureType: "baseColor",
  imageUrl: "/images/white.png",
  ...RatsService.generateRandomStats(), // Random stats
  gender: "male",
  dob: new Date().toISOString(),
  wins: 0,
  placed: 0,
  losses: 0,
  level: 1,
});
```

### Example 2: Get User's Rats

```typescript
import { RatsService } from "@/lib/redis";

const rats = await RatsService.getRatsByOwner(walletAddress);
```

### Example 3: Create & Enter Race

```typescript
import { RacesService } from "@/lib/redis";

// Create race
const race = await RacesService.createRace({
  title: "Downtown Dash",
  description: "Race through neon streets",
  entryFee: "0.01",
});

// Enter rat
await RacesService.enterRace(race.id, ratId, walletAddress);
// Auto-starts when 6th rat enters!
```

### Example 4: View Available Races

```typescript
import { RacesService } from "@/lib/redis";

const activeRaces = await RacesService.getActiveRaces();
const completedRaces = await RacesService.getCompletedRaces(20);
```

---

## 🧪 Testing with Seed Data

Create test data for development:

```typescript
import { seedDatabase } from "@/lib/redis/seed";

// In a server action or API route
await seedDatabase();
```

This creates:

- 3 test wallets
- 8 test rats
- 2 active races (one with 4/6 rats)
- 1 completed race with results

---

## 🔌 Integration Points

### Next Steps to Connect:

1. **Wallet Connection**

   - Add wallet provider (RainbowKit, wagmi, etc.)
   - Get user's address
   - Call `WalletsService.getOrCreateWallet(address)`

2. **My Rats Page** (`app/my-rats/page.tsx`)

   ```typescript
   const rats = await RatsService.getRatsByOwner(address);
   ```

3. **Races Page** (`app/races/page.tsx`)

   ```typescript
   const active = await RacesService.getActiveRaces();
   const completed = await RacesService.getCompletedRaces();
   ```

4. **Race Viewer** (`app/race/[id]/page.tsx`)

   ```typescript
   const race = await RacesService.getRace(id);
   const rats = await Promise.all(
     race.participants.map((p) => RatsService.getRat(p.ratId))
   );
   // Transform to RaceRat format and pass to RaceTrack
   ```

5. **Shop Page** (`app/shop/page.tsx`)
   ```typescript
   // Mint new rat
   const rat = await RatsService.createRat(address, {...});
   ```

---

## 🏗️ Architecture Highlights

### Clean Separation

- **Services**: Business logic
- **Types**: TypeScript interfaces
- **Client**: Redis wrapper

### Auto-Features

✅ Races auto-start when full
✅ Stats auto-update after races
✅ Prize pools auto-calculate
✅ Ownership auto-verified
✅ Random stat generation

### Scalability

- Uses Redis sorted sets for efficient querying
- Indexed by wallet for fast lookups
- Support for unlimited concurrent races

---

## 🔐 Security Notes

- ✅ Ownership verified on race entry
- ✅ No duplicate entries in same race
- ✅ Race status validated (waiting → full → running → completed)
- ⚠️ Entry fees not yet enforced (add crypto payment)
- ⚠️ Prize distribution not automated (add later)

---

## 📝 TODO

- [ ] Add API routes for race management
- [ ] Connect to wallet provider
- [ ] Add entry fee payment (crypto)
- [ ] Add prize distribution
- [ ] Add race spectating (live updates)
- [ ] Add rat marketplace (transfers)

---

## 🎉 You're Ready!

The Redis data layer is complete and ready to use. Just:

1. Set up Vercel KV
2. Add environment variables
3. Start using the services in your pages

Everything is typed, documented, and production-ready! 🚀
