import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getMockRace } from "./mock-data";
import { Race } from "./schema";

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Debug camera mode (set to true to enable camera debugging)
export const DEBUG_CAMERA = false;

// Validate image source URL
export function validateImageSrc(src: string | undefined): string {
    if (!src) return '/images/white.png'; // default fallback

    // If it's already a valid URL, return it
    if (src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }

    // If it's a relative path, return as is
    if (src.startsWith('/')) {
        return src;
    }

    // Otherwise, prepend a slash
    return `/${src}`;
}

// Mock function to get race data (replaces the API call)
export async function getRace(id: string): Promise<Race> {
    // Simulate a small delay to mimic API behavior
    await new Promise(resolve => setTimeout(resolve, 100));

    return getMockRace(id);
}

// Helper to format large numbers
export function formatNumber(num: number): string {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
}

// Helper to calculate win rate
export function calculateWinRate(wins: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
}
