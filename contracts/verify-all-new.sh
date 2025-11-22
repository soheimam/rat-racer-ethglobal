#!/bin/bash

# Load environment variables from .env file in the project root
source ../.env

# NEW Contract Addresses (deployed just now)
RACE_TOKEN_ADDRESS="0xb5D7712b80cf17ADFFbd3338d31f3A2C2a1f2Bb0"
RAT_NFT_ADDRESS="0xE572c5216d748a744e9F4288058D9b6144812684"
RACE_MANAGER_ADDRESS="0xd48fA1fddccD9c8Ba8f083CB0C752c109b15612b"

# Arguments for RaceToken constructor (none)
RACE_TOKEN_CONSTRUCTOR_ARGS='[]'

# Arguments for RatNFT constructor
RAT_NFT_CONSTRUCTOR_ARGS='["Street Racer Rat", "RAT", "https://klucbriwtfivi0tj.public.blob.vercel-storage.com/rats/metadata/", "0xb5D7712b80cf17ADFFbd3338d31f3A2C2a1f2Bb0", "100000000000000000000"]'

# Arguments for RaceManager constructor
RACE_MANAGER_CONSTRUCTOR_ARGS='["0xE572c5216d748a744e9F4288058D9b6144812684"]'

echo "========================================"
echo "Verifying Contracts on Base Mainnet"
echo "========================================\n"

cd race

# Verify RaceToken
echo "Verifying RaceToken at $RACE_TOKEN_ADDRESS..."
npx hardhat verify --network base "$RACE_TOKEN_ADDRESS" --constructor-args <(echo "$RACE_TOKEN_CONSTRUCTOR_ARGS")
echo "\n"

# Verify RatNFT
echo "Verifying RatNFT at $RAT_NFT_ADDRESS..."
npx hardhat verify --network base "$RAT_NFT_ADDRESS" --constructor-args <(echo "$RAT_NFT_CONSTRUCTOR_ARGS")
echo "\n"

# Verify RaceManager
echo "Verifying RaceManager at $RACE_MANAGER_ADDRESS..."
npx hardhat verify --network base "$RACE_MANAGER_ADDRESS" --constructor-args <(echo "$RACE_MANAGER_CONSTRUCTOR_ARGS")
echo "\n"

echo "========================================"
echo "Verification process complete!"
echo "========================================"
echo ""
echo "Deployed Contracts:"
echo "RaceToken:    $RACE_TOKEN_ADDRESS"
echo "RatNFT:       $RAT_NFT_ADDRESS"
echo "RaceManager:  $RACE_MANAGER_ADDRESS"
echo ""
echo "Update your .env.local with these addresses!"

