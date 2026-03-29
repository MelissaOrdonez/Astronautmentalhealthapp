import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'watching' | 'input' | 'result';

const LEVELS = [
  { gridSize: 6, speed: 950 },  // Beginner
  { gridSize: 9, speed: 700 },  // Intermediate
  { gridSize: 12, speed: 500 }, // Advanced
];

const STONE_COLORS = [
  { base: '#2a2218', lit: '#4ade80', glow: 'rgba(74,222,128,0.6)', border: 'rgba(74,222,128,0.4)' },
  { base: '#1e2a1e', lit: '#38bdf8', glow: 'rgba(56,189,248,0.6)', border: 'rgba(56,189,248,0.4)' },
  { base: '#281e2a', lit: '#c084fc', glow: 'rgba(192,132,252,0.6)', border: 'rgba(192,132,252,0.4)' },
  { base: '#2a1e18', lit: '#fb923c', glow: 'rgba(251,146,60,0.6)', border: 'rgba(251,146,60,0.4)' },
  { base: '#1a2028', lit: '#facc15', glow: 'rgba(250,204,21,0.6)', border: 'rgba(250,204,21,0.4)' },
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

export function MemoryGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();

  const [phase, setPhase] = useState<Phase>('instructions');
  const [level, setLevel] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [litStone, setLitStone] = useState<number | null>(null);
  const [tappedStone, setTappedStone] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [lives, setLives] = useState(3); // NEW: Track lives
  const [showLevelComplete, setShowLevelComplete] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  };

  const currentLevel = LEVELS[level];
  const gridCols = 3 + Math.floor(level / 2);
  const totalTiles = gridCols * gridCols;

  const playSequence = useCallback((seq: number[]) => {
    setPhase('watching');
    setUserInput([]);
    setLitStone(null);

    seq.forEach((stoneIdx, i) => {
      addTimeout(() => setLitStone(stoneIdx), i * currentLevel.speed + 400);
      addTimeout(() => setLitStone(null), i * currentLevel.speed + currentLevel.speed / 2 + 400);
    });

    addTimeout(() => setPhase('input'), seq.length * currentLevel.speed + 600);
  }, [currentLevel.speed]);

  const startGame = useCallback(() => {
    clearTimeouts();
    const firstSeq = [Math.floor(Math.random() * totalTiles)];
    setSequence(firstSeq);
    setRound(1);
    setCorrectRounds(0);
    setLevel(0);
    setLives(3); // Reset lives
    playSequence(firstSeq);
  }, [playSequence, totalTiles]);

  const handleTap = useCallback((idx: number) => {
    if (phase !== 'input') return;

    setTappedStone(idx);
    setTimeout(() => setTappedStone(null), 260);

    const newInput = [...userInput, idx];
    setUserInput(newInput);
    const pos = newInput.length - 1;

    if (idx !== sequence[pos]) {
      // Deduct a life
      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        // Game over
        const score = Math.round((correctRounds / TOTAL_ROUNDS) * 100);
        saveResult('memory', {
          score,
          feedback: score >= 70 ? 'Memory stable' : 'Slight decline detected',
          timestamp: Date.now(),
        });
        addTimeout(() => setPhase('result'), 500);
      }
      return;
    }

    if (newInput.length === sequence.length) {
      const newCorrect = correctRounds + 1;
      setCorrectRounds(newCorrect);

      if (round >= TOTAL_ROUNDS) {
        const score = Math.round((newCorrect / TOTAL_ROUNDS) * 100);
        saveResult('memory', {
          score,
          feedback: score >= 70 ? 'Memory stable' : 'Slight decline detected',
          timestamp: Date.now(),
        });
        addTimeout(() => setPhase('result'), 800);
        return;
      }

      const isEndOfLevel = round % ROUNDS_PER_LEVEL === 0;

      if (isEndOfLevel) {
        setShowLevelComplete(true);
        addTimeout(() => {
          setShowLevelComplete(false);
          setLevel((l) => l + 1);
          const nextSeq = [...sequence, Math.floor(Math.random() * (6 + level))];
          setSequence(nextSeq);
          setRound((r) => r + 1);
          setUserInput([]);
          playSequence(nextSeq);
        }, 1200);
      } else {
        const nextSeq = [...sequence, Math.floor(Math.random() * (6 + level))];
        setSequence(nextSeq);
        setRound((r) => r + 1);
        setUserInput([]);
        playSequence(nextSeq);
      }
    }
  }, [phase, userInput, sequence, correctRounds, round, playSequence, saveResult, lives, level]);

  const scorePercent = Math.round((correctRounds / TOTAL_ROUNDS) * 100);
  const isGood = scorePercent >= 70;

  // Determine life image based on remaining lives
  const lifeImageSrc = lives === 3
    ? '/images/life-3.png'
    : lives === 2
    ? '/images/life-2.png'
    : '/images/life-1.png';

  return (
    <NatureLayout>
      <div className="flex flex-col px-5 pt-20 pb-8" style={{ overflowY: 'auto', height: '100%', flex: 1 }}>
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
                <p style={{ color: '#d1fae5', fontSize: '25px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  MEMORY GAME
                </p>
                <h1 style={{ color: '#fff7ed', fontSize: '60px', margin: '0 0 12px', fontWeight: 400 }}>
                  MIND GARDEN
                </h1>
                <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #fb923c, transparent)', margin: '0 auto 20px' }} />
              </div>

              {/* Description */}
              <p style={{
                color: 'rgba(209,250,229,0.8)',
                fontSize: 16,
                lineHeight: 1.6,
                textAlign: 'center',
                maxWidth: 300,
                marginBottom: 20,
              }}>
                Memorize the sequence of tiles and tap them in order. You have <strong>3 lives</strong>. Each mistake costs one life. The game ends when all lives are lost. Try to complete as many sequences as you can!
              </p>

              {/* Show all 3 lives */}
              <div className="flex justify-center gap-6 mb-6">
                {[3, 2, 1].map((life) => (
                  <div key={life} className="flex flex-col items-center">
                    <img
                      src={`./images/life-${life}.png`}
                      alt={`Life ${life}`}
                      style={{ width: 50, height: 50, marginBottom: 4 }}
                    />
                    <span style={{ color: 'rgba(209,250,229,0.7)', fontSize: 14 }}>
                      {life} {life === 1 ? 'Life' : 'Lives'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Example tiles */}
              <div className="grid grid-cols-3 gap-4 mb-6" style={{ width: 180 }}>
                {STONE_COLORS.slice(0, 6).map((stone, i) => (
                  <div
                    key={i}
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 12,
                      background: i % 2 === 0 ? stone.lit + '33' : stone.base,
                      border: `2px solid ${i % 2 === 0 ? stone.border : 'rgba(255,255,255,0.07)'}`,
                      boxShadow: i % 2 === 0 ? `0 0 16px ${stone.glow}` : 'none',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: i % 2 === 0 ? stone.lit : 'rgba(255,255,255,0.08)',
                      boxShadow: i % 2 === 0 ? `0 0 12px ${stone.glow}` : 'none',
                    }} />
                  </div>
                ))}
              </div>

              <p style={{
                color: 'rgba(209,250,229,0.7)',
                fontSize: 15,
                textAlign: 'center',
                maxWidth: 280,
                marginBottom: 24,
              }}>
                Tiles with a glow indicate the sequence you need to remember. Watch carefully as they light up one by one.
              </p>

              <button
                onClick={startGame}
                className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                  color: '#d1fae5',
                  fontSize: 17,
                  boxShadow: '0 0 20px rgba(74,222,128,0.2)',
                  border: '1px solid rgba(74,222,128,0.3)',
                }}
              >
                Start
              </button>
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
              {/* Level / Round */}
              <p style={{ color: '#4ade80', fontSize: 22, marginBottom: 16, textAlign: 'center' }}>
                Level {level + 1}
              </p>

              {showLevelComplete && (
                <div style={{
                  position: 'absolute',
                  top: 50,
                  width: '100%',
                  textAlign: 'center',
                  color: '#facc15',
                  fontSize: 28,
                  fontWeight: 700,
                  textShadow: '0 0 12px rgba(250,204,21,0.7)',
                  zIndex: 10,
                }}>
                  Level Complete!
                </div>
              )}

              {/* Lives */}
              <div className="mb-4">
                <img src={lifeImageSrc} alt={`${lives} lives`} style={{ height: 60 }} />
              </div>

              {/* Tile Grid */}
              <div className="grid gap-4" style={{ 
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`, 
                width: gridCols * 100, 
                height: gridCols * 100 
              }}>
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
                      disabled={phase === 'watching'}
                      style={{
                        aspectRatio: '1 / 1',
                        width: '100%',
                        borderRadius: 12,
                        background: isLit || isTapped ? stone.lit + '33' : stone.base,
                        border: `2px solid ${isLit || isTapped ? stone.border : 'rgba(255,255,255,0.07)'}`,
                        boxShadow: isLit || isTapped ? `0 0 24px ${stone.glow}, inset 0 0 12px ${stone.lit}22` : 'none',
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

          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <h2 style={{
                color: isGood ? '#4ade80' : '#fbbf24',
                fontSize: 26,
                textAlign: 'center',
                marginBottom: 12,
              }}>
                {isGood ? '🌳 Successfully Completed' : '🌿 Game Over'}
              </h2>

              <p style={{
                color: 'rgba(209,250,229,0.7)',
                textAlign: 'center',
                marginBottom: 20,
                fontSize: 15,
                lineHeight: 1.6,
              }}>
                {isGood
                  ? 'Great job! Your short-term memory and pattern recall were within normal range.'
                  : 'Oops! You ran out of lives. Session ended.'}
              </p>

              <div className="flex flex-col gap-3 w-full max-w-xs mb-6">
                <div className="flex justify-between px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <span style={{ color: 'rgba(209,250,229,0.7)' }}>Levels Completed</span>
                  <span style={{ color: '#4ade80', fontWeight: 500 }}>{level - 1}</span>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <span style={{ color: 'rgba(209,250,229,0.7)' }}>Total Rounds</span>
                  <span style={{ color: '#4ade80', fontWeight: 500 }}>{round}</span>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <span style={{ color: 'rgba(209,250,229,0.7)' }}>Correct Sequences</span>
                  <span style={{ color: '#4ade80', fontWeight: 500 }}>{correctRounds}</span>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <span style={{ color: 'rgba(209,250,229,0.7)' }}>Score</span>
                  <span style={{ color: isGood ? '#4ade80' : '#fbbf24', fontWeight: 500 }}>{scorePercent}%</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={() => setPhase('instructions')}
                  className="w-full py-4 rounded-2xl"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#86efac', fontSize: 15 }}
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/ecosystem')}
                  className="w-full py-4 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,#166534,#15803d)', color: '#d1fae5', fontSize: 15 }}
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