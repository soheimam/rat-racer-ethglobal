'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';


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
  imageUrl: string;
  stats: RatStats;
  speeds?: number[];
  rarityScore?: number;
  bloodline?: string;
}

const RAT_IMAGES = [
  '/images/white.png',
  '/images/brown.png',
  '/images/pink.png',
];

export default function MyRatsPage() {
  const { address, isConnected } = useAccount();
  const [rats, setRats] = useState<Rat[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRat, setHoveredRat] = useState<string | null>(null);
  const [selectedRat, setSelectedRat] = useState<Rat | null>(null);

  const walletConnected = isConnected;
  const userAddress = address;

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

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-700 rounded-full filter blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gray-600 rounded-full filter blur-[128px] animate-pulse delay-1000"></div>
      </div>

      {/* Scanlines Effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
        }}
      ></div>


      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1
            className="text-6xl font-black tracking-tighter mb-2 glitch"
            data-text="[ MY RAT ROSTER ]"
            style={{
              textShadow: '0 0 20px rgba(160,174,192,0.3), 0 0 40px rgba(203,213,224,0.2)',
              fontFamily: 'monospace',
              color: '#cbd5e0'
            }}
          >
            [ MY RAT ROSTER ]
          </h1>
          <p className="text-sm font-mono tracking-widest" style={{ color: '#718096' }}>
            {'// YOUR RACERS // STATS DASHBOARD'}
          </p>
        </div>

        {/* Stats Summary */}
        {!loading && rats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="border-4 p-4" style={{
              borderColor: '#2d3748',
              background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
              boxShadow: '0 0 40px rgba(74,85,104,0.2)'
            }}>
              <div className="text-xs font-mono mb-1 tracking-wider" style={{ color: '#718096' }}>
                TOTAL RATS
              </div>
              <div className="text-4xl font-black font-mono" style={{ color: '#cbd5e0' }}>
                {rats.length}
              </div>
            </div>

            <div className="border-4 p-4" style={{
              borderColor: '#2d3748',
              background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
              boxShadow: '0 0 40px rgba(74,85,104,0.2)'
            }}>
              <div className="text-xs font-mono mb-1 tracking-wider" style={{ color: '#718096' }}>
                AVG SPEED
              </div>
              <div className="text-4xl font-black font-mono" style={{ color: '#cbd5e0' }}>
                {Math.round(rats.reduce((sum, rat) => sum + rat.stats.speed, 0) / rats.length)}
              </div>
            </div>

            <div className="border-4 p-4" style={{
              borderColor: '#2d3748',
              background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
              boxShadow: '0 0 40px rgba(74,85,104,0.2)'
            }}>
              <div className="text-xs font-mono mb-1 tracking-wider" style={{ color: '#718096' }}>
                AVG STAMINA
              </div>
              <div className="text-4xl font-black font-mono" style={{ color: '#cbd5e0' }}>
                {Math.round(rats.reduce((sum, rat) => sum + rat.stats.stamina, 0) / rats.length)}
              </div>
            </div>

            <div className="border-4 p-4" style={{
              borderColor: '#2d3748',
              background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
              boxShadow: '0 0 40px rgba(74,85,104,0.2)'
            }}>
              <div className="text-xs font-mono mb-1 tracking-wider" style={{ color: '#718096' }}>
                TOP RACER
              </div>
              <div className="text-2xl font-black font-mono truncate" style={{ color: '#cbd5e0' }}>
                #{rats[0]?.tokenId}
              </div>
            </div>
          </div>
        )}

        {/* Rats Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#718096', borderTopColor: 'transparent' }}></div>
            </div>
          </div>
        ) : !walletConnected ? (
          <div className="text-center py-16 border-4" style={{
            borderColor: '#2d3748',
            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
          }}>
            <p className="font-mono text-lg mb-8 tracking-wider" style={{ color: '#718096' }}>
              {'// WALLET NOT CONNECTED'}
            </p>
            <p className="font-mono text-sm mb-4" style={{ color: '#4a5568' }}>
              Connect your wallet to view your rat roster
            </p>
          </div>
        ) : rats.length === 0 ? (
          <div className="text-center py-16 border-4" style={{
            borderColor: '#2d3748',
            background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
            boxShadow: '0 0 40px rgba(74,85,104,0.2)'
          }}>
            <p className="font-mono text-lg mb-8 tracking-wider" style={{ color: '#718096' }}>
              {'// NO RATS FOUND'}
            </p>
            <Link href="/shop">
              <button
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
                  MINT YOUR FIRST RAT
                </span>
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rats.map((rat) => (
              <div
                key={rat.tokenId}
                className={`relative cursor-pointer transition-all duration-300 transform ${hoveredRat === rat.tokenId ? 'scale-105' : 'scale-100'
                  }`}
                onMouseEnter={() => setHoveredRat(rat.tokenId)}
                onMouseLeave={() => setHoveredRat(null)}
                onClick={() => setSelectedRat(rat)}
              >
                {/* Glow Effect */}
                {hoveredRat === rat.tokenId && (
                  <div
                    className="absolute inset-0 filter blur-xl transition-opacity duration-300"
                    style={{ backgroundColor: 'rgba(74,85,104,0.3)' }}
                  ></div>
                )}

                {/* Card */}
                <div
                  className="relative bg-black border-4 overflow-hidden transition-all duration-300"
                  style={{
                    borderColor: hoveredRat === rat.tokenId ? '#718096' : '#2d3748',
                    boxShadow: hoveredRat === rat.tokenId ? '0 0 25px rgba(74,85,104,0.3)' : 'none',
                    background: hoveredRat === rat.tokenId ? 'linear-gradient(to right, #1a202c, #000000)' : 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)'
                  }}
                >
                  {/* Token ID Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    <div
                      className="px-3 py-1 text-xs font-black border font-mono tracking-wider"
                      style={{
                        backgroundColor: '#2d3748',
                        borderColor: '#4a5568',
                        color: '#e2e8f0',
                        boxShadow: '0 0 10px rgba(74,85,104,0.3)'
                      }}
                    >
                      #{rat.tokenId}
                    </div>
                  </div>

                  {/* Rat Image */}
                  <div className="relative h-64 overflow-hidden border-b-4" style={{ borderColor: '#2d3748', backgroundColor: '#1a202c' }}>
                    <img
                      src={rat.imageUrl || rat.image || RAT_IMAGES[parseInt(rat.tokenId) % 3]}
                      alt={rat.name}
                      className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="text-2xl font-black mb-2 font-mono tracking-wider" style={{ color: '#cbd5e0' }}>
                      {rat.name || `RAT #${rat.tokenId}`}
                    </div>

                    {/* Stats */}
                    <div className="space-y-3">
                      {/* Speed */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-mono font-black tracking-wider" style={{ color: '#718096' }}>SPEED</span>
                          <span className="text-xs font-mono font-black" style={{ color: '#cbd5e0' }}>{rat.stats.speed}</span>
                        </div>
                        <div className="w-full h-2 bg-black border" style={{ borderColor: '#2d3748' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${rat.stats.speed}%`,
                              background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                              boxShadow: '0 0 10px rgba(59,130,246,0.5)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Stamina */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-mono font-black tracking-wider" style={{ color: '#718096' }}>STAMINA</span>
                          <span className="text-xs font-mono font-black" style={{ color: '#cbd5e0' }}>{rat.stats.stamina}</span>
                        </div>
                        <div className="w-full h-2 bg-black border" style={{ borderColor: '#2d3748' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${rat.stats.stamina}%`,
                              background: 'linear-gradient(to right, #10b981, #34d399)',
                              boxShadow: '0 0 10px rgba(16,185,129,0.5)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Agility */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-mono font-black tracking-wider" style={{ color: '#718096' }}>AGILITY</span>
                          <span className="text-xs font-mono font-black" style={{ color: '#cbd5e0' }}>{rat.stats.agility}</span>
                        </div>
                        <div className="w-full h-2 bg-black border" style={{ borderColor: '#2d3748' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${rat.stats.agility}%`,
                              background: 'linear-gradient(to right, #f59e0b, #fbbf24)',
                              boxShadow: '0 0 10px rgba(245,158,11,0.5)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Luck */}
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-mono font-black tracking-wider" style={{ color: '#718096' }}>LUCK</span>
                          <span className="text-xs font-mono font-black" style={{ color: '#cbd5e0' }}>{rat.stats.luck}</span>
                        </div>
                        <div className="w-full h-2 bg-black border" style={{ borderColor: '#2d3748' }}>
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${rat.stats.luck}%`,
                              background: 'linear-gradient(to right, #a78bfa, #c4b5fd)',
                              boxShadow: '0 0 10px rgba(167,139,250,0.5)'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Stats */}
                    {(rat.rarityScore || rat.bloodline) && (
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {rat.bloodline && (
                          <div className="bg-black/50 border p-2" style={{ borderColor: '#4a5568' }}>
                            <div className="text-xs font-mono" style={{ color: '#718096' }}>BLOODLINE</div>
                            <div className="text-sm font-bold font-mono" style={{ color: '#a0aec0' }}>{rat.bloodline}</div>
                          </div>
                        )}
                        {rat.rarityScore && (
                          <div className="bg-black/50 border p-2" style={{ borderColor: '#4a5568' }}>
                            <div className="text-xs font-mono" style={{ color: '#718096' }}>RARITY</div>
                            <div className="text-sm font-bold font-mono" style={{ color: '#a0aec0' }}>{rat.rarityScore.toFixed(1)}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Stats */}
        {!loading && rats.length > 0 && (
          <div className="mt-12 flex justify-between items-center font-mono text-xs" style={{ color: '#718096' }}>
            <span>{'// '}{rats.length} RACERS IN ROSTER</span>
            <span>{'// SYSTEM STATUS: OPERATIONAL'}</span>
          </div>
        )}
      </div>

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
