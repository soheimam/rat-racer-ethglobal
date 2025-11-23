'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

interface RaceEntry {
    address?: string;
    ratTokenId?: number;
    enteredAt: string;
    position?: number;
}

interface Race {
    _id?: string;
    id: string;
    raceId?: number;
    creator?: string;
    trackId?: number;
    entryToken?: string;
    title: string;
    description: string;
    status: string;
    entryFee: string;
    prizePool: string;
    maxParticipants: number;
    participants: RaceEntry[];
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
    winner?: {
        ratId: string;
        owner: string;
        prize: string;
    };
}

const RACE_MANAGER_ABI = [
    {
        inputs: [
            { name: 'trackId', type: 'uint8' },
            { name: 'entryToken', type: 'address' },
            { name: 'entryFee', type: 'uint256' }
        ],
        name: 'createRace',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function'
    },
    {
        inputs: [
            { name: 'raceId', type: 'uint256' },
            { name: 'ratTokenId', type: 'uint256' }
        ],
        name: 'enterRace',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
    },
] as const;

export default function RacesPage() {
    const { address, isConnected } = useAccount();
    const { toast } = useToast();
    const [activeRaces, setActiveRaces] = useState<Race[]>([]);
    const [completedRaces, setCompletedRaces] = useState<Race[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredRace, setHoveredRace] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEntryFee, setNewEntryFee] = useState('100');
    const [selectedTokenAddress, setSelectedTokenAddress] = useState<`0x${string}` | ''>('');

    const RACE_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_RACE_MANAGER_ADDRESS as `0x${string}`;

    const { writeContract: createRaceWrite, data: createRaceHash, isPending: isWritePending } = useWriteContract();
    const { isLoading: isCreatingRace, isSuccess: raceCreated } = useWaitForTransactionReceipt({
        hash: createRaceHash,
    });
    const [pollingForRace, setPollingForRace] = useState(false);

    // Fetch races
    const fetchRaces = async () => {
        try {
            const response = await fetch('/api/races');
            if (response.ok) {
                const data = await response.json();
                setActiveRaces(data.activeRaces || []);
                setCompletedRaces(data.completedRaces || []);
            }
        } catch (error) {
            console.error('Failed to fetch races:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRaces();
        // Set default selected token (RACE token)
        if (SUPPORTED_TOKENS.length > 0 && !selectedTokenAddress) {
            setSelectedTokenAddress(SUPPORTED_TOKENS[0].address);
        }
        const interval = setInterval(fetchRaces, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (raceCreated && createRaceHash) {
            toast({
                title: 'TRANSACTION CONFIRMED',
                description: 'Waiting for race to be created...',
            });
            setPollingForRace(true);
            pollForCreatedRace();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [raceCreated]);

    const pollForCreatedRace = async (maxAttempts = 20) => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch('/api/races');
                if (response.ok) {
                    const data = await response.json();
                    // Check if we have a new race that matches our transaction
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const newRace = data.activeRaces.find((r: any) =>
                        r.txHash === createRaceHash ||
                        (r.creator === address && new Date(r.createdAt).getTime() > Date.now() - 30000)
                    );

                    if (newRace) {
                        setPollingForRace(false);
                        toast({
                            title: 'RACE CREATED',
                            description: `Race #${newRace.raceId} is now open for entries!`,
                        });
                        setShowCreateModal(false);
                        fetchRaces();
                        return;
                    }
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                console.log(`Polling attempt ${i + 1} failed`);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setPollingForRace(false);
        toast({
            title: 'RACE PROCESSING',
            description: 'Your race is being created. Refresh in a moment.',
        });
        setShowCreateModal(false);
        fetchRaces();
    };

    const handleCreateRace = async () => {
        if (!address || !isConnected) {
            toast({
                title: 'NO WALLET',
                description: 'Connect wallet to create a race',
                variant: 'destructive',
            });
            return;
        }

        if (!selectedTokenAddress || selectedTokenAddress === '0x0') {
            toast({
                title: 'NO TOKEN SELECTED',
                description: 'Please select an entry token',
                variant: 'destructive',
            });
            return;
        }

        try {
            const entryFeeWei = parseUnits(newEntryFee, 18);
            createRaceWrite({
                address: RACE_MANAGER_ADDRESS,
                abi: RACE_MANAGER_ABI,
                functionName: 'createRace',
                args: [1, selectedTokenAddress, entryFeeWei],
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Create race error:', error);
            toast({
                title: 'CREATE FAILED',
                description: error.message || 'Transaction rejected',
                variant: 'destructive',
            });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
            case 'waiting':
                return '#a0aec0'; // Gray-400
            case 'full':
                return '#cbd5e0'; // Gray-300
            case 'running':
            case 'in_progress':
                return '#718096'; // Gray-500
            case 'completed':
                return '#4a5568'; // Gray-600
            default:
                return '#a0aec0';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
            case 'waiting':
                return 'OPEN';
            case 'full':
                return 'FULL';
            case 'running':
            case 'in_progress':
                return 'RACING';
            case 'completed':
                return 'FINISHED';
            default:
                return status.toUpperCase();
        }
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
                <div className="mb-12">
                    <h1 className="text-6xl font-black tracking-tighter mb-2 glitch"
                        data-text="RAT RACES"
                        style={{
                            textShadow: '0 0 20px rgba(160,174,192,0.3), 0 0 40px rgba(203,213,224,0.2)',
                            fontFamily: 'monospace',
                            color: '#cbd5e0'
                        }}>
                        RAT RACES
                    </h1>
                    <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>{'[ UNDERGROUND CIRCUIT // RACE ENTRY ]'}</p>
                </div>

                {/* Active Races Section */}
                <div className="mb-16">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-black tracking-wider font-mono" style={{ color: '#cbd5e0' }}>
                            [ ACTIVE RACES ]
                        </h2>
                        {isConnected && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)',
                                    color: '#cbd5e0'
                                }}
                            >
                                <div
                                    className="absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                                    style={{
                                        background: 'linear-gradient(to bottom, #cbd5e0, #4a5568)',
                                        padding: '1px',
                                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                        WebkitMaskComposite: 'xor',
                                        maskComposite: 'exclude',
                                    }}
                                />
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{
                                        background: 'linear-gradient(to bottom, #e2e8f0, #718096)',
                                        padding: '1px',
                                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                        WebkitMaskComposite: 'xor',
                                        maskComposite: 'exclude',
                                    }}
                                />
                                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                    + CREATE RACE
                                </span>
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#718096', borderTopColor: 'transparent' }}></div>
                            </div>
                        </div>
                    ) : activeRaces.length === 0 ? (
                        <div className="text-center py-16 border-4" style={{
                            borderColor: '#2d3748',
                            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
                            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
                        }}>
                            <p className="font-mono text-lg mb-8 tracking-wider" style={{ color: '#718096' }}>
                                {'// NO ACTIVE RACES FOUND'}
                            </p>
                            {isConnected && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="relative px-16 py-6 font-mono font-black text-2xl tracking-wider transition-all duration-500 overflow-hidden group hover:scale-105"
                                    style={{
                                        background: 'linear-gradient(to bottom right, #2d3748, #000000)',
                                        color: '#cbd5e0'
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 opacity-100"
                                        style={{
                                            background: 'linear-gradient(45deg, #cbd5e0 0%, #718096 25%, #4a5568 50%, #718096 75%, #cbd5e0 100%)',
                                            backgroundSize: '200% 200%',
                                            padding: '1.5px',
                                            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                            WebkitMaskComposite: 'xor',
                                            maskComposite: 'exclude',
                                            animation: 'gradient-shift 3s ease infinite'
                                        }}
                                    />
                                    <span className="relative z-10 flex items-center gap-4 group-hover:text-white transition-colors duration-300">
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                        </svg>
                                        START A RACE
                                    </span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeRaces.map((race) => (
                                <RaceCard
                                    key={race.id}
                                    race={race}
                                    isHovered={hoveredRace === race.id}
                                    onHover={() => setHoveredRace(race.id)}
                                    onLeave={() => setHoveredRace(null)}
                                    getStatusColor={getStatusColor}
                                    getStatusText={getStatusText}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Completed Races Section */}
                {completedRaces.length > 0 && (
                    <div>
                        <h2 className="text-3xl font-black mb-6 tracking-wider font-mono" style={{ color: '#cbd5e0' }}>
                            [ PAST RACES ]
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedRaces.map((race) => (
                                <RaceCard
                                    key={race.id}
                                    race={race}
                                    isHovered={hoveredRace === race.id}
                                    onHover={() => setHoveredRace(race.id)}
                                    onLeave={() => setHoveredRace(null)}
                                    getStatusColor={getStatusColor}
                                    getStatusText={getStatusText}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Stats */}
                <div className="mt-12 flex justify-between items-center font-mono text-xs" style={{ color: '#718096' }}>
                    <span>{'// '}{activeRaces.length + completedRaces.length} RACES FOUND</span>
                    <span>{'// SYSTEM STATUS: OPERATIONAL'}</span>
                </div>
            </div>

            {/* Create Race Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="bg-black border-4 text-white max-w-2xl"
                    style={{
                        borderColor: '#4a5568',
                        boxShadow: '0 0 40px rgba(74,85,104,0.3)',
                        background: 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)'
                    }}>
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black text-center mb-6 glitch font-mono" data-text="[ CREATE RACE ]"
                            style={{
                                color: '#cbd5e0',
                                textShadow: '0 0 20px rgba(160,174,192,0.3)'
                            }}>
                            [ CREATE RACE ]
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Token Selection */}
                        <div>
                            <label className="text-xs font-mono mb-2 block" style={{ color: '#718096' }}>ENTRY TOKEN</label>
                            <div className="grid grid-cols-2 gap-3">
                                {SUPPORTED_TOKENS.map((token) => (
                                    <button
                                        key={token.address}
                                        onClick={() => setSelectedTokenAddress(token.address)}
                                        className="border-2 p-4 transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                                        style={{
                                            backgroundColor: selectedTokenAddress === token.address ? '#2d3748' : '#000000',
                                            borderColor: selectedTokenAddress === token.address ? '#cbd5e0' : '#4a5568',
                                            boxShadow: selectedTokenAddress === token.address ? '0 0 20px rgba(203,213,224,0.3)' : 'none',
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: '#4a5568' }}>
                                                <Image
                                                    src={token.logo}
                                                    alt={token.symbol}
                                                    width={48}
                                                    height={48}
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-lg font-black" style={{ color: '#e2e8f0' }}>
                                                    {token.symbol}
                                                </div>
                                                <div className="text-xs font-mono" style={{ color: '#718096' }}>
                                                    {token.name}
                                                </div>
                                            </div>
                                        </div>
                                        {selectedTokenAddress === token.address && (
                                            <div className="absolute top-2 right-2 w-3 h-3 rounded-full" style={{ backgroundColor: '#cbd5e0' }}></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs font-mono mt-2" style={{ color: '#718096' }}>// SELECT TOKEN FOR RACE ENTRY FEE</p>
                        </div>

                        {/* Entry Fee Input */}
                        <div>
                            <label className="text-xs font-mono mb-2 block" style={{ color: '#718096' }}>
                                ENTRY FEE ({SUPPORTED_TOKENS.find(t => t.address === selectedTokenAddress)?.symbol || 'TOKENS'})
                            </label>
                            <input
                                type="number"
                                value={newEntryFee}
                                onChange={(e) => setNewEntryFee(e.target.value)}
                                className="w-full bg-black border-2 px-6 py-4 text-2xl font-black font-mono focus:outline-none transition-all duration-300 focus:border-[#718096]"
                                style={{
                                    borderColor: '#4a5568',
                                    color: '#cbd5e0'
                                }}
                                placeholder="100"
                            />
                            <p className="text-xs font-mono mt-2 tracking-wider" style={{ color: '#718096' }}>{'// TRACK 1 // MAX 6 RACERS'}</p>
                        </div>

                        <div className="border-2 p-6" style={{
                            background: 'linear-gradient(to right, #1a202c, #000000)',
                            borderColor: '#4a5568'
                        }}>
                            <div className="text-xs font-mono mb-3 tracking-wider font-black" style={{ color: '#a0aec0' }}>[ RACE DETAILS ]</div>
                            <div className="space-y-2 text-sm font-mono">
                                <div className="flex justify-between py-2 border-b" style={{ borderColor: '#2d3748' }}>
                                    <span style={{ color: '#718096' }}>Creator Fee:</span>
                                    <span className="font-black" style={{ color: '#e2e8f0' }}>10%</span>
                                </div>
                                <div className="flex justify-between py-2 border-b" style={{ borderColor: '#2d3748' }}>
                                    <span style={{ color: '#718096' }}>Winner Pool:</span>
                                    <span className="font-black" style={{ color: '#e2e8f0' }}>90%</span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span style={{ color: '#718096' }}>Max Racers:</span>
                                    <span className="font-black" style={{ color: '#e2e8f0' }}>6</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateRace}
                            disabled={isWritePending || isCreatingRace || pollingForRace || !newEntryFee || parseFloat(newEntryFee) <= 0}
                            className="glass-button w-full font-black py-6 text-xl disabled:opacity-50 border-2 transition-all duration-500"
                            style={{
                                backgroundColor: '#2d3748',
                                borderColor: '#4a5568',
                                color: '#e2e8f0',
                                boxShadow: !isWritePending && !isCreatingRace && !pollingForRace ? '0 0 30px rgba(74,85,104,0.5)' : 'none',
                                cursor: (isWritePending || isCreatingRace || pollingForRace) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isWritePending ? (
                                <div className="industrial-loader">
                                    <div className="industrial-loader-bars">
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                    </div>
                                    <span className="loading-text">CONFIRM IN WALLET</span>
                                </div>
                            ) : isCreatingRace ? (
                                <div className="industrial-loader">
                                    <div className="industrial-loader-bars">
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                    </div>
                                    <span className="loading-text">CONFIRMING TX</span>
                                </div>
                            ) : pollingForRace ? (
                                <div className="industrial-loader">
                                    <div className="industrial-loader-bars">
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                        <div className="industrial-loader-bar"></div>
                                    </div>
                                    <span className="loading-text">PROCESSING</span>
                                </div>
                            ) : (
                                '[!] CREATE RACE'
                            )}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CSS for animations */}
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

                .glitch {
                    position: relative;
                }

                .glitch::before,
                .glitch::after {
                    content: attr(data-text);
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                }

                .glitch:hover::before {
                    animation: glitch-1 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
                    color: #cbd5e0;
                    z-index: -1;
                }

                .glitch:hover::after {
                    animation: glitch-2 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both infinite;
                    color: #718096;
                    z-index: -1;
                }

                @keyframes glitch-1 {
                    0%, 100% {
                        transform: translate(0);
                        opacity: 0;
                    }
                    33% {
                        transform: translate(-2px, 2px);
                        opacity: 0.3;
                    }
                    66% {
                        transform: translate(2px, -2px);
                        opacity: 0.3;
                    }
                }

                @keyframes glitch-2 {
                    0%, 100% {
                        transform: translate(0);
                        opacity: 0;
                    }
                    33% {
                        transform: translate(2px, -2px);
                        opacity: 0.2;
                    }
                    66% {
                        transform: translate(-2px, 2px);
                        opacity: 0.2;
                    }
                }
            `}</style>
        </div>
    );
}

function RaceCard({
    race,
    isHovered,
    onHover,
    onLeave,
    getStatusColor,
    getStatusText,
}: {
    race: Race;
    isHovered: boolean;
    onHover: () => void;
    onLeave: () => void;
    getStatusColor: (status: string) => string;
    getStatusText: (status: string) => string;
}) {
    const statusColor = getStatusColor(race.status);
    const statusText = getStatusText(race.status);
    const RACE_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_RACE_TOKEN_ADDRESS as `0x${string}`;

    const TOKEN_ABI = [
        {
            inputs: [],
            name: 'symbol',
            outputs: [{ name: '', type: 'string' }],
            stateMutability: 'view',
            type: 'function'
        }
    ] as const;

    const { data: tokenSymbol } = useReadContract({
        address: race.entryToken as `0x${string}` || RACE_TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'symbol',
    });

    return (
        <Link href={`/race/${race.raceId || race.id}`}>
            <div
                className={`relative cursor-pointer transition-all duration-300 transform ${isHovered ? 'scale-105' : 'scale-100'
                    }`}
                onMouseEnter={onHover}
                onMouseLeave={onLeave}
            >
                {/* Glow Effect */}
                {isHovered && (
                    <div
                        className="absolute inset-0 filter blur-xl transition-opacity duration-300"
                        style={{ backgroundColor: 'rgba(74,85,104,0.3)' }}
                    ></div>
                )}

                {/* Card */}
                <div
                    className="relative bg-black border-4 overflow-hidden transition-all duration-300"
                    style={{
                        borderColor: isHovered ? '#718096' : '#2d3748',
                        boxShadow: isHovered ? '0 0 25px rgba(74,85,104,0.3)' : 'none',
                        background: isHovered ? 'linear-gradient(to right, #1a202c, #000000)' : 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)'
                    }}
                >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                        <div
                            className="px-3 py-1 text-xs font-black border font-mono tracking-wider"
                            style={{
                                backgroundColor: '#2d3748',
                                borderColor: statusColor,
                                color: '#e2e8f0',
                                boxShadow: `0 0 10px ${statusColor}40`
                            }}
                        >
                            {statusText}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="text-2xl font-black mb-2 font-mono tracking-wider" style={{ color: '#cbd5e0' }}>
                            {race.title}
                        </div>
                        <div className="text-sm font-mono mb-6 tracking-wider" style={{ color: '#718096' }}>
                            {'// '}{race.description}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-black/50 border-2 p-4 transition-all duration-300 hover:border-[#718096]" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono tracking-wider font-black mb-1" style={{ color: '#718096' }}>ENTRY FEE</div>
                                <div className="text-lg font-bold font-mono" style={{ color: '#cbd5e0' }}>
                                    {race.entryFee ? formatUnits(BigInt(race.entryFee), 18) : '0'}
                                </div>
                                <div className="text-xs font-mono" style={{ color: '#a0aec0' }}>{tokenSymbol || 'TOKENS'}</div>
                            </div>
                            <div className="bg-black/50 border-2 p-4 transition-all duration-300 hover:border-[#718096]" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono tracking-wider font-black mb-1" style={{ color: '#718096' }}>PRIZE POOL</div>
                                <div className="text-lg font-bold font-mono" style={{ color: '#cbd5e0' }}>
                                    {race.prizePool ? formatUnits(BigInt(race.prizePool), 18) : '0'}
                                </div>
                                <div className="text-xs font-mono" style={{ color: '#a0aec0' }}>{tokenSymbol || 'TOKENS'}</div>
                            </div>
                            <div className="bg-black/50 border-2 p-4 transition-all duration-300 hover:border-[#718096]" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono tracking-wider font-black mb-1" style={{ color: '#718096' }}>RACERS</div>
                                <div className="text-lg font-bold font-mono" style={{ color: '#e2e8f0' }}>
                                    {race.participants.length}/{race.maxParticipants}
                                </div>
                            </div>
                            <div className="bg-black/50 border-2 p-4 transition-all duration-300 hover:border-[#718096]" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono tracking-wider font-black mb-1" style={{ color: '#718096' }}>TRACK</div>
                                <div className="text-lg font-bold font-mono" style={{ color: '#a0aec0' }}>
                                    #{race.trackId || 1}
                                </div>
                            </div>
                        </div>

                        {/* Hover Details */}
                        {isHovered && race.participants.length > 0 && (
                            <div className="border-2 p-4 mb-3" style={{
                                background: 'linear-gradient(to right, #1a202c, #000000)',
                                borderColor: '#4a5568'
                            }}>
                                <div className="text-xs font-mono mb-2 tracking-wider font-black" style={{ color: '#a0aec0' }}>[ ENTERED RATS ]</div>
                                <div className="space-y-2">
                                    {race.participants.slice(0, 3).map((p, i) => (
                                        <div key={i} className="text-xs font-mono flex justify-between items-center py-1 border-b" style={{
                                            color: '#a0aec0',
                                            borderColor: '#2d3748'
                                        }}>
                                            <span className="font-black">RAT #{p.ratTokenId}</span>
                                            <span style={{ color: '#718096' }}>{p.address?.slice(0, 6)}...{p.address?.slice(-4)}</span>
                                        </div>
                                    ))}
                                    {race.participants.length > 3 && (
                                        <div className="text-xs font-mono text-center pt-1" style={{ color: '#718096' }}>
                                            {'// '}+{race.participants.length - 3} MORE
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Winner Info */}
                        {race.status === 'completed' && race.winner && (
                            <div className="border-2 p-4 mb-3" style={{
                                background: 'linear-gradient(to right, rgba(45,55,72,0.3), #000000)',
                                borderColor: '#4a5568'
                            }}>
                                <div className="text-xs font-mono mb-2 tracking-wider font-black" style={{ color: '#a0aec0' }}>[ WINNER ]</div>
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#cbd5e0' }}>
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                    <span className="text-sm font-mono font-black" style={{ color: '#cbd5e0' }}>
                                        {race.winner.owner.slice(0, 8)}...{race.winner.owner.slice(-6)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Creator Info */}
                        {race.creator && (
                            <div className="text-xs font-mono tracking-wider border-t pt-3" style={{
                                color: '#4a5568',
                                borderColor: '#2d3748'
                            }}>
                                {'// CREATOR: '}{race.creator.slice(0, 6)}...{race.creator.slice(-4)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
