import hre from "hardhat";
import { formatEther, parseEther } from "viem";

async function main() {
  console.log("🐀 Deploying Rat Racer Contracts...\n");

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log(`Deploying from: ${deployer.account.address}`);
  console.log(
    `Balance: ${formatEther(
      await publicClient.getBalance({ address: deployer.account.address })
    )} ETH\n`
  );

  // 1. Deploy RatNFT
  console.log("📦 Deploying RatNFT...");
  const ratNFT = await hre.viem.deployContract("RatNFT", [
    "Rat Racer NFT",
    "RAT",
    "https://api.ratracer.xyz/rats/",
  ]);
  console.log(`✅ RatNFT deployed to: ${ratNFT.address}\n`);

  // 2. Deploy RaceToken
  console.log("📦 Deploying RaceToken...");
  const raceToken = await hre.viem.deployContract("RaceToken", []);
  console.log(`✅ RaceToken deployed to: ${raceToken.address}\n`);

  // 3. Deploy RaceManager
  console.log("📦 Deploying RaceManager...");
  const raceManager = await hre.viem.deployContract("RaceManager", [
    ratNFT.address,
  ]);
  console.log(`✅ RaceManager deployed to: ${raceManager.address}\n`);

  // Verify deployment
  console.log("🔍 Verifying deployment...");

  const ratNFTName = await ratNFT.read.name();
  const raceTokenName = await raceToken.read.name();
  const raceManagerRatNFT = await raceManager.read.ratNFT();

  console.log(`RatNFT name: ${ratNFTName}`);
  console.log(`RaceToken name: ${raceTokenName}`);
  console.log(`RaceManager linked to RatNFT: ${raceManagerRatNFT}\n`);

  // Print contract addresses for frontend
  console.log("📋 Contract Addresses (save these for frontend):");
  console.log("─────────────────────────────────────────────");
  console.log(`RAT_NFT_ADDRESS="${ratNFT.address}"`);
  console.log(`RACE_TOKEN_ADDRESS="${raceToken.address}"`);
  console.log(`RACE_MANAGER_ADDRESS="${raceManager.address}"`);
  console.log("─────────────────────────────────────────────\n");

  // Optional: Mint some test rats and tokens
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("🎮 Setting up test environment...\n");

    // Mint 6 test rats
    console.log("Minting test rats...");
    const colors = ["Brown", "Pink", "White", "Grey", "Black", "Spotted"];
    for (let i = 0; i < 6; i++) {
      await ratNFT.write.mint([
        deployer.account.address,
        `Test Rat ${colors[i]}`,
        i,
      ]);
      console.log(`  ✓ Minted rat #${i}: ${colors[i]}`);
    }

    // Get some RACE tokens
    console.log("\nGetting RACE tokens from faucet...");
    const initialBalance = await raceToken.read.balanceOf([
      deployer.account.address,
    ]);
    console.log(`  Current balance: ${formatEther(initialBalance)} RACE\n`);

    console.log("✅ Test environment ready!");
    console.log("\nYou can now:");
    console.log("  1. Create a race: raceManager.createRace(1, raceToken, fee)");
    console.log("  2. Enter with your rats");
    console.log("  3. Start and finish races\n");
  }

  console.log("🎉 Deployment complete!\n");

  // Print gas usage summary
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`Final balance: ${formatEther(balance)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

