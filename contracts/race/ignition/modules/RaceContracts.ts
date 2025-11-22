import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const RaceContractsModule = buildModule("RaceContractsModule", (m) => {
  // Deploy RaceToken first
  const raceToken = m.contract("RaceToken", []);

  // Deploy RaceManager with RatNFT address from parameters
  const ratNFTAddress = m.getParameter("ratNFTAddress");
  const raceManager = m.contract("RaceManager", [ratNFTAddress]);

  return { raceToken, raceManager };
});

export default RaceContractsModule;

