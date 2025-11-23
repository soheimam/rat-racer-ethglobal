/**
 * API Route: /api/rat-transfer
 * 
 * Triggered by: Transfer event from RatNFT contract
 * Purpose: Update rat ownership in MongoDB when transferred between wallets
 * 
 * IMPORTANT: This endpoint ONLY processes person-to-person transfers where:
 * - from ≠ address(0) (not a mint)
 * - to ≠ address(0) (not a burn)
 * 
 * Mint events (from = 0x0) are handled by /api/rat-mint
 * Burn events (to = 0x0) are skipped/logged only
 * 
 * Critical: Keeps game state synchronized with on-chain ownership
 */

import { RatsService, WalletsService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ContractEvent, TransferPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress, zeroAddress } from 'viem';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('rat-transfer', request);

    const log = logger.child({ requestId, route: '/api/rat-transfer' });

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
        const payload: TransferPayload = JSON.parse(rawBody);

        // Log full payload for debugging
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        logger.logWebhookPayload('Transfer', payload);

        // Validate event type - return 200 if it's not the expected event
        if (!payload.event_name || payload.event_name !== ContractEvent.TRANSFER) {
            log.info('Received unexpected event type, ignoring gracefully', {
                received: payload.event_name,
                expected: ContractEvent.TRANSFER,
                txHash: payload.transaction_hash,
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                message: `This endpoint handles ${ContractEvent.TRANSFER} events only. Received: ${payload.event_name}`,
            }, { status: 200 });
        }

        log.info('Processing transfer event', {
            event: payload.event_name,
            from: payload.parameters.from,
            to: payload.parameters.to,
            tokenId: payload.parameters.tokenId,
            txHash: payload.transaction_hash,
        });

        const { from, to, tokenId } = payload.parameters;

        // Normalize addresses (both checksummed for consistency)
        const fromAddress = from.toLowerCase() === zeroAddress.toLowerCase() ? zeroAddress : getAddress(from);
        const toAddress = to.toLowerCase() === zeroAddress.toLowerCase() ? zeroAddress : getAddress(to);
        const tokenIdNum = Number(tokenId);

        // CRITICAL: Skip if this is a mint (from = address(0))
        // Mints are ONLY handled by /api/rat-mint endpoint
        // This endpoint ONLY processes transfers between two non-zero addresses
        if (fromAddress.toLowerCase() === zeroAddress.toLowerCase()) {
            log.info('Skipping mint transfer - not a person-to-person transfer', {
                tokenId,
                from: fromAddress,
                to: toAddress,
                reason: 'from = 0x0 (mint event, handled by rat-mint)'
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'Mint transfers (from = 0x0) handled by rat-mint endpoint',
                transferType: 'mint',
            });
        }

        // Skip if this is a burn (to = address(0))
        if (toAddress.toLowerCase() === zeroAddress.toLowerCase()) {
            log.warn('Skipping burn transfer - rat removed from circulation', {
                tokenId,
                from: fromAddress,
                to: toAddress,
                reason: 'to = 0x0 (burn event)',
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                reason: 'Burn transfers (to = 0x0) not tracked',
                transferType: 'burn',
            });
        }

        // If we reach here, both from and to are non-zero addresses
        // This is a legitimate person-to-person transfer
        log.info('Processing person-to-person transfer', {
            tokenId,
            from: fromAddress,
            to: toAddress,
        });

        // Get the rat from MongoDB
        const rat = await RatsService.getRatByTokenId(tokenIdNum);

        if (!rat) {
            log.error(`Rat not found in database: tokenId=${tokenIdNum}, from=${fromAddress}, to=${toAddress}`);
            return NextResponse.json(
                { error: 'Rat not found in database', message: `Token ID ${tokenIdNum} not found` },
                { status: 404 }
            );
        }

        log.info('Found rat in database', {
            ratId: rat.id,
            currentOwner: rat.owner,
            newOwner: toAddress,
            tokenId: tokenIdNum,
        });

        // Verify the 'from' address matches current owner (data integrity check)
        if (rat.owner.toLowerCase() !== fromAddress) {
            log.warn('Owner mismatch detected', {
                tokenId: tokenIdNum,
                dbOwner: rat.owner,
                txFrom: fromAddress,
                txTo: toAddress,
            });
            // Continue anyway - blockchain is source of truth
        }

        // Update ownership in MongoDB
        await RatsService.transferRat(rat.id, toAddress);

        log.info('Updated rat ownership', {
            ratId: rat.id,
            tokenId: tokenIdNum,
            from: fromAddress,
            to: toAddress,
        });

        // Ensure new owner wallet exists
        await WalletsService.getOrCreateWallet(toAddress);

        const duration = Date.now() - startTime;
        logger.logApiExit('rat-transfer', requestId, true, duration);

        return NextResponse.json({
            success: true,
            tokenId: tokenIdNum,
            transfer: {
                from: fromAddress,
                to: toAddress,
                ratId: rat.id,
                ratName: rat.name,
            },
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiExit('rat-transfer', requestId, false, duration);

        log.error('Failed to process transfer', error, {
            errorMessage: error.message,
        });

        return NextResponse.json(
            { error: 'Failed to process transfer', message: error.message },
            { status: 500 }
        );
    }
}

