import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, ArrowLeft } from 'lucide-react';
import './Apps.css';

const MonkAIApp = ({ onClose }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // Added for the new class

    // Simulate conversation flow
    const handleToggleMic = () => {
        if (!isListening) {
            setIsListening(true);
            setTranscript("Listening...");
            setTimeout(() => {
                setTranscript("How can I assist you today?");
                setIsListening(false);
                setIsSpeaking(true);
                setTimeout(() => setIsSpeaking(false), 3000);
            }, 2000);
        } else {
            setIsListening(false);
        }
    };

    return (
        <div className="app-container ai-agent">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back">
                    <ArrowLeft size={20} />
                </button>
            )}

            <div className={`ai - orb - container ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} `}>
                <div className={`orb ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} `}>
                    <Volume2 size={40} className="orb-icon" />
                </div>
                <div className="waves">
                    <div className={`wave ${isListening || isSpeaking ? 'active' : ''} `} style={{ animationDelay: '0s' }}></div>
                    <div className={`wave ${isListening || isSpeaking ? 'active' : ''} `} style={{ animationDelay: '0.2s' }}></div>
                    <div className={`wave ${isListening || isSpeaking ? 'active' : ''} `} style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>

            <div className="transcript-box">
                <p>{transcript || "System Idle. Tap microphone to speak."}</p>
            </div>

            <div className="controls">
                <button className={`mic - btn ${isListening ? 'active' : ''} `} onClick={handleToggleMic}>
                    {isListening ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
            </div>
        </div>
    );
};

export default MonkAIApp;
