import { generateId, getDb } from './client';
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
        const db = await getDb();

        const race: Race = {
            id: generateId('race'),
            title: data.title,
            description: data.description,
            status: 'waiting',
            entryFee: data.entryFee,
            prizePool: '0',
            maxParticipants: 6,
            participants: [],
            createdAt: new Date().toISOString(),
        };

        await db.collection('races').insertOne(race as any);

        return race;
    }

    /**
     * Get a race by ID
     */
    static async getRace(raceId: string): Promise<Race | null> {
        const db = await getDb();
        const race = await db.collection('races').findOne<Race>({ id: raceId });
        return race;
    }

    /**
     * Enter a rat into a race
     */
    static async enterRace(raceId: string, ratId: string, owner: string): Promise<Race> {
        const db = await getDb();
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

        // Update prize pool
        const currentPool = parseFloat(race.prizePool);
        const fee = parseFloat(race.entryFee);
        race.prizePool = (currentPool + fee).toString();

        // Check if race is now full
        let updateData: any = {
            participants: race.participants,
            prizePool: race.prizePool,
        };

        if (race.participants.length === race.maxParticipants) {
            race.status = 'full';
            updateData.status = 'full';
            updateData.startedAt = new Date().toISOString();
            race.startedAt = updateData.startedAt;
        }

        await db.collection('races').updateOne(
            { id: raceId },
            { $set: updateData }
        );

        return race;
    }

    /**
     * Start a race (automatically called when full)
     */
    static async startRace(raceId: string): Promise<Race> {
        const db = await getDb();
        const race = await this.getRace(raceId);
        if (!race) throw new Error('Race not found');

        await db.collection('races').updateOne(
            { id: raceId },
            {
                $set: {
                    status: 'running',
                    startedAt: new Date().toISOString(),
                }
            }
        );

        race.status = 'running';
        race.startedAt = new Date().toISOString();

        return race;
    }

    /**
     * Complete a race and record results
     */
    static async completeRace(
        raceId: string,
        results: { ratId: string; finishTime: number }[]
    ): Promise<Race> {
        const db = await getDb();
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
        await db.collection('races').updateOne(
            { id: raceId },
            {
                $set: {
                    status: race.status,
                    completedAt: race.completedAt,
                    winner: race.winner,
                    results: race.results,
                }
            }
        );

        return race;
    }

    /**
     * Get all active races (waiting or running)
     */
    static async getActiveRaces(): Promise<Race[]> {
        const db = await getDb();
        const races = await db.collection('races')
            .find<Race>({
                status: { $in: ['waiting', 'running', 'full'] }
            })
            .sort({ createdAt: -1 })
            .toArray();

        return races;
    }

    /**
     * Get completed races (most recent first)
     */
    static async getCompletedRaces(limit: number = 20): Promise<Race[]> {
        const db = await getDb();
        const races = await db.collection('races')
            .find<Race>({ status: 'completed' })
            .sort({ completedAt: -1 })
            .limit(limit)
            .toArray();

        return races;
    }

    /**
     * Get races by participant wallet
     */
    static async getRacesByWallet(wallet: string): Promise<Race[]> {
        const db = await getDb();
        const races = await db.collection('races')
            .find<Race>({
                'participants.owner': wallet
            })
            .sort({ createdAt: -1 })
            .toArray();

        return races;
    }
}

