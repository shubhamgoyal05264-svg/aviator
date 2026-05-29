import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Table from '../components/Table';

const fmtDate = (ts: number) => new Date(ts).toLocaleString();
const crashColor = (cp: number) => cp >= 5 ? '#22c55e' : cp >= 2 ? '#f59e0b' : '#e51e25';

export default function Rounds() {
    const [data, setData] = useState<{ rounds: any[]; total: number }>({ rounds: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const limit = 30;

    const load = (p = page) => {
        setLoading(true);
        api.rounds({ limit: String(limit), offset: String(p * limit) }).then(setData).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [page]);

    const s: Record<string, React.CSSProperties> = {
        h1: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
        sub: { color: '#666', fontSize: 14, marginBottom: 24 },
        box: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' },
        pagRow: { display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px' },
        pgBtn: { background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 14px', color: '#ccc', fontSize: 13 },
    };

    const totalPages = Math.ceil((data.total || 0) / limit);

    return (
        <div>
            <h1 style={s.h1}>Round History</h1>
            <p style={s.sub}>All game rounds with crash points and bet statistics</p>
            <div style={s.box}>
                <Table
                    data={data.rounds}
                    columns={[
                        { key: 'id', label: 'Round ID', render: r => r.id.substring(0, 8) + '…' },
                        {
                            key: 'crash_point', label: 'Crash Point', align: 'right', render: r => (
                                <span style={{ fontWeight: 700, color: crashColor(r?.crash_point) }}>{r?.crash_point ? Number(r.crash_point).toFixed(2) : '-'}x</span>
                            )
                        },
                        { key: 'bet_count', label: 'Bets', align: 'right' },
                        { key: 'total_wagered', label: 'Wagered', align: 'right', render: r => `${Number(r.total_wagered || 0).toFixed(2)} pts` },
                        { key: 'total_paid_out', label: 'Paid Out', align: 'right', render: r => `${Number(r?.total_paid_out || 0).toFixed(2)} pts` },
                        {
                            key: 'house_win', label: 'House Win', align: 'right', render: r => {
                                const hw = Number(r.total_wagered || 0) - Number(r?.total_paid_out || 0);
                                return <span style={{ color: hw >= 0 ? '#22c55e' : '#e51e25' }}>{hw.toFixed(2)} pts</span>;
                            }
                        },
                        { key: 'started_at', label: 'Date', render: r => fmtDate(r.started_at) },
                        { key: 'server_seed_hash', label: 'Hash', render: r => r.server_seed_hash.substring(0, 12) + '…' },
                    ]}
                />
                <div style={s.pagRow}>
                    <span style={{ color: '#555', fontSize: 13, flex: 1 }}>
                        {loading ? 'Loading…' : `${data.total} rounds · page ${page + 1} of ${totalPages}`}
                    </span>
                    <button style={s.pgBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                    <button style={s.pgBtn} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next →</button>
                </div>
            </div>
        </div>
    );
}
