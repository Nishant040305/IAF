import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './components/Login';
import api from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const savedUser = localStorage.getItem('admin_info');
      if (savedUser) {
        try {
          // Validate session with backend (cookie will be sent automatically)
          const res = await api.get('/api/admin/me');
          // Update stored info with latest from server
          localStorage.setItem('admin_info', JSON.stringify(res.data.data));
          setUser(res.data.data);
        } catch {
          // Session invalid, clear localStorage
          localStorage.removeItem('admin_info');
        }
      }
      setChecking(false);
    };
    validateSession();
  }, []);

  if (checking) return null;

  return (
    <>
      {user ? (
        <Dashboard user={user} onLogout={() => {
          api.post('/api/admin/logout').catch(() => { });
          localStorage.removeItem('admin_info');
          setUser(null);
        }} />
      ) : (
        <Login onLoginSuccess={(admin) => setUser(admin)} />
      )}
    </>
  );
}

export default App;
