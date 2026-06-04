import crypto from 'crypto';

/**
 * Seamless-wallet callbacks are signed so operators can verify the request really
 * came from this game server (and is fresh). The signature covers `${timestamp}.${body}`.
 *
 * Operator side verifies with the same shared secret:
 *   expected = HMAC_SHA256(secret, `${X-Timestamp}.${rawBody}`)
 *   reject if expected !== X-Signature  OR  |now - X-Timestamp| > tolerance
 */
export function signPayload(secret: string, body: string, timestamp: number): string {
    return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export function verifySignature(
    secret: string,
    body: string,
    timestamp: number,
    signature: string,
    toleranceMs = 60_000
): boolean {
    if (Math.abs(Date.now() - timestamp) > toleranceMs) return false;
    const expected = signPayload(secret, body, timestamp);
    const a = Buffer.from(expected);
    const b = Buffer.from(signature || '');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

export function newSecret(): string {
    return crypto.randomBytes(24).toString('hex');
}
