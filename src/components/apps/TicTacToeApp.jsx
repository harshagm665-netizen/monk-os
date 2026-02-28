import React, { useState, useEffect } from 'react';
import './TicTacToe.css';
import { ArrowLeft } from 'lucide-react';

const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

const TicTacToeApp = ({ onClose }) => {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true); // Player is X, Robot is O
    const [winner, setWinner] = useState(null);
    const [winningLine, setWinningLine] = useState([]);
    const [isDraw, setIsDraw] = useState(false);
    const [score, setScore] = useState({ player: 0, robot: 0 });
    const [robotThinking, setRobotThinking] = useState(false);

    // Robot AI Move Generator
    useEffect(() => {
        if (!isXNext && !winner && !isDraw) {
            setRobotThinking(true);
            const timer = setTimeout(() => {
                makeRobotMove();
            }, 800); // Artificial delay to simulate thinking
            return () => clearTimeout(timer);
        }
    }, [isXNext, winner, isDraw]);

    const findBestMove = (squares) => {
        // 1. Can Robot win?
        for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
            const [a, b, c] = WINNING_COMBINATIONS[i];
            if (squares[a] === 'O' && squares[a] === squares[b] && squares[c] === null) return c;
            if (squares[a] === 'O' && squares[a] === squares[c] && squares[b] === null) return b;
            if (squares[b] === 'O' && squares[b] === squares[c] && squares[a] === null) return a;
        }

        // 2. Must Robot block Player?
        for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
            const [a, b, c] = WINNING_COMBINATIONS[i];
            if (squares[a] === 'X' && squares[a] === squares[b] && squares[c] === null) return c;
            if (squares[a] === 'X' && squares[a] === squares[c] && squares[b] === null) return b;
            if (squares[b] === 'X' && squares[b] === squares[c] && squares[a] === null) return a;
        }

        // 3. Take Center if available
        if (squares[4] === null) return 4;

        // 4. Random available move
        const available = squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (available.length > 0) {
            const randomIdx = Math.floor(Math.random() * available.length);
            return available[randomIdx];
        }
        return -1;
    };

    const makeRobotMove = () => {
        const move = findBestMove(board);
        if (move !== -1) {
            handleMove(move, 'O');
        }
    };

    const checkStatus = (squares) => {
        for (let i = 0; i < WINNING_COMBINATIONS.length; i++) {
            const [a, b, c] = WINNING_COMBINATIONS[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                setWinner(squares[a]);
                setWinningLine([a, b, c]);
                setScore(prev => ({
                    ...prev,
                    [squares[a] === 'X' ? 'player' : 'robot']: prev[squares[a] === 'X' ? 'player' : 'robot'] + 1
                }));
                return;
            }
        }
        if (!squares.includes(null)) {
            setIsDraw(true);
        }
    };

    const handleMove = (index, playerCode) => {
        if (board[index] || winner || isDraw) return;

        const newBoard = [...board];
        newBoard[index] = playerCode;
        setBoard(newBoard);
        setRobotThinking(false);
        checkStatus(newBoard);
        setIsXNext(playerCode === 'O'); // If O just moved, it's X's turn
    };

    const handlePlayerClick = (index) => {
        if (!isXNext || robotThinking) return; // Prevent clicking during robot turn
        handleMove(index, 'X');
    };

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setWinningLine([]);
        setIsDraw(false);
        setIsXNext(true); // Player always goes first for simplicity
        setRobotThinking(false);
    };

    return (
        <div className="app-container tic-tac-toe">
            {onClose && (
                <button className="app-internal-back-btn" onClick={onClose} title="Go Back">
                    <ArrowLeft size={20} />
                </button>
            )}
            {/* Header / Scoreboard */}
            <div className="tt-header">
                <div className="tt-score-box xy-box">
                    <span className="tt-label">You (X)</span>
                    <span className="tt-score xy-glow">{score.player}</span>
                </div>

                <div className="tt-status-center">
                    {winner ? (
                        <div className="tt-status winning-status">
                            {winner === 'X' ? 'YOU WIN! 🎉' : 'ROBOT WINS 🤖'}
                        </div>
                    ) : isDraw ? (
                        <div className="tt-status draw-status">DRAW! 🤝</div>
                    ) : (
                        <div className="tt-status turn-status">
                            {isXNext ? "Your Turn" : "Robot is thinking..."}
                        </div>
                    )}
                </div>

                <div className="tt-score-box ob-box">
                    <span className="tt-label">Robot (O)</span>
                    <span className="tt-score ob-glow">{score.robot}</span>
                </div>
            </div>

            {/* Game Board */}
            <div className={`tt-board-wrapper ${winner ? 'board-dimmed' : ''}`}>
                <div className="tt-board">
                    {board.map((cell, index) => {
                        const isWinningCell = winningLine.includes(index);
                        return (
                            <button
                                key={index}
                                className={`tt-cell 
                                    ${cell ? 'occupied' : ''} 
                                    ${isWinningCell ? `winning-cell ${winner}-win` : ''}
                                `}
                                onClick={() => handlePlayerClick(index)}
                                disabled={cell !== null || !isXNext || winner !== null}
                            >
                                {cell && (
                                    <span className={`tt-mark ${cell}-mark cinematic-pop`}>
                                        {cell}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Cinematic Ending Overlay */}
            {(winner || isDraw) && (
                <div className="tt-overlay fade-in">
                    <button className="tt-reset-btn pop-up-delay" onClick={resetGame}>
                        Play Again
                    </button>
                </div>
            )}
        </div>
    );
};

export default TicTacToeApp;
