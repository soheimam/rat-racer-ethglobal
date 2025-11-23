"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import WalletButton from "./WalletButton";

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

export default function Demo() {
  const { address, isConnected } = useAccount();
  const [timer, setTimer] = useState(0);
  const [rats, setRats] = useState<Rat[]>([]);
  const [loading, setLoading] = useState(true);
  const [rpm, setRpm] = useState(0);
  const [gear, setGear] = useState(4);

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

  // Simulate race data
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 0.087);
      setRpm(Math.floor(Math.random() * 2000) + 5500);
      setGear(Math.floor(Math.random() * 3) + 3); // Gears 3-5
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  };

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

      <div className="relative z-10 min-h-screen p-8">
        {/* Top Bar */}
        <div className="flex justify-between items-start mb-8">
          {/* Timer */}
          <div>
            <div className="text-6xl font-black font-mono tracking-tighter" style={{ color: '#cbd5e0' }}>
              {formatTime(timer)}
            </div>
            <div className="flex gap-4 mt-2 font-mono text-sm" style={{ color: '#718096' }}>
              <div>Best: <span style={{ color: '#a0aec0' }}>06:43.305</span></div>
              <div>Last: <span style={{ color: '#a0aec0' }}>06:44.453</span></div>
            </div>
          </div>

          {/* Center Logo */}
          <div className="text-center flex-1 mx-8">
            <h1
              className="text-5xl font-black tracking-tighter glitch mb-2"
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
            <p className="text-lg font-mono font-black tracking-wider" style={{ color: '#718096' }}>
              NEED FOR CHEESE
            </p>
          </div>

          {/* Weather/Status */}
          <div className="text-right">
            <div className="font-mono text-sm mb-2" style={{ color: '#718096' }}>
              System Status
            </div>
            <div className="text-2xl font-black" style={{ color: '#cbd5e0' }}>24°C</div>
            <div className="text-sm font-mono mt-1" style={{ color: '#a0aec0' }}>10-15 mph</div>
            <div
              className="inline-block px-3 py-1 border mt-2 text-xs font-black font-mono"
              style={{
                borderColor: walletConnected ? '#10b981' : '#4a5568',
                backgroundColor: walletConnected ? 'rgba(16,185,129,0.1)' : '#2d3748',
                color: walletConnected ? '#10b981' : '#718096',
                boxShadow: walletConnected ? '0 0 15px rgba(16,185,129,0.3)' : 'none'
              }}
            >
              {walletConnected ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto mt-12">
          {/* Navigation Buttons */}
          <div className="flex flex-wrap gap-4 justify-center mb-12 items-center">
            <Link href="/my-rats">
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)',
                  color: '#cbd5e0'
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
                  MY RATS
                </span>
              </button>
            </Link>

            <Link href="/shop">
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                style={{
                  background: '#000000',
                  color: '#cbd5e0'
                }}
              >
                <div
                  className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, #cbd5e0 0%, #718096 50%, #4a5568 100%)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  SHOP
                </span>
              </button>
            </Link>

            <Link href="/races">
              <button
                className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(to bottom, rgba(45,55,72,0.3), #000000)',
                  color: '#cbd5e0'
                }}
              >
                <div
                  className="absolute inset-0 group-hover:opacity-100 opacity-70 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(180deg, #e2e8f0 0%, #2d3748 100%)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                  }}
                />
                <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                  RACES
                </span>
              </button>
            </Link>

            {/* Wallet Button Component */}
            <WalletButton />
          </div>

          {/* RPM Gauge - Moved above My Rats */}
          <div className="flex justify-center mb-12">
            <div className="relative w-80 h-80">
              {/* Gauge Background */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                {/* Background Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="#2d3748"
                  strokeWidth="8"
                  strokeDasharray="534"
                />
                {/* Active Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="url(#gradient-rpm)"
                  strokeWidth="8"
                  strokeDasharray="534"
                  strokeDashoffset={534 - (rpm / 9000) * 534}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
                <defs>
                  <linearGradient id="gradient-rpm" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: '#60a5fa', stopOpacity: 1 }} />
                    <stop offset="80%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-7xl font-black font-mono" style={{ color: '#cbd5e0' }}>
                  {rpm.toLocaleString()}
                </div>
                <div className="text-xl font-mono tracking-wider" style={{ color: '#718096' }}>
                  rpm
                </div>
                <div className="mt-4 text-4xl font-black font-mono" style={{ color: '#a0aec0' }}>
                  GEAR {gear}
                </div>
              </div>
            </div>
          </div>

          {/* My Rats Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-wider font-mono mb-6 text-center" style={{ color: '#cbd5e0' }}>
              [ MY RATS ]
            </h2>

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
                <p className="font-mono text-lg mb-4 tracking-wider" style={{ color: '#718096' }}>
                  {'// WALLET NOT CONNECTED'}
                </p>
                <p className="font-mono text-sm" style={{ color: '#4a5568' }}>
                  Connect your wallet to view your rats
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
                    className="relative px-12 py-5 font-mono font-black text-xl tracking-wider transition-all duration-500 overflow-hidden group hover:scale-105"
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
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                      MINT A RAT
                    </span>
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rats.map((rat) => (
                  <div
                    key={rat.tokenId}
                    className="border-4 overflow-hidden transition-all duration-300 hover:scale-105 group"
                    style={{
                      borderColor: '#2d3748',
                      background: 'linear-gradient(to bottom right, rgba(26,32,44,0.5), #000000)',
                      boxShadow: '0 0 40px rgba(74,85,104,0.2)'
                    }}
                  >
                    {/* Rat Image */}
                    <div className="relative h-64 overflow-hidden border-b-4" style={{ borderColor: '#2d3748', backgroundColor: '#1a202c' }}>
                      {rat.image ? (
                        <img
                          src={rat.image}
                          alt={rat.name}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#4a5568' }}>
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 px-3 py-1 border-2 font-mono text-xs font-black tracking-wider" style={{
                        backgroundColor: '#2d3748',
                        borderColor: '#4a5568',
                        color: '#e2e8f0'
                      }}>
                        #{rat.tokenId}
                      </div>
                    </div>

                    {/* Rat Info */}
                    <div className="p-6">
                      <h3 className="text-2xl font-black font-mono mb-4 tracking-wider" style={{ color: '#cbd5e0' }}>
                        {rat.name || `RAT #${rat.tokenId}`}
                      </h3>

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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
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
