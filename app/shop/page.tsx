'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { mintRat } from '@/lib/contracts/mint-rat';
import Link from 'next/link';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useConnect, useReadContract } from 'wagmi';

const RAT_RACERS = [
    {
        id: 0,
        name: 'GHOST',
        tagline: 'Silent Speed',
        image: '/images/white.png',
        imageIndex: 0,
        color: '#ffffff',
        glow: 'rgba(255, 255, 255, 0.3)',
    },
    {
        id: 1,
        name: 'MUDSLIDE',
        tagline: 'Street Veteran',
        image: '/images/brown.png',
        imageIndex: 1,
        color: '#8b4513',
        glow: 'rgba(139, 69, 19, 0.3)',
    },
    {
        id: 2,
        name: 'NEON',
        tagline: 'Underground Legend',
        image: '/images/pink.png',
        imageIndex: 2,
        color: '#ff69b4',
        glow: 'rgba(255, 105, 180, 0.3)',
    },
];

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
    const { connect, connectors, isPending } = useConnect();
    const { toast } = useToast();
    const [selectedRat, setSelectedRat] = useState<number | null>(null);
    const [minting, setMinting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mintedRat, setMintedRat] = useState<MintedRat | null>(null);
    const [pollingForRat, setPollingForRat] = useState(false);
    const [hoveredRat, setHoveredRat] = useState<number | null>(null);

    // Contract addresses from environment variables
    const RAT_NFT_ADDRESS = process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS as `0x${string}`;

    // Read rat configuration for selected rat (payment token + price)
    const { data: ratConfig } = useReadContract({
        address: RAT_NFT_ADDRESS,
        abi: [
            {
                inputs: [{ name: 'imageIndex', type: 'uint8' }],
                name: 'getRatConfig',
                outputs: [
                    { name: 'paymentToken', type: 'address' },
                    { name: 'price', type: 'uint256' }
                ],
                stateMutability: 'view',
                type: 'function'
            }
        ],
        functionName: 'getRatConfig',
        args: selectedRat !== null ? [selectedRat as any] : undefined,
        query: { enabled: selectedRat !== null }
    });

    const paymentTokenAddress = ratConfig?.[0] as `0x${string}` | undefined;
    const mintPrice = ratConfig?.[1] as bigint | undefined;

    // Read balance of the payment token for selected rat
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: paymentTokenAddress,
        abi: [
            {
                inputs: [{ name: 'account', type: 'address' }],
                name: 'balanceOf',
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
            }
        ],
        functionName: 'balanceOf',
        args: address && paymentTokenAddress ? [address] : undefined,
        query: { 
            enabled: !!address && !!paymentTokenAddress,
            refetchInterval: false,
        }
    });

    const handleSelectRat = (ratId: number) => {
        setSelectedRat(ratId);
    };

    const handleMint = async () => {
        if (!address || !isConnected) {
            toast({
                title: 'NO WALLET',
                description: 'Connect your wallet to enter the underground',
                variant: 'destructive',
            });
            return;
        }

        if (selectedRat === null) {
            toast({
                title: 'PICK YOUR RACER',
                description: 'Select a rat before minting',
                variant: 'destructive',
            });
            return;
        }

        const ratOption = RAT_RACERS[selectedRat];
        setMinting(true);

        try {
            const result = await mintRat(address, ratOption.imageIndex, {
                onCheckingAllowance: () => {
                    toast({ title: 'CHECKING STASH', description: 'Verifying RACE tokens...' });
                },
                onApproving: () => {
                    toast({ title: 'APPROVAL NEEDED', description: 'Approve 100 RACE in wallet...' });
                },
                onApprovalConfirmed: () => {
                    toast({ title: 'APPROVED', description: 'Tokens locked. Entering the ring...' });
                },
                onMinting: () => {
                    toast({ title: 'MINTING RACER', description: 'Confirm transaction in wallet...' });
                },
                onMintConfirmed: (tokenId) => {
                    toast({ title: 'RACER READY', description: `#${tokenId.toString()} entering the underground...` });
                    // Refetch balance immediately after mint confirms
                    refetchBalance();
                },
            });

            toast({ title: 'LOADING STATS', description: 'Rolling stats from the streets...' });

            setPollingForRat(true);
            await pollForMintedRat(result.tokenId);

            toast({ title: 'RACER COMPLETE', description: `${ratOption.name} ready to race!` });
            setShowSuccessModal(true);

            // Refetch balance one more time after everything completes
            refetchBalance();
        } catch (error: any) {
            console.error('Mint error:', error);
            toast({
                title: 'MINT FAILED',
                description: error.message || 'Transaction rejected',
                variant: 'destructive',
            });
        } finally {
            setMinting(false);
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
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        toast({
            title: 'STILL PROCESSING',
            description: 'Check "My Rats" in a moment',
        });
    };

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500 rounded-full filter blur-[128px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
            </div>

            {/* Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
                }}
            ></div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter mb-2"
                            style={{
                                textShadow: '0 0 20px rgba(255,0,0,0.5), 0 0 40px rgba(255,0,0,0.3)',
                                fontFamily: 'monospace'
                            }}>
                            RAT UNDERGROUND
                        </h1>
                        <p className="text-sm text-red-400 font-mono tracking-widest">[ MINTING FACILITY // SECTOR 7 ]</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {!isConnected ? (
                            <Button
                                onClick={() => {
                                    const connector = connectors[0];
                                    if (connector) {
                                        connect({ connector });
                                    }
                                }}
                                disabled={isPending || !connectors.length}
                                className="bg-green-600 hover:bg-green-700 font-mono font-black px-6 py-3 text-lg border-2 border-green-400 disabled:opacity-50"
                                style={{
                                    textShadow: '0 0 10px rgba(0,255,0,0.5)',
                                    boxShadow: '0 0 20px rgba(0,255,0,0.3)'
                                }}
                            >
                                {isPending ? 'CONNECTING...' : '[!] CONNECT WALLET'}
                            </Button>
                        ) : (
                            <div className="text-right">
                                <div className="text-xs text-gray-500 font-mono mb-1">CONNECTED</div>
                                <div className="text-sm text-green-400 font-mono">
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </div>
                            </div>
                        )}
                        <Link href="/">
                            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black font-mono">
                                &lt; EXIT
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="mb-12 p-6 bg-gradient-to-r from-red-900/20 to-purple-900/20 border-2 border-red-500/30 relative">
                    <div className="absolute -top-3 left-4 bg-black px-2 text-red-400 text-xs font-mono">ENTRY FEE</div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-black text-yellow-400 mb-1">
                                {selectedRat !== null && mintPrice ? formatUnits(mintPrice, 18) : '...'} RACE
                            </div>
                            <div className="text-sm text-gray-400 font-mono">
                                {selectedRat !== null ? `// ${RAT_RACERS[selectedRat].name} MINT COST` : '// SELECT A RACER'}
                            </div>
                        </div>
                        <div>
                            {!isConnected ? (
                                <div className="text-red-400 font-mono text-sm animate-pulse">
                                    [!] WALLET NOT CONNECTED
                                </div>
                            ) : selectedRat === null ? (
                                <div className="text-gray-400 font-mono text-sm">
                                    [?] SELECT RACER TO SEE BALANCE
                                </div>
                            ) : (
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 font-mono mb-1">YOUR BALANCE</div>
                                    <div className={`text-3xl font-black font-mono ${tokenBalance && mintPrice && Number(formatUnits(tokenBalance as bigint, 18)) >= Number(formatUnits(mintPrice, 18))
                                        ? 'text-green-400'
                                        : 'text-red-400'
                                        }`}>
                                        {tokenBalance ? Number(formatUnits(tokenBalance as bigint, 18)).toFixed(0) : '0'} RACE
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mt-1">
                                        {tokenBalance && mintPrice && Number(formatUnits(tokenBalance as bigint, 18)) < Number(formatUnits(mintPrice, 18)) && (
                                            <span className="text-red-400">[!] INSUFFICIENT FUNDS</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rat Selection Arena */}
                <div className="mb-12">
                    <h2 className="text-2xl font-black mb-6 text-center tracking-wider" style={{ fontFamily: 'monospace' }}>
                        [ SELECT YOUR RACER ]
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {RAT_RACERS.map((rat) => {
                            const isSelected = selectedRat === rat.id;
                            const isHovered = hoveredRat === rat.id;

                            return (
                                <div
                                    key={rat.id}
                                    className={`relative cursor-pointer transition-all duration-300 transform ${isSelected ? 'scale-105' : isHovered ? 'scale-102' : 'scale-100'
                                        }`}
                                    onClick={() => handleSelectRat(rat.id)}
                                    onMouseEnter={() => setHoveredRat(rat.id)}
                                    onMouseLeave={() => setHoveredRat(null)}
                                >
                                    {/* Glow Effect */}
                                    {(isSelected || isHovered) && (
                                        <div
                                            className="absolute inset-0 rounded-lg filter blur-xl transition-opacity duration-300"
                                            style={{ backgroundColor: rat.glow }}
                                        ></div>
                                    )}

                                    {/* Card */}
                                    <div
                                        className={`relative bg-black border-4 rounded-lg overflow-hidden transition-all duration-300 ${isSelected
                                            ? 'border-white shadow-2xl'
                                            : 'border-gray-700 hover:border-gray-500'
                                            }`}
                                        style={{
                                            boxShadow: isSelected ? `0 0 30px ${rat.glow}` : 'none'
                                        }}
                                    >
                                        {/* Selected Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-4 left-4 z-10">
                                                <div className="bg-white text-black px-3 py-1 text-xs font-black animate-pulse">
                                                    SELECTED
                                                </div>
                                            </div>
                                        )}

                                        {/* Image */}
                                        <div
                                            className="relative h-80 bg-gradient-to-b from-gray-900 to-black flex items-center justify-center overflow-hidden"
                                            style={{
                                                borderBottom: `2px solid ${rat.color}`
                                            }}
                                        >
                                            <div className="absolute inset-0 opacity-20"
                                                style={{
                                                    backgroundImage: `radial-gradient(circle at center, ${rat.color}, transparent)`
                                                }}
                                            ></div>
                                            <img
                                                src={rat.image}
                                                alt={rat.name}
                                                className={`w-4/5 h-4/5 object-contain transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'
                                                    }`}
                                                style={{
                                                    filter: isSelected ? 'drop-shadow(0 0 20px rgba(255,255,255,0.5))' : 'none'
                                                }}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="p-6 bg-gradient-to-b from-gray-900 to-black">
                                            <div className="text-3xl font-black mb-1 tracking-wider" style={{ color: rat.color }}>
                                                {rat.name}
                                            </div>
                                            <div className="text-sm text-gray-400 font-mono mb-4">
                                                // {rat.tagline}
                                            </div>

                                            {/* Stats Preview */}
                                            <div className="flex gap-2 text-xs font-mono">
                                                <div className="flex-1 bg-black/50 border border-gray-700 px-2 py-1">
                                                    <div className="text-gray-500">STAMINA</div>
                                                    <div className="text-white">???</div>
                                                </div>
                                                <div className="flex-1 bg-black/50 border border-gray-700 px-2 py-1">
                                                    <div className="text-gray-500">AGILITY</div>
                                                    <div className="text-white">???</div>
                                                </div>
                                                <div className="flex-1 bg-black/50 border border-gray-700 px-2 py-1">
                                                    <div className="text-gray-500">BLOODLINE</div>
                                                    <div className="text-white">???</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mint Button */}
                <div className="flex justify-center">
                    <Button
                        onClick={handleMint}
                        disabled={minting || selectedRat === null || !isConnected}
                        className="relative px-16 py-8 text-2xl font-black tracking-wider disabled:opacity-50"
                        style={{
                            background: selectedRat !== null
                                ? `linear-gradient(135deg, ${RAT_RACERS[selectedRat].color}, black)`
                                : 'linear-gradient(135deg, #333, #111)',
                            border: '3px solid',
                            borderColor: selectedRat !== null ? RAT_RACERS[selectedRat].color : '#666',
                            boxShadow: selectedRat !== null && !minting
                                ? `0 0 30px ${RAT_RACERS[selectedRat].glow}`
                                : 'none',
                        }}
                    >
                        {minting ? (
                            <span className="flex items-center gap-3">
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                MINTING...
                            </span>
                        ) : selectedRat === null ? (
                            'SELECT A RACER'
                        ) : (
                            `MINT ${RAT_RACERS[selectedRat].name}`
                        )}
                    </Button>
                </div>
            </div>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="bg-black border-4 border-green-500 text-white max-w-3xl"
                    style={{ boxShadow: '0 0 50px rgba(0,255,0,0.3)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black text-center mb-4" style={{ fontFamily: 'monospace' }}>
                            <span className="text-green-400">[ RACER MINTED ]</span>
                        </DialogTitle>
                    </DialogHeader>

                    {pollingForRat ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-2 border-4 border-green-400 border-b-transparent rounded-full animate-spin-slow"></div>
                            </div>
                            <p className="text-green-400 font-mono animate-pulse">// GENERATING RACER STATS...</p>
                        </div>
                    ) : mintedRat ? (
                        <div className="space-y-6">
                            <div className="flex gap-6">
                                <div className="w-64 h-64 bg-gradient-to-br from-gray-900 to-black border-4 border-green-500 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                    <img
                                        src={mintedRat.imageUrl}
                                        alt={mintedRat.name}
                                        className="w-full h-full object-contain"
                                        style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,0,0.5))' }}
                                    />
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="text-4xl font-black text-green-400 mb-1">{mintedRat.name}</div>
                                        <div className="font-mono text-sm text-gray-400">TOKEN #{mintedRat.tokenId}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/50 border-2 border-purple-500 p-3">
                                            <div className="text-xs text-purple-400 font-mono mb-1">BLOODLINE</div>
                                            <div className="text-lg font-bold text-purple-300">{mintedRat.stats.bloodline}</div>
                                        </div>
                                        <div className="bg-black/50 border-2 border-yellow-500 p-3">
                                            <div className="text-xs text-yellow-400 font-mono mb-1">RARITY</div>
                                            <div className="text-lg font-bold text-yellow-300">{mintedRat.rarityScore.toFixed(1)}</div>
                                        </div>
                                        <div className="bg-black/50 border-2 border-red-500 p-3">
                                            <div className="text-xs text-red-400 font-mono mb-1">STAMINA</div>
                                            <div className="text-2xl font-black text-red-300">{mintedRat.stats.stamina}</div>
                                        </div>
                                        <div className="bg-black/50 border-2 border-blue-500 p-3">
                                            <div className="text-xs text-blue-400 font-mono mb-1">AGILITY</div>
                                            <div className="text-2xl font-black text-blue-300">{mintedRat.stats.agility}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-900 to-black border-2 border-green-500/30 p-4 rounded">
                                <div className="text-xs text-green-400 font-mono mb-2">[ SPEED DISTRIBUTION // 5 SEGMENTS ]</div>
                                <div className="grid grid-cols-5 gap-2">
                                    {mintedRat.speeds.map((speed, i) => (
                                        <div key={i} className="bg-black border border-green-500 p-2 text-center">
                                            <div className="text-xs text-green-400 font-mono">SEG {i + 1}</div>
                                            <div className="text-lg font-bold text-green-300">{speed.toFixed(1)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowSuccessModal(false)}
                                    variant="outline"
                                    className="flex-1 border-2 border-gray-500 hover:bg-gray-800 font-mono"
                                >
                                    [ CLOSE ]
                                </Button>
                                <Link href="/my-rats" className="flex-1">
                                    <Button className="w-full bg-green-600 hover:bg-green-700 font-black">
                                        VIEW ALL FIGHTERS &gt;
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-400 font-mono mb-4">// RACER PROCESSING...</p>
                            <Link href="/my-rats">
                                <Button className="bg-green-600 hover:bg-green-700">CHECK ROSTER</Button>
                            </Link>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
