/**
 * API Route: /api/race-started
 * 
 * Triggered by: RaceStarted event from RaceManager contract
 * Purpose: Mark race as started in MongoDB, initiate simulation
 */

import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logger.logApiEntry('race-started', request);

  const log = logger.child({ requestId, route: '/api/race-started' });

  try {
    const payload: WebhookPayload = await request.json();

    // Log full payload structure for debugging (we don't know exact webhook format yet)
    log.info('RAW WEBHOOK PAYLOAD', {
      fullPayload: JSON.stringify(payload, null, 2)
    });

    logger.logWebhookPayload('RaceStarted', payload);

    log.info('Processing race started event', {
      raceId: payload.event.args.raceId,
      startedBy: payload.event.args.startedBy,
      txHash: payload.transaction.hash,
    });

    if (payload.event.name !== 'RaceStarted') {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const { raceId, startedBy } = payload.event.args;

    // Update race status in MongoDB
    const db = await getDb();
    const result = await db.collection('races').updateOne(
      { id: raceId },
      {
        $set: {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          startedBy: getAddress(startedBy),
          startTx: payload.transaction.hash,
        }
      }
    );

    if (result.matchedCount === 0) {
      log.warn('Race not found in MongoDB', { raceId });
    } else {
      log.info('Updated race status to in_progress', { raceId });
    }

    const duration = Date.now() - startTime;
    logger.logApiExit('race-started', requestId, true, duration);

    return NextResponse.json({
      success: true,
      raceId,
      message: 'Race started successfully',
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

