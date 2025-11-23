import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

async function main() {
    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const ratNFT = await hre.viem.getContractAt("RatNFT", "0xdc0c8875fe628f04c79ae24aa4893e6bd0efd292" as `0x${string}`);

    console.log("\n🐀 Configuring Rat 2 (NEON - Pink)...");
    const hash = await ratNFT.write.setRatConfig([
        BigInt(2),
        "0xea4eaca6e4197ecd092ba77b5da768f19287e06f" as `0x${string}`,
        parseUnits('1000', 18),
    ], { account: deployer.account });

    console.log(`📝 Transaction: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Confirmed!`);

    console.log("\n⏳ Waiting 5 seconds for propagation...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    const [token, price] = await ratNFT.read.getRatConfig([BigInt(2)]);
    console.log(`\n✅ Rat 2 Config:`);
    console.log(`  Token: ${token}`);
    console.log(`  Price: ${formatUnits(price, 18)} RACE`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

