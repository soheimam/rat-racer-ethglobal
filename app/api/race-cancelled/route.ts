/**
 * API Route: /api/race-cancelled
 * 
 * Triggered by: RaceCancelled event from RaceManager contract
 * Purpose: Update race status to cancelled in MongoDB
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
            cancelledBy: string;
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
    const requestId = logger.logApiEntry('race-cancelled', req);

    const log = logger.child({ requestId, route: '/api/race-cancelled' });

    try {
        const payload: WebhookPayload = await req.json();

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        log.info('Received webhook payload', { payload });

        if (payload.event.name !== 'RaceCancelled') {
            log.warn('Invalid event type', { event: payload.event.name });
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const { raceId, cancelledBy } = payload.event.args;

        log.info('Processing race cancelled event', {
            raceId,
            cancelledBy,
            txHash: payload.transaction.hash,
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

