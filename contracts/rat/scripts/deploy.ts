/**
 * Deploy RatNFT contract
 * 
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network base
 */

import hre from "hardhat";
import { formatUnits } from "viem";

async function main() {
    console.log('\n🐀 Deploying RatNFT...');
    console.log('═'.repeat(70));

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    console.log(`📋 Deployer: ${deployer.account.address}`);
    console.log(`🌐 Network: ${hre.network.name} (Chain ID: ${await publicClient.getChainId()})`);

    const balance = await publicClient.getBalance({ address: deployer.account.address });
    console.log(`💰 Deployer Balance: ${formatUnits(balance, 18)} ETH`);

    const baseTokenURI = process.env.BLOB_BASE_URL || "https://placeholder.com/metadata/";
    console.log(`📂 Base Token URI: ${baseTokenURI}`);

    console.log('\n🔄 Deploying RatNFT...');

    const ratNFT = await hre.viem.deployContract("RatNFT", [
        "Rat Racer", // name
        "RAT", // symbol
        baseTokenURI, // baseTokenURI
    ]);

    console.log('✅ RatNFT deployed!');
    console.log(`📍 Address: ${ratNFT.address}`);

    // Wait for propagation
    console.log('\n⏳ Waiting 5 seconds for contract propagation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        const name = await ratNFT.read.name();
        const symbol = await ratNFT.read.symbol();
        const nextTokenId = await ratNFT.read.nextTokenId();

        console.log('\n📊 Contract Details:');
        console.log('─'.repeat(70));
        console.log(`Name: ${name}`);
        console.log(`Symbol: ${symbol}`);
        console.log(`Next Token ID: ${nextTokenId}`);
        console.log(`Base URI: ${baseTokenURI}`);
    } catch (error) {
        console.log('\n⚠️  Could not verify details immediately (RPC delay)');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 Deployment Complete!');
    console.log('═'.repeat(70));

    console.log('\n📝 Next Steps:');
    console.log('1. Verify contract on BaseScan:');
    console.log(`   npx hardhat verify --network base ${ratNFT.address} \\`);
    console.log(`     "Rat Racer" "RAT" "${baseTokenURI}"`);

    console.log('\n2. Set Base URI (if BLOB_BASE_URL was not set):');
    console.log(`   RAT_NFT_ADDRESS=${ratNFT.address} \\`);
    console.log(`   BLOB_BASE_URL=\${BLOB_BASE_URL} \\`);
    console.log(`   npx hardhat run scripts/set-base-uri.ts --network base`);

    console.log('\n3. View on BaseScan:');
    console.log(`   https://basescan.org/address/${ratNFT.address}`);

    console.log('\n💾 Save this address:');
    console.log(`export RAT_NFT_ADDRESS="${ratNFT.address}"`);

    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

