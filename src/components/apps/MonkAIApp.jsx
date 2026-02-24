import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import './Apps.css';

const MonkAIApp = () => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');

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
        <div className="app-container monk-ai-app">
            <div className="voice-visualizer">
                <div className={`orb ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                    <Volume2 size={40} className="orb-icon" />
                </div>
                <div className="waves">
                    <div className={`wave ${isListening || isSpeaking ? 'active' : ''}`} style={{ animationDelay: '0s' }}></div>
                    <div className={`wave ${isListening || isSpeaking ? 'active' : ''}`} style={{ animationDelay: '0.2s' }}></div>
                    <div className={`wave ${isListening || isSpeaking ? 'active' : ''}`} style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>

            <div className="transcript-box">
                <p>{transcript || "System Idle. Tap microphone to speak."}</p>
            </div>

            <div className="controls">
                <button className={`mic-btn ${isListening ? 'active' : ''}`} onClick={handleToggleMic}>
                    {isListening ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
            </div>
        </div>
    );
};

export default MonkAIApp;
