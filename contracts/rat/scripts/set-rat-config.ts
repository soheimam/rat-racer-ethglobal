import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

/**
 * Set payment configuration for rat variants
 * This script configures which ERC20 token and price is required to mint each rat variant
 */
async function main() {
    const ratNFTAddress = process.env.RAT_NFT_ADDRESS;
    const raceTokenAddress = process.env.RACE_TOKEN_ADDRESS || '0xea4eaca6e4197ecd092ba77b5da768f19287e06f';

    if (!ratNFTAddress) {
        console.error('❌ RAT_NFT_ADDRESS environment variable is required');
        process.exit(1);
    }

    const [deployer] = await hre.viem.getWalletClients();

    console.log('\n🎮 Configuring Rat Variants');
    console.log('═'.repeat(70));
    console.log(`RatNFT: ${ratNFTAddress}`);
    console.log(`RACE Token: ${raceTokenAddress}`);
    console.log(`Owner: ${deployer.account.address}`);
    console.log('═'.repeat(70));

    const ratNFT = await hre.viem.getContractAt("RatNFT", ratNFTAddress as `0x${string}`);

    // Configuration for each rat variant
    const ratConfigs = [
        {
            imageIndex: 0,
            name: 'GHOST (White)',
            paymentToken: raceTokenAddress,
            price: parseUnits('1000', 18), // 1000 RACE tokens
        },
        {
            imageIndex: 1,
            name: 'MUDSLIDE (Brown)',
            paymentToken: raceTokenAddress,
            price: parseUnits('1000', 18), // 1000 RACE tokens
        },
        {
            imageIndex: 2,
            name: 'NEON (Pink)',
            paymentToken: raceTokenAddress,
            price: parseUnits('1000', 18), // 1000 RACE tokens
        },
    ];

    console.log('\n📋 Configuration to apply:');
    console.log('──────────────────────────────────────────────────────────────────────');
    for (const config of ratConfigs) {
        console.log(`${config.name}:`);
        console.log(`  Payment Token: ${config.paymentToken}`);
        console.log(`  Price: ${formatUnits(config.price, 18)} RACE`);
    }

    // Check current configuration
    console.log('\n📊 Current Configuration:');
    console.log('──────────────────────────────────────────────────────────────────────');
    for (const config of ratConfigs) {
        const [currentToken, currentPrice] = await ratNFT.read.getRatConfig([BigInt(config.imageIndex)]);
        console.log(`${config.name}:`);
        console.log(`  Current Token: ${currentToken}`);
        console.log(`  Current Price: ${currentPrice.toString()}`);
    }

    // Apply configuration
    console.log('\n🔄 Applying new configuration...');
    console.log('──────────────────────────────────────────────────────────────────────');

    for (const config of ratConfigs) {
        console.log(`\nConfiguring ${config.name}...`);

        const hash = await ratNFT.write.setRatConfig([
            BigInt(config.imageIndex),
            config.paymentToken as `0x${string}`,
            config.price,
        ], {
            account: deployer.account,
        });

        console.log(`  📝 Transaction: ${hash}`);

        const publicClient = await hre.viem.getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash });

        console.log(`  ✅ ${config.name} configured!`);
    }

    // Verify configuration
    console.log('\n✅ Verifying Configuration:');
    console.log('──────────────────────────────────────────────────────────────────────');
    for (const config of ratConfigs) {
        const [token, price] = await ratNFT.read.getRatConfig([BigInt(config.imageIndex)]);
        console.log(`${config.name}:`);
        console.log(`  Payment Token: ${token}`);
        console.log(`  Price: ${formatUnits(price, 18)} RACE`);

        const matches =
            token.toLowerCase() === config.paymentToken.toLowerCase() &&
            price === config.price;

        if (matches) {
            console.log(`  ✅ Configuration correct!`);
        } else {
            console.error(`  ❌ Configuration mismatch!`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 All rat variants configured!');
    console.log('═'.repeat(70));
    console.log('\n📝 Summary:');
    console.log('All 3 rat variants (0, 1, 2) now require 1000 RACE tokens to mint');
    console.log(`\nUsers must:`);
    console.log(`1. Approve RACE token spending on RatNFT contract`);
    console.log(`2. Call mint(address, imageIndex) to mint their rat`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

