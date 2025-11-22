/**
 * API Route: /api/rat-mint
 * 
 * Triggered by: RatMinted event from RatNFT contract
 * Purpose: Generate random metadata, upload to Vercel Blob, store in MongoDB
 * 
 * Flow:
 * 1. Webhook catches RatMinted event
 * 2. Validate payload
 * 3. Generate random stats/bloodline/metadata
 * 4. Upload metadata.json to Vercel Blob Storage
 * 5. Store in MongoDB
 * 6. Link to owner's wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAddress } from 'viem';
import { put } from '@vercel/blob';
import { RatsService, WalletsService } from '@/lib/db';
import { logger } from '@/lib/logger';
import { 
  generateRatMetadata, 
  calculateRarityScore,
  type RatMetadata 
} from '@/lib/metadata-generator';

// Blob storage token
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Webhook payload structure (simplified - no on-chain stats)
interface WebhookPayload {
  event: {
    name: string;
    args: {
      to: string;        // owner address
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
  webhookId?: string;
  signature?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = logger.logApiEntry('rat-mint', request);
  
  // Create child logger with request context
  const log = logger.child({ requestId, route: '/api/rat-mint' });

  try {
    // 1. PARSE AND LOG FULL PAYLOAD
    const payload: WebhookPayload = await request.json();
    
    logger.logWebhookPayload('RatMinted', payload);
    
    log.info('Processing rat mint event', {
      event: payload.event.name,
      tokenId: payload.event.args.tokenId,
      owner: payload.event.args.owner,
      txHash: payload.transaction.hash,
      blockNumber: payload.transaction.blockNumber,
    });

    // 2. VALIDATE payload structure
    if (!payload.event || !payload.event.name) {
      log.warn('Invalid payload structure - missing event', { payload });
      return NextResponse.json(
        { error: 'Invalid payload structure' },
        { status: 400 }
      );
    }

    if (payload.event.name !== 'RatMinted') {
      log.warn('Invalid event type', { 
        expected: 'RatMinted', 
        received: payload.event.name 
      });
      return NextResponse.json(
        { error: `Invalid event type: ${payload.event.name}` },
        { status: 400 }
      );
    }

    // 3. VALIDATE chain ID
    const chainId = payload.network.chainId;
    if (chainId !== 8453 && chainId !== 84532) {
      log.warn('Invalid chain ID', { chainId, expected: [8453, 84532] });
      return NextResponse.json(
        { error: `Invalid chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // 4. EXTRACT event data
    const { to: owner, tokenId } = payload.event.args;

    log.info('Extracted event data', {
      owner,
      tokenId,
    });

    // 5. GENERATE random metadata (stats, bloodline, etc.)
    log.info('[GENERATOR] Generating random metadata', { tokenId });
    
    const metadata: RatMetadata = generateRatMetadata(
      Number(tokenId),
      owner
    );

    const rarityScore = calculateRarityScore(metadata);

    log.info('[GENERATOR] Metadata generated', {
      tokenId,
      bloodline: metadata.properties.stats.bloodline,
      stats: metadata.properties.stats,
      rarityScore,
    });

    // 6. UPLOAD metadata.json to Vercel Blob Storage
    log.info('[BLOB] Uploading metadata to Vercel Blob Storage', { tokenId });

    if (!BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    const metadataJson = JSON.stringify(metadata, null, 2);
    const blobPath = `rats/metadata/${tokenId}.json`;

    const blob = await put(blobPath, metadataJson, {
      access: 'public',
      contentType: 'application/json',
      token: BLOB_READ_WRITE_TOKEN,
    });

    log.info('[BLOB] Metadata uploaded successfully', {
      tokenId,
      url: blob.url,
      size: metadataJson.length,
    });

    logger.logDbOperation('BLOB_UPLOAD', 'metadata', {
      tokenId,
      url: blob.url,
    });

    // 7. PREPARE rat data for MongoDB
    const ratData = {
      name: metadata.name,
      modelIndex: metadata.properties.modelIndex,
      textureType: 'baseColor' as const,
      imageUrl: metadata.image,
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
      metadataUrl: blob.url,
      rarityScore,
    };

    log.info('Prepared rat data for MongoDB', { ratData });

    // 8. STORE rat in MongoDB
    logger.logDbOperation('INSERT', 'rats', { tokenId, owner });
    
    const rat = await RatsService.createRat(getAddress(owner), ratData);

    log.info('Successfully stored rat in MongoDB', {
      ratId: rat.id,
      tokenId,
      owner: rat.owner,
      name: rat.name,
    });

    // 9. ENSURE wallet exists
    await WalletsService.getOrCreateWallet(getAddress(owner));
    
    log.info('Wallet ensured in MongoDB', { owner: getAddress(owner) });

    // 10. SUCCESS response
    const duration = Date.now() - startTime;
    logger.logApiExit('rat-mint', requestId, true, duration);

    return NextResponse.json({
      success: true,
      ratId: rat.id,
      tokenId,
      owner: rat.owner,
      message: 'Rat minted and stored successfully',
      metadata: {
        url: blob.url,
        bloodline: rat.stats.bloodline,
        stats: rat.stats,
        rarityScore,
      },
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.logApiExit('rat-mint', requestId, false, duration);
    
    log.error('Failed to process rat mint', error, {
      errorType: error.constructor.name,
      errorMessage: error.message,
    });

    return NextResponse.json(
      {
        error: 'Failed to process rat mint',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

