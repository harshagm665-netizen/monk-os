import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Download, Wifi, ShieldCheck, X } from 'lucide-react';
import './MobileSetup.css';

const MobileSetupApp = ({ onClose }) => {
    const [localIp, setLocalIp] = useState('');
    const [qrPayload, setQrPayload] = useState('');

    useEffect(() => {
        // In a true Docker/production environment, the backend would supply this.
        // For the React frontend running locally, we grab the hostname.
        const currentHost = window.location.hostname;
        setLocalIp(currentHost);

        // This is the deep link the Flutter App will parse:
        // monkapp://setup?ip=192.168.1.5&port=5173&secure=true
        const payload = `monkapp://setup?ip=${currentHost}&port=5173&secure=true`;
        setQrPayload(payload);
    }, []);

    return (
        <div className="app-container mobile-setup-container">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back" style={{ zIndex: 100 }}>
                    <X size={20} />
                </button>
            )}
            <div className="setup-hero">
                <h2>Sync Monk Control App</h2>
                <p>Scan this secure QR code using your phone's camera to instantly pair the Monk OS Flutter app over the local network.</p>
            </div>

            <div className="setup-body">
                <div className="qr-card">
                    <div className="qr-wrapper">
                        {qrPayload ? (
                            <QRCodeSVG
                                value={qrPayload}
                                size={220}
                                bgColor={"transparent"}
                                fgColor={"#00ffcc"}
                                level={"H"} // High error correction
                                includeMargin={false}
                            />
                        ) : (
                            <div className="qr-placeholder">Generating...</div>
                        )}
                        <div className="scan-line"></div>
                    </div>
                </div>

                <div className="setup-instructions">
                    {localIp === 'localhost' && (
                        <div className="step" style={{ border: '1px solid #ffcc00', background: 'rgba(255, 204, 0, 0.1)', width: '100%' }}>
                            <div className="step-text">
                                <h4 style={{ color: '#ffcc00' }}>⚠️ WARNING: Localhost Detected</h4>
                                <p>You must access this page via your Network IP (e.g. <b>http://192.168.x.x:5173</b>) on your PC for the phone to connect. Currently the QR code points to localhost!</p>
                            </div>
                        </div>
                    )}
                    <div className="step">
                        <div className="step-icon"><Wifi size={24} /></div>
                        <div className="step-text">
                            <h4>1. Join the Network</h4>
                            <p>Ensure your phone is connected to the same classroom WiFi or the Robot's Ad-Hoc Hotspot.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-icon"><Download size={24} /></div>
                        <div className="step-text">
                            <h4>2. Download the App</h4>
                            <p>If you don't have the official Flutter app, scanning this will redirect you to the App Store.</p>
                        </div>
                    </div>

                    <div className="step">
                        <div className="step-icon"><ShieldCheck size={24} /></div>
                        <div className="step-text">
                            <h4>3. Zero-Touch Pairing</h4>
                            <p>The app will securely bind to <b>{localIp}:5173</b> automatically.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="setup-footer">
                <button className="download-btn" onClick={() => alert("APK Download will be simulated here")}>
                    <Smartphone size={18} /> Download Android APK Directly
                </button>
            </div>
        </div>
    );
};

export default MobileSetupApp;
