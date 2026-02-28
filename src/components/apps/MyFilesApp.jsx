import React, { useState, useEffect } from 'react';
import {
    Folder, File, Image as ImageIcon, FileText,
    Film, FileArchive, X, Download, Maximize2
} from 'lucide-react';
import './MyFiles.css';

const API_BASE_URL = 'http://localhost:8000'; // Or your deployed backend URL

const MyFilesApp = ({ onClose }) => {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/files/list`);
            if (!res.ok) throw new Error('Failed to fetch files');
            const data = await res.json();
            setFiles(data);
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (type) => {
        switch (type) {
            case 'image': return <ImageIcon size={48} className="file-icon image" />;
            case 'video': return <Film size={48} className="file-icon video" />;
            case 'pdf': return <FileText size={48} className="file-icon pdf" />;
            case 'document': return <FileText size={48} className="file-icon document" />;
            default: return <File size={48} className="file-icon unknown" />;
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileClick = (file) => {
        setSelectedFile(file);
    };

    const closeViewer = () => {
        setSelectedFile(null);
    };

    const renderViewerContent = () => {
        if (!selectedFile) return null;
        const fileUrl = `${API_BASE_URL}${selectedFile.url}`;

        switch (selectedFile.type) {
            case 'image':
                return <img src={fileUrl} alt={selectedFile.name} className="viewer-image" />;
            case 'video':
                return (
                    <video controls autoPlay className="viewer-video">
                        <source src={fileUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                );
            case 'pdf':
            case 'document':
                return (
                    <iframe
                        src={fileUrl}
                        title={selectedFile.name}
                        className="viewer-iframe"
                    />
                );
            default:
                return (
                    <div className="viewer-unsupported">
                        <File size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
                        <h3>Preview not available</h3>
                        <p>This file type cannot be previewed natively.</p>
                        <a href={fileUrl} download className="download-btn">
                            <Download size={20} /> Download File
                        </a>
                    </div>
                );
        }
    };

    return (
        <div className="myfiles-app">
            <div className="myfiles-header">
                <div className="header-left">
                    <Folder size={24} className="folder-icon" />
                    <h2>MyFiles</h2>
                </div>
                <div className="header-right">
                    <button className="view-toggle" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                        {viewMode === 'grid' ? 'List View' : 'Grid View'}
                    </button>
                    <button className="close-app-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="myfiles-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Scanning local storage...</p>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <p>Error: {error}</p>
                        <button onClick={fetchFiles}>Retry</button>
                    </div>
                ) : files.length === 0 ? (
                    <div className="empty-state">
                        <Folder size={64} style={{ opacity: 0.3, marginBottom: '20px' }} />
                        <h3>No Files Found</h3>
                        <p>Place media inside the OS backend data folder.</p>
                    </div>
                ) : (
                    <div className={`file-container ${viewMode}`}>
                        {files.map((file, idx) => (
                            <div
                                key={idx}
                                className="file-item"
                                onClick={() => handleFileClick(file)}
                            >
                                <div className="file-icon-wrapper">
                                    {getFileIcon(file.type)}
                                </div>
                                <div className="file-info">
                                    <span className="file-name" title={file.name}>{file.name}</span>
                                    <span className="file-size">{formatSize(file.size)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Media Viewer Modal */}
            {selectedFile && (
                <div className="file-viewer-overlay" onClick={closeViewer}>
                    <div className="file-viewer-modal" onClick={e => e.stopPropagation()}>
                        <div className="viewer-header">
                            <span className="viewer-title">{selectedFile.name}</span>
                            <div className="viewer-actions">
                                <a href={`${API_BASE_URL}${selectedFile.url}`} download title="Download">
                                    <Download size={20} />
                                </a>
                                <button onClick={closeViewer} className="close-viewer">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="viewer-body">
                            {renderViewerContent()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyFilesApp;
