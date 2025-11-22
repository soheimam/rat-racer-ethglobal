// Core data types for MongoDB storage

export interface Rat {
    _id?: string; // MongoDB ID
    id: string; // Unique rat ID
    name: string;
    owner: string; // wallet address
    modelIndex: number; // 1-6 for which model to use
    textureType: "baseColor" | "normal" | "metallicRoughness";
    imageUrl: string;
    stats: {
        stamina: number; // 1-100
        agility: number; // 1-100
        bloodline: string;
    };
    speeds: number[]; // 5 speed values for race segments
    gender: "male" | "female";
    dob: string; // ISO date string
    wins: number;
    placed: number; // 2nd or 3rd place finishes
    losses: number;
    level: number;
    createdAt: string;
}

export interface RaceEntry {
    ratId: string;
    owner: string;
    enteredAt: string;
    position?: number; // finishing position (set after race completes)
}

export interface Race {
    _id?: string; // MongoDB ID
    id: string;
    title: string;
    description: string;
    status: "waiting" | "full" | "running" | "completed";
    entryFee: string; // in ETH or token amount
    prizePool: string;
    maxParticipants: 6;
    participants: RaceEntry[];
    startedAt?: string;
    completedAt?: string;
    winner?: {
        ratId: string;
        owner: string;
        prize: string;
    };
    results?: {
        position: number;
        ratId: string;
        owner: string;
        finishTime: number;
    }[];
    createdAt: string;
}

export interface Wallet {
    _id?: string; // MongoDB ID
    address: string; // Unique wallet address
    ratIds: string[];
    raceHistory: string[]; // race IDs
    totalWins: number;
    totalRaces: number;
    createdAt: string;
}

// Helper types for race operations
export type RaceStatus = Race["status"];
export type RaceListItem = Pick<Race, "id" | "title" | "status" | "participants" | "createdAt" | "startedAt">;

