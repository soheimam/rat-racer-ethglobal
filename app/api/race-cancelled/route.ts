/**
 * API Route: /api/race-cancelled
 * 
 * Triggered by: RaceCancelled event from RaceManager contract
 * Purpose: Update race status to cancelled in MongoDB
 */

import { RacesService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ContractEvent, RaceCancelledPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('race-cancelled', req);

    const log = logger.child({ requestId, route: '/api/race-cancelled' });

    try {
        // Get raw body for signature verification
        const rawBody = await getRawBody(req);

        // Get signature header
        const signature = req.headers.get('x-hook0-signature');

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
        req.headers.forEach((value, key) => {
            headersObj[key] = value;
        });

        const isValid = verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET, headersObj);

        if (!isValid) {
            log.error('Invalid webhook signature - rejected');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Parse JSON only after verification
        const payload: RaceCancelledPayload = JSON.parse(rawBody);

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        log.info('Received webhook payload', { payload });

        // Validate event type - return 200 OK if it's not the expected event (graceful skip)
        if (payload.event_name !== ContractEvent.RACE_CANCELLED) {
            log.info('[SKIP] Event not for this route - returning 200 OK', {
                received: payload.event_name,
                expected: ContractEvent.RACE_CANCELLED,
                txHash: payload.transaction_hash,
                action: 'Skipped gracefully, no error'
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                message: `This endpoint handles ${ContractEvent.RACE_CANCELLED} events only. Received: ${payload.event_name}. No error - gracefully skipped.`,
            }, { status: 200 });
        }

        const { raceId, cancelledBy } = payload.parameters;

        log.info('Processing race cancelled event', {
            raceId,
            cancelledBy,
            txHash: payload.transaction_hash,
        });

        // Update race status to cancelled in MongoDB
        const race = await RacesService.updateRaceStatus(Number(raceId), 'cancelled');

        log.info('Race cancelled in MongoDB', {
            raceId: race.raceId,
            status: race.status,
            cancelledBy: getAddress(cancelledBy),
        });

        const duration = Date.now() - startTime;
        logger.logApiExit('race-cancelled', requestId, true, duration);

        return NextResponse.json({
            success: true,
            raceId: race.raceId,
            race: {
                id: race.id,
                status: race.status,
                cancelledBy: getAddress(cancelledBy),
            },
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiExit('race-cancelled', requestId, false, duration);

        log.error('Failed to process race cancelled event', error, {
            errorMessage: error.message,
        });

        return NextResponse.json(
            { error: 'Failed to process race cancelled', message: error.message },
            { status: 500 }
        );
    }
}

