/**
 * Complete deployment script for Base Mainnet
 * 
 * Run with: npx hardhat run scripts/deploy-all.ts --network base
 */

import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("========================================");
  console.log("Rat Racer - Base Mainnet Deployment");
  console.log("========================================\n");

  console.log("Network:", hre.network.name);
  console.log("PRIVATE_KEY present:", !!process.env.PRIVATE_KEY);
  console.log("RPC_ENDPOINT:", process.env.NEXT_PUBLIC_RPC_ENDPOINT || "not set");

  const blobBaseUrl = process.env.BLOG_BASE_URL;
  if (!blobBaseUrl) {
    throw new Error("BLOG_BASE_URL not set in .env");
  }
  console.log("BLOG_BASE_URL:", blobBaseUrl);
  console.log("");

  const publicClient = await hre.viem.getPublicClient();
  const walletClients = await hre.viem.getWalletClients();

  console.log("Wallet clients length:", walletClients.length);

  if (walletClients.length === 0) {
    throw new Error("No wallet clients available. Check PRIVATE_KEY in .env");
  }

  const deployer = walletClients[0];
  console.log("Deploying contracts with account:", deployer.account.address);

  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log("Account balance:", formatEther(balance), "ETH\n");

  // 1. Deploy RatNFT with BLOB_BASE_URL for metadata
  console.log("1. Deploying RatNFT...");
  const ratNFT = await hre.viem.deployContract("RatNFT", [
    "Rat Racer NFT",
    "RATRACE",
    blobBaseUrl // Base URL for metadata from Blob Storage
  ]);
  console.log("✓ RatNFT deployed to:", ratNFT.address);
  console.log("");

  // 2. Deploy RaceToken
  console.log("2. Deploying RaceToken...");
  const raceToken = await hre.viem.deployContract("RaceToken", []);
  console.log("✓ RaceToken deployed to:", raceToken.address);
  console.log("  Initial supply: 10,000 RACE minted to deployer");
  console.log("");

  // 3. Deploy RaceManager
  console.log("3. Deploying RaceManager...");
  const raceManager = await hre.viem.deployContract("RaceManager", [ratNFT.address]);
  console.log("✓ RaceManager deployed to:", raceManager.address);
  console.log("");

  // Summary
  console.log("========================================");
  console.log("Deployment Complete!");
  console.log("========================================\n");
  console.log("Contract Addresses:");
  console.log("  RatNFT:        ", ratNFT.address);
  console.log("  RaceToken:     ", raceToken.address);
  console.log("  RaceManager:   ", raceManager.address);
  console.log("");
  console.log("Add these to your .env file:");
  console.log(`NEXT_PUBLIC_RAT_NFT_ADDRESS=${ratNFT.address}`);
  console.log(`NEXT_PUBLIC_RACE_TOKEN_ADDRESS=${raceToken.address}`);
  console.log(`NEXT_PUBLIC_RACE_MANAGER_ADDRESS=${raceManager.address}`);
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

