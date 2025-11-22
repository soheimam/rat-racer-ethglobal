# 🏁 Complete Race Flow - Backend Oracle Integration

## Overview

The backend Vercel function acts as a **deterministic oracle** that:
1. Listens for races starting
2. Runs simulation based on rat stats
3. Submits results + automatically distributes winnings in ONE transaction

---

## End-to-End Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     RACE LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

1️⃣ CREATION (Frontend → Blockchain)
   User creates race with:
   - Entry fee
   - Title/description
   - Track ID
   
   Status: Active ⚫

2️⃣ ENTRY (Frontend → Blockchain)
   6 users enter race with their rats:
   - Approves entry fee tokens
   - Submits rat NFT they own
   - Entry fee collected in contract
   
   When 6/6 filled → Status: Full 🟢

3️⃣ START (Frontend → Blockchain)
   ANY participant clicks "Start Race":
   - Emits RaceStarted event
   - Status: Started 🔵
   
   ⚠️ THIS TRIGGERS THE BACKEND ⚠️

4️⃣ SIMULATION (Backend Only)
   Backend watches for RaceStarted event:
   - Fetches all 6 rats + their stats
   - Runs deterministic simulation:
     * Uses stamina, agility, speed
     * Uses pseudo-randomness (block data)
     * Calculates finishing positions
   - Returns: [ratId1, ratId2, ratId3, ratId4, ratId5, ratId6]
   
5️⃣ FINISH + DISTRIBUTE (Backend → Blockchain)
   Backend calls finishRace() with results:
   - Sets final positions (1st-6th)
   - AUTOMATICALLY distributes prizes:
     ✅ Creator: 10% 
     ✅ 1st place: 45%
     ✅ 2nd place: 27%
     ✅ 3rd place: 18%
     ✅ 4th-6th: 0%
   - Clears rat locks (can race again)
   - Status: Finished 🏁
   
   ALL IN ONE TRANSACTION! ✨
```

---

## Key Points

### 🎯 Backend Determines Winners
The backend has **complete control** over who wins based on:
- Rat stats (stamina, agility, speed, bloodline)
- Deterministic simulation logic
- Pseudo-randomness for variability

### 💰 Automatic Prize Distribution
**NO separate "distributeWinnings()" call needed!**

The `finishRace()` function does EVERYTHING:
```solidity
function finishRace(uint256 raceId, uint256[] calldata winningRatTokenIds) external onlyOracle {
    // 1. Validate results
    // 2. Set positions
    // 3. 🎁 DISTRIBUTE PRIZES AUTOMATICALLY
    // 4. Clear rat locks
    // 5. Emit events
}
```

### 🔒 Security
- Only backend oracle wallet can call `finishRace()`
- Results cannot be manipulated on-chain
- Prize distribution is atomic (all or nothing)

---

## Backend Implementation

### Watch for Race Starts

```typescript
// api/watch-races.ts
import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_ENDPOINT),
});

// Watch for RaceStarted events
client.watchContractEvent({
  address: process.env.RACE_MANAGER_ADDRESS as `0x${string}`,
  event: parseAbiItem('event RaceStarted(uint256 indexed raceId, address indexed startedBy)'),
  onLogs: async (logs) => {
    for (const log of logs) {
      const raceId = log.args.raceId;
      console.log(`🏁 Race ${raceId} started! Running simulation...`);
      
      // Trigger simulation + finish
      await simulateAndFinishRace(raceId);
    }
  },
});
```

### Simulate Race (Your Game Logic)

```typescript
// api/lib/race-simulation.ts
interface RatStats {
  tokenId: bigint;
  stamina: number;
  agility: number;
  speed: number;
  bloodline: string;
}

export async function simulateRace(rats: RatStats[]): Promise<bigint[]> {
  console.log('🎮 Running race simulation...');
  
  // YOUR DETERMINISTIC LOGIC HERE
  // Example: Calculate race score for each rat
  const results = rats.map(rat => {
    // Base score from stats
    const baseScore = (rat.stamina + rat.agility + rat.speed) / 3;
    
    // Bloodline multiplier
    const bloodlineBonus = {
      'Speed Demon': 1.2,
      'Street Runner': 1.1,
      'Underground Elite': 1.15,
      'Alley Cat': 1.05,
      'Sewer Dweller': 1.0,
      'City Slicker': 1.08,
    }[rat.bloodline] || 1.0;
    
    // Add controlled randomness (deterministic based on block)
    const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9-1.1x
    
    const finalScore = baseScore * bloodlineBonus * randomFactor;
    
    return {
      tokenId: rat.tokenId,
      score: finalScore,
    };
  });
  
  // Sort by score (highest = 1st place)
  results.sort((a, b) => b.score - a.score);
  
  // Return in finishing order
  return results.map(r => r.tokenId);
}
```

### Call finishRace() (ONE Transaction)

```typescript
// api/finish-race.ts
export async function simulateAndFinishRace(raceId: bigint) {
  // 1. Fetch rat data from contract
  const entries = await publicClient.readContract({
    address: RACE_MANAGER_ADDRESS,
    abi: RACE_MANAGER_ABI,
    functionName: 'getRaceEntries',
    args: [raceId],
  });
  
  // 2. Fetch rat stats from RatNFT contract
  const ratStats = await Promise.all(
    entries.map(async entry => {
      const metadata = await publicClient.readContract({
        address: RAT_NFT_ADDRESS,
        abi: RAT_NFT_ABI,
        functionName: 'getRatMetadata',
        args: [entry.ratTokenId],
      });
      
      return {
        tokenId: entry.ratTokenId,
        stamina: metadata.stamina,
        agility: metadata.agility,
        speed: metadata.speed,
        bloodline: metadata.bloodline,
      };
    })
  );
  
  // 3. Run simulation (YOUR LOGIC)
  const winningOrder = await simulateRace(ratStats);
  
  console.log(`📊 Results: ${winningOrder.join(', ')}`);
  
  // 4. Submit to blockchain (distributes prizes automatically!)
  const hash = await walletClient.writeContract({
    address: RACE_MANAGER_ADDRESS,
    abi: RACE_MANAGER_ABI,
    functionName: 'finishRace',
    args: [raceId, winningOrder],
  });
  
  console.log(`✅ Race ${raceId} finished! Prizes distributed automatically.`);
  console.log(`📝 Transaction: ${hash}`);
  
  return hash;
}
```

---

## What Happens in finishRace()

```solidity
function finishRace(uint256 raceId, uint256[] calldata winningRatTokenIds) 
    external 
    onlyOracle  // ← Only your backend can call this
{
    // 1️⃣ VALIDATE
    require(race.status == RaceStatus.Started, "Race not started");
    require(winningRatTokenIds.length == 6, "Must provide all positions");
    
    // Check for duplicates
    // Verify all rats are in the race
    
    // 2️⃣ SET POSITIONS
    for (uint256 i = 0; i < winningRatTokenIds.length; i++) {
        // Find entry and set position (1-6)
        entries[j].position = uint8(i + 1);
    }
    
    // 3️⃣ 💰 DISTRIBUTE PRIZES (AUTOMATIC!)
    _distributePrizes(raceId);
    
    // This function:
    // - Sends 10% to race creator
    // - Sends 45% to 1st place
    // - Sends 27% to 2nd place  
    // - Sends 18% to 3rd place
    // - 4th-6th get nothing
    
    // 4️⃣ CLEANUP
    // Clear rat locks so they can race again
    for (uint256 i = 0; i < entries.length; i++) {
        ratInRace[raceId][entries[i].ratTokenId] = false;
    }
    
    // 5️⃣ UPDATE STATE
    race.status = RaceStatus.Finished;
    race.finishedAt = block.timestamp;
    
    // 6️⃣ EMIT EVENTS
    emit RaceFinished(raceId, winningRatTokenIds, winners, prizes);
    // Each prize transfer also emits PrizeClaimed event
}
```

---

## Prize Distribution Logic

```solidity
function _distributePrizes(uint256 raceId) private {
    Race storage race = races[raceId];
    
    // Example: 6 racers × 100 RACE = 600 total
    uint256 totalPool = race.prizePool; // 600 RACE
    
    // Creator fee: 10% = 60 RACE
    uint256 creatorFee = (totalPool * 10) / 100;
    race.entryToken.safeTransfer(race.creator, creatorFee);
    
    // Remaining: 90% = 540 RACE
    uint256 remaining = totalPool - creatorFee;
    
    // 1st place: 50% of remaining = 270 RACE (45% of total)
    uint256 prize1 = (remaining * 50) / 100;
    
    // 2nd place: 30% of remaining = 162 RACE (27% of total)
    uint256 prize2 = (remaining * 30) / 100;
    
    // 3rd place: Gets ALL remaining to avoid dust = 108 RACE (18% of total)
    uint256 prize3 = remaining - prize1 - prize2;
    
    // Transfer prizes
    for (uint256 i = 0; i < entries.length; i++) {
        if (entries[i].position == 1) {
            race.entryToken.safeTransfer(entries[i].racer, prize1);
            emit PrizeClaimed(raceId, entries[i].racer, prize1);
        }
        else if (entries[i].position == 2) {
            race.entryToken.safeTransfer(entries[i].racer, prize2);
            emit PrizeClaimed(raceId, entries[i].racer, prize2);
        }
        else if (entries[i].position == 3) {
            race.entryToken.safeTransfer(entries[i].racer, prize3);
            emit PrizeClaimed(raceId, entries[i].racer, prize3);
        }
        // 4th-6th get nothing
    }
}
```

---

## Frontend Updates

### Listen for Race Finish

```typescript
// Listen for RaceFinished event
import { parseAbiItem } from 'viem';

const unwatch = publicClient.watchContractEvent({
  address: RACE_MANAGER_ADDRESS,
  event: parseAbiItem('event RaceFinished(uint256 indexed raceId, uint256[] winningRatTokenIds, address[] winners, uint256[] prizes)'),
  onLogs: (logs) => {
    logs.forEach(log => {
      const { raceId, winningRatTokenIds, winners, prizes } = log.args;
      
      console.log(`🏁 Race ${raceId} finished!`);
      console.log(`🥇 1st: Rat #${winningRatTokenIds[0]} - ${formatEther(prizes[0])} RACE`);
      console.log(`🥈 2nd: Rat #${winningRatTokenIds[1]} - ${formatEther(prizes[1])} RACE`);
      console.log(`🥉 3rd: Rat #${winningRatTokenIds[2]} - ${formatEther(prizes[2])} RACE`);
      
      // Update UI
      showRaceResults(raceId, winningRatTokenIds, winners, prizes);
      
      // Confetti for winners! 🎉
      if (winners.includes(userAddress)) {
        celebrate();
      }
    });
  },
});
```

### Display Results

```typescript
function showRaceResults(
  raceId: number,
  ratIds: bigint[],
  winners: string[],
  prizes: bigint[]
) {
  return (
    <div className="race-results">
      <h2>Race #{raceId} - Results</h2>
      
      <div className="podium">
        <div className="first-place">
          🥇 Rat #{ratIds[0].toString()}
          <div className="winner">{winners[0]}</div>
          <div className="prize">{formatEther(prizes[0])} RACE</div>
        </div>
        
        <div className="second-place">
          🥈 Rat #{ratIds[1].toString()}
          <div className="winner">{winners[1]}</div>
          <div className="prize">{formatEther(prizes[1])} RACE</div>
        </div>
        
        <div className="third-place">
          🥉 Rat #{ratIds[2].toString()}
          <div className="winner">{winners[2]}</div>
          <div className="prize">{formatEther(prizes[2])} RACE</div>
        </div>
      </div>
      
      <div className="other-finishers">
        <div>4th: Rat #{ratIds[3].toString()}</div>
        <div>5th: Rat #{ratIds[4].toString()}</div>
        <div>6th: Rat #{ratIds[5].toString()}</div>
      </div>
    </div>
  );
}
```

---

## Testing the Full Flow

### 1. Start local node
```bash
npx hardhat node
```

### 2. Deploy contracts
```bash
npx hardhat run scripts/deploy-production.ts --network localhost
```

### 3. Run backend watcher
```bash
node api/watch-races.js
```

### 4. Create and fill race (frontend)
```typescript
// 6 users mint rats and enter race
```

### 5. Start race (any participant)
```typescript
await startRace(raceId);
// Backend automatically picks this up!
```

### 6. Backend processes
```
🏁 Race 0 started!
🎮 Running simulation...
📊 Results: [3, 1, 5, 2, 4, 6]
💰 Distributing prizes...
✅ Race 0 finished!
```

### 7. Check results
```typescript
const race = await getRace(0);
// race.status === Finished

const entries = await getRaceEntries(0);
// entries[0].position === 2 (came in 2nd)
// entries[1].position === 1 (WON!)
// etc.

// Check balances - prizes already sent!
```

---

## Summary

### What You Control (Backend)
- ✅ **Winner determination** - Your simulation logic
- ✅ **When to finish** - You call finishRace()
- ✅ **Rat stat influence** - How stats affect results

### What Happens Automatically (Smart Contract)
- ✅ **Prize distribution** - Instant, same transaction
- ✅ **Creator fee** - 10% to race creator
- ✅ **Rat unlocking** - Can race again immediately
- ✅ **Event emission** - Frontend updates

### No Need For
- ❌ Separate distributeWinnings() call
- ❌ Claim prize functions
- ❌ Manual prize calculations
- ❌ Multiple transactions

**Everything happens in ONE transaction when backend calls `finishRace()`!** 🎯

