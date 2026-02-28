import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Volume2, ArrowLeft, Brain, BookOpen, Play } from 'lucide-react';
import { useCamera } from '../../context/CameraContext';
import CameraDiagnosticAgent from '../CameraDiagnosticAgent';
import './MathWizard.css';

const BACKEND_URL = `http://${window.location.hostname}:8000`;

const MathWizardApp = ({ onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { stream, cameraError, requestCamera, releaseCamera } = useCamera();

    const [mode, setMode] = useState('scan'); // 'scan' or 'quiz'
    const [quizQuestion, setQuizQuestion] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [isThinking, setIsThinking] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);

    // Stop speaking when unmounted
    useEffect(() => {
        return () => window.speechSynthesis.cancel();
    }, []);

    // Request camera on mount, release on unmount
    useEffect(() => {
        requestCamera();
        return () => releaseCamera();
    }, []);

    // ── Bind Global Camera Stream ──
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const playVoice = (text) => {
        window.speechSynthesis.cancel();
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);

            // Try to find a friendly female voice for the "Teacher" persona
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha'));
            if (femaleVoice) utterance.voice = femaleVoice;

            utterance.pitch = 1.2;
            utterance.rate = 0.95;
            window.speechSynthesis.speak(utterance);
        }
    };

    const generateQuiz = async () => {
        setIsGenerating(true);
        setFeedback(null);
        setCapturedImage(null);
        window.speechSynthesis.cancel();

        try {
            const res = await fetch(`${BACKEND_URL}/api/math-wizard/generate-quiz`);
            if (!res.ok) throw new Error("Backend failed to generate quiz.");
            const data = await res.json();

            setQuizQuestion(data.question);
            playVoice(`Please write down the answer to: ${data.question}, and hold it up to the camera!`);
        } catch (err) {
            console.error(err);
            setQuizQuestion("Failed to connect to the Math Engine. Are you offline?");
        } finally {
            setIsGenerating(false);
        }
    };

    const captureAndGrade = async () => {
        if (!videoRef.current) return;

        window.speechSynthesis.cancel();
        setIsThinking(true);
        setFeedback(null);

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Capture frame as JPEG
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);

        try {
            // Convert Base64 back to Blob to match FastAPI UploadFile format
            const res = await fetch(imageData);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append('file', blob, 'math_problem.jpg');

            if (mode === 'quiz' && quizQuestion) {
                formData.append('expected_question', quizQuestion);
            }

            const response = await fetch(`${BACKEND_URL}/api/math-wizard/evaluate`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Backend connection failed.");

            const data = await response.json();
            setFeedback(data.feedback);
            playVoice(data.feedback); // Read the grading aloud!

        } catch (err) {
            console.error("Grading error:", err);
            setFeedback("Oops! The magic grading engine hit a snag. Try again.");
        } finally {
            setIsThinking(false);
        }
    };

    const resetScanner = () => {
        setCapturedImage(null);
        setFeedback(null);
        window.speechSynthesis.cancel();
        if (mode === 'quiz') {
            setQuizQuestion(null); // Force user to click "Next Question"
        }
    };

    return (
        <div className="math-wizard-container">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back">
                    <ArrowLeft size={20} />
                </button>
            )}

            <div className="mw-header">
                <h2>Math Wizard 🧮</h2>

                {/* Mode Toggle */}
                <div className="mw-mode-toggle">
                    <button
                        className={mode === 'scan' ? 'active' : ''}
                        onClick={() => { setMode('scan'); resetScanner(); }}
                    >
                        <Camera size={14} /> Free Scan
                    </button>
                    <button
                        className={mode === 'quiz' ? 'active' : ''}
                        onClick={() => { setMode('quiz'); resetScanner(); }}
                    >
                        <Brain size={14} /> Quiz Agent
                    </button>
                </div>

                {mode === 'scan' && <p>Hold your handwritten math problem up to the camera!</p>}
            </div>

            {mode === 'quiz' && (
                <div className="mw-quiz-banner">
                    {!quizQuestion ? (
                        <button className="mw-magic-btn" onClick={generateQuiz} disabled={isGenerating}>
                            {isGenerating ? <><RefreshCw className="spin" size={16} /> Spawning Equation...</> : <><Play size={16} /> Generate Question</>}
                        </button>
                    ) : (
                        <div className="mw-active-question">
                            <h3>{quizQuestion}</h3>
                            <p>Write the answer and show the camera!</p>
                        </div>
                    )}
                </div>
            )}

            <div className="mw-camera-stage">
                {cameraError && <CameraDiagnosticAgent error={cameraError} onRetry={requestCamera} />}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`mw-video-feed ${capturedImage ? 'hidden' : ''}`}
                    style={{ display: stream && !cameraError && !capturedImage ? 'block' : 'none' }}
                />

                {capturedImage && (
                    <img src={capturedImage} alt="Captured Math" className="mw-captured-image" />
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Cyberpunk Scanning Overlay Animation */}
                {isThinking && <div className="mw-scanner-line"></div>}
            </div>

            <div className="mw-controls">
                {!capturedImage ? (
                    <button
                        className="mw-magic-btn capture-mode"
                        onClick={captureAndGrade}
                        disabled={!stream || cameraError || isThinking || (mode === 'quiz' && !quizQuestion)}
                    >
                        {isThinking ? (
                            <><RefreshCw className="spin" /> Analyzing...</>
                        ) : (
                            <><Camera /> {mode === 'quiz' ? 'Submit Answer' : 'Grade My Work!'}</>
                        )}
                    </button>
                ) : (
                    <button className="mw-magic-btn retry-mode" onClick={resetScanner}>
                        <RefreshCw /> {mode === 'quiz' ? 'Next Question' : 'Scan Another Problem'}
                    </button>
                )}
            </div>

            {feedback && (
                <div className="mw-feedback-panel scale-up">
                    <div className="mw-teacher-icon">👩‍🏫</div>
                    <div className="mw-feedback-text">
                        {feedback}
                        <button className="mw-tts-btn margin-left" onClick={() => playVoice(feedback)} title="Read Aloud Again">
                            <Volume2 size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MathWizardApp;
