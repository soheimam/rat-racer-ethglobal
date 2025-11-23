/**
 * API Route: /api/race-finished
 * 
 * Triggered by: RaceFinished event from RaceManager contract
 * Purpose: Update final race stats in MongoDB
 */

import { RatsService, WalletsService } from '@/lib/db';
import { getDb } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { ContractEvent, RaceFinishedPayload } from '@/lib/types/webhook';
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

        // Validate event type - return 200 if it's not the expected event
        if (payload.event_name !== ContractEvent.RACE_FINISHED) {
            log.info('Received unexpected event type, ignoring gracefully', {
                received: payload.event_name,
                expected: ContractEvent.RACE_FINISHED,
                txHash: payload.transaction_hash,
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                message: `This endpoint handles ${ContractEvent.RACE_FINISHED} events only. Received: ${payload.event_name}`,
            }, { status: 200 });
        }

        log.info('Processing race finished event', {
            raceId: payload.parameters.raceId,
            winners: payload.parameters.winners,
            txHash: payload.transaction_hash,
        });

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

        // Update rat stats and award XP
        const raceResults: any[] = [];

        for (let i = 0; i < winningRatTokenIds.length; i++) {
            const tokenId = Number(winningRatTokenIds[i]);
            const position = i + 1; // 1-6

            try {
                const rat = await db.collection('rats').findOne({
                    tokenId: tokenId,
                    owner: getAddress(winners[i])
                });

                if (!rat) {
                    log.warn('Rat not found for stats update', { tokenId, owner: winners[i] });
                    continue;
                }

                // Update wins/placed/losses count
                const statsUpdate: any = {};
                if (position === 1) {
                    statsUpdate.wins = (rat.wins || 0) + 1;
                } else if (position === 2 || position === 3) {
                    statsUpdate.placed = (rat.placed || 0) + 1;
                } else {
                    statsUpdate.losses = (rat.losses || 0) + 1;
                }

                // Award XP and update level using the XP system
                const xpResult = await RatsService.awardRaceXP(tokenId, position);

                // Combine stats update with XP update (XP/level already set by awardRaceXP)
                await db.collection('rats').updateOne(
                    { id: rat.id },
                    { $set: statsUpdate }
                );

                const resultInfo = {
                    ratId: rat.id,
                    tokenId,
                    position,
                    xpGained: xpResult.xpGained,
                    newXP: xpResult.newXP,
                    oldLevel: xpResult.oldLevel,
                    newLevel: xpResult.newLevel,
                    leveledUp: xpResult.leveledUp,
                };

                raceResults.push(resultInfo);

                log.info('Updated rat stats and awarded XP', resultInfo);

                // Log level up events separately for visibility
                if (xpResult.leveledUp) {
                    log.info('RAT LEVELED UP!', {
                        ratId: rat.id,
                        ratName: rat.name,
                        oldLevel: xpResult.oldLevel,
                        newLevel: xpResult.newLevel,
                        position,
                    });
                }
            } catch (error: any) {
                log.error('Failed to update rat stats', error, { tokenId, position });
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
            raceResults, // Include XP gains and level ups
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

