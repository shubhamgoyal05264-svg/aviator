import { signPayload } from './signature';

export const GAME_ID = 'aviator';

interface Operator {
    id: string;
    secret_key: string;
    callback_url: string;
}

export interface AuthenticateResult {
    playerId: string;
    currency: string;
    balance: number;
    nickname?: string;
}

export interface WalletResult {
    balance: number;
    txId?: string;
}

/**
 * Signed POST to one of the operator's seamless-wallet endpoints.
 * The operator must respond 200 with JSON; non-2xx is treated as a wallet error.
 */
async function call<T>(operator: Operator, path: string, payload: Record<string, unknown>): Promise<T> {
    const body = JSON.stringify({ ...payload, gameId: GAME_ID });
    const timestamp = Date.now();
    const signature = signPayload(operator.secret_key, body, timestamp);

    const base = operator.callback_url.replace(/\/+$/, '');
    let res: Response;
    try {
        res = await fetch(`${base}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Operator-Id': operator.id,
                'X-Timestamp': String(timestamp),
                'X-Signature': signature,
            },
            body,
        });
    } catch (e: any) {
        throw new Error(`Wallet provider unreachable: ${e.message}`);
    }

    const text = await res.text();
    let data: any = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-json */ }

    if (!res.ok) {
        throw new Error(data?.error || data?.message || `Wallet error ${res.status}`);
    }
    return data as T;
}

export const walletClient = {
    /** Validate a launch token; returns the player identity + currency + balance. */
    authenticate: (operator: Operator, token: string) =>
        call<AuthenticateResult>(operator, '/authenticate', { token }),

    balance: (operator: Operator, playerId: string, currency: string) =>
        call<WalletResult>(operator, '/balance', { playerId, currency }),

    /** Debit a bet. `txId` is our idempotency key for this stake. */
    bet: (operator: Operator, args: { playerId: string; currency: string; amount: number; roundId: string; txId: string }) =>
        call<WalletResult>(operator, '/bet', args),

    /** Credit a win. `refTxId` ties the payout back to the original bet. */
    win: (operator: Operator, args: { playerId: string; currency: string; amount: number; roundId: string; txId: string; refTxId: string }) =>
        call<WalletResult>(operator, '/win', args),

    /** Refund a previously-accepted bet (e.g. round failure). */
    rollback: (operator: Operator, args: { playerId: string; currency: string; roundId: string; refTxId: string }) =>
        call<WalletResult>(operator, '/rollback', args),
};
