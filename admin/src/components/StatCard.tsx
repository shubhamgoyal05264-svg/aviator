import React from 'react';

interface Props {
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
}

export default function StatCard({ label, value, sub, color = '#e51e25' }: Props) {
    return (
        <div style={{
            background: '#141414', border: '1px solid #222', borderRadius: 12, padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 6,
        }}>
            <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 28, fontWeight: 800, color }}>{value}</span>
            {sub && <span style={{ fontSize: 12, color: '#555' }}>{sub}</span>}
        </div>
    );
}
