import { RedisClient } from './client';
import { Rat } from './types';

export class RatsService {
    /**
     * Create a new rat (minting)
     */
    static async createRat(owner: string, ratData: Omit<Rat, 'id' | 'owner' | 'createdAt'>): Promise<Rat> {
        const rat: Rat = {
            id: RedisClient.generateId('rat'),
            owner,
            ...ratData,
            createdAt: new Date().toISOString(),
        };

        // Save rat
        await RedisClient.kv.set(RedisClient.keys.rat(rat.id), JSON.stringify(rat));

        // Add to wallet's rats
        await RedisClient.kv.sadd(RedisClient.keys.walletRats(owner), rat.id);

        return rat;
    }

    /**
     * Get a rat by ID
     */
    static async getRat(ratId: string): Promise<Rat | null> {
        const data = await RedisClient.kv.get<string>(RedisClient.keys.rat(ratId));
        if (!data) return null;
        return JSON.parse(data);
    }

    /**
     * Get all rats owned by a wallet
     */
    static async getRatsByOwner(owner: string): Promise<Rat[]> {
        const ratIds = await RedisClient.kv.smembers(RedisClient.keys.walletRats(owner));
        if (!ratIds || ratIds.length === 0) return [];

        const rats = await Promise.all(
            ratIds.map(id => this.getRat(id as string))
        );

        return rats.filter((rat): rat is Rat => rat !== null);
    }

    /**
     * Update rat stats after a race
     */
    static async updateRatStats(
        ratId: string,
        update: { wins?: number; placed?: number; losses?: number }
    ): Promise<void> {
        const rat = await this.getRat(ratId);
        if (!rat) throw new Error('Rat not found');

        if (update.wins !== undefined) rat.wins += update.wins;
        if (update.placed !== undefined) rat.placed += update.placed;
        if (update.losses !== undefined) rat.losses += update.losses;

        // Recalculate level
        rat.level = this.calculateLevel(rat.wins, rat.placed, rat.dob);

        await RedisClient.kv.set(RedisClient.keys.rat(ratId), JSON.stringify(rat));
    }

    /**
     * Transfer rat ownership
     */
    static async transferRat(ratId: string, newOwner: string): Promise<void> {
        const rat = await this.getRat(ratId);
        if (!rat) throw new Error('Rat not found');

        const oldOwner = rat.owner;

        // Remove from old owner
        await RedisClient.kv.srem(RedisClient.keys.walletRats(oldOwner), ratId);

        // Add to new owner
        await RedisClient.kv.sadd(RedisClient.keys.walletRats(newOwner), ratId);

        // Update rat owner
        rat.owner = newOwner;
        await RedisClient.kv.set(RedisClient.keys.rat(ratId), JSON.stringify(rat));
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

