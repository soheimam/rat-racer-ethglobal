import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

// Load environment variables from project root
dotenv.config({ path: "../../.env" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    base: {
      url: process.env.RPC_ENDPOINT || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`]
        : [],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || "",
  },
};

export default config;
