import React, { useRef, useEffect, useState, useCallback } from 'react';
import './Apps.css';

const WS_URL = 'ws://127.0.0.1:8000/api/vision/ws/video-feed';

const FaceRecApp = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const frameTimerRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const [hasPermission, setHasPermission] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [detectedFaces, setDetectedFaces] = useState([]);
    const [wsStatus, setWsStatus] = useState('connecting'); // connecting | live | reconnecting | offline

    // Face Registry UI state
    const [isRegistering, setIsRegistering] = useState(false);
    const [registerName, setRegisterName] = useState('');
    const [registerStatus, setRegisterStatus] = useState('');

    // ── WebSocket: open, send frames, reconnect ──
    const connectWS = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        setWsStatus('connecting');
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsStatus('live');
            // Start frame-send loop
            const sendFrame = () => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (video?.videoWidth > 0 && canvas) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    canvas.getContext('2d').drawImage(video, 0, 0);
                    try { ws.send(canvas.toDataURL('image/jpeg', 0.7)); } catch (_) { /* ignore */ }
                }
                frameTimerRef.current = setTimeout(sendFrame, 150); // ~6 fps — enough for recognition
            };
            sendFrame();
        };

        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                setDetectedFaces(data.faces || []);
            } catch (_) { }
        };

        ws.onclose = () => {
            setWsStatus('reconnecting');
            setDetectedFaces([]);
            clearTimeout(frameTimerRef.current);
            reconnectTimerRef.current = setTimeout(connectWS, 2000); // retry in 2 s
        };

        ws.onerror = () => {
            setWsStatus('offline');
            ws.close();
        };
    }, []);

    // ── Camera startup ──
    useEffect(() => {
        let stream = null;

        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (videoRef.current) videoRef.current.srcObject = stream;
                setHasPermission(true);
                connectWS();
            } catch (err) {
                setErrorMsg('Camera access denied or unavailable.');
            }
        };

        startCamera();

        return () => {
            stream?.getTracks().forEach(t => t.stop());
            clearTimeout(frameTimerRef.current);
            clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
        };
    }, [connectWS]);

    // ── Bounding-box renderer ──
    const renderBoxes = () => {
        const video = videoRef.current;
        if (!video?.videoWidth) return null;
        const sx = video.clientWidth / video.videoWidth;
        const sy = video.clientHeight / video.videoHeight;

        return detectedFaces.map((face, i) => {
            const { x, y, w, h } = face.box;
            const known = face.name !== 'Unknown';
            return (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${x * sx}px`, top: `${y * sy}px`,
                        width: `${w * sx}px`, height: `${h * sy}px`,
                        border: `2px solid ${known ? '#00ffcc' : '#ff4444'}`,
                        boxShadow: `0 0 12px ${known ? 'rgba(0,255,204,0.6)' : 'rgba(255,68,68,0.5)'}`,
                        borderRadius: '4px',
                        transition: 'all 0.1s ease'
                    }}
                >
                    <span style={{
                        position: 'absolute', bottom: '-26px', left: '-2px',
                        background: known ? '#00ffcc' : '#ff4444',
                        color: '#000', padding: '2px 8px',
                        fontWeight: 700, fontSize: '12px', borderRadius: '3px',
                        whiteSpace: 'nowrap'
                    }}>
                        {face.name}
                    </span>
                </div>
            );
        });
    };

    // Status line
    const statusText = () => {
        if (!hasPermission) return '';
        if (wsStatus === 'offline') return '⚠ Backend offline';
        if (wsStatus === 'reconnecting') return '↻ Reconnecting to AI...';
        if (detectedFaces.length === 0) return '◎ Finding face...';
        const name = detectedFaces[0].name;
        return name === 'Unknown' ? '⚡ Unknown identity' : `✓ Detected: ${name}`;
    };

    const statusColor = () => {
        if (wsStatus === 'offline') return '#ff4444';
        if (wsStatus === 'reconnecting') return '#ffaa00';
        if (detectedFaces.length > 0 && detectedFaces[0].name !== 'Unknown') return '#00ffcc';
        return '#aaa';
    };

    // ── Registration handler ──
    const handleRegister = async () => {
        if (!registerName.trim() || !videoRef.current) return;
        setRegisterStatus('Capturing & training...');

        const captureCanvas = document.createElement('canvas');
        const video = videoRef.current;
        captureCanvas.width = video.videoWidth;
        captureCanvas.height = video.videoHeight;
        captureCanvas.getContext('2d').drawImage(video, 0, 0);
        const base64Frame = captureCanvas.toDataURL('image/jpeg', 0.95);

        try {
            const res = await fetch('http://127.0.0.1:8000/api/vision/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: registerName.trim(), image_base64: base64Frame })
            });
            const data = await res.json();
            if (data.success) {
                setRegisterStatus(data.message);
                setTimeout(() => { setIsRegistering(false); setRegisterName(''); setRegisterStatus(''); }, 2500);
            } else {
                setRegisterStatus('⚠ ' + data.error);
            }
        } catch {
            setRegisterStatus('Cannot reach backend.');
        }
    };

    return (
        <div className="app-container face-rec">
            <div className="camera-feed-mock" style={{ position: 'relative', overflow: 'hidden' }}>
                {/* WS badge */}
                {hasPermission && (
                    <div style={{
                        position: 'absolute', top: 8, right: 8, zIndex: 10,
                        background: wsStatus === 'live' ? 'rgba(0,255,204,0.15)' : 'rgba(255,100,0,0.2)',
                        border: `1px solid ${wsStatus === 'live' ? '#00ffcc55' : '#ff660055'}`,
                        borderRadius: 20, padding: '3px 10px', fontSize: 11,
                        color: wsStatus === 'live' ? '#00ffcc' : '#ffaa00',
                        backdropFilter: 'blur(4px)'
                    }}>
                        {wsStatus === 'live' ? '● AI LIVE' : '● AI Connecting'}
                    </div>
                )}

                {!hasPermission && !errorMsg && <p>Requesting camera access...</p>}
                {errorMsg && <p className="error-text">{errorMsg}</p>}

                <video
                    ref={videoRef} autoPlay playsInline muted
                    className="real-camera-video"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: hasPermission ? 'block' : 'none' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {hasPermission && renderBoxes()}

                {hasPermission && (
                    <p className="status-text" style={{ color: statusColor() }}>
                        {statusText()}
                    </p>
                )}
            </div>

            <div className="app-sidebar">
                <h4>Face Registry</h4>

                {isRegistering ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 15 }}>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={registerName}
                            onChange={e => setRegisterName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            autoFocus
                            style={{
                                padding: 10, background: 'rgba(255,255,255,0.08)', color: '#fff',
                                border: '1px solid #00ffcc44', borderRadius: 6, outline: 'none'
                            }}
                        />
                        <button className="action-btn" onClick={handleRegister}>Capture Face</button>
                        <button className="action-btn" style={{ background: '#222' }}
                            onClick={() => { setIsRegistering(false); setRegisterStatus(''); }}>
                            Cancel
                        </button>
                        {registerStatus && (
                            <p style={{
                                fontSize: 12, color: registerStatus.startsWith('⚠') ? '#ff8888' : '#00ffcc',
                                textAlign: 'center', margin: 0
                            }}>
                                {registerStatus}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="registry-list">
                        <div className="registry-item user-match">
                            <div className="avatar">AI</div>
                            <div className="info">
                                <span className="name">LBPH Engine</span>
                                <span className="match" style={{ color: '#00ffcc' }}>Ready to Learn</span>
                            </div>
                        </div>
                        <button className="action-btn" onClick={() => setIsRegistering(true)}>
                            Register New Face
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceRecApp;
