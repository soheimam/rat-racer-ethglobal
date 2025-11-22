import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";

/**
 * Deployment module for RatNFT
 * 
 * Constructor args:
 * - name: NFT collection name
 * - symbol: NFT symbol
 * - baseTokenURI: Vercel Blob Storage URL for metadata
 * - raceToken: Address of RACE token (ERC20) used for minting
 * - initialMintPrice: Initial mint price in RACE tokens (100 RACE = 100 * 10^18)
 * 
 * Deployment:
 * npx hardhat ignition deploy ./ignition/modules/RatNFT.ts --network base
 */
const RatNFTModule = buildModule("RatNFTModule", (m) => {
  const name = m.getParameter("name", "Street Racer Rat");
  const symbol = m.getParameter("symbol", "RAT");
  const baseTokenURI = m.getParameter("baseTokenURI", "https://klucbriwtfivi0tj.public.blob.vercel-storage.com/rats/metadata/");
  const raceToken = m.getParameter("raceToken", "0x909cd2621513aD132ff33007EbaE88D727C5c0d4"); // RACE token address
  const initialMintPrice = m.getParameter("initialMintPrice", parseUnits("100", 18)); // 100 RACE tokens

  const ratNFT = m.contract("RatNFT", [name, symbol, baseTokenURI, raceToken, initialMintPrice]);

  return { ratNFT };
});

export default RatNFTModule;
