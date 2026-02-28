import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Square, ArrowLeft } from 'lucide-react';
import './Rhymes.css';

const RHYMES_PLAYLIST = [
    { id: 'rhyme1', title: 'Twinkle Twinkle Little Star', file: '/rhymes/rhyme1.mp4' },
    { id: 'rhyme2', title: 'Baa Baa Black Sheep', file: '/rhymes/rhyme2.mp4' },
    { id: 'rhyme3', title: 'Humpty Dumpty', file: '/rhymes/rhyme3.mp4' },
    { id: 'rhyme4', title: 'Jack and Jill', file: '/rhymes/rhyme4.mp4' },
    { id: 'rhyme5', title: 'Mary Had a Little Lamb', file: '/rhymes/rhyme5.mp4' }
];

const RhymesApp = ({ onClose }) => {
    const [activeRhyme, setActiveRhyme] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef(null);

    const BACKEND_URL = `http://${window.location.hostname}:8000/api/hardware`;

    // Always stop the robot when the app completely unmounts/closes
    useEffect(() => {
        return () => {
            sendKinematicCommand('dance stop');
        };
    }, []);

    const sendKinematicCommand = async (cmd) => {
        try {
            await fetch(`${BACKEND_URL}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            console.log(`[Kinematics Sync] Sent: ${cmd}`);
        } catch (err) {
            console.error('[Kinematics Sync] Failed to communicate with Hardware API', err);
        }
    };

    const handlePlayPause = () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play().catch(e => console.error("Playback failed", e));
        }
    };

    const handleVideoPlay = () => {
        setIsPlaying(true);
        sendKinematicCommand('dance start');
    };

    const handleVideoPause = () => {
        setIsPlaying(false);
        sendKinematicCommand('dance stop');
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        sendKinematicCommand('dance stop');
    };

    const selectRhyme = (rhyme) => {
        if (activeRhyme?.id === rhyme.id) return;

        // Stop current before switching
        if (isPlaying) {
            sendKinematicCommand('dance stop');
        }

        setActiveRhyme(rhyme);
        setIsPlaying(false);
    };

    return (
        <div className="app-container rhymes-app-container">
            {!activeRhyme ? (
                // Playlist View
                <>
                    <div className="rhymes-header">
                        <h2>Interactive Rhymes</h2>
                        <button className="back-btn" onClick={() => {
                            sendKinematicCommand('dance stop');
                            onClose();
                        }}>
                            <ArrowLeft size={20} /> Close App
                        </button>
                    </div>
                    <div className="playlist-section full-width">
                        <h3>Select a Nursery Rhyme</h3>
                        <div className="playlist-grid">
                            {RHYMES_PLAYLIST.map(rhyme => (
                                <button
                                    key={rhyme.id}
                                    className="playlist-item"
                                    onClick={() => selectRhyme(rhyme)}
                                >
                                    <div className="rhyme-icon">
                                        <Music size={24} />
                                    </div>
                                    <div className="rhyme-info">
                                        <span className="rhyme-title" style={{ fontSize: '18px' }}>{rhyme.title}</span>
                                    </div>
                                    <Play size={20} className="play-hint-icon" />
                                </button>
                            ))}
                        </div>
                        <div className="help-text">
                            <p>Place your 5 .mp4 files into the <code>public/rhymes/</code> folder and name them <code>rhyme1.mp4</code> to <code>rhyme5.mp4</code>.</p>
                        </div>
                    </div>
                </>
            ) : (
                // Fullscreen Video View
                <div className="fullscreen-video-container">
                    <button className="fullscreen-back-btn" onClick={() => {
                        handleVideoPause(); // Stop robot and pause video
                        setActiveRhyme(null); // Go back to playlist
                    }}>
                        <ArrowLeft size={24} /> Back to Playlist
                    </button>

                    <video
                        ref={videoRef}
                        src={activeRhyme.file}
                        className="fullscreen-video-element"
                        onPlay={handleVideoPlay}
                        onPause={handleVideoPause}
                        onEnded={handleVideoEnded}
                        onClick={handlePlayPause}
                        controls={false}
                        playsInline
                        autoPlay
                    />

                    {/* Custom Player Controls Overlay */}
                    <div className="video-controls-overlay fullscreen-overlay">
                        <button className="control-btn play-pause-btn" onClick={handlePlayPause}>
                            {isPlaying ? <Pause size={48} /> : <Play size={48} style={{ marginLeft: '6px' }} />}
                        </button>
                    </div>

                    {/* Status sync indicator */}
                    <div className={`sync-badge fullscreen-sync ${isPlaying ? 'active' : ''}`}>
                        {isPlaying ? 'Kinematics: DANCING' : 'Kinematics: STANDBY'}
                    </div>

                    <h3 className="fullscreen-rhyme-title">{activeRhyme.title}</h3>
                </div>
            )}
        </div>
    );
};

export default RhymesApp;
