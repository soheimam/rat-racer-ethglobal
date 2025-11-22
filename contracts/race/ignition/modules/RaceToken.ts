import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for RaceToken
 * 
 * Deploys ERC20 token for race entry fees
 * Mints 10,000 RACE tokens to deployer
 */
const RaceTokenModule = buildModule("RaceTokenModule", (m) => {
    const raceToken = m.contract("RaceToken");

    return { raceToken };
});

export default RaceTokenModule;

