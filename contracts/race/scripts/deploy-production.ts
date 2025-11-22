import * as dotenv from "dotenv";
import hre from "hardhat";
import { formatEther, parseEther } from "viem";

dotenv.config({ path: "../../.env" });

async function main() {
  console.log("🚀 DEPLOYING TO BASE MAINNET - PRODUCTION");
  console.log("==========================================\n");

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const oracleAddress = process.env.ORACLE_ADDRESS;
  if (!oracleAddress) {
    throw new Error("ORACLE_ADDRESS not set in .env");
  }

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Oracle: ${oracleAddress}`);

  const balance = await publicClient.getBalance({
    address: deployer.account.address
  });
  console.log(`Balance: ${formatEther(balance)} ETH\n`);

  if (balance < parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment. Need at least 0.01 ETH");
  }

  // 1. Deploy RatNFTV2
  console.log("📦 Deploying RatNFTV2...");
  const ratNFT = await hre.viem.deployContract("RatNFTV2", [
    "Rat Racer",
    "RAT",
    "https://api.ratracer.xyz/rats/",
  ]);
  console.log(`✅ RatNFT deployed: ${ratNFT.address}`);
  console.log(`   Tx: ${ratNFT.address}\n`);

  // 2. Deploy RaceToken
  console.log("📦 Deploying RaceToken...");
  const raceToken = await hre.viem.deployContract("RaceToken", []);
  console.log(`✅ RaceToken deployed: ${raceToken.address}`);
  console.log(`   Initial supply: 1,000,000 RACE\n`);

  // 3. Deploy RaceManagerV2 with oracle
  console.log("📦 Deploying RaceManagerV2...");
  const raceManager = await hre.viem.deployContract("RaceManagerV2", [
    ratNFT.address,
    oracleAddress,
  ]);
  console.log(`✅ RaceManager deployed: ${raceManager.address}`);
  console.log(`   Linked to RatNFT: ${ratNFT.address}`);
  console.log(`   Oracle set to: ${oracleAddress}\n`);

  // 4. Set race manager in RatNFT (so it can update stats)
  console.log("🔧 Configuring RatNFT...");
  await ratNFT.write.setRaceManager([raceManager.address]);
  console.log(`✅ Race manager set in RatNFT\n`);

  // 5. Verify deployment
  console.log("🔍 Verifying deployment...");
  const ratNFTName = await ratNFT.read.name();
  const raceTokenName = await raceToken.read.name();
  const raceManagerRatNFT = await raceManager.read.ratNFT();
  const raceManagerOracle = await raceManager.read.oracle();

  console.log(`✓ RatNFT name: ${ratNFTName}`);
  console.log(`✓ RaceToken name: ${raceTokenName}`);
  console.log(`✓ RaceManager → RatNFT: ${raceManagerRatNFT}`);
  console.log(`✓ RaceManager → Oracle: ${raceManagerOracle}\n`);

  // 6. Print deployment info
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║           DEPLOYMENT SUCCESSFUL - SAVE THESE              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Contract Addresses:");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`RAT_NFT_ADDRESS="${ratNFT.address}"`);
  console.log(`RACE_TOKEN_ADDRESS="${raceToken.address}"`);
  console.log(`RACE_MANAGER_ADDRESS="${raceManager.address}"`);
  console.log(`ORACLE_ADDRESS="${oracleAddress}"`);
  console.log("─────────────────────────────────────────────────────────────\n");

  console.log("🔗 Block Explorer:");
  console.log(`RatNFT: https://basescan.org/address/${ratNFT.address}`);
  console.log(`RaceToken: https://basescan.org/address/${raceToken.address}`);
  console.log(`RaceManager: https://basescan.org/address/${raceManager.address}\n`);

  console.log("📝 Next Steps:");
  console.log("1. Update .env with contract addresses above");
  console.log("2. Update Vercel function with RACE_MANAGER_ADDRESS");
  console.log("3. Verify contracts on BaseScan:");
  console.log(`   npx hardhat verify --network base ${ratNFT.address} "Rat Racer" "RAT" "https://api.ratracer.xyz/rats/"`);
  console.log(`   npx hardhat verify --network base ${raceToken.address}`);
  console.log(`   npx hardhat verify --network base ${raceManager.address} ${ratNFT.address} ${oracleAddress}`);
  console.log("4. Update frontend with contract addresses\n");

  const finalBalance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  const gasUsed = balance - finalBalance;
  console.log(`💰 Gas used: ${formatEther(gasUsed)} ETH`);
  console.log(`💰 Remaining balance: ${formatEther(finalBalance)} ETH\n`);

  console.log("🎉 DEPLOYMENT COMPLETE!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

