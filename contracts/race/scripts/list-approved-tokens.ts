/**
 * List approved tokens for RaceManager on Base
 * 
 * Usage:
 *   RACE_MANAGER_ADDRESS=0x... npx hardhat run scripts/list-approved-tokens.ts --network base
 */

import hre from "hardhat";

// Base mainnet tokens only
const BASE_TOKENS: Record<string, string> = {
    'RACE': '0xea4eaca6e4197ecd092ba77b5da768f19287e06f',
    'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Native USDC on Base
};

async function main() {
    const raceManagerAddress = process.env.RACE_MANAGER_ADDRESS || '0x9d07422f77d78e9f455e4ca5093b8230c4869c2d';

    console.log('\n🎮 Approved Tokens for Racing');
    console.log('═'.repeat(70));
    console.log(`RaceManager: ${raceManagerAddress}`);
    console.log(`Network: Base Mainnet`);
    console.log('═'.repeat(70));

    const raceManager = await hre.viem.getContractAt("RaceManager", raceManagerAddress as `0x${string}`);

    console.log('\n📊 Token Status:');
    console.log('─'.repeat(70));

    const approvedTokens: Array<{ name: string; address: string }> = [];

    for (const [name, address] of Object.entries(BASE_TOKENS)) {
        try {
            const isApproved = await raceManager.read.isTokenApproved([address as `0x${string}`]);
            const status = isApproved ? '✅ APPROVED' : '❌ Not Approved';
            console.log(`${name.padEnd(15)} ${address}  ${status}`);

            if (isApproved) {
                approvedTokens.push({ name, address });
            }
        } catch (error) {
            console.log(`${name.padEnd(15)} ${address}  ⚠️  Error`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ Approved Tokens: ${approvedTokens.length} / ${Object.keys(BASE_TOKENS).length}`);

    if (approvedTokens.length > 0) {
        console.log('\n📝 Users can create races with:');
        approvedTokens.forEach(({ name, address }) => {
            console.log(`  • ${name}: ${address}`);
        });
    } else {
        console.log('\n⚠️  No tokens approved yet');
        console.log('   Run: TOKEN_ADDRESS=0x... npx hardhat run scripts/manage-approved-tokens.ts');
    }

    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
