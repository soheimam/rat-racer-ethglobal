/**
 * Standard Webhook Payload Structure
 * 
 * This is the format sent by the webhook service for all contract events
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

