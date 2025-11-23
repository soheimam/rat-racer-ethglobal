/**
 * Rat Minting Logic with RACE Token Approval
 */

import { config } from '@/components/providers/WagmiProvider';
import { readContract, waitForTransactionReceipt, writeContract } from '@wagmi/core';

// Contract address - Deployed RatNFT on Base
const RAT_NFT_ADDRESS = (process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS || '0x38f66760ada4c01bc5a4a7370882f0aee7090674') as `0x${string}`;

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
    {
        inputs: [{ name: 'imageIndex', type: 'uint8' }],
        name: 'getRatConfig',
        outputs: [
            { name: 'paymentToken', type: 'address' },
            { name: 'price', type: 'uint256' }
        ],
        stateMutability: 'view',
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

export interface MintProgress {
    onCheckingAllowance?: () => void;
    onApproving?: () => void;
    onApprovalConfirmed?: () => void;
    onMinting?: () => void;
    onMintConfirmed?: (tokenId: bigint) => void;
}

export async function mintRat(
    userAddress: `0x${string}`,
    imageIndex: number,
    progress?: MintProgress
): Promise<{ tokenId: bigint; txHash: string }> {
    // Step 1: Get payment token and price for this rat type
    progress?.onCheckingAllowance?.();
    const ratConfig = await readContract(config, {
        address: RAT_NFT_ADDRESS,
        abi: RAT_NFT_ABI,
        functionName: 'getRatConfig',
        args: [imageIndex as any],
    });

    const paymentTokenAddress = ratConfig[0] as `0x${string}`;
    const mintPrice = ratConfig[1] as bigint;

    if (!paymentTokenAddress || paymentTokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Payment token not configured for this rat type');
    }

    // Step 2: Check current allowance
    const currentAllowance = await readContract(config, {
        address: paymentTokenAddress,
        abi: RACE_TOKEN_ABI,
        functionName: 'allowance',
        args: [userAddress, RAT_NFT_ADDRESS],
    });

    // Step 3: Approve if needed
    if (currentAllowance < mintPrice) {
        progress?.onApproving?.();
        const approveHash = await writeContract(config, {
            address: paymentTokenAddress,
            abi: RACE_TOKEN_ABI,
            functionName: 'approve',
            args: [RAT_NFT_ADDRESS, mintPrice],
        });

        // Wait for approval to confirm
        await waitForTransactionReceipt(config, {
            hash: approveHash,
        });
        progress?.onApprovalConfirmed?.();
    }

    // Step 4: Mint the rat
    progress?.onMinting?.();
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

    progress?.onMintConfirmed?.(tokenId);

    return {
        tokenId,
        txHash: mintHash,
    };
}

