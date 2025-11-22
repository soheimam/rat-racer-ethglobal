#!/bin/bash

cd /Users/quix/git/rat-racer-ethglobal/contracts

echo "========================================="
echo "Verifying Contracts on Base Mainnet"
echo "=========================================\n"

# RaceToken
echo "Verifying RaceToken..."
cd race && npx hardhat ignition verify chain-8453 2>&1 | tail -5
cd ..

# RatNFT
echo "\nVerifying RatNFT..."
cd rat && npx hardhat ignition verify chain-8453 2>&1 | tail -5
cd ..

echo "\n========================================="
echo "Verification complete!"
echo "=========================================\n"
echo "Deployed Contracts:"
echo "RatNFT:       0x456ff59525a02cc4917a93701E12F6D7da79552E"
echo "RaceToken:    0x909cd2621513aD132ff33007EbaE88D727C5c0d4"
echo "RaceManager:  0xDA24fF53296c1E5E81fc86b9Fb7deb82e9701E65"
