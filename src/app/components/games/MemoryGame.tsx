import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'watching' | 'input' | 'levelSummary' | 'result' | 'history';

const ACCENT = '#facc15';
const ACCENT_TEXT = '#fef3c7';
const ACCENT_DARK = '#ca8a04';
const ACCENT_SOFT = 'rgba(250,204,21,0.1)';
const ACCENT_CARD = 'rgba(250,204,21,0.06)';
const ACCENT_BORDER = 'rgba(250,204,21,0.15)';
const ACCENT_GLOW = 'rgba(250,204,21,0.35)';

const LEVELS = [
  { gridCols: 3, speed: 950 },
  { gridCols: 3, speed: 700 },
  { gridCols: 4, speed: 500 },
];

const STONE_COLORS = [
  { base: '#2a2218', lit: '#facc15', glow: 'rgba(250,204,21,0.6)', border: 'rgba(250,204,21,0.4)' },
  { base: '#1e2a1e', lit: '#38bdf8', glow: 'rgba(56,189,248,0.6)', border: 'rgba(56,189,248,0.4)' },
  { base: '#281e2a', lit: '#c084fc', glow: 'rgba(192,132,252,0.6)', border: 'rgba(192,132,252,0.4)' },
  { base: '#2a1e18', lit: '#fb923c', glow: 'rgba(251,146,60,0.6)', border: 'rgba(251,146,60,0.4)' },
  { base: '#1a2028', lit: '#fde047', glow: 'rgba(253,224,71,0.6)', border: 'rgba(253,224,71,0.4)' },
  { base: '#1e281e', lit: '#f472b6', glow: 'rgba(244,114,182,0.6)', border: 'rgba(244,114,182,0.4)' },
  { base: '#221a28', lit: '#f87171', glow: 'rgba(248,113,113,0.6)', border: 'rgba(248,113,113,0.4)' },
  { base: '#18222a', lit: '#60a5fa', glow: 'rgba(96,165,250,0.6)', border: 'rgba(96,165,250,0.4)' },
  { base: '#2a1822', lit: '#a78bfa', glow: 'rgba(167,139,250,0.6)', border: 'rgba(167,139,250,0.4)' },
  { base: '#1e182a', lit: '#fbbf24', glow: 'rgba(251,191,36,0.6)', border: 'rgba(251,191,36,0.4)' },
  { base: '#281a1e', lit: '#34d399', glow: 'rgba(52,211,153,0.6)', border: 'rgba(52,211,153,0.4)' },
  { base: '#1a2822', lit: '#f472b6', glow: 'rgba(244,114,182,0.6)', border: 'rgba(244,114,182,0.4)' },
];

const TOTAL_ROUNDS = 6;
const ROUNDS_PER_LEVEL = 2;
const INITIAL_LIVES = 3;

interface MemorySession {
  score: number;
  correctRounds: number;
  rounds: number;
  levelsCompleted: number;
  livesLeft: number;
  status: string;
  timestamp: number;
}

const STORAGE_KEY = 'memory_sessions';

function loadSessions(): MemorySession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: MemorySession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-30)));
  } catch {}
}

export function MemoryGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();
  const [sessions, setSessions] = useState<MemorySession[]>(loadSessions);

  const [phase, setPhase] = useState<Phase>('instructions');
  const [level, setLevel] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [litStone, setLitStone] = useState<number | null>(null);
  const [tappedStone, setTappedStone] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);

  const [summaryLevel, setSummaryLevel] = useState(0);
  const [summaryScore, setSummaryScore] = useState(0);
  const [summaryCorrectRounds, setSummaryCorrectRounds] = useState(0);
  const [summaryRoundsCompleted, setSummaryRoundsCompleted] = useState(0);
  const [pendingLevel, setPendingLevel] = useState<number | null>(null);
  const [pendingSequence, setPendingSequence] = useState<number[] | null>(null);
  const [endedEarly, setEndedEarly] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const addTimeout = useCallback((fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  const getTotalTiles = (levelIndex: number) => {
    return LEVELS[levelIndex].gridCols * LEVELS[levelIndex].gridCols;
  };

  const getRandomTile = (levelIndex: number) => {
    return Math.floor(Math.random() * getTotalTiles(levelIndex));
  };

  const playSequence = useCallback(
    (seq: number[], levelIndex: number) => {
      clearTimeouts();
      setPhase('watching');
      setUserInput([]);
      setLitStone(null);
      setTappedStone(null);

      const speed = LEVELS[levelIndex].speed;

      seq.forEach((stoneIdx, i) => {
        addTimeout(() => setLitStone(stoneIdx), i * speed + 400);
        addTimeout(() => setLitStone(null), i * speed + speed / 2 + 400);
      });

      addTimeout(() => {
        setLitStone(null);
        setPhase('input');
      }, seq.length * speed + 650);
    },
    [addTimeout, clearTimeouts]
  );

  const endGame = useCallback(
    (finalCorrectRounds: number, finalRound: number, finalLevel: number) => {
      const score = Math.round((finalCorrectRounds / TOTAL_ROUNDS) * 100);

      saveResult('memory', {
        score,
        feedback: score >= 70 ? 'Memory stable' : 'Slight decline detected',
        timestamp: Date.now(),
      });

      setCorrectRounds(finalCorrectRounds);
      setRound(finalRound);
      setLevel(finalLevel);
      setTappedStone(null);
      setLitStone(null);

      const levelsCompleted = Math.floor(finalCorrectRounds / ROUNDS_PER_LEVEL);

      const status =
        score >= 80
          ? 'Strong'
          : score >= 60
          ? 'Stable'
          : 'Needs Attention';

      const session: MemorySession = {
        score,
        correctRounds: finalCorrectRounds,
        rounds: finalRound,
        levelsCompleted,
        livesLeft: lives,
        status,
        timestamp: Date.now(),
      };

      const updated = [...sessions, session];
      setSessions(updated);
      saveSessions(updated);

      addTimeout(() => setPhase('result'), 400);
    },
    [addTimeout, saveResult, sessions, lives]
  );

  const handleStopGame = useCallback(() => {
    clearTimeouts();
    setEndedEarly(true);
    endGame(correctRounds, round, level);
  }, [clearTimeouts, endGame, correctRounds, round, level]);

  const startGame = useCallback(() => {
    setEndedEarly(false);
    clearTimeouts();

    const startingLevel = 0;
    const firstSeq = [getRandomTile(startingLevel)];

    setPhase('watching');
    setLevel(startingLevel);
    setSequence(firstSeq);
    setUserInput([]);
    setLitStone(null);
    setTappedStone(null);
    setRound(1);
    setCorrectRounds(0);
    setLives(INITIAL_LIVES);

    setSummaryLevel(0);
    setSummaryScore(0);
    setSummaryCorrectRounds(0);
    setSummaryRoundsCompleted(0);
    setPendingLevel(null);
    setPendingSequence(null);

    playSequence(firstSeq, startingLevel);
  }, [clearTimeouts, playSequence]);

  const continueToNextLevel = useCallback(() => {
    if (pendingLevel === null || !pendingSequence) return;

    setLevel(pendingLevel);
    setSequence(pendingSequence);
    setUserInput([]);
    setTappedStone(null);
    setLitStone(null);
    setPendingLevel(null);
    setPendingSequence(null);

    playSequence(pendingSequence, pendingLevel);
  }, [pendingLevel, pendingSequence, playSequence]);

  const handleTap = useCallback(
    (idx: number) => {
      if (phase !== 'input') return;

      setTappedStone(idx);
      addTimeout(() => setTappedStone(null), 220);

      const newInput = [...userInput, idx];
      setUserInput(newInput);

      const currentPos = newInput.length - 1;
      const expected = sequence[currentPos];

      if (idx !== expected) {
        const newLives = lives - 1;
        setLives(newLives);

        if (newLives <= 0) {
          endGame(correctRounds, round, level);
          return;
        }

        setPhase('watching');
        setUserInput([]);

        addTimeout(() => {
          playSequence(sequence, level);
        }, 700);

        return;
      }

      if (newInput.length === sequence.length) {
        const newCorrectRounds = correctRounds + 1;

        if (round >= TOTAL_ROUNDS) {
          endGame(newCorrectRounds, round, level);
          return;
        }

        const nextRound = round + 1;
        const isEndOfLevel = round % ROUNDS_PER_LEVEL === 0;
        const nextLevel = isEndOfLevel
          ? Math.min(level + 1, LEVELS.length - 1)
          : level;

        const nextSeq = [...sequence, getRandomTile(nextLevel)];

        setCorrectRounds(newCorrectRounds);
        setRound(nextRound);
        setUserInput([]);
        setTappedStone(null);

        if (isEndOfLevel) {
          const progressScore = Math.round((newCorrectRounds / TOTAL_ROUNDS) * 100);

          setSummaryLevel(level + 1);
          setSummaryScore(progressScore);
          setSummaryCorrectRounds(newCorrectRounds);
          setSummaryRoundsCompleted(round);
          setPendingLevel(nextLevel);
          setPendingSequence(nextSeq);
          setPhase('levelSummary');
        } else {
          setSequence(nextSeq);
          playSequence(nextSeq, nextLevel);
        }
      }
    },
    [
      phase,
      userInput,
      sequence,
      lives,
      correctRounds,
      round,
      level,
      addTimeout,
      playSequence,
      endGame,
    ]
  );

  const currentLevel = LEVELS[level];
  const gridCols = currentLevel.gridCols;
  const totalTiles = getTotalTiles(level);

  const scorePercent = Math.round((correctRounds / TOTAL_ROUNDS) * 100);
  const isGood = scorePercent >= 70;
  const levelsCompleted = Math.floor(correctRounds / ROUNDS_PER_LEVEL);

  const lifeImageSrc =
    lives === 3
      ? '/images/life-3.png'
      : lives === 2
      ? '/images/life-2.png'
      : '/images/life-1.png';

  const summaryGood = summaryScore >= 70;

  const averageScore =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
      : 0;

  const bestScore =
    sessions.length > 0
      ? Math.max(...sessions.map((s) => s.score))
      : 0;

  const recentSessions = sessions.slice(-8);

  return (
    <NatureLayout>
      <div
        className="flex flex-col px-5 pt-20 pb-8"
        style={{ overflowY: 'auto', height: '100%', flex: 1 }}
      >
        <AnimatePresence mode="wait">
          {phase === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex flex-col items-center flex-1"
            >
              <div className="mb-6 text-center">
                <p
                  style={{
                    color: ACCENT_TEXT,
                    fontSize: '25px',
                    letterSpacing: '0.1em',
                    margin: '0 0 8px',
                  }}
                >
                  MEMORY GAME
                </p>
                <h1
                  style={{
                    color: '#fff7ed',
                    fontSize: '60px',
                    margin: '0 0 12px',
                    fontWeight: 400,
                  }}
                >
                  MIND GARDEN
                </h1>
                <div
                  style={{
                    width: 48,
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #facc15, transparent)',
                    margin: '0 auto 20px',
                  }}
                />
              </div>

              <p
                style={{
                  color: 'rgba(254,243,199,0.82)',
                  fontSize: 16,
                  lineHeight: 1.6,
                  textAlign: 'center',
                  maxWidth: 400,
                  marginBottom: 20,
                }}
              >
                Memorize the sequence of tiles and tap them in order. You have <strong>3 lives</strong>. Each mistake costs one life. If you still have lives left, the sequence will replay. After each level, you will get a progress check before moving on.
              </p>

              <div className="flex justify-center gap-6 mb-6">
                {[3, 2, 1].map((life) => (
                  <div key={life} className="flex flex-col items-center">
                    <img
                      src={`./images/life-${life}.png`}
                      alt={`Life ${life}`}
                      style={{ width: 80, height: 80, marginBottom: 4 }}
                    />
                    <span style={{ color: 'rgba(254,243,199,0.72)', fontSize: 14 }}>
                      {life} {life === 1 ? 'Life' : 'Lives'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6" style={{ width: 180 }}>
                {STONE_COLORS.slice(0, 6).map((stone, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 12,
                      background: i % 2 === 0 ? `${stone.lit}33` : stone.base,
                      border: `2px solid ${i % 2 === 0 ? stone.border : 'rgba(255,255,255,0.07)'}`,
                      boxShadow: i % 2 === 0 ? `0 0 16px ${stone.glow}` : 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: i % 2 === 0 ? stone.lit : 'rgba(255,255,255,0.08)',
                        boxShadow: i % 2 === 0 ? `0 0 12px ${stone.glow}` : 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              <p
                style={{
                  color: 'rgba(254,243,199,0.72)',
                  fontSize: 15,
                  textAlign: 'center',
                  maxWidth: 400,
                  marginBottom: 24,
                }}
              >
                Watch the glowing tiles carefully, then repeat the full pattern in the same order.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={startGame}
                  className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    width: 400, // fixed width
                    margin: '0 auto', // centers horizontally
                    background: 'linear-gradient(135deg, #ca8a04 0%, #facc15 100%)',
                    color: '#1f1300',
                    fontSize: 17,
                    boxShadow: `0 0 20px ${ACCENT_GLOW}`,
                    border: '1px solid rgba(250,204,21,0.35)',
                  }}
                >
                  Start
                </button>

                {sessions.length > 0 && (
                  <button
                    onClick={() => setPhase('history')}
                    className="py-5 px-4 rounded-2xl"
                    style={{
                      background: ACCENT_SOFT,
                      color: ACCENT_TEXT,
                      border: '1px solid rgba(250,204,21,0.22)',
                    }}
                  >
                    Performance History
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {(phase === 'watching' || phase === 'input') && (
            <motion.div
              key="gameplay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1"
              style={{ width: '100%' }}
            >
              <div className="w-full max-w-xs flex justify-between items-center mb-2">
                <button
                  onClick={handleStopGame}
                  style={{
                    background: 'rgba(247, 47, 12, 0.16)',
                    color: '#fd2525',
                    padding: '6px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    border: '1px solid rgba(250, 21, 21, 0.97)',
                  }}
                >
                  Stop & Results
                </button>
              </div>

              <p
                style={{
                  color: ACCENT,
                  fontSize: 22,
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Level {level + 1}
              </p>

              <p
                style={{
                  color: 'rgba(254,243,199,0.7)',
                  fontSize: 15,
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                Round {round} of {TOTAL_ROUNDS}
              </p>

              <div className="mb-4">
                <img src={lifeImageSrc} alt={`${lives} lives`} style={{ height: 150 }} />
              </div>

              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  width: gridCols * 100,
                  height: gridCols * 100,
                }}
              >
                {Array.from({ length: totalTiles }).map((_, i) => {
                  const stone = STONE_COLORS[i % STONE_COLORS.length];
                  const isLit = litStone === i;
                  const isTapped = tappedStone === i;

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.93 }}
                      animate={isLit ? { scale: [1, 1.06, 1] } : {}}
                      onClick={() => handleTap(i)}
                      disabled={phase !== 'input'}
                      style={{
                        aspectRatio: '1 / 1',
                        width: '100%',
                        borderRadius: 12,
                        background: isLit || isTapped ? `${stone.lit}33` : stone.base,
                        border: `2px solid ${isLit || isTapped ? stone.border : 'rgba(255,255,255,0.07)'}`,
                        boxShadow:
                          isLit || isTapped
                            ? `0 0 24px ${stone.glow}, inset 0 0 12px ${stone.lit}22`
                            : 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: phase === 'input' ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: isLit || isTapped ? stone.lit : 'rgba(255,255,255,0.08)',
                          boxShadow: isLit || isTapped ? `0 0 16px ${stone.glow}` : 'none',
                        }}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {phase === 'levelSummary' && (
            <motion.div
              key="levelSummary"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <h2
                style={{
                  color: summaryGood ? ACCENT : '#fbbf24',
                  fontSize: 28,
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                Level {summaryLevel} Complete
              </h2>

              <p
                style={{
                  color: 'rgba(254,243,199,0.75)',
                  textAlign: 'center',
                  marginBottom: 20,
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 320,
                }}
              >
                Here is your progress check before moving to the next level.
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
                {[
                  ['Current Level', summaryLevel],
                  ['Rounds Completed', summaryRoundsCompleted],
                  ['Correct Sequences', summaryCorrectRounds],
                  ['Lives Remaining', lives],
                  ['Overall Progress', `${summaryScore}%`],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className="flex justify-between px-4 py-3 rounded-2xl"
                    style={{
                      background: ACCENT_CARD,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    <span style={{ color: 'rgba(254,243,199,0.72)' }}>{label}</span>
                    <span
                      style={{
                        color: index === 3 && lives <= 1 ? '#fbbf24' : ACCENT,
                        fontWeight: 500,
                      }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={continueToNextLevel}
                  className="w-full py-4 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg,#ca8a04,#facc15)',
                    color: '#1f1300',
                    fontSize: 16,
                    border: '1px solid rgba(250,204,21,0.3)',
                  }}
                >
                  Next Level
                </button>

                <button
                  onClick={() => setPhase('instructions')}
                  className="w-full py-4 rounded-2xl"
                  style={{
                    background: ACCENT_SOFT,
                    color: ACCENT_TEXT,
                    fontSize: 15,
                    border: '1px solid rgba(250,204,21,0.2)',
                  }}
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <h2
                style={{
                  color: endedEarly ? ACCENT_TEXT : isGood ? ACCENT : '#fbbf24',
                  fontSize: 26,
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                {endedEarly
                  ? '🧠 Memory Analysis'
                  : isGood
                  ? '🌟 Successfully Completed'
                  : '🌿 Game Over'}
              </h2>

              <p
                style={{
                  color: 'rgba(254,243,199,0.72)',
                  textAlign: 'center',
                  marginBottom: 20,
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                {endedEarly
                  ? 'Here is your memory analysis based on the progress you made before stopping the session.'
                  : isGood
                  ? 'Great job! Your short term memory and pattern recall were within normal range.'
                  : 'You ran out of lives before finishing all rounds.'}
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
                {[
                  ['Levels Completed', levelsCompleted],
                  ['Total Rounds', round],
                  ['Correct Sequences', correctRounds],
                  ['Score', `${scorePercent}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between px-4 py-3 rounded-2xl"
                    style={{
                      background: ACCENT_CARD,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    <span style={{ color: 'rgba(254,243,199,0.72)' }}>{label}</span>
                    <span style={{ color: ACCENT, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={startGame}
                  className="w-full py-4 rounded-2xl"
                  style={{
                    background: ACCENT_SOFT,
                    color: ACCENT_TEXT,
                    fontSize: 15,
                    border: '1px solid rgba(250,204,21,0.2)',
                  }}
                >
                  Retry
                </button>

                <button
                  onClick={() => setPhase('instructions')}
                  className="w-full py-4 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg,#ca8a04,#facc15)',
                    color: '#1f1300',
                    fontSize: 15,
                  }}
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <h2
                style={{
                  color: ACCENT,
                  fontSize: 26,
                  marginBottom: 10,
                  textAlign: 'center',
                }}
              >
                Performance History
              </h2>

              <p
                style={{
                  color: 'rgba(254,243,199,0.66)',
                  fontSize: 14,
                  textAlign: 'center',
                  maxWidth: 320,
                  lineHeight: 1.6,
                  marginBottom: 18,
                }}
              >
                Track how your memory performance changes over time. Higher scores and more levels completed may suggest stronger short term recall.
              </p>

              <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-5">
                {[
                  ['Sessions', sessions.length],
                  ['Avg Score', `${averageScore}%`],
                  ['Best', `${bestScore}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col items-center py-3 rounded-2xl"
                    style={{
                      background: ACCENT_CARD,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    <span style={{ color: ACCENT, fontSize: 18, fontWeight: 600 }}>
                      {value}
                    </span>
                    <span style={{ color: 'rgba(254,243,199,0.55)', fontSize: 11 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="w-full max-w-xs rounded-2xl p-4 mb-5"
                style={{
                  background: 'rgba(250,204,21,0.05)',
                  border: '1px solid rgba(250,204,21,0.12)',
                }}
              >
                <div className="flex justify-between items-center mb-3">
                  <span style={{ color: 'rgba(254,243,199,0.6)', fontSize: 12 }}>
                    Progress Chart
                  </span>
                  <span style={{ color: ACCENT_TEXT, fontSize: 12 }}>
                    Recent Sessions
                  </span>
                </div>

                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {recentSessions.map((session, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <span style={{ color: 'rgba(254,243,199,0.55)', fontSize: 10 }}>
                        {session.score}
                      </span>

                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(session.score, 6)}px` }}
                        transition={{ duration: 0.45, delay: i * 0.05 }}
                        style={{
                          width: '100%',
                          minHeight: 6,
                          borderRadius: 6,
                          background:
                            session.score >= 80
                              ? '#facc15'
                              : session.score >= 60
                              ? '#fde047'
                              : '#f87171',
                          boxShadow:
                            session.score >= 80
                              ? '0 0 10px rgba(250,204,21,0.35)'
                              : session.score >= 60
                              ? '0 0 10px rgba(253,224,71,0.28)'
                              : '0 0 10px rgba(248,113,113,0.28)',
                        }}
                      />

                      <span style={{ color: 'rgba(254,243,199,0.4)', fontSize: 9 }}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-xs flex flex-col gap-3 mb-6">
                {sessions.slice().reverse().map((s, i) => (
                  <div
                    key={i}
                    className="px-4 py-4 rounded-2xl"
                    style={{
                      background: ACCENT_CARD,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p style={{ color: ACCENT_TEXT, fontSize: 15, margin: 0 }}>
                          Session Score {s.score}%
                        </p>
                        <p style={{ color: 'rgba(254,243,199,0.5)', fontSize: 11, margin: '4px 0 0' }}>
                          {new Date(s.timestamp).toLocaleDateString()} {' '}
                          {new Date(s.timestamp).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <span
                        style={{
                          color:
                            s.score >= 80
                              ? '#facc15'
                              : s.score >= 60
                              ? '#fde047'
                              : '#f87171',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {s.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                      <div>
                        <p style={{ color: 'rgba(254,243,199,0.45)', fontSize: 11, margin: 0 }}>
                          Correct Sequences
                        </p>
                        <p style={{ color: ACCENT_TEXT, fontSize: 13, margin: '2px 0 0' }}>
                          {s.correctRounds}/{s.rounds}
                        </p>
                      </div>

                      <div>
                        <p style={{ color: 'rgba(254,243,199,0.45)', fontSize: 11, margin: 0 }}>
                          Levels Completed
                        </p>
                        <p style={{ color: ACCENT_TEXT, fontSize: 13, margin: '2px 0 0' }}>
                          {s.levelsCompleted}
                        </p>
                      </div>

                      <div>
                        <p style={{ color: 'rgba(254,243,199,0.45)', fontSize: 11, margin: 0 }}>
                          Lives Left
                        </p>
                        <p style={{ color: ACCENT_TEXT, fontSize: 13, margin: '2px 0 0' }}>
                          {s.livesLeft}
                        </p>
                      </div>

                      <div>
                        <p style={{ color: 'rgba(254,243,199,0.45)', fontSize: 11, margin: 0 }}>
                          Accuracy
                        </p>
                        <p style={{ color: ACCENT_TEXT, fontSize: 13, margin: '2px 0 0' }}>
                          {Math.round((s.correctRounds / Math.max(s.rounds, 1)) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase('instructions')}
                className="w-full max-w-xs py-4 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg,#ca8a04,#facc15)',
                  color: '#1f1300',
                }}
              >
                Back to Menu
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NatureLayout>
  );
}