/**
 * Script to list approved image variants for RatNFT
 * 
 * Usage:
 *   RAT_NFT_ADDRESS=0x... npx hardhat run scripts/list-image-variants.ts --network base
 */

import hre from "hardhat";

async function main() {
    const ratNFTAddress = process.env.RAT_NFT_ADDRESS || "0x795f18184e67a8c32594eb6db14adfc42cfd8108";
    const maxCheckIndex = Number(process.env.MAX_CHECK || '10'); // Check 0-10 by default

    console.log('\n🐀 Approved Rat Variants');
    console.log('═'.repeat(70));
    console.log(`RatNFT: ${ratNFTAddress}`);
    console.log(`Checking indices 0-${maxCheckIndex}`);
    console.log('═'.repeat(70));

    const ratNFT = await hre.viem.getContractAt("RatNFT", ratNFTAddress as `0x${string}`);

    console.log('\n📊 Image Variant Status:');
    console.log('─'.repeat(70));

    const approvedVariants: number[] = [];

    for (let i = 0; i <= maxCheckIndex; i++) {
        try {
            const isApproved = await ratNFT.read.isImageIndexApproved([BigInt(i)]);
            const status = isApproved ? '✅ APPROVED' : '❌ Not Approved';
            console.log(`Index ${i.toString().padStart(2)}  ${status}`);

            if (isApproved) {
                approvedVariants.push(i);
            }
        } catch (error) {
            console.log(`Index ${i.toString().padStart(2)}  ⚠️  Error checking`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(`✅ Approved Variants: ${approvedVariants.length}`);

    if (approvedVariants.length > 0) {
        console.log('\n📝 Users can mint rats with these variants:');
        approvedVariants.forEach((index) => {
            console.log(`  • Index ${index}`);
        });

        console.log('\n💡 To add more variants:');
        console.log('   IMAGE_INDEX=3 npx hardhat run scripts/manage-image-variants.ts --network base');
    } else {
        console.log('\n⚠️  No variants approved yet');
    }

    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

