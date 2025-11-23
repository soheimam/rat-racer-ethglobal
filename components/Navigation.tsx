"use client";

import Link from "next/link";
import { useState } from "react";
import WalletButton from "./WalletButton";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "HOME" },
    { href: "/my-rats", label: "MY RATS" },
    { href: "/shop", label: "SHOP" },
    { href: "/races", label: "RACES" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Desktop & Tablet Navigation */}
      <nav className="relative z-50 border-b" style={{ borderColor: '#2d3748', backgroundColor: '#000000' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="text-2xl md:text-3xl font-black tracking-tighter glitch"
                  data-text="RAT RACE"
                  style={{
                    textShadow: '0 0 20px rgba(160,174,192,0.3)',
                    fontFamily: 'monospace',
                    color: '#cbd5e0'
                  }}
                >
                  RAT RACE
                </div>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <button
                    className={`relative px-6 py-3 font-mono font-black text-sm tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02] ${
                      isActive(link.href) ? 'scale-[1.02]' : ''
                    }`}
                    style={{
                      background: isActive(link.href) 
                        ? 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)'
                        : '#000000',
                      color: '#cbd5e0'
                    }}
                  >
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        isActive(link.href) ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                      }`}
                      style={{
                        background: 'linear-gradient(to bottom, #cbd5e0, #4a5568)',
                        padding: '1px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                      {link.label}
                    </span>
                  </button>
                </Link>
              ))}
              
              {/* Wallet Button */}
              <WalletButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative p-2 border transition-colors duration-300 hover:border-[#718096]"
              style={{
                borderColor: '#4a5568',
                color: '#cbd5e0'
              }}
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="absolute top-16 left-0 right-0 border-b"
            style={{ 
              borderColor: '#2d3748',
              background: 'linear-gradient(to bottom, #000000, #0a0a0a)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="container mx-auto px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <button
                    className={`w-full relative px-6 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02] ${
                      isActive(link.href) ? 'scale-[1.02]' : ''
                    }`}
                    style={{
                      background: isActive(link.href)
                        ? 'linear-gradient(to bottom right, rgba(26,32,44,0.8), #000000)'
                        : 'linear-gradient(to right, #1a202c, #000000)',
                      color: '#cbd5e0',
                      animation: isActive(link.href) ? 'subtle-glow 3s ease-in-out infinite' : 'none'
                    }}
                  >
                    <div
                      className={`absolute inset-0 transition-opacity duration-300 ${
                        isActive(link.href) ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                      }`}
                      style={{
                        background: 'linear-gradient(to bottom, #cbd5e0, #4a5568)',
                        padding: '1px',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                      {link.label}
                    </span>
                  </button>
                </Link>
              ))}
              
              {/* Wallet Button in Mobile */}
              <div className="pt-4 border-t" style={{ borderColor: '#2d3748' }}>
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

