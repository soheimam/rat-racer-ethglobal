import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for RaceManager
 * 
 * IMPORTANT: Set NEXT_PUBLIC_RAT_NFT_ADDRESS in .env before deploying
 */
const RaceManagerModule = buildModule("RaceManagerModule", (m) => {
    // Get RatNFT address from environment
    const ratNFTAddress = process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS;

    if (!ratNFTAddress) {
        throw new Error("NEXT_PUBLIC_RAT_NFT_ADDRESS must be set in .env");
    }

    const raceManager = m.contract("RaceManager", [ratNFTAddress]);

    return { raceManager };
});

export default RaceManagerModule;

