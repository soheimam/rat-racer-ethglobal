/**
 * Webhook Payload Types
 * 
 * Based on ACTUAL webhook payload structure received from webhook service.
 * Uses snake_case to match the actual JSON format.
 * 
 * Example payload structure:
 * {
 *   "block_number": 38528761,
 *   "contract_address": "0x...",
 *   "event_name": "RatMinted",
 *   "event_signature": "RatMinted(address,uint256,uint8)",
 *   "log_index": 373,
 *   "network": "base-mainnet",
 *   "parameters": { ... },
 *   "timestamp": "2025-11-22T21:27:50Z",
 *   "transaction_from": "0x...",
 *   "transaction_hash": "0x...",
 *   "transaction_to": "0x..."
 * }
 */

export interface BaseWebhookPayload {
    block_number: number;
    contract_address: string;
    event_name: string;
    event_signature: string;
    log_index: number;
    network: string; // e.g. "base-mainnet"
    timestamp: string; // ISO 8601 format
    transaction_from: string;
    transaction_hash: string;
    transaction_to: string;
}

export interface RatMintedPayload extends BaseWebhookPayload {
    event_name: 'RatMinted';
    parameters: {
        to: string;
        tokenId: string;
        imageIndex: string;
    };
}

export interface RaceCreatedPayload extends BaseWebhookPayload {
    event_name: 'RaceCreated';
    parameters: {
        raceId: string;
        creator: string;
        trackId: string;
        entryToken: string;
        entryFee: string;
    };
}

export interface RacerEnteredPayload extends BaseWebhookPayload {
    event_name: 'RacerEntered';
    parameters: {
        raceId: string;
        racer: string;
        ratTokenId: string;
    };
}

export interface RaceStartedPayload extends BaseWebhookPayload {
    event_name: 'RaceStarted';
    parameters: {
        raceId: string;
        startedBy: string;
    };
}

export interface RaceFinishedPayload extends BaseWebhookPayload {
    event_name: 'RaceFinished';
    parameters: {
        raceId: string;
        winningRatTokenIds: string[];
        winners: string[];
        prizes: string[];
    };
}

export interface RaceCancelledPayload extends BaseWebhookPayload {
    event_name: 'RaceCancelled';
    parameters: {
        raceId: string;
        cancelledBy: string;
    };
}

export type WebhookPayload =
    | RatMintedPayload
    | RaceCreatedPayload
    | RacerEnteredPayload
    | RaceStartedPayload
    | RaceFinishedPayload
    | RaceCancelledPayload;
