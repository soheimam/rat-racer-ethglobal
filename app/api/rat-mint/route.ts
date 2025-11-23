/**
 * API Route: /api/rat-mint
 * 
 * Triggered by: RatMinted event from RatNFT contract (Transfer from 0x0)
 * Purpose: Generate random metadata, upload to Vercel Blob, store in MongoDB
 * 
 * Image Index Mapping: 0=brown, 1=pink, 2=white
 */

import { RatsService, WalletsService } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
    generateRatMetadata,
    type RatMetadata
} from '@/lib/metadata-generator';
import { ContractEvent, RatMintedPayload } from '@/lib/types/webhook';
import { getRawBody, verifyWebhookSignature } from '@/lib/webhook-verify';
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_BASE_URL = process.env.BLOB_BASE_URL;
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Image index to color mapping (matches metadata-generator.ts)
const RAT_COLORS = ['brown', 'pink', 'white'];

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = logger.logApiEntry('rat-mint', request);

    const log = logger.child({ requestId, route: '/api/rat-mint' });

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
        const payload: RatMintedPayload = JSON.parse(rawBody);

        // Log full payload structure for debugging (we don't know exact webhook format yet)
        log.info('RAW WEBHOOK PAYLOAD', {
            fullPayload: JSON.stringify(payload, null, 2)
        });

        logger.logWebhookPayload('RatMinted', payload);

        // Validate event type - return 200 OK if it's not the expected event (graceful skip)
        if (!payload.event_name || payload.event_name !== ContractEvent.RAT_MINTED) {
            log.info('[SKIP] Event not for this route - returning 200 OK', {
                received: payload.event_name,
                expected: ContractEvent.RAT_MINTED,
                txHash: payload.transaction_hash,
                action: 'Skipped gracefully, no error'
            });
            return NextResponse.json({
                success: true,
                skipped: true,
                message: `This endpoint handles ${ContractEvent.RAT_MINTED} events only. Received: ${payload.event_name}. No error - gracefully skipped.`,
            }, { status: 200 });
        }

        log.info('Processing rat mint event', {
            event: payload.event_name,
            tokenId: payload.parameters.tokenId,
            owner: payload.parameters.to,
            imageIndex: payload.parameters.imageIndex,
            color: RAT_COLORS[Number(payload.parameters.imageIndex)] || 'unknown',
            txHash: payload.transaction_hash,
        });

        const { to: owner, tokenId, imageIndex } = payload.parameters;
        const ownerAddress = getAddress(owner);
        const selectedImageIndex = Number(imageIndex); // 0=brown, 1=pink, 2=white

        // Validate imageIndex
        if (isNaN(selectedImageIndex) || selectedImageIndex < 0 || selectedImageIndex > 2) {
            log.error(`Invalid imageIndex: ${imageIndex}, selectedImageIndex: ${selectedImageIndex}, tokenId: ${tokenId}`);
            return NextResponse.json(
                { error: 'Invalid imageIndex', message: 'imageIndex must be 0 (brown), 1 (pink), or 2 (white)' },
                { status: 400 }
            );
        }

        // Idempotency check: If rat already exists, return success (webhook retry/duplicate)
        try {
            const existingRat = await RatsService.getRatByTokenId(Number(tokenId));
            if (existingRat) {
                log.info('Rat already exists (duplicate webhook), returning existing data', {
                    tokenId,
                    existingRatId: existingRat.id,
                });

                const duration = Date.now() - startTime;
                logger.logApiExit('rat-mint', requestId, true, duration);

                return NextResponse.json({
                    success: true,
                    tokenId,
                    rat: {
                        id: existingRat.id,
                        name: existingRat.name,
                        metadataUrl: existingRat.imageUrl,
                    },
                });
            }
        } catch (error) {
            // Rat doesn't exist, continue with mint
            log.info('Rat does not exist, proceeding with mint', { tokenId });
        }

        // Generate random metadata (imageIndex: 0=brown, 1=pink, 2=white)
        const metadata: RatMetadata = generateRatMetadata(Number(tokenId), ownerAddress, selectedImageIndex);

        log.info('Generated rat metadata', {
            tokenId,
            name: metadata.name,
            color: metadata.properties.color,
            modelIndex: metadata.properties.modelIndex,
            bloodline: metadata.properties.stats.bloodline,
            imageUrl: metadata.image,
            powerRating: metadata.properties.powerRating,
        });

        // Upload to Vercel Blob
        // Using tokenId.json ensures unique filename per NFT (ERC721 standard)
        let metadataUrl = '';
        if (BLOB_READ_WRITE_TOKEN) {
            try {
                const blob = await put(`rats/metadata/${tokenId}.json`, JSON.stringify(metadata), {
                    access: 'public',
                    token: BLOB_READ_WRITE_TOKEN,
                    addRandomSuffix: false, // Keep clean tokenId.json naming (industry standard)
                });
                metadataUrl = blob.url;
                log.info('Uploaded metadata to Blob Storage', {
                    url: metadataUrl,
                    expectedContractURI: BLOB_BASE_URL ? `${BLOB_BASE_URL}/${tokenId}.json` : 'N/A',
                });
            } catch (blobError: any) {
                // If blob already exists, it's likely a webhook retry - log and continue
                if (blobError.message?.includes('already exists')) {
                    log.warn('Blob already exists (webhook retry), using existing blob', {
                        tokenId,
                        expectedUrl: BLOB_BASE_URL ? `${BLOB_BASE_URL}/${tokenId}.json` : 'N/A',
                    });
                    metadataUrl = BLOB_BASE_URL ? `${BLOB_BASE_URL}/${tokenId}.json` : '';
                } else {
                    // Other blob errors should fail
                    throw blobError;
                }
            }
        } else {
            log.warn('BLOB_READ_WRITE_TOKEN not set, skipping blob upload');
        }

        // Store in MongoDB
        const rat = await RatsService.createRat(ownerAddress, {
            tokenId: Number(tokenId),
            name: metadata.name,
            modelIndex: metadata.properties.modelIndex,
            textureType: 'baseColor',
            imageUrl: metadataUrl || '',
            stats: {
                stamina: metadata.properties.stats.stamina,
                agility: metadata.properties.stats.agility,
                speed: metadata.properties.stats.speed,
                bloodline: metadata.properties.stats.bloodline,
            },
            speeds: metadata.properties.speeds,
            gender: metadata.properties.gender,
            dob: metadata.properties.dob,
            wins: 0,
            placed: 0,
            losses: 0,
            level: 1,
            xp: 0,
            // Breeding info (optional, future-proof)
            generation: metadata.properties.breeding?.generation,
            parent1TokenId: metadata.properties.breeding?.parent1TokenId,
            parent2TokenId: metadata.properties.breeding?.parent2TokenId,
            isPurebreed: metadata.properties.breeding?.isPurebreed,
            breedingCount: metadata.properties.breeding?.breedingCount,
            mutations: metadata.properties.breeding?.mutations,
        });

        log.info('Stored rat in MongoDB', { ratId: rat.id });

        // Link to wallet
        await WalletsService.getOrCreateWallet(ownerAddress);

        const duration = Date.now() - startTime;
        logger.logApiExit('rat-mint', requestId, true, duration);

        return NextResponse.json({
            success: true,
            tokenId,
            rat: {
                id: rat.id,
                name: metadata.name,
                bloodline: metadata.properties.stats.bloodline,
                powerRating: metadata.properties.powerRating,
                metadataUrl,
            },
        });

    } catch (error: any) {
        const duration = Date.now() - startTime;
        logger.logApiExit('rat-mint', requestId, false, duration);

        log.error('Failed to process rat mint', error, {
            errorMessage: error.message,
        });

        return NextResponse.json(
            { error: 'Failed to process rat mint', message: error.message },
            { status: 500 }
        );
    }
}

