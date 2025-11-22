/**
 * Metadata Generator for Rat NFTs
 * 
 * Generates random stats, bloodline, and OpenSea-compatible metadata
 * at mint time. This data is stored off-chain in Vercel Blob Storage.
 */

export interface RatStats {
    stamina: number;      // 50-100
    agility: number;      // 50-100
    speed: number;        // 50-100
    bloodline: string;    // Determined by rarity roll
}

export interface RatMetadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
    properties: {
        stats: RatStats;
        speeds: number[];     // 5 segment speeds for race simulation
        gender: 'male' | 'female';
        modelIndex: number;   // 1-6 for 3D model selection
        color: string;
        dob: string;
    };
}

// Bloodline rarity tiers
const BLOODLINES = [
    { name: 'Speed Demon', rarity: 0.05, multiplier: 1.15, minStats: 85 },      // 5% chance
    { name: 'Underground Elite', rarity: 0.10, multiplier: 1.08, minStats: 75 }, // 10% chance
    { name: 'Street Runner', rarity: 0.20, multiplier: 1.10, minStats: 70 },    // 20% chance
    { name: 'City Slicker', rarity: 0.25, multiplier: 1.06, minStats: 65 },     // 25% chance
    { name: 'Alley Cat', rarity: 0.25, multiplier: 1.05, minStats: 60 },        // 25% chance
    { name: 'Sewer Dweller', rarity: 0.15, multiplier: 1.02, minStats: 50 },    // 15% chance
];

// Available rat colors that match /public/images/{color}.png
const RAT_COLORS = [
    'brown',
    'pink',
    'white',
];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Roll for bloodline based on rarity
 */
function rollBloodline(): typeof BLOODLINES[0] {
    const roll = Math.random();
    let cumulativeProbability = 0;

    for (const bloodline of BLOODLINES) {
        cumulativeProbability += bloodline.rarity;
        if (roll <= cumulativeProbability) {
            return bloodline;
        }
    }

    // Fallback (shouldn't happen)
    return BLOODLINES[BLOODLINES.length - 1];
}

/**
 * Generate random stats based on bloodline
 */
function generateStats(bloodline: typeof BLOODLINES[0]): RatStats {
    const { minStats } = bloodline;

    // Generate stats with bloodline minimum
    const stamina = randomInt(minStats, 100);
    const agility = randomInt(minStats, 100);
    const speed = randomInt(minStats, 100);

    return {
        stamina,
        agility,
        speed,
        bloodline: bloodline.name,
    };
}

/**
 * Generate race speeds for 5 segments based on stats
 */
function generateRaceSpeeds(stats: RatStats, bloodlineMultiplier: number): number[] {
    const SEGMENTS = 5;
    const speeds: number[] = [];

    // Base speed score (0.7 - 1.0)
    const baseSpeed = (stats.stamina + stats.agility + stats.speed) / 300 * 0.3 + 0.7;
    const enhancedSpeed = baseSpeed * bloodlineMultiplier;

    for (let i = 0; i < SEGMENTS; i++) {
        // Add variance (±5%)
        const variance = 0.05;
        const randomFactor = 1 + (Math.random() * variance * 2 - variance);

        // Fatigue factor (slow down in later segments based on stamina)
        const fatigueIndex = i / SEGMENTS;
        const fatigueFactor = 1 - (fatigueIndex * (1 - stats.stamina / 100) * 0.1);

        const segmentSpeed = enhancedSpeed * randomFactor * fatigueFactor;
        speeds.push(Number(segmentSpeed.toFixed(3)));
    }

    return speeds;
}

/**
 * Generate complete rat metadata for a newly minted NFT
 */
export function generateRatMetadata(
    tokenId: number,
    ownerAddress: string
): RatMetadata {
    // Roll for bloodline (determines rarity and stat ranges)
    const bloodline = rollBloodline();

    // Generate stats based on bloodline
    const stats = generateStats(bloodline);

    // Generate race speeds
    const speeds = generateRaceSpeeds(stats, bloodline.multiplier);

    // Random gender
    const gender = Math.random() > 0.5 ? 'male' : 'female';

    // Random color (matches available PNG files)
    const colorIndex = randomInt(0, RAT_COLORS.length - 1);
    const color = RAT_COLORS[colorIndex];
    
    // Random 3D model (1-6 for race rendering)
    const modelIndex = randomInt(1, 6);

    // Generate rat name
    const name = `Street Rat #${tokenId}`;

    // ISO timestamp
    const dob = new Date().toISOString();

    // Get base URL from environment (for both static images and external links)
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rat-racer.vercel.app';

    // OpenSea-compatible metadata
    const metadata: RatMetadata = {
        name,
        description: `A ${bloodline.name} racing rat from the underground streets. Bred for speed and competition. Owner: ${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`,
        image: `${baseUrl}/images/${color}.png`,
        external_url: `${baseUrl}/rat/${tokenId}`,
        attributes: [
            {
                trait_type: 'Bloodline',
                value: bloodline.name,
            },
            {
                trait_type: 'Stamina',
                value: stats.stamina,
            },
            {
                trait_type: 'Agility',
                value: stats.agility,
            },
            {
                trait_type: 'Speed',
                value: stats.speed,
            },
            {
                trait_type: 'Gender',
                value: gender.charAt(0).toUpperCase() + gender.slice(1),
            },
            {
                trait_type: 'Color',
                value: color.charAt(0).toUpperCase() + color.slice(1),
            },
            {
                trait_type: '3D Model',
                value: modelIndex,
            },
            {
                trait_type: 'Rarity',
                value: bloodline.rarity <= 0.05 ? 'Legendary' :
                    bloodline.rarity <= 0.15 ? 'Epic' :
                        bloodline.rarity <= 0.35 ? 'Rare' : 'Common',
            },
        ],
        properties: {
            stats,
            speeds,
            gender,
            modelIndex,
            color,
            dob,
        },
    };

    return metadata;
}

/**
 * Calculate rarity score (for display/sorting)
 */
export function calculateRarityScore(metadata: RatMetadata): number {
    const { stats } = metadata.properties;
    const bloodlineBonus = BLOODLINES.find(
        b => b.name === stats.bloodline
    )?.multiplier || 1.0;

    const statAverage = (stats.stamina + stats.agility + stats.speed) / 3;
    const rarityScore = statAverage * bloodlineBonus;

    return Number(rarityScore.toFixed(2));
}

/**
 * Get bloodline info by name
 */
export function getBloodlineInfo(bloodlineName: string) {
    return BLOODLINES.find(b => b.name === bloodlineName);
}

/**
 * Get all available bloodlines
 */
export function getAllBloodlines() {
    return BLOODLINES.map(b => ({
        name: b.name,
        rarity: b.rarity,
        multiplier: b.multiplier,
        minStats: b.minStats,
        rarityPercent: `${(b.rarity * 100).toFixed(0)}%`,
    }));
}

