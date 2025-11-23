import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

async function main() {
    const ratNFTAddress = '0x38f66760ada4c01bc5a4a7370882f0aee7090674';
    const raceTokenAddress = '0xea4eaca6e4197ecd092ba77b5da768f19287e06f';
    const price = parseUnits('1000', 18);

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    console.log('\n🎮 Finishing Rat Configuration');
    console.log('═'.repeat(70));

    const ratNFT = await hre.viem.getContractAt("RatNFT", ratNFTAddress as `0x${string}`);

    // Configure rat 1 (brown)
    console.log('\n🐀 Configuring Rat 1 (MUDSLIDE - Brown)...');
    const hash1 = await ratNFT.write.setRatConfig([
        BigInt(1),
        raceTokenAddress as `0x${string}`,
        price,
    ], { account: deployer.account });
    console.log(`  📝 Transaction: ${hash1}`);
    await publicClient.waitForTransactionReceipt({ hash: hash1 });
    console.log(`  ✅ Configured!`);

    console.log('\n⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Configure rat 2 (pink)
    console.log('\n🐀 Configuring Rat 2 (NEON - Pink)...');
    const hash2 = await ratNFT.write.setRatConfig([
        BigInt(2),
        raceTokenAddress as `0x${string}`,
        price,
    ], { account: deployer.account });
    console.log(`  📝 Transaction: ${hash2}`);
    await publicClient.waitForTransactionReceipt({ hash: hash2 });
    console.log(`  ✅ Configured!`);

    // Verify all configurations
    console.log('\n✅ Verifying Configuration:');
    console.log('─'.repeat(70));
    const rats = ['GHOST (White)', 'MUDSLIDE (Brown)', 'NEON (Pink)'];
    for (let i = 0; i < 3; i++) {
        const [token, mintPrice] = await ratNFT.read.getRatConfig([BigInt(i)]);
        console.log(`${rats[i]}:`);
        console.log(`  Token: ${token}`);
        console.log(`  Price: ${formatUnits(mintPrice, 18)} RACE`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 All rats configured with 1000 RACE mint price!');
    console.log('═'.repeat(70));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

