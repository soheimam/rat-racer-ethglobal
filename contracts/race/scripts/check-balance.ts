/**
 * Check RACE token balance for an address
 */

import hre from "hardhat";
import { formatUnits } from "viem";

const RACE_TOKEN_ADDRESS = "0x727f6cfD60c827A5a78d3d21DC567121031Cc560" as `0x${string}`;
const WALLET_1 = "0x584cb34c3d52bf59219e4e836feaf63d4f90c830" as `0x${string}`;
const WALLET_2 = "0xa41f6558a517e6ac35dea5a453273aa4f31cdacd" as `0x${string}`;

async function main() {
    const raceToken = await hre.viem.getContractAt("RaceToken", RACE_TOKEN_ADDRESS);

    console.log("\nRACE Token Balances:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const balance1 = await raceToken.read.balanceOf([WALLET_1]);
    console.log(`${WALLET_1}: ${formatUnits(balance1, 18)} RACE`);

    const balance2 = await raceToken.read.balanceOf([WALLET_2]);
    console.log(`${WALLET_2}: ${formatUnits(balance2, 18)} RACE`);

    const totalSupply = await raceToken.read.totalSupply();
    console.log(`\nTotal Supply: ${formatUnits(totalSupply, 18)} RACE`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


