/**
 * API Route: /api/race-created
 * 
 * Triggered by: RaceCreated event from RaceManager contract
 * Purpose: Store new race in MongoDB
 */

import { RacesService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

interface WebhookPayload {
    event: {
        name: string;
        args: {
            raceId: string;
            creator: string;
            trackId: string;
            entryToken: string;
            entryFee: string;
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

export async function POST(req: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('race-created', req);

    const log = logger.child({ requestId, route: '/api/race-created' });

    try {
        const payload: WebhookPayload = await req.json();

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        log.info('Received webhook payload', { payload });

        if (payload.event.name !== 'RaceCreated') {
            log.warn('Invalid event type', { event: payload.event.name });
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const { raceId, creator, trackId, entryToken, entryFee } = payload.event.args;

        log.info('Processing race created event', {
            raceId,
            creator,
            trackId,
            entryToken,
            entryFee,
            txHash: payload.transaction.hash,
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
            txHash: payload.transaction.hash,
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

