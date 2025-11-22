#!/bin/bash

# Load environment variables
source ../../.env

echo "========================================"
echo "DEPLOYING ALL CONTRACTS TO BASE MAINNET"
echo "========================================"
echo ""
echo "Network: Base Mainnet (Chain ID: 8453)"
echo "Deployer: ${PRIVATE_KEY:0:10}...${PRIVATE_KEY: -4}"
echo ""
echo "Deployment Order:"
echo "1. RaceToken (ERC20) - 10,000 RACE minted to deployer"
echo "2. RatNFT (ERC721) - 100 RACE per mint"
echo "3. RaceManager - Race management contract"
echo ""
echo "Press CTRL+C to cancel, or wait 5 seconds to continue..."
sleep 5

# Deploy all contracts
echo ""
echo "Starting deployment..."
npx hardhat ignition deploy ./ignition/modules/DeployAll.ts --network base

echo ""
echo "========================================"
echo "DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Save contract addresses from above output"
echo "2. Update .env.local with contract addresses"
echo "3. Verify contracts on Basescan"
echo "4. Mint RACE tokens to test wallets"
echo ""

