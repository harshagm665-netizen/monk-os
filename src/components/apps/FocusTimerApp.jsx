import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Focus, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useCamera } from '../../context/CameraContext';
import CameraDiagnosticAgent from '../CameraDiagnosticAgent';
import './FocusTimer.css';

const FocusTimerApp = ({ onClose }) => {
    const [workMinutes, setWorkMinutes] = useState(25);
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [absentSeconds, setAbsentSeconds] = useState(0);
    const { stream, cameraError, requestCamera, releaseCamera } = useCamera();
    const wsRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => {
        requestCamera();
        return () => releaseCamera();
    }, []);

    // Auto-Pause Logic
    useEffect(() => {
        let interval = null;

        // If the timer is supposed to be running...
        if (isActive) {
            // But there is no face AND the camera isn't explicitly broken...
            if (!faceDetected && !cameraError) {
                // Start counting absent seconds
                interval = setInterval(() => {
                    setAbsentSeconds(prev => {
                        const newAbsent = prev + 1;
                        if (newAbsent >= 5) {
                            // Student is gone for 5s > Auto Pause!
                            setIsActive(false);
                            speakWarning();
                        }
                        return newAbsent;
                    });
                }, 1000);
            } else {
                // Face is present, clear absence and tick down timer normally
                setAbsentSeconds(0);
                interval = setInterval(() => {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            clearInterval(interval);
                            setIsActive(false);
                            speakFinish();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }

        return () => clearInterval(interval);
    }, [isActive, faceDetected, cameraError]);

    // WebSocket Face Detection
    useEffect(() => {
        // Connect to existing Vision WebSocket
        wsRef.current = new WebSocket('ws://localhost:8000/api/vision/ws');

        wsRef.current.onmessage = (event) => {
            try {
                const results = JSON.parse(event.data);
                if (results.length > 0) {
                    setFaceDetected(true);
                } else {
                    setFaceDetected(false);
                }
            } catch (err) {
                console.error("Focus Timer WS Error", err);
            }
        };

        // ── Bind Global Camera Stream ──
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;

            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');

            setInterval(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN && isActive && videoRef.current) {
                    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                    const frameData = canvas.toDataURL('image/jpeg', 0.5);
                    wsRef.current.send(frameData);
                }
            }, 1000);
        }

        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, [isActive, stream]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(workMinutes * 60);
        setAbsentSeconds(0);
    };

    const adjustTime = (deltaMinutes) => {
        // Can only adjust time if timer isn't running and is fully reset
        if (!isActive && timeLeft === workMinutes * 60) {
            setWorkMinutes(prev => {
                const newMins = Math.max(1, Math.min(120, prev + deltaMinutes));
                setTimeLeft(newMins * 60);
                return newMins;
            });
        }
    };

    const speakWarning = () => {
        const text = "Timer paused! Where did you go? Come back and focus!";
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = 1.3;
        window.speechSynthesis.speak(utterance);
    };

    const speakFinish = () => {
        const text = "Hooray! Study session complete. Take a break!";
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    // Calculate SVG Circle format
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const percent = (timeLeft / (workMinutes * 60)) * 100;
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <div className="focus-timer-container">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back">
                    <ArrowLeft size={20} />
                </button>
            )}

            <div className="ft-header">
                <h2><Focus className="inline-icon" /> Focus Timer</h2>
                <p>Stay at your desk or the timer stops!</p>
            </div>

            {cameraError && (
                <div style={{ marginBottom: '15px' }}>
                    <CameraDiagnosticAgent error={cameraError} onRetry={requestCamera} />
                </div>
            )}

            <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />

            <div className={`ft-ring-wrapper ${!faceDetected && isActive ? 'pulse-warning' : ''}`}>
                <svg className="ft-ring" width="300" height="300">
                    <circle
                        className="ft-ring-bg"
                        cx="150" cy="150" r={radius}
                    />
                    <circle
                        className={`ft-ring-progress ${isActive ? 'active' : ''}`}
                        cx="150" cy="150" r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                    />
                </svg>

                <div className="ft-time-display">
                    <h1>{formatTime(timeLeft)}</h1>
                    <span className={`ft-status-pill ${isActive ? (faceDetected || cameraError ? 'focusing' : 'away') : 'paused'}`}>
                        {isActive
                            ? (faceDetected || cameraError ? 'FOCUSING...' : 'STUDENT AWAY ⚠️')
                            : 'PAUSED'}
                    </span>
                </div>
            </div>

            <div className="ft-controls">
                {!isActive && timeLeft === workMinutes * 60 && (
                    <button className="ft-btn secondary" onClick={() => adjustTime(-5)} disabled={workMinutes <= 5}>
                        <Minus size={24} />
                    </button>
                )}

                <button className={`ft-btn primary ${isActive ? 'pause' : 'play'}`} onClick={toggleTimer}>
                    {isActive ? <Pause size={28} /> : <Play size={28} />}
                </button>
                <button className="ft-btn secondary" onClick={resetTimer}>
                    <RotateCcw size={24} />
                </button>

                {!isActive && timeLeft === workMinutes * 60 && (
                    <button className="ft-btn secondary" onClick={() => adjustTime(5)} disabled={workMinutes >= 120}>
                        <Plus size={24} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FocusTimerApp;
