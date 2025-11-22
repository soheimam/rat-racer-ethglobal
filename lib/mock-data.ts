import { Race, RaceParticipant } from './schema';

// Mock race participants
export const mockParticipants: RaceParticipant[] = [
  {
    id: "rat_1",
    name: "Lightning Whiskers",
    owner: "Player 1",
    gangId: "gang_1",
    ownerWallet: "0x0000000000000000000000000000000000000001",
    dob: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    gender: "male",
    wins: 15,
    placed: 8,
    losses: 3,
    contentUrl: "/images/white.png",
    speeds: [0.8, 0.9, 0.85, 0.88, 0.92],
    stats: {
      stamina: 85,
      agility: 90,
      bloodline: "Street Runner"
    }
  },
  {
    id: "rat_2",
    name: "Shadow Dancer",
    owner: "Player 2",
    gangId: "gang_2",
    ownerWallet: "0x0000000000000000000000000000000000000002",
    dob: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    gender: "female",
    wins: 12,
    placed: 10,
    losses: 5,
    contentUrl: "/images/pink.png",
    speeds: [0.75, 0.88, 0.82, 0.86, 0.89],
    stats: {
      stamina: 80,
      agility: 88,
      bloodline: "Alley Cat"
    }
  },
  {
    id: "rat_3",
    name: "Turbo Tail",
    owner: "Player 3",
    gangId: "gang_1",
    ownerWallet: "0x0000000000000000000000000000000000000003",
    dob: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    gender: "male",
    wins: 20,
    placed: 12,
    losses: 2,
    contentUrl: "/images/brown.png",
    speeds: [0.9, 0.95, 0.92, 0.94, 0.96],
    stats: {
      stamina: 95,
      agility: 92,
      bloodline: "Speed Demon"
    }
  },
  {
    id: "rat_4",
    name: "Dizzy Paws",
    owner: "Player 4",
    gangId: "gang_3",
    ownerWallet: "0x0000000000000000000000000000000000000004",
    dob: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    gender: "female",
    wins: 5,
    placed: 6,
    losses: 10,
    contentUrl: "/images/white.png",
    speeds: [0.65, 0.72, 0.68, 0.70, 0.75],
    stats: {
      stamina: 70,
      agility: 75,
      bloodline: "Sewer Dweller"
    }
  },
  {
    id: "rat_5",
    name: "Nitro Squeaks",
    owner: "Player 5",
    gangId: "gang_2",
    ownerWallet: "0x0000000000000000000000000000000000000005",
    dob: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days ago
    gender: "male",
    wins: 18,
    placed: 9,
    losses: 4,
    contentUrl: "/images/pink.png",
    speeds: [0.85, 0.91, 0.87, 0.90, 0.93],
    stats: {
      stamina: 88,
      agility: 91,
      bloodline: "Underground Elite"
    }
  },
  {
    id: "rat_6",
    name: "Rocket Rodent",
    owner: "Player 6",
    gangId: "gang_3",
    ownerWallet: "0x0000000000000000000000000000000000000006",
    dob: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days ago
    gender: "female",
    wins: 14,
    placed: 11,
    losses: 6,
    contentUrl: "/images/brown.png",
    speeds: [0.82, 0.87, 0.84, 0.85, 0.88],
    stats: {
      stamina: 82,
      agility: 86,
      bloodline: "City Slicker"
    }
  }
];

// Mock race data
export const mockRace: Race = {
  id: "race_demo",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  prizePool: "1000",
  typename: "Race",
  price: "100",
  contentUrl: "/images/white.png", // Placeholder, no race banner locally
  title: "Street Championship",
  description: "The ultimate rat racing showdown in the neon-lit streets",
  seasonId: "season_1",
  winners: null,
  raceId: "race_demo",
  participants: mockParticipants,
  status: "active"
};

// Function to get a race by ID (returns mock data for any ID)
export function getMockRace(id: string): Race {
  return {
    ...mockRace,
    id,
    raceId: id
  };
}
