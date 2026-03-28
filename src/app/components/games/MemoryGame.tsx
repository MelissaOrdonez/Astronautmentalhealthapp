import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'watching' | 'input' | 'result';

const STONE_COLORS = [
  { base: '#2a2218', lit: '#4ade80', glow: 'rgba(74,222,128,0.6)', border: 'rgba(74,222,128,0.4)' },
  { base: '#1e2a1e', lit: '#38bdf8', glow: 'rgba(56,189,248,0.6)', border: 'rgba(56,189,248,0.4)' },
  { base: '#281e2a', lit: '#c084fc', glow: 'rgba(192,132,252,0.6)', border: 'rgba(192,132,252,0.4)' },
  { base: '#2a1e18', lit: '#fb923c', glow: 'rgba(251,146,60,0.6)', border: 'rgba(251,146,60,0.4)' },
  { base: '#1a2028', lit: '#facc15', glow: 'rgba(250,204,21,0.6)', border: 'rgba(250,204,21,0.4)' },
  { base: '#1e281e', lit: '#f472b6', glow: 'rgba(244,114,182,0.6)', border: 'rgba(244,114,182,0.4)' },
];

const TOTAL_ROUNDS = 5;

export function MemoryGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [litStone, setLitStone] = useState<number | null>(null);
  const [tappedStone, setTappedStone] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(3);
  const [correctRounds, setCorrectRounds] = useState(0);
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

  const playSequence = useCallback((seq: number[]) => {
    setPhase('watching');
    setUserInput([]);
    setLitStone(null);

    seq.forEach((stoneIdx, i) => {
      addTimeout(() => setLitStone(stoneIdx), i * 950 + 400);
      addTimeout(() => setLitStone(null), i * 950 + 900);
    });

    addTimeout(() => {
      setPhase('input');
    }, seq.length * 950 + 1000);
  }, []);

  const startGame = useCallback(() => {
    clearTimeouts();
    const firstSeq = [Math.floor(Math.random() * 6)];
    setSequence(firstSeq);
    setRound(1);
    setLives(3);
    setCorrectRounds(0);
    playSequence(firstSeq);
  }, [playSequence]);

  const handleTap = useCallback(
    (idx: number) => {
      if (phase !== 'input') return;

      setTappedStone(idx);
      setTimeout(() => setTappedStone(null), 260);

      const newInput = [...userInput, idx];
      setUserInput(newInput);
      const pos = newInput.length - 1;

      if (idx !== sequence[pos]) {
        // Wrong tap
        const newLives = lives - 1;
        setLives(newLives);
        if (newLives <= 0) {
          const score = Math.round((correctRounds / TOTAL_ROUNDS) * 100);
          saveResult('memory', {
            score,
            feedback: score >= 70 ? 'Memory stable' : 'Slight decline detected',
            timestamp: Date.now(),
          });
          addTimeout(() => setPhase('result'), 600);
        } else {
          setPhase('watching');
          setUserInput([]);
          addTimeout(() => playSequence(sequence), 1000);
        }
        return;
      }

      if (newInput.length === sequence.length) {
        // Completed sequence!
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

        const nextSeq = [...sequence, Math.floor(Math.random() * 6)];
        setSequence(nextSeq);
        setRound((r) => r + 1);
        setUserInput([]);
        setPhase('watching');
        addTimeout(() => playSequence(nextSeq), 1000);
      }
    },
    [phase, userInput, sequence, lives, correctRounds, round, playSequence, saveResult]
  );

  const scorePercent = Math.round((correctRounds / TOTAL_ROUNDS) * 100);
  const isGood = scorePercent >= 70;

  return (
    <NatureLayout>
      <div
        className="flex flex-col px-5 pt-20 pb-8"
        style={{ overflowY: 'auto', height: '100%', flex: 1 }}
      >
        <AnimatePresence mode="wait">
          {/* INSTRUCTIONS */}
          {phase === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex flex-col items-center flex-1"
            >
              <div className="mb-6 text-center">
                <p style={{ color: '#4ade80', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  COGNITIVE GAME
                </p>
                <h1 style={{ color: '#d1fae5', fontSize: '26px', margin: '0 0 12px', fontWeight: 400 }}>
                  Memory Growth
                </h1>
                <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #4ade80, transparent)', margin: '0 auto 20px' }} />
              </div>

              {/* Illustration */}
              <div className="flex gap-3 mb-8">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: i < 3 ? STONE_COLORS[i].lit + '33' : STONE_COLORS[i].base,
                      border: `1.5px solid ${i < 3 ? STONE_COLORS[i].border : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: i < 3 ? `0 0 12px ${STONE_COLORS[i].glow}` : 'none',
                    }}
                  />
                ))}
              </div>

              <p
                style={{
                  color: 'rgba(209,250,229,0.7)', fontSize: '15px', lineHeight: 1.7,
                  textAlign: 'center', maxWidth: 290, marginBottom: 48,
                }}
              >
                Watch the pattern of light and help the ecosystem grow by repeating it. Strong memory keeps your environment thriving.
              </p>

              <div className="flex gap-4 mb-8">
                {[
                  { label: 'Rounds', value: TOTAL_ROUNDS },
                  { label: 'Lives', value: '❤️❤️❤️' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-3 rounded-2xl"
                    style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}
                  >
                    <span style={{ color: '#4ade80', fontSize: '18px', fontWeight: 500 }}>{value}</span>
                    <span style={{ color: 'rgba(209,250,229,0.5)', fontSize: '11px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={startGame}
                className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
                  color: '#d1fae5', fontSize: '17px',
                  boxShadow: '0 0 30px rgba(74,222,128,0.2)',
                  border: '1px solid rgba(74,222,128,0.3)',
                }}
              >
                Start
              </button>
            </motion.div>
          )}

          {/* WATCHING / INPUT */}
          {(phase === 'watching' || phase === 'input') && (
            <motion.div
              key="gameplay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center flex-1"
            >
              {/* Header */}
              <div className="flex justify-between w-full mb-2">
                <div>
                  <p style={{ color: 'rgba(209,250,229,0.5)', fontSize: '12px', margin: 0 }}>Round</p>
                  <p style={{ color: '#4ade80', fontSize: '22px', margin: 0, fontWeight: 500 }}>
                    {round} / {TOTAL_ROUNDS}
                  </p>
                </div>
                <div className="text-right">
                  <p style={{ color: 'rgba(209,250,229,0.5)', fontSize: '12px', margin: 0 }}>Lives</p>
                  <p style={{ fontSize: '20px', margin: 0 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i}>{i < lives ? '❤️' : '🖤'}</span>
                    ))}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div
                className="w-full py-3 rounded-2xl text-center mb-8"
                style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.12)' }}
              >
                <p style={{ color: phase === 'watching' ? '#fbbf24' : '#4ade80', fontSize: '14px', margin: 0, letterSpacing: '0.06em' }}>
                  {phase === 'watching' ? '👁  Watch the sequence...' : '✋  Your turn — repeat it!'}
                </p>
              </div>

              {/* Stone grid */}
              <div
                className="grid grid-cols-3 gap-4 mb-8"
                style={{ width: '100%', maxWidth: 300 }}
              >
                {STONE_COLORS.map((stone, i) => {
                  const isLit = litStone === i;
                  const isTapped = tappedStone === i;
                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.93 }}
                      animate={isLit ? { scale: [1, 1.06, 1] } : {}}
                      transition={{ duration: 0.3 }}
                      onClick={() => handleTap(i)}
                      disabled={phase === 'watching'}
                      style={{
                        height: 88,
                        borderRadius: 18,
                        background: isLit || isTapped ? stone.lit + '33' : stone.base,
                        border: `2px solid ${isLit || isTapped ? stone.border : 'rgba(255,255,255,0.07)'}`,
                        boxShadow: isLit || isTapped ? `0 0 24px ${stone.glow}, inset 0 0 12px ${stone.lit}22` : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: phase === 'input' ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {(isLit || isTapped) && (
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: `radial-gradient(circle, ${stone.lit}40 0%, transparent 70%)`,
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: 20, height: 20, borderRadius: '50%', margin: 'auto',
                          background: isLit || isTapped ? stone.lit : 'rgba(255,255,255,0.08)',
                          boxShadow: isLit || isTapped ? `0 0 16px ${stone.glow}` : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    </motion.button>
                  );
                })}
              </div>

              {/* Sequence length indicator */}
              <div className="flex gap-2 mt-auto">
                {sequence.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < userInput.length ? '#4ade80' : 'rgba(74,222,128,0.2)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center flex-1"
            >
              <div className="mb-4 text-center">
                <p style={{ color: '#4ade80', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  SESSION COMPLETE
                </p>
                <h2 style={{ color: '#d1fae5', fontSize: '24px', margin: '0 0 4px', fontWeight: 400 }}>
                  {isGood ? '🌳 Memory stable' : '🌿 Slight decline detected'}
                </h2>
              </div>

              {/* Score circle */}
              <div className="relative mb-8">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(74,222,128,0.12)" strokeWidth="8" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={isGood ? '#4ade80' : '#fbbf24'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${scorePercent * 4.4} 440`}
                    transform="rotate(-90 80 80)"
                    style={{ filter: `drop-shadow(0 0 8px ${isGood ? '#4ade80' : '#fbbf24'})` }}
                  />
                  <text x="80" y="76" textAnchor="middle" fill={isGood ? '#4ade80' : '#fbbf24'} fontSize="32" fontWeight="400">{scorePercent}</text>
                  <text x="80" y="96" textAnchor="middle" fill="rgba(209,250,229,0.5)" fontSize="12">score</text>
                </svg>
              </div>

              {/* Stats */}
              <div className="flex gap-4 w-full mb-8">
                {[
                  { label: 'Correct Rounds', value: correctRounds },
                  { label: 'Max Sequence', value: sequence.length },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-4 rounded-2xl"
                    style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}
                  >
                    <span style={{ color: '#4ade80', fontSize: '26px', fontWeight: 400 }}>{value}</span>
                    <span style={{ color: 'rgba(209,250,229,0.5)', fontSize: '11px', textAlign: 'center' }}>{label}</span>
                  </div>
                ))}
              </div>

              <div
                className="w-full p-4 rounded-2xl mb-8"
                style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.15)' }}
              >
                <p style={{ color: 'rgba(209,250,229,0.7)', fontSize: '14px', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  {isGood
                    ? 'Short-term memory and pattern recall are performing within normal parameters for this mission day.'
                    : 'Memory performance is slightly below baseline. Consider a rest session before the next assessment.'}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPhase('instructions')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#86efac', fontSize: '15px' }}
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/ecosystem')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#166534,#15803d)', color: '#d1fae5', fontSize: '15px', border: '1px solid rgba(74,222,128,0.3)' }}
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