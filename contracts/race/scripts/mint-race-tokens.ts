/**
 * Mint RACE tokens to specified address
 * 
 * Usage:
 * npx hardhat run scripts/mint-race-tokens.ts --network base
 */

import hre from "hardhat";
import { formatUnits, parseUnits } from "viem";

const RACE_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_RACE_TOKEN_ADDRESS || "0x727f6cfD60c827A5a78d3d21DC567121031Cc560") as `0x${string}`;
const TARGET_WALLET = "0xa41f6558a517e6ac35dea5a453273aa4f31cdacd" as `0x${string}`;
const AMOUNT = parseUnits("10000", 18); // 10,000 RACE tokens

async function main() {
    console.log("========================================");
    console.log("Minting RACE Tokens");
    console.log("========================================\n");

    const [signer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    console.log("Minting from account:", signer.account.address);
    console.log("Target wallet:", TARGET_WALLET);
    console.log("Amount:", formatUnits(AMOUNT, 18), "RACE\n");

    // Get RaceToken contract
    const raceToken = await hre.viem.getContractAt("RaceToken", RACE_TOKEN_ADDRESS);

    // Check current balance
    const balanceBefore = await raceToken.read.balanceOf([TARGET_WALLET]);
    console.log("Balance before:", formatUnits(balanceBefore, 18), "RACE");

    // Mint tokens
    console.log("\nMinting tokens...");
    const hash = await raceToken.write.mint([TARGET_WALLET, AMOUNT]);
    console.log("Transaction hash:", hash);

    console.log("Waiting for confirmation...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Transaction confirmed! Block:", receipt.blockNumber, "\n");

    // Check new balance
    const balanceAfter = await raceToken.read.balanceOf([TARGET_WALLET]);
    console.log("Balance after:", formatUnits(balanceAfter, 18), "RACE");
    console.log("Tokens minted:", formatUnits(balanceAfter - balanceBefore, 18), "RACE\n");

    console.log("========================================");
    console.log("Success!");
    console.log("========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
