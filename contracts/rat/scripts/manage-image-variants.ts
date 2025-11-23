/**
 * Script to manage approved image variants for RatNFT
 * 
 * Usage:
 *   # Add new variant
 *   IMAGE_INDEX=3 npx hardhat run scripts/manage-image-variants.ts --network base
 *   
 *   # Remove variant
 *   ACTION=remove IMAGE_INDEX=3 npx hardhat run scripts/manage-image-variants.ts --network base
 */

import hre from "hardhat";

async function main() {
    const action = process.env.ACTION || 'add'; // 'add' or 'remove'
    const imageIndex = process.env.IMAGE_INDEX;
    const ratNFTAddress = process.env.RAT_NFT_ADDRESS || "0x795f18184e67a8c32594eb6db14adfc42cfd8108";

    if (!imageIndex || isNaN(Number(imageIndex))) {
        console.error('❌ IMAGE_INDEX environment variable is required and must be a number');
        console.error('   Example: IMAGE_INDEX=3 npx hardhat run scripts/manage-image-variants.ts');
        process.exit(1);
    }

    console.log('\n🐀 Rat Variant Manager');
    console.log('═'.repeat(70));
    console.log(`Action: ${action}`);
    console.log(`Image Index: ${imageIndex}`);
    console.log(`RatNFT: ${ratNFTAddress}`);
    console.log('═'.repeat(70));

    const [deployer] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const ratNFT = await hre.viem.getContractAt("RatNFT", ratNFTAddress as `0x${string}`);

    // Check current owner
    const owner = await ratNFT.read.owner();
    console.log(`\n📋 Current owner: ${owner}`);
    console.log(`📋 Your address: ${deployer.account.address}`);

    if (owner.toLowerCase() !== deployer.account.address.toLowerCase()) {
        console.error(`\n❌ You are not the owner! Owner is: ${owner}`);
        process.exit(1);
    }

    // Check current approval status
    const isApproved = await ratNFT.read.isImageIndexApproved([BigInt(imageIndex)]);
    console.log(`\n📊 Image variant ${imageIndex} currently approved: ${isApproved}`);

    if (action === 'add') {
        if (isApproved) {
            console.log('✅ Image variant is already approved');
            return;
        }

        console.log(`\n🔄 Adding image variant ${imageIndex} to approved list...`);
        const hash = await ratNFT.write.addApprovedImageIndex([BigInt(imageIndex)]);
        console.log(`📝 Transaction hash: ${hash}`);

        console.log('⏳ Waiting for confirmation...');
        await publicClient.waitForTransactionReceipt({ hash });

        console.log(`✅ Image variant ${imageIndex} approved successfully!`);
    } else if (action === 'remove') {
        if (!isApproved) {
            console.log('⚠️  Image variant is not approved');
            return;
        }

        console.log(`\n🔄 Removing image variant ${imageIndex} from approved list...`);
        const hash = await ratNFT.write.removeApprovedImageIndex([BigInt(imageIndex)]);
        console.log(`📝 Transaction hash: ${hash}`);

        console.log('⏳ Waiting for confirmation...');
        await publicClient.waitForTransactionReceipt({ hash });

        console.log(`✅ Image variant ${imageIndex} removed successfully!`);
    } else {
        console.error(`\n❌ Invalid action: ${action}. Must be 'add' or 'remove'`);
        process.exit(1);
    }

    // Verify final state
    const finalStatus = await ratNFT.read.isImageIndexApproved([BigInt(imageIndex)]);
    console.log(`\n📊 Final status for variant ${imageIndex}: ${finalStatus ? 'APPROVED ✅' : 'NOT APPROVED ❌'}`);
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

