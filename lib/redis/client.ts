import { kv } from '@vercel/kv';

// Redis client wrapper with helper methods
export class RedisClient {
    // Key prefixes for organization
    private static readonly PREFIXES = {
        RAT: 'rat:',
        RACE: 'race:',
        WALLET: 'wallet:',
        ACTIVE_RACES: 'races:active',
        COMPLETED_RACES: 'races:completed',
    };

    // Generate keys
    static keys = {
        rat: (id: string) => `${RedisClient.PREFIXES.RAT}${id}`,
        race: (id: string) => `${RedisClient.PREFIXES.RACE}${id}`,
        wallet: (address: string) => `${RedisClient.PREFIXES.WALLET}${address}`,
        activeRaces: () => RedisClient.PREFIXES.ACTIVE_RACES,
        completedRaces: () => RedisClient.PREFIXES.COMPLETED_RACES,
        walletRats: (address: string) => `${RedisClient.PREFIXES.WALLET}${address}:rats`,
    };

    // Get the KV instance
    static get kv() {
        return kv;
    }

    // Helper: Generate unique ID
    static generateId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Helper: Check if key exists
    static async exists(key: string): Promise<boolean> {
        const result = await kv.exists(key);
        return result === 1;
    }
}

export { kv };

