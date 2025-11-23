import { generateId, getDb } from './client';
import { Rat } from './types';

export class RatsService {
    /**
     * Create a new rat (minting)
     */
    static async createRat(owner: string, ratData: Omit<Rat, 'id' | 'owner' | 'createdAt' | '_id'>): Promise<Rat> {
        const db = await getDb();

        const rat: Rat = {
            id: generateId('rat'),
            owner,
            ...ratData,
            createdAt: new Date().toISOString(),
        };

        await db.collection('rats').insertOne(rat as any);

        return rat;
    }

    /**
     * Get a rat by ID
     */
    static async getRat(ratId: string): Promise<Rat | null> {
        const db = await getDb();
        const rat = await db.collection('rats').findOne<Rat>({ id: ratId });
        return rat;
    }

    /**
     * Get a rat by token ID (from contract)
     */
    static async getRatByTokenId(tokenId: number): Promise<Rat | null> {
        const db = await getDb();
        const rat = await db.collection('rats').findOne<Rat>({ tokenId });
        return rat;
    }

    /**
     * Get all rats owned by a wallet
     */
    static async getRatsByOwner(owner: string): Promise<Rat[]> {
        const db = await getDb();
        const rats = await db.collection('rats')
            .find<Rat>({ owner })
            .sort({ createdAt: -1 })
            .toArray();

        return rats;
    }

    /**
     * Update rat stats after a race
     */
    static async updateRatStats(
        ratId: string,
        update: { wins?: number; placed?: number; losses?: number }
    ): Promise<void> {
        const db = await getDb();
        const rat = await this.getRat(ratId);
        if (!rat) throw new Error('Rat not found');

        const newWins = rat.wins + (update.wins || 0);
        const newPlaced = rat.placed + (update.placed || 0);
        const newLosses = rat.losses + (update.losses || 0);

        // Recalculate level
        const newLevel = this.calculateLevel(newWins, newPlaced, rat.dob);

        await db.collection('rats').updateOne(
            { id: ratId },
            {
                $set: {
                    wins: newWins,
                    placed: newPlaced,
                    losses: newLosses,
                    level: newLevel,
                }
            }
        );
    }

    /**
     * Transfer rat ownership
     */
    static async transferRat(ratId: string, newOwner: string): Promise<void> {
        const db = await getDb();
        const rat = await this.getRat(ratId);
        if (!rat) throw new Error('Rat not found');

        await db.collection('rats').updateOne(
            { id: ratId },
            { $set: { owner: newOwner } }
        );
    }

    /**
     * Increment breeding count (FUTURE: For breeding feature)
     * Called when a rat is used as a parent for breeding
     */
    static async incrementBreedingCount(tokenId: number): Promise<void> {
        const db = await getDb();
        const rat = await this.getRatByTokenId(tokenId);
        if (!rat) throw new Error('Rat not found');

        await db.collection('rats').updateOne(
            { tokenId },
            {
                $inc: { breedingCount: 1 },
                $setOnInsert: { breedingCount: 1 } // Initialize if not exists
            }
        );
    }

    /**
     * Get breeding eligibility (FUTURE: For breeding feature)
     * Determines if a rat can be bred based on cooldown/limits
     */
    static async canBreed(tokenId: number): Promise<{ eligible: boolean; reason?: string }> {
        const rat = await this.getRatByTokenId(tokenId);
        if (!rat) {
            return { eligible: false, reason: 'Rat not found' };
        }

        // Future breeding rules:
        // - Minimum level requirement (e.g., level 2+)
        // - Maximum breeding count per rat (e.g., 5 max)
        // - Cooldown period between breeding (e.g., 7 days)

        const maxBreedings = 5;
        const currentBreedings = rat.breedingCount || 0;

        if (currentBreedings >= maxBreedings) {
            return { eligible: false, reason: `Max breedings reached (${maxBreedings})` };
        }

        if (rat.level < 2) {
            return { eligible: false, reason: 'Rat must be level 2 or higher' };
        }

        return { eligible: true };
    }

    /**
     * Calculate XP required for a specific level (1-100)
     * Exponential curve: early levels fast, later levels slow
     * Formula: base * (level^1.8)
     * 
     * Approximate progression:
     * - Level 1-10: ~1-5 races each
     * - Level 10-50: ~5-20 races each
     * - Level 50-100: ~20-100 races each
     * 
     * Total races to max level: ~4,000-5,000 races over many months
     */
    static getXPRequiredForLevel(level: number): number {
        if (level < 1) return 0;
        if (level === 1) return 0; // Level 1 starts at 0 XP

        const baseXP = 100; // Base XP per level
        const exponent = 1.8; // Exponential curve factor

        // Calculate cumulative XP needed to reach this level
        let totalXP = 0;
        for (let i = 2; i <= level; i++) {
            totalXP += Math.floor(baseXP * Math.pow(i, exponent));
        }

        return totalXP;
    }

    /**
     * Calculate level from current XP
     */
    static calculateLevelFromXP(currentXP: number): number {
        if (currentXP < 0) return 1;

        // Find the highest level where required XP <= currentXP
        for (let level = 100; level >= 1; level--) {
            const requiredXP = this.getXPRequiredForLevel(level);
            if (currentXP >= requiredXP) {
                return level;
            }
        }

        return 1;
    }

    /**
     * Calculate XP reward based on race position
     * Position 1 (winner) gets most XP, scales down to position 6
     * 
     * XP Rewards:
     * - 1st: 100 XP (base)
     * - 2nd: 75 XP
     * - 3rd: 60 XP
     * - 4th: 45 XP
     * - 5th: 35 XP
     * - 6th: 25 XP
     * 
     * This ensures all participants get XP, but winning is significantly rewarded
     */
    static calculateXPReward(position: number): number {
        const xpTable: Record<number, number> = {
            1: 100, // 1st place
            2: 75,  // 2nd place
            3: 60,  // 3rd place
            4: 45,  // 4th place
            5: 35,  // 5th place
            6: 25,  // 6th place
        };

        return xpTable[position] || 0;
    }

    /**
     * Award XP and update level based on race performance
     * Called after race completion
     */
    static async awardRaceXP(tokenId: number, position: number): Promise<{
        xpGained: number;
        newXP: number;
        oldLevel: number;
        newLevel: number;
        leveledUp: boolean;
    }> {
        const db = await getDb();
        const rat = await this.getRatByTokenId(tokenId);

        if (!rat) {
            throw new Error(`Rat with tokenId ${tokenId} not found`);
        }

        // Calculate XP reward
        const xpGained = this.calculateXPReward(position);
        const oldXP = rat.xp || 0;
        const newXP = oldXP + xpGained;

        // Calculate old and new levels
        const oldLevel = rat.level || 1;
        const newLevel = this.calculateLevelFromXP(newXP);
        const leveledUp = newLevel > oldLevel;

        // Update rat in database
        await db.collection('rats').updateOne(
            { tokenId },
            {
                $set: {
                    xp: newXP,
                    level: newLevel,
                }
            }
        );

        return {
            xpGained,
            newXP,
            oldLevel,
            newLevel,
            leveledUp,
        };
    }

    /**
     * Get XP progress info for a rat
     */
    static getXPProgress(currentXP: number, currentLevel: number): {
        currentLevel: number;
        currentXP: number;
        xpForCurrentLevel: number;
        xpForNextLevel: number;
        xpProgress: number;
        xpNeeded: number;
        percentToNextLevel: number;
    } {
        const xpForCurrentLevel = this.getXPRequiredForLevel(currentLevel);
        const xpForNextLevel = this.getXPRequiredForLevel(currentLevel + 1);
        const xpProgress = currentXP - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - currentXP;
        const xpInThisLevel = xpForNextLevel - xpForCurrentLevel;
        const percentToNextLevel = Math.min(100, Math.max(0, (xpProgress / xpInThisLevel) * 100));

        return {
            currentLevel,
            currentXP,
            xpForCurrentLevel,
            xpForNextLevel,
            xpProgress,
            xpNeeded,
            percentToNextLevel,
        };
    }

    /**
     * Calculate rat level based on performance (DEPRECATED - use XP system)
     * Kept for backward compatibility
     */
    private static calculateLevel(wins: number, placed: number, dob: string): number {
        const age = this.calculateAge(dob);
        const winPoints = Math.floor(wins / 10);
        const placePoints = Math.floor(placed / 20);
        const ageBonus = Math.floor(age / 2);
        return winPoints + placePoints + ageBonus + 1;
    }

    /**
     * Calculate rat age in days
     */
    private static calculateAge(dob: string): number {
        const now = new Date();
        const birthDate = new Date(dob);
        const diffTime = Math.abs(now.getTime() - birthDate.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Generate random rat stats for minting (DEPRECATED - use metadata-generator)
     * Kept for backward compatibility
     */
    static generateRandomStats(): Pick<Rat, 'stats' | 'speeds'> {
        return {
            stats: {
                stamina: Math.floor(Math.random() * 50) + 50, // 50-100
                agility: Math.floor(Math.random() * 50) + 50, // 50-100
                speed: Math.floor(Math.random() * 50) + 50, // 50-100
                bloodline: this.randomBloodline(),
            },
            speeds: Array(5).fill(0).map(() =>
                0.7 + Math.random() * 0.3 // 0.7 to 1.0
            ),
        };
    }

    private static randomBloodline(): string {
        const bloodlines = [
            "Street Runner",
            "Alley Cat",
            "Speed Demon",
            "Sewer Dweller",
            "Underground Elite",
            "City Slicker",
            "Neon Racer",
            "Urban Legend"
        ];
        return bloodlines[Math.floor(Math.random() * bloodlines.length)];
    }
}

