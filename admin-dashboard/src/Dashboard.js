import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HealthCheckGraph from './components/HealthCheckGraph';
import PdfManager from './components/PdfManager';
import DictionaryManager from './components/DictionaryUploader';
import AbbreviationUploader from './components/AbbreviationUploader';

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('pdf');
  const [healthStatus, setHealthStatus] = useState({ allUp: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate short loading delay
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f7f9fb',
      }}>
        <img
          src="/iaf.png"
          alt="Loading..."
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'contain',
            opacity: 0.8,
            animation: 'pulse 1.5s infinite ease-in-out'
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ background: '#f7f9fb', minHeight: '100vh' }}>
      <Navbar currentView={view} setView={setView} user={user} onLogout={onLogout} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 32 }}>
        {view === 'pdf' && <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24, color: '#222' }}>📄 PDF Manager</h2>}
        {view === 'dictionary' && <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24, color: '#222' }}>📘 Dictionary</h2>}
        {view === 'abbreviation' && <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24, color: '#222' }}>🔤 Abbreviations</h2>}
        {view === 'pdf' && <PdfManager />}
        {view === 'dictionary' && <DictionaryManager />}
        {view === 'abbreviation' && <AbbreviationUploader />}
      </div>
    </div>
  );
}
