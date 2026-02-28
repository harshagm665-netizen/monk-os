import React from 'react';
import { ShieldAlert, VideoOff, Lock, AlertTriangle, RefreshCw } from 'lucide-react';

const CameraDiagnosticAgent = ({ error, onRetry }) => {
    if (!error) return null;

    const renderDiagnostics = () => {
        switch (error.type) {
            case 'PERMISSION_DENIED':
                return {
                    icon: <Lock size={48} color="#ffaa00" />,
                    title: "Camera Access Blocked",
                    message: "Monk OS needs permission to use your webcam for this app.",
                    steps: [
                        "Click the Padlock icon (🔒) next to your browser's URL bar.",
                        "Find 'Camera' and change it from 'Block' to 'Allow'.",
                        "Reload this page and try again."
                    ]
                };
            case 'NO_HARDWARE':
                return {
                    icon: <VideoOff size={48} color="#ff3366" />,
                    title: "No Webcam Detected",
                    message: "We couldn't find a camera connected to your device.",
                    steps: [
                        "Ensure your webcam is physically plugged in.",
                        "Check if it has a physical privacy shutter that is closed.",
                        "If you are on a laptop, check for a dedicated keyboard key that disables the camera."
                    ]
                };
            case 'HARDWARE_IN_USE':
                return {
                    icon: <AlertTriangle size={48} color="#ffaa00" />,
                    title: "Camera is Busy",
                    message: "Another application is currently using your webcam.",
                    steps: [
                        "Check if Zoom, Teams, or another browser tab is using the camera.",
                        "Close that application completely.",
                        "Click the retry button below."
                    ]
                };
            case 'SECURITY_BLOCK':
                return {
                    icon: <ShieldAlert size={48} color="#ff3366" />,
                    title: "Insecure Connection",
                    message: "Browsers require a secure connection to access the camera.",
                    steps: [
                        "If you are developing locally, ensure you are accessing via 'http://localhost' or 'http://127.0.0.1'.",
                        "Accessing via a network IP (e.g., 192.168.x.x) over HTTP will block the camera API.",
                        "Switch to localhost or set up HTTPS."
                    ]
                };
            default:
                return {
                    icon: <AlertTriangle size={48} color="#ff3366" />,
                    title: "Unknown Camera Error",
                    message: error.message || "An unexpected error occurred while accessing the camera.",
                    steps: ["Try refreshing the page or restarting your browser."]
                };
        }
    };

    const config = renderDiagnostics();

    return (
        <div style={styles.container}>
            <div style={styles.iconBox}>{config.icon}</div>
            <h3 style={styles.title}>{config.title}</h3>
            <p style={styles.message}>{config.message}</p>

            <div style={styles.stepsBox}>
                <h4 style={styles.stepsTitle}>How to fix this:</h4>
                <ol style={styles.list}>
                    {config.steps.map((step, idx) => (
                        <li key={idx} style={styles.listItem}>{step}</li>
                    ))}
                </ol>
            </div>

            {onRetry && (
                <button style={styles.retryBtn} onClick={onRetry}>
                    <RefreshCw size={16} /> Try Again
                </button>
            )}
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(20, 20, 25, 0.95)',
        border: '1px solid rgba(255, 51, 102, 0.3)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(255, 51, 102, 0.05)',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '450px',
        textAlign: 'center',
        margin: '20px auto',
        fontFamily: "'Inter', sans-serif"
    },
    iconBox: {
        marginBottom: '15px',
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '15px',
        borderRadius: '50%'
    },
    title: {
        color: '#fff',
        margin: '0 0 10px 0',
        fontSize: '1.4rem'
    },
    message: {
        color: '#aaa',
        margin: '0 0 20px 0',
        fontSize: '0.95rem',
        lineHeight: '1.4'
    },
    stepsBox: {
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '8px',
        padding: '15px 20px',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left'
    },
    stepsTitle: {
        color: '#00ffcc',
        margin: '0 0 10px 0',
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    list: {
        margin: 0,
        paddingLeft: '20px',
        color: '#ccc',
        fontSize: '0.9rem'
    },
    listItem: {
        marginBottom: '8px'
    },
    retryBtn: {
        marginTop: '25px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#ff3366',
        color: '#fff',
        border: 'none',
        padding: '10px 24px',
        borderRadius: '20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 15px rgba(255, 51, 102, 0.4)'
    }
};

export default CameraDiagnosticAgent;
