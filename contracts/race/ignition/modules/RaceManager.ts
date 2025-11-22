import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for RaceManager
 * 
 * IMPORTANT: Set NEXT_PUBLIC_RAT_NFT_ADDRESS in .env before deploying
 */
const RaceManagerModule = buildModule("RaceManagerModule", (m) => {
    // Deployed RatNFT address
    const ratNFTAddress = m.getParameter("ratNFTAddress", "0x456ff59525a02cc4917a93701E12F6D7da79552E");

    const raceManager = m.contract("RaceManager", [ratNFTAddress]);

    return { raceManager };
});

export default RaceManagerModule;

