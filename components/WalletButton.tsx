"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const walletConnected = isConnected;
  const userAddress = address; // Cryptographically verified

  if (walletConnected && userAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs font-mono mb-1 tracking-wider" style={{ color: '#718096' }}>
            CONNECTED
          </div>
          <div className="text-sm font-mono font-black tracking-wider" style={{ color: '#cbd5e0' }}>
            {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </div>
        </div>
        <button
          onClick={() => disconnect()}
          className="relative px-6 py-3 font-mono font-black text-sm tracking-wider transition-all duration-300 overflow-hidden group hover:scale-[1.02]"
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
            DISCONNECT
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        const connector = connectors[0];
        if (connector) {
          connect({ connector });
        }
      }}
      disabled={isPending || !connectors.length}
      className="relative px-8 py-4 font-mono font-black tracking-wider transition-all duration-300 overflow-hidden group bg-black hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ 
        color: '#a0aec0'
      }}
    >
      <div
        className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to right, #cbd5e0, #4a5568)',
          padding: '1px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <span className="relative z-10 group-hover:text-white transition-colors duration-300">
        {isPending ? 'CONNECTING...' : 'CONNECT WALLET'}
      </span>
    </button>
  );
}

