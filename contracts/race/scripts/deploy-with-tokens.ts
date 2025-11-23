/**
 * Deployment script with pre-configured supported tokens
 * This ensures the contracts are deployed with knowledge of supported tokens
 */

import * as dotenv from "dotenv";
import hre from "hardhat";
import { parseUnits } from "viem";
dotenv.config({ path: "../../.env" });

// Supported tokens for Base Mainnet
// These match the tokens in lib/tokens.ts
const SUPPORTED_TOKENS = [
    {
        symbol: 'RACE',
        name: 'Race Token',
        address: process.env.NEXT_PUBLIC_RACE_TOKEN_ADDRESS,
    },
    {
        symbol: 'MCADE',
        name: 'MetaCade',
        address: '0xc48823ec67720a04a9dfd8c7d109b2c3d6622094',
    },
];

async function main() {
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║  RAT RACER CONTRACTS - BASE MAINNET DEPLOYMENT                 ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    const [deployer] = await hre.viem.getWalletClients();
    console.log("Deploying from:", deployer.account.address);
    console.log();

    // Display supported tokens
    console.log("📋 SUPPORTED TOKENS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    SUPPORTED_TOKENS.forEach(token => {
        console.log(`  ${token.symbol.padEnd(6)} - ${token.name}`);
        console.log(`  ${token.address}`);
        console.log();
    });

    // Deploy RaceToken (if needed)
    console.log("1️⃣  Deploying RaceToken...");
    const raceToken = await hre.viem.deployContract("RaceToken");
    console.log("✅ RaceToken deployed to:", raceToken.address);
    console.log();

    // Deploy RatNFT
    console.log("2️⃣  Deploying RatNFT...");

    // Get RACE token address (deployed or from env)
    const raceTokenAddress = process.env.NEXT_PUBLIC_RACE_TOKEN_ADDRESS || raceToken.address;

    // Initial configuration: All 3 rat types use RACE token at 100 RACE per mint
    const initialPaymentTokens = [raceTokenAddress, raceTokenAddress, raceTokenAddress];
    const initialMintPrices = [
        parseUnits("100", 18),
        parseUnits("100", 18),
        parseUnits("100", 18)
    ];

    const ratNFT = await hre.viem.deployContract("RatNFT", [
        "Rat Racer",
        "RAT",
        process.env.BLOB_BASE_URL || "",
        initialPaymentTokens,
        initialMintPrices
    ]);
    console.log("✅ RatNFT deployed to:", ratNFT.address);
    console.log();

    // Deploy RaceManager
    console.log("3️⃣  Deploying RaceManager...");
    const raceManager = await hre.viem.deployContract("RaceManager", [ratNFT.address]);
    console.log("✅ RaceManager deployed to:", raceManager.address);
    console.log();

    // Summary
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║  DEPLOYMENT SUMMARY                                            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log();
    console.log("Contract Addresses:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`RaceToken:    ${raceToken.address}`);
    console.log(`RatNFT:       ${ratNFT.address}`);
    console.log(`RaceManager:  ${raceManager.address}`);
    console.log();
    console.log("Environment Variables for .env:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`NEXT_PUBLIC_RACE_TOKEN_ADDRESS=${raceToken.address}`);
    console.log(`NEXT_PUBLIC_RAT_NFT_ADDRESS=${ratNFT.address}`);
    console.log(`NEXT_PUBLIC_RACE_MANAGER_ADDRESS=${raceManager.address}`);
    console.log();
    console.log("Supported Entry Tokens:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    SUPPORTED_TOKENS.forEach(token => {
        console.log(`  ✓ ${token.symbol}: ${token.address}`);
    });
    console.log();
    console.log("Next Steps:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Update .env with contract addresses above");
    console.log("2. Verify contracts on Basescan");
    console.log("3. Users can create races with RACE or MCADE tokens");
    console.log("4. Configure webhooks for contract events");
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

