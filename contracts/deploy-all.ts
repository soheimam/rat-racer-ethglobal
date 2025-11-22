/**
 * Complete deployment script for Base Mainnet
 * 
 * Run with: npx hardhat run deploy-all.ts --network base
 */

import { ethers } from "hardhat";

async function main() {
    console.log("========================================");
    console.log("Rat Racer - Base Mainnet Deployment");
    console.log("========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // 1. Deploy RatNFT
    console.log("1. Deploying RatNFT...");
    const RatNFT = await ethers.getContractFactory("RatNFT");
    const ratNFT = await RatNFT.deploy();
    await ratNFT.waitForDeployment();
    const ratNFTAddress = await ratNFT.getAddress();
    console.log("✓ RatNFT deployed to:", ratNFTAddress);
    console.log("");

    // 2. Deploy RaceToken
    console.log("2. Deploying RaceToken...");
    const RaceToken = await ethers.getContractFactory("RaceToken");
    const raceToken = await RaceToken.deploy();
    await raceToken.waitForDeployment();
    const raceTokenAddress = await raceToken.getAddress();
    console.log("✓ RaceToken deployed to:", raceTokenAddress);

    const tokenBalance = await raceToken.balanceOf(deployer.address);
    console.log("  Deployer token balance:", ethers.formatEther(tokenBalance), "RACE");
    console.log("");

    // 3. Deploy RaceManager
    console.log("3. Deploying RaceManager...");
    const RaceManager = await ethers.getContractFactory("RaceManager");
    const raceManager = await RaceManager.deploy(ratNFTAddress);
    await raceManager.waitForDeployment();
    const raceManagerAddress = await raceManager.getAddress();
    console.log("✓ RaceManager deployed to:", raceManagerAddress);
    console.log("");

    // Summary
    console.log("========================================");
    console.log("Deployment Complete!");
    console.log("========================================\n");
    console.log("Contract Addresses:");
    console.log("  RatNFT:        ", ratNFTAddress);
    console.log("  RaceToken:     ", raceTokenAddress);
    console.log("  RaceManager:   ", raceManagerAddress);
    console.log("");
    console.log("Add these to your .env file:");
    console.log(`NEXT_PUBLIC_RAT_NFT_ADDRESS=${ratNFTAddress}`);
    console.log(`NEXT_PUBLIC_RACE_TOKEN_ADDRESS=${raceTokenAddress}`);
    console.log(`NEXT_PUBLIC_RACE_MANAGER_ADDRESS=${raceManagerAddress}`);
    console.log("");
    console.log("Next Steps:");
    console.log("1. Set baseURI on RatNFT (after Blob Storage setup)");
    console.log("2. Configure webhooks (Alchemy/QuickNode)");
    console.log("3. Mint test rats to wallets");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

