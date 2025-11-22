'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { mintRat } from '@/lib/contracts/mint-rat';
import Link from 'next/link';
import { useState } from 'react';
import { useAccount } from 'wagmi';

const RAT_OPTIONS = [
    {
        id: 0,
        name: 'White Rat',
        image: '/images/white.png',
        imageIndex: 0,
    },
    {
        id: 1,
        name: 'Brown Rat',
        image: '/images/brown.png',
        imageIndex: 1,
    },
    {
        id: 2,
        name: 'Pink Rat',
        image: '/images/pink.png',
        imageIndex: 2,
    },
];

const MINT_COST = '100'; // 100 RACE tokens

interface MintedRat {
    tokenId: string;
    name: string;
    imageUrl: string;
    stats: {
        stamina: number;
        agility: number;
        bloodline: string;
    };
    speeds: number[];
    rarityScore: number;
}

export default function ShopPage() {
    const { address, isConnected } = useAccount();
    const { toast } = useToast();
    const [minting, setMinting] = useState<number | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mintedRat, setMintedRat] = useState<MintedRat | null>(null);
    const [pollingForRat, setPollingForRat] = useState(false);

    const handleMint = async (ratOption: typeof RAT_OPTIONS[0]) => {
        if (!address || !isConnected) {
            toast({
                title: 'Connect Wallet',
                description: 'Please connect your wallet to mint a rat',
                variant: 'destructive',
            });
            return;
        }

        setMinting(ratOption.id);

        try {
            // Show initial toast
            toast({
                title: 'Minting Rat',
                description: 'Approving RACE tokens...',
            });

            const result = await mintRat(address, ratOption.imageIndex);

            toast({
                title: 'Transaction Submitted',
                description: 'Waiting for confirmation...',
            });

            // Poll for the minted rat data
            setPollingForRat(true);
            await pollForMintedRat(result.tokenId);

            toast({
                title: 'Rat Minted!',
                description: `Your ${ratOption.name} has been minted!`,
            });

            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Mint error:', error);
            toast({
                title: 'Mint Failed',
                description: error.message || 'Failed to mint rat',
                variant: 'destructive',
            });
        } finally {
            setMinting(null);
            setPollingForRat(false);
        }
    };

    const pollForMintedRat = async (tokenId: bigint, maxAttempts = 20) => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`/api/rats/${tokenId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.rat) {
                        setMintedRat(data.rat);
                        return;
                    }
                }
            } catch (error) {
                console.log(`Polling attempt ${i + 1} failed`);
            }

            // Wait 2 seconds between attempts
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Fallback if polling fails
        toast({
            title: 'Rat Minted',
            description: 'Your rat is being processed. Check "My Rats" soon!',
        });
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-gray-900 to-black text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold">Rat Shop</h1>
                    <Link href="/">
                        <Button variant="outline">Back to Home</Button>
                    </Link>
                </div>

                <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-lg">
                        Mint your racing rat for{' '}
                        <span className="text-yellow-400 font-bold">{MINT_COST} RACE</span> tokens
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        Each rat has unique randomized stats and bloodline
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {RAT_OPTIONS.map((rat) => (
                        <Card
                            key={rat.id}
                            className="bg-gray-800 border-gray-700 p-6 hover:border-gray-500 transition-all"
                        >
                            <div className="aspect-square bg-gray-900 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                                <img
                                    src={rat.image}
                                    alt={rat.name}
                                    className="w-full h-full object-contain"
                                />
                            </div>

                            <h3 className="text-xl font-bold mb-2">{rat.name}</h3>
                            <p className="text-gray-400 mb-4">
                                Random stats and bloodline
                            </p>

                            <Button
                                onClick={() => handleMint(rat)}
                                disabled={minting !== null || !isConnected}
                                className="w-full"
                            >
                                {minting === rat.id
                                    ? 'Minting...'
                                    : `Mint for ${MINT_COST} RACE`}
                            </Button>
                        </Card>
                    ))}
                </div>

                {!isConnected && (
                    <div className="mt-8 text-center text-gray-400">
                        <p>Connect your wallet to start minting rats</p>
                    </div>
                )}
            </div>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">🎉 Rat Minted Successfully!</DialogTitle>
                    </DialogHeader>

                    {pollingForRat ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                            <p className="text-gray-400">Loading rat data...</p>
                        </div>
                    ) : mintedRat ? (
                        <div className="space-y-6">
                            <div className="flex gap-6">
                                <div className="w-48 h-48 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                                    <img
                                        src={mintedRat.imageUrl}
                                        alt={mintedRat.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold mb-2">{mintedRat.name}</h3>
                                    <p className="text-gray-400 mb-4">Token ID: #{mintedRat.tokenId}</p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-400">Bloodline</p>
                                            <p className="text-lg font-bold text-purple-400">
                                                {mintedRat.stats.bloodline}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Rarity Score</p>
                                            <p className="text-lg font-bold text-yellow-400">
                                                {mintedRat.rarityScore.toFixed(1)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Stamina</p>
                                            <p className="text-lg font-bold">{mintedRat.stats.stamina}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Agility</p>
                                            <p className="text-lg font-bold">{mintedRat.stats.agility}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800 p-4 rounded-lg">
                                <p className="text-sm text-gray-400 mb-2">Race Speed Distribution</p>
                                <div className="flex gap-2">
                                    {mintedRat.speeds.map((speed, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-gray-700 rounded p-2 text-center"
                                        >
                                            <p className="text-xs text-gray-400">Seg {i + 1}</p>
                                            <p className="text-sm font-bold">{speed.toFixed(1)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowSuccessModal(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Close
                                </Button>
                                <Link href="/my-rats" className="flex-1">
                                    <Button className="w-full">View My Rats</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-400">Your rat is being processed...</p>
                            <Link href="/my-rats" className="mt-4 inline-block">
                                <Button>View My Rats</Button>
                            </Link>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
