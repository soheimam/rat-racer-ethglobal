/**
 * API Route: /api/rat-mint
 * 
 * Triggered by: RatMinted event from RatNFT contract
 * Purpose: Generate random metadata, upload to Vercel Blob, store in MongoDB
 */

import { RatsService, WalletsService } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
    calculateRarityScore,
    generateRatMetadata,
    type RatMetadata
} from '@/lib/metadata-generator';
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';

const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_BASE_URL = process.env.BLOB_BASE_URL;
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL;

interface WebhookPayload {
    event: {
        name: string;
        args: {
            to: string;
            tokenId: string;
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
    const requestId = logger.logApiEntry('rat-mint', request);

    const log = logger.child({ requestId, route: '/api/rat-mint' });

    try {
        const payload: WebhookPayload = await request.json();

        logger.logWebhookPayload('RatMinted', payload);

        log.info('Processing rat mint event', {
            event: payload.event.name,
            tokenId: payload.event.args.tokenId,
            owner: payload.event.args.to,
            txHash: payload.transaction.hash,
        });

        if (!payload.event || payload.event.name !== 'RatMinted') {
            log.warn('Invalid event type');
            return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
        }

        const { to: owner, tokenId } = payload.event.args;
        const ownerAddress = getAddress(owner);

        // Generate random metadata
        const metadata: RatMetadata = generateRatMetadata(Number(tokenId), ownerAddress);
        const rarityScore = calculateRarityScore(metadata);

        log.info('Generated rat metadata', {
            tokenId,
            name: metadata.name,
            color: metadata.properties.color,
            modelIndex: metadata.properties.modelIndex,
            bloodline: metadata.properties.stats.bloodline,
            imageUrl: metadata.image,
            rarityScore,
        });

        // Upload to Vercel Blob
        let metadataUrl = '';
        if (BLOB_READ_WRITE_TOKEN) {
            const blob = await put(`rats/metadata/${tokenId}.json`, JSON.stringify(metadata), {
                access: 'public',
                token: BLOB_READ_WRITE_TOKEN,
            });
            metadataUrl = blob.url;
            log.info('Uploaded metadata to Blob Storage', {
                url: metadataUrl,
                expectedContractURI: BLOB_BASE_URL ? `${BLOB_BASE_URL}/${tokenId}.json` : 'N/A',
            });
        } else {
            log.warn('BLOB_READ_WRITE_TOKEN not set, skipping blob upload');
        }

        // Store in MongoDB
        const rat = await RatsService.createRat(ownerAddress, {
            name: metadata.name,
            modelIndex: metadata.properties.modelIndex,
            textureType: 'baseColor',
            imageUrl: metadataUrl || '',
            stats: {
                stamina: metadata.properties.stats.stamina,
                agility: metadata.properties.stats.agility,
                bloodline: metadata.properties.stats.bloodline,
            },
            speeds: metadata.properties.speeds,
            gender: metadata.properties.gender,
            dob: metadata.properties.dob,
            wins: 0,
            placed: 0,
            losses: 0,
            level: 1,
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
                rarityScore,
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

