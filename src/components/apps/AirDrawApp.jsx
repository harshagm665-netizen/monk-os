import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Pencil, Highlighter, Eraser, Trash2, ArrowLeft, RefreshCw } from 'lucide-react';
import { useCamera } from '../../context/CameraContext';
import CameraDiagnosticAgent from '../CameraDiagnosticAgent';
import './AirDraw.css';

const COLORS = ['#00ffcc', '#ff3366', '#ffff00', '#00ccff', '#ffffff', '#ffaa00'];

const AirDrawApp = ({ onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const uiCanvasRef = useRef(null);
    const cursorRef = useRef(null);

    const { stream, cameraError, requestCamera, releaseCamera } = useCamera();

    const [isLoading, setIsLoading] = useState(true);
    const [activeTool, setActiveTool] = useState('pen'); // 'pen', 'pencil', 'marker', 'eraser'
    const [activeColor, setActiveColor] = useState('#00ffcc');
    const [strokeWidth, setStrokeWidth] = useState(8);

    // Diagnostic Agent State
    const [debugInfo, setDebugInfo] = useState({ x: 0, y: 0, el: 'none', isHoveringBtn: false, handDetected: false, pinchDist: 1.0, engineStatus: 'Initializing...' });

    // State to hold Refs purely so we don't have to put them in the dependency array of the drawing loop
    const stateRef = useRef({
        tool: 'pen',
        color: '#00ffcc',
        width: 8,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        wasPinching: false,
        lastHovered: null,
        frameCount: 0,
        lostFrames: 0
    });

    // Sync React state to Mutable Ref for the MediaPipe loop
    useEffect(() => {
        stateRef.current = { ...stateRef.current, tool: activeTool, color: activeColor, width: strokeWidth };
    }, [activeTool, activeColor, strokeWidth]);

    // Request camera on mount, release on unmount
    useEffect(() => {
        requestCamera();
        return () => releaseCamera();
    }, []);

    // ── Bind Global Camera Stream ──
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Video play interrupted:", e));
        }
    }, [stream]);

    // Initialize MediaPipe AI Hand Tracking
    useEffect(() => {
        if (!window.Hands) {
            setDebugInfo(prev => ({ ...prev, engineStatus: 'CDN Script Blocked or Missing' }));
            console.error("MediaPipe Hands JS not loaded from CDN.");
            return;
        }

        const hands = new window.Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1, // Only track one hand for drawing
            modelComplexity: 0, // Lite model is faster and often better at finding noisy/low-light silhouettes
            minDetectionConfidence: 0.2, // Extreme low-light tolerance
            minTrackingConfidence: 0.2
        });

        hands.onResults(onResults);

        let animationFrameId;
        const processCanvas = document.createElement('canvas');
        const processCtx = processCanvas.getContext('2d', { willReadFrequently: true });

        const predictWebcam = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                    // Make sure the browser actually has video dimensions available
                    // Feeding a 0-width canvas into WASM causes an immediate memory out-of-bounds crash
                    if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                        // --- NIGHT VISION PIPELINE ---
                        if (processCanvas.width !== videoRef.current.videoWidth) {
                            processCanvas.width = videoRef.current.videoWidth;
                            processCanvas.height = videoRef.current.videoHeight;
                        }

                        processCtx.filter = 'brightness(180%) contrast(150%)';
                        processCtx.drawImage(videoRef.current, 0, 0, processCanvas.width, processCanvas.height);

                        await hands.send({ image: processCanvas });
                    }
                } catch (err) {
                    console.error("MediaPipe prediction error:", err);
                    setDebugInfo(prev => ({
                        ...prev,
                        engineStatus: `Crashed: ${err.message || 'Unknown WASM Error'}`
                    }));
                }
            }
            animationFrameId = requestAnimationFrame(predictWebcam);
        };

        if (stream && videoRef.current) {
            const startPredicting = () => {
                setIsLoading(false);
                predictWebcam();
            };

            if (videoRef.current.readyState >= 2) {
                startPredicting();
            } else {
                videoRef.current.onloadeddata = startPredicting;
            }
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            hands.close();
        };
    }, [stream]);

    // Canvas dimensions are now synchronized strictly within the onResults frame loop
    // to prevent 0x0 race conditions during camera load.


    const onResults = (results) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const uiCanvas = uiCanvasRef.current;
        const uiCtx = uiCanvas?.getContext('2d');
        const cursor = cursorRef.current;
        const state = stateRef.current;

        if (!canvas || !ctx || !uiCanvas || !uiCtx || !cursor) return;

        // Synchronize Canvas Native Dimensions with Hardware Video Stream dynamically.
        // Doing this here guarantees videoWidth is populated, solving the 0x0 invisible canvas bug.
        if (videoRef.current && canvas.width !== videoRef.current.videoWidth && videoRef.current.videoWidth > 0) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            uiCanvas.width = videoRef.current.videoWidth;
            uiCanvas.height = videoRef.current.videoHeight;
        }

        const w = canvas.width;
        const h = canvas.height;

        // Clear UI Canvas (landmarks)
        uiCtx.clearRect(0, 0, w, h);

        // If onResults fires, the engine is successfully running and processing frames
        if (state.frameCount % 10 === 0) {
            setDebugInfo(prev => ({ ...prev, engineStatus: 'Running ✅' }));
        }

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            state.lostFrames = 0; // Reset visual dropout debounce

            const landmarks = results.multiHandLandmarks[0];

            // Draw Hand Landmarks on the UI Canvas
            uiCtx.save();
            for (let i = 0; i < landmarks.length; i++) {
                const pt = landmarks[i];
                uiCtx.beginPath();
                uiCtx.arc(pt.x * w, pt.y * h, 3, 0, 2 * Math.PI);
                uiCtx.fillStyle = (i === 8 || i === 4) ? '#ff3366' : '#00ffcc';
                uiCtx.fill();
            }
            uiCtx.restore();

            // Get Index Finger Tip (Landmark 8) and Thumb Tip (Landmark 4)
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];

            // 1:1 Coordinates! CSS object-fit and scaleX(-1) handle mirroring natively now.
            const ix = indexTip.x * w;
            const iy = indexTip.y * h;

            // Absolute positioning for the DOM hover cursor (Still needs inverted X)
            cursor.style.left = `${(1 - indexTip.x) * 100}%`;
            cursor.style.top = `${indexTip.y * 100}%`;
            cursor.style.display = 'block';

            // Calculate Euclidean distance between Thumb and Index (Pinch logic)
            const dx = indexTip.x - thumbTip.x;
            const dy = indexTip.y - thumbTip.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // HYSTERESIS: Require a tight pinch to start, but allow it to loosen while dragging 
            // without breaking the stroke line. This makes drawing MUCH smoother.
            const PINCH_START = 0.08;
            const PINCH_STOP = 0.12;
            let isPinching = false;
            if (state.wasPinching) {
                isPinching = distance < PINCH_STOP;
            } else {
                isPinching = distance < PINCH_START;
            }

            // Calculate absolute window coordinates of the cursor mathematically against the CONTAINER
            // This ensures it works perfectly even if Monk OS is rendering the app in a dragged window
            const container = canvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            const hitX = containerRect.left + (1 - indexTip.x) * containerRect.width;
            const hitY = containerRect.top + indexTip.y * containerRect.height;

            // Cursor has pointer-events: none natively, so it drops through
            const hitElement = document.elementFromPoint(hitX, hitY);

            // --- AIR HOVER: Visual Feedback ---
            let hoveredBtn = null;
            if (hitElement) {
                hoveredBtn = hitElement.closest('button, input, .ad-color-btn, .app-internal-back-btn');
            }

            // DEBUG STATE SYNC (Stable throttled update)
            state.frameCount += 1;
            if (state.frameCount % 5 === 0) {
                setDebugInfo({
                    x: Math.round(hitX),
                    y: Math.round(hitY),
                    el: hitElement ? (hitElement.className || hitElement.tagName) : 'none',
                    isHoveringBtn: !!hoveredBtn,
                    handDetected: true,
                    pinchDist: distance.toFixed(3)
                });
            }

            if (state.lastHovered && state.lastHovered !== hoveredBtn) {
                state.lastHovered.classList.remove('ad-air-hover');
            }
            if (hoveredBtn && state.lastHovered !== hoveredBtn) {
                hoveredBtn.classList.add('ad-air-hover');
            }
            state.lastHovered = hoveredBtn;

            // --- AIR TAP: Hit Action ---
            if (isPinching && !state.wasPinching) {
                if (hoveredBtn) {
                    // Dispatch a fully bubbled native event to trigger React's onClick
                    hoveredBtn.dispatchEvent(new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    }));

                    // Visual feedback for the Air Tap (Press down effect)
                    const oldStyle = hoveredBtn.style.transform;
                    hoveredBtn.style.transform = 'scale(0.85)';
                    setTimeout(() => hoveredBtn.style.transform = oldStyle, 150);

                    state.wasPinching = true;
                    return; // Stop processing this frame so we don't accidentally draw a stroke
                }
            }
            state.wasPinching = isPinching;

            // Draw Pinch connection line
            if (isPinching) {
                uiCtx.beginPath();
                uiCtx.moveTo(thumbTip.x * w, thumbTip.y * h);
                uiCtx.lineTo(indexTip.x * w, indexTip.y * h);
                uiCtx.strokeStyle = '#ff3366';
                uiCtx.lineWidth = 2;
                uiCtx.stroke();
            }

            if (isPinching) {
                cursor.classList.add('drawing');
                // Use active color for cursor if not erasing
                cursor.style.backgroundColor = state.tool === 'eraser' ? 'rgba(255,255,255,0.5)' : state.color;
                cursor.style.borderColor = state.tool === 'eraser' ? '#fff' : state.color;

                if (!state.isDrawing) {
                    // Start new stroke
                    state.isDrawing = true;
                    ctx.beginPath();
                    ctx.moveTo(ix, iy);
                } else {
                    // Stroke Continuation
                    ctx.lineTo(ix, iy);

                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    if (state.tool === 'eraser') {
                        ctx.globalCompositeOperation = 'destination-out';
                        ctx.lineWidth = state.width * 5; // Eraser is bigger
                        ctx.strokeStyle = 'rgba(0,0,0,1)';
                    } else {
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = state.color;
                        ctx.lineWidth = state.width;

                        // Tool styles
                        if (state.tool === 'marker') {
                            ctx.globalAlpha = 0.3; // Transparent overlay
                            ctx.lineWidth = state.width * 2;
                        } else if (state.tool === 'pencil') {
                            ctx.globalAlpha = 0.8;
                        } else {
                            // Pen (Neon glow)
                            ctx.globalAlpha = 1.0;
                            ctx.shadowBlur = Math.max(10, state.width);
                            ctx.shadowColor = state.color;
                        }
                    }

                    ctx.stroke();

                    // Reset global states
                    ctx.shadowBlur = 0;
                    ctx.globalAlpha = 1.0;
                    ctx.globalCompositeOperation = 'source-over';
                }
            } else {
                cursor.classList.remove('drawing');
                cursor.style.backgroundColor = 'transparent';
                cursor.style.borderColor = 'rgba(255,255,255,0.6)';

                if (state.isDrawing) {
                    state.isDrawing = false;
                    ctx.closePath();
                }
            }

            state.lastX = ix;
            state.lastY = iy;

        } else {
            // DEBOUNCE AI DROP-OUTS
            // The AI might lose tracking for 1 or 2 frames in bad lighting. 
            // We wait 5 frames (approx 150ms) before officially ending the stroke to prevent broken lines.
            state.lostFrames = (state.lostFrames || 0) + 1;

            if (state.lostFrames > 5) {
                if (state.isDrawing) {
                    state.isDrawing = false;
                    ctx.closePath();
                }

                state.frameCount += 1;
                if (state.frameCount % 10 === 0) {
                    setDebugInfo(prev => ({ ...prev, handDetected: false }));
                }
            }
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    return (
        <div className="app-container air-draw-container">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back" style={{ zIndex: 100 }}>
                    <ArrowLeft size={20} />
                </button>
            )}

            {cameraError && (
                <div style={{ position: 'absolute', zIndex: 50 }}>
                    <CameraDiagnosticAgent error={cameraError} onRetry={requestCamera} />
                </div>
            )}

            {isLoading && !cameraError && (
                <div className="ad-loading">
                    <RefreshCw size={40} className="spin" />
                    <p>Initializing MediaPipe Hands...</p>
                </div>
            )}

            {/* Video Input overlaying the background */}
            <video
                ref={videoRef}
                className="ad-video-feed"
                autoPlay
                playsInline
                muted
            />

            {/* The transparent drawing canvas overlay */}
            <canvas ref={canvasRef} className="ad-canvas" />

            {/* The UI Overlay for Hand Landmarks */}
            <canvas ref={uiCanvasRef} className="ad-canvas" style={{ zIndex: 3 }} />

            {/* Simulated Mouse Cursor for Finger Tip */}
            <div ref={cursorRef} className="ad-cursor" style={{ display: 'none' }}></div>

            {/* Diagnostic Agent Overlay */}
            <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.85)', color: '#00ffcc', padding: '15px', borderRadius: '10px', zIndex: 100, fontFamily: 'monospace', fontSize: '12px', border: '1px solid #ff3366', boxShadow: '0 4px 15px rgba(255,51,102,0.3)', pointerEvents: 'none' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#ff3366', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Diagnostics</h4>
                <div style={{ marginBottom: 4 }}><strong>AI Engine:</strong> {debugInfo.engineStatus === 'Running ✅' ? <span style={{ color: '#00ffcc' }}>{debugInfo.engineStatus}</span> : <span style={{ color: '#ffaa00' }}>{debugInfo.engineStatus}</span>}</div>
                <div style={{ marginBottom: 6, fontSize: '14px', fontWeight: 'bold' }}>
                    <strong>Hand Detected:</strong> {debugInfo.handDetected ? <span style={{ color: '#00ffcc' }}>✅ YES</span> : <span style={{ color: '#ff3366' }}>❌ NO HAND VISIBLE</span>}
                </div>
                <div style={{ marginBottom: 4 }}><strong>Raw X:</strong> {debugInfo.x}px</div>
                <div style={{ marginBottom: 4 }}><strong>Raw Y:</strong> {debugInfo.y}px</div>
                <div style={{ marginBottom: 4 }}><strong>Hit Element:</strong> <span style={{ color: '#fff' }}>{debugInfo.el}</span></div>
                <div style={{ marginBottom: 4 }}><strong>Hovering Button:</strong> {debugInfo.isHoveringBtn ? '✅ YES' : '❌ NO'}</div>
                <div style={{ marginBottom: 4 }}>
                    <strong>Pinch Distance:</strong> {debugInfo.pinchDist}
                    <span style={{ fontSize: '10px', color: '#888', marginLeft: 5 }}>(Need &lt; 0.060)</span>
                </div>
                <div style={{ marginBottom: 4 }}><strong>Pinch Target:</strong> {stateRef.current.wasPinching ? '🔴 CLICKED!' : '🟢 OPEN'}</div>

                {!debugInfo.handDetected && (
                    <div style={{ marginTop: 10, fontSize: '11px', color: '#ffaa00', maxWidth: 220, lineHeight: 1.4, borderTop: '1px solid #333', paddingTop: 8 }}>
                        ⚠️ The AI cannot see your hand! Please ensure your hand is fully in the camera frame and the room is well-lit.
                    </div>
                )}
            </div>

            {/* Dual Modern Floating Sidebars */}
            <div className="ad-sidebar left">
                <button
                    className="ad-tool-btn clear-btn"
                    onClick={clearCanvas}
                    title="Clear Canvas"
                >
                    <Trash2 size={24} />
                </button>
                <div className="sidebar-divider" />
                <button
                    className={`ad-tool-btn ${activeTool === 'pen' ? 'active' : ''}`}
                    onClick={() => setActiveTool('pen')}
                    title="Neon Pen"
                >
                    <PenTool size={20} />
                </button>
                <button
                    className={`ad-tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
                    onClick={() => setActiveTool('pencil')}
                    title="Solid Pencil"
                >
                    <Pencil size={20} />
                </button>
                <button
                    className={`ad-tool-btn ${activeTool === 'marker' ? 'active' : ''}`}
                    onClick={() => setActiveTool('marker')}
                    title="Highlighter Marker"
                >
                    <Highlighter size={20} />
                </button>
                <button
                    className={`ad-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                    onClick={() => setActiveTool('eraser')}
                    title="Eraser"
                >
                    <Eraser size={20} />
                </button>
                <div className="sidebar-divider" />
                <input
                    type="range"
                    className="ad-size-slider vertical"
                    min="2"
                    max="40"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                    title="Brush Size"
                />
            </div>

            <div className="ad-sidebar right">
                {COLORS.map(color => (
                    <div
                        key={color}
                        className={`ad-color-btn ${activeColor === color ? 'active' : ''}`}
                        style={{ backgroundColor: color, color: color }}
                        onClick={() => {
                            setActiveColor(color);
                            if (activeTool === 'eraser') setActiveTool('pen');
                        }}
                        title={color}
                    />
                ))}
            </div>
        </div>
    );
};

export default AirDrawApp;
