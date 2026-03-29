import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'memorize' | 'playing' | 'levelComplete' | 'sessionEnd' | 'history';

interface MazeCell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
}

interface LevelResult {
  level: number;
  gridSize: number;
  memTime: number;
  timeTaken: number;
  moves: number;
  optimalMoves: number;
  mistakes: number;
  score: number;
}

interface SessionResult {
  levels: LevelResult[];
  totalScore: number;
  highestLevel: number;
  timestamp: number;
}

const STORAGE_KEY = 'neuromaze_sessions';

// ── Level config: grid grows, memorize time scales ──

function getLevelConfig(level: number) {
  const size = Math.min(5 + Math.floor((level - 1) / 2) * 2, 15);
  const memTime = Math.min(5 + (level - 1) * 0.5, 12);
  return { rows: size, cols: size, memTime };
}

function getDifficultyLabel(level: number): string {
  if (level <= 2) return 'Beginner';
  if (level <= 4) return 'Intermediate';
  if (level <= 6) return 'Advanced';
  if (level <= 8) return 'Expert';
  return 'Extreme';
}

function getDifficultyColor(level: number): string {
  if (level <= 2) return '#4ade80';
  if (level <= 4) return '#38bdf8';
  if (level <= 6) return '#fbbf24';
  if (level <= 8) return '#fb923c';
  return '#f87171';
}

// ── Maze generation (recursive backtracker) ──

function generateMaze(rows: number, cols: number): MazeCell[][] {
  const grid: MazeCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: true, right: true, bottom: true, left: true, visited: false,
    }))
  );

  const stack: [number, number][] = [];
  grid[0][0].visited = true;
  stack.push([0, 0]);

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors: [number, number, 'top' | 'right' | 'bottom' | 'left', 'top' | 'right' | 'bottom' | 'left'][] = [];

    if (cr > 0 && !grid[cr - 1][cc].visited) neighbors.push([cr - 1, cc, 'top', 'bottom']);
    if (cr < rows - 1 && !grid[cr + 1][cc].visited) neighbors.push([cr + 1, cc, 'bottom', 'top']);
    if (cc > 0 && !grid[cr][cc - 1].visited) neighbors.push([cr, cc - 1, 'left', 'right']);
    if (cc < cols - 1 && !grid[cr][cc + 1].visited) neighbors.push([cr, cc + 1, 'right', 'left']);

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nr, nc, wallCurrent, wallNeighbor] = neighbors[Math.floor(Math.random() * neighbors.length)];
      grid[cr][cc][wallCurrent] = false;
      grid[nr][nc][wallNeighbor] = false;
      grid[nr][nc].visited = true;
      stack.push([nr, nc]);
    }
  }

  return grid;
}

// ── BFS for optimal path ──

function bfsOptimalPath(maze: MazeCell[][], rows: number, cols: number): number {
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: [number, number, number][] = [[0, 0, 0]];
  visited[0][0] = true;

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift()!;
    if (r === rows - 1 && c === cols - 1) return dist;

    const dirs: [number, number, keyof MazeCell][] = [
      [-1, 0, 'top'], [1, 0, 'bottom'], [0, -1, 'left'], [0, 1, 'right'],
    ];

    for (const [dr, dc, wall] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && !maze[r][c][wall]) {
        visited[nr][nc] = true;
        queue.push([nr, nc, dist + 1]);
      }
    }
  }
  return -1;
}

// ── Scoring ──

function calculateLevelScore(timeTaken: number, moves: number, optimalMoves: number, mistakes: number, level: number): number {
  const levelMultiplier = 1 + (level - 1) * 0.12;
  const moveEfficiency = Math.max(0, 1 - ((moves - optimalMoves) / (optimalMoves * 2)));
  const config = getLevelConfig(level);
  const timeLimit = config.rows * config.cols * 0.6;
  const timeBonus = Math.max(0, 1 - (timeTaken / timeLimit));
  const mistakePenalty = Math.max(0, 1 - (mistakes * 0.1));
  const raw = (moveEfficiency * 40 + timeBonus * 30 + mistakePenalty * 30) * levelMultiplier;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// ── Storage ──

function loadSessions(): SessionResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSessions(sessions: SessionResult[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-30)));
  } catch { /* */ }
}


export function CognitiveGame() {
  const { saveResult } = useGameContext();

  const [phase, setPhase] = useState<Phase>('instructions');
  const [level, setLevel] = useState(1);
  const [maze, setMaze] = useState<MazeCell[][] | null>(null);
  const [pos, setPos] = useState({ row: 0, col: 0 });
  const [trail, setTrail] = useState<Set<string>>(new Set(['0,0']));
  const [mistakes, setMistakes] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [memCountdown, setMemCountdown] = useState(0);
  const [bumped, setBumped] = useState(false);
  const [optimalPath, setOptimalPath] = useState(0);

  const [sessionLevels, setSessionLevels] = useState<LevelResult[]>([]);
  const [currentLevelResult, setCurrentLevelResult] = useState<LevelResult | null>(null);
  const [allSessions, setAllSessions] = useState<SessionResult[]>(loadSessions);

  const startTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const config = getLevelConfig(level);
  const diffColor = getDifficultyColor(level);
  const diffLabel = getDifficultyLabel(level);

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      const map: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up', w: 'up', W: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      if (map[e.key]) { e.preventDefault(); movePlayer(map[e.key]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Timer ──
  useEffect(() => {
    if (phase === 'playing') {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  // ── Start a level ──
  const startLevel = useCallback((lvl: number) => {
    const cfg = getLevelConfig(lvl);
    const newMaze = generateMaze(cfg.rows, cfg.cols);
    const optimal = bfsOptimalPath(newMaze, cfg.rows, cfg.cols);
    setMaze(newMaze);
    setOptimalPath(optimal);
    setPos({ row: 0, col: 0 });
    setTrail(new Set(['0,0']));
    setMistakes(0);
    setMoveCount(0);
    setElapsed(0);
    setCurrentLevelResult(null);

    setPhase('memorize');
    const memSeconds = Math.ceil(cfg.memTime);
    setMemCountdown(memSeconds);

    let remaining = memSeconds;
    if (memTimerRef.current) clearInterval(memTimerRef.current);
    memTimerRef.current = setInterval(() => {
      remaining -= 1;
      setMemCountdown(remaining);
      if (remaining <= 0) {
        if (memTimerRef.current) clearInterval(memTimerRef.current);
        setPhase('playing');
      }
    }, 1000);
  }, []);

  const startSession = useCallback(() => {
    setLevel(1);
    setSessionLevels([]);
    startLevel(1);
  }, [startLevel]);

  const nextLevel = useCallback(() => {
    const next = level + 1;
    setLevel(next);
    startLevel(next);
  }, [level, startLevel]);

  const endSession = useCallback(() => {
    if (sessionLevels.length === 0 && !currentLevelResult) {
      setPhase('instructions');
      return;
    }

    const allLevels = currentLevelResult
      ? [...sessionLevels, currentLevelResult]
      : sessionLevels;

    const totalScore = allLevels.length > 0
      ? Math.round(allLevels.reduce((s, l) => s + l.score, 0) / allLevels.length)
      : 0;
    const highestLevel = allLevels.length > 0 ? Math.max(...allLevels.map(l => l.level)) : 0;

    const session: SessionResult = { levels: allLevels, totalScore, highestLevel, timestamp: Date.now() };

    const updated = [...allSessions, session];
    setAllSessions(updated);
    saveSessions(updated);

    saveResult('cognitive', {
      score: totalScore,
      feedback: totalScore >= 65 ? 'Navigation efficient' : 'Increased cognitive strain detected',
      timestamp: Date.now(),
      details: { highestLevel, levelsCompleted: allLevels.length },
    });

    setPhase('sessionEnd');
  }, [sessionLevels, currentLevelResult, allSessions, saveResult]);

  useEffect(() => {
    return () => { if (memTimerRef.current) clearInterval(memTimerRef.current); };
  }, []);

  // ── Movement ──
  const movePlayer = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!maze || phase !== 'playing') return;
    const { row, col } = pos;
    const wallMap: Record<string, keyof MazeCell> = { up: 'top', down: 'bottom', left: 'left', right: 'right' };
    const deltaMap: Record<string, [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

    if (maze[row][col][wallMap[dir]]) {
      setMistakes(m => m + 1);
      setBumped(true);
      setTimeout(() => setBumped(false), 300);
      return;
    }

    const [dr, dc] = deltaMap[dir];
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= config.rows || nc < 0 || nc >= config.cols) return;

    setPos({ row: nr, col: nc });
    setMoveCount(m => m + 1);
    setTrail(prev => new Set([...prev, `${nr},${nc}`]));

    if (nr === config.rows - 1 && nc === config.cols - 1) {
      const timeTaken = Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10;
      const finalMoves = moveCount + 1;
      const score = calculateLevelScore(timeTaken, finalMoves, optimalPath, mistakes, level);

      const result: LevelResult = {
        level, gridSize: config.rows, memTime: Math.ceil(config.memTime),
        timeTaken, moves: finalMoves, optimalMoves: optimalPath, mistakes, score,
      };

      setCurrentLevelResult(result);
      setSessionLevels(prev => [...prev, result]);
      setTimeout(() => setPhase('levelComplete'), 400);
    }
  }, [maze, phase, pos, config, moveCount, optimalPath, mistakes, level]);

  // ── Derived stats ──
  const cellSize = Math.min(Math.floor(300 / config.cols), 44);
  const wallWidth = 2;

  const sessionAvg = sessionLevels.length > 0
    ? Math.round(sessionLevels.reduce((s, l) => s + l.score, 0) / sessionLevels.length)
    : 0;

  const allTimeHighLevel = allSessions.length > 0 ? Math.max(...allSessions.map(s => s.highestLevel)) : 0;
  const allTimeAvg = allSessions.length > 0
    ? Math.round(allSessions.reduce((s, r) => s + r.totalScore, 0) / allSessions.length)
    : 0;

  const getTrend = (): 'up' | 'down' | 'flat' => {
    if (allSessions.length < 3) return 'flat';
    const recent = allSessions.slice(-3);
    const older = allSessions.slice(-6, -3);
    if (older.length === 0) return 'flat';
    const avgR = recent.reduce((s, r) => s + r.totalScore, 0) / recent.length;
    const avgO = older.reduce((s, r) => s + r.totalScore, 0) / older.length;
    if (avgR - avgO > 4) return 'up';
    if (avgO - avgR > 4) return 'down';
    return 'flat';
  };
  const trend = getTrend();

  return (
    <NatureLayout showBack={true} backTo="/ecosystem">
      <div className="flex flex-col pt-20 pb-8" style={{ overflowY: 'auto', height: '100%', flex: 1, WebkitOverflowScrolling: 'touch' }}>
        <AnimatePresence mode="wait">

          {/* ──────── INSTRUCTIONS ──────── */}
          {phase === 'instructions' && (
            <motion.div key="instructions" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center flex-1 px-5">
              <div className="mb-5 text-center">
                <p style={{ color: '#a78bfa', fontSize: '25px', letterSpacing: '0.1em', margin: '0 0 8px' }}>COGNITIVE TRAINING</p>
                <h1 style={{ color: '#f5f3ff', fontSize: '60px', margin: '0 0 8px', fontWeight: 400 }}>Maze Navigator</h1>
                <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #a78bfa, transparent)', margin: '0 auto 16px' }} />
              </div>
              <div
                className="mb-6 p-5 rounded-2xl"
                style={{
                  width: 400,                // fixed width
                  margin: '0 auto',          // center horizontally
                  background: 'rgba(167,139,250,0.06)',
                  border: '1px solid rgba(167,139,250,0.2)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    style={{
                      width: 32,              // slightly bigger for proportion
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(56,189,248,0.4)',
                      border: '1px solid rgba(56,189,248,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,           // bigger emoji size
                    }}
                  >
                    🧑‍🚀
                  </div>

                  <div
                    style={{
                      flex: 1,
                      height: 4,              // thicker line for proportion
                      background: 'linear-gradient(90deg, rgba(167,139,250,0.4), rgba(167,139,250,0.1))',
                      borderRadius: 2,
                    }}
                  />

                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(74,222,128,0.4)',
                      border: '1px solid rgba(74,222,128,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    ⭐
                  </div>
                </div>

                {/* Levels */}
                <div className="flex gap-3 justify-center">
                  {[1, 3, 5, 7, 9].map((lv) => (
                    <div key={lv} className="flex flex-col items-center">
                      <span
                        style={{
                          color: getDifficultyColor(lv),
                          fontSize: '13px',          // adjusted proportionally
                          fontWeight: 500,
                        }}
                      >
                        {getLevelConfig(lv).rows}×{getLevelConfig(lv).cols}
                      </span>
                      <span
                        style={{
                          color: 'rgba(245,243,255,0.3)',
                          fontSize: '10px',          // slightly larger for clarity
                        }}
                      >
                        Lv{lv}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ color: 'rgba(245,243,255,0.7)', fontSize: '14px', lineHeight: 1.7, textAlign: 'center', maxWidth: 400, margin: 8 }}>
                Each level generates a unique maze. Study it during the preview — then it <span style={{ color: '#fbbf24' }}>disappears completely</span>. Navigate from memory alone.
              </p>
              <p style={{ color: 'rgba(245,243,255,0.5)', fontSize: '13px', lineHeight: 1.6, textAlign: 'center', maxWidth: 400, marginBottom: 28 }}>
                Mazes grow larger each level with more preview time. Keep going as long as you can — stop whenever you want to see your results.
              </p>

              {allSessions.length > 0 && (
                <div className="flex gap-3 w-full mb-5">
                  {[
                    { label: 'Sessions', value: allSessions.length, color: '#a78bfa' },
                    { label: 'Best Level', value: allTimeHighLevel, color: '#4ade80' },
                    { label: 'Avg Score', value: allTimeAvg, color: allTimeAvg >= 60 ? '#a78bfa' : '#fbbf24' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 flex flex-col items-center py-3 rounded-2xl" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                      <span style={{ color, fontSize: '18px', fontWeight: 500 }}>{value}</span>
                      <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '10px' }}>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={startSession}
                  className="py-5 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    width: '400px',           // fixed width
                    margin: '0 auto',         // center horizontally
                    background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
                    color: '#f5f3ff',
                    fontSize: '17px',
                    boxShadow: '0 0 30px rgba(167,139,250,0.2)',
                    border: '1px solid rgba(167,139,250,0.3)',
                  }}
                >
                  Start
                </button>
                {allSessions.length > 0 && (
                  <button onClick={() => setPhase('history')} className="py-5 px-5 rounded-2xl active:scale-95 transition-transform" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#c4b5fd', fontSize: '15px' }}>
                    Performance History
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ──────── MEMORIZE ──────── */}
          {phase === 'memorize' && maze && (
            <motion.div key="memorize" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center flex-1 px-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="px-3 py-1 rounded-full" style={{ background: diffColor + '20', border: `1px solid ${diffColor}40` }}>
                  <span style={{ color: diffColor, fontSize: '12px', fontWeight: 600 }}>LEVEL {level} · {diffLabel}</span>
                </div>
                <span style={{ color: 'rgba(245,243,255,0.4)', fontSize: '12px' }}>{config.rows}×{config.cols}</span>
              </div>

              <div className="mb-4 text-center">
                <p style={{ color: '#fbbf24', fontSize: '13px', letterSpacing: '0.06em', margin: '0 0 6px' }}>👁 MEMORIZE — MAZE WILL DISAPPEAR</p>
                <div className="flex items-center justify-center gap-2">
                  <motion.span key={memCountdown} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ color: memCountdown <= 2 ? '#f87171' : '#fbbf24', fontSize: '36px', fontWeight: 500 }}>
                    {memCountdown}
                  </motion.span>
                </div>
              </div>

              <MazeGrid maze={maze} rows={config.rows} cols={config.cols} cellSize={cellSize} wallWidth={wallWidth} pos={{ row: 0, col: 0 }} trail={new Set()} goalRow={config.rows - 1} goalCol={config.cols - 1} accentColor={diffColor} />

              <p style={{ color: 'rgba(245,243,255,0.35)', fontSize: '11px', marginTop: 12, textAlign: 'center' }}>Study the path carefully</p>
            </motion.div>
          )}

          {/* ──────── PLAYING (maze gone) ──────── */}
          {phase === 'playing' && maze && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center flex-1 px-5">
              <div className="flex items-center justify-between w-full mb-2">
                <div className="px-2.5 py-1 rounded-full" style={{ background: diffColor + '20', border: `1px solid ${diffColor}40` }}>
                  <span style={{ color: diffColor, fontSize: '11px', fontWeight: 600 }}>LV {level}</span>
                </div>
                <button onClick={endSession} className="px-3 py-1 rounded-full active:scale-95 transition-transform" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <span style={{ color: '#f87171', fontSize: '11px' }}>Stop & Results</span>
                </button>
              </div>

              <div className="flex justify-between w-full mb-3">
                {[
                  { label: 'Moves', value: moveCount, color: '#c4b5fd' },
                  { label: 'Time', value: elapsed.toFixed(1) + 's', color: '#c4b5fd' },
                  { label: 'Mistakes', value: mistakes, color: mistakes > 0 ? '#f87171' : '#4ade80' },
                  { label: 'Optimal', value: optimalPath, color: 'rgba(245,243,255,0.35)' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <span style={{ color: 'rgba(245,243,255,0.45)', fontSize: '10px' }}>{label}</span>
                    <p style={{ color, fontSize: '18px', margin: 0, fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>

              <motion.div animate={bumped ? { x: [-4, 4, -3, 3, 0] } : {}} transition={{ duration: 0.25 }} className="mb-4">
                <BlindMazeGrid rows={config.rows} cols={config.cols} cellSize={cellSize} pos={pos} trail={trail} goalRow={config.rows - 1} goalCol={config.cols - 1} accentColor={diffColor} />
              </motion.div>

              <div className="flex flex-col items-center gap-2">
                <button onClick={() => movePlayer('up')} className="flex items-center justify-center rounded-2xl active:scale-90 transition-transform" style={{ width: 60, height: 60, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}>
                  <ChevronUp size={26} color="#a78bfa" />
                </button>
                <div className="flex gap-2">
                  <button onClick={() => movePlayer('left')} className="flex items-center justify-center rounded-2xl active:scale-90 transition-transform" style={{ width: 60, height: 60, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}>
                    <ChevronLeft size={26} color="#a78bfa" />
                  </button>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'rgba(167,139,250,0.2)', fontSize: 9 }}>WASD</span>
                  </div>
                  <button onClick={() => movePlayer('right')} className="flex items-center justify-center rounded-2xl active:scale-90 transition-transform" style={{ width: 60, height: 60, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}>
                    <ChevronRight size={26} color="#a78bfa" />
                  </button>
                </div>
                <button onClick={() => movePlayer('down')} className="flex items-center justify-center rounded-2xl active:scale-90 transition-transform" style={{ width: 60, height: 60, background: 'rgba(167,139,250,0.12)', border: '1.5px solid rgba(167,139,250,0.25)' }}>
                  <ChevronDown size={26} color="#a78bfa" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── LEVEL COMPLETE ──────── */}
          {phase === 'levelComplete' && currentLevelResult && (
            <motion.div key="levelComplete" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center flex-1 px-5">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="mb-3 text-center">
                <p style={{ color: diffColor, fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 4px' }}>LEVEL {level} COMPLETE</p>
                <h2 style={{ color: '#f5f3ff', fontSize: '22px', margin: '0 0 4px', fontWeight: 400 }}>
                  {currentLevelResult.score >= 75 ? '🗺️ Excellent' : currentLevelResult.score >= 50 ? '🧩 Good' : '⚠️ Tough'}
                </h2>
              </motion.div>

              <div className="relative mb-4">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="55" fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth="6" />
                  <motion.circle cx="65" cy="65" r="55" fill="none" stroke={currentLevelResult.score >= 70 ? '#a78bfa' : currentLevelResult.score >= 45 ? '#fbbf24' : '#f87171'} strokeWidth="6" strokeLinecap="round" initial={{ strokeDasharray: '0 346' }} animate={{ strokeDasharray: `${currentLevelResult.score * 3.46} 346` }} transition={{ duration: 1, ease: 'easeOut' }} transform="rotate(-90 65 65)" style={{ filter: `drop-shadow(0 0 6px ${diffColor})` }} />
                  <text x="65" y="61" textAnchor="middle" fill={diffColor} fontSize="26" fontWeight="400">{currentLevelResult.score}</text>
                  <text x="65" y="78" textAnchor="middle" fill="rgba(245,243,255,0.45)" fontSize="10">score</text>
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full mb-4">
                {[
                  { label: 'Time', value: `${currentLevelResult.timeTaken}s`, color: '#c4b5fd' },
                  { label: 'Moves', value: `${currentLevelResult.moves}/${currentLevelResult.optimalMoves}`, color: currentLevelResult.moves <= currentLevelResult.optimalMoves * 1.3 ? '#4ade80' : '#fbbf24' },
                  { label: 'Mistakes', value: currentLevelResult.mistakes, color: currentLevelResult.mistakes <= 2 ? '#4ade80' : '#f87171' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center py-2.5 rounded-xl" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.1)' }}>
                    <span style={{ color: color as string, fontSize: '17px', fontWeight: 400 }}>{value}</span>
                    <span style={{ color: 'rgba(245,243,255,0.45)', fontSize: '10px' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Live performance graph */}
              <div className="w-full rounded-2xl p-3 mb-4" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'rgba(245,243,255,0.5)', fontSize: '11px' }}>Performance This Session</span>
                  <span style={{ color: '#a78bfa', fontSize: '11px' }}>Avg: {sessionAvg}</span>
                </div>
                <div className="flex items-end gap-1.5" style={{ height: 70 }}>
                  {sessionLevels.map((l, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span style={{ color: 'rgba(245,243,255,0.4)', fontSize: '9px' }}>{l.score}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${l.score * 0.6}px` }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        style={{
                          width: '100%', maxWidth: 18, minHeight: 4, borderRadius: 3,
                          background: l.score >= 70 ? '#4ade80' : l.score >= 45 ? '#fbbf24' : '#f87171',
                          opacity: i === sessionLevels.length - 1 ? 1 : 0.6,
                          boxShadow: i === sessionLevels.length - 1 ? `0 0 8px ${l.score >= 70 ? 'rgba(74,222,128,0.4)' : 'rgba(251,191,36,0.4)'}` : 'none',
                        }}
                      />
                      <span style={{ color: getDifficultyColor(l.level), fontSize: '8px' }}>Lv{l.level}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full p-3 rounded-2xl mb-4 text-center" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <p style={{ color: 'rgba(245,243,255,0.5)', fontSize: '12px', margin: '0 0 4px' }}>
                  Next: Level {level + 1} · {getLevelConfig(level + 1).rows}×{getLevelConfig(level + 1).cols} · {Math.ceil(getLevelConfig(level + 1).memTime)}s preview
                </p>
                <p style={{ color: getDifficultyColor(level + 1), fontSize: '12px', margin: 0, fontWeight: 500 }}>{getDifficultyLabel(level + 1)}</p>
              </div>

              <div className="flex gap-3 w-full">
                <button onClick={() => setPhase('instructions')} className="py-4 px-4 rounded-2xl active:scale-95 transition-transform" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', color: 'rgba(196,181,253,0.7)', fontSize: '13px' }}>
                  Menu
                </button>
                <button onClick={endSession} className="py-4 px-4 rounded-2xl active:scale-95 transition-transform" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#c4b5fd', fontSize: '13px' }}>
                  Stop & Results
                </button>
                <button onClick={nextLevel} className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)', color: '#f5f3ff', fontSize: '16px', boxShadow: '0 0 24px rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
                  Next Level →
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── SESSION END ──────── */}
          {phase === 'sessionEnd' && (
            <motion.div key="sessionEnd" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center flex-1 px-5">
              <div className="mb-3 text-center">
                <p style={{ color: '#a78bfa', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>SESSION COMPLETE</p>
                <h2 style={{ color: '#f5f3ff', fontSize: '22px', margin: '0 0 4px', fontWeight: 400 }}>Cognitive Analysis</h2>
              </div>

              <div className="relative mb-4">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth="7" />
                  <motion.circle cx="70" cy="70" r="60" fill="none" stroke={sessionAvg >= 70 ? '#4ade80' : sessionAvg >= 45 ? '#fbbf24' : '#f87171'} strokeWidth="7" strokeLinecap="round" initial={{ strokeDasharray: '0 377' }} animate={{ strokeDasharray: `${sessionAvg * 3.77} 377` }} transition={{ duration: 1.2, ease: 'easeOut' }} transform="rotate(-90 70 70)" style={{ filter: `drop-shadow(0 0 6px ${sessionAvg >= 70 ? '#4ade80' : '#fbbf24'})` }} />
                  <text x="70" y="65" textAnchor="middle" fill={sessionAvg >= 70 ? '#4ade80' : sessionAvg >= 45 ? '#fbbf24' : '#f87171'} fontSize="30" fontWeight="400">{sessionAvg}</text>
                  <text x="70" y="83" textAnchor="middle" fill="rgba(245,243,255,0.45)" fontSize="11">avg score</text>
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full mb-4">
                {[
                  { label: 'Levels', value: sessionLevels.length, color: '#a78bfa' },
                  { label: 'Highest', value: `Lv ${sessionLevels.length > 0 ? Math.max(...sessionLevels.map(l => l.level)) : 0}`, color: '#4ade80' },
                  { label: 'Best Score', value: sessionLevels.length > 0 ? Math.max(...sessionLevels.map(l => l.score)) : 0, color: sessionLevels.length > 0 ? getDifficultyColor(Math.max(...sessionLevels.map(l => l.level))) : '#a78bfa' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center py-3 rounded-2xl" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                    <span style={{ color, fontSize: '18px', fontWeight: 500 }}>{value}</span>
                    <span style={{ color: 'rgba(245,243,255,0.45)', fontSize: '10px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <div className="w-full rounded-2xl p-3 mb-4" style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.1)' }}>
                <p style={{ color: 'rgba(245,243,255,0.5)', fontSize: '11px', margin: '0 0 8px' }}>Level Breakdown</p>
                <div className="flex items-end gap-1.5" style={{ height: 80 }}>
                  {sessionLevels.map((l, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span style={{ color: 'rgba(245,243,255,0.4)', fontSize: '9px' }}>{l.score}</span>
                      <div style={{ width: '100%', maxWidth: 20, height: `${l.score * 0.7}px`, minHeight: 4, borderRadius: 3, background: l.score >= 70 ? '#4ade80' : l.score >= 45 ? '#fbbf24' : '#f87171', opacity: 0.8 }} />
                      <span style={{ color: getDifficultyColor(l.level), fontSize: '8px' }}>Lv{l.level}</span>
                    </div>
                  ))}
                </div>
              </div>

              {allSessions.length >= 2 && (
                <div className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl mb-4" style={{ background: trend === 'up' ? 'rgba(74,222,128,0.08)' : trend === 'down' ? 'rgba(248,113,113,0.08)' : 'rgba(167,139,250,0.06)', border: `1px solid ${trend === 'up' ? 'rgba(74,222,128,0.2)' : trend === 'down' ? 'rgba(248,113,113,0.2)' : 'rgba(167,139,250,0.12)'}` }}>
                  {trend === 'up' ? <TrendingUp size={16} color="#4ade80" /> : trend === 'down' ? <TrendingDown size={16} color="#f87171" /> : <Minus size={16} color="#a78bfa" />}
                  <span style={{ color: trend === 'up' ? '#4ade80' : trend === 'down' ? '#f87171' : '#c4b5fd', fontSize: '12px' }}>
                    {trend === 'up' ? 'Cognitive performance improving' : trend === 'down' ? 'Performance declining — consider rest' : 'Performance stable'}
                  </span>
                </div>
              )}

              <div className="w-full p-4 rounded-2xl mb-5" style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.15)' }}>
                <p style={{ color: 'rgba(245,243,255,0.7)', fontSize: '13px', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  {sessionAvg >= 70
                    ? 'Spatial memory and navigation are performing well. Cognitive function is within healthy parameters.'
                    : sessionAvg >= 45
                    ? 'Some difficulty observed at higher levels. Working memory is partially taxed — this is normal during challenging sessions.'
                    : 'Significant navigation difficulty detected. Cognitive load may be elevated — consider rest before the next session.'}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button onClick={() => setPhase('instructions')} className="py-4 px-5 rounded-2xl active:scale-95 transition-transform" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', color: 'rgba(196,181,253,0.7)', fontSize: '14px' }}>
                  Menu
                </button>
                <button onClick={startSession} className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#4c1d95,#6d28d9)', color: '#f5f3ff', fontSize: '15px', border: '1px solid rgba(167,139,250,0.3)' }}>
                  <RotateCcw size={15} /> New Session
                </button>
              </div>
            </motion.div>
          )}

          {/* ──────── HISTORY ──────── */}
          {phase === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 px-5">
              <div className="mb-5 text-center">
                <p style={{ color: '#a78bfa', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>PERFORMANCE HISTORY</p>
                <h1 style={{ color: '#f5f3ff', fontSize: '22px', margin: '0 0 4px', fontWeight: 400 }}>Cognitive Trend</h1>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Sessions', value: allSessions.length, color: '#a78bfa' },
                  { label: 'Best Level', value: allTimeHighLevel, color: '#4ade80' },
                  { label: 'Avg Score', value: allTimeAvg, color: allTimeAvg >= 60 ? '#a78bfa' : '#fbbf24' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center py-3 rounded-2xl" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                    <span style={{ color, fontSize: '20px', fontWeight: 500 }}>{value}</span>
                    <span style={{ color: 'rgba(245,243,255,0.45)', fontSize: '10px' }}>{label}</span>
                  </div>
                ))}
              </div>

              {(() => {
                const chartSessions = allSessions.slice(-20);
                const scores = chartSessions.map(s => s.totalScore);
                const maxScore = scores.length > 0 ? Math.max(...scores) : 100;
                const minScore = scores.length > 0 ? Math.min(...scores) : 0;
                const range = maxScore - minScore;
                // Normalize: tallest bar = 100%, shortest = 15% (so even flat data is visible)
                const normalize = (score: number) =>
                  scores.length < 2 || range === 0
                    ? 75
                    : 15 + ((score - minScore) / range) * 85;
                return (
                  <div className="rounded-2xl p-4 mb-5" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                    <div className="flex justify-between items-center mb-3">
                      <p style={{ color: 'rgba(245,243,255,0.5)', fontSize: '11px', margin: 0 }}>Avg score per session</p>
                      {chartSessions.length > 1 && (
                        <span style={{ color: 'rgba(245,243,255,0.3)', fontSize: '9px' }}>
                          {minScore}–{maxScore} range
                        </span>
                      )}
                    </div>
                    {chartSessions.length === 0 ? (
                      <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'rgba(245,243,255,0.2)', fontSize: '12px' }}>No sessions yet</span>
                      </div>
                    ) : (
                      <div className="flex items-end gap-1.5" style={{ height: 90 }}>
                        {chartSessions.map((s, i) => {
                          const barH = normalize(s.totalScore);
                          const isLatest = i === chartSessions.length - 1;
                          const barColor = s.totalScore >= 70 ? '#a78bfa' : s.totalScore >= 45 ? '#fbbf24' : '#f87171';
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%', position: 'relative' }}>
                              <span style={{
                                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                                color: barColor, fontSize: '9px', fontWeight: 600, whiteSpace: 'nowrap',
                              }}>
                                {s.totalScore}
                              </span>
                              <div style={{
                                width: '100%', maxWidth: 14,
                                height: `${barH}%`,
                                minHeight: 4,
                                borderRadius: 4,
                                background: barColor,
                                opacity: isLatest ? 1 : 0.65,
                                boxShadow: isLatest ? `0 0 6px ${barColor}88` : 'none',
                                transition: 'height 0.4s ease',
                              }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex justify-between mt-2">
                      <span style={{ color: 'rgba(245,243,255,0.25)', fontSize: '9px' }}>Oldest</span>
                      <span style={{ color: 'rgba(245,243,255,0.25)', fontSize: '9px' }}>Latest</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 200 }}>
                {allSessions.slice().reverse().slice(0, 15).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 mb-1.5 rounded-xl" style={{ background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.08)' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: s.totalScore >= 70 ? 'rgba(74,222,128,0.15)' : s.totalScore >= 45 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.totalScore >= 70 ? '#4ade80' : s.totalScore >= 45 ? '#fbbf24' : '#f87171', fontSize: '12px', fontWeight: 600 }}>
                        {s.totalScore}
                      </div>
                      <div>
                        <p style={{ color: 'rgba(245,243,255,0.7)', fontSize: '12px', margin: 0 }}>{s.levels.length} levels · Highest Lv {s.highestLevel}</p>
                        <p style={{ color: 'rgba(245,243,255,0.4)', fontSize: '10px', margin: 0 }}>{new Date(s.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setPhase('instructions')} className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg,#4c1d95,#6d28d9)', color: '#f5f3ff', fontSize: '15px', border: '1px solid rgba(167,139,250,0.3)' }}>
                  Back
                </button>
                <button onClick={() => { setAllSessions([]); saveSessions([]); setPhase('instructions'); }} className="py-4 px-5 rounded-2xl active:scale-95 transition-transform" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: '13px' }}>
                  Clear
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </NatureLayout>
  );
}


// ── Maze Grid (visible walls — memorize phase) ──

function MazeGrid({ maze, rows, cols, cellSize, wallWidth, pos, trail, goalRow, goalCol, accentColor }: {
  maze: MazeCell[][]; rows: number; cols: number; cellSize: number; wallWidth: number;
  pos: { row: number; col: number }; trail: Set<string>; goalRow: number; goalCol: number; accentColor: string;
}) {
  const totalW = cols * cellSize + (cols + 1) * wallWidth;
  const totalH = rows * cellSize + (rows + 1) * wallWidth;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ width: totalW, height: totalH, background: 'rgba(10,6,18,0.85)', border: '1px solid rgba(167,139,250,0.15)' }}>
      {maze.map((row, ri) =>
        row.map((cell, ci) => {
          const x = ci * (cellSize + wallWidth) + wallWidth;
          const y = ri * (cellSize + wallWidth) + wallWidth;
          const isPlayer = ri === pos.row && ci === pos.col;
          const isGoal = ri === goalRow && ci === goalCol;
          const isTrail = trail.has(`${ri},${ci}`);

          return (
            <div key={`${ri}-${ci}`}>
              <div style={{
                position: 'absolute', left: x, top: y, width: cellSize, height: cellSize,
                background: isPlayer ? 'rgba(56,189,248,0.2)' : isGoal ? 'rgba(74,222,128,0.15)' : isTrail ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cellSize * 0.5, borderRadius: 2, zIndex: 2,
                boxShadow: isPlayer ? '0 0 10px rgba(56,189,248,0.3)' : isGoal ? '0 0 8px rgba(74,222,128,0.25)' : 'none',
              }}>
                {isPlayer ? '🧑‍🚀' : isGoal ? '⭐' : null}
              </div>
              {cell.top && <div style={{ position: 'absolute', left: x - wallWidth, top: y - wallWidth, width: cellSize + wallWidth * 2, height: wallWidth, background: accentColor, opacity: 0.5, zIndex: 3 }} />}
              {cell.left && <div style={{ position: 'absolute', left: x - wallWidth, top: y - wallWidth, width: wallWidth, height: cellSize + wallWidth * 2, background: accentColor, opacity: 0.5, zIndex: 3 }} />}
              {ri === rows - 1 && cell.bottom && <div style={{ position: 'absolute', left: x - wallWidth, top: y + cellSize, width: cellSize + wallWidth * 2, height: wallWidth, background: accentColor, opacity: 0.5, zIndex: 3 }} />}
              {ci === cols - 1 && cell.right && <div style={{ position: 'absolute', left: x + cellSize, top: y - wallWidth, width: wallWidth, height: cellSize + wallWidth * 2, background: accentColor, opacity: 0.5, zIndex: 3 }} />}
            </div>
          );
        })
      )}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 12, border: `${wallWidth}px solid ${accentColor}44`, pointerEvents: 'none', zIndex: 4 }} />
    </div>
  );
}


// ── Blind Maze Grid (no walls — playing from memory) ──

function BlindMazeGrid({ rows, cols, cellSize, pos, trail, goalRow, goalCol, accentColor }: {
  rows: number; cols: number; cellSize: number;
  pos: { row: number; col: number }; trail: Set<string>; goalRow: number; goalCol: number; accentColor: string;
}) {
  const gap = 2;
  const totalW = cols * cellSize + (cols - 1) * gap;
  const totalH = rows * cellSize + (rows - 1) * gap;

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ width: totalW, height: totalH, background: 'rgba(10,6,18,0.6)', border: `1px solid ${accentColor}22` }}>
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const x = ci * (cellSize + gap);
          const y = ri * (cellSize + gap);
          const isPlayer = ri === pos.row && ci === pos.col;
          const isGoal = ri === goalRow && ci === goalCol;
          const isTrail = trail.has(`${ri},${ci}`) && !isPlayer;

          return (
            <div key={`${ri}-${ci}`} style={{
              position: 'absolute', left: x, top: y, width: cellSize, height: cellSize, borderRadius: 3,
              background: isPlayer ? 'rgba(56,189,248,0.2)' : isGoal ? 'rgba(74,222,128,0.12)' : isTrail ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.015)',
              border: isPlayer ? '1.5px solid rgba(56,189,248,0.5)' : isGoal ? '1.5px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.03)',
              boxShadow: isPlayer ? '0 0 14px rgba(56,189,248,0.4)' : isGoal ? '0 0 10px rgba(74,222,128,0.25)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cellSize * 0.5,
            }}>
              {isPlayer && <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>🧑‍🚀</motion.span>}
              {isGoal && !isPlayer && '⭐'}
              {isTrail && !isGoal && <span style={{ color: 'rgba(167,139,250,0.25)', fontSize: 5 }}>•</span>}
            </div>
          );
        })
      )}
    </div>
  );
}