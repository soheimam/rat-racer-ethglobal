import { RedisClient } from './client';
import { RatsService } from './rats';
import { Race, RaceEntry } from './types';

export class RacesService {
    /**
     * Create a new race
     */
    static async createRace(data: {
        title: string;
        description: string;
        entryFee: string;
    }): Promise<Race> {
        const race: Race = {
            id: RedisClient.generateId('race'),
            title: data.title,
            description: data.description,
            status: 'waiting',
            entryFee: data.entryFee,
            prizePool: '0',
            maxParticipants: 6,
            participants: [],
            createdAt: new Date().toISOString(),
        };

        // Save race
        await RedisClient.kv.set(RedisClient.keys.race(race.id), JSON.stringify(race));

        // Add to active races list
        await RedisClient.kv.zadd(RedisClient.keys.activeRaces(), {
            score: Date.now(),
            member: race.id,
        });

        return race;
    }

    /**
     * Get a race by ID
     */
    static async getRace(raceId: string): Promise<Race | null> {
        const data = await RedisClient.kv.get<string>(RedisClient.keys.race(raceId));
        if (!data) return null;
        return JSON.parse(data);
    }

    /**
     * Enter a rat into a race
     */
    static async enterRace(raceId: string, ratId: string, owner: string): Promise<Race> {
        const race = await this.getRace(raceId);
        if (!race) throw new Error('Race not found');

        // Validations
        if (race.status !== 'waiting') {
            throw new Error('Race is not accepting entries');
        }

        if (race.participants.length >= race.maxParticipants) {
            throw new Error('Race is full');
        }

        // Check if rat exists and belongs to owner
        const rat = await RatsService.getRat(ratId);
        if (!rat) throw new Error('Rat not found');
        if (rat.owner !== owner) throw new Error('You do not own this rat');

        // Check if rat is already in this race
        if (race.participants.some(p => p.ratId === ratId)) {
            throw new Error('Rat is already in this race');
        }

        // Add participant
        const entry: RaceEntry = {
            ratId,
            owner,
            enteredAt: new Date().toISOString(),
        };

        race.participants.push(entry);

        // Update prize pool (simplified - you'll add crypto logic later)
        const currentPool = parseFloat(race.prizePool);
        const fee = parseFloat(race.entryFee);
        race.prizePool = (currentPool + fee).toString();

        // Check if race is now full
        if (race.participants.length === race.maxParticipants) {
            race.status = 'full';
            // Auto-start race
            await this.startRace(race.id);
        }

        // Save updated race
        await RedisClient.kv.set(RedisClient.keys.race(race.id), JSON.stringify(race));

        return race;
    }

    /**
     * Start a race (automatically called when full)
     */
    static async startRace(raceId: string): Promise<Race> {
        const race = await this.getRace(raceId);
        if (!race) throw new Error('Race not found');

        race.status = 'running';
        race.startedAt = new Date().toISOString();

        await RedisClient.kv.set(RedisClient.keys.race(race.id), JSON.stringify(race));

        return race;
    }

    /**
     * Complete a race and record results
     */
    static async completeRace(
        raceId: string,
        results: { ratId: string; finishTime: number }[]
    ): Promise<Race> {
        const race = await this.getRace(raceId);
        if (!race) throw new Error('Race not found');

        // Sort by finish time
        const sortedResults = results.sort((a, b) => a.finishTime - b.finishTime);

        // Set positions
        race.results = sortedResults.map((result, index) => {
            const participant = race.participants.find(p => p.ratId === result.ratId);
            return {
                position: index + 1,
                ratId: result.ratId,
                owner: participant?.owner || '',
                finishTime: result.finishTime,
            };
        });

        // Set winner
        const winner = race.results[0];
        race.winner = {
            ratId: winner.ratId,
            owner: winner.owner,
            prize: race.prizePool,
        };

        race.status = 'completed';
        race.completedAt = new Date().toISOString();

        // Update rat stats
        for (let i = 0; i < race.results.length; i++) {
            const result = race.results[i];
            if (i === 0) {
                // Winner
                await RatsService.updateRatStats(result.ratId, { wins: 1 });
            } else if (i <= 2) {
                // 2nd or 3rd place
                await RatsService.updateRatStats(result.ratId, { placed: 1 });
            } else {
                // Loss
                await RatsService.updateRatStats(result.ratId, { losses: 1 });
            }
        }

        // Save updated race
        await RedisClient.kv.set(RedisClient.keys.race(race.id), JSON.stringify(race));

        // Move from active to completed
        await RedisClient.kv.zrem(RedisClient.keys.activeRaces(), race.id);
        await RedisClient.kv.zadd(RedisClient.keys.completedRaces(), {
            score: Date.now(),
            member: race.id,
        });

        return race;
    }

    /**
     * Get all active races (waiting or running)
     */
    static async getActiveRaces(): Promise<Race[]> {
        const raceIds = await RedisClient.kv.zrange(RedisClient.keys.activeRaces(), 0, -1);
        if (!raceIds || raceIds.length === 0) return [];

        const races = await Promise.all(
            raceIds.map(id => this.getRace(id as string))
        );

        return races
            .filter((race): race is Race => race !== null)
            .filter(race => race.status === 'waiting' || race.status === 'running');
    }

    /**
     * Get completed races (most recent first)
     */
    static async getCompletedRaces(limit: number = 20): Promise<Race[]> {
        const raceIds = await RedisClient.kv.zrange(
            RedisClient.keys.completedRaces(),
            0,
            limit - 1,
            { rev: true }
        );

        if (!raceIds || raceIds.length === 0) return [];

        const races = await Promise.all(
            raceIds.map(id => this.getRace(id as string))
        );

        return races.filter((race): race is Race => race !== null && race.status === 'completed');
    }

    /**
     * Get races by participant wallet
     */
    static async getRacesByWallet(wallet: string): Promise<Race[]> {
        // Get all active and completed race IDs
        const activeIds = await RedisClient.kv.zrange(RedisClient.keys.activeRaces(), 0, -1);
        const completedIds = await RedisClient.kv.zrange(RedisClient.keys.completedRaces(), 0, -1);

        const allIds = [...(activeIds || []), ...(completedIds || [])];
        if (allIds.length === 0) return [];

        const races = await Promise.all(
            allIds.map(id => this.getRace(id as string))
        );

        // Filter races where wallet is a participant
        return races
            .filter((race): race is Race => race !== null)
            .filter(race => race.participants.some(p => p.owner === wallet));
    }
}

