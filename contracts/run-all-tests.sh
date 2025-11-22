#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Rat Racer - Complete Test Suite Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the contracts directory
if [ ! -d "race" ] || [ ! -d "rat" ]; then
    echo -e "${RED}Error: Please run this script from the contracts directory${NC}"
    exit 1
fi

echo -e "${GREEN}Step 1: Installing dependencies...${NC}"
echo ""

# Install rat contract dependencies
echo "Installing rat contract dependencies..."
cd rat
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed for rat contracts"
fi
cd ..

# Install race contract dependencies
echo ""
echo "Installing race contract dependencies..."
cd race
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed for race contracts"
fi
cd ..

echo ""
echo -e "${GREEN}Step 2: Compiling contracts...${NC}"
echo ""

# Compile rat contracts
echo "Compiling rat contracts..."
cd rat
npx hardhat compile
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed for rat contracts${NC}"
    exit 1
fi
cd ..

# Compile race contracts
echo ""
echo "Compiling race contracts..."
cd race
npx hardhat compile
if [ $? -ne 0 ]; then
    echo -e "${RED}Compilation failed for race contracts${NC}"
    exit 1
fi
cd ..

echo ""
echo -e "${GREEN}Step 3: Running tests...${NC}"
echo ""

# Run rat NFT tests
echo "Testing RatNFT contract..."
cd rat
npx hardhat test
RAT_TEST_RESULT=$?
cd ..

echo ""

# Run race manager tests
echo "Testing RaceManager and RaceToken contracts..."
cd race
npx hardhat test test/RaceManager.ts
RACE_TEST_RESULT=$?
cd ..

echo ""

# Run E2E tests
echo "Running End-to-End integration tests..."
cd race
npx hardhat test test/E2E.test.ts
E2E_TEST_RESULT=$?
cd ..

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $RAT_TEST_RESULT -eq 0 ]; then
    echo -e "RatNFT Tests: ${GREEN}✓ PASSED${NC}"
else
    echo -e "RatNFT Tests: ${RED}✗ FAILED${NC}"
fi

if [ $RACE_TEST_RESULT -eq 0 ]; then
    echo -e "RaceManager Tests: ${GREEN}✓ PASSED${NC}"
else
    echo -e "RaceManager Tests: ${RED}✗ FAILED${NC}"
fi

if [ $E2E_TEST_RESULT -eq 0 ]; then
    echo -e "E2E Integration Tests: ${GREEN}✓ PASSED${NC}"
else
    echo -e "E2E Integration Tests: ${RED}✗ FAILED${NC}"
fi

echo ""

if [ $RAT_TEST_RESULT -eq 0 ] && [ $RACE_TEST_RESULT -eq 0 ] && [ $E2E_TEST_RESULT -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Some tests failed. Please review above.${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

