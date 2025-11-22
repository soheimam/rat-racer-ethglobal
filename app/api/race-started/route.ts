/**
 * API Route: /api/race-started
 * 
 * Triggered by: RaceStarted event from RaceManager contract
 * Purpose: Mark race as started in MongoDB, initiate simulation
 */

import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { RaceStartedPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

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

    log.info('Processing race started event', {
      raceId: payload.parameters.raceId,
      startedBy: payload.parameters.startedBy,
      txHash: payload.transaction_hash,
    });

    if (payload.event_name !== 'RaceStarted') {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

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

