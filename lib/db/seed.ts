// Seed data for testing (development only)
import { RacesService } from './races';
import { RatsService } from './rats';
import { WalletsService } from './wallets';

/**
 * Seed database with test data
 * WARNING: Only use in development!
 */
export async function seedDatabase() {
    console.log('🌱 Seeding MongoDB database...');

    // Create test wallets
    const wallet1 = '0x1111111111111111111111111111111111111111';
    const wallet2 = '0x2222222222222222222222222222222222222222';
    const wallet3 = '0x3333333333333333333333333333333333333333';

    await WalletsService.getOrCreateWallet(wallet1);
    await WalletsService.getOrCreateWallet(wallet2);
    await WalletsService.getOrCreateWallet(wallet3);

    console.log('✅ Created 3 test wallets');

    // Create test rats
    const ratNames = [
        "Lightning Whiskers",
        "Shadow Dancer",
        "Turbo Tail",
        "Dizzy Paws",
        "Nitro Squeaks",
        "Rocket Rodent",
        "Speed Demon",
        "Urban Legend",
    ];

    const rats = [];
    for (let i = 0; i < ratNames.length; i++) {
        const owner = i < 3 ? wallet1 : i < 6 ? wallet2 : wallet3;
        const rat = await RatsService.createRat(owner, {
            name: ratNames[i],
            modelIndex: (i % 6) + 1,
            textureType: ["baseColor", "normal", "metallicRoughness"][i % 3] as any,
            imageUrl: ["/images/white.png", "/images/pink.png", "/images/brown.png"][i % 3],
            ...RatsService.generateRandomStats(),
            gender: i % 2 === 0 ? "male" : "female",
            dob: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
            wins: Math.floor(Math.random() * 20),
            placed: Math.floor(Math.random() * 10),
            losses: Math.floor(Math.random() * 5),
            level: Math.floor(Math.random() * 5) + 1,
        });
        rats.push(rat);
    }

    console.log(`✅ Created ${rats.length} test rats`);

    // Create test races
    const race1 = await RacesService.createRace({
        title: "Downtown Dash",
        description: "Race through the neon streets",
        entryFee: "0.01",
    });

    const race2 = await RacesService.createRace({
        title: "Neon Night Run",
        description: "Nighttime city racing",
        entryFee: "0.01",
    });

    console.log('✅ Created 2 test races');

    // Enter some rats into race1 (but don't fill it)
    for (let i = 0; i < 4; i++) {
        await RacesService.enterRace(race1.id, rats[i].id, rats[i].owner);
    }

    console.log('✅ Added 4 rats to race 1 (waiting for 2 more)');

    // Create and complete a past race
    const completedRace = await RacesService.createRace({
        title: "Historic Street Championship",
        description: "Already completed race",
        entryFee: "0.01",
    });

    // Fill race
    for (let i = 0; i < 6; i++) {
        await RacesService.enterRace(completedRace.id, rats[i].id, rats[i].owner);
    }

    // Complete it with results
    const results = rats.slice(0, 6).map((rat, i) => ({
        ratId: rat.id,
        finishTime: 10 + Math.random() * 5,
    }));

    await RacesService.completeRace(completedRace.id, results);

    console.log('✅ Created 1 completed race with results');

    console.log('🎉 MongoDB database seeded successfully!');
    
    return {
        wallets: [wallet1, wallet2, wallet3],
        rats,
        races: [race1, race2, completedRace],
    };
}

