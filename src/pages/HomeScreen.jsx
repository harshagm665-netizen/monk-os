import React, { useState } from 'react';
import { Settings, Maximize, Cpu, Zap, ScanFace, Smile, Mic, FileQuestion, Wand2 } from 'lucide-react';
import Window from '../components/Window';
import FaceRecApp from '../components/apps/FaceRecApp';
import EmotionApp from '../components/apps/EmotionApp';
import MonkAIApp from '../components/apps/MonkAIApp';
import MultimodalApp from '../components/apps/MultimodalApp';
import SmartKillerApp from '../components/apps/SmartKillerApp';
import './HomeScreen.css';

const HomeScreen = () => {
    const [openApps, setOpenApps] = useState({
        faceRec: false,
        emotion: false,
        monkAi: false,
        multimodal: false,
        smartKiller: false
    });

    const toggleApp = (appKey) => {
        setOpenApps(prev => ({ ...prev, [appKey]: !prev[appKey] }));
    };

    return (
        <div className="home-container desktop-mode">
            {/* Top Status Bar (unchanged) */}
            <header className="os-topbar">
                <div className="topbar-left">
                    <Cpu className="status-icon active" size={16} />
                    <span className="os-version">Monk OS v3.0 (Advanced)</span>
                </div>
                <div className="topbar-center">
                    <span className="time-display">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="topbar-right">
                    <Zap className="status-icon warn" size={16} />
                    <Settings className="action-icon" size={16} />
                    <Maximize className="action-icon" size={16} />
                </div>
            </header>

            {/* Main Desktop Area */}
            <main className="desktop-grid">
                {/* App Icons */}
                <div className="app-icon" onClick={() => toggleApp('faceRec')}>
                    <div className="icon-wrapper"><ScanFace size={32} /></div>
                    <span>Face Registry</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('emotion')}>
                    <div className="icon-wrapper"><Smile size={32} /></div>
                    <span>Emotion Engine</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('monkAi')}>
                    <div className="icon-wrapper core"><Mic size={32} /></div>
                    <span>Monk AI Voice</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('multimodal')}>
                    <div className="icon-wrapper"><FileQuestion size={32} /></div>
                    <span>Multimodal RAG</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('smartKiller')}>
                    <div className="icon-wrapper wand"><Wand2 size={32} /></div>
                    <span>Smart Killer AI</span>
                </div>
            </main>

            {/* OS Windows Rendering */}
            <Window
                title="Face Recognition Registry"
                isOpen={openApps.faceRec}
                onClose={() => toggleApp('faceRec')}
                icon={ScanFace}
                width={700} height={450}
            >
                <FaceRecApp />
            </Window>

            <Window
                title="Real-Time Emotion Detection"
                isOpen={openApps.emotion}
                onClose={() => toggleApp('emotion')}
                icon={Smile}
                width={700} height={450}
            >
                <EmotionApp />
            </Window>

            <Window
                title="Monk AI - Voice Interface"
                isOpen={openApps.monkAi}
                onClose={() => toggleApp('monkAi')}
                icon={Mic}
                width={500} height={600}
            >
                <MonkAIApp />
            </Window>

            <Window
                title="Multimodal Engine (Image/Docs)"
                isOpen={openApps.multimodal}
                onClose={() => toggleApp('multimodal')}
                icon={FileQuestion}
                width={800} height={500}
            >
                <MultimodalApp />
            </Window>

            <Window
                title="Smart Killer AI (Gemini Learning Mode)"
                isOpen={openApps.smartKiller}
                onClose={() => toggleApp('smartKiller')}
                icon={Wand2}
                width={800} height={500}
            >
                <SmartKillerApp />
            </Window>

            {/* Background Ambience */}
            <div className="cyber-grid"></div>
        </div>
    );
};

export default HomeScreen;
