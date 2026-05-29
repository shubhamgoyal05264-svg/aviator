import crypto from 'crypto';

/**
 * Server-side provably fair crash point generation.
 * Uses Node's crypto module (NOT browser WebCrypto).
 * The serverSeed is kept secret until the round ends.
 */

export function generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number | string, maxMultiplier: number = 0): number {
    const combined = `${serverSeed}-${clientSeed}-${nonce}`;
    const hashHex = crypto.createHash('sha256').update(combined).digest('hex');

    // Use first 13 hex characters (52 bits)
    const hashInt = parseInt(hashHex.substring(0, 13), 16);
    const e = Math.pow(2, 52);

    // 3% house edge: if divisible by 33, instant crash
    if (hashInt % 33 === 0) return 1.00;

    // Aviator-style exponential distribution
    const result = Math.floor((100 * e - hashInt) / (e - hashInt)) / 100;
    let finalCrashPoint = Math.max(1.00, result);
    
    if (maxMultiplier > 1 && finalCrashPoint > maxMultiplier) {
        // Wrap around deterministically so we don't just have a spike exactly at maxMultiplier
        const range = Math.floor((maxMultiplier - 1) * 100);
        finalCrashPoint = 1.00 + (hashInt % range) / 100;
    }
    
    return finalCrashPoint;
}

export function generateRandomSeed(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function sha256(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Honeymoon bias for new users.
 * Rounds 1–3:  Guaranteed high crash (2.5x–7.0x)
 * Rounds 4–6:  50/50 biased (1.5x–4.0x) vs fair
 * Rounds 7+:   Full fair odds
 */
export function applyHoneymoonBias(fairCrashPoint: number, roundsPlayed: number): number {
    if (roundsPlayed < 3) {
        // Lucky phase — guaranteed win window
        return parseFloat((2.5 + Math.random() * 4.5).toFixed(2));
    }
    if (roundsPlayed < 6) {
        // Transition phase — 50/50
        const biased = parseFloat((1.5 + Math.random() * 2.5).toFixed(2));
        return Math.random() < 0.5 ? biased : fairCrashPoint;
    }
    return fairCrashPoint;
}
