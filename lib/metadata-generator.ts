/**
 * Metadata Generator for Rat NFTs
 * 
 * World-class gamification system where each bloodline excels in different
 * race conditions and segments. No bloodline is always superior - strategy matters!
 */

export interface RatStats {
    stamina: number;      // 50-100: Affects fatigue and endurance
    agility: number;      // 50-100: Affects acceleration and consistency
    speed: number;        // 50-100: Raw speed potential
    bloodline: string;    // Determines race strategy and perks
}

export interface BreedingInfo {
    generation: number;        // 0 = original mint, 1+ = bred
    parent1TokenId?: number;   // First parent (if bred)
    parent2TokenId?: number;   // Second parent (if bred)
    isPurebreed: boolean;      // Same bloodline from both parents
    breedingCount: number;     // How many offspring this rat has produced
    mutations?: string[];      // Special mutations from breeding (future)
}

export interface RatMetadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    background_color?: string; // OpenSea background color (6-char hex without #)
    attributes: Array<{
        trait_type?: string;
        display_type?: string;
        value: string | number;
        max_value?: number;
    }>;
    properties: {
        stats: RatStats;
        speeds: number[];      // 5 segment speeds for race simulation
        gender: 'male' | 'female';
        modelIndex: number;    // 0-2 for color-matched 3D model
        color: string;
        dob: string;
        archetype?: string;    // Derived: Balanced, Sprint Specialist, Endurance Tank, etc.
        powerRating?: number;  // Composite stat for overall strength
        breeding?: BreedingInfo; // Optional: Breeding lineage and stats (future-proof)
    };
}

// Bloodline system: Each excels in different situations
// Designed so rarity ≠ always better - strategy and context matter!
const BLOODLINES = [
    {
        name: 'Speed Demon',
        rarity: 0.05,           // 5% - Rare
        baseMultiplier: 1.12,
        minStats: 75,
        maxStats: 100,
        variance: 0.03,         // ±3% - Very consistent
        description: 'Pure speed, consistent performance',
        // Excels: Short races, when ahead
        segmentModifiers: [1.18, 1.15, 1.12, 1.10, 1.08],  // Strong start, fades slightly
        perk: {
            type: 'leader_boost',
            condition: 'when_leading',
            bonus: 0.08  // +8% when in 1st place
        }
    },
    {
        name: 'Underground Elite',
        rarity: 0.10,           // 10% - Very Rare
        baseMultiplier: 1.08,
        minStats: 70,
        maxStats: 95,
        variance: 0.04,         // ±4%
        description: 'Tactical specialist, dominates mid-race',
        // Excels: Technical tracks, mid-race positioning
        segmentModifiers: [1.02, 1.08, 1.15, 1.18, 1.08],  // Weak start, MONSTER mid-race
        perk: {
            type: 'midrace_surge',
            condition: 'segments_3_4',
            bonus: 0.15  // +15% in segments 3-4
        }
    },
    {
        name: 'Street Runner',
        rarity: 0.20,           // 20% - Rare
        baseMultiplier: 1.06,
        minStats: 65,
        maxStats: 90,
        variance: 0.05,         // ±5%
        description: 'Explosive starts, early game dominance',
        // Excels: Getting ahead early, short races
        segmentModifiers: [1.20, 1.15, 1.05, 1.00, 0.98],  // BEAST start, fades late
        perk: {
            type: 'first_segment_king',
            condition: 'segment_1',
            bonus: 0.18  // +18% in segment 1
        }
    },
    {
        name: 'City Slicker',
        rarity: 0.25,           // 25% - Common
        baseMultiplier: 1.04,
        minStats: 60,
        maxStats: 85,
        variance: 0.06,         // ±6%
        description: 'Balanced and reliable, rewards smart stat builds',
        // Excels: Balanced stat builds, consistency
        segmentModifiers: [1.06, 1.06, 1.06, 1.06, 1.06],  // Perfectly consistent
        perk: {
            type: 'balance_bonus',
            condition: 'balanced_stats',  // When stats are within 20 points
            bonus: 0.12  // +12% if well-balanced
        }
    },
    {
        name: 'Alley Cat',
        rarity: 0.25,           // 25% - Common
        baseMultiplier: 1.03,
        minStats: 55,
        maxStats: 80,
        variance: 0.07,         // ±7%
        description: 'Comeback specialist, thrives under pressure',
        // Excels: When behind, underdog scenarios
        segmentModifiers: [0.98, 1.00, 1.05, 1.10, 1.15],  // Slow start, STRONG finish
        perk: {
            type: 'comeback_king',
            condition: 'when_behind',  // When in 3rd place or worse
            bonus: 0.14  // +14% when behind
        }
    },
    {
        name: 'Sewer Dweller',
        rarity: 0.15,           // 15% - Uncommon
        baseMultiplier: 1.02,
        minStats: 50,
        maxStats: 75,
        variance: 0.08,         // ±8% - High variance
        description: 'Chaos agent, unpredictable with huge upside',
        // Excels: High-variance strategies, last-place surges
        segmentModifiers: [0.95, 0.98, 1.05, 1.12, 1.22],  // Terrible start, EXPLOSIVE finish
        perk: {
            type: 'underdog_surge',
            condition: 'last_place',  // When in last place
            bonus: 0.20  // +20% massive comeback potential
        }
    },
];

// Available rat colors
const RAT_COLORS = ['brown', 'pink', 'white'];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Roll for bloodline based on weighted rarity
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

    return BLOODLINES[BLOODLINES.length - 1];
}

/**
 * Calculate stat archetype based on distribution
 * This creates additional strategic depth beyond bloodline
 */
function calculateArchetype(stats: RatStats): string {
    const { stamina, agility, speed } = stats;
    const values = [stamina, agility, speed];
    const avg = (stamina + agility + speed) / 3;
    const maxStat = Math.max(...values);
    const minStat = Math.min(...values);
    const statRange = maxStat - minStat;

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / 3;
    const stdDev = Math.sqrt(variance);

    // Determine archetype
    if (stdDev < 10) {
        return 'Balanced'; // All stats similar
    } else if (stamina > agility + 20 && stamina > speed + 20) {
        return 'Endurance Tank'; // Stamina specialist
    } else if (speed > stamina + 20 && speed > agility + 20) {
        return 'Sprint Specialist'; // Speed specialist
    } else if (agility > stamina + 20 && agility > speed + 20) {
        return 'Technical Master'; // Agility specialist
    } else if (statRange > 30) {
        return 'Glass Cannon'; // One strong, others weak
    } else {
        return 'Versatile'; // Moderate variance
    }
}

/**
 * Calculate archetype modifier based on build type
 */
function getArchetypeModifier(archetype: string, segmentIndex: number): number {
    switch (archetype) {
        case 'Balanced':
            return 1.05; // Small consistent bonus
        case 'Endurance Tank':
            // Gets stronger as race progresses
            return 0.95 + (segmentIndex * 0.04); // 0.95 → 1.11
        case 'Sprint Specialist':
            // Strong early, fades late
            return 1.15 - (segmentIndex * 0.04); // 1.15 → 0.99
        case 'Technical Master':
            // Bonus in mid-race technical sections
            return segmentIndex === 2 || segmentIndex === 3 ? 1.12 : 1.00;
        case 'Glass Cannon':
            // High variance - can dominate or fail
            return Math.random() > 0.5 ? 1.18 : 0.92;
        case 'Versatile':
            return 1.02;
        default:
            return 1.00;
    }
}

/**
 * Calculate stat balance bonus
 * Rewards well-rounded builds vs specialist builds
 */
function calculateStatBalanceBonus(stats: RatStats): number {
    const { stamina, agility, speed } = stats;
    const values = [stamina, agility, speed];
    const avg = (stamina + agility + speed) / 3;
    const maxDiff = Math.max(...values.map(v => Math.abs(v - avg)));

    if (maxDiff < 10) {
        // Very balanced: 5% bonus
        return 1.05;
    } else if (maxDiff > 30) {
        // Very specialist: -5% penalty to consistency, but potential for big plays
        return 0.95;
    }
    return 1.00;
}

/**
 * Generate random stats based on bloodline ranges
 */
function generateStats(bloodline: typeof BLOODLINES[0]): RatStats {
    const { minStats, maxStats } = bloodline;

    const stamina = randomInt(minStats, maxStats);
    const agility = randomInt(minStats, maxStats);
    const speed = randomInt(minStats, maxStats);

    return {
        stamina,
        agility,
        speed,
        bloodline: bloodline.name,
    };
}

/**
 * Calculate power rating (composite stat for overall strength)
 */
function calculatePowerRating(stats: RatStats, bloodlineMultiplier: number): number {
    const { stamina, agility, speed } = stats;

    // Weighted average: Speed matters most, then stamina, then agility
    const rawPower = (speed * 0.4) + (stamina * 0.35) + (agility * 0.25);

    // Apply bloodline multiplier
    const adjustedPower = rawPower * bloodlineMultiplier;

    // Normalize to 0-100 scale
    return Math.min(100, Math.round(adjustedPower));
}

/**
 * Generate race speeds for 5 segments with world-class depth
 * Each segment considers: base stats, bloodline perks, archetype, fatigue, variance
 */
function generateRaceSpeeds(stats: RatStats, bloodline: typeof BLOODLINES[0], archetype: string): number[] {
    const SEGMENTS = 5;
    const speeds: number[] = [];

    // Base speed calculation (0.7 - 1.0 range)
    const baseSpeed = ((stats.stamina + stats.agility + stats.speed) / 300) * 0.3 + 0.7;

    // Stat balance modifier
    const balanceBonus = calculateStatBalanceBonus(stats);

    for (let i = 0; i < SEGMENTS; i++) {
        // 1. Start with base speed
        let segmentSpeed = baseSpeed;

        // 2. Apply bloodline base multiplier
        segmentSpeed *= bloodline.baseMultiplier;

        // 3. Apply bloodline segment-specific modifier (their specialty)
        segmentSpeed *= bloodline.segmentModifiers[i];

        // 4. Apply archetype modifier (build-specific bonuses)
        segmentSpeed *= getArchetypeModifier(archetype, i);

        // 5. Apply stat balance bonus/penalty
        segmentSpeed *= balanceBonus;

        // 6. Fatigue system (stamina reduces fatigue impact)
        const segmentProgress = i / (SEGMENTS - 1); // 0 → 1
        const fatigueImpact = segmentProgress * (1 - stats.stamina / 100) * 0.15; // Max 15% reduction
        const fatigueFactor = 1 - fatigueImpact;
        segmentSpeed *= fatigueFactor;

        // 7. Random variance (bloodline-specific)
        const varianceRange = bloodline.variance;
        const randomFactor = 1 + (Math.random() * varianceRange * 2 - varianceRange);
        segmentSpeed *= randomFactor;

        // 8. Ensure minimum viable speed
        segmentSpeed = Math.max(0.5, segmentSpeed);

        speeds.push(Number(segmentSpeed.toFixed(3)));
    }

    return speeds;
}

/**
 * Generate complete rat metadata for a newly minted NFT (Generation 0)
 */
export function generateRatMetadata(
    tokenId: number,
    ownerAddress: string,
    imageIndex: number, // 0, 1, or 2 for brown, pink, white
    breedingInfo?: BreedingInfo // Optional: For bred rats (future)
): RatMetadata {
    // Roll for bloodline (determines rarity and playstyle)
    const bloodline = rollBloodline();

    // Generate stats based on bloodline ranges
    const stats = generateStats(bloodline);

    // Calculate archetype (derived from stat distribution)
    const archetype = calculateArchetype(stats);

    // Generate race speeds with all modifiers
    const speeds = generateRaceSpeeds(stats, bloodline, archetype);

    // Calculate power rating
    const powerRating = calculatePowerRating(stats, bloodline.baseMultiplier);

    // Random gender
    const gender = Math.random() > 0.5 ? 'male' : 'female';

    // Map imageIndex to color
    const color = RAT_COLORS[imageIndex] || RAT_COLORS[0];

    // Model index maps directly to color (backend consistency)
    // 0: brown, 1: pink, 2: white
    const modelIndex = imageIndex;

    // Generate rat name
    const name = `Street Rat #${tokenId}`;

    // ISO timestamp
    const dob = new Date().toISOString();

    // Get base URL from environment
    const baseUrl = (process.env.NEXT_PUBLIC_URL || 'https://rat-racer.vercel.app').replace(/\/$/, '');

    // Background color based on bloodline rarity (no # prefix for OpenSea)
    const getBackgroundColor = (bloodlineName: string): string => {
        switch (bloodlineName) {
            case 'Speed Demon': return '1a1a1a'; // Ultra rare - darkest
            case 'Underground Elite': return '2d2d2d'; // Very rare - dark
            case 'Street Runner': return '3a3a3a'; // Rare - medium dark
            case 'City Slicker': return '4a4a4a'; // Common - medium
            case 'Alley Cat': return '4a4a4a'; // Common - medium
            case 'Sewer Dweller': return '3a3a3a'; // Uncommon - medium dark
            default: return '2d2d2d';
        }
    };

    // OpenSea-compatible metadata
    const metadata: RatMetadata = {
        name,
        description: `A ${bloodline.name} racing rat from the underground streets. ${bloodline.description}. Owner: ${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}`,
        image: `${baseUrl}/images/${color}.png`,
        external_url: `${baseUrl}/rat/${tokenId}`,
        background_color: getBackgroundColor(bloodline.name),
        attributes: [
            {
                trait_type: 'Bloodline',
                value: bloodline.name,
            },
            {
                trait_type: 'Archetype',
                value: archetype,
            },
            {
                trait_type: 'Gender',
                value: gender === 'male' ? 'Male' : 'Female',
            },
            // Numeric stats with progress bars (0-100 scale)
            {
                display_type: 'number',
                trait_type: 'Stamina',
                value: stats.stamina,
                max_value: 100,
            },
            {
                display_type: 'number',
                trait_type: 'Agility',
                value: stats.agility,
                max_value: 100,
            },
            {
                display_type: 'number',
                trait_type: 'Speed',
                value: stats.speed,
                max_value: 100,
            },
            // Power rating as a boost number
            {
                display_type: 'boost_number',
                trait_type: 'Power Rating',
                value: powerRating,
            },
            // Bloodline multiplier as percentage boost
            {
                display_type: 'boost_percentage',
                trait_type: 'Bloodline Bonus',
                value: Math.round((bloodline.baseMultiplier - 1) * 100), // e.g., 1.12 -> 12%
            },
            // Date of birth (Unix timestamp)
            {
                display_type: 'date',
                trait_type: 'Born',
                value: Math.floor(new Date(dob).getTime() / 1000), // Convert to Unix timestamp
            },
            // Generation (for breeding tracking)
            {
                display_type: 'number',
                trait_type: 'Generation',
                value: breedingInfo?.generation ?? 0, // Gen 0 for original mints
            },
        ],
        properties: {
            stats,
            speeds,
            gender,
            modelIndex,
            color,
            dob,
            archetype,
            powerRating,
            // Breeding info (optional, future-proof for breeding feature)
            breeding: breedingInfo || {
                generation: 0,
                isPurebreed: true, // Original mints are considered "pure" bloodline
                breedingCount: 0,
            },
        },
    };

    return metadata;
}

/**
 * Generate metadata for a bred rat (FUTURE: For breeding feature)
 * 
 * This function will be used when breeding is implemented.
 * It combines traits from two parent rats to create offspring.
 * 
 * @param tokenId - New token ID for the bred rat
 * @param ownerAddress - Owner of the new rat
 * @param imageIndex - Selected image index (0-2)
 * @param parent1Metadata - Metadata of first parent
 * @param parent2Metadata - Metadata of second parent
 * @returns Metadata for the bred rat
 */
export function generateBredRatMetadata(
    tokenId: number,
    ownerAddress: string,
    imageIndex: number,
    parent1Metadata: RatMetadata,
    parent2Metadata: RatMetadata
): RatMetadata {
    // Calculate generation (max parent gen + 1)
    const parent1Gen = parent1Metadata.properties.breeding?.generation ?? 0;
    const parent2Gen = parent2Metadata.properties.breeding?.generation ?? 0;
    const generation = Math.max(parent1Gen, parent2Gen) + 1;

    // Determine if purebreed (same bloodline from both parents)
    const parent1Bloodline = parent1Metadata.properties.stats.bloodline;
    const parent2Bloodline = parent2Metadata.properties.stats.bloodline;
    const isPurebreed = parent1Bloodline === parent2Bloodline;

    // Get parent token IDs
    const parent1TokenId = extractTokenIdFromName(parent1Metadata.name);
    const parent2TokenId = extractTokenIdFromName(parent2Metadata.name);

    // Create breeding info
    const breedingInfo: BreedingInfo = {
        generation,
        parent1TokenId,
        parent2TokenId,
        isPurebreed,
        breedingCount: 0,
        mutations: [], // Future: Detect special mutations
    };

    // Generate metadata (stats will be inherited/mutated in future implementation)
    // For now, use the standard generation function with breeding info
    return generateRatMetadata(tokenId, ownerAddress, imageIndex, breedingInfo);
}

/**
 * Extract token ID from rat name (helper for breeding)
 */
function extractTokenIdFromName(name: string): number {
    const match = name.match(/#(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

/**
 * Calculate inherited stats from parents (FUTURE: For breeding feature)
 * 
 * This function will calculate offspring stats based on parent stats,
 * with potential for mutations and purebreed bonuses.
 * 
 * @param parent1Stats - Stats of first parent
 * @param parent2Stats - Stats of second parent
 * @param isPurebreed - Whether both parents have same bloodline
 * @returns Calculated stats for offspring
 */
export function calculateInheritedStats(
    parent1Stats: RatStats,
    parent2Stats: RatStats,
    isPurebreed: boolean
): RatStats {
    // Weighted average with slight randomization
    const inheritStamina = Math.round((parent1Stats.stamina + parent2Stats.stamina) / 2);
    const inheritAgility = Math.round((parent1Stats.agility + parent2Stats.agility) / 2);
    const inheritSpeed = Math.round((parent1Stats.speed + parent2Stats.speed) / 2);

    // Add variance (±5 points)
    const variance = 5;
    const stamina = Math.max(50, Math.min(100, inheritStamina + randomInt(-variance, variance)));
    const agility = Math.max(50, Math.min(100, inheritAgility + randomInt(-variance, variance)));
    const speed = Math.max(50, Math.min(100, inheritSpeed + randomInt(-variance, variance)));

    // Determine bloodline
    let bloodline: string;
    if (isPurebreed) {
        // Purebreed: Same bloodline as parents (with small bonus to stats)
        bloodline = parent1Stats.bloodline;
        // Purebreed bonus: +5% to all stats (applied in race calculations)
    } else {
        // Mixed bloodline: 50/50 chance or rare mutation
        const mutationChance = Math.random();
        if (mutationChance < 0.05) {
            // 5% chance for rare mutated bloodline
            bloodline = 'Hybrid Elite'; // Special bred-only bloodline (future)
        } else if (Math.random() < 0.5) {
            bloodline = parent1Stats.bloodline;
        } else {
            bloodline = parent2Stats.bloodline;
        }
    }

    return {
        stamina,
        agility,
        speed,
        bloodline,
    };
}
