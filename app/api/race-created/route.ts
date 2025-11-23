/**
 * API Route: /api/race-created
 * 
 * Triggered by: RaceCreated event from RaceManager contract
 * Purpose: Store new race in MongoDB
 */

import { RacesService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ContractEvent, RaceCreatedPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('race-created', req);

    const log = logger.child({ requestId, route: '/api/race-created' });

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
        const payload: RaceCreatedPayload = JSON.parse(rawBody);

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        log.info('Received webhook payload', { payload });

        // Validate event type - return 200 OK if it's not the expected event (graceful skip)
        if (payload.event_name !== ContractEvent.RACE_CREATED) {
            log.info('[SKIP] Event not for this route - returning 200 OK', {
                received: payload.event_name,
                expected: ContractEvent.RACE_CREATED,
                txHash: payload.transaction_hash,
                action: 'Skipped gracefully, no error'
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                message: `This endpoint handles ${ContractEvent.RACE_CREATED} events only. Received: ${payload.event_name}. No error - gracefully skipped.`,
            }, { status: 200 });
        }

        const { raceId, creator, trackId, entryToken, entryFee } = payload.parameters;

        log.info('Processing race created event', {
            raceId,
            creator,
            trackId,
            entryToken,
            entryFee,
            txHash: payload.transaction_hash,
        });

        // Create race in MongoDB
        const race = await RacesService.createRace({
            raceId: Number(raceId),
            creator: getAddress(creator),
            trackId: Number(trackId),
            entryToken: getAddress(entryToken),
            entryFee: entryFee,
            status: 'pending', // Active status
            participants: [],
            maxParticipants: 6,
            prizePool: '0',
            txHash: payload.transaction_hash,
        });

        log.info('Race created in MongoDB', {
            mongoId: race._id,
            raceId: race.raceId,
        });

        const duration = Date.now() - startTime;
        logger.logApiExit('race-created', requestId, true, duration);

        return NextResponse.json({
            success: true,
            raceId: race.raceId,
            race: {
                id: race.id,
                creator: race.creator,
                status: race.status,
            },
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiExit('race-created', requestId, false, duration);

        log.error('Failed to process race created event', error, {
            errorMessage: error.message,
        });

        return NextResponse.json(
            { error: 'Failed to process race created', message: error.message },
            { status: 500 }
        );
    }
}

