import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Power, Terminal } from 'lucide-react';
import './BootScreen.css';

const BootScreen = () => {
  const navigate = useNavigate();
  const [bootState, setBootState] = useState('initial'); // initial -> loading -> video -> complete
  const [logs, setLogs] = useState([]);
  const videoRef = useRef(null);

  const bootLogs = [
    "BIOS Date 02/20/26 23:54 Ver 3.14.15",
    "Hardware: Raspberry Pi 5 (Broadcom BCM2712 Cortex-A76)",
    "Memory: 8192M LPDDR4X-4267 SDRAM [Allocating Neural Buffer...]",
    "Initializing Monk OS Quantum Kernel...",
    "[ OK ] Mounted Cortex File System",
    "[ OK ] Started Advanced Cryptography Module",
    "[ OK ] Engaged Piper Neural Voice Synthesizer",
    "[ OK ] Loaded Ollama Vector Memory Banks",
    "Warning: High Cognitive Load Detected...",
    "Bypassing safety limiters for maximum throughput...",
    "System Ready. Awakening Monk Entity..."
  ];

  useEffect(() => {
    if (bootState === 'loading') {
      let logIndex = 0;
      const interval = setInterval(() => {
        if (logIndex < bootLogs.length) {
          setLogs(prev => [...prev, bootLogs[logIndex]]);
          logIndex++;
        } else {
          clearInterval(interval);
          setTimeout(() => setBootState('video'), 2500); // Wait longer on the cool loading screen
        }
      }, 400); // Slightly slower to read the cool text

      return () => clearInterval(interval);
    }
  }, [bootState]);

  const handlePowerOn = () => {
    setBootState('loading');
  };

  const handleVideoEnded = () => {
    setBootState('complete');
  };

  const handleNext = () => {
    navigate('/welcome');
  };


  return (
    <div className="boot-container">
      {bootState === 'initial' && (
        <div className="power-btn-wrapper">
          <button className="power-btn" onClick={handlePowerOn}>
            <Power size={48} />
          </button>
          <div className="power-label">POWER ON</div>
        </div>
      )}

      {bootState === 'loading' && (
        <div className="loading-screen-complex">
          <div className="terminal-screen">
            <Terminal size={24} className="terminal-icon" />
            <div className="logs">
              {logs.map((log, index) => (
                <div key={index} className="log-line">{log}</div>
              ))}
              <div className="cursor">_</div>
            </div>
          </div>
          <div className="hologram-visualizer">
            <div className="holo-ring outer"></div>
            <div className="holo-ring middle"></div>
            <div className="holo-ring inner">
              <div className="holo-core"></div>
            </div>
            <div className="holo-data-stream">
              <p>PI-5 NEURAL ARCHITECTURE</p>
              <p>UPLINK ESTABLISHED</p>
              <p className="holo-status">SYNCING...</p>
            </div>
          </div>
        </div>
      )}

      {bootState === 'video' && (
        <div className="video-container">
          {/* Using a placeholder high-quality abstract video since we don't have one provided */}
          <video
            ref={videoRef}
            autoPlay
            muted
            onEnded={handleVideoEnded}
            className="boot-video"
          >
            <source src="https://assets.codepen.io/3364143/7btrrd.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="skip-overlay">
            <button className="skip-btn" onClick={() => setBootState('complete')}>Skip Animation</button>
          </div>
        </div>
      )}

      {bootState === 'complete' && (
        <div className="complete-screen">
          <h1 className="boot-title">Monk OS</h1>
          <p className="boot-subtitle">System Initialized Successfully.</p>
          <button className="next-action-btn" onClick={handleNext}>
            Proceed to Welcome <span className="arrow">→</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BootScreen;
