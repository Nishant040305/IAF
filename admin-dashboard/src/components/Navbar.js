import React from 'react';

export default function Navbar({ currentView, setView, user, onLogout }) {
  const buttons = [
    { key: 'pdf', label: '📄 PDF Manager' },
    { key: 'dictionary', label: '📘 Dictionary' },
    { key: 'abbreviation', label: '🔤 Abbreviations' },
  ];

  return (
    <nav style={navStyles.navbar}>
      <div style={navStyles.left}>
        <img src="/iaf.png" alt="IAF" style={{ height: 32, marginRight: 12 }} />
        <span style={{ fontWeight: 600 }}>VayuReader Admin</span>
      </div>
      <div style={navStyles.center}>
        {buttons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setView(btn.key)}
            style={{
              ...navStyles.button,
              ...(currentView === btn.key ? navStyles.active : {}),
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div style={navStyles.right}>
        <span style={{ marginRight: 15, fontSize: '0.9rem', color: '#666' }}>{user.name}</span>
        <button onClick={onLogout} style={navStyles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const navStyles = {
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 32px',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    width: '250px',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flex: 1,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '250px',
  },
  button: {
    background: 'none',
    border: 'none',
    color: '#4b5563',
    fontSize: '0.95rem',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  active: {
    background: '#f1f5f9',
    color: '#2563eb',
    fontWeight: 600,
  },
  logoutBtn: {
    background: '#fee2e2',
    color: '#dc2626',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};
