import React, { useRef, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useCamera } from '../../context/CameraContext';
import CameraDiagnosticAgent from '../CameraDiagnosticAgent';
import './Apps.css';

const EmotionApp = ({ onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const { stream, cameraError, isInitializing, requestCamera, releaseCamera } = useCamera();
    const [detectedFaces, setDetectedFaces] = useState([]);

    useEffect(() => {
        requestCamera();
        return () => releaseCamera();
    }, []);

    // ── Bind Global Camera Stream ──
    useEffect(() => {
        let animationFrameId = null;

        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;

            wsRef.current = new WebSocket("ws://127.0.0.1:8000/api/vision/ws/video-feed");

            wsRef.current.onmessage = (event) => {
                const data = JSON.parse(event.data);
                setDetectedFaces(data.faces || []);
            };

            const sendFrame = () => {
                if (wsRef.current?.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
                    const video = videoRef.current;
                    const canvas = canvasRef.current;

                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const base64Frame = canvas.toDataURL("image/jpeg", 0.5);
                        wsRef.current.send(base64Frame);
                    }
                }
                setTimeout(() => {
                    animationFrameId = requestAnimationFrame(sendFrame);
                }, 100);
            };

            wsRef.current.onopen = () => {
                sendFrame();
            };
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (wsRef.current) wsRef.current.close();
        };
    }, [stream]);

    const renderBoxes = () => {
        if (!videoRef.current) return null;
        const video = videoRef.current;
        const scaleX = video.clientWidth / video.videoWidth;
        const scaleY = video.clientHeight / video.videoHeight;

        return detectedFaces.map((face, index) => {
            const { x, y, w, h } = face.box;
            return (
                <div
                    key={index}
                    className="face-bounding-box"
                    style={{
                        position: 'absolute',
                        left: `${x * scaleX}px`,
                        top: `${y * scaleY}px`,
                        width: `${w * scaleX}px`,
                        height: `${h * scaleY}px`
                    }}
                >
                    <span className="emotion-tag dominant">
                        {face.emotion || 'Neutral'}
                    </span>
                </div>
            );
        });
    };

    return (
        <div className="app-container emotion-app">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back">
                    <ArrowLeft size={20} />
                </button>
            )}
            <div className="camera-feed-mock emotion-feed">
                {isInitializing && <p>Requesting global camera access...</p>}
                {cameraError && (
                    <div style={{ position: 'absolute', zIndex: 50, top: '10%' }}>
                        <CameraDiagnosticAgent error={cameraError} onRetry={requestCamera} />
                    </div>
                )}

                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="real-camera-video"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: stream && !cameraError ? 'block' : 'none' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {stream && !cameraError && detectedFaces.length > 0 && renderBoxes()}
            </div>
            <div className="app-sidebar">
                <h4>Emotion Analysis</h4>
                <div className="emotion-bars">
                    <div className="metric">
                        <span>Joy</span>
                        <div className="bar"><div className="fill" style={{ width: '87%', background: '#00ffcc' }}></div></div>
                    </div>
                    <div className="metric">
                        <span>Neutral</span>
                        <div className="bar"><div className="fill" style={{ width: '10%' }}></div></div>
                    </div>
                    <div className="metric">
                        <span>Sadness</span>
                        <div className="bar"><div className="fill" style={{ width: '2%' }}></div></div>
                    </div>
                    <div className="metric">
                        <span>Anger</span>
                        <div className="bar"><div className="fill" style={{ width: '1%' }}></div></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmotionApp;
