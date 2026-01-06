import React, { useState } from 'react';
import api from '../utils/api';

export default function Login({ onLoginSuccess }) {
    const [step, setStep] = useState(1); // 1: password, 2: OTP
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Format phone input - only allow digits, max 10
    const handlePhoneChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        setContact(digits);
    };

    // Step 1: Verify password and request OTP
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (contact.length !== 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/admin/login/request-otp', { contact, password });
            setStep(2);
            if (res.data.data && res.data.data.otp) {
                console.log("DEV MODE OTP:", res.data.data.otp);
                alert(`[DEV MODE] Your OTP is: ${res.data.data.otp}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP and complete login
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/admin/login/verify-otp', { contact, otp });
            const { token, admin } = res.data.data;
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_info', JSON.stringify(admin));
            onLoginSuccess(admin);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <img src="/iaf.png" alt="IAF Logo" style={styles.logo} />
                <h2 style={styles.title}>VayuReader Admin</h2>
                <p style={styles.subtitle}>Two-Factor Authentication</p>

                {error && <div style={styles.error}>{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handlePasswordSubmit}>
                        <input
                            style={styles.input}
                            type="tel"
                            placeholder="Phone Number (10 digits)"
                            value={contact}
                            onChange={handlePhoneChange}
                            maxLength={10}
                            required
                        />
                        <input
                            style={styles.input}
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button style={styles.button} disabled={loading}>
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div style={styles.infoBox}>
                            <span style={styles.checkIcon}>✓</span>
                            Password verified. OTP sent to ******{contact.slice(-4)}
                        </div>
                        <input
                            style={styles.input}
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6}
                            required
                            autoFocus
                        />
                        <button style={styles.button} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <button
                            type="button"
                            style={styles.link}
                            onClick={() => { setStep(1); setOtp(''); setError(''); }}
                        >
                            ← Back
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
    },
    card: {
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
    },
    logo: {
        width: '80px',
        marginBottom: '16px',
    },
    title: {
        marginBottom: '4px',
        color: '#1a1a1a',
        fontSize: '24px',
        fontWeight: '700',
    },
    subtitle: {
        marginBottom: '24px',
        color: '#64748b',
        fontSize: '14px',
    },
    input: {
        width: '100%',
        padding: '14px 16px',
        marginBottom: '16px',
        border: '2px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    },
    button: {
        width: '100%',
        padding: '14px',
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    error: {
        color: '#dc2626',
        background: '#fef2f2',
        border: '1px solid #fecaca',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
    },
    infoBox: {
        color: '#16a34a',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    checkIcon: {
        color: '#16a34a',
        fontWeight: 'bold',
    },
    link: {
        background: 'none',
        border: 'none',
        color: '#64748b',
        marginTop: '16px',
        cursor: 'pointer',
        fontSize: '14px',
        display: 'block',
        width: '100%',
    }
};
