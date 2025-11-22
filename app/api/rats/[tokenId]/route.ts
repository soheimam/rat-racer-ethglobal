/**
 * API Route: Get rat by token ID
 * 
 * Used after minting to fetch the rat's metadata from MongoDB
 */

import { RatsService } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tokenId: string }> }
) {
    try {
        const { tokenId: tokenIdParam } = await params;
        const tokenId = parseInt(tokenIdParam);

        if (isNaN(tokenId)) {
            return NextResponse.json(
                { error: 'Invalid token ID' },
                { status: 400 }
            );
        }

        // Find rat by tokenId
        const rat = await RatsService.getRatByTokenId(tokenId);

        if (!rat) {
            return NextResponse.json(
                { error: 'Rat not found', message: 'Rat may still be processing' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            rat: {
                tokenId: rat.tokenId,
                name: rat.name,
                imageUrl: rat.imageUrl,
                stats: rat.stats,
                speeds: rat.speeds,
                gender: rat.gender,
                rarityScore: calculateRarityScore(rat),
            },
        });
    } catch (error: any) {
        console.error('Failed to fetch rat:', error);
        return NextResponse.json(
            { error: 'Failed to fetch rat', message: error.message },
            { status: 500 }
        );
    }
}

function calculateRarityScore(rat: any): number {
    const bloodlineScores: Record<string, number> = {
        'Speed Demon': 100,
        'Underground Elite': 85,
        'Street Runner': 70,
        'City Slicker': 55,
        'Alley Cat': 40,
        'Sewer Dweller': 25,
    };

    const bloodlineScore = bloodlineScores[rat.stats.bloodline] || 50;
    const statScore = (rat.stats.stamina + rat.stats.agility) / 2;
    const speedScore = rat.speeds.reduce((a: number, b: number) => a + b, 0) / rat.speeds.length;

    return (bloodlineScore + statScore + speedScore) / 3;
}

