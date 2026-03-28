import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'countdown' | 'playing' | 'result';

interface Animal {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

const ANIMALS = ['🦊', '🐰', '🦌', '🐦', '🦔', '🦋', '🐿️', '🦜', '🐸', '🦉'];
const TOTAL_ROUNDS = 8;
const MISS_TIMEOUT = 2000;

export function ReactionGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [round, setRound] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const appearTimeRef = useRef<number>(0);
  const roundRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rtListRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const addTimer = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  const showNextAnimal = useCallback(() => {
    roundRef.current += 1;
    setRound(roundRef.current);

    if (roundRef.current > TOTAL_ROUNDS) {
      const rts = rtListRef.current;
      const avg = rts.length > 0 ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 999;
      const score = Math.max(0, Math.min(100, Math.round(100 - ((avg - 250) / 10))));
      saveResult('reaction', {
        score,
        feedback: avg < 500 ? 'Alertness normal' : 'Reaction slower than baseline',
        timestamp: Date.now(),
        details: { avgMs: avg },
      });
      setPhase('result');
      return;
    }

    // Random delay 0.5–1.8s before animal appears
    const delay = Math.random() * 1300 + 500;
    addTimer(() => {
      const emoji = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      const x = Math.random() * 58 + 12; // 12–70%
      const y = Math.random() * 46 + 18; // 18–64%
      setAnimal({ id: roundRef.current, emoji, x, y });
      appearTimeRef.current = Date.now();

      // Auto-miss
      const missTimer = addTimer(() => {
        setAnimal(null);
        rtListRef.current.push(MISS_TIMEOUT);
        setReactionTimes((prev) => [...prev, MISS_TIMEOUT]);
        setLastRT(null);
        setShowFeedback(false);
        addTimer(showNextAnimal, 500);
      }, MISS_TIMEOUT);

      timersRef.current.push(missTimer);
    }, delay);
  }, [saveResult]);

  const handleTap = useCallback(() => {
    if (!animal || phase !== 'playing') return;
    clearTimers();

    const rt = Date.now() - appearTimeRef.current;
    rtListRef.current.push(rt);
    setReactionTimes((prev) => [...prev, rt]);
    setLastRT(rt);
    setShowFeedback(true);
    setAnimal(null);

    addTimer(() => {
      setShowFeedback(false);
      showNextAnimal();
    }, 700);
  }, [animal, phase, showNextAnimal]);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCountdown(3);
    rtListRef.current = [];
    roundRef.current = 0;
    setReactionTimes([]);

    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);
    const t3 = setTimeout(() => {
      setPhase('playing');
      setTimeout(() => showNextAnimal(), 400);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase, showNextAnimal]);

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const avgRT =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.filter((t) => t < MISS_TIMEOUT).reduce((a, b) => a + b, 0) /
          Math.max(1, reactionTimes.filter((t) => t < MISS_TIMEOUT).length))
      : 0;
  const finalAvg = rtListRef.current.filter((t) => t < MISS_TIMEOUT).length > 0
    ? Math.round(rtListRef.current.filter((t) => t < MISS_TIMEOUT).reduce((a, b) => a + b, 0) /
        rtListRef.current.filter((t) => t < MISS_TIMEOUT).length)
    : 999;
  const finalScore = Math.max(0, Math.min(100, Math.round(100 - ((finalAvg - 250) / 10))));
  const isGood = finalAvg < 500;

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
                <p style={{ color: '#fb923c', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  REACTION GAME
                </p>
                <h1 style={{ color: '#fff7ed', fontSize: '26px', margin: '0 0 12px', fontWeight: 400 }}>
                  Habitat Match
                </h1>
                <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #fb923c, transparent)', margin: '0 auto 20px' }} />
              </div>

              {/* Animal previews */}
              <div className="flex gap-3 mb-8 flex-wrap justify-center">
                {ANIMALS.slice(0, 6).map((a) => (
                  <div
                    key={a}
                    style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'rgba(251,146,60,0.08)',
                      border: '1.5px solid rgba(251,146,60,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 26,
                    }}
                  >
                    {a}
                  </div>
                ))}
              </div>

              <p
                style={{
                  color: 'rgba(255,237,213,0.7)', fontSize: '15px', lineHeight: 1.7,
                  textAlign: 'center', maxWidth: 290, marginBottom: 48,
                }}
              >
                Animals appear in the habitat. Tap them quickly when you see them. Faster reactions indicate higher alertness.
              </p>

              <div className="flex gap-4 w-full mb-8">
                {[
                  { label: 'Animals', value: TOTAL_ROUNDS },
                  { label: 'Window', value: '2.0s' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-3 rounded-2xl"
                    style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}
                  >
                    <span style={{ color: '#fb923c', fontSize: '18px', fontWeight: 500 }}>{value}</span>
                    <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '11px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase('countdown')}
                className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
                  color: '#fff7ed', fontSize: '17px',
                  boxShadow: '0 0 30px rgba(251,146,60,0.2)',
                  border: '1px solid rgba(251,146,60,0.3)',
                }}
              >
                Start
              </button>
            </motion.div>
          )}

          {/* COUNTDOWN */}
          {phase === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center flex-1"
            >
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: 'rgba(251,146,60,0.1)',
                  border: '2px solid rgba(251,146,60,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(251,146,60,0.2)',
                }}
              >
                <span style={{ color: '#fb923c', fontSize: '56px', fontWeight: 300 }}>{countdown}</span>
              </motion.div>
            </motion.div>
          )}

          {/* PLAYING */}
          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col flex-1"
            >
              {/* Header */}
              <div className="flex justify-between px-5 mb-4">
                <div>
                  <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>Round</span>
                  <p style={{ color: '#fb923c', fontSize: '22px', margin: 0, fontWeight: 500 }}>
                    {Math.min(round, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
                  </p>
                </div>
                <div className="text-right">
                  <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>Avg RT</span>
                  <p style={{ color: avgRT > 0 && avgRT < 500 ? '#4ade80' : '#fbbf24', fontSize: '22px', margin: 0, fontWeight: 500 }}>
                    {avgRT > 0 ? `${avgRT}ms` : '—'}
                  </p>
                </div>
              </div>

              {/* Game area */}
              <div
                className="relative flex-1 mx-4 rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #0a1508 0%, #0d1c0a 50%, #091208 100%)',
                  border: '1px solid rgba(251,146,60,0.12)',
                  minHeight: 380,
                }}
              >
                {/* Forest floor */}
                {[30, 55, 72].map((y, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', left: 0, right: 0,
                      height: 1, background: `rgba(74,222,128,0.04)`,
                      top: `${y}%`,
                    }}
                  />
                ))}

                {/* Feedback flash */}
                <AnimatePresence>
                  {showFeedback && lastRT !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: '30%' }}
                      animate={{ opacity: 1, scale: 1, y: '25%' }}
                      exit={{ opacity: 0, y: '20%' }}
                      style={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                        background: lastRT < 400 ? 'rgba(74,222,128,0.2)' : 'rgba(251,146,60,0.2)',
                        border: `1px solid ${lastRT < 400 ? 'rgba(74,222,128,0.5)' : 'rgba(251,146,60,0.5)'}`,
                        borderRadius: 16, padding: '8px 20px',
                        color: lastRT < 400 ? '#4ade80' : '#fb923c',
                        fontSize: '18px', fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lastRT}ms {lastRT < 300 ? '⚡' : lastRT < 450 ? '✓' : '↓'}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Animal */}
                <AnimatePresence>
                  {animal && (
                    <motion.button
                      key={animal.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.22, type: 'spring', stiffness: 280 }}
                      onClick={handleTap}
                      style={{
                        position: 'absolute',
                        left: `${animal.x}%`,
                        top: `${animal.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: 90,
                        height: 90,
                        borderRadius: 22,
                        fontSize: 46,
                        background: 'rgba(30,20,10,0.65)',
                        backdropFilter: 'blur(6px)',
                        border: '2px solid rgba(251,146,60,0.5)',
                        boxShadow: '0 0 28px rgba(251,146,60,0.3), 0 0 60px rgba(251,146,60,0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <motion.span
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      >
                        {animal.emoji}
                      </motion.span>
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Waiting state */}
                {!animal && !showFeedback && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'rgba(251,146,60,0.3)', fontSize: '14px' }}>
                      Watching…
                    </p>
                  </div>
                )}
              </div>

              <p style={{ color: 'rgba(255,237,213,0.35)', fontSize: '12px', textAlign: 'center', marginTop: 12, paddingBottom: 8 }}>
                Tap the animal the moment it appears
              </p>
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
                <p style={{ color: '#fb923c', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  REACTION ANALYSIS
                </p>
                <h2 style={{ color: '#fff7ed', fontSize: '24px', margin: '0 0 4px', fontWeight: 400 }}>
                  {isGood ? '⚡ Alertness normal' : '🐢 Reaction slower than baseline'}
                </h2>
              </div>

              {/* Score circle */}
              <div className="relative mb-6">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(251,146,60,0.12)" strokeWidth="8" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={isGood ? '#4ade80' : '#fb923c'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${finalScore * 4.4} 440`}
                    transform="rotate(-90 80 80)"
                    style={{ filter: `drop-shadow(0 0 8px ${isGood ? '#4ade80' : '#fb923c'})` }}
                  />
                  <text x="80" y="68" textAnchor="middle" fill={isGood ? '#4ade80' : '#fb923c'} fontSize="14">avg RT</text>
                  <text x="80" y="90" textAnchor="middle" fill={isGood ? '#4ade80' : '#fb923c'} fontSize="28" fontWeight="400">{finalAvg}ms</text>
                </svg>
              </div>

              {/* RT breakdown */}
              <div className="w-full mb-6">
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>Reaction Times</span>
                  <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>ms</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {rtListRef.current.map((rt, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: '12px',
                        background:
                          rt === MISS_TIMEOUT ? 'rgba(239,68,68,0.15)' :
                          rt < 350 ? 'rgba(74,222,128,0.15)' :
                          rt < 500 ? 'rgba(251,146,60,0.15)' : 'rgba(239,68,68,0.15)',
                        color:
                          rt === MISS_TIMEOUT ? '#f87171' :
                          rt < 350 ? '#4ade80' :
                          rt < 500 ? '#fb923c' : '#f87171',
                        border: `1px solid ${rt === MISS_TIMEOUT ? 'rgba(239,68,68,0.3)' : rt < 350 ? 'rgba(74,222,128,0.3)' : rt < 500 ? 'rgba(251,146,60,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}
                    >
                      {rt === MISS_TIMEOUT ? 'miss' : rt}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="w-full p-4 rounded-2xl mb-8"
                style={{ background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.15)' }}
              >
                <p style={{ color: 'rgba(255,237,213,0.7)', fontSize: '14px', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  {isGood
                    ? 'Reaction time and alertness are within healthy mission parameters.'
                    : 'Reaction time is slightly slower than baseline. Consider rest and hydration before next assessment.'}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => { rtListRef.current = []; setPhase('instructions'); }}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)', color: '#fdba74', fontSize: '15px' }}
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/ecosystem')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#7c2d12,#c2410c)', color: '#fff7ed', fontSize: '15px', border: '1px solid rgba(251,146,60,0.3)' }}
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