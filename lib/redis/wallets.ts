import { RedisClient } from './client';
import { RacesService } from './races';
import { RatsService } from './rats';
import { Wallet } from './types';

export class WalletsService {
    /**
     * Get or create a wallet
     */
    static async getOrCreateWallet(address: string): Promise<Wallet> {
        const existing = await this.getWallet(address);
        if (existing) return existing;

        const wallet: Wallet = {
            address,
            ratIds: [],
            raceHistory: [],
            totalWins: 0,
            totalRaces: 0,
            createdAt: new Date().toISOString(),
        };

        await RedisClient.kv.set(RedisClient.keys.wallet(address), JSON.stringify(wallet));
        return wallet;
    }

    /**
     * Get a wallet by address
     */
    static async getWallet(address: string): Promise<Wallet | null> {
        const data = await RedisClient.kv.get<string>(RedisClient.keys.wallet(address));
        if (!data) return null;
        return JSON.parse(data);
    }

    /**
     * Get wallet with full rat data
     */
    static async getWalletWithRats(address: string) {
        const wallet = await this.getOrCreateWallet(address);
        const rats = await RatsService.getRatsByOwner(address);

        return {
            ...wallet,
            rats,
        };
    }

    /**
     * Get wallet with race history
     */
    static async getWalletWithHistory(address: string) {
        const wallet = await this.getOrCreateWallet(address);
        const races = await RacesService.getRacesByWallet(address);

        return {
            ...wallet,
            races,
        };
    }

    /**
     * Update wallet stats after a race
     */
    static async updateWalletStats(address: string, won: boolean): Promise<void> {
        const wallet = await this.getOrCreateWallet(address);

        wallet.totalRaces += 1;
        if (won) {
            wallet.totalWins += 1;
        }

        await RedisClient.kv.set(RedisClient.keys.wallet(address), JSON.stringify(wallet));
    }

    /**
     * Add race to wallet history
     */
    static async addRaceToHistory(address: string, raceId: string): Promise<void> {
        const wallet = await this.getOrCreateWallet(address);

        if (!wallet.raceHistory.includes(raceId)) {
            wallet.raceHistory.push(raceId);
            await RedisClient.kv.set(RedisClient.keys.wallet(address), JSON.stringify(wallet));
        }
    }
}

