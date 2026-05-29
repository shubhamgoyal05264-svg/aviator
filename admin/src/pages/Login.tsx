import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            const { token } = await api.login(email, password);
            setToken(token);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally { setLoading(false); }
    }

    const styles: Record<string, React.CSSProperties> = {
        page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' },
        card: { background: '#141414', border: '1px solid #222', borderRadius: 16, padding: 40, width: 380 },
        logo: { fontSize: 22, fontWeight: 800, color: '#e51e25', marginBottom: 8 },
        sub: { color: '#555', fontSize: 14, marginBottom: 32 },
        label: { display: 'block', fontSize: 13, color: '#888', marginBottom: 6, fontWeight: 500 },
        input: {
            width: '100%', background: '#1e1e1e', border: '1px solid #2a2a2a',
            borderRadius: 8, padding: '10px 14px', color: '#e8e8e8', fontSize: 14,
            outline: 'none', marginBottom: 18,
        },
        btn: {
            width: '100%', background: '#e51e25', border: 'none', borderRadius: 8,
            padding: '12px', color: '#fff', fontWeight: 700, fontSize: 15,
        },
        error: { color: '#e51e25', fontSize: 13, marginBottom: 16, background: 'rgba(229,30,37,0.08)', padding: '8px 12px', borderRadius: 6 },
    };

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <div style={styles.logo}>✈ SkyHigh Admin</div>
                <div style={styles.sub}>Sign in with your admin account</div>
                {error && <div style={styles.error}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <label style={styles.label}>Email</label>
                    <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required />
                    <label style={styles.label}>Password</label>
                    <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                    <button style={styles.btn} type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
