/**
 * Deploy RaceToken (ERC20)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-race-token.ts --network base
 */

import hre from "hardhat";
import { formatUnits } from "viem";

async function main() {
    console.log('\n🎮 Deploying RaceToken...');
    console.log('═'.repeat(70));

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    console.log(`📋 Deployer: ${deployer.account.address}`);
    console.log(`🌐 Network: ${hre.network.name} (Chain ID: ${await publicClient.getChainId()})`);

    // Get deployer balance
    const balance = await publicClient.getBalance({ address: deployer.account.address });
    console.log(`💰 Deployer Balance: ${formatUnits(balance, 18)} ETH`);

    console.log('\n🔄 Deploying RaceToken...');

    const raceToken = await hre.viem.deployContract("RaceToken", []);

    console.log('✅ RaceToken deployed!');
    console.log(`📍 Address: ${raceToken.address}`);

    // Wait a bit for contract to propagate
    console.log('\n⏳ Waiting for contract propagation (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        // Verify token details
        const name = await raceToken.read.name();
        const symbol = await raceToken.read.symbol();
        const decimals = await raceToken.read.decimals();
        const totalSupply = await raceToken.read.totalSupply();
        const treasuryAddress = "0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830";
        const treasuryBalance = await raceToken.read.balanceOf([treasuryAddress]);

        console.log('\n📊 Token Details:');
        console.log('─'.repeat(70));
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Decimals: ${decimals}`);
        console.log(`Total Supply: ${formatUnits(totalSupply, Number(decimals))} ${symbol}`);
        console.log(`\nTreasury: ${treasuryAddress}`);
        console.log(`Treasury Balance: ${formatUnits(treasuryBalance, Number(decimals))} ${symbol}`);

        if (treasuryBalance === totalSupply) {
            console.log('✅ All tokens successfully minted to treasury!');
        } else {
            console.warn('⚠️  Warning: Treasury balance does not match total supply');
        }
    } catch (error) {
        console.log('\n⚠️  Could not verify details immediately (RPC delay)');
        console.log('Run this to verify manually:');
        console.log(`cast call ${raceToken.address} "balanceOf(address)" 0x584cb34c3d52Bf59219e4e836FeaF63D4F90c830 --rpc-url https://mainnet.base.org`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 Deployment Complete!');
    console.log('═'.repeat(70));

    console.log('\n📝 Next Steps:');
    console.log('1. Verify contract on BaseScan:');
    console.log(`   npx hardhat verify --network base ${raceToken.address}`);
    console.log('\n2. View on BaseScan:');
    console.log(`   https://basescan.org/token/${raceToken.address}`);
    console.log('\n3. Create Uniswap liquidity pool with ETH');
    console.log('\n4. Add RACE to approved list in RaceManager:');
    console.log(`   TOKEN_ADDRESS=${raceToken.address} \\`);
    console.log(`   RACE_MANAGER_ADDRESS=<your_race_manager> \\`);
    console.log(`   npx hardhat run scripts/manage-approved-tokens.ts --network base`);

    // Save deployment info
    console.log('\n💾 Save this address:');
    console.log(`export RACE_TOKEN_ADDRESS="${raceToken.address}"`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
