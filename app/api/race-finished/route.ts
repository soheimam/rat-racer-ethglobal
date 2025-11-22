/**
 * API Route: /api/race-finished
 * 
 * Triggered by: RaceFinished event from RaceManager contract
 * Purpose: Update final race stats in MongoDB
 */

import { WalletsService } from '@/lib/db';
import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

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
        const payload: WebhookPayload = await request.json();

        logger.logWebhookPayload('RaceFinished', payload);

        log.info('Processing race finished event', {
            raceId: payload.event.args.raceId,
            winners: payload.event.args.winners,
            txHash: payload.transaction.hash,
        });

        if (payload.event.name !== 'RaceFinished') {
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const { raceId, winningRatTokenIds, winners, prizes } = payload.event.args;

        // Update race in MongoDB
        const db = await getDb();
        await db.collection('races').updateOne(
            { id: raceId },
            {
                $set: {
                    status: 'completed',
                    settled: true,
                    settlementTx: payload.transaction.hash,
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

