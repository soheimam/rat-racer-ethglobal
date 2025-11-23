/**
 * Script to manage approved tokens for RaceManager
 * 
 * Usage:
 *   # Add token
 *   npx hardhat run scripts/manage-approved-tokens.ts --network sepolia
 *   
 *   # Set ACTION=remove in env to remove
 *   ACTION=remove TOKEN_ADDRESS=0x... npx hardhat run scripts/manage-approved-tokens.ts --network sepolia
 */

import hre from "hardhat";

async function main() {
    const action = process.env.ACTION || 'add'; // 'add' or 'remove'
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const raceManagerAddress = process.env.RACE_MANAGER_ADDRESS;

    if (!tokenAddress) {
        console.error('❌ TOKEN_ADDRESS environment variable is required');
        process.exit(1);
    }

    if (!raceManagerAddress) {
        console.error('❌ RACE_MANAGER_ADDRESS environment variable is required');
        process.exit(1);
    }

    console.log('\n🎮 Race Token Manager');
    console.log('═'.repeat(50));
    console.log(`Action: ${action}`);
    console.log(`Token: ${tokenAddress}`);
    console.log(`RaceManager: ${raceManagerAddress}`);
    console.log('═'.repeat(50));

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const raceManager = await hre.viem.getContractAt("RaceManager", raceManagerAddress as `0x${string}`);

    // Check current admin
    const admin = await raceManager.read.admin();
    console.log(`\n📋 Current admin: ${admin}`);
    console.log(`📋 Your address: ${deployer.account.address}`);

    if (admin.toLowerCase() !== deployer.account.address.toLowerCase()) {
        console.error(`\n❌ You are not the admin! Admin is: ${admin}`);
        process.exit(1);
    }

    // Check current approval status
    const isApproved = await raceManager.read.isTokenApproved([tokenAddress as `0x${string}`]);
    console.log(`\n📊 Token currently approved: ${isApproved}`);

    if (action === 'add') {
        if (isApproved) {
            console.log('✅ Token is already approved');
            return;
        }

        console.log('\n🔄 Adding token to approved list...');
        const hash = await raceManager.write.addApprovedToken([tokenAddress as `0x${string}`]);
        console.log(`📝 Transaction hash: ${hash}`);

        console.log('⏳ Waiting for confirmation...');
        await publicClient.waitForTransactionReceipt({ hash });

        console.log('✅ Token approved successfully!');
    } else if (action === 'remove') {
        if (!isApproved) {
            console.log('⚠️  Token is not approved');
            return;
        }

        console.log('\n🔄 Removing token from approved list...');
        const hash = await raceManager.write.removeApprovedToken([tokenAddress as `0x${string}`]);
        console.log(`📝 Transaction hash: ${hash}`);

        console.log('⏳ Waiting for confirmation...');
        await publicClient.waitForTransactionReceipt({ hash });

        console.log('✅ Token removed successfully!');
    } else {
        console.error(`\n❌ Invalid action: ${action}. Must be 'add' or 'remove'`);
        process.exit(1);
    }

    // Verify final state
    const finalStatus = await raceManager.read.isTokenApproved([tokenAddress as `0x${string}`]);
    console.log(`\n📊 Final token status: ${finalStatus ? 'APPROVED ✅' : 'NOT APPROVED ❌'}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

