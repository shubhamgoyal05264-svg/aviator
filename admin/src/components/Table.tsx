import React from 'react';

interface Column<T> {
    key: keyof T | string;
    label: string;
    render?: (row: T) => React.ReactNode;
    align?: 'left' | 'right' | 'center';
}

interface Props<T> {
    columns: Column<T>[];
    data: T[];
    keyField?: keyof T;
}

export default function Table<T extends Record<string, any>>({ columns, data, keyField = 'id' }: Props<T>) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                        {columns.map(c => (
                            <th key={String(c.key)} style={{
                                padding: '10px 14px', textAlign: c.align || 'left',
                                color: '#888', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
                            }}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 && (
                        <tr><td colSpan={columns.length} style={{ padding: 24, textAlign: 'center', color: '#444' }}>No data</td></tr>
                    )}
                    {data.map((row, i) => (
                        <tr key={String(row[keyField] ?? i)} style={{
                            borderBottom: '1px solid #1a1a1a',
                            transition: 'background 0.1s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#181818')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {columns.map(c => (
                                <td key={String(c.key)} style={{ padding: '10px 14px', textAlign: c.align || 'left', whiteSpace: 'nowrap' }}>
                                    {c.render ? c.render(row) : String(row[c.key as string] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
