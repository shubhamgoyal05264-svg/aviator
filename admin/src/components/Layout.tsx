import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../api';

const links = [
    { to: '/', label: '📊 Dashboard' },
    { to: '/users', label: '👥 Users' },
    { to: '/transactions', label: '💳 Transactions' },
    { to: '/bets', label: '🎟️ Bets' },
    { to: '/rounds', label: '🎲 Rounds' },
    { to: '/config', label: '⚙️ Config' },
];

const styles: Record<string, React.CSSProperties> = {
    wrapper: { display: 'flex', minHeight: '100vh' },
    sidebar: {
        width: 220, background: '#111', borderRight: '1px solid #222',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
        position: 'sticky', top: 0, height: '100vh',
    },
    logo: {
        padding: '0 20px 28px', fontSize: 18, fontWeight: 800,
        color: '#e51e25', letterSpacing: '-0.5px',
    },
    nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, padding: '0 10px' },
    link: {
        display: 'block', padding: '10px 14px', borderRadius: 8,
        color: '#999', fontWeight: 500, fontSize: 14, transition: 'all 0.15s',
    },
    activeLink: { background: 'rgba(229,30,37,0.12)', color: '#fff' },
    logout: {
        margin: '12px 10px 0', padding: '10px 14px', borderRadius: 8,
        background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#888',
        fontSize: 14, fontWeight: 500, textAlign: 'left' as const,
    },
    main: { flex: 1, padding: '32px 36px', overflowY: 'auto' as const, maxHeight: '100vh' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    function logout() { clearToken(); navigate('/login'); }

    return (
        <div style={styles.wrapper}>
            <aside style={styles.sidebar}>
                <div style={styles.logo}>✈ SkyHigh Admin</div>
                <nav style={styles.nav}>
                    {links.map(l => (
                        <NavLink key={l.to} to={l.to} end={l.to === '/'} style={({ isActive }) => ({
                            ...styles.link, ...(isActive ? styles.activeLink : {})
                        })}>
                            {l.label}
                        </NavLink>
                    ))}
                </nav>
                <button style={styles.logout} onClick={logout}>🚪 Logout</button>
            </aside>
            <main style={styles.main}>{children}</main>
        </div>
    );
}
