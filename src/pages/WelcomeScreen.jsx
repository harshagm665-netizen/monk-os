import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, Fingerprint } from 'lucide-react';
import './WelcomeScreen.css';

const WelcomeScreen = () => {
    const navigate = useNavigate();

    return (
        <div className="welcome-container">
            <div className="content-wrapper">
                <div className="logo-section">
                    <div className="monk-logo">
                        <Fingerprint size={80} strokeWidth={1} />
                    </div>
                    <h1 className="brand-name">Monk OS</h1>
                    <p className="vision-quote">"The dawn of humanoid software."</p>
                </div>

                <div className="action-section">
                    <button className="glass-btn primary" onClick={() => navigate('/auth?mode=login')}>
                        <LogIn size={20} />
                        <span>Login to Core</span>
                    </button>

                    <button className="glass-btn secondary" onClick={() => navigate('/auth?mode=register')}>
                        <UserPlus size={20} />
                        <span>Create Entity</span>
                    </button>
                </div>
            </div>

            {/* Decorative background elements */}
            <div className="ambient-orb orb-1"></div>
            <div className="ambient-orb orb-2"></div>
            <div className="grid-overlay"></div>
        </div>
    );
};

export default WelcomeScreen;
