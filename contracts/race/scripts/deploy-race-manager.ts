/**
 * Deploy RaceManager contract
 * 
 * Requires RatNFT to be deployed first
 * 
 * Usage:
 *   RAT_NFT_ADDRESS=0x... npx hardhat run scripts/deploy-race-manager.ts --network base
 */

import hre from "hardhat";
import { formatUnits } from "viem";

const RAT_NFT_ADDRESS = process.env.RAT_NFT_ADDRESS || "0xd30d37393d5572842c1a1f36c449eaec91834cd2";
const RACE_TOKEN_ADDRESS = "0xea4eaca6e4197ecd092ba77b5da768f19287e06f";

async function main() {
    console.log('\n🏁 Deploying RaceManager...');
    console.log('═'.repeat(70));

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    console.log(`📋 Deployer: ${deployer.account.address}`);
    console.log(`🌐 Network: ${hre.network.name} (Chain ID: ${await publicClient.getChainId()})`);

    const balance = await publicClient.getBalance({ address: deployer.account.address });
    console.log(`💰 Deployer Balance: ${formatUnits(balance, 18)} ETH`);
    console.log(`🐀 RatNFT: ${RAT_NFT_ADDRESS}`);
    console.log(`🎫 RaceToken: ${RACE_TOKEN_ADDRESS}`);

    console.log('\n🔄 Deploying RaceManager...');

    const raceManager = await hre.viem.deployContract("RaceManager", [
        RAT_NFT_ADDRESS,
    ]);

    console.log('✅ RaceManager deployed!');
    console.log(`📍 Address: ${raceManager.address}`);

    // Wait for propagation
    console.log('\n⏳ Waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Approve RACE token
    console.log('\n🔄 Approving RACE token...');
    const hash = await raceManager.write.addApprovedToken([RACE_TOKEN_ADDRESS]);
    console.log(`📝 Transaction: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ RACE token approved!`);

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 Deployment Complete!');
    console.log('═'.repeat(70));

    console.log('\n📋 Contract Addresses:');
    console.log(`RatNFT:      ${RAT_NFT_ADDRESS}`);
    console.log(`RaceManager: ${raceManager.address}`);
    console.log(`RaceToken:   ${RACE_TOKEN_ADDRESS}`);

    console.log('\n📝 Next Steps:');
    console.log('1. Verify contract on BaseScan:');
    console.log(`   npx hardhat verify --network base ${raceManager.address} ${RAT_NFT_ADDRESS}`);

    console.log('\n2. Add more approved tokens (USDC, ETH, etc):');
    console.log(`   TOKEN_ADDRESS=0x... \\`);
    console.log(`   RACE_MANAGER_ADDRESS=${raceManager.address} \\`);
    console.log(`   npx hardhat run scripts/manage-approved-tokens.ts --network base`);

    console.log('\n3. View on BaseScan:');
    console.log(`   https://basescan.org/address/${raceManager.address}`);

    console.log('\n💾 Save this address:');
    console.log(`export RACE_MANAGER_ADDRESS="${raceManager.address}"`);

    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

