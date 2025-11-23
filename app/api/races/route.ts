/**
 * API Route: Get all races
 * 
 * Returns active and completed races
 */

import { RacesService } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const [activeRaces, completedRaces] = await Promise.all([
            RacesService.getActiveRaces(),
            RacesService.getCompletedRaces(10), // Get last 10 completed races
        ]);

        // Enrich races with token information for display
        const enrichedActiveRaces = RacesService.enrichRacesWithTokenInfo(activeRaces);
        const enrichedCompletedRaces = RacesService.enrichRacesWithTokenInfo(completedRaces);

        return NextResponse.json({
            success: true,
            activeRaces: enrichedActiveRaces,
            completedRaces: enrichedCompletedRaces,
        });
    } catch (error: any) {
        console.error('Failed to fetch races:', error);
        return NextResponse.json(
            { error: 'Failed to fetch races', message: error.message },
            { status: 500 }
        );
    }
}

