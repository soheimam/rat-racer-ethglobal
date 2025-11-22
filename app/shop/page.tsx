'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { mintRat } from '@/lib/contracts/mint-rat';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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
    const [mounted, setMounted] = useState(false);

    // Contract addresses from environment variables
    const RAT_NFT_ADDRESS = process.env.NEXT_PUBLIC_RAT_NFT_ADDRESS as `0x${string}`;

    const RAT_CONFIG_ABI = [
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
    ] as const;

    const TOKEN_ABI = [
        {
            inputs: [],
            name: 'symbol',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function'
        },
        {
            inputs: [{ name: 'account', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
        }
    ] as const;

    // Read configuration for all 3 rats
    const { data: rat0Config } = useReadContract({
        address: RAT_NFT_ADDRESS,
        abi: RAT_CONFIG_ABI,
        functionName: 'getRatConfig',
        args: [0]
    });

    const { data: rat1Config } = useReadContract({
        address: RAT_NFT_ADDRESS,
        abi: RAT_CONFIG_ABI,
        functionName: 'getRatConfig',
        args: [1]
    });

    const { data: rat2Config } = useReadContract({
        address: RAT_NFT_ADDRESS,
        abi: RAT_CONFIG_ABI,
        functionName: 'getRatConfig',
        args: [2]
    });

    const ratConfigs = [rat0Config, rat1Config, rat2Config];

    // Get token symbols for all payment tokens
    const { data: token0Symbol } = useReadContract({
        address: rat0Config?.[0] as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'symbol',
        query: { enabled: !!rat0Config?.[0] }
    });

    const { data: token1Symbol } = useReadContract({
        address: rat1Config?.[0] as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'symbol',
        query: { enabled: !!rat1Config?.[0] }
    });

    const { data: token2Symbol } = useReadContract({
        address: rat2Config?.[0] as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: 'symbol',
        query: { enabled: !!rat2Config?.[0] }
    });

    const tokenSymbols = [token0Symbol, token1Symbol, token2Symbol];

    // Get selected rat data
    const selectedRatConfig = selectedRat !== null ? ratConfigs[selectedRat] : undefined;
    const paymentTokenAddress = selectedRatConfig?.[0] as `0x${string}` | undefined;
    const mintPrice = selectedRatConfig?.[1] as bigint | undefined;
    const selectedTokenSymbol = selectedRat !== null ? tokenSymbols[selectedRat] : undefined;

    // Read balance of the payment token for selected rat
    const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
        address: paymentTokenAddress,
        abi: TOKEN_ABI,
        functionName: 'balanceOf',
        args: address && paymentTokenAddress ? [address] : undefined,
        query: {
            enabled: !!address && !!paymentTokenAddress,
            refetchInterval: false,
        }
    });

    useEffect(() => {
        setMounted(true);
    }, []);

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
                    const tokenName = selectedTokenSymbol || 'tokens';
                    const amount = mintPrice ? formatUnits(mintPrice, 18) : '...';
                    toast({ title: 'APPROVAL NEEDED', description: `Approve ${amount} ${tokenName} in wallet...` });
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
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-700 rounded-full filter blur-[128px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-600 rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
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
                        <h1 className="text-6xl font-black tracking-tighter mb-2 glitch"
                            data-text="RAT UNDERGROUND"
                            style={{
                                textShadow: '0 0 20px rgba(160,174,192,0.3), 0 0 40px rgba(203,213,224,0.2)',
                                fontFamily: 'monospace',
                                color: '#cbd5e0'
                            }}>
                            RAT UNDERGROUND
                        </h1>
                        <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>[ MINTING FACILITY // SECTOR 7 ]</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {!mounted ? (
                            <div className="glass-button font-mono font-black px-6 py-3 text-lg border-2"
                                style={{
                                    backgroundColor: '#2d3748',
                                    borderColor: '#4a5568',
                                    color: '#e2e8f0',
                                    opacity: 0.5
                                }}
                            >
                                LOADING...
                            </div>
                        ) : !isConnected ? (
                            <Button
                                onClick={() => {
                                    const connector = connectors[0];
                                    if (connector) {
                                        connect({ connector });
                                    }
                                }}
                                disabled={isPending || !connectors.length}
                                className="glass-button font-mono font-black px-6 py-3 text-lg border-2 disabled:opacity-50"
                                style={{
                                    backgroundColor: '#2d3748',
                                    borderColor: '#4a5568',
                                    color: '#e2e8f0',
                                    boxShadow: '0 0 15px rgba(74,85,104,0.3)'
                                }}
                            >
                                {isPending ? 'CONNECTING...' : '[!] CONNECT WALLET'}
                            </Button>
                        ) : (
                            <div className="text-right">
                                <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>CONNECTED</div>
                                <div className="text-sm font-mono" style={{ color: '#cbd5e0' }}>
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </div>
                            </div>
                        )}
                        <Link href="/">
                            <Button variant="outline" className="glass-button border-gray-600 font-mono" style={{ color: '#a0aec0' }}>
                                &lt; EXIT
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Info Panel */}
                <div className="mb-12 p-6 border-2 relative" style={{
                    background: 'linear-gradient(to right, rgba(45,55,72,0.2), rgba(26,32,44,0.2))',
                    borderColor: '#4a5568'
                }}>
                    <div className="absolute -top-3 left-4 bg-black px-2 text-xs font-mono" style={{ color: '#a0aec0' }}>ENTRY FEE</div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-black mb-1" style={{ color: '#e2e8f0' }}>
                                {selectedRat !== null && mintPrice ? formatUnits(mintPrice, 18) : '...'} {selectedTokenSymbol || 'TOKENS'}
                            </div>
                            <div className="text-sm font-mono" style={{ color: '#718096' }}>
                                {selectedRat !== null ? `// ${RAT_RACERS[selectedRat].name} MINT COST` : '// SELECT A RACER'}
                            </div>
                        </div>
                        <div>
                            {!isConnected ? (
                                <div className="font-mono text-sm animate-pulse" style={{ color: '#718096' }}>
                                    [!] WALLET NOT CONNECTED
                                </div>
                            ) : selectedRat === null ? (
                                <div className="font-mono text-sm" style={{ color: '#718096' }}>
                                    [?] SELECT RACER TO SEE BALANCE
                                </div>
                            ) : (
                                <div className="text-right">
                                    <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>YOUR BALANCE</div>
                                    <div className={`text-3xl font-black font-mono`} style={{
                                        color: tokenBalance && mintPrice && Number(formatUnits(tokenBalance as bigint, 18)) >= Number(formatUnits(mintPrice, 18))
                                            ? '#a0aec0'
                                            : '#5d4037'
                                    }}>
                                        {tokenBalance ? Number(formatUnits(tokenBalance as bigint, 18)).toFixed(0) : '0'} {selectedTokenSymbol || 'TOKENS'}
                                    </div>
                                    <div className="text-xs font-mono mt-1" style={{ color: '#718096' }}>
                                        {tokenBalance && mintPrice && Number(formatUnits(tokenBalance as bigint, 18)) < Number(formatUnits(mintPrice, 18)) && (
                                            <span style={{ color: '#5d4037' }}>[!] INSUFFICIENT FUNDS</span>
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
                            const config = ratConfigs[rat.id];
                            const tokenSymbol = tokenSymbols[rat.id];
                            const price = config?.[1];

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
                                            className="absolute inset-0 filter blur-xl transition-opacity duration-300"
                                            style={{ backgroundColor: 'rgba(74,85,104,0.3)' }}
                                        ></div>
                                    )}

                                    {/* Card */}
                                    <div
                                        className="relative bg-black border-4 overflow-hidden transition-all duration-300"
                                        style={{
                                            borderColor: isSelected ? '#cbd5e0' : '#2d3748',
                                            boxShadow: isSelected ? '0 0 25px rgba(160,174,192,0.3)' : 'none'
                                        }}
                                    >
                                        {/* Selected Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-4 left-4 z-10">
                                                <div className="px-3 py-1 text-xs font-black animate-pulse" style={{
                                                    backgroundColor: '#4a5568',
                                                    color: '#e2e8f0'
                                                }}>
                                                    SELECTED
                                                </div>
                                            </div>
                                        )}

                                        {/* Price Badge */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <div className="px-3 py-2 text-sm font-black border-2"
                                                style={{
                                                    backgroundColor: '#2d3748',
                                                    borderColor: '#4a5568',
                                                    color: '#e2e8f0',
                                                    boxShadow: '0 0 15px rgba(74,85,104,0.3)'
                                                }}>
                                                {price ? formatUnits(price, 18) : '...'} {tokenSymbol || 'TOKENS'}
                                            </div>
                                        </div>

                                        {/* Image */}
                                        <div
                                            className="relative h-80 flex items-center justify-center overflow-hidden"
                                            style={{
                                                background: 'linear-gradient(to bottom, #1a202c, #000000)',
                                                borderBottom: '2px solid #2d3748'
                                            }}
                                        >
                                            <div className="absolute inset-0 opacity-10"
                                                style={{
                                                    backgroundImage: 'radial-gradient(circle at center, #4a5568, transparent)'
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
                                        <div className="p-6" style={{ background: 'linear-gradient(to bottom, #1a202c, #000000)' }}>
                                            <div className="text-3xl font-black mb-1 tracking-wider" style={{ color: '#cbd5e0' }}>
                                                {rat.name}
                                            </div>
                                            <div className="text-sm font-mono mb-4" style={{ color: '#718096' }}>
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
                        className="glass-button relative px-16 py-8 text-2xl font-black tracking-wider disabled:opacity-50"
                        style={{
                            background: selectedRat !== null
                                ? 'linear-gradient(135deg, #4a5568, #1a202c)'
                                : 'linear-gradient(135deg, #2d3748, #1a1a1a)',
                            border: '3px solid',
                            borderColor: selectedRat !== null ? '#718096' : '#4a5568',
                            color: '#e2e8f0',
                            boxShadow: selectedRat !== null && !minting
                                ? '0 0 25px rgba(160,174,192,0.3)'
                                : 'none',
                        }}
                    >
                        {minting ? (
                            <div className="industrial-loader">
                                <div className="industrial-loader-bars">
                                    <div className="industrial-loader-bar"></div>
                                    <div className="industrial-loader-bar"></div>
                                    <div className="industrial-loader-bar"></div>
                                    <div className="industrial-loader-bar"></div>
                                    <div className="industrial-loader-bar"></div>
                                </div>
                                <span className="loading-text">MINTING</span>
                            </div>
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
                <DialogContent className="bg-black border-4 text-white max-w-3xl"
                    style={{ borderColor: '#4a5568', boxShadow: '0 0 40px rgba(74,85,104,0.3)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black text-center mb-4" style={{ fontFamily: 'monospace', color: '#cbd5e0' }}>
                            [ RACER MINTED ]
                        </DialogTitle>
                    </DialogHeader>

                    {pollingForRat ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4a5568' }}></div>
                                <div className="absolute inset-2 border-4 border-b-transparent rounded-full animate-spin-slow" style={{ borderColor: '#718096' }}></div>
                            </div>
                            <p className="font-mono animate-pulse" style={{ color: '#a0aec0' }}>// GENERATING RACER STATS...</p>
                        </div>
                    ) : mintedRat ? (
                        <div className="space-y-6">
                            <div className="flex gap-6">
                                <div className="w-64 h-64 border-4 flex items-center justify-center overflow-hidden shrink-0" style={{
                                    background: 'linear-gradient(to bottom right, #1a202c, #000000)',
                                    borderColor: '#4a5568'
                                }}>
                                    <img
                                        src={mintedRat.imageUrl}
                                        alt={mintedRat.name}
                                        className="w-full h-full object-contain"
                                        style={{ filter: 'drop-shadow(0 0 20px rgba(160,174,192,0.3))' }}
                                    />
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="text-4xl font-black mb-1" style={{ color: '#cbd5e0' }}>{mintedRat.name}</div>
                                        <div className="font-mono text-sm" style={{ color: '#718096' }}>TOKEN #{mintedRat.tokenId}</div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/50 border-2 p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>BLOODLINE</div>
                                            <div className="text-lg font-bold" style={{ color: '#a0aec0' }}>{mintedRat.stats.bloodline}</div>
                                        </div>
                                        <div className="bg-black/50 border-2 p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>RARITY</div>
                                            <div className="text-lg font-bold" style={{ color: '#a0aec0' }}>{mintedRat.rarityScore.toFixed(1)}</div>
                                        </div>
                                        <div className="bg-black/50 border-2 p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>STAMINA</div>
                                            <div className="text-2xl font-black" style={{ color: '#cbd5e0' }}>{mintedRat.stats.stamina}</div>
                                        </div>
                                        <div className="bg-black/50 border-2 p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>AGILITY</div>
                                            <div className="text-2xl font-black" style={{ color: '#cbd5e0' }}>{mintedRat.stats.agility}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-2 p-4" style={{
                                background: 'linear-gradient(to right, #1a202c, #000000)',
                                borderColor: '#4a5568'
                            }}>
                                <div className="text-xs font-mono mb-2" style={{ color: '#a0aec0' }}>[ SPEED DISTRIBUTION // 5 SEGMENTS ]</div>
                                <div className="grid grid-cols-5 gap-2">
                                    {mintedRat.speeds.map((speed, i) => (
                                        <div key={i} className="bg-black border p-2 text-center" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono" style={{ color: '#718096' }}>SEG {i + 1}</div>
                                            <div className="text-lg font-bold" style={{ color: '#cbd5e0' }}>{speed.toFixed(1)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setShowSuccessModal(false)}
                                    variant="outline"
                                    className="flex-1 border-2 font-mono"
                                    style={{ borderColor: '#4a5568', color: '#a0aec0' }}
                                >
                                    [ CLOSE ]
                                </Button>
                                <Link href="/my-rats" className="flex-1">
                                    <Button className="w-full font-black" style={{
                                        backgroundColor: '#2d3748',
                                        color: '#e2e8f0'
                                    }}>
                                        VIEW ALL RACERS &gt;
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="font-mono mb-4" style={{ color: '#718096' }}>// RACER PROCESSING...</p>
                            <Link href="/my-rats">
                                <Button style={{ backgroundColor: '#2d3748', color: '#e2e8f0' }}>CHECK ROSTER</Button>
                            </Link>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
