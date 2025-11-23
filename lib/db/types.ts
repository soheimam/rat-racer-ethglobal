// Core data types for MongoDB storage

export interface Rat {
    _id?: string; // MongoDB ID
    id: string; // Unique rat ID (generated)
    tokenId: number; // NFT token ID from contract
    name: string;
    owner: string; // wallet address
    modelIndex: number; // 0-2 for color-matched 3D model
    textureType: "baseColor" | "normal" | "metallicRoughness";
    imageUrl: string;
    stats: {
        stamina: number; // 50-100
        agility: number; // 50-100
        speed: number; // 50-100
        bloodline: string;
    };
    speeds: number[]; // 5 speed values for race segments
    gender: "male" | "female";
    dob: string; // ISO date string
    wins: number;
    placed: number; // 2nd or 3rd place finishes
    losses: number;
    level: number; // 1-100
    xp: number; // Current XP
    createdAt: string;
    // Breeding fields (optional, future-proof for breeding feature)
    generation?: number; // 0 = original mint, 1+ = bred
    parent1TokenId?: number; // First parent token ID (if bred)
    parent2TokenId?: number; // Second parent token ID (if bred)
    isPurebreed?: boolean; // Same bloodline from both parents
    breedingCount?: number; // How many times this rat has been bred
    mutations?: string[]; // Special mutations from breeding (future)
}

export interface RaceEntry {
    ratId?: string; // MongoDB rat ID (legacy)
    ratTokenId?: number; // On-chain token ID
    address?: string; // Wallet address (from contract)
    owner?: string; // Wallet address (legacy)
    enteredAt: string;
    position?: number; // finishing position (set after race completes)
}

export interface Race {
    _id?: string; // MongoDB ID
    id: string; // Unique generated ID
    raceId?: number; // On-chain race ID from contract
    creator?: string; // Wallet address of race creator
    trackId?: number; // Track ID (1, 2, etc.)
    entryToken?: string; // ERC20 token address for entry fee
    title: string;
    description: string;
    status: "waiting" | "pending" | "full" | "running" | "in_progress" | "completed" | "cancelled";
    entryFee: string; // in ETH or token amount
    prizePool: string;
    maxParticipants: number;
    participants: RaceEntry[];
    startedAt?: string;
    completedAt?: string;
    txHash?: string; // Creation transaction hash
    startTx?: string; // Start transaction hash
    settlementTx?: string; // Settlement transaction hash
    settled?: boolean; // Whether prizes have been distributed
    onChainWinners?: string[]; // Token IDs from contract
    onChainPrizes?: string[]; // Prize amounts from contract
    startedBy?: string; // Who started the race
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

