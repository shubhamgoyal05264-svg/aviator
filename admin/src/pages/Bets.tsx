import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import Table from '../components/Table';

const fmtDate = (ts: number) => new Date(ts).toLocaleString();

export default function Bets() {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState<{ bets: any[]; total: number }>({ bets: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [searchUser, setSearchUser] = useState(searchParams.get('username') || '');
    const limit = 50;

    const load = (p = page, userFilter = searchUser) => {
        setLoading(true);
        const params: Record<string, string> = { limit: String(limit), offset: String(p * limit) };
        if (userFilter) params.username = userFilter;
        api.bets(params).then(setData).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, [page]);

    const s: Record<string, React.CSSProperties> = {
        h1: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
        sub: { color: '#666', fontSize: 14, marginBottom: 24 },
        box: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' },
        pagRow: { display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px' },
        pgBtn: { background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '6px 14px', color: '#ccc', fontSize: 13, cursor: 'pointer' },
    };

    const totalPages = Math.ceil((data.total || 0) / limit);

    return (
        <div>
            <h1 style={s.h1}>User Bets</h1>
            <p style={s.sub}>Review bets placed by specific users, including amounts, cashouts, and profit/loss.</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <input 
                    type="text" 
                    placeholder="Search by Username..." 
                    value={searchUser} 
                    onChange={e => setSearchUser(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && (setPage(0), load(0))}
                    style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 14px', color: '#e8e8e8', fontSize: 14, width: 250 }}
                />
                <button 
                    onClick={() => { setPage(0); load(0); }} 
                    style={{ background: '#e51e25', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    Filter
                </button>
            </div>
            <div style={s.box}>
                <Table
                    data={data.bets}
                    columns={[
                        { key: 'id', label: 'Bet ID', render: r => r.id.substring(0, 8) + '…' },
                        { key: 'username', label: 'User', render: r => <span style={{ fontWeight: 600 }}>{r.username || 'Unknown'}</span> },
                        { key: 'round_id', label: 'Round ID', render: r => r.round_id.substring(0, 8) + '…' },
                        { 
                            key: 'amount', 
                            label: 'Bet Amount', 
                            align: 'right', 
                            render: r => `${Number(r.amount || 0).toFixed(2)} pts` 
                        },
                        { 
                            key: 'multiplier', 
                            label: 'Cashout Point', 
                            align: 'right', 
                            render: r => r.multiplier ? `${Number(r.multiplier).toFixed(2)}x` : '-' 
                        },
                        { 
                            key: 'cashout_amount', 
                            label: 'Cashout', 
                            align: 'right', 
                            render: r => r.cashout_amount > 0 ? `${Number(r.cashout_amount).toFixed(2)} pts` : '-' 
                        },
                        { 
                            key: 'profit_loss', 
                            label: 'Profit / Loss', 
                            align: 'right', 
                            render: r => {
                                const isWin = r.profit_loss > 0;
                                return <span style={{ color: isWin ? '#22c55e' : '#e51e25', fontWeight: 600 }}>
                                    {isWin ? '+' : ''}{Number(r.profit_loss).toFixed(2)} pts
                                </span>;
                            }
                        },
                        { 
                            key: 'crash_point', 
                            label: 'Crash Point', 
                            align: 'right', 
                            render: r => r.crash_point ? `${Number(r.crash_point).toFixed(2)}x` : 'Running' 
                        },
                        { key: 'timestamp', label: 'Date', render: r => fmtDate(r.timestamp) },
                    ]}
                />
                <div style={s.pagRow}>
                    <span style={{ color: '#555', fontSize: 13, flex: 1 }}>
                        {loading ? 'Loading…' : `${data.total} bets · page ${page + 1} of ${totalPages || 1}`}
                    </span>
                    <button style={s.pgBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
                    <button style={s.pgBtn} onClick={() => setPage(p => Math.min(Math.max(0, totalPages - 1), p + 1))} disabled={page >= totalPages - 1}>Next →</button>
                </div>
            </div>
        </div>
    );
}
