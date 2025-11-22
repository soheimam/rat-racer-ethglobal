import crypto from 'crypto';

/**
 * Verify Coinbase webhook signature
 * @param rawBody - Raw request body as string
 * @param signatureHeader - X-Hook0-Signature header value
 * @param secret - Webhook secret from WEBHOOK_SECRET env
 * @param headers - HTTP headers object (lowercase keys)
 * @param maxAgeMinutes - Max age for webhook (default: 5 minutes)
 * @returns true if webhook is authentic and within allowed time window
 */
export function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    secret: string,
    headers: Record<string, string | string[] | undefined>,
    maxAgeMinutes: number = 5
): boolean {
    try {
        // Parse signature header: t=timestamp,h=headers,v1=signature
        const elements = signatureHeader.split(',');
        const timestampElement = elements.find(e => e.startsWith('t='));
        const headerNamesElement = elements.find(e => e.startsWith('h='));
        const signatureElement = elements.find(e => e.startsWith('v1='));

        if (!timestampElement || !headerNamesElement || !signatureElement) {
            console.error('Invalid signature header format:', signatureHeader);
            return false;
        }

        const timestamp = timestampElement.split('=')[1];
        const headerNames = headerNamesElement.split('=')[1];
        const providedSignature = signatureElement.split('=')[1];

        // Build header values string
        const headerNameList = headerNames.split(' ');
        const headerValues = headerNameList.map(name => {
            const value = headers[name];
            if (Array.isArray(value)) return value[0] || '';
            return value || '';
        }).join('.');

        // Build signed payload: timestamp.headerNames.headerValues.rawBody
        const signedPayload = `${timestamp}.${headerNames}.${headerValues}.${rawBody}`;

        // Compute expected signature using HMAC-SHA256
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signedPayload, 'utf8')
            .digest('hex');

        // Compare signatures securely (timing-safe)
        const signaturesMatch = crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );

        if (!signaturesMatch) {
            console.error('Webhook signature mismatch');
            return false;
        }

        // Verify timestamp to prevent replay attacks
        const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const ageMinutes = (currentTime - webhookTime) / (1000 * 60);

        if (ageMinutes > maxAgeMinutes) {
            console.error(`Webhook timestamp exceeds maximum age: ${ageMinutes.toFixed(1)} minutes > ${maxAgeMinutes} minutes`);
            return false;
        }

        return signaturesMatch;

    } catch (error) {
        console.error('Webhook verification error:', error);
        return false;
    }
}

/**
 * Read raw body from Next.js request
 * @param req - Next.js NextRequest
 * @returns Raw body as string
 */
export async function getRawBody(req: Request): Promise<string> {
    const buffer = await req.arrayBuffer();
    return Buffer.from(buffer).toString('utf8');
}

