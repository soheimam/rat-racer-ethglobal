"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import dynamic from "next/dynamic";

import WagmiProvider from "@/components/providers/WagmiProvider";
import ErudaProvider from "@/components/providers/ErudaProvider";
import FrameProvider from "@/components/providers/FrameProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider>
      <FrameProvider>
        <ErudaProvider />
        {children}
      </FrameProvider>
    </WagmiProvider>
  );
}