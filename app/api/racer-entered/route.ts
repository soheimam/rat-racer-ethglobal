/**
 * API Route: /api/racer-entered
 * 
 * Triggered by: RacerEntered event from RaceManager contract
 * Purpose: Add participant to race in MongoDB
 */

import { RacesService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ContractEvent, RacerEnteredPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('racer-entered', req);

    const log = logger.child({ requestId, route: '/api/racer-entered' });

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
        const payload: RacerEnteredPayload = JSON.parse(rawBody);

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        log.info('Received webhook payload', { payload });

        // Validate event type - return 200 if it's not the expected event
        if (payload.event_name !== ContractEvent.RACER_ENTERED) {
            log.info('Received unexpected event type, ignoring gracefully', {
                received: payload.event_name,
                expected: ContractEvent.RACER_ENTERED,
                txHash: payload.transaction_hash,
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                message: `This endpoint handles ${ContractEvent.RACER_ENTERED} events only. Received: ${payload.event_name}`,
            }, { status: 200 });
        }

        const { raceId, racer, ratTokenId } = payload.parameters;

        log.info('Processing racer entered event', {
            raceId,
            racer,
            ratTokenId,
            txHash: payload.transaction_hash,
        });

        // Add participant to race in MongoDB
        const race = await RacesService.addParticipant(Number(raceId), {
            address: getAddress(racer),
            ratTokenId: Number(ratTokenId),
            enteredAt: new Date().toISOString(),
        });

        log.info('Participant added to race', {
            raceId: race.raceId,
            participantCount: race.participants.length,
            isFull: race.participants.length === race.maxParticipants,
        });

        // Update status to 'full' if 6 participants
        if (race.participants.length === race.maxParticipants) {
            await RacesService.updateRaceStatus(Number(raceId), 'full');
            log.info('Race is now full', { raceId });
        }

        const duration = Date.now() - startTime;
        logger.logApiExit('racer-entered', requestId, true, duration);

        return NextResponse.json({
            success: true,
            raceId: race.raceId,
            race: {
                id: race.id,
                participantCount: race.participants.length,
                status: race.status,
                isFull: race.participants.length === race.maxParticipants,
            },
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiExit('racer-entered', requestId, false, duration);

        log.error('Failed to process racer entered event', error, {
            errorMessage: error.message,
        });

        return NextResponse.json(
            { error: 'Failed to process racer entered', message: error.message },
            { status: 500 }
        );
    }
}

