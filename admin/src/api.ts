const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getToken() { return localStorage.getItem('admin_token'); }
export function setToken(t: string) { localStorage.setItem('admin_token', t); }
export function clearToken() { localStorage.removeItem('admin_token'); }
export function isLoggedIn() { return !!getToken(); }

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(opts.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) {
        if (res.status === 401) {
            clearToken();
            window.location.href = '/login';
        }
        throw new Error(data.error || 'Request failed');
    }
    return data as T;
}

export const api = {
    // Auth
    login: (email: string, password: string) =>
        req<{ token: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    // Admin
    stats: () => req<any>('/api/admin/stats'),
    users: (params?: Record<string, string>) => req<any>(`/api/admin/users?${new URLSearchParams(params)}`),
    user: (id: string) => req<any>(`/api/admin/users/${id}`),
    updateBalance: (id: string, body: any) => req<any>(`/api/admin/users/${id}/balance`, { method: 'PATCH', body: JSON.stringify(body) }),
    toggleBan: (id: string, banned: boolean) => req<any>(`/api/admin/users/${id}/ban`, { method: 'PATCH', body: JSON.stringify({ banned }) }),
    transactions: (params?: Record<string, string>) => req<any[]>(`/api/admin/transactions?${new URLSearchParams(params)}`),
    updateTxStatus: (id: string, status: string) => req<any>(`/api/admin/transactions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    bets: (params?: Record<string, string>) => req<any>(`/api/admin/bets?${new URLSearchParams(params)}`),
    rounds: (params?: Record<string, string>) => req<any>(`/api/admin/rounds?${new URLSearchParams(params)}`),
    getConfig: () => req<any>('/api/admin/config'),
    updateConfig: (body: any) => req<any>('/api/admin/config', { method: 'PATCH', body: JSON.stringify(body) }),
};
