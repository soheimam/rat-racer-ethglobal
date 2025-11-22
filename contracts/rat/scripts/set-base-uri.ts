/**
 * Script to set the base URI on the deployed RatNFT contract
 * 
 * Usage: npx hardhat run scripts/set-base-uri.ts --network <network>
 */

import hre from "hardhat";

async function main() {
    // Get the deployed contract address
    const RAT_NFT_ADDRESS = process.env.RAT_NFT_ADDRESS;
    const BLOB_BASE_URL = process.env.BLOB_BASE_URL;

    if (!RAT_NFT_ADDRESS) {
        throw new Error("RAT_NFT_ADDRESS environment variable not set");
    }

    if (!BLOB_BASE_URL) {
        throw new Error("BLOB_BASE_URL environment variable not set");
    }

    console.log("Setting base URI on RatNFT contract...");
    console.log("Contract address:", RAT_NFT_ADDRESS);
    console.log("Base URL:", BLOB_BASE_URL);

    // Ensure the base URL ends with a trailing slash
    const baseUrl = BLOB_BASE_URL.endsWith('/') ? BLOB_BASE_URL : `${BLOB_BASE_URL}/`;

    const ratNFT = await hre.viem.getContractAt("RatNFT", RAT_NFT_ADDRESS as `0x${string}`);

    // Set the base URI
    const tx = await ratNFT.write.setBaseURI([baseUrl]);
    console.log("Transaction sent:", tx);

    const publicClient = await hre.viem.getPublicClient();
    await publicClient.waitForTransactionReceipt({ hash: tx });

    // Verify it was set correctly
    const newBaseURI = await ratNFT.read.baseURI();
    console.log("✅ Base URI set successfully:", newBaseURI);

    // Example: show what tokenURI(1) would return
    try {
        const exampleURI = `${newBaseURI}1.json`;
        console.log("\nExample tokenURI(1) will return:", exampleURI);
        console.log("\nThis should match the Vercel Blob upload path:");
        console.log("Webhook uploads to: rats/metadata/1.json");
    } catch (error) {
        console.log("(Token 1 doesn't exist yet - that's fine)");
    }

    console.log("\n📝 Next steps:");
    console.log("1. Mint a test rat: ratNFT.mint(yourAddress)");
    console.log("2. Webhook will automatically generate & upload metadata");
    console.log("3. Call tokenURI(tokenId) to verify it returns the correct Blob URL");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
