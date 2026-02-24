import React, { useState, useEffect } from 'react';
import { Wand2, Image as ImageIcon, CheckCircle, Mic, Volume2, SkipForward, Users, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Apps.css';

const SmartKillerApp = () => {
    // Pipeline States: upload -> learning -> registration -> permissions -> quiz_intro -> quiz_active -> quiz_result -> student_finished -> final_results
    const [state, setState] = useState('upload');
    const [curriculum, setCurriculum] = useState(null);
    const [tIdx, setTIdx] = useState(0); // Topic Index
    const [qIdx, setQIdx] = useState(0); // Question Index

    // Group Test State
    const [studentName, setStudentName] = useState("");
    const [groupReports, setGroupReports] = useState([]); // [{ name, score, total }]
    const [activeQuestionPool, setActiveQuestionPool] = useState([]); // Randomized subset

    // Agent 4 state
    const [timeLeft, setTimeLeft] = useState(18);

    // Agent 5 Evaluator state
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [feedback, setFeedback] = useState(null);
    const [selectedAnswer, setSelectedAnswer] = useState(null);

    // Agent 4: Auto Timer for Active Quiz
    useEffect(() => {
        let timer;
        if (state === 'quiz_active' && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (state === 'quiz_active' && timeLeft === 0) {
            handleCheckAnswer(""); // Timer expired, force a wrong answer submission
        }
        return () => clearInterval(timer);
    }, [state, timeLeft]);

    // Leader Agent Interaction (File Upload & 100MB Limit)
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Requirement: 100MB size limit check
        if (file.size > 100 * 1024 * 1024) {
            alert("File is too large! Please upload a document smaller than 100MB.");
            return;
        }

        setState('learning');
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/smart-killer/upload-learn', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            // Validating that Agent 1 & 2 succeeded
            if (data.curriculum && data.curriculum.topics && data.curriculum.topics.length > 0) {
                setCurriculum(data.curriculum);
                setState('registration'); // Ask for Student Name
            } else {
                throw new Error("Invalid Curriculum Format");
            }
        } catch (error) {
            console.error("[Agent 6 Callback] Failed to learn document", error);
            // Fallback mock curriculum for testing UI
            setCurriculum({
                topics: [{
                    concept: "The Solar System",
                    image_prompt: "A bright yellow sun with a happy face in space, surrounded by cute planets. White background, vector art, bright colors.",
                    robot_speech: "Hello scientists! Look at our amazing solar system!",
                    questions: [
                        { question: "What is at the center of our solar system?", options: ["The Moon", "The Earth", "A black hole", "The Sun"], correct_index: 3 },
                        { question: "Earth takes how many days to orbit?", options: ["365 days", "30 days", "1 day", "7 days"], correct_index: 0 },
                        { question: "The moon orbits what?", options: ["The sun", "The Earth", "Mars", "Jupiter"], correct_index: 1 }
                    ]
                }]
            });
            setTimeout(() => setState('registration'), 2500);
        }
    };

    // Agent: Start Test for Student (Randomizes Questions)
    const startStudentTest = () => {
        if (!studentName.trim()) {
            alert("Please enter a student name!");
            return;
        }

        // Feature: Randomize questions for this student (Dynamic Pooling)
        // Shallow copy the curriculum questions for randomizing, pick 1 per topic to keep it short
        let pool = [];
        curriculum.topics.forEach(t => {
            const shuffledOptions = [...t.questions].sort(() => 0.5 - Math.random());
            if (shuffledOptions.length > 0) pool.push(shuffledOptions[0]); // Pick 1 random question per topic
        });

        setActiveQuestionPool(pool);
        setQIdx(0);
        setTIdx(0);
        setScore({ correct: 0, total: 0 });

        // Go to permissions once per student, or skip straight to quiz
        setState('permissions');
    };

    // Agent 3: Permissions Guard
    const handlePermissions = async (grant) => {
        if (grant) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log("[Agent 3] Microphone & Speaker access GRANTED.");
            } catch (err) {
                console.warn("[Agent 3] Permissions DENIED/FAILED:", err);
            }
        } else {
            console.log("[Agent 3] Permissions SKIPPED.");
        }
        setState('quiz_intro');
    };

    // Agent 5: Check Answer
    const handleCheckAnswer = async (answer) => {
        setState('quiz_result');
        setSelectedAnswer(answer);

        try {
            // FIX: Evaluate against the localized random question pool, not the master curriculum
            const activeQuestion = activeQuestionPool[qIdx];
            const correctAnswerText = activeQuestion.options[activeQuestion.correct_index];

            const response = await fetch('http://127.0.0.1:8000/api/smart-killer/check-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: activeQuestion.question,
                    selected_answer: answer,
                    correct_answer: correctAnswerText
                })
            });
            const data = await response.json();
            setFeedback(data);

            if (data.is_correct) {
                setScore(s => ({ ...s, correct: s.correct + 1 }));
            }
            setScore(s => ({ ...s, total: s.total + 1 }));

        } catch (err) {
            console.error("[Agent 6 Callback] Evaluate Error:", err);
            // Fallback offline evaluation
            const activeQuestion = activeQuestionPool[qIdx];
            const isCorrect = answer === activeQuestion.options[activeQuestion.correct_index];
            setFeedback({
                is_correct: isCorrect,
                feedback: isCorrect ? "Great job!" : "Oops, not quite!"
            });
            if (isCorrect) setScore(s => ({ ...s, correct: s.correct + 1 }));
            setScore(s => ({ ...s, total: s.total + 1 }));
        }
    };

    // Workflow Router
    const nextQuestion = () => {
        if (qIdx + 1 < activeQuestionPool.length) {
            setQIdx(qIdx + 1);

            // Advance Topic visually if the random question belongs to a new topic index
            // (Since questions are randomized, we just advance tIdx visually for variety)
            if (tIdx + 1 < curriculum?.topics?.length) {
                setTIdx(tIdx + 1);
                setState('quiz_intro');
            } else {
                setTIdx(0);
                setState('quiz_intro');
            }
        } else {
            // Save this student's result to the Group Array
            setGroupReports(prev => [...prev, {
                name: studentName,
                score: score.correct,
                total: score.total
            }]);
            setState('student_finished');
        }
    };

    const startQuizCycle = () => {
        setTimeLeft(18);
        setState('quiz_active');
    };

    // Agent 7: Final PDF Report Generator
    const downloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Monk OS: Group Quiz Result Report", 14, 22);

        doc.setFontSize(12);
        const date = new Date().toLocaleString();
        doc.text(`Generated on: ${date}`, 14, 30);

        const tableColumn = ["Student Name", "Score", "Total Questions", "Percentage"];
        const tableRows = [];

        groupReports.forEach(report => {
            const percentage = report.total === 0 ? 0 : Math.round((report.score / report.total) * 100);
            const reportData = [
                report.name,
                report.score,
                report.total,
                `${percentage}%`
            ];
            tableRows.push(reportData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: 'striped',
            headStyles: { fillColor: [0, 210, 255] }
        });

        doc.save(`Group_Quiz_Report_${Date.now()}.pdf`);
    };

    // Helper to get active random question
    const activeTopic = curriculum?.topics[tIdx];
    const activeQuestion = activeQuestionPool[qIdx];

    return (
        <div className="app-container smart-killer-app">
            {/* UPLOAD STATE */}
            {state === 'upload' && (
                <div className="upload-state">
                    <div className="upload-circle">
                        <ImageIcon size={32} />
                    </div>
                    <h3>Upload Study Material</h3>
                    <p>I will learn this document and create a visualized quiz.</p>
                    <button className="magic-btn" onClick={() => document.getElementById('file-upload').click()}>
                        <Wand2 size={16} /> Select Document
                    </button>
                    <input
                        type="file"
                        id="file-upload"
                        style={{ display: 'none' }}
                        accept="image/*,.pdf,.txt,.md"
                        onChange={handleFileUpload}
                    />
                    <p className="loading-subtext" style={{ marginTop: '30px' }}>Multi-Agent System Armed.</p>
                </div>
            )}

            {/* REGISTRATION STATE */}
            {state === 'registration' && (
                <div className="quiz-state" style={{ textAlign: 'center' }}>
                    <div className="upload-circle" style={{ margin: '0 auto 20px', background: 'rgba(0, 255, 204, 0.2)' }}>
                        <Users size={32} color="#00ffcc" />
                    </div>
                    <h3>Student Registration</h3>
                    <p style={{ color: '#aaa', marginBottom: '30px' }}>Enter the name of the student taking the quiz.</p>

                    <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="e.g. Alice"
                        style={{
                            padding: '12px 20px',
                            fontSize: '18px',
                            borderRadius: '8px',
                            border: '1px solid #00d2ff',
                            background: '#111',
                            color: '#fff',
                            marginBottom: '30px',
                            width: '80%',
                            textAlign: 'center'
                        }}
                    />

                    <button className="magic-btn" onClick={startStudentTest} style={{ margin: '0 auto', justifyContent: 'center' }}>
                        Start Quiz for {studentName || 'Student'}
                    </button>

                    {groupReports.length > 0 && (
                        <p style={{ marginTop: '20px', color: '#555' }}>
                            {groupReports.length} student(s) have finished so far.
                        </p>
                    )}
                </div>
            )}

            {/* LEADER AGENT LEARNING STATE */}
            {state === 'learning' && (
                <div className="learning-state">
                    <div className="ai-core-loader">
                        <div className="orbit orbit-1"></div>
                        <div className="orbit orbit-2"></div>
                        <div className="orbit orbit-3"></div>
                        <div className="core-gem"></div>
                    </div>
                    <h3 className="glitch-text" data-text="Pipeline Processing">Pipeline Processing</h3>
                    <p className="loading-subtext">Agent 1: Extracting Content...</p>
                    <p className="loading-subtext">Agent 2: Generating Visuals... <span className="blink">_</span></p>
                </div>
            )}

            {/* AGENT 3: PERMISSIONS STATE */}
            {state === 'permissions' && (
                <div className="quiz-state" style={{ textAlign: 'center' }}>
                    <div className="brain-pulse" style={{ margin: '0 auto 20px' }}><Mic size={20} style={{ marginTop: 10 }} /></div>
                    <h3>Audio Access Required</h3>
                    <p style={{ color: '#aaa', margin: '15px 0 30px' }}>
                        To let the robot speak and to hear your child's answers,
                        Agent 3 requests Microphone and Speaker permissions.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button className="option-btn" onClick={() => handlePermissions(true)} style={{ background: '#00ffcc', color: '#000', fontWeight: 'bold', justifyContent: 'center' }}>
                            <Volume2 size={18} /> Grant Access
                        </button>
                        <button className="option-btn" onClick={() => handlePermissions(false)} style={{ justifyContent: 'center' }}>
                            <SkipForward size={18} /> Skip for now
                        </button>
                    </div>
                </div>
            )}

            {/* QUIZ INTRO (TOPIC VISUALIZER) */}
            {state === 'quiz_intro' && activeTopic && (
                <div className="quiz-state">
                    <div className="quiz-header" style={{ flexDirection: 'column' }}>
                        <h3 style={{ color: '#00d2ff', marginBottom: '10px', textAlign: 'center' }}>
                            New Topic: {activeTopic.concept}
                        </h3>
                        <div className="gen-image-mock" style={{ padding: '30px', margin: '20px 0' }}>
                            <span>[Visualizing: {activeTopic.image_prompt}]</span>
                        </div>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center', marginBottom: '20px' }}>
                            🤖 "{activeTopic.robot_speech || `Let's see what you learned about ${activeTopic.concept}!`}"
                        </p>
                        <button className="magic-btn" onClick={startQuizCycle} style={{ justifyContent: 'center', alignSelf: 'center' }}>
                            Ready!
                        </button>
                    </div>
                </div>
            )}

            {/* AGENT 4: ACTIVE QUIZ TIMER */}
            {state === 'quiz_active' && activeQuestion && (
                <div className="quiz-state">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ color: '#aaa', fontSize: '14px' }}>Topic: {activeTopic?.concept}</div>
                        <div style={{
                            background: timeLeft <= 3 ? '#ff3366' : '#222',
                            padding: '8px 15px',
                            borderRadius: '20px',
                            fontWeight: 'bold',
                            border: `1px solid ${timeLeft <= 3 ? '#ff3366' : '#00ffcc'}`,
                            transition: 'all 0.3s'
                        }}>
                            ⏳ 00:{timeLeft.toString().padStart(2, '0')}
                        </div>
                    </div>

                    <div className="question-card">
                        <h4 style={{ fontSize: '1.4rem', marginBottom: '30px' }}>{activeQuestion.question}</h4>
                        <div className="options">
                            {activeQuestion.options.map((opt, oIdx) => (
                                <button
                                    key={oIdx}
                                    className="option-btn"
                                    onClick={() => handleCheckAnswer(opt)}
                                >
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #555', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px', fontSize: '12px' }}>
                                        {['A', 'B', 'C', 'D'][oIdx]}
                                    </div>
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* AGENT 5: EVALUATION RESULTS */}
            {state === 'quiz_result' && activeQuestion && feedback && (
                <div className="quiz-state" style={{ textAlign: 'center' }}>
                    <div style={{
                        padding: '30px',
                        background: feedback.is_correct ? 'rgba(0, 255, 204, 0.1)' : 'rgba(255, 51, 102, 0.1)',
                        border: `2px solid ${feedback.is_correct ? '#00ffcc' : '#ff3366'}`,
                        borderRadius: '12px',
                        marginBottom: '30px'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '15px' }}>
                            {feedback.is_correct ? '🌟' : '💡'}
                        </div>
                        <h2 style={{ color: feedback.is_correct ? '#00ffcc' : '#ff3366', marginBottom: '15px' }}>
                            {feedback.is_correct ? 'Correct!' : 'Time Up / Incorrect'}
                        </h2>
                        <p style={{ fontSize: '18px', lineHeight: '1.5' }}>{feedback.feedback}</p>

                        {!feedback.is_correct && (
                            <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                Correct Answer: <br />
                                <strong style={{ color: '#00ffcc', fontSize: '20px' }}>
                                    {activeQuestion.options[activeQuestion.correct_index]}
                                </strong>
                            </div>
                        )}
                    </div>

                    <button className="magic-btn" onClick={nextQuestion} style={{ margin: '0 auto', justifyContent: 'center' }}>
                        Next Question <SkipForward size={16} />
                    </button>
                </div>
            )}

            {/* STUDENT FINISHED STATE */}
            {state === 'student_finished' && (
                <div className="quiz-state" style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Great work, {studentName}! 🎉</h2>
                    <div style={{ fontSize: '4rem', color: '#00ffcc', fontWeight: 'bold', marginBottom: '10px' }}>
                        {score.correct} / {score.total}
                    </div>
                    <p style={{ fontSize: '18px', color: '#aaa', marginBottom: '40px' }}>Your score has been recorded.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
                        <button className="option-btn" onClick={() => {
                            setStudentName('');
                            setState('registration');
                        }} style={{ justifyContent: 'center' }}>
                            <Users size={18} /> Next Student
                        </button>

                        <button className="magic-btn" onClick={() => setState('final_results')} style={{ justifyContent: 'center', background: '#ff3366', color: '#fff' }}>
                            Finish Group Quiz
                        </button>
                    </div>
                </div>
            )}

            {/* FINAL SCORE & AGENT 7 EXPORT */}
            {state === 'final_results' && (
                <div className="quiz-state" style={{ textAlign: 'center' }}>
                    <div className="ai-core-loader" style={{ margin: '0 auto 30px' }}>
                        <div className="orbit orbit-1" style={{ animationDuration: '6s' }}></div>
                        <div className="orbit orbit-2" style={{ animationDuration: '4s' }}></div>
                        <div className="core-gem" style={{ width: '40px', height: '40px' }}></div>
                    </div>
                    <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Group Quiz Complete! 🎉</h2>
                    <p style={{ color: '#aaa', marginBottom: '30px' }}>Testing complete for {groupReports.length} student(s).</p>

                    <button className="magic-btn" onClick={downloadPDF} style={{ margin: '0 auto 20px', justifyContent: 'center', background: '#00d2ff' }}>
                        <Download size={18} /> Download PDF Report (Agent 7)
                    </button>

                    <button className="option-btn" onClick={() => {
                        setGroupReports([]);
                        setState('upload');
                    }} style={{ margin: '0 auto', justifyContent: 'center', border: 'none' }}>
                        Start New Session
                    </button>
                </div>
            )}
        </div>
    );
};

export default SmartKillerApp;
