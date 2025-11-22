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
     * Calculate rat level based on performance
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
     * Generate random rat stats for minting
     */
    static generateRandomStats(): Pick<Rat, 'stats' | 'speeds'> {
        return {
            stats: {
                stamina: Math.floor(Math.random() * 50) + 50, // 50-100
                agility: Math.floor(Math.random() * 50) + 50, // 50-100
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

