/**
 * API Route: /api/race-finished
 * 
 * Triggered by: RaceFinished event from RaceManagerV2 contract
 * Purpose: Confirm on-chain settlement and update final stats in MongoDB
 * 
 * Flow:
 * 1. Webhook catches RaceFinished event
 * 2. Verify results match calculation
 * 3. Update race as settled in MongoDB
 * 4. Update all rats' win/loss stats
 * 5. Update wallet stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { RatsService, WalletsService } from '@/lib/db';
import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';

interface WebhookPayload {
  event: {
    name: string;
    args: {
      raceId: string;
      winningRatTokenIds: string[];
      winners: string[];
      prizes: string[];
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logger.logApiEntry('race-finished', request);
  
  const log = logger.child({ requestId, route: '/api/race-finished' });

  try {
    // 1. PARSE AND LOG FULL PAYLOAD
    const payload: WebhookPayload = await request.json();
    
    logger.logWebhookPayload('RaceFinished', payload);

    log.info('[SETTLEMENT] Processing race settlement event', {
      event: payload.event.name,
      raceId: payload.event.args.raceId,
      winners: payload.event.args.winners,
      prizes: payload.event.args.prizes,
      txHash: payload.transaction.hash,
    });

    // 2. VALIDATE payload
    if (payload.event.name !== 'RaceFinished') {
      log.warn('Invalid event type', { 
        expected: 'RaceFinished', 
        received: payload.event.name 
      });
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      );
    }

    const { raceId, winningRatTokenIds, winners, prizes } = payload.event.args;
    const chainId = payload.network.chainId;

    // 3. FETCH race from MongoDB
    log.info('Fetching race from MongoDB', { raceId });
    
    const db = await getDb();
    const race = await db.collection('races').findOne({ id: raceId });
    
    if (!race) {
      log.warn('Race not found in MongoDB', { raceId });
      return NextResponse.json(
        { error: 'Race not found' },
        { status: 404 }
      );
    }

    log.info('Race found in MongoDB', {
      raceId,
      status: race.status,
      hasSimulation: !!race.simulationResults,
    });

    // 4. VERIFY results match calculation
    if (race.simulationResults?.positions) {
      const calculatedTop3 = race.simulationResults.positions.slice(0, 3);
      const onChainTop3 = winningRatTokenIds.slice(0, 3);

      const resultsMatch = calculatedTop3.every((id: string, i: number) => 
        id === onChainTop3[i]
      );

      if (!resultsMatch) {
        log.error('[VERIFY] Results mismatch detected', {
          calculated: calculatedTop3,
          onChain: onChainTop3,
        });
      } else {
        log.info('[VERIFY] Results verified - match calculation', {
          calculated: calculatedTop3,
          onChain: onChainTop3,
        });
      }
    }

    // 5. UPDATE race with settlement info
    log.info('Updating race with settlement data', { raceId });
    
    logger.logDbOperation('UPDATE', 'races', { raceId, update: 'settlement' });

    await db.collection('races').updateOne(
      { id: raceId },
      {
        $set: {
          status: 'completed',
          settled: true,
          settlementTx: payload.transaction.hash,
          settlementBlock: payload.transaction.blockNumber,
          onChainWinners: winningRatTokenIds,
          onChainPrizes: prizes,
          completedAt: new Date().toISOString(),
        }
      }
    );

    log.info('Race updated with settlement', { raceId });

    // 6. UPDATE rat stats for all participants
    log.info('Updating rat stats', { ratCount: winningRatTokenIds.length });

    for (let i = 0; i < winningRatTokenIds.length; i++) {
      const tokenId = winningRatTokenIds[i];
      const ratId = `rat_${Date.now()}_${tokenId}`; // Match ID pattern from mint
      
      try {
        // Find rat by tokenId (since we don't have the exact ratId)
        const rat = await db.collection('rats').findOne({ 
          owner: getAddress(winners[i]) 
        });

        if (!rat) {
          log.warn('Rat not found for stats update', { tokenId, owner: winners[i] });
          continue;
        }

        // Update stats based on position
        const update: any = {};
        if (i === 0) {
          update.wins = (rat.wins || 0) + 1;
          log.info('Updating winner stats', { ratId: rat.id, tokenId });
        } else if (i === 1 || i === 2) {
          update.placed = (rat.placed || 0) + 1;
          log.info('Updating placed stats', { ratId: rat.id, tokenId, position: i + 1 });
        } else {
          update.losses = (rat.losses || 0) + 1;
          log.info('Updating loss stats', { ratId: rat.id, tokenId, position: i + 1 });
        }

        // Recalculate level
        const newWins = update.wins || rat.wins || 0;
        const newPlaced = update.placed || rat.placed || 0;
        update.level = Math.floor(newWins / 10) + Math.floor(newPlaced / 20) + 1;

        logger.logDbOperation('UPDATE', 'rats', { ratId: rat.id, update });

        await db.collection('rats').updateOne(
          { id: rat.id },
          { $set: update }
        );

        log.info('Rat stats updated', {
          ratId: rat.id,
          wins: update.wins || rat.wins,
          placed: update.placed || rat.placed,
          losses: update.losses || rat.losses,
          level: update.level,
        });
      } catch (error: any) {
        log.error('Failed to update rat stats', error, { tokenId });
      }
    }

    // 7. UPDATE wallet stats for winner
    try {
      const winnerAddress = getAddress(winners[0]);
      
      log.info('Updating winner wallet stats', { winner: winnerAddress });
      
      await WalletsService.updateWalletStats(winnerAddress, true);
      
      log.info('Winner wallet stats updated', { winner: winnerAddress });
    } catch (error: any) {
      log.error('Failed to update wallet stats', error);
    }

    // 8. SUCCESS response
    const duration = Date.now() - startTime;
    logger.logApiExit('race-finished', requestId, true, duration);

    return NextResponse.json({
      success: true,
      raceId,
      settled: true,
      message: 'Race settlement confirmed and stats updated',
      prizes: prizes.map((prize, i) => ({
        position: i + 1,
        winner: winners[i],
        ratTokenId: winningRatTokenIds[i],
        prize,
      })),
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.logApiExit('race-finished', requestId, false, duration);
    
    log.error('Failed to process race settlement', error, {
      errorType: error.constructor.name,
      errorMessage: error.message,
    });

    return NextResponse.json(
      {
        error: 'Failed to process race settlement',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

