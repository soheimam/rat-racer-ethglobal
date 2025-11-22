/**
 * Rat Minting Logic with RACE Token Approval
 */

import { config } from '@/components/providers/WagmiProvider';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';
import { parseUnits } from 'viem';

const RAT_NFT_ADDRESS = process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS as `0x${string}`;
const RACE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_RACE_TOKEN_ADDRESS as `0x${string}`;
const MINT_COST = parseUnits('100', 18); // 100 RACE tokens

const RAT_NFT_ABI = [
    {
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'imageIndex', type: 'uint8' },
        ],
        name: 'mint',
        outputs: [{ name: 'tokenId', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

const RACE_TOKEN_ABI = [
    {
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export async function mintRat(
    userAddress: `0x${string}`,
    imageIndex: number
): Promise<{ tokenId: bigint; txHash: string }> {
    if (!RAT_NFT_ADDRESS || !RACE_TOKEN_ADDRESS) {
        throw new Error('Contract addresses not configured');
    }

    // Step 1: Check current allowance
    const currentAllowance = await readContract(config, {
        address: RACE_TOKEN_ADDRESS,
        abi: RACE_TOKEN_ABI,
        functionName: 'allowance',
        args: [userAddress, RAT_NFT_ADDRESS],
    });

    // Step 2: Approve if needed
    if (currentAllowance < MINT_COST) {
        const approveHash = await writeContract(config, {
            address: RACE_TOKEN_ADDRESS,
            abi: RACE_TOKEN_ABI,
            functionName: 'approve',
            args: [RAT_NFT_ADDRESS, MINT_COST],
        });

        // Wait for approval to confirm
        await waitForTransactionReceipt(config, {
            hash: approveHash,
        });
    }

    // Step 3: Mint the rat
    const mintHash = await writeContract(config, {
        address: RAT_NFT_ADDRESS,
        abi: RAT_NFT_ABI,
        functionName: 'mint',
        args: [userAddress, imageIndex as any],
    });

    // Wait for mint transaction
    const receipt = await waitForTransactionReceipt(config, {
        hash: mintHash,
    });

    // Parse the RatMinted event to get tokenId
    // Event signature: RatMinted(address indexed to, uint256 indexed tokenId, uint8 imageIndex)
    // topics[0] = event signature hash
    // topics[1] = to (indexed)
    // topics[2] = tokenId (indexed)
    const ratMintedLog = receipt.logs.find((log) =>
        log.address.toLowerCase() === RAT_NFT_ADDRESS.toLowerCase()
    );

    // Get tokenId from event topics
    const tokenId = ratMintedLog && ratMintedLog.topics[2]
        ? BigInt(ratMintedLog.topics[2])
        : BigInt(0);

    return {
        tokenId,
        txHash: mintHash,
    };
}

