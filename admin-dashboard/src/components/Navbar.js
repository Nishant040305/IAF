import React from 'react';

export default function Navbar({ currentView, setView }) {
  const buttons = [
    { key: 'pdf', label: '📄 PDF Manager' },
    { key: 'dictionary', label: '📘 Dictionary' },
    { key: 'abbreviation', label: '🔤 Abbreviations' },
  ];

  return (
    <nav style={navStyles.navbar}>
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
    </nav>
  );
}

const navStyles = {
  navbar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '24px',
    padding: '24px 0 12px 0',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: 24,
  },
  button: {
    background: 'none',
    border: 'none',
    color: '#222',
    fontSize: '1.1rem',
    fontWeight: 500,
    padding: '8px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  active: {
    background: '#f1f5f9',
    color: '#2563eb',
    fontWeight: 600,
  },
};
