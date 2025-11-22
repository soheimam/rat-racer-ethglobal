/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import React, {  } from "react";
import Stylesheet from "@/app/api/Stylesheet";

import { useAccount } from "wagmi";

export default function Demo() {

  const { isConnected } = useAccount();


  return (
    <div>
         <Stylesheet /> 
      <h1>Demo</h1>
      <p>{isConnected ? "Connected" : "Not Connected"}</p>
      <Link href="/my-rats">
        <button>My Rats</button>
      </Link>
      <Link href="/shop">
        <button>Shop</button>
      </Link>
      <Link href="/races">
        <button>Races</button>
      </Link>
     
    </div>
  );
}