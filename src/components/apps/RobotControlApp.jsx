import React, { useState, useEffect } from 'react';
import { Bot, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand, Navigation, Disc3, Square, X } from 'lucide-react';
import './RobotControl.css';

const RobotControlApp = ({ onClose }) => {
    const [status, setStatus] = useState('Checking Connection...');
    const [isConnected, setIsConnected] = useState(false);
    const [isDancing, setIsDancing] = useState(false);

    const BACKEND_URL = `http://${window.location.hostname}:8000/api/hardware`;

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/status`);
            const data = await res.json();
            setIsConnected(data.connected);
            setStatus(data.connected ? `Connected to ${data.port}` : 'Disconnected (Check Port/Cable)');
        } catch (err) {
            setIsConnected(false);
            setStatus('Backend Offline');
        }
    };

    const sendCommand = async (cmd) => {
        try {
            const res = await fetch(`${BACKEND_URL}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            if (!res.ok) {
                const errorData = await res.json();
                setStatus(`Error: ${errorData.detail}`);
            } else {
                setStatus(`Command Sent: [ ${cmd.toUpperCase()} ]`);
                if (cmd === 'dance start') setIsDancing(true);
                if (cmd === 'dance stop' || cmd === 's') setIsDancing(false);
            }
        } catch (err) {
            setStatus('Communication Error');
        }
    };

    return (
        <div className="app-container robot-control-container">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back" style={{ zIndex: 100 }}>
                    <X size={20} />
                </button>
            )}
            <div className="rc-header">
                <h2>Humanoid Link Interface</h2>
                <div className={`status-badge ${isConnected ? 'online' : 'offline'}`}>
                    <div className="status-dot"></div>
                    {status}
                </div>
            </div>

            <div className="rc-dashboard">
                {/* Visualizer Panel */}
                <div className="rc-visualizer">
                    <div className={`cyber-bot ${isDancing ? 'dancing' : ''}`}>
                        <Bot size={80} color={isConnected ? '#00ffcc' : '#ff3366'} />
                    </div>
                </div>

                {/* Main Controls Overlay */}
                <div className="rc-controls-panel">
                    {/* D-Pad Base Movement */}
                    <div className="control-section d-pad-container">
                        <h3>Base Kinematics</h3>
                        <div className="d-pad">
                            <button className="d-btn up" onMouseDown={() => sendCommand('bf')} title="Forward (bf)"><ArrowUp size={24} /></button>
                            <button className="d-btn left" onMouseDown={() => sendCommand('bl')} title="Turn Left (bl)"><ArrowLeft size={24} /></button>
                            <button className="d-btn stop" onMouseDown={() => sendCommand('s')} title="Emergency Stop (s)"><Square size={20} /></button>
                            <button className="d-btn right" onMouseDown={() => sendCommand('br')} title="Turn Right (br)"><ArrowRight size={24} /></button>
                            <button className="d-btn down" onMouseDown={() => sendCommand('bb')} title="Backward (bb)"><ArrowDown size={24} /></button>
                        </div>
                    </div>

                    {/* Aux Controls */}
                    <div className="control-section aux-controls">
                        <h3>Upper Body</h3>
                        <div className="aux-grid">
                            <button className="aux-btn" onClick={() => sendCommand('hf')}><Hand size={18} /> Hands Forward (hf)</button>
                            <button className="aux-btn" onClick={() => sendCommand('hb')}><Hand size={18} /> Hands Backward (hb)</button>
                            <button className="aux-btn" onClick={() => sendCommand('xf')}><Navigation size={18} /> Head Turn Fwd (xf)</button>
                            <button className="aux-btn" onClick={() => sendCommand('xb')}><Navigation size={18} style={{ transform: 'rotate(180deg)' }} /> Head Turn Bwd (xb)</button>
                        </div>
                    </div>

                    {/* Fun Sequences */}
                    <div className="control-section sequences">
                        <h3>Automated Sequences</h3>
                        <div className="sequence-group">
                            <button className={`seq-btn ${isDancing ? 'active' : ''}`} onClick={() => sendCommand('dance start')}>
                                <Disc3 size={20} className={isDancing ? 'spin' : ''} /> Execute Dance
                            </button>
                            <button className="seq-btn stop-seq" onClick={() => sendCommand('dance stop')}>
                                <Square size={20} /> Stop & Center
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RobotControlApp;
