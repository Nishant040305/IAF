import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PdfManager from './components/PdfManager';
import DictionaryManager from './components/DictionaryUploader';
import AbbreviationUploader from './components/AbbreviationUploader';
import AdminManager from './components/AdminManager';
import AdminAuditLogs from './components/AdminAuditLogs';
import UserAuditLogs from './components/UserAuditLogs';

// Helper to check if user has permission
const hasPermission = (user, permission) => {
  if (user.isSuperAdmin) return true;
  return (user.permissions || []).includes(permission);
};

export default function Dashboard({ user, onLogout }) {
  // Set initial view based on first available permission
  const getInitialView = () => {
    if (hasPermission(user, 'manage_pdfs')) return 'pdf';
    if (hasPermission(user, 'manage_dictionary')) return 'dictionary';
    if (hasPermission(user, 'manage_abbreviations')) return 'abbreviation';
    if (hasPermission(user, 'manage_admins')) return 'admins';
    if (hasPermission(user, 'view_audit')) return 'adminAudit';
    if (hasPermission(user, 'view_user_audit')) return 'userAudit';
    return 'pdf';
  };

  const [view, setView] = useState(getInitialView);
  const [pdfToHighlight, setPdfToHighlight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate short loading delay
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = (targetView, resourceId) => {
    setView(targetView);
    if (targetView === 'pdf' && resourceId) {
      setPdfToHighlight(resourceId);
    }
  };

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

  const renderView = () => {
    switch (view) {
      case 'pdf':
        return hasPermission(user, 'manage_pdfs') ?
          <PdfManager
            targetPdfId={pdfToHighlight}
            onClearTarget={() => setPdfToHighlight(null)}
          /> : <NoAccess />;
      case 'dictionary':
        return hasPermission(user, 'manage_dictionary') ? <DictionaryManager /> : <NoAccess />;
      case 'abbreviation':
        return hasPermission(user, 'manage_abbreviations') ? <AbbreviationUploader /> : <NoAccess />;
      case 'admins':
        return hasPermission(user, 'manage_admins') ? <AdminManager /> : <NoAccess />;
      case 'adminAudit':
        return hasPermission(user, 'view_audit') ? <AdminAuditLogs onNavigate={handleNavigate} /> : <NoAccess />;
      case 'userAudit':
        return hasPermission(user, 'view_user_audit') ? <UserAuditLogs /> : <NoAccess />;
      default:
        return <PdfManager />;
    }
  };

  const getTitle = () => {
    const titles = {
      pdf: '📄 PDF Manager',
      dictionary: '📘 Dictionary',
      abbreviation: '🔤 Abbreviations',
      admins: '👥 Admin Management',
      adminAudit: '📋 Admin Audit Logs',
      userAudit: '👁️ User Activity Logs'
    };
    return titles[view] || '';
  };

  return (
    <div style={{ background: '#f7f9fb', minHeight: '100vh' }}>
      <Navbar currentView={view} setView={setView} user={user} onLogout={onLogout} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 32 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 24, color: '#222' }}>
          {getTitle()}
        </h2>
        {renderView()}
      </div>
    </div>
  );
}

function NoAccess() {
  return (
    <div style={{
      textAlign: 'center',
      padding: 60,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ color: '#dc2626', marginBottom: 12 }}>🚫 Access Denied</h3>
      <p style={{ color: '#6b7280' }}>You don't have permission to access this section.</p>
    </div>
  );
}
