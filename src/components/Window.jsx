import React from 'react';
import { X, Minus, Square } from 'lucide-react';
import './Window.css';

const Window = ({ title, isOpen, onClose, children, icon: Icon, width = 600, height = 400 }) => {
    if (!isOpen) return null;

    return (
        <div className="os-window-overlay">
            <div
                className="os-window"
                style={{ width: `${width}px`, height: `${height}px` }}
            >
                <div className="window-header">
                    <div className="window-title">
                        {Icon && <Icon size={14} className="window-icon" />}
                        <span>{title}</span>
                    </div>
                    <div className="window-controls">
                        <button className="win-btn minimize"><Minus size={14} /></button>
                        <button className="win-btn maximize"><Square size={12} /></button>
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
