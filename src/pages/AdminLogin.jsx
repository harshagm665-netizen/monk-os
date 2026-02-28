import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import './AdminDashboard.css';

const AdminLogin = () => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Prototype: Hardcoded PIN for Teacher access
        if (pin === '1234') {
            localStorage.setItem('monk_admin_auth', 'true');
            navigate('/admin/dashboard');
        } else {
            setError('Invalid PIN Code');
            setPin('');
        }
    };

    return (
        <div className="admin-login-container">
            <div className="login-card">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(255, 51, 102, 0.2)', padding: '15px', borderRadius: '50%' }}>
                        <Lock size={32} color="#ff3366" />
                    </div>
                </div>
                <h2>Teacher Portal</h2>
                <p>Enter the 4-digit Administrator PIN</p>

                <form onSubmit={handleLogin} style={{ marginTop: '30px' }}>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="####"
                        maxLength={4}
                        className="pin-input"
                        autoFocus
                    />
                    {error && <div style={{ color: '#ff3366', marginTop: '10px', fontSize: '14px' }}>{error}</div>}

                    <button type="submit" className="login-btn mt-4">
                        Unlock Dashboard
                    </button>

                    <button type="button" className="back-to-os-btn" onClick={() => navigate('/')}>
                        Return to Monk OS
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
