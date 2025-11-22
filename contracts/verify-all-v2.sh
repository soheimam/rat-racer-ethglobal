#!/bin/bash
set -e

cd "$(dirname "$0")/race"

# Load env vars
source ../../.env

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Verifying All Contracts on Basescan (v2)            ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Contract addresses from deployment v2
RACE_TOKEN_ADDRESS="0x727f6cfD60c827A5a78d3d21DC567121031Cc560"
RAT_NFT_ADDRESS="0x4BbF5bC53598a7C1EedEE6297ef2e5AA9d29aDE4"
RACE_MANAGER_ADDRESS="0xEc501A698aF553c5B190ED5A28f5Daa289b479d7"

# Verify RaceToken (no constructor args)
echo ""
echo "→ Verifying RaceToken at $RACE_TOKEN_ADDRESS"
npx hardhat verify --network base "$RACE_TOKEN_ADDRESS" || echo "Already verified or error"

# Verify RatNFT (5 constructor args)
echo ""
echo "→ Verifying RatNFT at $RAT_NFT_ADDRESS"
RAT_NAME="Street Racer Rat"
RAT_SYMBOL="RAT"
BASE_URI="https://klucbriwtfivi0tj.public.blob.vercel-storage.com/rats/metadata/"
INITIAL_PRICE="100000000000000000000" # 100 RACE in wei

npx hardhat verify --network base \
  --constructor-args <(cat <<EOF
module.exports = [
  "$RAT_NAME",
  "$RAT_SYMBOL",
  "$BASE_URI",
  "$RACE_TOKEN_ADDRESS",
  "$INITIAL_PRICE"
];
EOF
) "$RAT_NFT_ADDRESS" || echo "Already verified or error"

# Verify RaceManager (1 constructor arg)
echo ""
echo "→ Verifying RaceManager at $RACE_MANAGER_ADDRESS"
npx hardhat verify --network base "$RACE_MANAGER_ADDRESS" "$RAT_NFT_ADDRESS" || echo "Already verified or error"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Verification Complete                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"

