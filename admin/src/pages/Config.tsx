import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Config() {
    const [config, setConfig] = useState<any>(null);
    const [form, setForm] = useState({ houseEdgeRate: '', bettingDuration: '', maxMultiplier: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        api.getConfig().then(c => {
            setConfig(c);
            setForm({ houseEdgeRate: String(c.houseEdgeRate), bettingDuration: String(c.bettingDuration), maxMultiplier: String(c.maxMultiplier || 0) });
        });
    }, []);

    const save = async () => {
        setSaving(true); setMsg('');
        await api.updateConfig({
            houseEdgeRate: parseFloat(form.houseEdgeRate),
            bettingDuration: parseInt(form.bettingDuration),
            maxMultiplier: parseFloat(form.maxMultiplier),
        });
        const updated = await api.getConfig();
        setConfig(updated);
        setMsg('✅ Config updated live! Changes take effect on the next round.');
        setSaving(false);
        setTimeout(() => setMsg(''), 5000);
    };

    const s: Record<string, React.CSSProperties> = {
        h1: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
        sub: { color: '#666', fontSize: 14, marginBottom: 28 },
        card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 28, maxWidth: 520 },
        field: { marginBottom: 20 },
        label: { display: 'block', fontSize: 13, color: '#888', fontWeight: 600, marginBottom: 6 },
        hint: { fontSize: 12, color: '#555', marginTop: 4 },
        input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', color: '#e8e8e8', fontSize: 15, outline: 'none' },
        btn: { background: '#e51e25', border: 'none', borderRadius: 8, padding: '11px 24px', color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 8 },
        msg: { color: '#22c55e', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
        warn: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f59e0b', marginBottom: 24 },
    };

    if (!config) return <div style={{ color: '#555', padding: 40 }}>Loading…</div>;

    return (
        <div>
            <h1 style={s.h1}>Game Config</h1>
            <p style={s.sub}>Adjust live game settings. Changes apply from the next round.</p>
            <div style={s.warn}>
                ⚠️ <strong>Warning:</strong> These settings directly affect game fairness and player experience. Change with care.
            </div>
            {msg && <div style={s.msg}>{msg}</div>}
            <div style={s.card}>
                <div style={s.field}>
                    <label style={s.label}>House Edge Rate</label>
                    <input style={s.input} type="number" step="0.001" min="0" max="0.5"
                        value={form.houseEdgeRate} onChange={e => setForm(p => ({ ...p, houseEdgeRate: e.target.value }))} />
                    <div style={s.hint}>
                        Current: {(config.houseEdgeRate * 100).toFixed(2)}% &nbsp;·&nbsp;
                        This controls the multiplier growth rate. Default: 0.065 (6.5%)
                    </div>
                </div>

                <div style={s.field}>
                    <label style={s.label}>Betting Window (milliseconds)</label>
                    <input style={s.input} type="number" step="1000" min="3000" max="30000"
                        value={form.bettingDuration} onChange={e => setForm(p => ({ ...p, bettingDuration: e.target.value }))} />
                    <div style={s.hint}>
                        Current: {config.bettingDuration / 1000}s &nbsp;·&nbsp; Default: 8000 (8 seconds)
                    </div>
                </div>

                <div style={s.field}>
                    <label style={s.label}>Max Multiplier Cap</label>
                    <input style={s.input} type="number" step="0.01" min="0" max="10000"
                        value={form.maxMultiplier} onChange={e => setForm(p => ({ ...p, maxMultiplier: e.target.value }))} />
                    <div style={s.hint}>
                        Current: {config.maxMultiplier || 'None (0)'} &nbsp;·&nbsp; Set to 0 to disable capping. If set to 8, plane won't exceed 8x.
                    </div>
                </div>

                <div style={{ marginTop: 4, padding: '12px 0', borderTop: '1px solid #1e1e1e', display: 'flex', gap: 24, fontSize: 13, color: '#666' }}>
                    <span>Crash transition: <strong style={{ color: '#aaa' }}>{config.crashTransition / 1000}s</strong></span>
                    <span>Tick interval: <strong style={{ color: '#aaa' }}>{config.tickInterval}ms</strong></span>
                </div>

                <button style={s.btn} onClick={save} disabled={saving}>
                    {saving ? 'Saving…' : '💾 Save Changes'}
                </button>
            </div>
        </div>
    );
}
