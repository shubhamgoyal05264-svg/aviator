/**
 * Frontend API service — wraps fetch with base URL and JWT injection.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001');

function getToken(): string | null {
    return localStorage.getItem('skyhigh_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {})
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data as T;
}

export const api = {
    // Auth
    register: (username: string, email: string, password: string) =>
        request<{ token: string; user: any }>('/api/auth/register', {
            method: 'POST', body: JSON.stringify({ username, email, password })
        }),

    login: (email: string, password: string) =>
        request<{ token: string; user: any }>('/api/auth/login', {
            method: 'POST', body: JSON.stringify({ email, password })
        }),

    me: () => request<any>('/api/auth/me'),

    // Wallet
    getBalance: () => request<any>('/api/wallet/balance'),

    deposit: (amount: number, method: string) =>
        request<any>('/api/wallet/deposit', {
            method: 'POST', body: JSON.stringify({ amount, method })
        }),

    withdraw: (amount: number, method: string) =>
        request<any>('/api/wallet/withdraw', {
            method: 'POST', body: JSON.stringify({ amount, method })
        }),

    getTransactions: () => request<any[]>('/api/wallet/transactions'),
};
