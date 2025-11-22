import { getDb } from './client';
import { Wallet } from './types';
import { RatsService } from './rats';
import { RacesService } from './races';

export class WalletsService {
    /**
     * Get or create a wallet
     */
    static async getOrCreateWallet(address: string): Promise<Wallet> {
        const db = await getDb();
        const existing = await db.collection('wallets').findOne<Wallet>({ address });
        
        if (existing) return existing;

        const wallet: Wallet = {
            address,
            ratIds: [],
            raceHistory: [],
            totalWins: 0,
            totalRaces: 0,
            createdAt: new Date().toISOString(),
        };

        await db.collection('wallets').insertOne(wallet as any);
        return wallet;
    }

    /**
     * Get a wallet by address
     */
    static async getWallet(address: string): Promise<Wallet | null> {
        const db = await getDb();
        const wallet = await db.collection('wallets').findOne<Wallet>({ address });
        return wallet;
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
        const db = await getDb();
        const wallet = await this.getOrCreateWallet(address);

        await db.collection('wallets').updateOne(
            { address },
            {
                $set: {
                    totalRaces: wallet.totalRaces + 1,
                    totalWins: wallet.totalWins + (won ? 1 : 0),
                }
            }
        );
    }

    /**
     * Add race to wallet history
     */
    static async addRaceToHistory(address: string, raceId: string): Promise<void> {
        const db = await getDb();
        const wallet = await this.getOrCreateWallet(address);

        if (!wallet.raceHistory.includes(raceId)) {
            await db.collection('wallets').updateOne(
                { address },
                { $push: { raceHistory: raceId } } as any
            );
        }
    }
}

