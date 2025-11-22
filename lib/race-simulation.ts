/**
 * Advanced Race Simulation Engine
 * 
 * This is the core game logic that determines race outcomes.
 * Features:
 * - Bloodline-specific perks and playstyles
 * - Complex stat interactions
 * - Race composition analysis (counter-picks)
 * - Time-of-day modifiers
 * - Strategic depth for competitive play
 */

import { logger } from './logger';

export interface RatRaceStats {
  tokenId: string;
  owner: string;
  name: string;
  stamina: number;    // 50-100: Affects fatigue resistance and late-game performance
  agility: number;    // 50-100: Affects turn handling and variance control
  speed: number;      // 50-100: Base speed potential
  bloodline: string;
  color: number;
}

export interface SimulationContext {
  raceId: string;
  rats: RatRaceStats[];
  startTime: Date;      // For time-of-day modifiers
  trackId?: number;     // Future: different tracks
}

export interface SimulationResult {
  positions: string[];
  segmentSpeeds: Record<string, number[]>;
  finishTimes: Record<string, number>;
  winners: {
    first: { tokenId: string; owner: string; name: string; time: number };
    second: { tokenId: string; owner: string; name: string; time: number };
    third: { tokenId: string; owner: string; name: string; time: number };
  };
  analysis: {
    bloodlineDistribution: Record<string, number>;
    avgStats: { stamina: number; agility: number; speed: number };
    timeOfDayModifier: string;
    competitiveInsights: string[];
  };
}

// Bloodline definitions with unique mechanics
const BLOODLINE_PERKS = {
  'Speed Demon': {
    multiplier: 1.15,
    minStats: 85,
    rarity: 0.05,
    
    // Perk: Explosive Start - Less entropy in early segments, consistent high performance
    applyPerk: (segment: number, baseSpeed: number, stamina: number) => {
      if (segment <= 1) {
        // Early segments: 50% reduced variance, +10% speed
        return {
          speed: baseSpeed * 1.10,
          variance: 0.025, // Half normal variance
        };
      }
      return { speed: baseSpeed, variance: 0.05 };
    },
    
    // Weak against: Stamina-heavy builds in long races
    counterStrength: { 'Underground Elite': 0.95, 'Alley Cat': 1.05 },
    description: 'Explosive early game, dominates short bursts',
  },
  
  'Underground Elite': {
    multiplier: 1.08,
    minStats: 75,
    rarity: 0.10,
    
    // Perk: Late Game Beast - Gets STRONGER in later segments
    applyPerk: (segment: number, baseSpeed: number, stamina: number) => {
      if (segment >= 3) {
        // Later segments: Reduced fatigue, increasing speed
        const lateGameBonus = 1 + (segment - 2) * 0.05; // +5% per late segment
        return {
          speed: baseSpeed * lateGameBonus,
          variance: 0.04,
        };
      }
      return { speed: baseSpeed, variance: 0.05 };
    },
    
    counterStrength: { 'Speed Demon': 1.05, 'Sewer Dweller': 0.97 },
    description: 'Clutch performer, dominates final stretch',
  },
  
  'Street Runner': {
    multiplier: 1.10,
    minStats: 70,
    rarity: 0.20,
    
    // Perk: Adaptive Racer - Adjusts to race composition
    applyPerk: (segment: number, baseSpeed: number, stamina: number, context?: any) => {
      // Better performance when racing against slower opponents
      const avgOpponentSpeed = context?.avgOpponentSpeed || 0.85;
      const adaptiveBonus = avgOpponentSpeed < 0.85 ? 1.08 : 1.00;
      
      return {
        speed: baseSpeed * adaptiveBonus,
        variance: 0.05,
      };
    },
    
    counterStrength: { 'City Slicker': 1.03, 'Speed Demon': 0.95 },
    description: 'Versatile all-rounder, adapts to competition',
  },
  
  'City Slicker': {
    multiplier: 1.06,
    minStats: 65,
    rarity: 0.25,
    
    // Perk: Time of Day Specialist - Bonus during certain hours
    applyPerk: (segment: number, baseSpeed: number, stamina: number, context?: any) => {
      const hour = context?.hour || 12;
      
      // Best during "rush hour" (7-9 AM, 5-7 PM)
      const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
      const timeBonus = isRushHour ? 1.12 : 1.00;
      
      return {
        speed: baseSpeed * timeBonus,
        variance: isRushHour ? 0.03 : 0.06,
      };
    },
    
    counterStrength: { 'Street Runner': 0.97, 'Alley Cat': 1.04 },
    description: 'Peak performance during rush hours',
  },
  
  'Alley Cat': {
    multiplier: 1.05,
    minStats: 60,
    rarity: 0.25,
    
    // Perk: Survivor - Consistent performance, resists fatigue
    applyPerk: (segment: number, baseSpeed: number, stamina: number) => {
      // Lower variance across all segments, reduced fatigue
      const fatigueResistance = 0.5; // 50% less fatigue impact
      
      return {
        speed: baseSpeed,
        variance: 0.03, // Very consistent
        fatigueResistance,
      };
    },
    
    counterStrength: { 'Speed Demon': 0.95, 'City Slicker': 0.96 },
    description: 'Steady and reliable, rarely disappoints',
  },
  
  'Sewer Dweller': {
    multiplier: 1.02,
    minStats: 50,
    rarity: 0.15,
    
    // Perk: Underdog - High variance, can upset favorites
    applyPerk: (segment: number, baseSpeed: number, stamina: number, context?: any) => {
      // Higher variance, occasional "lucky" segments
      const luckyRoll = Math.random();
      const isLuckySegment = luckyRoll > 0.85; // 15% chance per segment
      
      return {
        speed: baseSpeed * (isLuckySegment ? 1.20 : 0.95),
        variance: 0.12, // Very high variance
      };
    },
    
    counterStrength: { 'Underground Elite': 1.03, 'Street Runner': 1.02 },
    description: 'Chaotic wildcard, unpredictable outcomes',
  },
};

const SEGMENTS = 5;
const SEGMENT_LENGTH = 100; // meters

/**
 * Calculate time-of-day modifier
 */
function getTimeOfDayModifier(time: Date): { name: string; description: string } {
  const hour = time.getHours();
  
  if (hour >= 0 && hour < 6) {
    return { 
      name: 'Dead of Night', 
      description: 'Stamina rats perform better, speed rats tire faster' 
    };
  } else if (hour >= 6 && hour < 10) {
    return { 
      name: 'Morning Rush', 
      description: 'City Slicker bloodline gets +12% speed' 
    };
  } else if (hour >= 10 && hour < 16) {
    return { 
      name: 'Midday Heat', 
      description: 'All rats experience 10% more fatigue' 
    };
  } else if (hour >= 16 && hour < 20) {
    return { 
      name: 'Evening Rush', 
      description: 'City Slicker bloodline gets +12% speed, agility matters more' 
    };
  } else {
    return { 
      name: 'Night Racing', 
      description: 'Underground Elite rats gain +8% speed, variance reduced' 
    };
  }
}

/**
 * Analyze race composition for strategic insights
 */
function analyzeRaceComposition(rats: RatRaceStats[]): {
  bloodlineDistribution: Record<string, number>;
  avgStats: { stamina: number; agility: number; speed: number };
  insights: string[];
} {
  const bloodlineCount: Record<string, number> = {};
  let totalStamina = 0;
  let totalAgility = 0;
  let totalSpeed = 0;
  
  rats.forEach(rat => {
    bloodlineCount[rat.bloodline] = (bloodlineCount[rat.bloodline] || 0) + 1;
    totalStamina += rat.stamina;
    totalAgility += rat.agility;
    totalSpeed += rat.speed;
  });
  
  const count = rats.length;
  const avgStats = {
    stamina: totalStamina / count,
    agility: totalAgility / count,
    speed: totalSpeed / count,
  };
  
  // Generate strategic insights
  const insights: string[] = [];
  
  // Check for dominant bloodlines
  Object.entries(bloodlineCount).forEach(([bloodline, count]) => {
    if (count >= 3) {
      insights.push(`${bloodline} dominates this race (${count}/6) - counter-picks may perform well`);
    }
  });
  
  // Stat distribution insights
  if (avgStats.stamina > 80) {
    insights.push('High-stamina race - late-game bloodlines have advantage');
  } else if (avgStats.stamina < 65) {
    insights.push('Low-stamina race - early burst strategies favored');
  }
  
  if (avgStats.speed > 85) {
    insights.push('High-speed competition - consistency and agility matter more');
  }
  
  if (avgStats.agility > 85) {
    insights.push('High-agility field - variance control is key');
  }
  
  return { bloodlineDistribution: bloodlineCount, avgStats, insights };
}

/**
 * Simulate a complete race with advanced mechanics
 */
export function simulateRace(context: SimulationContext): SimulationResult {
  const { raceId, rats, startTime } = context;
  const hour = startTime.getHours();
  
  logger.info('[simulation] Starting advanced race simulation', {
    raceId,
    ratCount: rats.length,
    hour,
  });
  
  // Analyze composition
  const composition = analyzeRaceComposition(rats);
  const timeOfDay = getTimeOfDayModifier(startTime);
  
  logger.info('[simulation] Race analysis', {
    bloodlines: composition.bloodlineDistribution,
    avgStats: composition.avgStats,
    timeOfDay: timeOfDay.name,
    insights: composition.insights,
  });
  
  // Calculate base speeds for each rat
  const ratSpeeds = rats.map(rat => {
    const bloodlinePerk = BLOODLINE_PERKS[rat.bloodline as keyof typeof BLOODLINE_PERKS];
    if (!bloodlinePerk) {
      logger.warn('[simulation] Unknown bloodline', { bloodline: rat.bloodline });
    }
    
    const statScore = (
      rat.stamina * 0.3 +
      rat.agility * 0.4 +
      rat.speed * 0.3
    ) / 100;
    
    const bloodlineMultiplier = bloodlinePerk?.multiplier || 1.0;
    const baseSpeed = statScore * bloodlineMultiplier;
    
    return { rat, baseSpeed, bloodlinePerk };
  });
  
  // Simulate each segment for each rat
  const segmentSpeeds: Record<string, number[]> = {};
  const totalTimes: Record<string, number> = {};
  
  ratSpeeds.forEach(({ rat, baseSpeed, bloodlinePerk }) => {
    const speeds: number[] = [];
    let totalTime = 0;
    
    // Context for perks
    const perkContext = {
      hour,
      avgOpponentSpeed: composition.avgStats.speed / 100,
      bloodlineCount: composition.bloodlineDistribution,
    };
    
    for (let segment = 0; segment < SEGMENTS; segment++) {
      // Apply bloodline perk
      const perkResult = bloodlinePerk?.applyPerk(
        segment,
        baseSpeed,
        rat.stamina,
        perkContext
      ) || { speed: baseSpeed, variance: 0.05 };
      
      let segmentSpeed = perkResult.speed;
      const variance = perkResult.variance;
      
      // Apply random variance (controlled by agility)
      const maxVariance = variance * (1 - rat.agility / 200); // Higher agility = less variance
      const randomFactor = 1 + (Math.random() * maxVariance * 2 - maxVariance);
      segmentSpeed *= randomFactor;
      
      // Apply fatigue (controlled by stamina)
      const fatigueIndex = segment / SEGMENTS;
      const fatigueResistance = perkResult.fatigueResistance || 0;
      const staminaFactor = rat.stamina / 100;
      const baseFatigueImpact = 1 - staminaFactor;
      const adjustedFatigueImpact = baseFatigueImpact * (1 - fatigueResistance);
      const fatigueFactor = 1 - (fatigueIndex * adjustedFatigueImpact * 0.15);
      segmentSpeed *= fatigueFactor;
      
      // Time-of-day modifiers
      if (timeOfDay.name === 'Midday Heat') {
        // Extra fatigue
        const heatPenalty = 1 - (fatigueIndex * 0.10);
        segmentSpeed *= heatPenalty;
      } else if (timeOfDay.name === 'Dead of Night' && rat.stamina > 80) {
        // Stamina rats get bonus
        segmentSpeed *= 1.05;
      } else if (timeOfDay.name === 'Night Racing' && rat.bloodline === 'Underground Elite') {
        // Underground Elite bonus at night
        segmentSpeed *= 1.08;
      }
      
      // Apply counter-matchups
      if (bloodlinePerk?.counterStrength) {
        // Check if any counter-bloodlines are in race
        rats.forEach(opponent => {
          if (opponent.tokenId !== rat.tokenId) {
            const counterModifier = bloodlinePerk.counterStrength[opponent.bloodline];
            if (counterModifier) {
              segmentSpeed *= counterModifier;
            }
          }
        });
      }
      
      speeds.push(Number(segmentSpeed.toFixed(4)));
      
      // Calculate time for this segment
      const segmentTime = SEGMENT_LENGTH / segmentSpeed;
      totalTime += segmentTime;
    }
    
    segmentSpeeds[rat.tokenId] = speeds;
    totalTimes[rat.tokenId] = totalTime;
    
    logger.debug(`[simulation] ${rat.name} (${rat.bloodline})`, {
      totalTime: totalTime.toFixed(2),
      speeds: speeds.map(s => s.toFixed(3)),
      avgSpeed: (speeds.reduce((a, b) => a + b, 0) / SEGMENTS).toFixed(3),
    });
  });
  
  // Sort by finish time
  const sortedRats = rats
    .map(rat => ({
      ...rat,
      totalTime: totalTimes[rat.tokenId],
    }))
    .sort((a, b) => a.totalTime - b.totalTime);
  
  const positions = sortedRats.map(r => r.tokenId);
  
  logger.info('[simulation] Final positions', {
    results: sortedRats.map((r, i) =>
      `${i + 1}. ${r.name} (${r.bloodline}) - ${r.totalTime.toFixed(2)}s`
    ),
  });
  
  return {
    positions,
    segmentSpeeds,
    finishTimes: totalTimes,
    winners: {
      first: {
        tokenId: sortedRats[0].tokenId,
        owner: sortedRats[0].owner,
        name: sortedRats[0].name,
        time: sortedRats[0].totalTime,
      },
      second: {
        tokenId: sortedRats[1].tokenId,
        owner: sortedRats[1].owner,
        name: sortedRats[1].name,
        time: sortedRats[1].totalTime,
      },
      third: {
        tokenId: sortedRats[2].tokenId,
        owner: sortedRats[2].owner,
        name: sortedRats[2].name,
        time: sortedRats[2].totalTime,
      },
    },
    analysis: {
      bloodlineDistribution: composition.bloodlineDistribution,
      avgStats: composition.avgStats,
      timeOfDayModifier: `${timeOfDay.name}: ${timeOfDay.description}`,
      competitiveInsights: composition.insights,
    },
  };
}

/**
 * Get bloodline matchup chart (for UI display)
 */
export function getBloodlineMatchups(): Record<string, {
  strongAgainst: string[];
  weakAgainst: string[];
  playstyle: string;
}> {
  return {
    'Speed Demon': {
      strongAgainst: ['Alley Cat', 'Sewer Dweller'],
      weakAgainst: ['Underground Elite', 'Street Runner'],
      playstyle: 'Explosive early game, dominate before fatigue sets in',
    },
    'Underground Elite': {
      strongAgainst: ['Speed Demon', 'City Slicker'],
      weakAgainst: ['Sewer Dweller', 'Alley Cat'],
      playstyle: 'Late game powerhouse, gets stronger as race progresses',
    },
    'Street Runner': {
      strongAgainst: ['City Slicker', 'Speed Demon'],
      weakAgainst: ['Underground Elite', 'Alley Cat'],
      playstyle: 'Adaptive all-rounder, counters weaker competition',
    },
    'City Slicker': {
      strongAgainst: ['Alley Cat', 'Street Runner'],
      weakAgainst: ['Speed Demon', 'Underground Elite'],
      playstyle: 'Time specialist, dominates during rush hours',
    },
    'Alley Cat': {
      strongAgainst: ['Speed Demon', 'City Slicker'],
      weakAgainst: ['Street Runner', 'Underground Elite'],
      playstyle: 'Consistent performer, reliable in any situation',
    },
    'Sewer Dweller': {
      strongAgainst: ['Underground Elite', 'Street Runner'],
      weakAgainst: ['Speed Demon', 'City Slicker'],
      playstyle: 'Chaotic wildcard, high risk high reward',
    },
  };
}

/**
 * Recommend best rat for a specific race context
 */
export function recommendRatForRace(
  userRats: RatRaceStats[],
  opponentRats: RatRaceStats[],
  raceTime: Date
): {
  recommended: RatRaceStats;
  reasoning: string[];
  winProbability: number;
} {
  const allRats = [...opponentRats, ...userRats];
  const composition = analyzeRaceComposition(allRats);
  const timeOfDay = getTimeOfDayModifier(raceTime);
  
  // Score each user rat
  const scoredRats = userRats.map(rat => {
    let score = 0;
    const reasons: string[] = [];
    
    const bloodlinePerk = BLOODLINE_PERKS[rat.bloodline as keyof typeof BLOODLINE_PERKS];
    
    // Base stat score
    const statScore = (rat.stamina + rat.agility + rat.speed) / 3;
    score += statScore;
    
    // Bloodline rarity bonus
    if (bloodlinePerk) {
      score += (bloodlinePerk.multiplier - 1) * 100;
    }
    
    // Counter-matchup analysis
    let favorableMatchups = 0;
    opponentRats.forEach(opponent => {
      if (bloodlinePerk?.counterStrength) {
        const modifier = bloodlinePerk.counterStrength[opponent.bloodline];
        if (modifier && modifier > 1.0) {
          favorableMatchups++;
          score += 10;
        } else if (modifier && modifier < 1.0) {
          score -= 5;
        }
      }
    });
    
    if (favorableMatchups > 0) {
      reasons.push(`Strong against ${favorableMatchups} opponent(s)`);
    }
    
    // Time-of-day bonus
    if (timeOfDay.name.includes('Rush') && rat.bloodline === 'City Slicker') {
      score += 15;
      reasons.push('Rush hour bonus (+12% speed)');
    }
    
    if (timeOfDay.name === 'Night Racing' && rat.bloodline === 'Underground Elite') {
      score += 12;
      reasons.push('Night racing bonus (+8% speed)');
    }
    
    // Composition insights
    if (composition.avgStats.stamina > 80 && rat.stamina > 85) {
      score += 8;
      reasons.push('High stamina suits this field');
    }
    
    if (composition.avgStats.speed > 85 && rat.agility > 85) {
      score += 8;
      reasons.push('High agility for variance control');
    }
    
    return { rat, score, reasons };
  });
  
  // Sort by score
  scoredRats.sort((a, b) => b.score - a.score);
  const best = scoredRats[0];
  
  // Estimate win probability (rough)
  const totalScore = scoredRats.reduce((sum, r) => sum + r.score, 0);
  const winProbability = Math.min(0.95, Math.max(0.05, best.score / totalScore));
  
  return {
    recommended: best.rat,
    reasoning: best.reasons,
    winProbability: Number((winProbability * 100).toFixed(1)),
  };
}

