/**
 * Deploy RatNFT and RaceManager contracts
 * 
 * RaceToken is already deployed at: 0xea4eaca6e4197ecd092ba77b5da768f19287e06f
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-all.ts --network base
 */

import hre from "hardhat";
import { formatUnits } from "viem";

const RACE_TOKEN_ADDRESS = "0xea4eaca6e4197ecd092ba77b5da768f19287e06f";

async function main() {
  console.log('\n🎮 Deploying Rat Racer Contracts');
  console.log('═'.repeat(70));

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log(`📋 Deployer: ${deployer.account.address}`);
  console.log(`🌐 Network: ${hre.network.name} (Chain ID: ${await publicClient.getChainId()})`);

  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Deployer Balance: ${formatUnits(balance, 18)} ETH`);
  console.log(`🎫 RACE Token: ${RACE_TOKEN_ADDRESS}`);

  // Step 1: Deploy RatNFT
  console.log('\n' + '─'.repeat(70));
  console.log('📦 Step 1: Deploying RatNFT...');
  console.log('─'.repeat(70));

  const ratNFT = await hre.viem.deployContract("RatNFT", [
    "Rat Racer", // name
    "RAT", // symbol
    process.env.BLOB_BASE_URL || "https://placeholder.com/metadata/", // baseTokenURI (will be updated)
  ]);

  console.log(`✅ RatNFT deployed: ${ratNFT.address}`);

  // Step 2: Deploy RaceManager
  console.log('\n' + '─'.repeat(70));
  console.log('📦 Step 2: Deploying RaceManager...');
  console.log('─'.repeat(70));

  const raceManager = await hre.viem.deployContract("RaceManager", [
    ratNFT.address,
  ]);

  console.log(`✅ RaceManager deployed: ${raceManager.address}`);

  // Step 3: Approve RACE token in RaceManager
  console.log('\n' + '─'.repeat(70));
  console.log('📦 Step 3: Approving RACE token...');
  console.log('─'.repeat(70));

  const hash = await raceManager.write.addApprovedToken([RACE_TOKEN_ADDRESS]);
  console.log(`📝 Transaction: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ RACE token approved in RaceManager`);

  // Step 4: Transfer RatNFT ownership (optional)
  // Keeping deployer as owner for now

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('🎉 Deployment Complete!');
  console.log('═'.repeat(70));

  console.log('\n📋 Contract Addresses:');
  console.log(`RatNFT:       ${ratNFT.address}`);
  console.log(`RaceManager:  ${raceManager.address}`);
  console.log(`RaceToken:    ${RACE_TOKEN_ADDRESS} (already deployed)`);

  console.log('\n📝 Next Steps:');
  console.log('─'.repeat(70));

  console.log('\n1. Set RatNFT Base URI (after deployment):');
  console.log(`   cd ../rat`);
  console.log(`   RAT_NFT_ADDRESS=${ratNFT.address} \\`);
  console.log(`   BLOB_BASE_URL=\${BLOB_BASE_URL} \\`);
  console.log(`   npx hardhat run scripts/set-base-uri.ts --network base`);

  console.log('\n2. Verify contracts on BaseScan:');
  console.log(`   npx hardhat verify --network base ${ratNFT.address} \\`);
  console.log(`     "Rat Racer" "RAT" "${process.env.BLOB_BASE_URL || 'https://placeholder.com/metadata/'}"`);
  console.log(`   npx hardhat verify --network base ${raceManager.address} ${ratNFT.address}`);

  console.log('\n3. Update .env with addresses:');
  console.log(`   RAT_NFT_ADDRESS="${ratNFT.address}"`);
  console.log(`   RACE_MANAGER_ADDRESS="${raceManager.address}"`);
  console.log(`   RACE_TOKEN_ADDRESS="${RACE_TOKEN_ADDRESS}"`);

  console.log('\n4. Add more approved tokens (if needed):');
  console.log(`   TOKEN_ADDRESS=0x... \\`);
  console.log(`   RACE_MANAGER_ADDRESS=${raceManager.address} \\`);
  console.log(`   npx hardhat run scripts/manage-approved-tokens.ts --network base`);

  console.log('\n5. View on BaseScan:');
  console.log(`   RatNFT:      https://basescan.org/address/${ratNFT.address}`);
  console.log(`   RaceManager: https://basescan.org/address/${raceManager.address}`);

  console.log('\n💾 Save these for frontend:');
  console.log(`export RAT_NFT_ADDRESS="${ratNFT.address}"`);
  console.log(`export RACE_MANAGER_ADDRESS="${raceManager.address}"`);
  console.log(`export RACE_TOKEN_ADDRESS="${RACE_TOKEN_ADDRESS}"`);

  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
