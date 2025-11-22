import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

/**
 * Complete deployment module for all contracts
 * 
 * Deployment order:
 * 1. RaceToken (ERC20) - Mints 10,000 RACE to deployer
 * 2. RatNFT (ERC721) - Requires RaceToken address, initial mint price 100 RACE
 * 3. RaceManager - Requires RatNFT address
 * 
 * Usage:
 * cd contracts/race
 * npx hardhat ignition deploy ./ignition/modules/DeployAll.ts --network base
 */
const DeployAllModule = buildModule("DeployAllModule", (m) => {
  // Step 1: Deploy RaceToken
  const raceToken = m.contract("RaceToken", []);

  // Step 2: Deploy RatNFT
  const ratName = m.getParameter("ratName", "Street Racer Rat");
  const ratSymbol = m.getParameter("ratSymbol", "RAT");
  const baseTokenURI = m.getParameter("baseTokenURI", "https://klucbriwtfivi0tj.public.blob.vercel-storage.com/rats/metadata/");
  const initialMintPrice = m.getParameter("initialMintPrice", parseUnits("100", 18)); // 100 RACE

  const ratNFT = m.contract("RatNFT", [ratName, ratSymbol, baseTokenURI, raceToken, initialMintPrice], {
    after: [raceToken],
  });

  // Step 3: Deploy RaceManager
  const raceManager = m.contract("RaceManager", [ratNFT], {
    after: [ratNFT],
  });

  return { raceToken, ratNFT, raceManager };
});

export default DeployAllModule;

