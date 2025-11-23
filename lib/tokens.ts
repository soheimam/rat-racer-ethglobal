/**
 * Supported ERC20 tokens for race entry fees
 * Each token includes display information and contract address
 */

export interface Token {
    address: `0x${string}`;
    symbol: string;
    name: string;
    decimals: number;
    logo: string; // Path to logo image
    description?: string;
}

/**
 * Supported tokens for Base Mainnet
 * These tokens are pre-approved in the race contracts
 */
export const SUPPORTED_TOKENS: Token[] = [
    {
        address: (process.env.NEXT_PUBLIC_RACE_TOKEN_ADDRESS || '0xea4eaca6e4197ecd092ba77b5da768f19287e06f') as `0x${string}`,
        symbol: 'RACE',
        name: 'Race Token',
        decimals: 18,
        logo: '/race.png',
        description: 'Official racing token for rat races',
    },
    {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logo: '/usdc.jpg',
        description: 'Native USDC on Base',
    },
    {
        address: '0xc48823ec67720a04a9dfd8c7d109b2c3d6622094' as `0x${string}`,
        symbol: 'MCADE',
        name: 'Metacade',
        decimals: 18,
        logo: '/mcade.jpg',
        description: 'Metacade token',
    },
];

/**
 * Get all token addresses for contract deployment/configuration
 * Used to pre-approve tokens in contracts
 */
export function getAllTokenAddresses(): `0x${string}`[] {
    return SUPPORTED_TOKENS.map(token => token.address).filter(addr => addr !== '0x0');
}

/**
 * Check if a token is supported
 */
export function isTokenSupported(address: string): boolean {
    return SUPPORTED_TOKENS.some(
        token => token.address.toLowerCase() === address.toLowerCase() && token.address !== '0x0'
    );
}

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): Token | undefined {
    return SUPPORTED_TOKENS.find(
        (token) => token.address.toLowerCase() === address.toLowerCase()
    );
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): Token | undefined {
    return SUPPORTED_TOKENS.find(
        (token) => token.symbol.toUpperCase() === symbol.toUpperCase()
    );
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: string | bigint, decimals: number = 18): string {
    const value = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fraction = value % divisor;

    if (fraction === BigInt(0)) {
        return whole.toString();
    }

    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmed = fractionStr.replace(/0+$/, '');

    return `${whole}.${trimmed}`;
}

