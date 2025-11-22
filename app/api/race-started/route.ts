/**
 * API Route: /api/race-started
 * 
 * Triggered by: RaceStarted event from RaceManagerV2 contract
 * Purpose: Calculate ENTIRE race outcome deterministically and store in MongoDB
 * 
 * RACE SIMULATION LOGIC - THE CORE ALGORITHM
 * 
 * Flow:
 * 1. Webhook catches RaceStarted event
 * 2. Fetch all 6 rats' stats from contract
 * 3. Run deterministic simulation
 * 4. Calculate speed per segment for each rat
 * 5. Determine final positions (1st-6th)
 * 6. Store complete results in MongoDB
 * 7. Schedule finishRace() contract call after animation
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createPublicClient, 
  createWalletClient,
  http, 
  parseAbi,
  getAddress 
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { RatsService, RacesService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { simulateRace, type RatRaceStats, type SimulationContext } from '@/lib/race-simulation';

// Contract addresses
const RAT_NFT_ADDRESS = process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS as `0x${string}`;
const RACE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_RACE_MANAGER_ADDRESS as `0x${string}`;
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://mainnet.base.org';
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;

// Contract ABIs
const RACE_MANAGER_ABI = parseAbi([
  'function getRace(uint256 raceId) external view returns (tuple(uint256 raceId, address creator, uint8 trackId, address entryToken, uint256 entryFee, uint8 status, uint256 prizePool, uint256 createdAt, uint256 startedAt, uint256 finishedAt, string title, string description))',
  'function getRaceEntries(uint256 raceId) external view returns (tuple(address racer, uint256 ratTokenId, uint256 enteredAt, uint8 position)[])',
  'function finishRace(uint256 raceId, uint256[] calldata winningRatTokenIds) external',
]);

const RAT_NFT_ABI = parseAbi([
  'function getRatMetadata(uint256 tokenId) external view returns (tuple(string name, uint8 color, uint256 mintedAt, uint8 stamina, uint8 agility, uint8 speed, string bloodline, string gender))',
]);

interface WebhookPayload {
  event: {
    name: string;
    args: {
      raceId: string;
      startedBy: string;
    };
  };
  transaction: {
    hash: string;
    blockNumber: string;
  };
  network: {
    chainId: number;
  };
}

interface RatStats {
  tokenId: string;
  owner: string;
  name: string;
  stamina: number;
  agility: number;
  speed: number;
  bloodline: string;
  color: number;
  speeds?: number[]; // Pre-generated speeds from metadata
}

interface RaceSimulationResult {
  positions: string[];
  segmentSpeeds: Record<string, number[]>;
  finishTimes: Record<string, number>;
  winners: {
    first: { tokenId: string; owner: string; name: string };
    second: { tokenId: string; owner: string; name: string };
    third: { tokenId: string; owner: string; name: string };
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logger.logApiEntry('race-started', request);
  
  const log = logger.child({ requestId, route: '/api/race-started' });

  try {
    // 1. PARSE AND LOG FULL PAYLOAD
    const payload: WebhookPayload = await request.json();
    
    logger.logWebhookPayload('RaceStarted', payload);

    log.info('[RACE] Processing race start event', {
      event: payload.event.name,
      raceId: payload.event.args.raceId,
      startedBy: payload.event.args.startedBy,
      txHash: payload.transaction.hash,
    });

    // 2. VALIDATE payload
    if (payload.event.name !== 'RaceStarted') {
      log.warn('Invalid event type', { 
        expected: 'RaceStarted', 
        received: payload.event.name 
      });
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    const { raceId, startedBy } = payload.event.args;
    const chainId = payload.network.chainId;

    // 3. SETUP blockchain clients
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_ENDPOINT),
    });

    log.info('Blockchain client initialized', { chainId, rpcEndpoint: RPC_ENDPOINT });

    // 4. FETCH race data from contract
    log.info('Fetching race data from contract', { raceId });
    
    const race = await publicClient.readContract({
      address: RACE_MANAGER_ADDRESS,
      abi: RACE_MANAGER_ABI,
      functionName: 'getRace',
      args: [BigInt(raceId)],
    });

    logger.logContractCall('RaceManagerV2', 'getRace', [raceId], {
      title: race[10],
      prizePool: race[6].toString(),
    });

    const entries = await publicClient.readContract({
      address: RACE_MANAGER_ADDRESS,
      abi: RACE_MANAGER_ABI,
      functionName: 'getRaceEntries',
      args: [BigInt(raceId)],
    });

    logger.logContractCall('RaceManagerV2', 'getRaceEntries', [raceId], {
      count: entries.length,
    });

    log.info('Race data fetched', {
      title: race[10],
      entryFee: race[4].toString(),
      prizePool: race[6].toString(),
      participants: entries.length,
    });

    if (entries.length !== 6) {
      log.error('Invalid number of race entries', {
        expected: 6,
        actual: entries.length,
      });
      throw new Error(`Invalid number of entries: ${entries.length}. Expected 6.`);
    }

    // 5. FETCH all rats' stats from contract
    log.info('Fetching all rats metadata from contract', {
      ratCount: entries.length,
    });

    const ratsStats: RatStats[] = await Promise.all(
      entries.map(async (entry, index) => {
        log.debug(`Fetching rat ${index + 1}/6`, { tokenId: entry[1].toString() });
        
        const metadata = await publicClient.readContract({
          address: RAT_NFT_ADDRESS,
          abi: RAT_NFT_ABI,
          functionName: 'getRatMetadata',
          args: [entry[1]], // ratTokenId
        });

        return {
          tokenId: entry[1].toString(),
          owner: getAddress(entry[0]), // racer address
          name: metadata[0],
          color: Number(metadata[1]),
          stamina: Number(metadata[3]),
          agility: Number(metadata[4]),
          speed: Number(metadata[5]),
          bloodline: metadata[6],
        };
      })
    );

    log.info('All rats metadata fetched', {
      rats: ratsStats.map(r => ({
        name: r.name,
        stamina: r.stamina,
        agility: r.agility,
        speed: r.speed,
        bloodline: r.bloodline,
      })),
    });

    // 6. RUN RACE SIMULATION - THE CORE ALGORITHM WITH ADVANCED MECHANICS
    log.info('[SIMULATION] Starting advanced race simulation', { raceId });
    
    const simulationContext: SimulationContext = {
      raceId,
      rats: ratsStats,
      startTime: new Date(),
      trackId: 1,
    };
    
    const simulationResults = simulateRace(simulationContext);

    log.info('[SIMULATION] Race simulation complete', {
      winner: simulationResults.winners.first.name,
      second: simulationResults.winners.second.name,
      third: simulationResults.winners.third.name,
      positions: simulationResults.positions,
      analysis: simulationResults.analysis,
    });

    // 7. STORE race in MongoDB with complete results
    log.info('Storing race results in MongoDB', { raceId });

    // Check if race already exists in MongoDB
    let dbRace = await RacesService.getRace(raceId);
    
    if (!dbRace) {
      // Create new race entry
      log.info('Creating new race in MongoDB', { raceId });
      
      dbRace = await RacesService.createRace({
        title: race[10] || `Race #${raceId}`,
        description: race[11] || 'Street racing competition',
        entryFee: race[4].toString(),
      });
      
      // Override the generated ID with contract race ID
      await (await import('@/lib/db/client')).getDb()
        .collection('races')
        .updateOne(
          { id: dbRace.id },
          { $set: { id: raceId } }
        );
      
      dbRace.id = raceId;
    }

    // Update race with simulation results
    const raceUpdateData = {
      status: 'running' as const,
      startedAt: new Date().toISOString(),
      simulationResults: {
        positions: simulationResults.positions,
        segmentSpeeds: simulationResults.segmentSpeeds,
        finishTimes: simulationResults.finishTimes,
        winners: simulationResults.winners,
        analysis: simulationResults.analysis,
      },
      transactionHash: payload.transaction.hash,
      blockNumber: payload.transaction.blockNumber,
      calculatedAt: new Date().toISOString(),
    };

    logger.logDbOperation('UPDATE', 'races', { raceId, update: 'simulationResults' });

    await (await import('@/lib/db/client')).getDb()
      .collection('races')
      .updateOne(
        { id: raceId },
        { $set: raceUpdateData }
      );

    log.info('[STORAGE] Race results stored in MongoDB', { raceId });

    // 8. SCHEDULE contract finishRace() call
    const ANIMATION_DURATION = 60000; // 60 seconds
    
    log.info('[SCHEDULER] Scheduling finishRace() contract call', {
      raceId,
      delayMs: ANIMATION_DURATION,
      scheduledFor: new Date(Date.now() + ANIMATION_DURATION).toISOString(),
    });

    setTimeout(async () => {
      try {
        log.info('[FINISH] Animation complete, calling finishRace()', { raceId });
        
        await callFinishRaceOnContract(
          raceId,
          simulationResults.positions.map(id => BigInt(id)),
          chainId
        );
        
        log.info('[FINISH] finishRace() completed successfully', { raceId });
      } catch (error: any) {
        log.error('[FINISH] Failed to call finishRace()', error, { raceId });
        
        // Store error for manual retry
        await (await import('@/lib/db/client')).getDb()
          .collection('races')
          .updateOne(
            { id: raceId },
            { 
              $set: { 
                finishError: {
                  message: error.message,
                  timestamp: new Date().toISOString(),
                }
              }
            }
          );
      }
    }, ANIMATION_DURATION);

    // 9. SUCCESS response
    const duration = Date.now() - startTime;
    logger.logApiExit('race-started', requestId, true, duration);

    return NextResponse.json({
      success: true,
      raceId,
      message: 'Race simulation complete and stored',
      winners: simulationResults.winners,
      positions: simulationResults.positions,
      analysis: simulationResults.analysis,
      finishScheduledIn: ANIMATION_DURATION,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.logApiExit('race-started', requestId, false, duration);
    
    log.error('Failed to process race start', error, {
      errorType: error.constructor.name,
      errorMessage: error.message,
    });

    return NextResponse.json(
      {
        error: 'Failed to process race start',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// NOTE: Race simulation logic moved to /lib/race-simulation.ts
// This provides advanced game mechanics including:
// - Bloodline-specific perks and counter-matchups
// - Time-of-day modifiers
// - Race composition analysis
// - Strategic depth for competitive play

/**
 * Call finishRace() on the smart contract
 */
async function callFinishRaceOnContract(
  raceId: string,
  winningRatTokenIds: bigint[],
  chainId: number
): Promise<void> {
  const account = privateKeyToAccount(ORACLE_PRIVATE_KEY);
  
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_ENDPOINT),
  });

  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_ENDPOINT),
  });

  logger.info('[finish-race] Calling finishRace() on contract', {
    raceId,
    winningOrder: winningRatTokenIds.map(id => id.toString()),
  });

  const hash = await walletClient.writeContract({
    address: RACE_MANAGER_ADDRESS,
    abi: RACE_MANAGER_ABI,
    functionName: 'finishRace',
    args: [BigInt(raceId), winningRatTokenIds],
  });

  logger.logContractCall('RaceManagerV2', 'finishRace', [raceId, winningRatTokenIds], { hash });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  logger.info('[finish-race] Transaction confirmed', {
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
  });

  // Update MongoDB
  await (await import('@/lib/db/client')).getDb()
    .collection('races')
    .updateOne(
      { id: raceId },
      {
        $set: {
          status: 'completed',
          settled: true,
          settlementTx: hash,
          completedAt: new Date().toISOString(),
        }
      }
    );
}

