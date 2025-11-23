import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

async function main() {
    const raceTokenAddress = '0xea4eaca6e4197ecd092ba77b5da768f19287e06f';
    const recipientAddress = '0xa41f6558a517e6ac35dea5a453273aa4f31cdacd';
    const amount = parseUnits('10000', 18); // 10,000 RACE

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    console.log('\n💸 Transferring RACE Tokens');
    console.log('═'.repeat(70));
    console.log(`From: ${deployer.account.address}`);
    console.log(`To: ${recipientAddress}`);
    console.log(`Amount: ${formatUnits(amount, 18)} RACE`);
    console.log('═'.repeat(70));

    const raceToken = await hre.viem.getContractAt(
        "TestRaceToken",
        raceTokenAddress as `0x${string}`
    );

    // Check sender balance
    const senderBalance = await raceToken.read.balanceOf([deployer.account.address]);
    console.log(`\n📊 Sender Balance: ${formatUnits(senderBalance, 18)} RACE`);

    if (senderBalance < amount) {
        console.error(`❌ Insufficient balance! Need ${formatUnits(amount, 18)} RACE`);
        process.exit(1);
    }

    // Transfer tokens
    console.log('\n🔄 Transferring tokens...');
    const hash = await raceToken.write.transfer([
        recipientAddress as `0x${string}`,
        amount
    ], {
        account: deployer.account,
    });

    console.log(`📝 Transaction: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Transfer complete!`);

    // Verify recipient balance
    const recipientBalance = await raceToken.read.balanceOf([recipientAddress as `0x${string}`]);
    console.log(`\n✅ Recipient Balance: ${formatUnits(recipientBalance, 18)} RACE`);

    console.log('\n' + '═'.repeat(70));
    console.log('🎉 Transfer Complete!');
    console.log('═'.repeat(70));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

