'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { mintRat } from '@/lib/contracts/mint-rat';
import { getTokenByAddress } from '@/lib/tokens';
import Navigation from '@/components/Navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

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
    const { toast } = useToast();
    const [selectedRat, setSelectedRat] = useState<number | null>(null);
    const [minting, setMinting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mintedRat, setMintedRat] = useState<MintedRat | null>(null);
    const [pollingForRat, setPollingForRat] = useState(false);
    const [hoveredRat, setHoveredRat] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    // Format large numbers with K, M, B, T suffixes
    const formatTokenAmount = (amount: string | number): string => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (num >= 1_000_000_000_000) {
            return (num / 1_000_000_000_000).toFixed(2) + 'T';
        } else if (num >= 1_000_000_000) {
            return (num / 1_000_000_000).toFixed(2) + 'B';
        } else if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(2) + 'M';
        } else if (num >= 100_000) {
            return (num / 1_000).toFixed(0) + 'K';
        } else {
            return num.toFixed(0);
        }
    };

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
    const { data: tokenBalance, refetch: refetchBalance, isLoading: isLoadingBalance } = useReadContract({
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

    // Debug log
    useEffect(() => {
        if (selectedRat !== null && address && paymentTokenAddress) {
            console.log('Balance Query:', {
                address,
                paymentTokenAddress,
                tokenBalance: tokenBalance?.toString(),
                isLoadingBalance
            });
        }
    }, [selectedRat, address, paymentTokenAddress, tokenBalance, isLoadingBalance]);

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
                    const amount = mintPrice ? formatTokenAmount(formatUnits(mintPrice, 18)) : '...';
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
        } catch (error) {
            console.error('Mint error:', error);
            toast({
                title: 'MINT FAILED',
                description: error instanceof Error ? error.message : 'Transaction rejected',
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
            } catch {
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
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-2 glitch"
                            data-text="RAT UNDERGROUND"
                            style={{
                                textShadow: '0 0 20px rgba(160,174,192,0.3), 0 0 40px rgba(203,213,224,0.2)',
                                fontFamily: 'monospace',
                                color: '#cbd5e0'
                            }}>
                            RAT UNDERGROUND
                        </h1>
                        <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>{'[ MINTING FACILITY // SECTOR 7 ]'}</p>
                    </div>

                    {/* Get RACE Token Button */}
                    <a
                        href="https://app.uniswap.org/explore/tokens/base/0xea4eaca6e4197ecd092ba77b5da768f19287e06f?inputCurrency=NATIVE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative transition-all duration-300 hover:scale-105"
                        style={{
                            textDecoration: 'none',
                            display: 'inline-block'
                        }}
                    >
                        <div className="flex items-center gap-2 px-4 py-2 border relative overflow-hidden"
                            style={{
                                backgroundColor: 'rgba(45,55,72,0.5)',
                                borderColor: '#4a5568',
                                backdropFilter: 'blur(10px)'
                            }}>
                            {/* Glitching RACE Logo */}
                            <div className="token-glitch-container relative">
                                <div className="token-icon-wrapper relative w-8 h-8 rounded-full overflow-hidden border"
                                    style={{
                                        borderColor: '#4a5568',
                                        backgroundColor: '#000000'
                                    }}>
                                    <Image
                                        src="/race.png"
                                        alt="RACE"
                                        width={32}
                                        height={32}
                                        className="token-glitch w-full h-full object-cover"
                                    />
                                </div>
                            </div>

                            {/* Text */}
                            <div className="flex flex-col">
                                <span className="text-xs font-mono font-black tracking-wider group-hover:text-white transition-colors duration-300"
                                    style={{ color: '#cbd5e0' }}>
                                    GET RACE
                                </span>
                                <span className="text-[10px] font-mono opacity-60"
                                    style={{ color: '#718096' }}>
                                    UNISWAP
                                </span>
                            </div>

                            {/* Hover glow */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                style={{
                                    background: 'radial-gradient(circle at center, rgba(203,213,224,0.1), transparent)',
                                }}
                            />
                        </div>
                    </a>
                </div>

                {/* Info Panel */}
                <div className="mb-12 p-6 border relative" style={{
                    background: 'linear-gradient(to right, rgba(45,55,72,0.2), rgba(26,32,44,0.2))',
                    borderColor: '#4a5568'
                }}>
                    <div className="absolute -top-3 left-4 bg-black px-2 text-xs font-mono" style={{ color: '#a0aec0' }}>ENTRY FEE</div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-black mb-1" style={{ color: '#e2e8f0' }}>
                                {selectedRat !== null && mintPrice ? formatTokenAmount(formatUnits(mintPrice, 18)) : '...'} {selectedTokenSymbol || 'TOKENS'}
                            </div>
                            <div className="text-sm font-mono" style={{ color: '#718096' }}>
                                {selectedRat !== null ? `${'// '}${RAT_RACERS[selectedRat].name} MINT COST` : '// SELECT A RACER'}
                            </div>
                        </div>
                        <div>
                            {!mounted ? (
                                <div className="font-mono text-sm" style={{ color: '#718096' }}>
                                    [?] LOADING...
                                </div>
                            ) : !isConnected ? (
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
                                        color: tokenBalance && mintPrice && tokenBalance >= mintPrice
                                            ? '#a0aec0'
                                            : '#5d4037'
                                    }}>
                                        {isLoadingBalance ? '...' : tokenBalance ? formatTokenAmount(formatUnits(tokenBalance as bigint, 18)) : '0'} {selectedTokenSymbol || 'TOKENS'}
                                    </div>
                                    <div className="text-xs font-mono mt-1" style={{ color: '#718096' }}>
                                        {tokenBalance && mintPrice && tokenBalance < mintPrice && (
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
                                        className="relative bg-black border-2 overflow-hidden transition-all duration-300"
                                        style={{
                                            borderColor: isSelected ? '#cbd5e0' : '#2d3748',
                                            boxShadow: isSelected ? '0 0 25px rgba(160,174,192,0.3)' : 'none'
                                        }}
                                    >
                                        {/* Selected Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-4 left-4 z-10">
                                                <div className="px-3 py-1 text-xs font-black border animate-pulse" style={{
                                                    backgroundColor: '#2d3748',
                                                    borderColor: '#10b981',
                                                    color: '#10b981',
                                                    boxShadow: '0 0 15px rgba(16,185,129,0.3)'
                                                }}>
                                                    SELECTED
                                                </div>
                                            </div>
                                        )}

                                        {/* Price Badge */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <div className="px-3 py-2 text-sm font-black border"
                                                style={{
                                                    backgroundColor: '#2d3748',
                                                    borderColor: '#4a5568',
                                                    color: '#e2e8f0',
                                                    boxShadow: '0 0 15px rgba(74,85,104,0.3)'
                                                }}>
                                                {price ? formatTokenAmount(formatUnits(price, 18)) : '...'} {tokenSymbol || 'TOKENS'}
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

                                            {/* Token Icon with Glitch Effect */}
                                            {config && (() => {
                                                const tokenInfo = getTokenByAddress(config[0]);
                                                return tokenInfo && (
                                                    <div className="absolute bottom-6 left-6 z-20">
                                                        <div className="token-glitch-container relative">
                                                            <div className="token-icon-wrapper relative w-16 h-16 border-2 rounded-full overflow-hidden"
                                                                style={{
                                                                    borderColor: '#4a5568',
                                                                    backgroundColor: '#000000',
                                                                    boxShadow: '0 0 20px rgba(74,85,104,0.6)'
                                                                }}>
                                                                <Image
                                                                    src={tokenInfo.logo}
                                                                    alt={tokenInfo.symbol}
                                                                    width={64}
                                                                    height={64}
                                                                    className="token-glitch w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            {/* Glitch Text */}
                                                            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                                                <div className="text-xs font-black px-2 py-1" style={{
                                                                    backgroundColor: '#1a202c',
                                                                    color: '#cbd5e0',
                                                                    border: '1px solid #4a5568'
                                                                }}>
                                                                    {tokenInfo.symbol}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

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
                                                {'// '}{rat.tagline}
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
                    <button
                        onClick={handleMint}
                        disabled={minting || selectedRat === null || !isConnected}
                        className="relative px-16 py-6 font-mono font-black text-2xl tracking-wider transition-all duration-500 overflow-hidden group hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: selectedRat !== null
                                ? 'linear-gradient(to bottom right, #2d3748, #000000)'
                                : 'linear-gradient(135deg, #2d3748, #1a1a1a)',
                            color: '#cbd5e0',
                            cursor: minting || selectedRat === null || !isConnected ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {/* Animated gradient border */}
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: selectedRat !== null
                                    ? 'linear-gradient(45deg, #cbd5e0 0%, #718096 25%, #4a5568 50%, #718096 75%, #cbd5e0 100%)'
                                    : 'linear-gradient(to right, #4a5568, #2d3748)',
                                backgroundSize: '200% 200%',
                                padding: '1.5px',
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                animation: selectedRat !== null && !minting ? 'gradient-shift 3s ease infinite' : 'none'
                            }}
                        />
                        {/* Shine effect on hover */}
                        {!minting && selectedRat !== null && (
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                                style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
                                    transform: 'translateX(-100%)',
                                }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-4 group-hover:text-white transition-colors duration-300">
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
                                <>
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                    {`MINT ${RAT_RACERS[selectedRat].name}`}
                                </>
                            )}
                        </span>
                    </button>
                </div>
            </div>

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="bg-black border-2 text-white max-w-3xl"
                    style={{ borderColor: '#4a5568', boxShadow: '0 0 40px rgba(74,85,104,0.3)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black text-center mb-4 glitch" data-text="[ RACER MINTED ]" style={{ fontFamily: 'monospace', color: '#cbd5e0' }}>
                            [ RACER MINTED ]
                        </DialogTitle>
                    </DialogHeader>

                    {pollingForRat ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4a5568' }}></div>
                                <div className="absolute inset-2 border-4 border-b-transparent rounded-full animate-spin-slow" style={{ borderColor: '#718096' }}></div>
                            </div>
                            <p className="font-mono animate-pulse" style={{ color: '#a0aec0' }}>{'// GENERATING RACER STATS...'}</p>
                        </div>
                    ) : mintedRat ? (
                        <div className="space-y-6">
                            <div className="flex gap-6">
                                <div className="w-64 h-64 border-2 flex items-center justify-center overflow-hidden shrink-0" style={{
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
                                        <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>BLOODLINE</div>
                                            <div className="text-lg font-bold" style={{ color: '#a0aec0' }}>{mintedRat.stats.bloodline}</div>
                                        </div>
                                        <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>RARITY</div>
                                            <div className="text-lg font-bold" style={{ color: '#a0aec0' }}>{mintedRat.rarityScore.toFixed(1)}</div>
                                        </div>
                                        <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>STAMINA</div>
                                            <div className="text-2xl font-black" style={{ color: '#cbd5e0' }}>{mintedRat.stats.stamina}</div>
                                        </div>
                                        <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                            <div className="text-xs font-mono mb-1" style={{ color: '#718096' }}>AGILITY</div>
                                            <div className="text-2xl font-black" style={{ color: '#cbd5e0' }}>{mintedRat.stats.agility}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border p-4" style={{
                                background: 'linear-gradient(to right, #1a202c, #000000)',
                                borderColor: '#4a5568'
                            }}>
                                <div className="text-xs font-mono mb-2" style={{ color: '#a0aec0' }}>{'[ SPEED DISTRIBUTION // 5 SEGMENTS ]'}</div>
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
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="relative flex-1 px-6 py-3 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02] bg-black"
                                    style={{ color: '#a0aec0' }}
                                >
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: 'linear-gradient(to right, #cbd5e0, #4a5568)',
                                            padding: '1px',
                                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                            WebkitMaskComposite: 'xor',
                                            maskComposite: 'exclude',
                                        }}
                                    />
                                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                        [ CLOSE ]
                                    </span>
                                </button>
                                <Link href="/my-rats" className="flex-1">
                                    <button
                                        className="relative w-full px-6 py-3 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                                        style={{
                                            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)',
                                            color: '#cbd5e0',
                                            animation: 'subtle-glow 3s ease-in-out infinite'
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                                            style={{
                                                background: 'linear-gradient(to bottom, #cbd5e0, #4a5568)',
                                                padding: '1px',
                                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                                WebkitMaskComposite: 'xor',
                                                maskComposite: 'exclude',
                                            }}
                                        />
                                        <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                            VIEW ALL RACERS &gt;
                                        </span>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="font-mono mb-4" style={{ color: '#718096' }}>{'// RACER PROCESSING...'}</p>
                            <Link href="/my-rats">
                                <button
                                    className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                                    style={{
                                        background: 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)',
                                        color: '#cbd5e0',
                                        animation: 'subtle-glow 3s ease-in-out infinite'
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            background: 'linear-gradient(to bottom, #cbd5e0, #4a5568)',
                                            padding: '1px',
                                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                            WebkitMaskComposite: 'xor',
                                            maskComposite: 'exclude',
                                        }}
                                    />
                                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                        CHECK ROSTER
                                    </span>
                                </button>
                            </Link>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes gradient-shift {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }

                @keyframes subtle-glow {
                    0%, 100% {
                        box-shadow: 0 0 5px rgba(74, 85, 104, 0.2);
                    }
                    50% {
                        box-shadow: 0 0 15px rgba(74, 85, 104, 0.4);
                    }
                }

                @keyframes subtle-pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.9;
                    }
                }
            `}</style>
        </div>
    );
}
