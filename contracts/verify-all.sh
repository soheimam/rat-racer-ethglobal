#!/bin/bash

# Verify all deployed contracts on Basescan

set -e

echo "=========================================="
echo "Verifying Contracts on Basescan"
echo "=========================================="
echo ""

# Load environment variables
source ../.env

RATNFT_ADDRESS="0x7fdcbf84aeafee37994c149f15f9fd8b663accc4"
RACETOKEN_ADDRESS="0xd13a9ae07e25d63855cee6b7a52451db85329649"
RACEMANAGER_ADDRESS="0xb58fb979bb5773dea518932ca85769c9c4078261"

echo "1. Verifying RatNFT at $RATNFT_ADDRESS..."
cd race
npx hardhat verify --network base $RATNFT_ADDRESS "Rat Racer NFT" "RATRACE" "$BLOG_BASE_URL"
cd ..
echo ""

echo "2. Verifying RaceToken at $RACETOKEN_ADDRESS..."
cd race
npx hardhat verify --network base $RACETOKEN_ADDRESS
cd ..
echo ""

echo "3. Verifying RaceManager at $RACEMANAGER_ADDRESS..."
cd race
npx hardhat verify --network base $RACEMANAGER_ADDRESS $RATNFT_ADDRESS
cd ..
echo ""

echo "=========================================="
echo "✅ All Contracts Verified!"
echo "=========================================="
echo ""
echo "View on Basescan:"
echo "RatNFT:       https://basescan.org/address/$RATNFT_ADDRESS#code"
echo "RaceToken:    https://basescan.org/address/$RACETOKEN_ADDRESS#code"
echo "RaceManager:  https://basescan.org/address/$RACEMANAGER_ADDRESS#code"

