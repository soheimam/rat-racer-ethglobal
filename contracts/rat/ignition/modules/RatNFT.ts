import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for RatNFT
 * 
 * After deployment, you MUST call setBaseURI() with your Vercel Blob Storage URL:
 * 
 * npx hardhat ignition deploy ./ignition/modules/RatNFT.ts --network base
 * 
 * Then set base URI:
 * npx hardhat run scripts/set-base-uri.ts --network base
 * 
 * Base URI format:
 * https://[your-blob-storage].public.blob.vercel-storage.com/rats/metadata/
 */
const RatNFTModule = buildModule("RatNFTModule", (m) => {
  const name = m.getParameter("name", "Street Racer Rat");
  const symbol = m.getParameter("symbol", "RAT");
  const baseTokenURI = m.getParameter("baseTokenURI", "https://klucbriwtfivi0tj.public.blob.vercel-storage.com/");

  const ratNFT = m.contract("RatNFT", [name, symbol, baseTokenURI]);

  return { ratNFT };
});

export default RatNFTModule;
