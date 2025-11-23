'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useConnect, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

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

const TOKEN_ABI = [
    {
        inputs: [],
        name: 'symbol',
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function'
    }
] as const;

export default function RacesPage() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
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
    const [createdRaceId, setCreatedRaceId] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);

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
        setMounted(true);
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
    }, [raceCreated]);

    const pollForCreatedRace = async (maxAttempts = 20) => {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch('/api/races');
                if (response.ok) {
                    const data = await response.json();
                    // Check if we have a new race that matches our transaction
                    const newRace = data.activeRaces.find((r: any) =>
                        r.txHash === createRaceHash ||
                        (r.creator === address && new Date(r.createdAt).getTime() > Date.now() - 30000)
                    );

                    if (newRace) {
                        setCreatedRaceId(newRace.raceId);
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
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter mb-2 glitch"
                            data-text="RAT RACES"
                            style={{
                                textShadow: '0 0 20px rgba(160,174,192,0.3), 0 0 40px rgba(203,213,224,0.2)',
                                fontFamily: 'monospace',
                                color: '#cbd5e0'
                            }}>
                            RAT RACES
                        </h1>
                        <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>[ UNDERGROUND CIRCUIT // RACE ENTRY ]</p>
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
                                className="glass-button font-mono font-black px-6 py-3 text-lg border-2 disabled:opacity-50 transition-all duration-300"
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
                        <Link href="/shop">
                            <Button variant="outline" className="glass-button border-gray-600 font-mono transition-all duration-300" style={{
                                color: '#a0aec0',
                                borderColor: '#4a5568'
                            }}>
                                MINT RAT
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="outline" className="glass-button border-gray-600 font-mono transition-all duration-300" style={{
                                color: '#a0aec0',
                                borderColor: '#4a5568'
                            }}>
                                &lt; EXIT
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Active Races Section */}
                <div className="mb-16">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-black tracking-wider" style={{ fontFamily: 'monospace' }}>
                            [ ACTIVE RACES ]
                        </h2>
                        {isConnected && (
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="glass-button font-black border-2 transition-all duration-300"
                                style={{
                                    backgroundColor: '#2d3748',
                                    borderColor: '#4a5568',
                                    color: '#e2e8f0',
                                    boxShadow: '0 0 20px rgba(74,85,104,0.4)'
                                }}
                            >
                                + CREATE RACE
                            </Button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4a5568' }}></div>
                            </div>
                        </div>
                    ) : activeRaces.length === 0 ? (
                        <div className="text-center py-16 border-2" style={{
                            borderColor: '#4a5568',
                            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)'
                        }}>
                            <p className="font-mono text-lg mb-6" style={{ color: '#718096' }}>
                                // NO ACTIVE RACES
                            </p>
                            {isConnected && (
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    className="glass-button font-black px-8 py-4 text-xl border-2 transition-all duration-500"
                                    style={{
                                        backgroundColor: '#2d3748',
                                        borderColor: '#4a5568',
                                        color: '#e2e8f0',
                                        boxShadow: '0 0 30px rgba(74,85,104,0.5)'
                                    }}
                                >
                                    START A RACE
                                </Button>
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
                        <h2 className="text-3xl font-black mb-6 tracking-wider" style={{ fontFamily: 'monospace' }}>
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
            </div>

            {/* Create Race Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="bg-black border-4 text-white max-w-2xl"
                    style={{ borderColor: '#4a5568', boxShadow: '0 0 40px rgba(74,85,104,0.3)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-4xl font-black text-center mb-4 glitch" data-text="[ CREATE RACE ]" style={{ fontFamily: 'monospace', color: '#cbd5e0' }}>
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
                                className="w-full bg-black border-2 px-4 py-3 text-2xl font-black focus:outline-none transition-all duration-300"
                                style={{
                                    borderColor: '#4a5568',
                                    color: '#cbd5e0'
                                }}
                                placeholder="100"
                            />
                            <p className="text-xs font-mono mt-2" style={{ color: '#718096' }}>// TRACK 1 // MAX 6 RACERS</p>
                        </div>

                        <div className="border-2 p-4" style={{
                            background: 'linear-gradient(to right, #1a202c, #000000)',
                            borderColor: '#4a5568'
                        }}>
                            <div className="text-xs font-mono mb-2" style={{ color: '#a0aec0' }}>[ RACE DETAILS ]</div>
                            <div className="space-y-2 text-sm font-mono">
                                <div className="flex justify-between">
                                    <span style={{ color: '#718096' }}>Creator Fee:</span>
                                    <span style={{ color: '#e2e8f0' }}>10%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: '#718096' }}>Winner Pool:</span>
                                    <span style={{ color: '#e2e8f0' }}>90%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: '#718096' }}>Max Racers:</span>
                                    <span style={{ color: '#e2e8f0' }}>6</span>
                                </div>
                            </div>
                        </div>

                        <Button
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
                                'CREATE RACE'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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
                        borderColor: isHovered ? '#cbd5e0' : '#2d3748',
                        boxShadow: isHovered ? '0 0 25px rgba(160,174,192,0.3)' : 'none'
                    }}
                >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 z-10">
                        <div
                            className="px-3 py-1 text-xs font-black border-2"
                            style={{
                                backgroundColor: '#2d3748',
                                borderColor: statusColor,
                                color: '#e2e8f0',
                                boxShadow: `0 0 15px rgba(74,85,104,0.3)`
                            }}
                        >
                            {statusText}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <div className="text-2xl font-black mb-2" style={{ color: '#cbd5e0' }}>
                            {race.title}
                        </div>
                        <div className="text-sm font-mono mb-4" style={{ color: '#718096' }}>
                            // {race.description}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono" style={{ color: '#718096' }}>ENTRY FEE</div>
                                <div className="text-lg font-bold" style={{ color: '#cbd5e0' }}>
                                    {race.entryFee ? formatUnits(BigInt(race.entryFee), 18) : '0'} {tokenSymbol || 'TOKENS'}
                                </div>
                            </div>
                            <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono" style={{ color: '#718096' }}>PRIZE POOL</div>
                                <div className="text-lg font-bold" style={{ color: '#cbd5e0' }}>
                                    {race.prizePool ? formatUnits(BigInt(race.prizePool), 18) : '0'} {tokenSymbol || 'TOKENS'}
                                </div>
                            </div>
                            <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono" style={{ color: '#718096' }}>RACERS</div>
                                <div className="text-lg font-bold" style={{ color: '#e2e8f0' }}>
                                    {race.participants.length}/{race.maxParticipants}
                                </div>
                            </div>
                            <div className="bg-black/50 border p-3" style={{ borderColor: '#4a5568' }}>
                                <div className="text-xs font-mono" style={{ color: '#718096' }}>TRACK</div>
                                <div className="text-lg font-bold" style={{ color: '#a0aec0' }}>
                                    #{race.trackId || 1}
                                </div>
                            </div>
                        </div>

                        {/* Hover Details */}
                        {isHovered && race.participants.length > 0 && (
                            <div className="border-2 p-3" style={{
                                background: 'linear-gradient(to right, #1a202c, #000000)',
                                borderColor: '#4a5568'
                            }}>
                                <div className="text-xs font-mono mb-2" style={{ color: '#718096' }}>ENTERED RATS:</div>
                                <div className="space-y-1">
                                    {race.participants.slice(0, 3).map((p, i) => (
                                        <div key={i} className="text-xs font-mono flex justify-between" style={{ color: '#a0aec0' }}>
                                            <span>RAT #{p.ratTokenId}</span>
                                            <span style={{ color: '#718096' }}>{p.address?.slice(0, 6)}...{p.address?.slice(-4)}</span>
                                        </div>
                                    ))}
                                    {race.participants.length > 3 && (
                                        <div className="text-xs font-mono" style={{ color: '#718096' }}>
                                            +{race.participants.length - 3} more...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Winner Info */}
                        {race.status === 'completed' && race.winner && (
                            <div className="border-2 p-3" style={{
                                background: 'linear-gradient(to right, rgba(45,55,72,0.2), #000000)',
                                borderColor: '#4a5568'
                            }}>
                                <div className="text-xs font-mono mb-1" style={{ color: '#a0aec0' }}>WINNER:</div>
                                <div className="text-sm font-mono" style={{ color: '#cbd5e0' }}>
                                    {race.winner.owner.slice(0, 8)}...{race.winner.owner.slice(-6)}
                                </div>
                            </div>
                        )}

                        {/* Creator Info */}
                        {race.creator && (
                            <div className="mt-3 text-xs font-mono" style={{ color: '#4a5568' }}>
                                Creator: {race.creator.slice(0, 6)}...{race.creator.slice(-4)}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
