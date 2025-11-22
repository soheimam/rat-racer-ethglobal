/**
 * API Route: /api/race-finished
 * 
 * Triggered by: RaceFinished event from RaceManager contract
 * Purpose: Update final race stats in MongoDB
 */

import { WalletsService } from '@/lib/db';
import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { RaceFinishedPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('race-finished', request);

    const log = logger.child({ requestId, route: '/api/race-finished' });

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
        const payload: RaceFinishedPayload = JSON.parse(rawBody);

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        logger.logWebhookPayload('RaceFinished', payload);

        log.info('Processing race finished event', {
            raceId: payload.parameters.raceId,
            winners: payload.parameters.winners,
            txHash: payload.transaction_hash,
        });

        if (payload.event_name !== 'RaceFinished') {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const { raceId, winningRatTokenIds, winners, prizes } = payload.parameters;

        // Update race in MongoDB
        const db = await getDb();
        await db.collection('races').updateOne(
            { id: raceId },
            {
                $set: {
                    status: 'completed',
                    settled: true,
                    settlementTx: payload.transaction_hash,
                    onChainWinners: winningRatTokenIds,
                    onChainPrizes: prizes,
                    completedAt: new Date().toISOString(),
                }
            }
        );

        log.info('Updated race in MongoDB', { raceId });

        // Update rat stats
        for (let i = 0; i < winningRatTokenIds.length; i++) {
            const tokenId = Number(winningRatTokenIds[i]);

            try {
                const rat = await db.collection('rats').findOne({
                    tokenId: tokenId,
                    owner: getAddress(winners[i])
                });

                if (!rat) {
                    log.warn('Rat not found for stats update', { tokenId, owner: winners[i] });
                    continue;
                }

                const update: any = {};
                if (i === 0) {
                    update.wins = (rat.wins || 0) + 1;
                } else if (i === 1 || i === 2) {
                    update.placed = (rat.placed || 0) + 1;
                } else {
                    update.losses = (rat.losses || 0) + 1;
                }

                update.level = Math.floor((update.wins || rat.wins || 0) / 10) +
                    Math.floor((update.placed || rat.placed || 0) / 20) + 1;

                await db.collection('rats').updateOne(
                    { id: rat.id },
                    { $set: update }
                );

                log.info('Updated rat stats', { ratId: rat.id, position: i + 1 });
            } catch (error: any) {
                log.error('Failed to update rat stats', error, { tokenId });
            }
        }

        // Update winner wallet stats
        try {
            const winnerAddress = getAddress(winners[0]);
            await WalletsService.updateWalletStats(winnerAddress, true);
            log.info('Updated winner wallet stats', { winner: winnerAddress });
        } catch (error: any) {
            log.error('Failed to update wallet stats', error);
        }

        const duration = Date.now() - startTime;
        logger.logApiExit('race-finished', requestId, true, duration);

        return NextResponse.json({
            success: true,
            raceId,
            message: 'Race settlement confirmed',
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

        log.error('Failed to process race finished', error, {
            errorMessage: error.message,
        });

        return NextResponse.json(
            { error: 'Failed to process race finished', message: error.message },
            { status: 500 }
        );
    }
}

