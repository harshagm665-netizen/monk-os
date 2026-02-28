import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, FileText, CheckCircle, RefreshCw, BarChart3 } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');

    const [stats, setStats] = useState({ total_students: 0, present_today: 0, date: '' });
    const [students, setStudents] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simple Auth Check
        if (localStorage.getItem('monk_admin_auth') !== 'true') {
            navigate('/admin');
            return;
        }

        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const dashRes = await fetch('http://127.0.0.1:8000/api/admin/dashboard');
            const dashData = await dashRes.json();
            setStats(dashData.stats);
            setRecentActivity(dashData.recent_activity);

            const studRes = await fetch('http://127.0.0.1:8000/api/admin/students');
            const studData = await studRes.json();
            setStudents(studData);

        } catch (error) {
            console.error("Failed to fetch admin data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('monk_admin_auth');
        navigate('/');
    };

    return (
        <div className="admin-dashboard-wrapper">
            {/* Sidebar Navigation */}
            <div className="admin-sidebar">
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <h2 style={{ margin: 0 }}>Monk Dashboard</h2>
                        <div title="Robot Status: Online" style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00ffcc', boxShadow: '0 0 8px #00ffcc' }}></div>
                    </div>
                    <span className="badge">Teacher Mode</span>
                </div>

                <div className="sidebar-menu">
                    <button
                        className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <BarChart3 size={18} /> Overview
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'students' ? 'active' : ''}`}
                        onClick={() => setActiveTab('students')}
                    >
                        <Users size={18} /> Class Roster
                    </button>
                    <button
                        className={`nav-btn ${activeTab === 'quiz' ? 'active' : ''}`}
                        onClick={() => setActiveTab('quiz')}
                    >
                        <FileText size={18} /> Quiz Results
                    </button>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <button className="nav-btn logout" onClick={handleLogout}>
                        <LogOut size={18} /> Exit Dashboard
                    </button>
                    <div style={{ marginTop: '20px', padding: '15px', borderTop: '1px solid #222', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#00ffcc', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <CheckCircle size={12} /> Local Storage Active
                        </div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>No Cloud Sync</div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="admin-main">
                <div className="main-header">
                    <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
                    <button className="refresh-btn" onClick={fetchData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Refresh Data
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">Loading Classroom Data from SQLite...</div>
                ) : (
                    <div className="dashboard-content">

                        {/* OVERVIEW TAB */}
                        {activeTab === 'overview' && (
                            <>
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-icon" style={{ background: 'rgba(0, 210, 255, 0.1)' }}>
                                            <Users size={24} color="#00d2ff" />
                                        </div>
                                        <div className="stat-info">
                                            <h3>Total Enrolled</h3>
                                            <h2>{stats.total_students}</h2>
                                        </div>
                                    </div>

                                    <div className="stat-card">
                                        <div className="stat-icon" style={{ background: 'rgba(0, 255, 204, 0.1)' }}>
                                            <CheckCircle size={24} color="#00ffcc" />
                                        </div>
                                        <div className="stat-info">
                                            <h3>Present Today</h3>
                                            <h2>{stats.present_today}</h2>
                                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('students'); }} style={{ color: '#ff3366', fontSize: '12px', textDecoration: 'none', display: 'block', marginTop: '5px' }}>View Absent Students</a>
                                        </div>
                                    </div>

                                    <div className="stat-card" style={{ gridColumn: 'span 2' }}>
                                        <h3 style={{ marginBottom: '15px' }}>Date Record</h3>
                                        <h2 style={{ fontSize: '24px', letterSpacing: '2px' }}>{stats.date}</h2>
                                        <p style={{ color: '#aaa', marginTop: '10px' }}>Facial Recognition auto-logs attendance instantly upon seeing a saved face.</p>
                                    </div>
                                </div>

                                <h2 style={{ marginTop: '40px', marginBottom: '20px' }}>Recent App Activity</h2>
                                {recentActivity.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No recent quizzes completed today.</p>
                                        <button className="magic-btn" style={{ marginTop: '15px' }} onClick={() => navigate('/')}>Start a Quiz</button>
                                    </div>
                                ) : (
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>AI Topic Taught</th>
                                                <th>Final Score</th>
                                                <th>Percentage</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentActivity.map(act => {
                                                const perc = Math.round((act.score / act.total) * 100);
                                                return (
                                                    <tr key={act.id}>
                                                        <td style={{ fontWeight: 'bold' }}>{act.student_name}</td>
                                                        <td>{act.topic}</td>
                                                        <td>{act.score} / {act.total}</td>
                                                        <td>
                                                            <div className="progress-bar-bg">
                                                                <div className="progress-bar-fill" style={{
                                                                    width: `${perc}%`,
                                                                    background: perc >= 70 ? '#00ffcc' : '#ffcc00'
                                                                }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '12px', marginLeft: '10px' }}>{perc}%</span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </>
                        )}


                        {/* STUDENTS TAB */}
                        {activeTab === 'students' && (
                            <div className="table-container">
                                <table className="admin-table roster">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Student Name</th>
                                            <th>Face Profile</th>
                                            <th>Grade Level</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(s => (
                                            <tr key={s.id}>
                                                <td style={{ color: '#888' }}>#{s.id}</td>
                                                <td style={{ fontWeight: 'bold', fontSize: '1rem' }}>{s.name}</td>
                                                <td>
                                                    <span className={`status-badge ${s.face_id || s.grade === 'Auto-Enrolled' ? 'registered' : 'pending'}`}>
                                                        {s.face_id || s.grade === 'Auto-Enrolled' ? '✓ Learned' : 'Pending Scan'}
                                                    </span>
                                                </td>
                                                <td>{s.grade}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* QUIZ RESULTS TAB */}
                        {activeTab === 'quiz' && (
                            <div className="table-container">
                                <p style={{ color: '#aaa', marginBottom: '20px' }}>Showing all historical Smart Killer AI quiz scores parsed from Local Storage to SQLite.</p>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Archive ID</th>
                                            <th>Student</th>
                                            <th>Topic</th>
                                            <th>Result</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentActivity.map(act => (
                                            <tr key={act.id}>
                                                <td style={{ color: '#888' }}>{act.id}</td>
                                                <td style={{ fontWeight: 'bold' }}>{act.student_name}</td>
                                                <td>{act.topic}</td>
                                                <td style={{ color: '#00ffcc' }}>{act.score} / {act.total}</td>
                                                <td style={{ color: '#888', fontSize: '12px' }}>{act.date}</td>
                                            </tr>
                                        ))}
                                        {recentActivity.length === 0 && (
                                            <tr><td colSpan="5" className="empty-state">No archived tests found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
