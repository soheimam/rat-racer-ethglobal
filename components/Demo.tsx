/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {  } from "react";

import { useAccount } from "wagmi";

export default function Demo() {

  const { isConnected } = useAccount();


  return (
    <div>
      <h1>Demo</h1>
      <p>{isConnected ? "Connected" : "Not Connected"}</p>
    </div>
  );
}