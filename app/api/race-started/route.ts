/**
 * API Route: /api/race-started
 * 
 * Triggered by: RaceStarted event from RaceManager contract
 * Purpose: 
 * 1. Mark race as started in MongoDB
 * 2. Simulate race deterministically based on rat stats
 * 3. Record results on-chain via recordRaceResults()
 */

import { RatsService } from '@/lib/db';
import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { ContractEvent, RaceStartedPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, getAddress, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const RACE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_RACE_MANAGER_ADDRESS as `0x${string}`;

const RACE_MANAGER_ABI = parseAbi([
  'function recordRaceResults(uint256 raceId, uint256[] calldata winningRatTokenIds) external',
]);

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logger.logApiEntry('race-started', request);

  const log = logger.child({ requestId, route: '/api/race-started' });

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(request);

    // Get signature header
    const signature = request.headers.get('x-hook0-signature');

    if (!signature) {
      log.error('Missing X-Hook0-Signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!WEBHOOK_SECRET) {
      log.error('WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Verify webhook signature
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const isValid = verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET, headersObj);

    if (!isValid) {
      log.error('Invalid webhook signature - rejected');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse JSON only after verification
    const payload: RaceStartedPayload = JSON.parse(rawBody);

    // Log full payload structure for debugging (we don't know exact webhook format yet)
    log.info('RAW WEBHOOK PAYLOAD', {
      fullPayload: JSON.stringify(payload, null, 2)
    });

    logger.logWebhookPayload('RaceStarted', payload);

    // Validate event type - return 200 OK if it's not the expected event (graceful skip)
    if (payload.event_name !== ContractEvent.RACE_STARTED) {
      log.info('[SKIP] Event not for this route - returning 200 OK', {
        received: payload.event_name,
        expected: ContractEvent.RACE_STARTED,
        txHash: payload.transaction_hash,
        action: 'Skipped gracefully, no error'
      });
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `This endpoint handles ${ContractEvent.RACE_STARTED} events only. Received: ${payload.event_name}. No error - gracefully skipped.`,
      }, { status: 200 });
    }

    log.info('Processing race started event', {
      raceId: payload.parameters.raceId,
      startedBy: payload.parameters.startedBy,
      txHash: payload.transaction_hash,
    });

    const { raceId, startedBy } = payload.parameters;

    // Update race status in MongoDB
    const db = await getDb();
    const result = await db.collection('races').updateOne(
      { id: raceId },
      {
        $set: {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          startedBy: getAddress(startedBy),
          startTx: payload.transaction_hash,
        }
      }
    );

    if (result.matchedCount === 0) {
      log.warn('Race not found in MongoDB', { raceId });
      return NextResponse.json({ error: 'Race not found' }, { status: 404 });
    }

    log.info('Updated race status to in_progress', { raceId });

    // Fetch race and participants
    const race = await db.collection('races').findOne({ id: raceId });
    if (!race || !race.participants || race.participants.length !== 6) {
      log.error('Invalid race data', new Error('Invalid race data'), { raceId, participantCount: race?.participants?.length });
      return NextResponse.json({ error: 'Invalid race data' }, { status: 500 });
    }

    // Fetch rat stats for all participants
    const participants = await Promise.all(
      race.participants.map(async (p: any) => {
        const rat = await RatsService.getRat(p.tokenId);
        return { ...p, rat };
      })
    );

    log.info('Loaded participants for simulation', {
      raceId,
      participants: participants.map(p => ({
        tokenId: p.rat?.tokenId,
        name: p.rat?.name,
        level: p.rat?.level,
        bloodline: p.rat?.stats?.bloodline,
      }))
    });

    // Simulate race deterministically
    const winningOrder = simulateRace(participants);

    log.info('Race simulation complete', {
      raceId,
      winningOrder,
      winner: winningOrder[0],
    });

    // Update MongoDB with simulation results
    await db.collection('races').updateOne(
      { id: raceId },
      {
        $set: {
          simulationResults: {
            order: winningOrder,
            simulatedAt: new Date().toISOString(),
          },
        }
      }
    );

    // Record results on-chain
    if (!PRIVATE_KEY || !RACE_MANAGER_ADDRESS) {
      log.error('Missing PRIVATE_KEY or RACE_MANAGER_ADDRESS');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    log.info('Calling recordRaceResults() on contract', {
      raceId,
      winningOrder,
      contract: RACE_MANAGER_ADDRESS,
    });

    try {
      const hash = await walletClient.writeContract({
        address: RACE_MANAGER_ADDRESS,
        abi: RACE_MANAGER_ABI,
        functionName: 'recordRaceResults',
        args: [BigInt(raceId), winningOrder.map(id => BigInt(id))],
      });

      log.info('recordRaceResults() transaction submitted', {
        raceId,
        txHash: hash,
      });

      // Update MongoDB with settlement tx
      await db.collection('races').updateOne(
        { id: raceId },
        {
          $set: {
            settlementTx: hash,
          }
        }
      );
    } catch (error: any) {
      log.error('Failed to record results on-chain', error, {
        raceId,
        errorMessage: error.message,
      });
      // Don't fail the webhook - race is simulated in MongoDB
    }

    const duration = Date.now() - startTime;
    logger.logApiExit('race-started', requestId, true, duration);

    return NextResponse.json({
      success: true,
      raceId,
      winningOrder,
      message: 'Race started, simulated, and results recorded on-chain',
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.logApiExit('race-started', requestId, false, duration);

    log.error('Failed to process race started', error, {
      errorMessage: error.message,
    });

    return NextResponse.json(
      { error: 'Failed to process race started', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Simple race simulation based on rat stats
 * Deterministic - same inputs always produce same outputs
 */
function simulateRace(participants: any[]): number[] {
  // Calculate race score for each rat (higher = better)
  const scores = participants.map((p) => {
    const rat = p.rat;

    if (!rat) {
      return { tokenId: p.tokenId, score: 0 };
    }

    // Base score from stats
    const stamina = rat.stats?.stamina || 50;
    const agility = rat.stats?.agility || 50;
    const speed = rat.stats?.speed || 50;

    const statScore = stamina * 0.3 + agility * 0.3 + speed * 0.4;

    // Bloodline bonus
    const bloodlineMultiplier = getBloodlineMultiplier(rat.stats?.bloodline || 'Common');

    // Level bonus (each level adds 2% performance)
    const levelBonus = 1 + ((rat.level || 1) - 1) * 0.02;

    // Deterministic "randomness" based on tokenId (keeps it fair but consistent)
    const seed = rat.tokenId || 0;
    const pseudoRandom = ((seed * 9301 + 49297) % 233280) / 233280;
    const randomFactor = 0.85 + pseudoRandom * 0.3; // ±15% variation

    const finalScore = statScore * bloodlineMultiplier * levelBonus * randomFactor;

    return {
      tokenId: rat.tokenId,
      score: finalScore,
    };
  });

  // Sort by score (highest first = 1st place)
  scores.sort((a, b) => b.score - a.score);

  // Return token IDs in finishing order
  return scores.map(s => s.tokenId);
}

function getBloodlineMultiplier(bloodline: string): number {
  const multipliers: Record<string, number> = {
    'Speed Demon': 1.12,
    'Sewer Elite': 1.10,
    'Street Ninja': 1.08,
    'Tunnel Veteran': 1.06,
    'Urban Scout': 1.04,
    'Alley Drifter': 1.02,
    'Common': 1.0,
  };
  return multipliers[bloodline] || 1.0;
}

