import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, ImageIcon, Loader, Send, X, Brain, Sparkles, Database, Zap, ChevronRight, ArrowLeft } from 'lucide-react';

const API = 'http://127.0.0.1:8000/api/rag';

/* ─── Psychological Color System ───────────────────────────────────────
   Deep Navy    #0D1B2A  → Trust, intelligence, stability (background)
   Electric Cyan #00F5FF → AI, innovation, clarity    (primary accent)
   Warm Amber   #FFB830  → Discovery, achievement, curiosity (secondary)
   Soft Violet  #8B5CF6  → Wisdom, creativity, depth   (tertiary)
   Charcoal     #1A2640  → Panels, cards, depth
──────────────────────────────────────────────────────────────────────── */

const C = {
    bg: '#090F1A',
    panel: '#0E1829',
    card: '#132035',
    border: 'rgba(0, 245, 255, 0.12)',
    cyan: '#00F5FF',
    cyanDim: 'rgba(0, 245, 255, 0.15)',
    amber: '#FFB830',
    amberDim: 'rgba(255, 184, 48, 0.12)',
    violet: '#8B5CF6',
    violetDim: 'rgba(139, 92, 246, 0.15)',
    text: '#E8F4FF',
    muted: '#5A7A99',
    success: '#00E5B5',
};

/* ─── Inline styles ─────────────────────────────────────────────────── */
const S = {
    root: {
        display: 'flex', height: '100%', width: '100%',
        background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: C.text, overflow: 'hidden',
    },

    /* Left: Upload panel */
    left: {
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, ${C.panel} 0%, ${C.bg} 100%)`,
        padding: '18px 16px', gap: 14,
    },
    panelTitle: {
        fontSize: 11, fontWeight: 700, letterSpacing: 2,
        color: C.muted, textTransform: 'uppercase', marginBottom: 4,
    },

    /* Upload zone */
    uploadZone: (dragging) => ({
        flex: '0 0 auto', minHeight: 130,
        border: `2px dashed ${dragging ? C.cyan : 'rgba(0,245,255,0.25)'}`,
        borderRadius: 14,
        background: dragging ? C.cyanDim : 'rgba(0,245,255,0.04)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8, cursor: 'pointer',
        transition: 'all 0.25s ease',
        padding: 16,
    }),
    uploadIcon: { color: C.cyan, opacity: 0.7 },
    uploadText: { fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 1.5 },

    /* File card */
    fileCard: {
        borderRadius: 12, padding: '10px 12px',
        background: C.card, border: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
    },
    fileName: {
        fontSize: 12, fontWeight: 600, color: C.text, flex: 1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
    },

    /* Status pills */
    pill: (color) => ({
        fontSize: 10, fontWeight: 700, letterSpacing: 1,
        background: `${color}22`, color, border: `1px solid ${color}44`,
        borderRadius: 20, padding: '3px 9px', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 4,
    }),

    /* Stats */
    stat: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', background: C.card, borderRadius: 10,
        border: `1px solid ${C.border}`, fontSize: 12,
    },
    statLabel: { color: C.muted, fontSize: 11 },
    statVal: { fontWeight: 700, color: C.cyan },

    /* Model badge */
    modelBadge: {
        marginTop: 'auto', padding: '10px 12px', borderRadius: 12,
        background: `linear-gradient(135deg, ${C.violetDim}, rgba(0,0,0,0))`,
        border: `1px solid ${C.violet}33`,
        display: 'flex', alignItems: 'center', gap: 8,
    },
    modelText: { fontSize: 11, lineHeight: 1.5 },

    /* Right: Chat panel */
    right: {
        flex: 1, display: 'flex', flexDirection: 'column',
        background: C.bg, overflow: 'hidden',
    },

    /* Chat header */
    chatHeader: {
        padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(90deg, rgba(0,245,255,0.03), transparent)`,
        display: 'flex', alignItems: 'center', gap: 12,
    },

    /* Chat messages */
    chatBody: {
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        scrollbarWidth: 'thin', scrollbarColor: `${C.border} transparent`,
    },

    /* Message bubbles */
    msgUser: {
        alignSelf: 'flex-end', maxWidth: '78%',
        background: `linear-gradient(135deg, rgba(0,245,255,0.12), rgba(0,245,255,0.06))`,
        border: `1px solid rgba(0,245,255,0.25)`, borderRadius: '16px 16px 4px 16px',
        padding: '10px 14px', fontSize: 13, lineHeight: 1.65,
    },
    msgAI: {
        alignSelf: 'flex-start', maxWidth: '84%',
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: '4px 16px 16px 16px',
        padding: '12px 16px', fontSize: 13, lineHeight: 1.75,
    },
    msgRow: { display: 'flex', gap: 8, alignItems: 'flex-start' },
    avatar: (color) => ({
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `${color}22`, border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }),

    /* q_type badge */
    typeBadge: (qt) => {
        const map = {
            factual: [C.cyan, '⚡'],
            analytical: [C.amber, '🔍'],
            summarisation: [C.violet, '✨'],
        };
        const [color, emoji] = map[qt] || [C.muted, '·'];
        return {
            style: {
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                color, background: `${color}15`, border: `1px solid ${color}30`,
                borderRadius: 20, padding: '2px 8px', marginBottom: 6,
                textTransform: 'uppercase'
            },
            label: `${emoji} ${qt}`
        };
    },

    /* Input bar */
    inputBar: {
        padding: '12px 16px', borderTop: `1px solid ${C.border}`,
        background: `linear-gradient(0deg, ${C.panel}, transparent)`,
        display: 'flex', gap: 10, alignItems: 'center',
    },
    input: {
        flex: 1, background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '10px 14px', color: C.text,
        fontSize: 13, outline: 'none', transition: 'border 0.2s',
        '&:focus': { borderColor: C.cyan },
    },
    sendBtn: (active) => ({
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: active ? `linear-gradient(135deg, ${C.cyan}, #0099CC)` : C.card,
        border: `1px solid ${active ? C.cyan : C.border}`,
        color: active ? '#000' : C.muted,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: active ? 'pointer' : 'not-allowed',
        transition: 'all 0.2s ease',
    }),

    /* Empty state */
    empty: {
        margin: 'auto', textAlign: 'center', opacity: 0.3,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    },
};

/* ─── Upload progress phases ─────────────────────────────────────────── */
const PHASES = ['Extracting text', 'Analysing visuals', 'Vectorising chunks', 'Indexing complete'];

/* ─── Typing dots ────────────────────────────────────────────────────── */
const TypingDots = () => (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
        {[0, 1, 2].map(i => (
            <span key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: C.cyan,
                animation: `ragPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                display: 'inline-block',
            }} />
        ))}
    </span>
);

/* ─── Format markdown-ish text ──────────────────────────────────────── */
const FormatText = ({ text }) => {
    const lines = text.split('\n');
    return (
        <>
            {lines.map((line, i) => {
                if (line.startsWith('### ')) return <h4 key={i} style={{ color: C.cyan, margin: '8px 0 4px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{line.slice(4)}</h4>;
                if (line.startsWith('## ')) return <h3 key={i} style={{ color: C.amber, margin: '10px 0 4px', fontSize: 13, fontWeight: 700 }}>{line.slice(3)}</h3>;
                if (line.startsWith('* ') || line.startsWith('- ')) return <p key={i} style={{ margin: '2px 0 2px 8px', color: 'rgba(232,244,255,0.85)', display: 'flex', gap: 6 }}><span style={{ color: C.cyan, flexShrink: 0 }}>›</span>{line.slice(2)}</p>;
                if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} style={{ color: C.amber }}>{line.slice(2, -2)}</strong>;
                if (!line.trim()) return <div key={i} style={{ height: 4 }} />;
                return <p key={i} style={{ margin: '2px 0', color: 'rgba(232,244,255,0.85)' }}>{line}</p>;
            })}
        </>
    );
};

/* ─── Main Component ─────────────────────────────────────────────────── */
const MultimodalApp = ({ onClose }) => {
    const [file, setFile] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle|uploading|ready|error
    const [phase, setPhase] = useState(0);
    const [stats, setStats] = useState(null);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    /* Inject global keyframes */
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
      @keyframes ragPulse {
        0%, 100% { opacity: 0.2; transform: scale(0.85); }
        50% { opacity: 1; transform: scale(1.15); }
      }
      @keyframes ragFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
      @keyframes ragGlow {
        0%, 100% { box-shadow: 0 0 12px rgba(0,245,255,0.15); }
        50% { box-shadow: 0 0 28px rgba(0,245,255,0.35); }
      }
      @keyframes ragSlideIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rag-msg { animation: ragSlideIn 0.22s ease forwards; }
      .rag-upload:hover { border-color: rgba(0,245,255,0.6) !important; background: rgba(0,245,255,0.07) !important; }
      .rag-input:focus { border-color: rgba(0,245,255,0.5) !important; box-shadow: 0 0 0 2px rgba(0,245,255,0.08); }
      .rag-send:hover { box-shadow: 0 4px 20px rgba(0,245,255,0.3); transform: scale(1.05); }

      /* Mobile Layout Overrides */
      @media (max-width: 768px) {
        .multimodal-root { flex-direction: column !important; overflow-y: auto !important; }
        .multimodal-left { width: 100% !important; flex: 0 0 auto !important; border-right: none !important; border-bottom: 1px solid rgba(0, 245, 255, 0.12) !important; padding: 10px !important; }
        .multimodal-right { width: 100% !important; flex: 1 1 auto !important; min-height: 400px !important; }
        .rag-upload { min-height: 80px !important; padding: 8px !important; }
      }
    `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    /* ── Upload ─── */
    const handleFile = async (f) => {
        if (!f) return;
        setFile(f); setUploadStatus('uploading'); setMessages([]); setSessionId(null); setStats(null); setPhase(0);
        const timer = setInterval(() => setPhase(p => Math.min(p + 1, 2)), 900);
        const form = new FormData();
        form.append('file', f);
        try {
            const res = await fetch(`${API}/upload`, { method: 'POST', body: form });
            const data = await res.json();
            clearInterval(timer); setPhase(3);
            if (!res.ok) throw new Error(data.detail || 'Upload failed');

            const sid = data.session_id;
            setSessionId(sid);
            setStats({ pages: data.pages, chunks: data.chunks, type: data.type });
            setUploadStatus('ready');

            // Show indexing confirmation, then auto-query for a full summary
            setMessages([{
                role: 'ai',
                text: `✓ **${data.filename}** indexed — ${data.pages} page(s) · ${data.chunks} chunks\n\nGenerating overview…`,
            }]);
            setIsAsking(true);

            // Auto-summarise in background
            try {
                const qRes = await fetch(`${API}/query`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        session_id: sid,
                        question: data.type === 'image'
                            ? 'Describe this image in full detail — all components, labels, data, and structure.'
                            : 'Provide a comprehensive overview of this document — objectives, key sections, and main points.'
                    })
                });
                const qData = await qRes.json();
                if (qRes.ok) {
                    setMessages([{ role: 'ai', q_type: qData.q_type, text: qData.answer, debug: qData.debug }]);
                }
            } catch (_) { /* silent — user can ask manually */ }
            finally { setIsAsking(false); }

            setTimeout(() => inputRef.current?.focus(), 300);
        } catch (err) {
            clearInterval(timer); setUploadStatus('error');
            setMessages([{ role: 'ai', text: `⚠ ${err.message}` }]);
        }
    };


    const onFileChange = (e) => handleFile(e.target.files[0]);
    const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); };

    const reset = () => {
        setFile(null); setSessionId(null); setUploadStatus('idle');
        setStats(null); setMessages([]); setQuestion('');
        if (fileRef.current) fileRef.current.value = '';
    };

    /* ── Ask ─── */
    const handleAsk = async () => {
        const q = question.trim();
        if (!q || !sessionId || isAsking) return;
        setMessages(p => [...p, { role: 'user', text: q }]);
        setQuestion(''); setIsAsking(true);
        setMessages(p => [...p, { role: 'ai', loading: true }]);
        try {
            const res = await fetch(`${API}/query`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, question: q }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Query failed');
            setMessages(p => [...p.slice(0, -1), { role: 'ai', text: data.answer, q_type: data.q_type, debug: data.debug }]);
        } catch (err) {
            setMessages(p => [...p.slice(0, -1), { role: 'ai', text: `⚠ ${err.message}` }]);
        } finally { setIsAsking(false); }
    };

    const isImage = file?.type?.startsWith('image/');

    /* ─── Render ──────────────────────────────────────────────────────── */
    return (
        <div style={S.root} className="multimodal-root">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back">
                    <ArrowLeft size={20} />
                </button>
            )}
            {/* ── Left Sidebar ──────────────────────────── */}
            <div style={S.left} className="multimodal-left">
                <p style={S.panelTitle}>Knowledge Source</p>

                {/* Upload zone */}
                {uploadStatus === 'idle' ? (
                    <div
                        className="rag-upload"
                        style={S.uploadZone(dragging)}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                    >
                        <input ref={fileRef} type="file" style={{ display: 'none' }}
                            accept="image/*,application/pdf" onChange={onFileChange} />
                        <div style={{ animation: 'ragFloat 3s ease-in-out infinite' }}>
                            <Upload size={30} style={S.uploadIcon} />
                        </div>
                        <p style={S.uploadText}>
                            Drop PDF or Image<br />
                            <span style={{ color: C.violet, fontSize: 10 }}>PDF · PNG · JPG · WEBP</span>
                        </p>
                    </div>
                ) : (
                    <div style={S.fileCard}>
                        {isImage
                            ? <ImageIcon size={18} color={C.violet} />
                            : <FileText size={18} color={C.cyan} />}
                        <span style={S.fileName}>{file?.name}</span>
                        <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 2, lineHeight: 1 }}>
                            <X size={13} />
                        </button>
                    </div>
                )}

                {/* Upload progress */}
                {uploadStatus === 'uploading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {PHASES.map((ph, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: i > phase ? 0.2 : 1, transition: 'opacity 0.4s' }}>
                                <div style={{
                                    width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                                    background: i < phase ? C.success + '22' : i === phase ? C.amber + '22' : C.card,
                                    border: `1px solid ${i < phase ? C.success : i === phase ? C.amber : C.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {i < phase ? <Sparkles size={9} color={C.success} /> : i === phase ? <Loader size={9} color={C.amber} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                                </div>
                                <span style={{ fontSize: 11, color: i === phase ? C.amber : C.muted }}>{ph}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                {stats && uploadStatus === 'ready' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ ...S.pill(C.success), alignSelf: 'flex-start', marginBottom: 4 }}>
                            <Zap size={9} /> Indexed
                        </div>
                        <div style={S.stat}>
                            <span style={S.statLabel}>Pages</span>
                            <span style={S.statVal}>{stats.pages}</span>
                        </div>
                        <div style={S.stat}>
                            <span style={S.statLabel}>Chunks</span>
                            <span style={S.statVal}>{stats.chunks}</span>
                        </div>
                        <div style={S.stat}>
                            <span style={S.statLabel}>Type</span>
                            <span style={{ ...S.statVal, color: C.amber, textTransform: 'capitalize' }}>{stats.type}</span>
                        </div>
                    </div>
                )}

                {/* Suggested questions */}
                {sessionId && (
                    <div style={{ marginTop: 4 }}>
                        <p style={{ ...S.panelTitle, marginBottom: 8 }}>Quick Queries</p>
                        {['Summarise this document', 'What are the key components?', 'How does this system work?'].map((q, i) => (
                            <button key={i} onClick={() => { setQuestion(q); inputRef.current?.focus(); }}
                                style={{
                                    width: '100%', background: 'none', border: `1px solid ${C.border}`,
                                    borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
                                    color: C.muted, fontSize: 11, textAlign: 'left', marginBottom: 5,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.target.style.borderColor = C.cyan; e.target.style.color = C.cyan; }}
                                onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
                            >
                                <ChevronRight size={10} />{q}
                            </button>
                        ))}
                    </div>
                )}

                {/* Model badge */}
                <div style={S.modelBadge}>
                    <Brain size={16} color={C.violet} />
                    <div style={S.modelText}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: C.violet }}>Mistral 7B</div>
                        <div style={{ color: C.muted, fontSize: 10 }}>LangGraph · TF-IDF</div>
                    </div>
                </div>
            </div>

            {/* ── Right Chat Panel ──────────────────────── */}
            <div style={S.right} className="multimodal-right">
                {/* Header */}
                <div style={S.chatHeader}>
                    <div style={S.avatar(C.cyan)}>
                        <Database size={13} color={C.cyan} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>Multimodal RAG</div>
                        <div style={{ fontSize: 10, color: C.muted }}>
                            {sessionId ? `Session active · ${file?.name}` : 'Upload a document to begin'}
                        </div>
                    </div>
                    {sessionId && (
                        <div style={{ ...S.pill(C.success), marginLeft: 'auto' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.success, display: 'inline-block', animation: 'ragPulse 2s ease infinite' }} />
                            {' '}Live
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div style={S.chatBody}>
                    {messages.length === 0 && (
                        <div style={S.empty}>
                            <div style={{ animation: 'ragFloat 3s ease-in-out infinite' }}>
                                <Brain size={40} color={C.violet} />
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>Document Intelligence Ready</p>
                            <p style={{ fontSize: 11, maxWidth: 200 }}>Upload a PDF or image to unlock AI-powered analysis</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className="rag-msg" style={msg.role === 'user' ? { alignSelf: 'flex-end' } : S.msgRow}>
                            {msg.role === 'ai' && (
                                <div style={S.avatar(C.violet)}>
                                    <Brain size={12} color={C.violet} />
                                </div>
                            )}

                            <div style={msg.role === 'user' ? S.msgUser : S.msgAI}>
                                {msg.loading ? (
                                    <TypingDots />
                                ) : (
                                    <>
                                        {msg.role === 'ai' && msg.q_type && (() => {
                                            const { style, label } = S.typeBadge(msg.q_type);
                                            return <div><span style={style}>{label}</span></div>;
                                        })()}
                                        <FormatText text={msg.text} />
                                        {msg.debug && (
                                            <div style={{
                                                marginTop: 8, padding: '5px 8px', borderRadius: 6,
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
                                                fontSize: 10, color: C.muted,
                                            }}>
                                                <span title="LLM used">🤖 {msg.debug.model}</span>
                                                <span title="Chunks retrieved">📦 {msg.debug.chunks} chunk{msg.debug.chunks !== 1 ? 's' : ''}</span>
                                                <span title="Context characters sent to LLM">📝 {msg.debug.ctx_chars} chars</span>
                                                <span title="Total response time" style={{ color: msg.debug.t_total_s > 10 ? '#FFB830' : C.muted }}>⏱ {msg.debug.t_total_s}s</span>
                                                <span title="Retrieval time">🔍 {msg.debug.t_retrieve}s</span>
                                                <span title="Synthesis time">✨ {msg.debug.t_synth}s</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div style={S.inputBar}>
                    <input
                        ref={inputRef}
                        className="rag-input"
                        style={S.input}
                        type="text"
                        placeholder={sessionId ? 'Ask anything about the document...' : 'Upload a file first...'}
                        value={question}
                        disabled={!sessionId || isAsking}
                        onChange={e => setQuestion(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAsk()}
                    />
                    <button
                        className="rag-send"
                        style={S.sendBtn(!!(sessionId && question.trim() && !isAsking))}
                        onClick={handleAsk}
                        disabled={!sessionId || isAsking || !question.trim()}
                    >
                        {isAsking
                            ? <Loader size={14} color={C.cyan} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Send size={14} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultimodalApp;
