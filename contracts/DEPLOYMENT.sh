#!/bin/bash

# Deployment script for Base Mainnet
# Run from contracts directory

echo "======================================"
echo "Rat Racer - Base Mainnet Deployment"
echo "======================================"
echo ""

# Check environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set"
    exit 1
fi

if [ -z "$RPC_ENDPOINT" ]; then
    echo "Error: RPC_ENDPOINT not set"
    exit 1
fi

echo "Target Wallets:"
echo "  Wallet 1: 0x584cb34c3d52bf59219e4e836feaf63d4f90c830"
echo "  Wallet 2: 0xa41f6558A517e6aC35DeA5A453273Aa4F31CDAcD"
echo ""

# Deploy RatNFT
echo "======================================"
echo "1. Deploying RatNFT..."
echo "======================================"
cd rat
npx hardhat ignition deploy ./ignition/modules/RatNFT.ts --network base
echo ""

# Note: Save the deployed address manually
read -p "Enter deployed RatNFT address: " RAT_NFT_ADDRESS

# Deploy RaceToken
echo "======================================"
echo "2. Deploying RaceToken..."
echo "======================================"
cd ../race
npx hardhat ignition deploy ./ignition/modules/RaceToken.ts --network base
echo ""

read -p "Enter deployed RaceToken address: " RACE_TOKEN_ADDRESS

# Deploy RaceManager
echo "======================================"
echo "3. Deploying RaceManager..."
echo "======================================"
echo "Using RatNFT address: $RAT_NFT_ADDRESS"

# You'll need to update the RaceManager deployment module with the RatNFT address
npx hardhat ignition deploy ./ignition/modules/RaceManager.ts --network base
echo ""

read -p "Enter deployed RaceManager address: " RACE_MANAGER_ADDRESS

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Contract Addresses:"
echo "  RatNFT:        $RAT_NFT_ADDRESS"
echo "  RaceToken:     $RACE_TOKEN_ADDRESS"
echo "  RaceManager:   $RACE_MANAGER_ADDRESS"
echo ""
echo "Next Steps:"
echo "1. Set baseURI on RatNFT (after Blob Storage setup)"
echo "2. Update .env with contract addresses"
echo "3. Configure webhooks (Alchemy/QuickNode)"
echo "4. Mint test tokens to wallets"
echo ""
echo "Test Commands:"
echo "  # Mint rat to wallet 1"
echo "  npx hardhat run scripts/owner-mint.ts --network base"
echo ""
echo "  # Create test race"
echo "  npx hardhat run scripts/create-test-race.ts --network base"
echo ""

