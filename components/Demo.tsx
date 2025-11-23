"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Navigation from "./Navigation";
import Link from "next/link";

interface RatStats {
  speed: number;
  stamina: number;
  agility: number;
  luck: number;
}

interface Rat {
  tokenId: string;
  name: string;
  image: string;
  stats: RatStats;
}

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

const RAT_IMAGES = [
  '/images/white.png',
  '/images/brown.png',
  '/images/pink.png',
];

export default function Demo() {
  const { address, isConnected } = useAccount();
  const [rats, setRats] = useState<Rat[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingRaces, setUpcomingRaces] = useState<Race[]>([]);
  const [completedRaces, setCompletedRaces] = useState<Race[]>([]);
  const [racesLoading, setRacesLoading] = useState(true);

  const walletConnected = isConnected;
  const userAddress = address; // Cryptographically verified

  // Fetch user's rats
  useEffect(() => {
    const fetchRats = async () => {
      if (!walletConnected || !userAddress) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/rats?owner=${userAddress}`);
        if (response.ok) {
          const data = await response.json();
          setRats(data.rats || []);
        }
      } catch (error) {
        console.error('Failed to fetch rats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRats();
  }, [walletConnected, userAddress]);

  // Fetch races
  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const response = await fetch('/api/races');
        if (response.ok) {
          const data = await response.json();
          setUpcomingRaces(data.activeRaces || []);
          setCompletedRaces(data.completedRaces || []);
        }
      } catch (error) {
        console.error('Failed to fetch races:', error);
      } finally {
        setRacesLoading(false);
      }
    };

    fetchRaces();
    const interval = setInterval(fetchRaces, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-700 rounded-full filter blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-600 rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
      </div>

      {/* Scanlines Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
        }}
      ></div>

      {/* Navigation */}
      <Navigation />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-5xl md:text-6xl font-black tracking-tighter glitch mb-3"
            data-text="RAT RACE"
            style={{
              textShadow: '0 0 30px rgba(160,174,192,0.5)',
              fontFamily: 'monospace',
              color: '#cbd5e0',
              lineHeight: '1.2'
            }}
          >
            RAT RACE
          </h1>
          <p className="text-lg md:text-xl font-mono font-black tracking-wider" style={{ color: '#718096' }}>
            NEED FOR CHEESE
          </p>
        </div>

        {/* Three Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Panel - My Rats */}
          <div className="border-4" style={{
            borderColor: '#2d3748',
            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
          }}>
            <div className="border-b-4 p-4" style={{ borderColor: '#2d3748' }}>
              <h2 className="text-2xl font-black tracking-wider font-mono text-center" style={{ color: '#cbd5e0' }}>
                [ MY RATS ]
              </h2>
            </div>

            <div className="p-4 max-h-[800px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#718096', borderTopColor: 'transparent' }}></div>
                  </div>
                </div>
              ) : !walletConnected ? (
                <div className="text-center py-12">
                  <p className="font-mono text-sm mb-4 tracking-wider" style={{ color: '#718096' }}>
                    {'// WALLET NOT CONNECTED'}
                  </p>
                  <p className="font-mono text-xs" style={{ color: '#4a5568' }}>
                    Connect to view your rats
                  </p>
                </div>
              ) : rats.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-mono text-sm mb-6 tracking-wider" style={{ color: '#718096' }}>
                    {'// NO RATS FOUND'}
                  </p>
                  <Link href="/shop">
                    <button
                      className="relative px-8 py-3 font-mono font-black text-sm tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
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
                          padding: '1px',
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                          animation: 'gradient-shift 3s ease infinite'
                        }}
                      />
                      <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                        MINT A RAT
                      </span>
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {rats.map((rat) => (
                    <div
                      key={rat.tokenId}
                      className="border-2 overflow-hidden transition-all duration-300 hover:scale-[1.02] group"
                      style={{
                        borderColor: '#2d3748',
                        background: 'linear-gradient(to bottom right, rgba(26,32,44,0.3), #000000)'
                      }}
                    >
                      <div className="relative h-40 overflow-hidden border-b-2" style={{ borderColor: '#2d3748', backgroundColor: '#1a202c' }}>
                        <img
                          src={rat.image || RAT_IMAGES[parseInt(rat.tokenId) % 3]}
                          alt={rat.name}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                        />
                        <div className="absolute top-2 right-2 px-2 py-1 border font-mono text-xs font-black" style={{
                          backgroundColor: '#2d3748',
                          borderColor: '#4a5568',
                          color: '#e2e8f0'
                        }}>
                          #{rat.tokenId}
                        </div>
                      </div>

                      <div className="p-3">
                        <h3 className="text-lg font-black font-mono mb-2" style={{ color: '#cbd5e0' }}>
                          {rat.name || `RAT #${rat.tokenId}`}
                        </h3>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-mono font-black" style={{ color: '#718096' }}>SPEED</span>
                              <span className="font-mono font-black" style={{ color: '#cbd5e0' }}>{rat.stats.speed}</span>
                            </div>
                            <div className="w-full h-1 bg-black border" style={{ borderColor: '#2d3748' }}>
                              <div
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${rat.stats.speed}%`,
                                  background: 'linear-gradient(to right, #3b82f6, #60a5fa)'
                                }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="font-mono font-black" style={{ color: '#718096' }}>STAMINA</span>
                              <span className="font-mono font-black" style={{ color: '#cbd5e0' }}>{rat.stats.stamina}</span>
                            </div>
                            <div className="w-full h-1 bg-black border" style={{ borderColor: '#2d3748' }}>
                              <div
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${rat.stats.stamina}%`,
                                  background: 'linear-gradient(to right, #10b981, #34d399)'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle Panel - Upcoming Races */}
          <div className="border-4" style={{
            borderColor: '#2d3748',
            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
          }}>
            <div className="border-b-4 p-4" style={{ borderColor: '#2d3748' }}>
              <h2 className="text-2xl font-black tracking-wider font-mono text-center" style={{ color: '#cbd5e0' }}>
                [ UPCOMING RACES ]
              </h2>
            </div>

            <div className="p-4 max-h-[800px] overflow-y-auto custom-scrollbar">
              {racesLoading ? (
                <div className="flex justify-center py-16">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#718096', borderTopColor: 'transparent' }}></div>
                  </div>
                </div>
              ) : upcomingRaces.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-mono text-sm mb-4 tracking-wider" style={{ color: '#718096' }}>
                    {'// NO UPCOMING RACES'}
                  </p>
                  <Link href="/races">
                    <button
                      className="relative px-8 py-3 font-mono font-black text-sm tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
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
                          padding: '1px',
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                          animation: 'gradient-shift 3s ease infinite'
                        }}
                      />
                      <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                        CREATE RACE
                      </span>
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingRaces.map((race) => (
                    <Link key={race.id} href={`/race/${race.raceId || race.id}`}>
                      <div
                        className="border-2 p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                        style={{
                          borderColor: '#2d3748',
                          background: 'linear-gradient(to bottom right, rgba(26,32,44,0.3), #000000)'
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-black font-mono" style={{ color: '#cbd5e0' }}>
                            {race.title}
                          </h3>
                          <div className="px-2 py-1 border text-xs font-black font-mono" style={{
                            backgroundColor: '#2d3748',
                            borderColor: '#a0aec0',
                            color: '#e2e8f0'
                          }}>
                            {race.status.toUpperCase()}
                          </div>
                        </div>

                        <p className="text-xs font-mono mb-3" style={{ color: '#718096' }}>
                          {'// '}{race.description}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-black/50 border p-2" style={{ borderColor: '#4a5568' }}>
                            <div className="font-mono" style={{ color: '#718096' }}>RACERS</div>
                            <div className="font-black font-mono" style={{ color: '#cbd5e0' }}>
                              {race.participants.length}/{race.maxParticipants}
                            </div>
                          </div>
                          <div className="bg-black/50 border p-2" style={{ borderColor: '#4a5568' }}>
                            <div className="font-mono" style={{ color: '#718096' }}>PRIZE</div>
                            <div className="font-black font-mono" style={{ color: '#cbd5e0' }}>
                              {parseInt(race.prizePool) / 1e18}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Past Races */}
          <div className="border-4" style={{
            borderColor: '#2d3748',
            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
          }}>
            <div className="border-b-4 p-4" style={{ borderColor: '#2d3748' }}>
              <h2 className="text-2xl font-black tracking-wider font-mono text-center" style={{ color: '#cbd5e0' }}>
                [ PAST RACES ]
              </h2>
            </div>

            <div className="p-4 max-h-[800px] overflow-y-auto custom-scrollbar">
              {racesLoading ? (
                <div className="flex justify-center py-16">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#718096', borderTopColor: 'transparent' }}></div>
                  </div>
                </div>
              ) : completedRaces.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-mono text-sm tracking-wider" style={{ color: '#718096' }}>
                    {'// NO COMPLETED RACES'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedRaces.map((race) => (
                    <Link key={race.id} href={`/race/${race.raceId || race.id}`}>
                      <div
                        className="border-2 p-4 transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
                        style={{
                          borderColor: '#2d3748',
                          background: 'linear-gradient(to bottom right, rgba(26,32,44,0.3), #000000)'
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-black font-mono" style={{ color: '#cbd5e0' }}>
                            {race.title}
                          </h3>
                          <div className="px-2 py-1 border text-xs font-black font-mono" style={{
                            backgroundColor: '#2d3748',
                            borderColor: '#4a5568',
                            color: '#e2e8f0'
                          }}>
                            FINISHED
                          </div>
                        </div>

                        {race.winner && (
                          <div className="mb-3 p-2 border" style={{
                            background: 'linear-gradient(to right, rgba(45,55,72,0.3), #000000)',
                            borderColor: '#4a5568'
                          }}>
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#cbd5e0' }}>
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                              </svg>
                              <span className="text-xs font-mono font-black" style={{ color: '#a0aec0' }}>
                                WINNER
                              </span>
                            </div>
                            <div className="text-xs font-mono mt-1" style={{ color: '#cbd5e0' }}>
                              {race.winner.owner.slice(0, 8)}...{race.winner.owner.slice(-6)}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-black/50 border p-2" style={{ borderColor: '#4a5568' }}>
                            <div className="font-mono" style={{ color: '#718096' }}>RACERS</div>
                            <div className="font-black font-mono" style={{ color: '#cbd5e0' }}>
                              {race.participants.length}
                            </div>
                          </div>
                          <div className="bg-black/50 border p-2" style={{ borderColor: '#4a5568' }}>
                            <div className="font-mono" style={{ color: '#718096' }}>PRIZE</div>
                            <div className="font-black font-mono" style={{ color: '#cbd5e0' }}>
                              {parseInt(race.prizePool) / 1e18}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a202c;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5568;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #718096;
        }
      `}</style>
    </div>
  );
}
