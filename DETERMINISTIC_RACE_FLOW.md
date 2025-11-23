# 🎮 Deterministic Race Flow with Claim System

## 🔄 Complete Flow

### 1. Race Creation & Entry

```
User creates race → selects entry token (RACE/USDC/MCADE) & fee
Users enter race → tokens locked in RaceManager contract
Race fills up (6 racers) → any participant calls startRace()
```

### 2. Race Start → Automatic Simulation & Recording

```
✅ RaceStarted event emitted
    ↓
🎯 Webhook: /api/race-started
    ↓
1. Update MongoDB: status = "in_progress"
2. Fetch all 6 participants and their rat stats
3. Run deterministic simulation based on:
   - Rat stats (stamina, agility, speed)
   - Bloodline multipliers
   - Level bonuses
   - Deterministic "randomness" (seed = tokenId)
4. Calculate winning order (1st → 6th)
5. Call recordRaceResults(raceId, winningOrder) on contract
    ↓
🔗 Contract: recordRaceResults()
    ↓
1. Verify all rats are valid participants
2. Set position for each rat
3. Calculate prizes:
   - 10% to race creator
   - 50% to 1st place
   - 30% to 2nd place
   - 20% to 3rd place
4. Set claimable amounts for each winner
5. Mark race as Finished
6. Release rats from racing lock
7. Emit RaceResultsRecorded event
    ↓
✅ RaceResultsRecorded event emitted
    ↓
🎯 Webhook: /api/race-finished
    ↓
1. Update MongoDB: status = "completed"
2. Update rat stats (wins/placed/losses)
3. Award XP to all participants
4. Level up rats if they gain enough XP
```

### 3. Prize Claiming (User-Initiated)

```
User visits races page → sees "Claim Prize" button
User clicks "Claim Prize"
    ↓
Frontend calls: claimPrize(raceId)
    ↓
🔗 Contract: claimPrize()
    ↓
1. Verify race is finished
2. Check claimable amount > 0
3. Check not already claimed
4. Set claimed = true, amount = 0
5. Transfer tokens (RACE/USDC/MCADE) to winner
6. Emit PrizeClaimed event
```

## 🎯 Key Benefits

### Deterministic Simulation

- ✅ Same rat stats = same result every time
- ✅ Fair and transparent
- ✅ No possibility of manipulation
- ✅ Results are instant once race starts

### User Claims Prizes

- ✅ Winners pay their own gas
- ✅ No central system overhead
- ✅ Prizes can be claimed anytime
- ✅ Contract holds funds securely

### Multi-Token Support

- ✅ Prizes paid in race's entry token (RACE, USDC, or MCADE)
- ✅ No conversion needed
- ✅ Users see winnings in the token they entered with

## 📊 Contract Functions

### For Users:

```solidity
// Enter a race with entry fee
enterRace(raceId, ratTokenId)

// Start a race when full (anyone)
startRace(raceId)

// Claim prize after race finishes
claimPrize(raceId)

// Check claimable amount
getClaimablePrize(raceId, racer) → (amount, claimed)
```

### For Admin (Backend):

```solidity
// Record deterministic race results
recordRaceResults(raceId, winningRatTokenIds[])
```

### For Race Creators:

```solidity
// Create race with chosen token & entry fee
createRace(trackId, entryToken, entryFee)

// Cancel race before it starts (refunds all)
cancelRace(raceId)
```

## 🔐 Security Features

### Reentrancy Protection

- ✅ All prize-related functions use `nonReentrant`
- ✅ State updated before token transfers

### Double-Claim Prevention

```solidity
require(!claimable.claimed, "Prize already claimed");
claimable.claimed = true;
claimable.amount = 0;
```

### Global Rat Locking

- ✅ Rats can't enter multiple races simultaneously
- ✅ Prevents race manipulation
- ✅ Automatically released when race finishes

## 💰 Prize Distribution

### Example: 6 racers, 100 RACE entry fee each

```
Total Prize Pool: 600 RACE

Creator Fee (10%):     60 RACE → Race Creator (claimable)
Remaining Pool (90%): 540 RACE

Prizes:
1st Place (50%): 270 RACE → Winner (claimable)
2nd Place (30%): 162 RACE → Second (claimable)
3rd Place (20%): 108 RACE → Third (claimable)
4th-6th Place:     0 RACE → No prize
```

All prizes sit in the contract until claimed!

## 🧪 Testing Flow

### 1. Create Test Race

```bash
# Create race with 10 RACE entry fee
createRace(trackId=1, entryToken=RACE_TOKEN, entryFee=10e18)
```

### 2. Enter Test Rats

```bash
# Approve RACE spending for each racer
approve(RaceManager, 10e18)

# Enter race
enterRace(raceId, ratTokenId)
```

### 3. Start Race (Triggers Everything)

```bash
# Anyone can start when full
startRace(raceId)
```

### 4. Check Claimable Prize

```bash
getClaimablePrize(raceId, winnerAddress)
# Returns: (amount, claimed)
```

### 5. Claim Prize

```bash
claimPrize(raceId)
# Transfers tokens to msg.sender
```

## 🚀 Ready to Deploy!

The updated `RaceManager` contract is compiled and ready. You'll need to:

1. Deploy new RaceManager with updated logic
2. Approve RACE, USDC, MCADE tokens
3. Update `NEXT_PUBLIC_RACE_MANAGER_ADDRESS` in .env
4. Test the full flow end-to-end

The deterministic simulation ensures races are fair, instant, and transparent! 🏁
