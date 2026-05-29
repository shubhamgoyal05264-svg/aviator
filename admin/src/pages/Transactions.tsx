import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Table from '../components/Table';

const STATUS_COLORS: Record<string, string> = { SUCCESS: '#22c55e', PENDING: '#f59e0b', REJECTED: '#e51e25' };
const fmtDate = (ts: number) => new Date(ts).toLocaleString();

export default function Transactions() {
    const [txs, setTxs] = useState<any[]>([]);
    const [filter, setFilter] = useState({ type: '', status: '' });
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    const load = (f = filter) => {
        setLoading(true);
        const params: Record<string, string> = {};
        if (f.type) params.type = f.type;
        if (f.status) params.status = f.status;
        api.transactions(params).then(setTxs).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const updateStatus = async (id: string, status: string) => {
        await api.updateTxStatus(id, status);
        setMsg(`Transaction ${status === 'SUCCESS' ? 'approved' : 'rejected'}.`);
        setTimeout(() => setMsg(''), 3000);
        load();
    };

    const s: Record<string, React.CSSProperties> = {
        h1: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
        sub: { color: '#666', fontSize: 14, marginBottom: 24 },
        row: { display: 'flex', gap: 10, marginBottom: 20 },
        select: { background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 14px', color: '#e8e8e8', fontSize: 14 },
        msg: { color: '#22c55e', fontSize: 13, marginBottom: 12 },
        box: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' },
    };

    return (
        <div>
            <h1 style={s.h1}>Transactions</h1>
            <p style={s.sub}>Review deposits, approve or reject pending withdrawals</p>
            {msg && <div style={s.msg}>✅ {msg}</div>}
            <div style={s.row}>
                <select style={s.select} value={filter.type} onChange={e => { const v = e.target.value; setFilter(p => { const n = { ...p, type: v }; load(n); return n; }); }}>
                    <option value="">All Types</option>
                    <option value="DEPOSIT">Deposits</option>
                    <option value="WITHDRAWAL">Withdrawals</option>
                </select>
                <select style={s.select} value={filter.status} onChange={e => { const v = e.target.value; setFilter(p => { const n = { ...p, status: v }; load(n); return n; }); }}>
                    <option value="">All Statuses</option>
                    <option value="SUCCESS">Success</option>
                    <option value="PENDING">Pending</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>
            <div style={s.box}>
                <Table
                    data={txs}
                    columns={[
                        { key: 'id', label: 'ID' },
                        { key: 'username', label: 'User' },
                        { key: 'type', label: 'Type', render: r => <span style={{ color: r.type === 'DEPOSIT' ? '#22c55e' : '#f59e0b' }}>{r.type}</span> },
                        { key: 'amount', label: 'Amount', align: 'right', render: r => `${Number(r.amount).toFixed(2)} pts` },
                        { key: 'method', label: 'Method' },
                        { key: 'status', label: 'Status', render: r => <span style={{ color: STATUS_COLORS[r.status] }}>{r.status}</span> },
                        { key: 'timestamp', label: 'Date', render: r => fmtDate(r.timestamp) },
                        {
                            key: 'actions', label: 'Actions', render: r => r.type === 'WITHDRAWAL' && r.status === 'PENDING' ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => updateStatus(r.id, 'SUCCESS')} style={{ background: '#1a3a1a', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#22c55e', fontSize: 12, fontWeight: 600 }}>Approve</button>
                                    <button onClick={() => updateStatus(r.id, 'REJECTED')} style={{ background: '#3a1a1a', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#e51e25', fontSize: 12, fontWeight: 600 }}>Reject</button>
                                </div>
                            ) : '—'
                        },
                    ]}
                />
                <div style={{ padding: '10px 14px', color: '#555', fontSize: 13 }}>
                    {loading ? 'Loading…' : `${txs.length} transactions`}
                </div>
            </div>
        </div>
    );
}
