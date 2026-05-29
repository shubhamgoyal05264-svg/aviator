import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Table from '../components/Table';

export default function Users() {
    const navigate = useNavigate();
    const [data, setData] = useState<{ users: any[]; total: number }>({ users: [], total: 0 });
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editBal, setEditBal] = useState({ real: '', demo: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const load = (q = search) => {
        setLoading(true);
        api.users(q ? { search: q } : {}).then(setData).catch(console.error).finally(() => setLoading(false));
    };

    const loadUser = (id: string) => {
        api.user(id).then(d => { setSelected(d); setEditBal({ real: String(d.user.real_balance), demo: String(d.user.demo_balance) }); });
    };

    useEffect(() => { load(); }, []);

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

    const toggleBan = async (id: string, banned: boolean) => {
        await api.toggleBan(id, !banned);
        setMsg(!banned ? 'User banned.' : 'User unbanned.');
        load();
        if (selected?.user?.id === id) loadUser(id);
    };

    const saveBalance = async () => {
        if (!selected) return;
        setSaving(true);
        await api.updateBalance(selected.user.id, { realBalance: parseFloat(editBal.real), demoBalance: parseFloat(editBal.demo) });
        setMsg('Balance updated!');
        setSaving(false);
        load();
        loadUser(selected.user.id);
    };

    const s: Record<string, React.CSSProperties> = {
        h1: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
        sub: { color: '#666', fontSize: 14, marginBottom: 24 },
        row: { display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' },
        input: { flex: 1, background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 14px', color: '#e8e8e8', fontSize: 14, outline: 'none' },
        btn: { background: '#e51e25', border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: 14 },
        panel: { display: 'flex', gap: 24, marginTop: 24 },
        table: { flex: 1, background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' },
        detail: { width: 340, background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 20, flexShrink: 0 },
        fieldRow: { display: 'flex', gap: 8, marginBottom: 12 },
        balInput: { flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 14 },
        msg: { color: '#22c55e', fontSize: 13, marginBottom: 12 },
    };

    const banColor = (banned: boolean) => banned ? '#e51e25' : '#22c55e';
    const fmtDate = (ts: number) => new Date(ts).toLocaleDateString();

    return (
        <div>
            <h1 style={s.h1}>Users</h1>
            <p style={s.sub}>Manage player accounts, balances, and bans</p>
            <form onSubmit={handleSearch} style={s.row}>
                <input style={s.input} placeholder="Search by username or email…" value={search} onChange={e => setSearch(e.target.value)} />
                <button style={s.btn} type="submit">Search</button>
            </form>
            <div style={s.panel}>
                <div style={s.table}>
                    <Table
                        data={data.users}
                        columns={[
                            { key: 'username', label: 'Username' },
                            { key: 'email', label: 'Email' },
                            { key: 'real_balance', label: 'Real Points', align: 'right', render: r => `${Number(r.real_balance).toFixed(2)} pts` },
                            { key: 'rounds_played', label: 'Rounds', align: 'right' },
                            { key: 'banned', label: 'Status', render: r => <span style={{ color: banColor(r.banned) }}>{r.banned ? '🔴 Banned' : '🟢 Active'}</span> },
                            { key: 'created_at', label: 'Joined', render: r => fmtDate(r.created_at) },
                            {
                                key: 'actions', label: '', render: r => (
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <button onClick={() => loadUser(r.id)} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', color: '#aaa', fontSize: 12, cursor: 'pointer' }}>
                                            View
                                        </button>
                                        <button onClick={() => navigate(`/bets?username=${encodeURIComponent(r.username)}`)} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', color: '#e51e25', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                                            Show All Bets
                                        </button>
                                    </div>
                                )
                            },
                        ]}
                    />
                    <div style={{ padding: '10px 14px', color: '#555', fontSize: 13 }}>
                        {loading ? 'Loading…' : `${data.total} users total`}
                    </div>
                </div>

                {selected && (
                    <div style={s.detail}>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selected.user.username}</div>
                        <div style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>{selected.user.email}</div>
                        {msg && <div style={s.msg}>{msg}</div>}

                        <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>EDIT BALANCE</div>
                        <div style={s.fieldRow}>
                            <input style={s.balInput} type="number" placeholder="Real Points" value={editBal.real} onChange={e => setEditBal(p => ({ ...p, real: e.target.value }))} />
                            <input style={s.balInput} type="number" placeholder="Demo Points" value={editBal.demo} onChange={e => setEditBal(p => ({ ...p, demo: e.target.value }))} />
                        </div>
                        <button onClick={saveBalance} disabled={saving} style={{ ...s.btn, width: '100%', marginBottom: 12 }}>
                            {saving ? 'Saving…' : 'Update Balance'}
                        </button>

                        <button onClick={() => toggleBan(selected.user.id, selected.user.banned)} style={{
                            width: '100%', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 700, fontSize: 14,
                            background: selected.user.banned ? '#1a3a1a' : '#3a1a1a', color: selected.user.banned ? '#22c55e' : '#e51e25'
                        }}>
                            {selected.user.banned ? '✅ Unban User' : '🚫 Ban User'}
                        </button>

                        <div style={{ marginTop: 20, fontSize: 12, color: '#666', fontWeight: 600 }}>RECENT BETS</div>
                        {selected.recentBets.slice(0, 5).map((b: any) => (
                            <div key={b.id} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13 }}>
                                {b.amount} pts — {b.multiplier ? `${b.multiplier}x ✅` : '❌ crashed'} — crash @ {Number(b.crash_point || 0).toFixed(2)}x
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
