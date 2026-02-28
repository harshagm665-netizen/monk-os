import React, { useState } from 'react';
import { Settings, Maximize, Cpu, Zap, ScanFace, Smile, Mic, FileQuestion, Wand2, Gamepad2, Calculator, Timer, Palette, Bot, Smartphone, Music, Folder } from 'lucide-react';
import Window from '../components/Window';
import FaceRecApp from '../components/apps/FaceRecApp';
import EmotionApp from '../components/apps/EmotionApp';
import MonkAIApp from '../components/apps/MonkAIApp';
import MultimodalApp from '../components/apps/MultimodalApp';
import SmartKillerApp from '../components/apps/SmartKillerApp';
import TicTacToeApp from '../components/apps/TicTacToeApp';
import MathWizardApp from '../components/apps/MathWizardApp';
import FocusTimerApp from '../components/apps/FocusTimerApp';
import AirDrawApp from '../components/apps/AirDrawApp';
import RobotControlApp from '../components/apps/RobotControlApp';
import MobileSetupApp from '../components/apps/MobileSetupApp';
import RhymesApp from '../components/apps/RhymesApp';
import MyFilesApp from '../components/apps/MyFilesApp';
import './HomeScreen.css';

const HomeScreen = () => {
    const [openApps, setOpenApps] = useState({
        faceRec: false,
        emotion: false,
        monkAi: false,
        multimodal: false,
        smartKiller: false,
        ticTacToe: false,
        mathWizard: false,
        focusTimer: false,
        airDraw: false,
        robotControl: false,
        mobileSetup: false,
        rhymes: false,
        myFiles: false
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
                <div className="app-icon" onClick={() => toggleApp('ticTacToe')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(0, 255, 204, 0.4)', color: '#00ffcc' }}>
                        <Gamepad2 size={32} />
                    </div>
                    <span>Tic Tac Toe</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('mathWizard')}>
                    <div className="icon-wrapper wand">
                        <Calculator size={32} />
                    </div>
                    <span>Math Wizard</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('focusTimer')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(255, 204, 0, 0.4)', color: '#ffcc00' }}>
                        <Timer size={32} />
                    </div>
                    <span>Focus Timer</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('airDraw')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(255, 51, 102, 0.4)', color: '#ff3366' }}>
                        <Palette size={32} />
                    </div>
                    <span>Air Draw</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('robotControl')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(0, 255, 204, 0.4)', color: '#00ffcc', boxShadow: '0 0 15px rgba(0, 255, 204, 0.3)' }}>
                        <Bot size={32} />
                    </div>
                    <span>Robot OS</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('mobileSetup')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}>
                        <Smartphone size={32} />
                    </div>
                    <span>Mobile Sync</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('rhymes')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(255, 215, 0, 0.4)', color: '#ffd700', boxShadow: '0 0 15px rgba(255, 215, 0, 0.2)' }}>
                        <Music size={32} />
                    </div>
                    <span>Interactive Rhymes</span>
                </div>
                <div className="app-icon" onClick={() => toggleApp('myFiles')}>
                    <div className="icon-wrapper" style={{ borderColor: 'rgba(59, 130, 246, 0.4)', color: '#3b82f6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)' }}>
                        <Folder size={32} />
                    </div>
                    <span>My Files</span>
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
                <MonkAIApp onClose={() => toggleApp('monkAi')} />
            </Window>

            <Window
                title="Multimodal Engine (Image/Docs)"
                isOpen={openApps.multimodal}
                onClose={() => toggleApp('multimodal')}
                icon={FileQuestion}
                width={800} height={500}
            >
                <MultimodalApp onClose={() => toggleApp('multimodal')} />
            </Window>

            <Window
                title="Smart Killer AI (Gemini Learning Mode)"
                isOpen={openApps.smartKiller}
                onClose={() => toggleApp('smartKiller')}
                icon={Wand2}
                width={800} height={500}
            >
                <SmartKillerApp onClose={() => toggleApp('smartKiller')} />
            </Window>

            <Window
                title="Tic-Tac-Toe AI"
                isOpen={openApps.ticTacToe}
                onClose={() => toggleApp('ticTacToe')}
                icon={Gamepad2}
                width={450} height={600}
            >
                <TicTacToeApp onClose={() => toggleApp('ticTacToe')} />
            </Window>

            <Window
                title="Math Wizard (Vision AI)"
                isOpen={openApps.mathWizard}
                onClose={() => toggleApp('mathWizard')}
                icon={Calculator}
                width={700} height={550}
            >
                <MathWizardApp onClose={() => toggleApp('mathWizard')} />
            </Window>

            <Window
                title="Focus Timer (Face Tracked)"
                isOpen={openApps.focusTimer}
                onClose={() => toggleApp('focusTimer')}
                icon={Timer}
                width={400} height={500}
            >
                <FocusTimerApp onClose={() => toggleApp('focusTimer')} />
            </Window>

            <Window
                title="Air Draw (AI Hand Tracking)"
                isOpen={openApps.airDraw}
                onClose={() => toggleApp('airDraw')}
                icon={Palette}
                width={800} height={600}
            >
                <AirDrawApp onClose={() => toggleApp('airDraw')} />
            </Window>

            <Window
                title="Monk Robot Link (Kinematics)"
                isOpen={openApps.robotControl}
                onClose={() => toggleApp('robotControl')}
                icon={Bot}
                width={750} height={550}
            >
                <RobotControlApp onClose={() => toggleApp('robotControl')} />
            </Window>

            <Window
                title="Monk Mobile Setup & Sync"
                isOpen={openApps.mobileSetup}
                onClose={() => toggleApp('mobileSetup')}
                icon={Smartphone}
                width={700} height={450}
            >
                <MobileSetupApp onClose={() => toggleApp('mobileSetup')} />
            </Window>

            <Window
                title="Interactive Video Rhymes"
                isOpen={openApps.rhymes}
                onClose={() => toggleApp('rhymes')}
                icon={Music}
                width={900} height={600}
            >
                <RhymesApp onClose={() => toggleApp('rhymes')} />
            </Window>

            <Window
                title="Monk OS Native File Explorer"
                isOpen={openApps.myFiles}
                onClose={() => toggleApp('myFiles')}
                icon={Folder}
                width={850} height={600}
            >
                <MyFilesApp onClose={() => toggleApp('myFiles')} />
            </Window>

            {/* Background Ambience */}
            <div className="cyber-grid"></div>
        </div>
    );
};

export default HomeScreen;
