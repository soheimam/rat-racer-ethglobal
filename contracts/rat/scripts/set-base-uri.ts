/**
 * Script to set the base URI for RatNFT after deployment
 * 
 * Usage:
 * npx hardhat run scripts/set-base-uri.ts --network base
 * 
 * Make sure to:
 * 1. Deploy the contract first
 * 2. Set NEXT_PUBLIC_RAT_NFT_ADDRESS in .env
 * 3. Get your Vercel Blob Storage URL
 * 4. Run this script
 */

import { ethers } from "hardhat";

async function main() {
  // Get contract address from environment
  const RAT_NFT_ADDRESS = process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS;
  
  if (!RAT_NFT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_RAT_NFT_ADDRESS not set in .env");
  }

  console.log("Setting base URI for RatNFT at:", RAT_NFT_ADDRESS);

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // Get contract
  const RatNFT = await ethers.getContractAt("RatNFT", RAT_NFT_ADDRESS);

  // Base URI from Vercel Blob Storage
  // Format: https://[your-storage].public.blob.vercel-storage.com/rats/metadata/
  const BASE_URI = process.env.BLOB_STORAGE_BASE_URI;
  
  if (!BASE_URI) {
    throw new Error("BLOB_STORAGE_BASE_URI not set in .env");
  }

  console.log("\nSetting base URI to:", BASE_URI);

  // Set base URI
  const tx = await RatNFT.setBaseURI(BASE_URI);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("Transaction confirmed!");

  // Verify it was set
  const currentBaseURI = await RatNFT.baseURI();
  console.log("\nCurrent base URI:", currentBaseURI);

  // Test tokenURI for token #1 (if it exists)
  try {
    const totalMinted = await RatNFT.totalMinted();
    if (totalMinted > 0) {
      const tokenURI = await RatNFT.tokenURI(1);
      console.log("\nExample tokenURI(1):", tokenURI);
    }
  } catch (e) {
    console.log("\nNo tokens minted yet");
  }

  console.log("\n✓ Base URI set successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

