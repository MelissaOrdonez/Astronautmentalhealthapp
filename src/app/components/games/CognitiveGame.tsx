import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'playing' | 'result';

// 5×5 maze: 0=open, 1=blocked
const MAZE = [
  [0, 0, 1, 0, 0],
  [0, 1, 0, 0, 1],
  [0, 0, 0, 1, 0],
  [1, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
];
// Valid path: (0,0)→(1,0)→(2,0)→(2,1)→(3,1)→(4,1)→(4,2)→(4,3)→(4,4)

const ROWS = MAZE.length;
const COLS = MAZE[0].length;

export function CognitiveGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [pos, setPos] = useState({ row: 0, col: 0 });
  const [visited, setVisited] = useState<Set<string>>(new Set(['0,0']));
  const [mistakes, setMistakes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [bumped, setBumped] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'playing') {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const startGame = () => {
    setPos({ row: 0, col: 0 });
    setVisited(new Set(['0,0']));
    setMistakes(0);
    setElapsed(0);
    setPhase('playing');
  };

  const move = (dir: 'up' | 'down' | 'left' | 'right') => {
    if (phase !== 'playing') return;
    const { row, col } = pos;
    let nr = row, nc = col;
    if (dir === 'up') nr--;
    if (dir === 'down') nr++;
    if (dir === 'left') nc--;
    if (dir === 'right') nc++;

    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || MAZE[nr][nc] === 1) {
      // Blocked
      setMistakes((m) => m + 1);
      setBumped(true);
      setTimeout(() => setBumped(false), 350);
      return;
    }

    const newPos = { row: nr, col: nc };
    setPos(newPos);
    setVisited((prev) => new Set([...prev, `${nr},${nc}`]));

    if (nr === ROWS - 1 && nc === COLS - 1) {
      // Reached the end!
      const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const score = Math.max(0, Math.min(100, 100 - mistakes * 8 - Math.floor(timeTaken / 4)));
      saveResult('cognitive', {
        score,
        feedback: score >= 65 ? 'Navigation efficient' : 'Increased cognitive strain detected',
        timestamp: Date.now(),
        details: { mistakes, timeTaken },
      });
      setTimeout(() => setPhase('result'), 500);
    }
  };

  const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
  const finalScore = phase === 'result'
    ? Math.max(0, Math.min(100, 100 - mistakes * 8 - Math.floor(elapsed / 4)))
    : 0;
  const isGood = finalScore >= 65;

  const getCellColor = (row: number, col: number) => {
    if (row === pos.row && col === pos.col) return null; // player
    if (row === ROWS - 1 && col === COLS - 1) return 'goal';
    if (MAZE[row][col] === 1) return 'blocked';
    if (visited.has(`${row},${col}`)) return 'visited';
    return 'open';
  };

  return (
    <NatureLayout>
      <div className="flex flex-col pt-20 pb-8" style={{ overflowY: 'auto', height: '100%', flex: 1 }}>
        <AnimatePresence mode="wait">
          {/* INSTRUCTIONS */}
          {phase === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <div className="mb-6 text-center">
                <p style={{ color: '#a78bfa', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  COGNITIVE GAME
                </p>
                <h1 style={{ color: '#f5f3ff', fontSize: '26px', margin: '0 0 12px', fontWeight: 400 }}>
                  Path Puzzle
                </h1>
                <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)', margin: '0 auto 20px' }} />
              </div>

              {/* Mini maze preview */}
              <div
                className="mb-8 p-4 rounded-2xl"
                style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}
              >
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)', width: 180 }}>
                  {MAZE.map((row, ri) =>
                    row.map((cell, ci) => (
                      <div
                        key={`${ri}-${ci}`}
                        style={{
                          width: 30, height: 30, borderRadius: 7,
                          background:
                            ri === 0 && ci === 0 ? 'rgba(56,189,248,0.5)' :
                            ri === 4 && ci === 4 ? 'rgba(74,222,128,0.5)' :
                            cell === 1 ? 'rgba(255,255,255,0.07)' :
                            'rgba(167,139,250,0.1)',
                          border:
                            ri === 0 && ci === 0 ? '1px solid rgba(56,189,248,0.6)' :
                            ri === 4 && ci === 4 ? '1px solid rgba(74,222,128,0.6)' :
                            cell === 1 ? '1px solid rgba(255,255,255,0.05)' :
                            '1px solid rgba(167,139,250,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12,
                        }}
                      >
                        {ri === 0 && ci === 0 ? '🧑' : ri === 4 && ci === 4 ? '⭐' : cell === 1 ? '' : ''}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p
                style={{
                  color: 'rgba(245,243,255,0.7)', fontSize: '15px', lineHeight: 1.7,
                  textAlign: 'center', maxWidth: 290, marginBottom: 48,
                }}
              >
                Navigate through the terrain to reach the goal. Use the directional buttons. Fewer mistakes and faster completion indicates efficient cognitive function.
              </p>

              <div className="flex gap-4 w-full mb-8">
                {[
                  { label: 'Grid', value: '5×5' },
                  { label: 'Obstacles', value: '6' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-3 rounded-2xl"
                    style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
                  >
                    <span style={{ color: '#a78bfa', fontSize: '18px', fontWeight: 500 }}>{value}</span>
                    <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '11px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={startGame}
                className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
                  color: '#f5f3ff', fontSize: '17px',
                  boxShadow: '0 0 30px rgba(167,139,250,0.2)',
                  border: '1px solid rgba(167,139,250,0.3)',
                }}
              >
                Start
              </button>
            </motion.div>
          )}

          {/* PLAYING */}
          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              {/* Stats */}
              <div className="flex justify-between w-full mb-4">
                <div>
                  <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '12px' }}>Mistakes</span>
                  <p style={{ color: mistakes > 0 ? '#f87171' : '#4ade80', fontSize: '22px', margin: 0, fontWeight: 500 }}>{mistakes}</p>
                </div>
                <div className="text-center">
                  <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '12px' }}>Time</span>
                  <p style={{ color: '#a78bfa', fontSize: '22px', margin: 0, fontWeight: 500 }}>{elapsed}s</p>
                </div>
                <div className="text-right">
                  <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '12px' }}>Goal</span>
                  <p style={{ color: '#4ade80', fontSize: '22px', margin: 0 }}>⭐</p>
                </div>
              </div>

              {/* Grid */}
              <motion.div
                animate={bumped ? { x: [-4, 4, -3, 3, 0] } : {}}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
                >
                  {MAZE.map((row, ri) =>
                    row.map((_, ci) => {
                      const cellType = getCellColor(ri, ci);
                      const isPlayer = ri === pos.row && ci === pos.col;
                      const isGoal = ri === ROWS - 1 && ci === COLS - 1 && !isPlayer;

                      return (
                        <motion.div
                          key={`${ri}-${ci}`}
                          animate={isPlayer ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ duration: 0.4, repeat: isPlayer ? Infinity : 0 }}
                          style={{
                            width: 54, height: 54, borderRadius: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22,
                            background: isPlayer
                              ? 'rgba(56,189,248,0.2)'
                              : isGoal
                              ? 'rgba(74,222,128,0.15)'
                              : cellType === 'blocked'
                              ? 'rgba(255,255,255,0.04)'
                              : cellType === 'visited'
                              ? 'rgba(167,139,250,0.12)'
                              : 'rgba(167,139,250,0.06)',
                            border: isPlayer
                              ? '2px solid rgba(56,189,248,0.6)'
                              : isGoal
                              ? '2px solid rgba(74,222,128,0.5)'
                              : cellType === 'blocked'
                              ? '1px solid rgba(255,255,255,0.06)'
                              : cellType === 'visited'
                              ? '1px solid rgba(167,139,250,0.25)'
                              : '1px solid rgba(167,139,250,0.1)',
                            boxShadow: isPlayer
                              ? '0 0 20px rgba(56,189,248,0.3)'
                              : isGoal
                              ? '0 0 16px rgba(74,222,128,0.2)'
                              : 'none',
                          }}
                        >
                          {isPlayer
                            ? '🧑‍🚀'
                            : isGoal
                            ? '⭐'
                            : cellType === 'blocked'
                            ? <span style={{ color: 'rgba(255,255,255,0.08)', fontSize: 16 }}>🪨</span>
                            : cellType === 'visited'
                            ? <span style={{ color: 'rgba(167,139,250,0.3)', fontSize: 10 }}>·</span>
                            : null}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>

              {/* D-pad controls */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => move('up')}
                  className="flex items-center justify-center rounded-2xl active:scale-92 transition-transform"
                  style={{ width: 72, height: 72, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}
                >
                  <ChevronUp size={32} color="#a78bfa" />
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => move('left')}
                    className="flex items-center justify-center rounded-2xl active:scale-92 transition-transform"
                    style={{ width: 72, height: 72, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}
                  >
                    <ChevronLeft size={32} color="#a78bfa" />
                  </button>
                  <div
                    style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span style={{ color: 'rgba(167,139,250,0.3)', fontSize: 12 }}>NAV</span>
                  </div>
                  <button
                    onClick={() => move('right')}
                    className="flex items-center justify-center rounded-2xl active:scale-92 transition-transform"
                    style={{ width: 72, height: 72, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}
                  >
                    <ChevronRight size={32} color="#a78bfa" />
                  </button>
                </div>
                <button
                  onClick={() => move('down')}
                  className="flex items-center justify-center rounded-2xl active:scale-92 transition-transform"
                  style={{ width: 72, height: 72, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}
                >
                  <ChevronDown size={32} color="#a78bfa" />
                </button>
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <div className="mb-4 text-center">
                <p style={{ color: '#a78bfa', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  COGNITIVE ANALYSIS
                </p>
                <h2 style={{ color: '#f5f3ff', fontSize: '24px', margin: '0 0 4px', fontWeight: 400 }}>
                  {isGood ? '🗺️ Navigation efficient' : '🧩 Increased cognitive strain'}
                </h2>
              </div>

              {/* Score circle */}
              <div className="relative mb-8">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(167,139,250,0.12)" strokeWidth="8" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={isGood ? '#a78bfa' : '#fbbf24'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${finalScore * 4.4} 440`}
                    transform="rotate(-90 80 80)"
                    style={{ filter: `drop-shadow(0 0 8px ${isGood ? '#a78bfa' : '#fbbf24'})` }}
                  />
                  <text x="80" y="76" textAnchor="middle" fill={isGood ? '#a78bfa' : '#fbbf24'} fontSize="32" fontWeight="400">{finalScore}</text>
                  <text x="80" y="96" textAnchor="middle" fill="rgba(245,243,255,0.5)" fontSize="12">score</text>
                </svg>
              </div>

              {/* Stats */}
              <div className="flex gap-4 w-full mb-8">
                {[
                  { label: 'Mistakes', value: mistakes, color: mistakes <= 2 ? '#4ade80' : '#f87171' },
                  { label: 'Time', value: `${elapsed}s`, color: '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-4 rounded-2xl"
                    style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' }}
                  >
                    <span style={{ color, fontSize: '26px', fontWeight: 400 }}>{value}</span>
                    <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '11px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <div
                className="w-full p-4 rounded-2xl mb-8"
                style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)' }}
              >
                <p style={{ color: 'rgba(245,243,255,0.7)', fontSize: '14px', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  {isGood
                    ? 'Spatial navigation and decision-making are functioning within expected parameters.'
                    : 'Increased error rate detected. Cognitive load may be elevated — consider a rest period.'}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPhase('instructions')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#c4b5fd', fontSize: '15px' }}
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/ecosystem')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#4c1d95,#6d28d9)', color: '#f5f3ff', fontSize: '15px', border: '1px solid rgba(167,139,250,0.3)' }}
                >
                  Ecosystem
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NatureLayout>
  );
}