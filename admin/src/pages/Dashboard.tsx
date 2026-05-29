import React, { useEffect, useState } from 'react';
import { api } from '../api';
import StatCard from '../components/StatCard';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.stats().then(setStats).catch(console.error).finally(() => setLoading(false));
        const interval = setInterval(() => api.stats().then(setStats).catch(console.error), 10000);
        return () => clearInterval(interval);
    }, []);

    const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 };
    const h1: React.CSSProperties = { fontSize: 22, fontWeight: 800, marginBottom: 6 };
    const sub: React.CSSProperties = { color: '#666', fontSize: 14, marginBottom: 28 };
    const section: React.CSSProperties = { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 24px', marginTop: 24 };
    const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 };

    if (loading) return <div style={{ color: '#555', padding: 40 }}>Loading…</div>;

    return (
        <div>
            <h1 style={h1}>Dashboard</h1>
            <p style={sub}>Live overview — refreshes every 10 seconds</p>

            <div style={grid}>
                <StatCard label="Total Users" value={stats?.totalUsers ?? 0} sub="Registered players" color="#60a5fa" />
                <StatCard label="Total Deposits" value={`${Number(stats?.totalRevenue ?? 0).toFixed(2)} pts`} sub="All time" color="#22c55e" />
                <StatCard label="Pending Withdrawals" value={stats?.pendingWithdrawals ?? 0} sub="Need approval" color={stats?.pendingWithdrawals > 0 ? '#f59e0b' : '#888'} />
                <StatCard label="Rounds Today" value={stats?.roundsToday ?? 0} sub="Games played today" />
                <StatCard label="Bets Today" value={stats?.betsToday ?? 0} sub="Across all rounds today" color="#a78bfa" />
            </div>

            <div style={section}>
                <div style={sectionTitle}>Live Game Config</div>
                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#666' }}>House Edge Rate</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#e51e25', marginTop: 4 }}>
                            {((stats?.houseEdge ?? 0.065) * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 12, color: '#666' }}>Betting Window</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa', marginTop: 4 }}>
                            {(stats?.bettingDuration ?? 8000) / 1000}s
                        </div>
                    </div>
                </div>
                <p style={{ fontSize: 12, color: '#444', marginTop: 16 }}>
                    ⚙️ Go to <strong style={{ color: '#888' }}>Config</strong> to adjust live game settings.
                </p>
            </div>
        </div>
    );
}
