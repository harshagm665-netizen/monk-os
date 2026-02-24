import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Key, Fingerprint, Lock, Github, Chrome } from 'lucide-react';
import './AuthScreen.css';

const AuthScreen = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialMode = searchParams.get('mode') || 'login';
    const [mode, setMode] = useState(initialMode);

    const [encryptionState, setEncryptionState] = useState('idle'); // idle -> generating -> complete
    const [keyDisplay, setKeyDisplay] = useState('');

    // Simulate ultra-secure encryption key generation
    useEffect(() => {
        if (encryptionState === 'generating') {
            let ticks = 0;
            const interval = setInterval(() => {
                const randomHash = Array.from({ length: 64 }, () =>
                    Math.floor(Math.random() * 16).toString(16)
                ).join('');
                setKeyDisplay(randomHash.match(/.{1,16}/g).join('-'));

                ticks++;
                if (ticks > 20) {
                    clearInterval(interval);
                    setEncryptionState('complete');
                }
            }, 100);
            return () => clearInterval(interval);
        }
    }, [encryptionState]);

    const handleModeSwitch = (newMode) => {
        setMode(newMode);
        setEncryptionState('idle');
    };

    const handleAction = (e) => {
        e.preventDefault();
        setEncryptionState('generating');
        // Simulate auth delay then move to Home
        setTimeout(() => {
            navigate('/home');
        }, 4000); // 100 * 20 ticks + 2000ms pause
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="auth-header">
                    <Shield className="auth-icon" size={40} />
                    <h2>{mode === 'login' ? 'Establish Connection' : 'Register Core Identity'}</h2>
                    <p>End-to-end encrypted protocol active.</p>
                </div>

                <form className="auth-form" onSubmit={handleAction}>
                    <div className="input-group">
                        <Fingerprint className="input-icon" size={20} />
                        <input type="text" placeholder="Entity ID (Username)" required />
                        <div className="input-border"></div>
                    </div>

                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input type="password" placeholder="Passphrase" required />
                        <div className="input-border"></div>
                    </div>

                    {mode === 'register' && (
                        <div className="input-group">
                            <Key className="input-icon" size={20} />
                            <input type="password" placeholder="Confirm Passphrase" required />
                            <div className="input-border"></div>
                        </div>
                    )}

                    <button type="submit" className="auth-submit-btn" disabled={encryptionState !== 'idle'}>
                        {encryptionState === 'idle' ? (mode === 'login' ? 'Authenticate' : 'Initialize') : 'Processing...'}
                    </button>
                </form>

                {/* Encryption UI Overlay */}
                {encryptionState !== 'idle' && (
                    <div className="encryption-overlay">
                        <div className="enc-header">
                            <Shield className={encryptionState === 'complete' ? 'enc-success' : 'enc-spinning'} size={32} />
                            <span>{encryptionState === 'generating' ? 'Generating Quantum Keys...' : 'Secure Link Established'}</span>
                        </div>
                        <div className={`enc-key-display ${encryptionState === 'complete' ? 'success' : ''}`}>
                            {keyDisplay || 'INITIALIZING MATRIX...'}
                        </div>
                        {encryptionState === 'complete' && (
                            <div className="enc-routing">Routing to Core Dashboard...</div>
                        )}
                    </div>
                )}

                <div className="oauth-section">
                    <div className="divider">
                        <span>OR CONNECT VIA</span>
                    </div>
                    <div className="oauth-buttons">
                        <button type="button" className="oauth-btn" onClick={() => handleAction({ preventDefault: () => { } })}>
                            <Github size={20} />
                            <span>GitHub</span>
                        </button>
                        <button type="button" className="oauth-btn" onClick={() => handleAction({ preventDefault: () => { } })}>
                            <Chrome size={20} />
                            <span>Google</span>
                        </button>
                    </div>
                </div>

                <div className="auth-footer">
                    {mode === 'login' ? (
                        <p>New entity? <span onClick={() => handleModeSwitch('register')}>Initialize here</span></p>
                    ) : (
                        <p>Existing entity? <span onClick={() => handleModeSwitch('login')}>Authenticate here</span></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
