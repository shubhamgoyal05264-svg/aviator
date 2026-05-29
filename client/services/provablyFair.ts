
/**
 * Simple provably fair logic simulation for frontend demonstration.
 * In production, this runs server-side.
 */
export async function generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const combined = `${serverSeed}-${clientSeed}-${nonce}`;
  const msgUint8 = new TextEncoder().encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Use first 13 hex characters (52 bits) for calculation
  const hashInt = parseInt(hashHex.substring(0, 13), 16);
  const e = Math.pow(2, 52);
  
  // Aviator style formula: (100 * e - hash) / (e - hash) / 100
  // Result is distributed exponentially with a house edge
  const result = Math.floor((100 * e - hashInt) / (e - hashInt)) / 100;
  
  // Apply a 3% house edge: if hash is divisible by 33, crash at 1.00x
  if (hashInt % 33 === 0) return 1.00;
  
  return Math.max(1.00, result);
}

export function generateRandomSeed(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
