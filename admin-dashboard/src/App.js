import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('admin_info');
    const token = localStorage.getItem('admin_token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setChecking(false);
  }, []);

  if (checking) return null;

  return (
    <>
      {user ? (
        <Dashboard user={user} onLogout={() => {
          localStorage.removeItem('admin_token');
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
