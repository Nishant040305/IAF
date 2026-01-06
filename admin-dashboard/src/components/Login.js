import React, { useState } from 'react';
import api from '../utils/api';

export default function Login({ onLoginSuccess }) {
    const [step, setStep] = useState(1); // 1: request, 2: verify
    const [name, setName] = useState('');
    const [contact, setContact] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/admin/login/request-otp', { name, contact });
            setStep(2);
            if (res.data.data && res.data.data.otp) {
                // Dev mode: show OTP in UI
                console.log("DEV MODE OTP:", res.data.data.otp);
                alert(`[DEV MODE] Your OTP is: ${res.data.data.otp}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to request OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/admin/login/verify-otp', { name, contact, otp });
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

                {error && <div style={styles.error}>{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
                        <input
                            style={styles.input}
                            placeholder="Admin Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        <input
                            style={styles.input}
                            placeholder="Contact Number"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            required
                        />
                        <button style={styles.button} disabled={loading}>
                            {loading ? 'Sending...' : 'Request OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <p style={styles.info}>OTP sent to {contact}</p>
                        <input
                            style={styles.input}
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            required
                        />
                        <button style={styles.button} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Login'}
                        </button>
                        <button
                            type="button"
                            style={styles.link}
                            onClick={() => setStep(1)}
                        >
                            Back to registration
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
        background: '#f0f2f5',
    },
    card: {
        background: '#fff',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center',
    },
    logo: {
        width: '100px',
        marginBottom: '20px',
    },
    title: {
        marginBottom: '30px',
        color: '#1a1a1a',
        fontSize: '24px',
        fontWeight: '600',
    },
    input: {
        width: '100%',
        padding: '12px',
        marginBottom: '15px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '16px',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        padding: '12px',
        background: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background 0.3s',
    },
    error: {
        color: '#dc3545',
        marginBottom: '15px',
        fontSize: '14px',
    },
    info: {
        color: '#666',
        marginBottom: '15px',
        fontSize: '14px',
    },
    link: {
        background: 'none',
        border: 'none',
        color: '#007bff',
        marginTop: '15px',
        cursor: 'pointer',
        fontSize: '14px',
    }
};
