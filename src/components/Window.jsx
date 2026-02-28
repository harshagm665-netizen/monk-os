import React, { useState } from 'react';
import { X, Minus, Square, Minimize2, ArrowLeft } from 'lucide-react';
import './Window.css';

const Window = ({ title, isOpen, onClose, children, icon: Icon, width = 600, height = 400 }) => {
    const [isMaximized, setIsMaximized] = useState(false);

    if (!isOpen) return null;

    return (
        <div className={`os-window-overlay ${isMaximized ? 'maximized-overlay' : ''}`}>
            <div
                className={`os-window ${isMaximized ? 'maximized-window' : ''}`}
                style={isMaximized ? {} : { width: `${width}px`, height: `${height}px` }}
            >
                <div className="window-header">
                    <div className="window-title">
                        <button className="win-btn win-back" onClick={onClose} title="Back to Desktop">
                            <ArrowLeft size={16} />
                        </button>
                        {Icon && <Icon size={14} className="window-icon" />}
                        <span>{title}</span>
                    </div>
                    <div className="window-controls">
                        {/* Since Monk OS lacks a taskbar, minimizing acts as a close/hide */}
                        <button className="win-btn minimize" onClick={onClose}><Minus size={14} /></button>
                        <button className="win-btn maximize" onClick={() => setIsMaximized(!isMaximized)}>
                            {isMaximized ? <Minimize2 size={12} /> : <Square size={12} />}
                        </button>
                        <button className="win-btn close" onClick={onClose}><X size={14} /></button>
                    </div>
                </div>
                <div className="window-content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Window;
